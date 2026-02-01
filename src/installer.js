import fs from 'fs';
import path from 'path';
import { colors, log, getFilesRecursive, copyDirRecursive, backupFile } from './utils.js';
import {
  CONFIGS_DIR,
  AVAILABLE_TECHS,
  VERSION,
  getRulePathsToInclude,
  shouldIncludeRule,
} from './config.js';
import { mergeSettingsJson, readManifest, writeManifest } from './merge.js';

/**
 * Copy skills to target directory with flat structure.
 * Source: skills/<category>/<skill-name>/SKILL.md
 * Target: .claude/skills/<skill-name>/SKILL.md
 */
function copySkillsToTarget(srcDir, destDir, options = {}) {
  const { dryRun, backup, targetDir } = options;
  const operations = [];

  // getFilesRecursive returns paths relative to srcDir
  const relativeFiles = getFilesRecursive(srcDir).filter((f) => f.endsWith('SKILL.md'));

  for (const relativePath of relativeFiles) {
    const srcFile = path.join(srcDir, relativePath);
    const parts = relativePath.split(path.sep);

    // Extract skill name from parent directory
    // e.g., dev/debug/SKILL.md → debug
    const skillName = parts[parts.length - 2];

    // Create .claude/skills/<skill-name>/SKILL.md
    const destSkillDir = path.join(destDir, skillName);
    const destFile = path.join(destSkillDir, 'SKILL.md');
    const exists = fs.existsSync(destFile);
    const relativeDestPath = path.relative(targetDir, destFile);

    if (dryRun) {
      operations.push({ type: exists ? 'overwrite' : 'create', path: relativeDestPath });
    } else {
      if (exists && backup) {
        backupFile(destFile, targetDir);
      }
      fs.mkdirSync(destSkillDir, { recursive: true });
      fs.copyFileSync(srcFile, destFile);
      operations.push({ type: exists ? 'overwrite' : 'create', path: relativeDestPath });
    }
  }

  return operations;
}

/**
 * Copy rules selectively based on technology configuration.
 * Only copies rules that match the included paths.
 */
function copyRulesSelectively(srcDir, destDir, includedPaths, skippedPaths, options = {}) {
  const { dryRun, backup, targetDir } = options;
  const operations = [];

  // getFilesRecursive returns paths relative to srcDir
  const relativeFiles = getFilesRecursive(srcDir);

  for (const relativePath of relativeFiles) {
    const relativeDir = path.dirname(relativePath);

    // Check if this file should be included
    if (!shouldIncludeRule(relativeDir, includedPaths)) {
      // Track skipped top-level directories for logging
      const topLevel = relativePath.split(path.sep).slice(0, 2).join('/');
      if (!skippedPaths.includes(topLevel)) {
        skippedPaths.push(topLevel);
      }
      continue;
    }

    const srcFile = path.join(srcDir, relativePath);
    const destFile = path.join(destDir, relativePath);
    const exists = fs.existsSync(destFile);
    const relativeDestPath = path.relative(targetDir, destFile);

    if (dryRun) {
      operations.push({ type: exists ? 'overwrite' : 'create', path: relativeDestPath });
    } else {
      if (exists && backup) {
        backupFile(destFile, targetDir);
      }
      fs.mkdirSync(path.dirname(destFile), { recursive: true });
      fs.copyFileSync(srcFile, destFile);
      operations.push({ type: exists ? 'overwrite' : 'create', path: relativeDestPath });
    }
  }

  return operations;
}

