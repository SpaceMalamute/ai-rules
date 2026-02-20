import { describe, it, expect } from 'vitest';
import { ClaudeAdapter } from '../src/adapters/claude.js';
import { CursorAdapter } from '../src/adapters/cursor.js';
import { CopilotAdapter } from '../src/adapters/copilot.js';
import { WindsurfAdapter } from '../src/adapters/windsurf.js';

// --- Helpers ---

const rule = (frontmatter, body = '# Body') =>
  `---\n${frontmatter}\n---\n\n${body}`;

const pathsRule = (paths, body) =>
  rule(`description: Test rule\npaths:\n${paths.map(p => `  - "${p}"`).join('\n')}`, body);

const alwaysRule = (body) =>
  rule('description: Global rule\nalwaysApply: true', body);

const noFrontmatterRule = '# Just a body\n\nNo frontmatter.';

// --- Claude Adapter ---

describe('ClaudeAdapter', () => {
  const adapter = new ClaudeAdapter();

  describe('transformRule', () => {
    it('should convert paths array to globs CSV string', () => {
      const content = pathsRule(['**/*.ts', '**/*.tsx']);
      const result = adapter.transformRule(content, 'rules/components.md');

      expect(result.content).toContain('globs: **/*.ts, **/*.tsx');
      expect(result.content).not.toContain('paths:');
    });

    it('should keep description', () => {
      const content = pathsRule(['**/*.ts']);
      const result = adapter.transformRule(content, 'rules/test.md');

      expect(result.content).toContain('description: Test rule');
    });

    it('should handle alwaysApply rules', () => {
      const content = alwaysRule('# Global');
      const result = adapter.transformRule(content, 'rules/core.md');

      expect(result.content).toContain('alwaysApply: true');
      expect(result.isGlobal).toBe(true);
    });

    it('should pass through content without frontmatter', () => {
      const result = adapter.transformRule(noFrontmatterRule, 'rules/test.md');

      expect(result.content).toBe(noFrontmatterRule);
      expect(result.isGlobal).toBe(false);
    });

    it('should keep .md extension', () => {
      const result = adapter.transformRule(noFrontmatterRule, 'rules/test.md');
      expect(result.filename).toBe('test.md');
    });

    it('should join single path as CSV', () => {
      const content = pathsRule(['**/src/**/*.ts']);
      const result = adapter.transformRule(content, 'rules/test.md');

      expect(result.content).toContain('globs: **/src/**/*.ts');
    });
  });

  describe('transformSkill', () => {
    it('should return skill content with directory name', () => {
      const result = adapter.transformSkill('# Skill body', 'skills/my-skill/SKILL.md');

      expect(result.content).toBe('# Skill body');
      expect(result.filename).toBe('SKILL.md');
      expect(result.skillDir).toBe('my-skill');
    });
  });
});

// --- Cursor Adapter ---

describe('CursorAdapter', () => {
  const adapter = new CursorAdapter();

  describe('transformRule', () => {
    it('should rename paths to globs (keep as array)', () => {
      const content = pathsRule(['**/*.ts', '**/*.tsx']);
      const result = adapter.transformRule(content, 'rules/components.md');

      expect(result.content).toContain('globs:');
      expect(result.content).not.toContain('paths:');
    });

    it('should change extension to .mdc', () => {
      const content = pathsRule(['**/*.ts']);
      const result = adapter.transformRule(content, 'rules/test.md');

      expect(result.filename).toBe('test.mdc');
    });

    it('should keep alwaysApply as-is', () => {
      const content = alwaysRule('# Global');
      const result = adapter.transformRule(content, 'rules/core.md');

      expect(result.content).toContain('alwaysApply: true');
      expect(result.isGlobal).toBe(true);
    });

    it('should pass through content without frontmatter', () => {
      const result = adapter.transformRule(noFrontmatterRule, 'rules/test.md');

      expect(result.content).toBe(noFrontmatterRule);
      expect(result.filename).toBe('test.mdc');
    });

    it('should keep description in frontmatter', () => {
      const content = pathsRule(['**/*.ts']);
      const result = adapter.transformRule(content, 'rules/test.md');

      expect(result.content).toContain('description: Test rule');
    });
  });

  describe('aggregateGlobalRules', () => {
    it('should aggregate rules into .cursorrules', () => {
      const rules = [
        { content: rule('description: First rule\nalwaysApply: true', '# First body'), sourcePath: 'rules/first.md' },
        { content: rule('description: Second rule\nalwaysApply: true', '# Second body'), sourcePath: 'rules/second.md' },
      ];
      const result = adapter.aggregateGlobalRules(rules);

      expect(result.filename).toBe('.cursorrules');
      expect(result.content).toContain('# First rule');
      expect(result.content).toContain('# First body');
      expect(result.content).toContain('# Second rule');
      expect(result.content).toContain('# Second body');
      expect(result.content).toContain('---');
    });

    it('should return null for empty rules', () => {
      expect(adapter.aggregateGlobalRules([])).toBeNull();
    });

    it('should use filename when no description', () => {
      const rules = [
        { content: rule('alwaysApply: true', '# Body'), sourcePath: 'rules/my-rule.md' },
      ];
      const result = adapter.aggregateGlobalRules(rules);

      expect(result.content).toContain('# my-rule');
    });
  });
});

