const readline = require('readline');
const { colors, log } = require('./utils');
const { VERSION, AVAILABLE_TECHS } = require('./config');
const { init, update, status, listTechnologies } = require('./installer');

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
  --minimal        Only install CLAUDE.md, settings.json, and tech rules (no shared skills/rules)
  --target <dir>   Target directory (default: current directory)
  --dry-run        Preview changes without writing files
  --force          Overwrite files without backup (update command)

${colors.bold('Examples:')}
  ai-rules init                          # Interactive mode
  ai-rules init angular                  # Full install (skills + rules)
  ai-rules init angular --minimal        # Minimal install
  ai-rules init nextjs --dry-run
  ai-rules update
  ai-rules update --force
  ai-rules status
`);
}

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
    const minimal = args.includes('--minimal');
    const options = {
      target: null,
      withSkills: !minimal,
      withRules: !minimal,
      dryRun: args.includes('--dry-run'),
      force: args.includes('--force'),
    };

    const techs = [];

    for (let i = 1; i < args.length; i++) {
      const arg = args[i];

      if (arg === '--minimal') {
        // Already handled above
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
      } catch (_e) {
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

module.exports = { run };
