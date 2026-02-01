const fs = require('fs');
const path = require('path');
const { colors, log, getFilesRecursive, copyDirRecursive, backupFile } = require('./utils');
const { CONFIGS_DIR, AVAILABLE_TECHS, VERSION, TECH_CONFIG, getRuleCategoriesToInclude } = require('./config');
const { mergeClaudeMd, mergeSettingsJson, readManifest, writeManifest } = require('./merge');

function listTechnologies() {
  console.log(`\n${colors.bold('Available technologies:')}\n`);

  const techInfo = {
    angular: 'Angular 21 + Nx + NgRx + Signals',
    nextjs: 'Next.js 15 + React 19 + App Router',
    nestjs: 'NestJS 11 + Prisma/TypeORM + Passport',
    dotnet: '.NET 9 + ASP.NET Core + EF Core',
    python: 'FastAPI/Flask + SQLAlchemy 2.0',
  };

  for (const tech of AVAILABLE_TECHS) {
    const techPath = path.join(CONFIGS_DIR, tech);
    const exists = fs.existsSync(techPath);
    const status = exists ? colors.green('✓') : colors.red('✗');
    console.log(`  ${status} ${colors.bold(tech.padEnd(10))} ${techInfo[tech]}`);
  }

  console.log(`\n${colors.bold('Shared resources:')}\n`);

  const sharedPath = path.join(CONFIGS_DIR, '_shared');
  const skills = fs.existsSync(path.join(sharedPath, '.claude', 'skills'));
  const rules = fs.existsSync(path.join(sharedPath, '.claude', 'rules'));

  console.log(`  ${skills ? colors.green('✓') : colors.red('✗')} skills     /learning, /review, /spec, /debug, and more`);
  console.log(`  ${rules ? colors.green('✓') : colors.red('✗')} rules      security, performance, accessibility`);
  console.log('');
}

function status(targetDir) {
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
  console.log(`  ${colors.bold('Installed at:')}     ${new Date(manifest.installedAt).toLocaleString()}`);
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
    console.log(`  ${colors.yellow('⚠')} Update available! Run ${colors.cyan('ai-rules update')} to update.`);
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

function init(techs, options) {
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

  let isFirstClaudeMd = true;

  for (const tech of techs) {
    log.info(`${dryRun ? 'Would install' : 'Installing'} ${tech}...`);

    const techDir = path.join(CONFIGS_DIR, tech);

    if (!fs.existsSync(techDir)) {
      log.error(`Technology directory not found: ${tech}`);
      process.exit(1);
    }

    const claudeMdPath = path.join(techDir, 'CLAUDE.md');
    if (fs.existsSync(claudeMdPath)) {
      const op = mergeClaudeMd(
        path.join(targetDir, 'CLAUDE.md'),
        claudeMdPath,
        isFirstClaudeMd,
        { dryRun, backup, targetDir }
      );
      operations.push(op);
      isFirstClaudeMd = false;

      if (dryRun) {
        log.dry(`  CLAUDE.md (${op.type})`);
      } else {
        log.success(`  CLAUDE.md`);
      }
    }

    const settingsPath = path.join(techDir, '.claude', 'settings.json');
    if (fs.existsSync(settingsPath)) {
      const op = mergeSettingsJson(
        path.join(targetDir, '.claude', 'settings.json'),
        settingsPath,
        { dryRun, backup, targetDir }
      );
      operations.push(op);

      if (dryRun) {
        log.dry(`  settings.json (${op.type})`);
      } else {
        log.success(`  settings.json`);
      }
    }

    const rulesDir = path.join(techDir, '.claude', 'rules');
    if (fs.existsSync(rulesDir)) {
      const ops = copyDirRecursive(
        rulesDir,
        path.join(targetDir, '.claude', 'rules'),
        { dryRun, backup, targetDir }
      );
      operations.push(...ops);

      if (dryRun) {
        log.dry(`  rules/ (${ops.length} files)`);
      } else {
        log.success(`  rules/`);
      }
    }

    if (options.withSkills) {
      const techSkillsDir = path.join(techDir, '.claude', 'skills');
      if (fs.existsSync(techSkillsDir)) {
        const ops = copyDirRecursive(
          techSkillsDir,
          path.join(targetDir, '.claude', 'skills'),
          { dryRun, backup, targetDir }
        );
        operations.push(...ops);
      }
    }
  }

  const sharedDir = path.join(CONFIGS_DIR, '_shared');

  if (options.withSkills) {
    log.info(`${dryRun ? 'Would install' : 'Installing'} skills...`);
    const skillsDir = path.join(sharedDir, '.claude', 'skills');
    if (fs.existsSync(skillsDir)) {
      const ops = copyDirRecursive(
        skillsDir,
        path.join(targetDir, '.claude', 'skills'),
        { dryRun, backup, targetDir }
      );
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
    const rulesDir = path.join(sharedDir, '.claude', 'rules');
    if (fs.existsSync(rulesDir)) {
      const categoriesToInclude = getRuleCategoriesToInclude(techs);
      const selectiveCategories = Object.keys(TECH_CONFIG.ruleCategories);
      const skippedCategories = [];

      const entries = fs.readdirSync(rulesDir, { withFileTypes: true });
      let totalOps = 0;

      for (const entry of entries) {
        if (selectiveCategories.includes(entry.name) && !categoriesToInclude.has(entry.name)) {
          skippedCategories.push(entry.name);
          continue;
        }

        const srcPath = path.join(rulesDir, entry.name);
        const destPath = path.join(targetDir, '.claude', 'rules', entry.name);

        if (entry.isDirectory()) {
          const ops = copyDirRecursive(srcPath, destPath, { dryRun, backup, targetDir });
          operations.push(...ops);
          totalOps += ops.length;
        } else {
          const exists = fs.existsSync(destPath);
          const relativePath = path.relative(targetDir, destPath);

          if (dryRun) {
            operations.push({ type: exists ? 'overwrite' : 'create', path: relativePath });
          } else {
            if (exists && backup) {
              backupFile(destPath, targetDir);
            }
            fs.mkdirSync(path.dirname(destPath), { recursive: true });
            fs.copyFileSync(srcPath, destPath);
            operations.push({ type: exists ? 'overwrite' : 'create', path: relativePath });
          }
          totalOps++;
        }
      }

      if (dryRun) {
        log.dry(`  shared rules/ (${totalOps} files)`);
      } else {
        log.success(`  shared rules/`);
      }

      if (skippedCategories.length > 0) {
        log.info(`  (skipped: ${skippedCategories.join(', ')} - not applicable)`);
      }
    }
  }

  // Resolve @../_shared/CLAUDE.md imports
  const targetClaudeMd = path.join(targetDir, 'CLAUDE.md');
  if (!dryRun && fs.existsSync(targetClaudeMd)) {
    let content = fs.readFileSync(targetClaudeMd, 'utf8');

    if (content.includes('@../_shared/CLAUDE.md')) {
      const sharedClaudeMd = path.join(sharedDir, 'CLAUDE.md');
      if (fs.existsSync(sharedClaudeMd)) {
        const sharedContent = fs.readFileSync(sharedClaudeMd, 'utf8');
        content = content.replace(/@..\/shared\/CLAUDE\.md/g, '');
        content = sharedContent + '\n\n' + content;
        fs.writeFileSync(targetClaudeMd, content);
        log.success('Merged shared conventions into CLAUDE.md');
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

async function update(options) {
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

module.exports = {
  init,
  update,
  status,
  listTechnologies,
};
