import fs from 'fs';
import path from 'path';
import { colors, log, getFilesRecursive, backupFile, printCoffee } from './utils.js';
import {
  CONFIGS_DIR,
  DEFAULT_TARGET,
  VERSION,
  TECH_CONFIG,
  getRulePathsToInclude,
  shouldIncludeRule,
} from './config.js';
import { mergeSettingsJson, readManifest, writeManifest } from './merge.js';
import { getAdapter, getAdapterClass } from './adapters/index.js';

/**
 * Write a file with optional dry-run, backup, and operation tracking.
 */
function writeFile(destFile, content, options = {}) {
  const { dryRun, backup, targetDir } = options;
  const exists = fs.existsSync(destFile);
  const relativeDestPath = path.relative(targetDir, destFile);

  if (dryRun) {
    return { type: exists ? 'overwrite' : 'create', path: relativeDestPath };
  }

  if (exists && backup) {
    backupFile(destFile, targetDir);
  }
  fs.mkdirSync(path.dirname(destFile), { recursive: true });
  fs.writeFileSync(destFile, content);
  return { type: exists ? 'overwrite' : 'create', path: relativeDestPath };
}

/**
 * Check if a tech rule file should be included based on variant choices.
 * Files in variant directories are filtered; other files always pass.
 */
function shouldIncludeVariant(relativePath, tech, options) {
  const techConfig = TECH_CONFIG.technologies[tech];
  if (!techConfig?.variants) return true;

  const choices = options.techChoices?.[tech];
  if (!choices) return true; // No choices = install all (non-interactive)

  for (const [category, selected] of Object.entries(choices)) {
    if (relativePath.startsWith(category + '/')) {
      if (selected === '__none__') return false;
      const fileName = path.basename(relativePath, path.extname(relativePath));
      return fileName === selected;
    }
  }

  return true;
}

/**
 * Install tech rules for a specific adapter target.
 * Reads source files, transforms via adapter, writes to target output dir.
 */
function installTechRules(tech, adapter, adapterClass, targetDir, options) {
  const { dryRun, backup } = options;
  const operations = [];
  const globalRules = [];

  const techDir = path.join(CONFIGS_DIR, tech);
  const rulesDir = path.join(techDir, 'rules');
  if (!fs.existsSync(rulesDir)) return { operations, globalRules };

  const relativeFiles = getFilesRecursive(rulesDir);

  for (const relativePath of relativeFiles) {
    if (!shouldIncludeVariant(relativePath, tech, options)) continue;

    const srcFile = path.join(rulesDir, relativePath);
    const content = fs.readFileSync(srcFile, 'utf8');

    const { content: transformed, filename, isGlobal } = adapter.transformRule(content, relativePath);

    // Track global rules for aggregation
    if (isGlobal) {
      globalRules.push({ content, sourcePath: relativePath });
    }

    // Build output path: <outputDir>/rules/<tech>/<transformed-path>
    const transformedRelative = path.join(
      path.dirname(relativePath),
      filename
    );
    const outputPath = path.join(
      targetDir,
      adapterClass.outputDir,
      adapter.getRuleOutputPath(tech, transformedRelative)
    );

    const op = writeFile(outputPath, transformed, { dryRun, backup, targetDir });
    operations.push(op);
  }

  return { operations, globalRules };
}

/**
 * Install shared rules for a specific adapter target, filtered by tech config.
 */
