import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

import { init } from '../src/index.js';

/** Recursively collect all files (not directories) under dir. */
function getFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getFiles(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

/** Get just filenames (no path) of all files recursively under dir. */
function getFileNames(dir) {
  return getFiles(dir).map(f => path.basename(f));
}

/** Read first non-core file content from a rules directory. */
function readFirstNonCoreFile(dir, coreFilename) {
  const files = getFiles(dir).filter(f => path.basename(f) !== coreFilename);
  if (files.length === 0) return null;
  return fs.readFileSync(files[0], 'utf8');
}

describe('multi-target installation', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-rules-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // --- Cursor ---

  describe('cursor target', () => {
    it('should create .cursor/rules/ directory', () => {
      init(['angular'], { target: tempDir, targets: ['cursor'] });

      const rulesDir = path.join(tempDir, '.cursor', 'rules', 'angular');
      expect(fs.existsSync(rulesDir)).toBe(true);
    });

    it('should use .mdc extension for all files', () => {
      init(['angular'], { target: tempDir, targets: ['cursor'] });

      const rulesDir = path.join(tempDir, '.cursor', 'rules', 'angular');
      const names = getFileNames(rulesDir);

      expect(names.every(f => f.endsWith('.mdc'))).toBe(true);
      expect(names).toContain('core.mdc');
    });

    it('should transform paths to globs in frontmatter', () => {
      init(['angular'], { target: tempDir, targets: ['cursor'] });

      const rulesDir = path.join(tempDir, '.cursor', 'rules', 'angular');
      const content = readFirstNonCoreFile(rulesDir, 'core.mdc');

      expect(content).not.toBeNull();
      expect(content).not.toContain('paths:');
      expect(content).toMatch(/globs:|alwaysApply:/);
    });

    it('should not create settings.json (not supported)', () => {
      init(['angular'], { target: tempDir, targets: ['cursor'] });

      expect(fs.existsSync(path.join(tempDir, '.cursor', 'settings.json'))).toBe(false);
    });

    it('should aggregate global rules into .cursorrules', () => {
      init(['angular'], { target: tempDir, targets: ['cursor'] });

      const cursorrules = path.join(tempDir, '.cursor', '.cursorrules');
      if (fs.existsSync(cursorrules)) {
        const content = fs.readFileSync(cursorrules, 'utf8');
        expect(content.length).toBeGreaterThan(0);
      }
    });
  });

  // --- Copilot ---

  describe('copilot target', () => {
    it('should create .github/instructions/ directory', () => {
      init(['angular'], { target: tempDir, targets: ['copilot'] });

      const instrDir = path.join(tempDir, '.github', 'instructions', 'angular');
      expect(fs.existsSync(instrDir)).toBe(true);
    });

    it('should use .instructions.md extension for all files', () => {
      init(['angular'], { target: tempDir, targets: ['copilot'] });

      const instrDir = path.join(tempDir, '.github', 'instructions', 'angular');
      const names = getFileNames(instrDir);

      expect(names.every(f => f.endsWith('.instructions.md'))).toBe(true);
      expect(names).toContain('core.instructions.md');
    });

    it('should transform paths to applyTo in frontmatter', () => {
      init(['angular'], { target: tempDir, targets: ['copilot'] });

      const instrDir = path.join(tempDir, '.github', 'instructions', 'angular');
      const content = readFirstNonCoreFile(instrDir, 'core.instructions.md');

      expect(content).not.toBeNull();
      expect(content).not.toContain('paths:');
      // Non-global rules should have applyTo
      if (!content.includes('alwaysApply')) {
        expect(content).toContain('applyTo:');
      }
    });

    it('should not include alwaysApply in output', () => {
      init(['angular'], { target: tempDir, targets: ['copilot'] });

      const instrDir = path.join(tempDir, '.github', 'instructions', 'angular');
      const files = getFiles(instrDir);

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        expect(content).not.toContain('alwaysApply');
      }
    });

    it('should aggregate global rules into copilot-instructions.md', () => {
      init(['angular'], { target: tempDir, targets: ['copilot'] });

      const globalFile = path.join(tempDir, '.github', 'copilot-instructions.md');
      if (fs.existsSync(globalFile)) {
        const content = fs.readFileSync(globalFile, 'utf8');
        expect(content).toContain('# Project Instructions');
      }
    });

    it('should not create settings.json (not supported)', () => {
      init(['angular'], { target: tempDir, targets: ['copilot'] });

      expect(fs.existsSync(path.join(tempDir, '.github', 'settings.json'))).toBe(false);
    });
  });

  // --- Windsurf ---

  describe('windsurf target', () => {
    it('should create .windsurf/rules/ directory', () => {
      init(['angular'], { target: tempDir, targets: ['windsurf'] });

      const rulesDir = path.join(tempDir, '.windsurf', 'rules', 'angular');
      expect(fs.existsSync(rulesDir)).toBe(true);
    });

    it('should keep .md extension for all files', () => {
      init(['angular'], { target: tempDir, targets: ['windsurf'] });

      const rulesDir = path.join(tempDir, '.windsurf', 'rules', 'angular');
      const names = getFileNames(rulesDir);

      expect(names.every(f => f.endsWith('.md'))).toBe(true);
      expect(names).toContain('core.md');
    });

    it('should add trigger: glob for path-scoped rules', () => {
      init(['angular'], { target: tempDir, targets: ['windsurf'] });

      const rulesDir = path.join(tempDir, '.windsurf', 'rules', 'angular');
      const content = readFirstNonCoreFile(rulesDir, 'core.md');

      expect(content).not.toBeNull();
      expect(content).not.toContain('paths:');
      expect(content).toMatch(/trigger: (glob|always)/);
    });

    it('should use trigger: always for global rules (no globs)', () => {
      init(['angular'], { target: tempDir, targets: ['windsurf'] });

      const rulesDir = path.join(tempDir, '.windsurf', 'rules', 'angular');
      const coreMd = fs.readFileSync(path.join(rulesDir, 'core.md'), 'utf8');

      expect(coreMd).toContain('trigger: always');
      expect(coreMd).not.toContain('alwaysApply');
      expect(coreMd).not.toContain('globs:');
    });

    it('should aggregate global rules into global_rules.md', () => {
      init(['angular'], { target: tempDir, targets: ['windsurf'] });

      const globalFile = path.join(tempDir, '.windsurf', 'global_rules.md');
      if (fs.existsSync(globalFile)) {
        const content = fs.readFileSync(globalFile, 'utf8');
        expect(content).toContain('trigger: always');
        expect(content).toContain('# Global Rules');
      }
    });

    it('should install workflows when --with-skills is set', () => {
      init(['angular'], { target: tempDir, targets: ['windsurf'], withSkills: true });

      const workflowsDir = path.join(tempDir, '.windsurf', 'workflows');
      if (fs.existsSync(workflowsDir)) {
        const workflows = fs.readdirSync(workflowsDir);
        expect(workflows.length).toBeGreaterThan(0);

        for (const w of workflows) {
          const wFile = path.join(workflowsDir, w, 'workflow.md');
          if (fs.existsSync(wFile)) {
            const content = fs.readFileSync(wFile, 'utf8');
            expect(content).toContain('trigger: manual');
          }
        }
      }
    });

    it('should not create settings.json (not supported)', () => {
      init(['angular'], { target: tempDir, targets: ['windsurf'] });

      expect(fs.existsSync(path.join(tempDir, '.windsurf', 'settings.json'))).toBe(false);
    });
  });

  // --- Multi-target simultaneous ---

  describe('multiple targets at once', () => {
    it('should install for all 4 targets simultaneously', () => {
      init(['angular'], { target: tempDir, targets: ['claude', 'cursor', 'copilot', 'windsurf'] });

      expect(fs.existsSync(path.join(tempDir, '.claude', 'rules', 'angular'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, '.cursor', 'rules', 'angular'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, '.github', 'instructions', 'angular'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, '.windsurf', 'rules', 'angular'))).toBe(true);
    });

    it('should use correct extensions per target', () => {
      init(['angular'], { target: tempDir, targets: ['claude', 'cursor', 'copilot', 'windsurf'] });

      const claudeNames = getFileNames(path.join(tempDir, '.claude', 'rules', 'angular'));
      const cursorNames = getFileNames(path.join(tempDir, '.cursor', 'rules', 'angular'));
      const copilotNames = getFileNames(path.join(tempDir, '.github', 'instructions', 'angular'));
      const windsurfNames = getFileNames(path.join(tempDir, '.windsurf', 'rules', 'angular'));

      expect(claudeNames.every(f => f.endsWith('.md'))).toBe(true);
      expect(cursorNames.every(f => f.endsWith('.mdc'))).toBe(true);
      expect(copilotNames.every(f => f.endsWith('.instructions.md'))).toBe(true);
      expect(windsurfNames.every(f => f.endsWith('.md'))).toBe(true);
    });

    it('should produce same number of rule files per target', () => {
      init(['angular'], { target: tempDir, targets: ['claude', 'cursor', 'copilot', 'windsurf'] });

      const claudeCount = getFiles(path.join(tempDir, '.claude', 'rules', 'angular')).length;
      const cursorCount = getFiles(path.join(tempDir, '.cursor', 'rules', 'angular')).length;
      const copilotCount = getFiles(path.join(tempDir, '.github', 'instructions', 'angular')).length;
      const windsurfCount = getFiles(path.join(tempDir, '.windsurf', 'rules', 'angular')).length;

      expect(claudeCount).toBe(cursorCount);
      expect(cursorCount).toBe(copilotCount);
      expect(copilotCount).toBe(windsurfCount);
    });

    it('should only create settings.json for Claude', () => {
      init(['angular'], { target: tempDir, targets: ['claude', 'cursor', 'copilot', 'windsurf'] });

      expect(fs.existsSync(path.join(tempDir, '.claude', 'settings.json'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, '.cursor', 'settings.json'))).toBe(false);
      expect(fs.existsSync(path.join(tempDir, '.github', 'settings.json'))).toBe(false);
      expect(fs.existsSync(path.join(tempDir, '.windsurf', 'settings.json'))).toBe(false);
    });
  });
});
