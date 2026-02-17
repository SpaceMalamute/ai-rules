import path from 'path';
import { BaseAdapter } from './base.js';
import { parseFrontmatter, buildContent } from '../transformers/frontmatter.js';

/**
 * Windsurf adapter - transforms Claude format to Windsurf format.
 *
 * Transformations:
 * - paths → globs + trigger: glob
 * - alwaysApply rules aggregate to .windsurf/global_rules.md
 * - Skills → Workflows (if supported)
 * - Output directory: .windsurf/rules/
 */
export class WindsurfAdapter extends BaseAdapter {
  static id = 'windsurf';
  static name = 'Windsurf';
  static outputDir = '.windsurf';
  static supports = {
    rules: true,
    skills: false,
    settings: false,
    workflows: true,
  };

  /**
   * Transform a rule file for Windsurf format.
   * - Converts 'paths' to 'globs' and adds 'trigger: glob'
   * - Keeps .md extension
   */
  transformRule(content, sourcePath) {
    const { frontmatter, body } = parseFrontmatter(content);
    const filename = this.getOutputFilename(sourcePath);

    if (!frontmatter) {
      return { content, filename, isGlobal: false };
    }

    // Transform frontmatter
    const newFrontmatter = {};
    const isGlobal = frontmatter.alwaysApply === true;

    // Copy description if present
    if (frontmatter.description) {
      newFrontmatter.description = frontmatter.description;
    }

    // Convert paths to globs with trigger
    if (frontmatter.paths) {
      newFrontmatter.trigger = 'glob';
      newFrontmatter.globs = frontmatter.paths;
    }

    // For global rules, use always trigger
    if (isGlobal) {
      newFrontmatter.trigger = 'always';
      delete newFrontmatter.globs;
    }

    const newContent = buildContent(newFrontmatter, body);
    return { content: newContent, filename, isGlobal };
  }

  /**
   * Transform a skill into a Windsurf workflow.
   * @param {string} content - Skill content
   * @param {string} sourcePath - Source path
   * @returns {{ content: string, filename: string, workflowDir: string } | null}
   */
  transformSkill(content, sourcePath) {
    const { frontmatter, body } = parseFrontmatter(content);
    const parts = sourcePath.split('/');
    const skillName = parts[parts.length - 2]; // Parent directory name

    // Transform skill to workflow format
    const workflowFrontmatter = {
      name: frontmatter?.name || skillName,
      description: frontmatter?.description || `Workflow: ${skillName}`,
      trigger: 'manual',
    };

    const newContent = buildContent(workflowFrontmatter, body);

    return {
      content: newContent,
      filename: 'workflow.md',
      workflowDir: skillName,
    };
  }

  /**
   * Aggregate global rules into global_rules.md
   * @param {Array<{ content: string, sourcePath: string }>} rules
   * @returns {{ content: string, filename: string } | null}
   */
  aggregateGlobalRules(rules) {
    if (rules.length === 0) return null;

    const sections = rules.map(({ content, sourcePath }) => {
      const { frontmatter, body } = parseFrontmatter(content);
      const name = path.basename(sourcePath, '.md');
      const description = frontmatter?.description ? ` - ${frontmatter.description}` : '';
      return `## ${name}${description}\n\n${body}`;
    });

    // Windsurf global rules file with frontmatter
    const header = `---
trigger: always
---

# Global Rules

These rules are always applied to all files in this project.

`;

    return {
      content: header + sections.join('\n\n---\n\n'),
      filename: 'global_rules.md',
    };
  }

  getFileExtension() {
    return '.md';
  }
}

export default WindsurfAdapter;