function installSharedRules(techs, adapter, adapterClass, targetDir, options) {
  const { dryRun, backup } = options;
  const operations = [];
  const globalRules = [];
  const skippedPaths = [];

  const sharedDir = path.join(CONFIGS_DIR, '_shared');
  const rulesDir = path.join(sharedDir, 'rules');
  if (!fs.existsSync(rulesDir)) return { operations, globalRules, skippedPaths };

  const includedPaths = getRulePathsToInclude(techs);
  const relativeFiles = getFilesRecursive(rulesDir);

  for (const relativePath of relativeFiles) {
    const relativeDir = path.dirname(relativePath);

    if (!shouldIncludeRule(relativeDir, includedPaths)) {
      const topLevel = relativePath.split(path.sep).slice(0, 2).join('/');
      if (!skippedPaths.includes(topLevel)) {
        skippedPaths.push(topLevel);
      }
      continue;
    }

    const srcFile = path.join(rulesDir, relativePath);
    const content = fs.readFileSync(srcFile, 'utf8');

    const { content: transformed, filename, isGlobal } = adapter.transformRule(content, relativePath);

    if (isGlobal) {
      globalRules.push({ content, sourcePath: relativePath });
    }

    // Build output path preserving directory structure
    const transformedRelative = path.join(
      path.dirname(relativePath),
      filename
    );
    const outputPath = path.join(
      targetDir,
      adapterClass.outputDir,
      adapter.getSharedRuleOutputPath(transformedRelative)
    );

    const op = writeFile(outputPath, transformed, { dryRun, backup, targetDir });
    operations.push(op);
  }

  return { operations, globalRules, skippedPaths };
}

/**
 * Install skills for a specific adapter target (Claude only, or workflows for Windsurf).
 */
function installSkills(adapter, adapterClass, targetDir, skillsSrcDirs, options) {
  const { dryRun, backup } = options;
  const operations = [];

  for (const srcDir of skillsSrcDirs) {
    if (!fs.existsSync(srcDir)) continue;

    const relativeFiles = getFilesRecursive(srcDir).filter((f) => f.endsWith('SKILL.md'));

    for (const relativePath of relativeFiles) {
      const srcFile = path.join(srcDir, relativePath);
      const content = fs.readFileSync(srcFile, 'utf8');

      const result = adapter.transformSkill(content, relativePath);
      if (!result) continue;

      let destFile;
      if (result.skillDir) {
        // Claude: .claude/skills/<skill-name>/SKILL.md
        destFile = path.join(targetDir, adapterClass.outputDir, 'skills', result.skillDir, result.filename);
      } else if (result.workflowDir) {
        // Windsurf: .windsurf/workflows/<name>/workflow.md
        destFile = path.join(targetDir, adapterClass.outputDir, 'workflows', result.workflowDir, result.filename);
      } else {
        continue;
      }

      const op = writeFile(destFile, result.content, { dryRun, backup, targetDir });
      operations.push(op);
    }
  }

  return operations;
}

/**
 * Install settings for a specific adapter target (Claude only).
 */
function installSettings(tech, adapterClass, targetDir, options) {
  const { dryRun, backup } = options;
  const techDir = path.join(CONFIGS_DIR, tech);
  const settingsPath = path.join(techDir, 'settings.json');

  if (!fs.existsSync(settingsPath)) return null;

  const destSettingsPath = path.join(targetDir, adapterClass.outputDir, 'settings.json');
  return mergeSettingsJson(destSettingsPath, settingsPath, {
    dryRun,
    backup,
    targetDir,
  });
}

/**
 * Run installation for a single adapter target.
 */
