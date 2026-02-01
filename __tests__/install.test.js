import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

const { init, update, status, readManifest, VERSION } = require('../src/index.js');

describe('ai-rules', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-rules-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('init', () => {
    it('should create CLAUDE.md for single technology', () => {
      init(['angular'], { target: tempDir });

      const claudeMdPath = path.join(tempDir, 'CLAUDE.md');
      expect(fs.existsSync(claudeMdPath)).toBe(true);

      const content = fs.readFileSync(claudeMdPath, 'utf8');
      expect(content).toContain('Angular');
    });

    it('should create settings.json', () => {
      init(['angular'], { target: tempDir });

      const settingsPath = path.join(tempDir, '.claude', 'settings.json');
      expect(fs.existsSync(settingsPath)).toBe(true);

      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      expect(settings.permissions).toBeDefined();
      expect(settings.permissions.allow).toBeInstanceOf(Array);
    });

    it('should create rules directory', () => {
      init(['angular'], { target: tempDir });

      const rulesDir = path.join(tempDir, '.claude', 'rules');
      expect(fs.existsSync(rulesDir)).toBe(true);

      const files = fs.readdirSync(rulesDir);
      expect(files.length).toBeGreaterThan(0);
    });

    it('should merge CLAUDE.md for multiple technologies', () => {
      init(['angular', 'nestjs'], { target: tempDir });

      const claudeMdPath = path.join(tempDir, 'CLAUDE.md');
      const content = fs.readFileSync(claudeMdPath, 'utf8');

      expect(content).toContain('Angular');
      expect(content).toContain('NestJS');
      expect(content).toContain('---'); // Separator between techs
    });

    it('should merge settings.json preserving deny rules', () => {
      // Create existing settings with deny rules
      fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, '.claude', 'settings.json'),
        JSON.stringify({
          permissions: {
            allow: ['Bash(echo *)'],
            deny: ['Bash(rm -rf *)'],
          },
        })
      );

      init(['angular'], { target: tempDir });

      const settings = JSON.parse(
        fs.readFileSync(path.join(tempDir, '.claude', 'settings.json'), 'utf8')
      );

      // Should preserve existing deny rules
      expect(settings.permissions.deny).toContain('Bash(rm -rf *)');
      // Should also include angular's deny rules
      expect(settings.permissions.deny.length).toBeGreaterThan(0);
    });

    it('should install skills when --with-skills is set', () => {
      init(['angular'], { target: tempDir, withSkills: true });

      const skillsDir = path.join(tempDir, '.claude', 'skills');
      expect(fs.existsSync(skillsDir)).toBe(true);

      // Skills are organized in category subfolders
      const categories = fs.readdirSync(skillsDir);
      expect(categories).toContain('dev');
      expect(categories).toContain('git');
      expect(categories).toContain('analysis');

      // Check skills exist in their categories
      expect(fs.existsSync(path.join(skillsDir, 'dev', 'learning'))).toBe(true);
      expect(fs.existsSync(path.join(skillsDir, 'git', 'review'))).toBe(true);
      expect(fs.existsSync(path.join(skillsDir, 'dev', 'debug'))).toBe(true);
    });

    it('should install shared rules when --with-rules is set', () => {
      init(['angular'], { target: tempDir, withRules: true });

      const rulesDir = path.join(tempDir, '.claude', 'rules');
      const entries = fs.readdirSync(rulesDir);

      // Shared rules are organized in category subfolders
      expect(entries).toContain('security');
      expect(entries).toContain('quality');
      expect(entries).toContain('conventions');

      // Check rules exist in their categories
      expect(fs.existsSync(path.join(rulesDir, 'security', 'security.md'))).toBe(true);
      expect(fs.existsSync(path.join(rulesDir, 'conventions', 'performance.md'))).toBe(true);
    });

    it('should create manifest file', () => {
      init(['angular', 'nestjs'], { target: tempDir, withSkills: true });

      const manifest = readManifest(tempDir);

      expect(manifest).not.toBeNull();
      expect(manifest.version).toBe(VERSION);
      expect(manifest.technologies).toEqual(['angular', 'nestjs']);
      expect(manifest.options.withSkills).toBe(true);
      expect(manifest.installedAt).toBeDefined();
    });

    it('should resolve @../shared/CLAUDE.md imports', () => {
      init(['angular'], { target: tempDir });

      const claudeMdPath = path.join(tempDir, 'CLAUDE.md');
      const content = fs.readFileSync(claudeMdPath, 'utf8');

      // Should not contain the import directive
      expect(content).not.toContain('@../shared/CLAUDE.md');
      // Should contain shared content
      expect(content).toContain('TypeScript');
    });
  });

  describe('init --dry-run', () => {
    it('should not create any files', () => {
      init(['angular'], { target: tempDir, dryRun: true });

      expect(fs.existsSync(path.join(tempDir, 'CLAUDE.md'))).toBe(false);
      expect(fs.existsSync(path.join(tempDir, '.claude'))).toBe(false);
    });

    it('should not create manifest', () => {
      init(['angular'], { target: tempDir, dryRun: true });

      const manifest = readManifest(tempDir);
      expect(manifest).toBeNull();
    });
  });

  describe('backup', () => {
    it('should backup existing files when not using --force', () => {
      // First install
      init(['angular'], { target: tempDir });

      // Modify CLAUDE.md
      const claudeMdPath = path.join(tempDir, 'CLAUDE.md');
      fs.writeFileSync(claudeMdPath, 'Custom content');

      // Second install (should backup)
      init(['nestjs'], { target: tempDir });

      const backupDir = path.join(tempDir, '.claude', 'backups');
      expect(fs.existsSync(backupDir)).toBe(true);

      const backups = fs.readdirSync(backupDir);
      expect(backups.some((f) => f.startsWith('CLAUDE.md'))).toBe(true);
    });

    it('should not backup when using --force', () => {
      // First install
      init(['angular'], { target: tempDir });

      // Second install with --force
      init(['nestjs'], { target: tempDir, force: true });

      const backupDir = path.join(tempDir, '.claude', 'backups');
      // Backup dir might not exist or be empty
      if (fs.existsSync(backupDir)) {
        const backups = fs.readdirSync(backupDir);
        expect(backups.length).toBe(0);
      }
    });
  });

  describe('status', () => {
    it('should report no installation when manifest is missing', () => {
      const manifest = readManifest(tempDir);
      expect(manifest).toBeNull();
    });

    it('should report installation details when manifest exists', () => {
      init(['angular', 'nestjs'], { target: tempDir, withSkills: true });

      const manifest = readManifest(tempDir);

      expect(manifest.technologies).toEqual(['angular', 'nestjs']);
      expect(manifest.options.withSkills).toBe(true);
    });
  });

  describe('update', () => {
    it('should fail when no installation exists', async () => {
      let exitCode = 0;
      const originalExit = process.exit;
      process.exit = (code) => {
        exitCode = code;
        throw new Error('process.exit called');
      };

      try {
        await update({ target: tempDir });
      } catch (e) {
        // Expected
      }

      process.exit = originalExit;
      expect(exitCode).toBe(1);
    });

    it('should update existing installation', async () => {
      // First install
      init(['angular'], { target: tempDir, withSkills: true });

      // Modify manifest to simulate older version
      const manifestPath = path.join(tempDir, '.claude', '.ai-rules.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      manifest.version = '0.9.0';
      fs.writeFileSync(manifestPath, JSON.stringify(manifest));

      // Update
      await update({ target: tempDir });

      // Check version is updated
      const updatedManifest = readManifest(tempDir);
      expect(updatedManifest.version).toBe(VERSION);
    });

    it('should preserve installation options on update', async () => {
      // First install with skills
      init(['angular', 'nestjs'], { target: tempDir, withSkills: true, withRules: true });

      // Modify manifest to simulate older version
      const manifestPath = path.join(tempDir, '.claude', '.ai-rules.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      manifest.version = '0.9.0';
      fs.writeFileSync(manifestPath, JSON.stringify(manifest));

      // Update
      await update({ target: tempDir });

      // Check options are preserved
      const updatedManifest = readManifest(tempDir);
      expect(updatedManifest.technologies).toEqual(['angular', 'nestjs']);
      expect(updatedManifest.options.withSkills).toBe(true);
      expect(updatedManifest.options.withRules).toBe(true);
    });
  });

  describe('mergeSettingsJson', () => {
    it('should merge allow permissions without duplicates', () => {
      // Create existing settings
      fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, '.claude', 'settings.json'),
        JSON.stringify({
          permissions: {
            allow: ['Bash(npm install *)', 'Read'],
            deny: [],
          },
        })
      );

      init(['angular'], { target: tempDir });

      const settings = JSON.parse(
        fs.readFileSync(path.join(tempDir, '.claude', 'settings.json'), 'utf8')
      );

      // Should not have duplicates
      const uniqueAllow = [...new Set(settings.permissions.allow)];
      expect(settings.permissions.allow.length).toBe(uniqueAllow.length);
    });

    it('should preserve env settings', () => {
      // Create existing settings with env
      fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, '.claude', 'settings.json'),
        JSON.stringify({
          permissions: { allow: [], deny: [] },
          env: { CUSTOM_VAR: 'value' },
        })
      );

      init(['angular'], { target: tempDir });

      const settings = JSON.parse(
        fs.readFileSync(path.join(tempDir, '.claude', 'settings.json'), 'utf8')
      );

      // Should preserve custom env
      expect(settings.env.CUSTOM_VAR).toBe('value');
      // Should also have angular's env
      expect(settings.env.NX_DAEMON).toBe('true');
    });
  });
});
