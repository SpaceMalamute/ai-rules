import fs from 'fs';
import path from 'path';
import { log, backupFile } from './utils.js';
import { VERSION } from './config.js';

export function mergeClaudeMd(targetPath, sourcePath, isFirst, options = {}) {
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

export function mergeSettingsJson(targetPath, sourcePath, options = {}) {
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

    if (incoming.env) {
      merged.env = { ...(existing.env || {}), ...incoming.env };
    }

    fs.writeFileSync(targetPath, JSON.stringify(merged, null, 2) + '\n');
    return { type: 'merge', path: '.claude/settings.json' };
  } catch (_e) {
    log.warning('Could not merge settings.json, overwriting');
    fs.copyFileSync(sourcePath, targetPath);
    return { type: 'overwrite', path: '.claude/settings.json' };
  }
}

function getManifestPath(targetDir) {
  return path.join(targetDir, '.claude', '.ai-rules.json');
}

export function readManifest(targetDir) {
  const manifestPath = getManifestPath(targetDir);
  if (!fs.existsSync(manifestPath)) return null;

  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    return null;
  }
}

export function writeManifest(targetDir, data, dryRun = false) {
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