function installForTarget(target, techs, targetDir, options) {
  const { dryRun, backup } = options;
  const adapter = getAdapter(target);
  const adapterClass = getAdapterClass(target);
  const allOperations = [];
  const allGlobalRules = [];

  log.info(`${dryRun ? 'Would install' : 'Installing'} for ${colors.bold(adapterClass.name)}...`);

  if (!dryRun) {
    fs.mkdirSync(path.join(targetDir, adapterClass.outputDir, 'rules'), { recursive: true });
  }

  // 1. Install tech rules + settings + skills per tech
  for (const tech of techs) {
    const techDir = path.join(CONFIGS_DIR, tech);
    if (!fs.existsSync(techDir)) {
      log.error(`Technology directory not found: ${tech}`);
      process.exit(1);
    }

    // Settings (only for adapters that support it)
    if (adapterClass.supports.settings) {
      const op = installSettings(tech, adapterClass, targetDir, { dryRun, backup });
      if (op) {
        allOperations.push(op);
        if (dryRun) {
          log.dry(`  settings.json (${op.type})`);
        } else {
          log.success(`  settings.json`);
        }
      }
    }

    // Rules
    if (adapterClass.supports.rules) {
      const { operations, globalRules } = installTechRules(
        tech, adapter, adapterClass, targetDir, { dryRun, backup, techChoices: options.techChoices }
      );
      allOperations.push(...operations);
      allGlobalRules.push(...globalRules);

      if (dryRun) {
        log.dry(`  rules/${tech}/ (${operations.length} files)`);
      } else {
        log.success(`  rules/${tech}/`);
      }
    }

    // Tech-specific skills
    if (options.withSkills && (adapterClass.supports.skills || adapterClass.supports.workflows)) {
      const techSkillsDir = path.join(techDir, 'skills');
      if (fs.existsSync(techSkillsDir)) {
        const ops = installSkills(adapter, adapterClass, targetDir, [techSkillsDir], { dryRun, backup });
        allOperations.push(...ops);
      }
    }
  }

  // 2. Shared skills
  const sharedDir = path.join(CONFIGS_DIR, '_shared');
  if (options.withSkills && (adapterClass.supports.skills || adapterClass.supports.workflows)) {
    log.info(`${dryRun ? 'Would install' : 'Installing'} ${adapterClass.supports.workflows ? 'workflows' : 'skills'}...`);
    const skillsDir = path.join(sharedDir, 'skills');
    const ops = installSkills(adapter, adapterClass, targetDir, [skillsDir], { dryRun, backup });
    allOperations.push(...ops);

    if (dryRun) {
      log.dry(`  ${adapterClass.supports.workflows ? 'workflows' : 'skills'}/ (${ops.length} files)`);
    } else {
      log.success(`  ${adapterClass.supports.workflows ? 'workflows' : 'skills'}/`);
    }
  }

  // 3. Shared rules
  if (options.withRules && adapterClass.supports.rules) {
    log.info(`${dryRun ? 'Would install' : 'Installing'} shared rules...`);
    const { operations, globalRules, skippedPaths } = installSharedRules(
      techs, adapter, adapterClass, targetDir, { dryRun, backup }
    );
    allOperations.push(...operations);
    allGlobalRules.push(...globalRules);

    if (dryRun) {
      log.dry(`  shared rules/ (${operations.length} files)`);
    } else {
      log.success(`  shared rules/`);
    }

    if (skippedPaths.length > 0) {
      const uniqueSkipped = [...new Set(skippedPaths)];
      log.info(`  (skipped: ${uniqueSkipped.join(', ')} - not applicable)`);
    }
  }

  // 4. Aggregate global rules (for non-Claude targets)
  if (allGlobalRules.length > 0) {
    const aggregated = adapter.aggregateGlobalRules(allGlobalRules);
    if (aggregated) {
      const destFile = path.join(targetDir, adapterClass.outputDir, aggregated.filename);
      const op = writeFile(destFile, aggregated.content, { dryRun, backup, targetDir });
      allOperations.push(op);

      if (dryRun) {
        log.dry(`  ${aggregated.filename} (aggregated global rules)`);
      } else {
        log.success(`  ${aggregated.filename} (aggregated global rules)`);
      }
    }
  }

  return allOperations;
}

