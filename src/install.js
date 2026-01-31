const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CONFIGS_DIR = path.join(__dirname, '..', 'configs');
const AVAILABLE_TECHS = ['angular', 'nextjs', 'nestjs', 'dotnet', 'python'];
const VERSION = require('../package.json').version;

const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  dim: (text) => `\x1b[2m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`,
};

const log = {
  info: (msg) => console.log(`${colors.blue('ℹ')} ${msg}`),
  success: (msg) => console.log(`${colors.green('✓')} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow('⚠')} ${msg}`),
  error: (msg) => console.log(`${colors.red('✗')} ${msg}`),
  dry: (msg) => console.log(`${colors.cyan('○')} ${msg}`),
};

function printUsage() {
  console.log(`
${colors.bold('AI Rules')} v${VERSION} - Claude Code configuration boilerplates

${colors.bold('Usage:')}
  ai-rules init [tech] [tech2] [options]
  ai-rules update [options]
  ai-rules status
  ai-rules list

${colors.bold('Commands:')}
  init      Install configuration (interactive if no tech specified)
  update    Update installed configs to latest version
  status    Show current installation status
  list      List available technologies

${colors.bold('Technologies:')}
  angular    Angular 21 + Nx + NgRx
  nextjs     Next.js 15 + React 19
  nestjs     NestJS + Prisma/TypeORM
  dotnet     .NET 9 + EF Core
  python     FastAPI/Flask + SQLAlchemy

${colors.bold('Options:')}
  --with-skills    Include skills (/learning, /review, /spec, /debug, etc.)
  --with-rules     Include shared rules (security, performance, accessibility)
  --all            Include skills and rules
  --target <dir>   Target directory (default: current directory)
  --dry-run        Preview changes without writing files
  --force          Overwrite files without backup (update command)

${colors.bold('Examples:')}
  ai-rules init                          # Interactive mode
  ai-rules init angular
  ai-rules init angular nestjs --all
  ai-rules init nextjs --with-skills --dry-run
  ai-rules update
  ai-rules update --force
  ai-rules status
`);
}

// ============================================================================
// File System Utilities
// ============================================================================

function getFilesRecursive(dir, baseDir = dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getFilesRecursive(fullPath, baseDir));
    } else {
      files.push(path.relative(baseDir, fullPath));
    }
  }
  return files;
}

function copyDirRecursive(src, dest, options = {}) {
  const { dryRun = false, backup = false, targetDir = dest } = options;
  const operations = [];

  if (!fs.existsSync(src)) return operations;

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      operations.push(...copyDirRecursive(srcPath, destPath, options));
    } else {
      const exists = fs.existsSync(destPath);
      const relativePath = path.relative(targetDir, destPath);

      if (dryRun) {
        operations.push({
          type: exists ? 'overwrite' : 'create',
          path: relativePath,
        });
      } else {
        if (exists && backup) {
          backupFile(destPath, targetDir);
        }
        fs.mkdirSync(dest, { recursive: true });
        fs.copyFileSync(srcPath, destPath);
        operations.push({
          type: exists ? 'overwrite' : 'create',
          path: relativePath,
        });
      }
    }
  }

  return operations;
}

function backupFile(filePath, targetDir) {
  const backupDir = path.join(targetDir, '.claude', 'backups');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const relativePath = path.relative(targetDir, filePath);
  const backupPath = path.join(backupDir, `${relativePath}.${timestamp}`);

  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.copyFileSync(filePath, backupPath);

  return backupPath;
}

// ============================================================================
// Config Merge Utilities
// ============================================================================

function mergeClaudeMd(targetPath, sourcePath, isFirst, options = {}) {
  const { dryRun = false, backup = false, targetDir } = options;
  const content = fs.readFileSync(sourcePath, 'utf8');
  const exists = fs.existsSync(targetPath);

  if (dryRun) {
    return { type: exists ? 'merge' : 'create', path: 'CLAUDE.md' };
  }

  if (exists && backup && isFirst) {
    backupFile(targetPath, targetDir);
  }

  if (isFirst) {
    fs.writeFileSync(targetPath, content);
  } else {
    const existing = fs.readFileSync(targetPath, 'utf8');
    fs.writeFileSync(targetPath, `${existing}\n\n---\n\n${content}`);
  }

  return { type: exists ? 'merge' : 'create', path: 'CLAUDE.md' };
}

