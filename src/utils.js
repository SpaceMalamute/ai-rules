import fs from 'fs';
import path from 'path';

export const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  dim: (text) => `\x1b[2m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`,
};

export const log = {
  info: (msg) => console.log(`${colors.blue('ℹ')} ${msg}`),
  success: (msg) => console.log(`${colors.green('✓')} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow('⚠')} ${msg}`),
  error: (msg) => console.log(`${colors.red('✗')} ${msg}`),
  dry: (msg) => console.log(`${colors.cyan('○')} ${msg}`),
};

const amber = (t) => `\x1b[38;5;208m${t}\x1b[0m`;

export const BANNER = [
  colors.dim('  ✦  ·    ✧          ·    ✦  ·'),
  `  ${amber('▄▀█ █   █▀█ █ █ █   █▀▀ █▀▀')}`,
  `  ${amber('█▀█ █   █▀▄ █▄█ █▄▄ ██▄ ▄▄█')}`,
  colors.dim('  ·    ✦     ·   ✧     ·    ✧'),
].join('\n');

export function printBanner() {
  console.log('');
  console.log(BANNER);
  console.log('');
}

export function printCoffee() {
  const url = 'https://buymeacoffee.com/spacemalamute';
  console.log('');
  console.log(colors.dim(`  ${colors.yellow('☕')} Built with love and too much coffee → ${colors.cyan(url)}`));
}

export function getFilesRecursive(dir, baseDir = dir) {
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

export function copyDirRecursive(src, dest, options = {}) {
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

export function backupFile(filePath, targetDir) {
  const backupDir = path.join(targetDir, '.claude', 'backups');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const relativePath = path.relative(targetDir, filePath);
  const backupPath = path.join(backupDir, `${relativePath}.${timestamp}`);

  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.copyFileSync(filePath, backupPath);

  return backupPath;
}