export function listTechnologies() {
  console.log(`\n${colors.bold('Available technologies:')}\n`);

  const categories = [
    {
      label: 'Frontend',
      techs: [
        { key: 'angular', desc: 'Angular 21 + Nx + NgRx + Signals' },
        { key: 'react', desc: 'React 19 + Vite + Vitest' },
      ],
    },
    {
      label: 'Fullstack',
      techs: [
        { key: 'nextjs', desc: 'Next.js 15 + React 19 + App Router' },
      ],
    },
    {
      label: 'Backend',
      techs: [
        { key: 'nestjs', desc: 'NestJS 11 + Prisma/TypeORM + Passport' },
        { key: 'adonisjs', desc: 'AdonisJS 6 + Lucid ORM + VineJS' },
        { key: 'hono', desc: 'Hono v4 + Zod + Multi-runtime' },
        { key: 'elysia', desc: 'Elysia v1.4 + TypeBox + Bun + Eden' },
        { key: 'dotnet', desc: '.NET 9 + ASP.NET Core + EF Core' },
        { key: 'fastapi', desc: 'FastAPI + SQLAlchemy 2.0 + Pydantic v2' },
        { key: 'flask', desc: 'Flask + SQLAlchemy 2.0 + Marshmallow' },
      ],
    },
    {
      label: 'Native',
      techs: [
        { key: 'electron', desc: 'Electron 40 + Forge + electron-vite' },
        { key: 'tauri', desc: 'Tauri v2 + Rust + TypeScript' },
      ],
    },
  ];

  for (const category of categories) {
    console.log(`  ${colors.dim(category.label)}`);
    for (const { key, desc } of category.techs) {
      const techPath = path.join(CONFIGS_DIR, key);
      const exists = fs.existsSync(techPath);
      const indicator = exists ? colors.green('✓') : colors.red('✗');
      console.log(`    ${indicator} ${colors.bold(key.padEnd(10))} ${desc}`);
    }
    console.log('');
  }

  console.log(`\n${colors.bold('Shared resources:')}\n`);

  const sharedPath = path.join(CONFIGS_DIR, '_shared');
  const skills = fs.existsSync(path.join(sharedPath, 'skills'));
  const rules = fs.existsSync(path.join(sharedPath, 'rules'));

  console.log(
    `  ${skills ? colors.green('✓') : colors.red('✗')} skills     /learning, /review, /spec, /debug, and more`
  );
  console.log(
    `  ${rules ? colors.green('✓') : colors.red('✗')} rules      security, performance, accessibility`
  );
  console.log('');
}

export function status(targetDir) {
  const manifest = readManifest(targetDir);

  console.log(`\n${colors.bold('AI Rules Status')}\n`);
  console.log(`  Directory: ${targetDir}`);
  console.log('');

  if (!manifest) {
    log.warning('No ai-rules installation detected');
    console.log('');
    console.log(`  Run ${colors.cyan('ai-rules init')} to install configurations.`);
    console.log('');
    return;
  }

  console.log(`  ${colors.bold('Installed version:')} ${manifest.version}`);
  console.log(`  ${colors.bold('Latest version:')}   ${VERSION}`);
  console.log(
    `  ${colors.bold('Installed at:')}     ${new Date(manifest.installedAt).toLocaleString()}`
  );
  console.log('');

  // Display targets
  const targets = manifest.targets || [DEFAULT_TARGET];
  console.log(`  ${colors.bold('AI Targets:')}`);
  targets.forEach((target) => {
    console.log(`    ${colors.green('✓')} ${target}`);
  });
  console.log('');

  if (manifest.technologies?.length) {
    console.log(`  ${colors.bold('Technologies:')}`);
    manifest.technologies.forEach((tech) => {
      console.log(`    ${colors.green('✓')} ${tech}`);
    });
    console.log('');
  }

  if (manifest.options) {
    console.log(`  ${colors.bold('Options:')}`);
    if (manifest.options.withSkills) console.log(`    ${colors.green('✓')} skills`);
    if (manifest.options.withRules) console.log(`    ${colors.green('✓')} shared rules`);
    console.log('');
  }

  if (manifest.version !== VERSION) {
    console.log(
      `  ${colors.yellow('⚠')} Update available! Run ${colors.cyan('ai-rules update')} to update.`
    );
    console.log('');
  }

  const backupDir = path.join(targetDir, '.claude', 'backups');
  if (fs.existsSync(backupDir)) {
    const backups = getFilesRecursive(backupDir);
    if (backups.length > 0) {
      console.log(`  ${colors.bold('Backups:')} ${backups.length} file(s) in .claude/backups/`);
      console.log('');
    }
  }
}

