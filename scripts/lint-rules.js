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
  // Simple YAML parser for our use case (paths, name, description)
  const result = {};
  const lines = yaml.split('\n');
  let currentKey = null;
  let currentArray = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Check for key: value
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

    // Check for array item
    const arrayMatch = line.match(/^\s+-\s*["']?(.+?)["']?\s*$/);
    if (arrayMatch && currentArray) {
      currentArray.push(arrayMatch[1]);
    }
  }

  return result;
}

function validateRule(filePath) {
  const relativePath = path.relative(CONFIGS_DIR, filePath);
  const content = fs.readFileSync(filePath, 'utf8');

  // Skills don't need frontmatter
  if (filePath.includes('/skills/')) {
    filesChecked++;
    return;
  }

  // CLAUDE.md files don't need frontmatter
  if (path.basename(filePath) === 'CLAUDE.md') {
    filesChecked++;
    return;
  }

  const frontmatter = extractFrontmatter(content);

  // Rules should have frontmatter with paths
  if (!frontmatter) {
    // Some shared rules apply globally, that's OK
    if (filePath.includes('shared/.claude/rules/')) {
      // Check if it has paths anyway (some do, some don't)
      filesChecked++;
      return;
    }
    console.log(`${colors.yellow('⚠')} ${relativePath}: No frontmatter found`);
    warnings++;
    filesChecked++;
    return;
  }

  // Parse frontmatter
  let parsed;
  try {
    parsed = parseYamlSimple(frontmatter);
  } catch (e) {
    console.log(`${colors.red('✗')} ${relativePath}: Invalid YAML frontmatter`);
    console.log(`  ${colors.dim(e.message)}`);
    errors++;
    filesChecked++;
    return;
  }

  // Validate paths if present
  if (parsed.paths) {
    if (!Array.isArray(parsed.paths)) {
      console.log(`${colors.red('✗')} ${relativePath}: 'paths' must be an array`);
      errors++;
      filesChecked++;
      return;
    }

    for (const pattern of parsed.paths) {
      // Basic glob pattern validation
      if (typeof pattern !== 'string') {
        console.log(`${colors.red('✗')} ${relativePath}: Invalid path pattern: ${pattern}`);
        errors++;
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
