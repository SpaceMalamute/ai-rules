import { BaseAdapter } from './base.js';
import { parseFrontmatter, buildContent } from '../transformers/frontmatter.js';

/**
 * Claude Code adapter - transforms paths (YAML array) to globs (CSV string).
 *
 * Claude Code's frontmatter parser doesn't handle YAML arrays for paths correctly.
 * See: https://github.com/anthropics/claude-code/issues/17204
 */
export class ClaudeAdapter extends BaseAdapter {
  static id = 'claude';
  static name = 'Claude Code';
  static outputDir = '.claude';
  static supports = {
    rules: true,
    skills: true,
    settings: true,
    workflows: false,
  };

  /**
   * Transform paths (YAML array) → globs (CSV string) for Claude Code compatibility.
   */
  transformRule(content, sourcePath) {
    const { frontmatter, body } = parseFrontmatter(content);
    const filename = this.getOutputFilename(sourcePath);

    if (!frontmatter) {
      return { content, filename, isGlobal: false };
    }

    const newFrontmatter = {};
    const isGlobal = frontmatter.alwaysApply === true;

    if (frontmatter.description) {
      newFrontmatter.description = frontmatter.description;
    }

    if (isGlobal) {
      newFrontmatter.alwaysApply = true;
    }

    // Convert paths array to globs CSV string
    if (frontmatter.paths) {
      const paths = Array.isArray(frontmatter.paths)
        ? frontmatter.paths
        : [frontmatter.paths];
      newFrontmatter.globs = paths.join(', ');
    }

    const newContent = buildContent(newFrontmatter, body);
    return { content: newContent, filename, isGlobal };
  }

  /**
   * Skills are supported by Claude.
   */
  transformSkill(content, sourcePath) {
    const parts = sourcePath.split('/');
    const skillName = parts[parts.length - 2]; // Parent directory name
    return {
      content,
      filename: 'SKILL.md',
      skillDir: skillName,
    };
  }

  getFileExtension() {
    return '.md';
  }
}

export default ClaudeAdapter;