function mergeSettingsJson(targetPath, sourcePath, options = {}) {
  const { dryRun = false, backup = false, targetDir } = options;
  const exists = fs.existsSync(targetPath);

  if (dryRun) {
    return { type: exists ? 'merge' : 'create', path: '.claude/settings.json' };
  }

  if (!exists) {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
    return { type: 'create', path: '.claude/settings.json' };
  }

  if (backup) {
    backupFile(targetPath, targetDir);
  }

  try {
    const existing = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
    const incoming = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

    const merged = {
      ...existing,
      permissions: {
        allow: [
          ...new Set([
            ...(existing.permissions?.allow || []),
            ...(incoming.permissions?.allow || []),
          ]),
        ],
        deny: [
          ...new Set([
            ...(existing.permissions?.deny || []),
            ...(incoming.permissions?.deny || []),
          ]),
        ],
      },
    };

    // Preserve other fields like env
    if (incoming.env) {
      merged.env = { ...(existing.env || {}), ...incoming.env };
    }

    fs.writeFileSync(targetPath, JSON.stringify(merged, null, 2) + '\n');
    return { type: 'merge', path: '.claude/settings.json' };
  } catch (e) {
    log.warning('Could not merge settings.json, overwriting');
    fs.copyFileSync(sourcePath, targetPath);
    return { type: 'overwrite', path: '.claude/settings.json' };
  }
}

// ============================================================================
// Installation Manifest
// ============================================================================

function getManifestPath(targetDir) {
  return path.join(targetDir, '.claude', '.ai-rules.json');
}

function readManifest(targetDir) {
  const manifestPath = getManifestPath(targetDir);
  if (!fs.existsSync(manifestPath)) return null;

  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    return null;
  }
}

function writeManifest(targetDir, data, dryRun = false) {
  if (dryRun) return;

  const manifestPath = getManifestPath(targetDir);
  const manifest = {
    version: VERSION,
    installedAt: new Date().toISOString(),
    ...data,
  };

  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}

// ============================================================================
// Interactive Mode
// ============================================================================

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function multiSelect(message, choices) {
  console.log(`\n${colors.bold(message)}`);
  console.log(colors.dim('(enter numbers separated by spaces, or "all")'));
  console.log('');

  choices.forEach((choice, i) => {
    console.log(`  ${colors.cyan(i + 1)}. ${choice.name} ${colors.dim(`- ${choice.description}`)}`);
  });

  console.log('');
  const answer = await prompt('Your selection: ');

  if (answer.toLowerCase() === 'all') {
    return choices.map((c) => c.value);
  }

  const indices = answer
    .split(/[\s,]+/)
    .map((s) => parseInt(s, 10) - 1)
    .filter((i) => i >= 0 && i < choices.length);

  return indices.map((i) => choices[i].value);
}

async function confirm(message, defaultValue = true) {
  const hint = defaultValue ? '[Y/n]' : '[y/N]';
  const answer = await prompt(`${message} ${hint} `);

  if (!answer) return defaultValue;
  return answer.toLowerCase().startsWith('y');
}

async function interactiveInit() {
  console.log(`\n${colors.bold('AI Rules')} - Interactive Setup\n`);

  const techChoices = [
    { name: 'Angular', value: 'angular', description: 'Angular 21 + Nx + NgRx + Signals' },
    { name: 'Next.js', value: 'nextjs', description: 'Next.js 15 + React 19 + App Router' },
    { name: 'NestJS', value: 'nestjs', description: 'NestJS 11 + Prisma/TypeORM + Passport' },
    { name: '.NET', value: 'dotnet', description: '.NET 9 + ASP.NET Core + EF Core' },
    { name: 'Python', value: 'python', description: 'FastAPI/Flask + SQLAlchemy 2.0' },
  ];

  const techs = await multiSelect('Select technologies:', techChoices);

  if (techs.length === 0) {
    log.error('No technology selected');
    process.exit(1);
  }

  const extraChoices = [
    { name: 'Skills', value: 'skills', description: '/learning, /review, /spec, /debug, etc.' },
    { name: 'Shared Rules', value: 'rules', description: 'security, performance, accessibility' },
  ];

  const extras = await multiSelect('Include extras:', extraChoices);

  const targetDir = await prompt(`Target directory ${colors.dim('(. for current)')}: `) || '.';

  const options = {
    target: targetDir === '.' ? null : targetDir,
    withSkills: extras.includes('skills'),
    withRules: extras.includes('rules'),
    all: false,
    dryRun: false,
    force: false,
  };

  console.log('');
  return { techs, options };
}

