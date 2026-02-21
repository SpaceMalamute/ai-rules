import { checkbox, input, select, Separator } from '@inquirer/prompts';
import { colors, log } from './utils.js';
import { VERSION, AVAILABLE_TECHS, AVAILABLE_TARGETS, DEFAULT_TARGET, TECH_CONFIG } from './config.js';
import { init, update, status, listTechnologies } from './installer.js';
import { readManifest } from './merge.js';

function printUsage() {
  console.log(`
${colors.bold('AI Rules')} v${VERSION} - AI tool configuration boilerplates

${colors.bold('Usage:')}
  ai-rules init [tech] [tech2] [options]
  ai-rules add <tech> [options]
  ai-rules update [options]
  ai-rules status
  ai-rules list

${colors.bold('Commands:')}
  init      Install configuration (interactive if no tech specified)
  add       Add a technology to existing installation
  update    Update installed configs to latest version
  status    Show current installation status
  list      List available technologies

${colors.bold('Technologies:')}
  ${colors.dim('Frontend')}
  angular    Angular 21 + Nx + NgRx
  react      React 19 + Vite + Vitest
  ${colors.dim('Fullstack')}
  nextjs     Next.js 15 + React 19
  ${colors.dim('Backend')}
  nestjs     NestJS + Prisma/TypeORM
  adonisjs   AdonisJS 6 + Lucid + VineJS
  hono       Hono + Zod + Multi-runtime
  elysia     Elysia + TypeBox + Bun
  dotnet     .NET 9 + EF Core
  fastapi    FastAPI + SQLAlchemy + Pydantic
  flask      Flask + SQLAlchemy + Marshmallow

${colors.bold('AI Targets:')}
  claude     Claude Code (.claude/rules/)
  cursor     Cursor (.cursor/rules/)
  copilot    GitHub Copilot (.github/instructions/)
  windsurf   Windsurf (.windsurf/rules/)

${colors.bold('Options:')}
  --minimal            Only install settings.json and tech rules (no shared skills/rules)
  --dir <directory>    Target directory (default: current directory)
  --targets <t1,t2>    AI tools to target (default: claude)
  --dry-run            Preview changes without writing files
  --force              Overwrite files without backup (update command)

${colors.bold('Examples:')}
  ai-rules init                                    # Interactive mode
  ai-rules init angular                            # Install for Claude (default)
  ai-rules init angular --targets cursor           # Install for Cursor
  ai-rules init angular --targets claude,cursor    # Install for both
  ai-rules init angular --minimal                  # Minimal install
  ai-rules add nestjs                              # Add NestJS to existing install
  ai-rules update
  ai-rules status
`);
}

async function askVariantQuestions(techs) {
  const techChoices = {};
  for (const tech of techs) {
    const config = TECH_CONFIG.technologies[tech];
    if (!config?.variants) continue;

    techChoices[tech] = {};
    for (const [category, variant] of Object.entries(config.variants)) {
      const choices = Object.entries(variant.options).map(([value, name]) => ({
        name, value,
      }));
      if (variant.optional) {
        choices.push({ name: 'None', value: '__none__' });
      }

      const answer = await select({
        message: `${tech} — ${variant.message}:`,
        choices,
        default: variant.default,
      });

      techChoices[tech][category] = answer;
    }
  }
  return techChoices;
}

