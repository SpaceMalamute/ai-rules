import { BaseAdapter } from './base.js';

/**
 * Claude Code adapter - no transformation needed as Claude is the source format.
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
   * No transformation needed - Claude is the source format.
   */
  transformRule(content, sourcePath) {
    const filename = this.getOutputFilename(sourcePath);
    return { content, filename, isGlobal: false };
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
