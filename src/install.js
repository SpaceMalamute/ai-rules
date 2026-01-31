const fs = require('fs');
const path = require('path');

const CONFIGS_DIR = path.join(__dirname, '..', 'configs');
const AVAILABLE_TECHS = ['angular', 'nextjs', 'nestjs', 'dotnet', 'python'];

const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`,
};

const log = {
  info: (msg) => console.log(`${colors.blue('ℹ')} ${msg}`),
  success: (msg) => console.log(`${colors.green('✓')} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow('⚠')} ${msg}`),
  error: (msg) => console.log(`${colors.red('✗')} ${msg}`),
};

function printUsage() {
  console.log(`
${colors.bold('AI Rules')} - Claude Code configuration boilerplates

${colors.bold('Usage:')}
  ai-rules init <tech> [tech2] [options]
  ai-rules list

${colors.bold('Technologies:')}
  angular    Angular 21 + Nx + NgRx
  nextjs     Next.js 15 + React 19
  nestjs     NestJS + Prisma/TypeORM
  dotnet     .NET 8 + EF Core
  python     FastAPI/Flask + SQLAlchemy

${colors.bold('Options:')}
  --with-skills    Include skills (/learning, /review, /spec, /debug)
  --with-commands  Include commands (fix-issue, review-pr, generate-tests)
  --with-rules     Include shared rules (security, performance, accessibility)
  --all            Include skills, commands, and rules
  --target <dir>   Target directory (default: current directory)

${colors.bold('Examples:')}
  ai-rules init angular
  ai-rules init angular nestjs --all
  ai-rules init nextjs python --with-skills
  ai-rules init dotnet --target ./my-project
  ai-rules list
