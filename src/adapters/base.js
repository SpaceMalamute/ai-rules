/**
 * Base adapter class for AI tool configuration formats.
 * Each adapter transforms from Claude's format (source) to the target tool's format.
 */
export class BaseAdapter {
  /** @type {string} Unique identifier for the adapter */
  static id = 'base';

  /** @type {string} Human-readable name */
  static name = 'Base';

  /** @type {string} Output directory relative to project root */
  static outputDir = '.claude';

  /** @type {{ rules: boolean, skills: boolean, settings: boolean, workflows: boolean }} */
  static supports = {
    rules: true,
    skills: false,
    settings: false,
    workflows: false,
  };

  /**
   * Transform a rule file content for the target format.
   * @param {string} content - Original markdown content with frontmatter
   * @param {string} sourcePath - Source file path (for context)
   * @returns {{ content: string, filename: string, isGlobal: boolean }}
   */
  transformRule(content, sourcePath) {
    const filename = this.getOutputFilename(sourcePath);
    return { content, filename, isGlobal: false };
  }

  /**
   * Transform a skill file for the target format.
   * @param {string} content - Skill markdown content
   * @param {string} sourcePath - Source file path
   * @returns {{ content: string, filename: string } | null} - null if skills not supported
   */
  transformSkill(_content, _sourcePath) {
    return null;
  }

  /**
   * Aggregate global rules (alwaysApply: true) into a single file.
   * Some tools (Copilot, Windsurf) prefer a single global rules file.
   * @param {Array<{ content: string, sourcePath: string }>} rules - Global rules
   * @returns {{ content: string, filename: string } | null}
   */
  aggregateGlobalRules(_rules) {
    return null;
  }

  /**
   * Get the output path for a rule file.
   * @param {string} tech - Technology name (e.g., 'angular')
   * @param {string} filename - Filename
   * @returns {string} - Path relative to outputDir
   */
  getRuleOutputPath(tech, filename) {
    return `rules/${tech}/${filename}`;
  }

  /**
   * Get the output path for shared rules.
   * @param {string} relativePath - Path relative to shared rules dir
   * @returns {string} - Path relative to outputDir
   */
  getSharedRuleOutputPath(relativePath) {
    return `rules/${relativePath}`;
  }

  /**
   * Get output filename with correct extension for this adapter.
   * @param {string} sourcePath - Original source path
   * @returns {string}
   */
  getOutputFilename(sourcePath) {
    // Default: keep original filename
    const parts = sourcePath.split('/');
    return parts[parts.length - 1];
  }

  /**
   * Get the file extension used by this adapter.
   * @returns {string}
   */
  getFileExtension() {
    return '.md';
  }
}