// --- Copilot Adapter ---

describe('CopilotAdapter', () => {
  const adapter = new CopilotAdapter();

  describe('transformRule', () => {
    it('should rename paths to applyTo', () => {
      const content = pathsRule(['**/*.ts', '**/*.tsx']);
      const result = adapter.transformRule(content, 'rules/components.md');

      expect(result.content).toContain('applyTo:');
      expect(result.content).not.toContain('paths:');
      expect(result.content).not.toContain('globs:');
    });

    it('should change extension to .instructions.md', () => {
      const content = pathsRule(['**/*.ts']);
      const result = adapter.transformRule(content, 'rules/test.md');

      expect(result.filename).toBe('test.instructions.md');
    });

    it('should drop alwaysApply from frontmatter', () => {
      const content = alwaysRule('# Global');
      const result = adapter.transformRule(content, 'rules/core.md');

      expect(result.content).not.toContain('alwaysApply');
      expect(result.isGlobal).toBe(true);
    });

    it('should keep description', () => {
      const content = pathsRule(['**/*.ts']);
      const result = adapter.transformRule(content, 'rules/test.md');

      expect(result.content).toContain('description: Test rule');
    });

    it('should pass through content without frontmatter', () => {
      const result = adapter.transformRule(noFrontmatterRule, 'rules/test.md');

      expect(result.content).toBe(noFrontmatterRule);
    });
  });

  describe('aggregateGlobalRules', () => {
    it('should aggregate rules into copilot-instructions.md', () => {
      const rules = [
        { content: rule('description: First rule\nalwaysApply: true', '# First body'), sourcePath: 'rules/first.md' },
      ];
      const result = adapter.aggregateGlobalRules(rules);

      expect(result.filename).toBe('copilot-instructions.md');
      expect(result.content).toContain('# Project Instructions');
      expect(result.content).toContain('## first - First rule');
      expect(result.content).toContain('# First body');
    });

    it('should return null for empty rules', () => {
      expect(adapter.aggregateGlobalRules([])).toBeNull();
    });
  });

  describe('output paths', () => {
    it('should prefix rule output with instructions/', () => {
      expect(adapter.getRuleOutputPath('angular', 'core.instructions.md'))
        .toBe('instructions/angular/core.instructions.md');
    });

    it('should transform shared rule output path', () => {
      expect(adapter.getSharedRuleOutputPath('conventions/git.md'))
        .toBe('instructions/conventions/git.instructions.md');
    });
  });
});

// --- Windsurf Adapter ---

describe('WindsurfAdapter', () => {
  const adapter = new WindsurfAdapter();

  describe('transformRule', () => {
    it('should convert paths to globs + trigger: glob', () => {
      const content = pathsRule(['**/*.ts', '**/*.tsx']);
      const result = adapter.transformRule(content, 'rules/components.md');

      expect(result.content).toContain('trigger: glob');
      expect(result.content).toContain('globs:');
      expect(result.content).not.toContain('paths:');
    });

    it('should convert alwaysApply to trigger: always (no globs)', () => {
      const content = alwaysRule('# Global');
      const result = adapter.transformRule(content, 'rules/core.md');

      expect(result.content).toContain('trigger: always');
      expect(result.content).not.toContain('globs:');
      expect(result.content).not.toContain('alwaysApply');
      expect(result.isGlobal).toBe(true);
    });

    it('should keep .md extension', () => {
      const content = pathsRule(['**/*.ts']);
      const result = adapter.transformRule(content, 'rules/test.md');

      expect(result.filename).toBe('test.md');
    });

    it('should keep description', () => {
      const content = pathsRule(['**/*.ts']);
      const result = adapter.transformRule(content, 'rules/test.md');

      expect(result.content).toContain('description: Test rule');
    });

    it('should pass through content without frontmatter', () => {
      const result = adapter.transformRule(noFrontmatterRule, 'rules/test.md');

      expect(result.content).toBe(noFrontmatterRule);
      expect(result.isGlobal).toBe(false);
    });
  });

  describe('transformSkill', () => {
    it('should convert skill to workflow format', () => {
      const content = rule('name: My Skill\ndescription: A cool skill', '# Steps');
      const result = adapter.transformSkill(content, 'skills/my-skill/SKILL.md');

      expect(result.filename).toBe('workflow.md');
      expect(result.workflowDir).toBe('my-skill');
      expect(result.content).toContain('name: My Skill');
      expect(result.content).toContain('trigger: manual');
    });
  });

  describe('aggregateGlobalRules', () => {
    it('should aggregate rules into global_rules.md with trigger: always', () => {
      const rules = [
        { content: rule('description: First\nalwaysApply: true', '# First body'), sourcePath: 'rules/first.md' },
      ];
      const result = adapter.aggregateGlobalRules(rules);

      expect(result.filename).toBe('global_rules.md');
      expect(result.content).toContain('trigger: always');
      expect(result.content).toContain('# Global Rules');
      expect(result.content).toContain('## first - First');
    });

    it('should return null for empty rules', () => {
      expect(adapter.aggregateGlobalRules([])).toBeNull();
    });
  });
});