`);
}

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) return;

  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function mergeClaudeMd(targetPath, sourcePath, isFirst) {
  const content = fs.readFileSync(sourcePath, 'utf8');

  if (isFirst) {
    fs.writeFileSync(targetPath, content);
  } else {
    const existing = fs.readFileSync(targetPath, 'utf8');
    fs.writeFileSync(targetPath, `${existing}\n\n---\n\n${content}`);
  }
}

function listTechnologies() {
  console.log(`\n${colors.bold('Available technologies:')}\n`);

  const techInfo = {
    angular: 'Angular 21 + Nx + NgRx + Signals',
    nextjs: 'Next.js 15 + React 19 + App Router',
    nestjs: 'NestJS 10 + Prisma/TypeORM + Passport',
    dotnet: '.NET 8 + ASP.NET Core + EF Core',
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
  const commands = fs.existsSync(path.join(sharedPath, '.claude', 'commands'));
  const rules = fs.existsSync(path.join(sharedPath, '.claude', 'rules'));

  console.log(`  ${skills ? colors.green('✓') : colors.red('✗')} skills     /learning, /review, /spec, /debug`);
  console.log(`  ${commands ? colors.green('✓') : colors.red('✗')} commands   fix-issue, review-pr, generate-tests`);
  console.log(`  ${rules ? colors.green('✓') : colors.red('✗')} rules      security, performance, accessibility`);
  console.log('');
}

function init(techs, options) {
  const targetDir = options.target || process.cwd();

  log.info(`Installing Claude Code config to: ${targetDir}`);
  console.log('');

  // Create directories
  fs.mkdirSync(path.join(targetDir, '.claude', 'rules'), { recursive: true });

  // Install each technology
  let isFirstClaudeMd = true;

  for (const tech of techs) {
    log.info(`Installing ${tech}...`);

    const techDir = path.join(CONFIGS_DIR, tech);

    if (!fs.existsSync(techDir)) {
      log.error(`Technology directory not found: ${tech}`);
      process.exit(1);
    }

    // Copy CLAUDE.md
    const claudeMdPath = path.join(techDir, 'CLAUDE.md');
    if (fs.existsSync(claudeMdPath)) {
      mergeClaudeMd(
        path.join(targetDir, 'CLAUDE.md'),
        claudeMdPath,
        isFirstClaudeMd
      );
      isFirstClaudeMd = false;
      log.success('  CLAUDE.md');
    }

    // Copy settings.json
    const settingsPath = path.join(techDir, '.claude', 'settings.json');
    if (fs.existsSync(settingsPath)) {
      const targetSettingsPath = path.join(targetDir, '.claude', 'settings.json');

      if (!fs.existsSync(targetSettingsPath)) {
        fs.copyFileSync(settingsPath, targetSettingsPath);
      } else {
        // Merge permissions
        try {
          const existing = JSON.parse(fs.readFileSync(targetSettingsPath, 'utf8'));
          const incoming = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

          const merged = {
            permissions: {
              allow: [...new Set([
                ...(existing.permissions?.allow || []),
                ...(incoming.permissions?.allow || []),
              ])],
              deny: [],
            },
          };

          fs.writeFileSync(targetSettingsPath, JSON.stringify(merged, null, 2));
        } catch (e) {
          log.warning('  Could not merge settings.json');
        }
      }
      log.success('  settings.json');
    }

    // Copy rules
    const rulesDir = path.join(techDir, '.claude', 'rules');
    if (fs.existsSync(rulesDir)) {
      copyDirRecursive(rulesDir, path.join(targetDir, '.claude', 'rules'));
      log.success('  rules/');
    }
  }

  // Install shared resources
  const sharedDir = path.join(CONFIGS_DIR, '_shared');

  if (options.withSkills || options.all) {
    log.info('Installing skills...');
    const skillsDir = path.join(sharedDir, '.claude', 'skills');
    if (fs.existsSync(skillsDir)) {
      copyDirRecursive(skillsDir, path.join(targetDir, '.claude', 'skills'));
      log.success('  skills/ (learning, review, spec, debug)');
    }
  }

  if (options.withCommands || options.all) {
    log.info('Installing commands...');
    const commandsDir = path.join(sharedDir, '.claude', 'commands');
    if (fs.existsSync(commandsDir)) {
      copyDirRecursive(commandsDir, path.join(targetDir, '.claude', 'commands'));
      log.success('  commands/ (fix-issue, review-pr, generate-tests)');
    }
  }

  if (options.withRules || options.all) {
    log.info('Installing shared rules...');
    const rulesDir = path.join(sharedDir, '.claude', 'rules');
    if (fs.existsSync(rulesDir)) {
      copyDirRecursive(rulesDir, path.join(targetDir, '.claude', 'rules'));
      log.success('  rules/ (security, performance, accessibility)');
    }
  }

  // Resolve @../_shared/CLAUDE.md imports
  const targetClaudeMd = path.join(targetDir, 'CLAUDE.md');
  if (fs.existsSync(targetClaudeMd)) {
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

  console.log('');
  log.success('Installation complete!');
  console.log('');
  console.log('Installed:');
  console.log(`  - Technologies: ${techs.join(', ')}`);
  if (options.withSkills || options.all) {
    console.log('  - Skills: /learning, /review, /spec, /debug');
  }
  if (options.withCommands || options.all) {
    console.log('  - Commands: fix-issue, review-pr, generate-tests');
  }
  if (options.withRules || options.all) {
    console.log('  - Rules: security, performance, accessibility');
  }
  console.log('');
  console.log(`Files created in: ${targetDir}`);
}

function run(args) {
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    return;
  }

  const command = args[0];

  if (command === 'list') {
    listTechnologies();
    return;
  }

  if (command === 'init') {
    const options = {
      target: null,
      withSkills: false,
      withCommands: false,
      withRules: false,
      all: false,
    };

    const techs = [];

    for (let i = 1; i < args.length; i++) {
      const arg = args[i];

      if (arg === '--with-skills') {
        options.withSkills = true;
      } else if (arg === '--with-commands') {
        options.withCommands = true;
      } else if (arg === '--with-rules') {
        options.withRules = true;
      } else if (arg === '--all') {
        options.all = true;
      } else if (arg === '--target') {
        options.target = args[++i];
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

    if (techs.length === 0) {
      log.error('No technology specified');
      printUsage();
      process.exit(1);
    }

    init(techs, options);
    return;
  }

  log.error(`Unknown command: ${command}`);
  printUsage();
  process.exit(1);
}

module.exports = { run };
