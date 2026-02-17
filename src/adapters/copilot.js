import path from 'path';
import { BaseAdapter } from './base.js';
import { parseFrontmatter, buildContent } from '../transformers/frontmatter.js';

/**
 * GitHub Copilot adapter - transforms Claude format to Copilot format.
 *
 * Transformations:
 * - paths → applyTo
 * - Extension .md → .instructions.md
 * - alwaysApply rules aggregate to .github/copilot-instructions.md
 * - Output directory: .github/instructions/
 */
export class CopilotAdapter extends BaseAdapter {
  static id = 'copilot';
  static name = 'GitHub Copilot';
  static outputDir = '.github';
  static supports = {
    rules: true,
    skills: false,
    settings: false,
    workflows: false,
  };

  /**
   * Transform a rule file for Copilot format.
   * - Converts 'paths' to 'applyTo' in frontmatter
   * - Changes file extension to .instructions.md
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

    // Convert paths to applyTo
    if (frontmatter.paths) {
      newFrontmatter.applyTo = frontmatter.paths;
    }

    // Copy description if present
    if (frontmatter.description) {
      newFrontmatter.description = frontmatter.description;
    }

    // Don't include alwaysApply - global rules go to copilot-instructions.md

    const newContent = buildContent(newFrontmatter, body);
    return { content: newContent, filename, isGlobal };
  }

  /**
   * Aggregate global rules into copilot-instructions.md
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

    const header = `# Project Instructions

These instructions are automatically applied to all files in this project.

`;

    return {
      content: header + sections.join('\n\n---\n\n'),
      filename: 'copilot-instructions.md',
    };
  }

  /**
   * Get the output path for a rule file.
   * Copilot uses .github/instructions/ directory.
   */
  getRuleOutputPath(tech, filename) {
    return `instructions/${tech}/${filename}`;
  }

  getSharedRuleOutputPath(relativePath) {
    // Convert .md to .instructions.md in the path
    const newPath = relativePath.replace(/\.md$/, '.instructions.md');
    return `instructions/${newPath}`;
  }

  getOutputFilename(sourcePath) {
    const parts = sourcePath.split('/');
    const filename = parts[parts.length - 1];
    // Change extension from .md to .instructions.md
    return filename.replace(/\.md$/, '.instructions.md');
  }

  getFileExtension() {
    return '.instructions.md';
  }
}

export default CopilotAdapter;
