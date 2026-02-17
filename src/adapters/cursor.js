import path from 'path';
import { BaseAdapter } from './base.js';
import { parseFrontmatter, buildContent } from '../transformers/frontmatter.js';

/**
 * Cursor adapter - transforms Claude format to Cursor format.
 *
 * Transformations:
 * - paths → globs
 * - Extension .md → .mdc
 * - alwaysApply rules can optionally aggregate to .cursorrules
 */
export class CursorAdapter extends BaseAdapter {
  static id = 'cursor';
  static name = 'Cursor';
  static outputDir = '.cursor';
  static supports = {
    rules: true,
    skills: false,
    settings: false,
    workflows: false,
  };

  /**
   * Transform a rule file for Cursor format.
   * - Converts 'paths' to 'globs' in frontmatter
   * - Changes file extension to .mdc
   */
  transformRule(content, sourcePath) {
    const { frontmatter, body } = parseFrontmatter(content);
    const filename = this.getOutputFilename(sourcePath);

    if (!frontmatter) {
      return { content, filename, isGlobal: false };
    }

    // Transform frontmatter
    const newFrontmatter = { ...frontmatter };
    const isGlobal = frontmatter.alwaysApply === true;

    // Convert paths to globs
    if (frontmatter.paths) {
      newFrontmatter.globs = frontmatter.paths;
      delete newFrontmatter.paths;
    }

    // Keep alwaysApply as-is (Cursor supports it)

    const newContent = buildContent(newFrontmatter, body);
    return { content: newContent, filename, isGlobal };
  }

  /**
   * Aggregate global rules into .cursorrules file.
   * @param {Array<{ content: string, sourcePath: string }>} rules
   * @returns {{ content: string, filename: string } | null}
   */
  aggregateGlobalRules(rules) {
    if (rules.length === 0) return null;

    const sections = rules.map(({ content, sourcePath }) => {
      const { frontmatter, body } = parseFrontmatter(content);
      const name = frontmatter?.description || path.basename(sourcePath, '.md');
      return `# ${name}\n\n${body}`;
    });

    return {
      content: sections.join('\n\n---\n\n'),
      filename: '.cursorrules',
    };
  }

  getOutputFilename(sourcePath) {
    const parts = sourcePath.split('/');
    const filename = parts[parts.length - 1];
    // Change extension from .md to .mdc
    return filename.replace(/\.md$/, '.mdc');
  }

  getFileExtension() {
    return '.mdc';
  }
}

export default CursorAdapter;