export function listTechnologies() {
  console.log(`\n${colors.bold('Available technologies:')}\n`);

  const techInfo = {
    angular: 'Angular 21 + Nx + NgRx + Signals',
    nextjs: 'Next.js 15 + React 19 + App Router',
    nestjs: 'NestJS 11 + Prisma/TypeORM + Passport',
    dotnet: '.NET 9 + ASP.NET Core + EF Core',
    fastapi: 'FastAPI + SQLAlchemy 2.0 + Pydantic v2',
    flask: 'Flask + SQLAlchemy 2.0 + Marshmallow',
  };

  for (const tech of AVAILABLE_TECHS) {
    const techPath = path.join(CONFIGS_DIR, tech);
    const exists = fs.existsSync(techPath);
    const status = exists ? colors.green('✓') : colors.red('✗');
    console.log(`  ${status} ${colors.bold(tech.padEnd(10))} ${techInfo[tech]}`);
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
  const { dryRun, force } = options;
  const backup = !force;

  if (dryRun) {
    console.log(`\n${colors.cyan('DRY RUN')} - No files will be modified\n`);
  }

  log.info(`${dryRun ? 'Would install' : 'Installing'} to: ${targetDir}`);
  console.log('');

  const operations = [];

  if (!dryRun) {
    fs.mkdirSync(path.join(targetDir, '.claude', 'rules'), { recursive: true });
  }

  for (const tech of techs) {
    log.info(`${dryRun ? 'Would install' : 'Installing'} ${tech}...`);

    const techDir = path.join(CONFIGS_DIR, tech);

    if (!fs.existsSync(techDir)) {
      log.error(`Technology directory not found: ${tech}`);
      process.exit(1);
    }

    const settingsPath = path.join(techDir, 'settings.json');
    if (fs.existsSync(settingsPath)) {
      const op = mergeSettingsJson(path.join(targetDir, '.claude', 'settings.json'), settingsPath, {
        dryRun,
        backup,
        targetDir,
      });
      operations.push(op);

      if (dryRun) {
        log.dry(`  settings.json (${op.type})`);
      } else {
        log.success(`  settings.json`);
      }
    }

    const rulesDir = path.join(techDir, 'rules');
    if (fs.existsSync(rulesDir)) {
      const ops = copyDirRecursive(rulesDir, path.join(targetDir, '.claude', 'rules', tech), {
        dryRun,
        backup,
        targetDir,
      });
      operations.push(...ops);

      if (dryRun) {
        log.dry(`  rules/${tech}/ (${ops.length} files)`);
      } else {
        log.success(`  rules/${tech}/`);
      }
    }

    if (options.withSkills) {
      const techSkillsDir = path.join(techDir, 'skills');
      if (fs.existsSync(techSkillsDir)) {
        const ops = copySkillsToTarget(techSkillsDir, path.join(targetDir, '.claude', 'skills'), {
          dryRun,
          backup,
          targetDir,
        });
        operations.push(...ops);
      }
    }
  }

  const sharedDir = path.join(CONFIGS_DIR, '_shared');

  if (options.withSkills) {
    log.info(`${dryRun ? 'Would install' : 'Installing'} skills...`);
    const skillsDir = path.join(sharedDir, 'skills');
    if (fs.existsSync(skillsDir)) {
      const ops = copySkillsToTarget(skillsDir, path.join(targetDir, '.claude', 'skills'), {
        dryRun,
        backup,
        targetDir,
      });
      operations.push(...ops);

      if (dryRun) {
        log.dry(`  skills/ (${ops.length} files)`);
      } else {
        log.success(`  skills/`);
      }
    }
  }

  if (options.withRules) {
    log.info(`${dryRun ? 'Would install' : 'Installing'} shared rules...`);
    const rulesDir = path.join(sharedDir, 'rules');
    if (fs.existsSync(rulesDir)) {
      const includedPaths = getRulePathsToInclude(techs);
      const skippedPaths = [];

      const ops = copyRulesSelectively(
        rulesDir,
        path.join(targetDir, '.claude', 'rules'),
        includedPaths,
        skippedPaths,
        { dryRun, backup, targetDir }
      );
      operations.push(...ops);

      if (dryRun) {
        log.dry(`  shared rules/ (${ops.length} files)`);
      } else {
        log.success(`  shared rules/`);
      }

      if (skippedPaths.length > 0) {
        const uniqueSkipped = [...new Set(skippedPaths)];
        log.info(`  (skipped: ${uniqueSkipped.join(', ')} - not applicable)`);
      }
    }
  }

  writeManifest(
    targetDir,
    {
      technologies: techs,
      options: {
        withSkills: options.withSkills,
        withRules: options.withRules,
      },
    },
    dryRun
  );

  console.log('');

  if (dryRun) {
    const creates = operations.filter((op) => op.type === 'create').length;
    const overwrites = operations.filter((op) => ['overwrite', 'merge'].includes(op.type)).length;

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
    withSkills: manifest.options?.withSkills || false,
    withRules: manifest.options?.withRules || false,
    all: false,
    dryRun,
    force,
  };

  init(manifest.technologies, initOptions);
}
