#!/usr/bin/env node

/**
 * Linter for rule files
 * Validates that all .md files in configs have valid YAML frontmatter
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIGS_DIR = path.join(__dirname, '..', 'configs');

const VALID_KEYS = new Set([
  'description',
  'paths',
  'alwaysApply',
  'name',
  'version',
]);

const CATCH_ALL_PATTERNS = new Set(['**/*', '**', '*']);

const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  dim: (text) => `\x1b[2m${text}\x1b[0m`,
};

let errors = 0;
let warnings = 0;
let filesChecked = 0;

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  return match[1];
}

function parseYamlSimple(yaml) {
  const result = {};
  const lines = yaml.split('\n');
  let currentKey = null;
  let currentArray = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const keyMatch = line.match(/^(\w+):\s*(.*)$/);
    if (keyMatch) {
      const [, key, value] = keyMatch;
      if (value) {
        result[key] = value.replace(/^["']|["']$/g, '');
      } else {
        currentKey = key;
        currentArray = [];
        result[key] = currentArray;
      }
      continue;
    }

    const arrayMatch = line.match(/^\s+-\s*["']?(.+?)["']?\s*$/);
    if (arrayMatch && currentArray) {
      currentArray.push(arrayMatch[1]);
    }
  }

  return result;
}

function error(relativePath, message) {
  console.log(`${colors.red('✗')} ${relativePath}: ${message}`);
  errors++;
}

function warn(relativePath, message) {
  console.log(`${colors.yellow('⚠')} ${relativePath}: ${message}`);
  warnings++;
}

function validateRule(filePath) {
  const relativePath = path.relative(CONFIGS_DIR, filePath);
  const content = fs.readFileSync(filePath, 'utf8');

  // Skills have their own format
  if (filePath.includes('/skills/')) {
    filesChecked++;
    return;
  }

  const frontmatter = extractFrontmatter(content);

  if (!frontmatter) {
    error(relativePath, 'No frontmatter found');
    filesChecked++;
    return;
  }

  let parsed;
  try {
    parsed = parseYamlSimple(frontmatter);
  } catch (e) {
    error(relativePath, `Invalid YAML frontmatter: ${e.message}`);
    filesChecked++;
    return;
  }

  // Check for unknown keys
  for (const key of Object.keys(parsed)) {
    if (!VALID_KEYS.has(key)) {
      warn(relativePath, `Unknown frontmatter key: "${key}"`);
    }
  }

  // Must have description
  if (!parsed.description) {
    error(relativePath, 'Missing "description" field');
  } else if (typeof parsed.description === 'string' && parsed.description.trim() === '') {
    error(relativePath, 'Empty "description" field');
  }

  // Must have either paths or alwaysApply (not both, not neither)
  const hasPaths = parsed.paths !== undefined;
  const hasAlwaysApply = parsed.alwaysApply !== undefined;

  if (hasPaths && hasAlwaysApply) {
    error(relativePath, 'Cannot have both "paths" and "alwaysApply"');
  } else if (!hasPaths && !hasAlwaysApply) {
    error(relativePath, 'Must have either "paths" or "alwaysApply"');
  }

  // Validate paths array
  if (hasPaths) {
    if (!Array.isArray(parsed.paths)) {
      error(relativePath, '"paths" must be an array');
    } else if (parsed.paths.length === 0) {
      error(relativePath, '"paths" array is empty (rule will never activate)');
    } else {
      for (const pattern of parsed.paths) {
        if (typeof pattern !== 'string') {
          error(relativePath, `Invalid path pattern: ${pattern}`);
          continue;
        }

        // Catch-all patterns
        if (CATCH_ALL_PATTERNS.has(pattern)) {
          error(relativePath, `Catch-all pattern "${pattern}" — use "alwaysApply: true" or narrow the glob`);
        }

        // Root-only globs (no **/ prefix, but has extension)
        if (/^\*\.\w+$/.test(pattern)) {
          warn(relativePath, `Root-only glob "${pattern}" — did you mean "**/${pattern}"?`);
        }
      }
    }
  }

  filesChecked++;
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.name.endsWith('.md')) {
      validateRule(fullPath);
    }
  }
}

function main() {
  console.log('\nValidating rule files...\n');

  walkDir(CONFIGS_DIR);

  console.log('');
  console.log(`Files checked: ${filesChecked}`);

  if (errors > 0) {
    console.log(`${colors.red(`Errors: ${errors}`)}`);
  }
  if (warnings > 0) {
    console.log(`${colors.yellow(`Warnings: ${warnings}`)}`);
  }

  if (errors === 0 && warnings === 0) {
    console.log(`${colors.green('✓')} All rules are valid!`);
  }

  console.log('');

  process.exit(errors > 0 ? 1 : 0);
}

main();