// ============================================================================
// Commands
// ============================================================================

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

  // Check for backups
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

  // Create directories
  if (!dryRun) {
    fs.mkdirSync(path.join(targetDir, '.claude', 'rules'), { recursive: true });
  }

  // Install each technology
  let isFirstClaudeMd = true;

  for (const tech of techs) {
    log.info(`${dryRun ? 'Would install' : 'Installing'} ${tech}...`);

    const techDir = path.join(CONFIGS_DIR, tech);

    if (!fs.existsSync(techDir)) {
      log.error(`Technology directory not found: ${tech}`);
      process.exit(1);
    }

    // Copy CLAUDE.md
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

    // Copy settings.json
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

    // Copy rules
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
  }

  // Install shared resources
  const sharedDir = path.join(CONFIGS_DIR, '_shared');

  if (options.withSkills || options.all) {
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

  if (options.withRules || options.all) {
    log.info(`${dryRun ? 'Would install' : 'Installing'} shared rules...`);
    const rulesDir = path.join(sharedDir, '.claude', 'rules');
    if (fs.existsSync(rulesDir)) {
      const ops = copyDirRecursive(
        rulesDir,
        path.join(targetDir, '.claude', 'rules'),
        { dryRun, backup, targetDir }
      );
      operations.push(...ops);

      if (dryRun) {
        log.dry(`  shared rules/ (${ops.length} files)`);
      } else {
        log.success(`  shared rules/`);
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
        content = content.replace(/@..\/_shared\/CLAUDE\.md/g, '');
        content = sharedContent + '\n\n' + content;
        fs.writeFileSync(targetClaudeMd, content);
        log.success('Merged shared conventions into CLAUDE.md');
      }
    }
  }

  // Write manifest
  writeManifest(
    targetDir,
    {
      technologies: techs,
      options: {
        withSkills: options.withSkills || options.all,
        withRules: options.withRules || options.all,
      },
    },
    dryRun
  );

  // Summary
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
    if (options.withSkills || options.all) {
      console.log('  - Skills: /learning, /review, /spec, /debug, and more');
    }
    if (options.withRules || options.all) {
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
  const backup = !force;

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

  // Re-run init with the same options
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

// ============================================================================
// CLI Entry Point
// ============================================================================

async function run(args) {
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    return;
  }

  if (args.length === 0) {
    printUsage();
    return;
  }

  const command = args[0];

  if (command === 'list') {
    listTechnologies();
    return;
  }

  if (command === 'status') {
    const targetIndex = args.indexOf('--target');
    const targetDir = targetIndex !== -1 ? args[targetIndex + 1] : process.cwd();
    status(targetDir);
    return;
  }

  if (command === 'update') {
    const options = {
      target: null,
      dryRun: args.includes('--dry-run'),
      force: args.includes('--force'),
    };

    const targetIndex = args.indexOf('--target');
    if (targetIndex !== -1) {
      options.target = args[targetIndex + 1];
    }

    await update(options);
    return;
  }

  if (command === 'init') {
    const options = {
      target: null,
      withSkills: false,
      withRules: false,
      all: false,
      dryRun: args.includes('--dry-run'),
      force: args.includes('--force'),
    };

    const techs = [];

    for (let i = 1; i < args.length; i++) {
      const arg = args[i];

      if (arg === '--with-skills') {
        options.withSkills = true;
      } else if (arg === '--with-rules') {
        options.withRules = true;
      } else if (arg === '--all') {
        options.all = true;
      } else if (arg === '--target') {
        options.target = args[++i];
      } else if (arg === '--dry-run' || arg === '--force') {
        // Already handled
      } else if (!arg.startsWith('-')) {
        if (AVAILABLE_TECHS.includes(arg)) {
          techs.push(arg);
        } else {
          log.error(`Unknown technology: ${arg}`);
          console.log(`Available: ${AVAILABLE_TECHS.join(', ')}`);
          process.exit(1);
        }
      }
    }

    // Interactive mode if no techs specified
    if (techs.length === 0) {
      try {
        const result = await interactiveInit();
        init(result.techs, { ...options, ...result.options });
      } catch (e) {
        // Handle Ctrl+C gracefully
        console.log('\nAborted.');
        process.exit(0);
      }
      return;
    }

    init(techs, options);
    return;
  }

  log.error(`Unknown command: ${command}`);
  printUsage();
  process.exit(1);
}

module.exports = { run, init, update, status, readManifest, VERSION };