export function init(techs, options) {
  const targetDir = path.resolve(options.target || process.cwd());
  const targets = options.targets || [DEFAULT_TARGET];
  const { dryRun, force } = options;
  const backup = !force;

  if (dryRun) {
    console.log(`\n${colors.cyan('DRY RUN')} - No files will be modified\n`);
  }

  log.info(`${dryRun ? 'Would install' : 'Installing'} to: ${targetDir}`);
  log.info(`Targets: ${targets.join(', ')}`);
  console.log('');

  const allOperations = [];

  // Install for each target
  for (const target of targets) {
    const ops = installForTarget(target, techs, targetDir, {
      dryRun,
      backup,
      withSkills: options.withSkills,
      withRules: options.withRules,
      techChoices: options.techChoices,
    });
    allOperations.push(...ops);
    console.log('');
  }

  // Write manifest (always in .claude/)
  writeManifest(
    targetDir,
    {
      technologies: techs,
      targets,
      options: {
        withSkills: options.withSkills,
        withRules: options.withRules,
        techChoices: options.techChoices || {},
      },
    },
    dryRun
  );

  if (dryRun) {
    const creates = allOperations.filter((op) => op.type === 'create').length;
    const overwrites = allOperations.filter((op) => ['overwrite', 'merge'].includes(op.type)).length;

    console.log(colors.bold('Summary:'));
    console.log(`  ${colors.green(creates)} file(s) would be created`);
    console.log(`  ${colors.yellow(overwrites)} file(s) would be modified`);
    console.log('');
    console.log(`Run without ${colors.cyan('--dry-run')} to apply changes.`);
  } else {
    log.success('Installation complete!');
    console.log('');
    console.log('Installed:');
    console.log(`  - Technologies: ${techs.join(', ')}`);
    console.log(`  - Targets: ${targets.join(', ')}`);
    if (options.withSkills) {
      console.log('  - Skills: /learning, /review, /spec, /debug, and more');
    }
    if (options.withRules) {
      console.log('  - Rules: security, performance, accessibility');
    }
    console.log('');
    console.log(`Files created in: ${targetDir}`);

    if (backup) {
      const backupDir = path.join(targetDir, '.claude', 'backups');
      if (fs.existsSync(backupDir) && getFilesRecursive(backupDir).length > 0) {
        console.log(`Backups saved in: ${path.join('.claude', 'backups')}`);
      }
    }

    printCoffee();
  }

  console.log('');
}

export async function update(options) {
  const targetDir = path.resolve(options.target || process.cwd());
  const { dryRun, force } = options;

  const manifest = readManifest(targetDir);

  if (!manifest) {
    log.error('No ai-rules installation found.');
    console.log(`Run ${colors.cyan('ai-rules init')} first.`);
    process.exit(1);
  }

  if (manifest.version === VERSION && !force) {
    log.success(`Already up to date (v${VERSION})`);
    return;
  }

  console.log('');
  log.info(`Updating from v${manifest.version} to v${VERSION}`);

  if (dryRun) {
    console.log(`\n${colors.cyan('DRY RUN')} - No files will be modified\n`);
  }

  const initOptions = {
    target: targetDir,
    targets: manifest.targets || [DEFAULT_TARGET],
    withSkills: manifest.options?.withSkills || false,
    withRules: manifest.options?.withRules || false,
    techChoices: manifest.options?.techChoices || {},
    dryRun,
    force,
  };

  init(manifest.technologies, initOptions);
}