async function interactiveInit() {
  console.log(`\n${colors.bold('AI Rules')} - Interactive Setup\n`);

  const techs = await checkbox({
    message: 'Select technologies:',
    instructions: '(Space to select, Enter to confirm)',
    choices: [
      new Separator('── Frontend ──'),
      { name: 'Angular - Angular 21 + Nx + NgRx + Signals', value: 'angular' },
      { name: 'React - React 19 + Vite + Vitest', value: 'react' },
      new Separator('── Fullstack ──'),
      { name: 'Next.js - Next.js 15 + React 19 + App Router', value: 'nextjs' },
      new Separator('── Backend ──'),
      { name: 'NestJS - NestJS 11 + Prisma/TypeORM + Passport', value: 'nestjs' },
      { name: 'AdonisJS - AdonisJS 6 + Lucid ORM + VineJS', value: 'adonisjs' },
      { name: 'Hono - Hono v4 + Zod + Multi-runtime', value: 'hono' },
      { name: 'Elysia - Elysia v1.4 + TypeBox + Bun + Eden', value: 'elysia' },
      { name: '.NET - .NET 9 + ASP.NET Core + EF Core', value: 'dotnet' },
      { name: 'FastAPI - FastAPI + SQLAlchemy 2.0 + Pydantic v2', value: 'fastapi' },
      { name: 'Flask - Flask + SQLAlchemy 2.0 + Marshmallow', value: 'flask' },
    ],
  });

  if (techs.length === 0) {
    log.error('No technology selected');
    process.exit(1);
  }

  // Ask variant questions for techs that have them
  const techChoices = await askVariantQuestions(techs);

  const targets = await checkbox({
    message: 'Select AI tools:',
    instructions: '(Space to select, Enter to confirm)',
    choices: [
      { name: 'Claude Code - .claude/rules/', value: 'claude', checked: true },
      { name: 'Cursor - .cursor/rules/', value: 'cursor' },
      { name: 'GitHub Copilot - .github/instructions/', value: 'copilot' },
      { name: 'Windsurf - .windsurf/rules/', value: 'windsurf' },
    ],
  });

  if (targets.length === 0) {
    log.error('No AI tool selected');
    process.exit(1);
  }

  const extras = await checkbox({
    message: 'Include extras:',
    instructions: '(Space to toggle, Enter to confirm)',
    choices: [
      {
        name: 'Skills - /learning, /review, /spec, /debug, etc. (Claude only)',
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
    targets,
    withSkills: extras.includes('skills'),
    withRules: extras.includes('rules'),
    techChoices,
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
    const dirIndex = args.indexOf('--dir');
    const targetDir = dirIndex !== -1 ? args[dirIndex + 1] : process.cwd();
    status(targetDir);
    return;
  }

  if (command === 'update') {
    const options = {
      target: null,
      dryRun: args.includes('--dry-run'),
      force: args.includes('--force'),
    };

    const dirIndex = args.indexOf('--dir');
    if (dirIndex !== -1) {
      options.target = args[dirIndex + 1];
    }

    await update(options);
    return;
  }

  if (command === 'add') {
    const dirIndex = args.indexOf('--dir');
    const targetDir = dirIndex !== -1 ? args[dirIndex + 1] : process.cwd();

    const manifest = readManifest(targetDir);
    if (!manifest) {
      log.error('No ai-rules installation found.');
      console.log(`Run ${colors.cyan('ai-rules init')} first.`);
      process.exit(1);
    }

    const newTechs = [];
    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      if (arg === '--dir' || arg === '--targets') {
        i++; // Skip next arg
      } else if (arg === '--dry-run' || arg === '--force') {
        // Handled below
      } else if (!arg.startsWith('-')) {
        if (AVAILABLE_TECHS.includes(arg)) {
          if (manifest.technologies.includes(arg)) {
            log.warning(`${arg} is already installed, skipping`);
          } else {
            newTechs.push(arg);
          }
        } else {
          log.error(`Unknown technology: ${arg}`);
          console.log(`Available: ${AVAILABLE_TECHS.join(', ')}`);
          process.exit(1);
        }
      }
    }

    if (newTechs.length === 0) {
      log.error('No new technology to add');
      process.exit(1);
    }

    // Ask variant questions for new techs only
    let newTechChoices = {};
    try {
      newTechChoices = await askVariantQuestions(newTechs);
    } catch (_e) {
      console.log('\nAborted.');
      process.exit(0);
    }

    // Merge with existing choices from manifest
    const existingChoices = manifest.options?.techChoices || {};
    const mergedChoices = { ...existingChoices, ...newTechChoices };

    const allTechs = [...manifest.technologies, ...newTechs];

    const options = {
      target: targetDir === process.cwd() ? null : targetDir,
      targets: manifest.targets || [DEFAULT_TARGET],
      withSkills: manifest.options?.withSkills ?? true,
      withRules: manifest.options?.withRules ?? true,
      techChoices: mergedChoices,
      dryRun: args.includes('--dry-run'),
      force: args.includes('--force'),
    };

    console.log('');
    log.info(`Adding ${newTechs.join(', ')} to existing installation`);

    init(allTechs, options);
    return;
  }

  if (command === 'init') {
    const minimal = args.includes('--minimal');
    const options = {
      target: null,
      targets: [DEFAULT_TARGET],
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
      } else if (arg === '--dir') {
        options.target = args[++i];
      } else if (arg === '--targets') {
        const targetsArg = args[++i];
        if (!targetsArg) {
          log.error('--targets requires a value');
          process.exit(1);
        }
        // Support both comma-separated and space-separated
        const parsedTargets = targetsArg.split(',').map((t) => t.trim());
        // Validate targets
        for (const t of parsedTargets) {
          if (!AVAILABLE_TARGETS.includes(t)) {
            log.error(`Unknown target: ${t}`);
            console.log(`Available: ${AVAILABLE_TARGETS.join(', ')}`);
            process.exit(1);
          }
        }
        options.targets = parsedTargets;
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
