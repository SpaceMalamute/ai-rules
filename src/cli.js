import { checkbox, input } from '@inquirer/prompts';
import { colors, log } from './utils.js';
import { VERSION, AVAILABLE_TECHS } from './config.js';
import { init, update, status, listTechnologies } from './installer.js';

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
  fastapi    FastAPI + SQLAlchemy + Pydantic
  flask      Flask + SQLAlchemy + Marshmallow

${colors.bold('Options:')}
  --minimal        Only install settings.json and tech rules (no shared skills/rules)
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

async function interactiveInit() {
  console.log(`\n${colors.bold('AI Rules')} - Interactive Setup\n`);

  const techs = await checkbox({
    message: 'Select technologies:',
    instructions: '(Space to select, Enter to confirm)',
    choices: [
      { name: 'Angular - Angular 21 + Nx + NgRx + Signals', value: 'angular' },
      { name: 'Next.js - Next.js 15 + React 19 + App Router', value: 'nextjs' },
      { name: 'NestJS - NestJS 11 + Prisma/TypeORM + Passport', value: 'nestjs' },
      { name: '.NET - .NET 9 + ASP.NET Core + EF Core', value: 'dotnet' },
      { name: 'FastAPI - FastAPI + SQLAlchemy 2.0 + Pydantic v2', value: 'fastapi' },
      { name: 'Flask - Flask + SQLAlchemy 2.0 + Marshmallow', value: 'flask' },
    ],
  });

  if (techs.length === 0) {
    log.error('No technology selected');
    process.exit(1);
  }

  const extras = await checkbox({
    message: 'Include extras:',
    instructions: '(Space to toggle, Enter to confirm)',
    choices: [
      {
        name: 'Skills - /learning, /review, /spec, /debug, etc.',
        value: 'skills',
        checked: true,
      },
      {
        name: 'Shared Rules - security, performance, accessibility',
        value: 'rules',
        checked: true,
      },
    ],
  });

  const targetDir = await input({
    message: 'Target directory:',
    default: '.',
  });

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

export async function run(args) {
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
