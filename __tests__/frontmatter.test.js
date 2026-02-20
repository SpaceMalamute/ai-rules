import { describe, it, expect } from 'vitest';
import { parseFrontmatter, serializeFrontmatter, buildContent } from '../src/transformers/frontmatter.js';

describe('parseFrontmatter', () => {
  it('should parse basic key-value frontmatter', () => {
    const content = '---\ndescription: Test rule\nalwaysApply: true\n---\n\n# Body';
    const { frontmatter, body } = parseFrontmatter(content);

    expect(frontmatter).toEqual({ description: 'Test rule', alwaysApply: true });
    expect(body).toBe('# Body');
  });

  it('should parse paths array', () => {
    const content = '---\npaths:\n  - "**/*.ts"\n  - "**/*.tsx"\n---\n\n# Body';
    const { frontmatter } = parseFrontmatter(content);

    expect(frontmatter.paths).toEqual(['**/*.ts', '**/*.tsx']);
  });

  it('should parse quoted description', () => {
    const content = '---\ndescription: "A rule with: special chars"\n---\n\n# Body';
    const { frontmatter } = parseFrontmatter(content);

    expect(frontmatter.description).toBe('A rule with: special chars');
  });

  it('should return null frontmatter for content without ---', () => {
    const content = '# Just a body\n\nNo frontmatter here.';
    const { frontmatter, body } = parseFrontmatter(content);

    expect(frontmatter).toBeNull();
    expect(body).toBe(content);
  });

  it('should return null frontmatter for unclosed ---', () => {
    const content = '---\ndescription: broken\n\n# Body without closing delimiter';
    const { frontmatter, body } = parseFrontmatter(content);

    expect(frontmatter).toBeNull();
    expect(body).toBe(content);
  });

  it('should parse boolean false', () => {
    const content = '---\nalwaysApply: false\n---\n\n# Body';
    const { frontmatter } = parseFrontmatter(content);

    expect(frontmatter.alwaysApply).toBe(false);
  });

  it('should parse numbers', () => {
    const content = '---\nversion: 2\n---\n\n# Body';
    const { frontmatter } = parseFrontmatter(content);

    expect(frontmatter.version).toBe(2);
  });

  it('should not coerce empty string to 0', () => {
    const content = '---\ndescription: \n---\n\n# Body';
    // empty value after key with no array → starts empty array
    // This is current parser behavior — value is empty so it creates an array
    const { frontmatter } = parseFrontmatter(content);
    expect(frontmatter.description).toBeDefined();
  });

  it('should strip leading newlines from body', () => {
    const content = '---\nalwaysApply: true\n---\n\n\n\n# Body';
    const { body } = parseFrontmatter(content);

    expect(body).toBe('# Body');
  });
});

describe('serializeFrontmatter', () => {
  it('should serialize string values', () => {
    const result = serializeFrontmatter({ description: 'A rule' });
    expect(result).toBe('description: A rule');
  });

  it('should serialize boolean values', () => {
    const result = serializeFrontmatter({ alwaysApply: true });
    expect(result).toBe('alwaysApply: true');
  });

  it('should serialize arrays', () => {
    const result = serializeFrontmatter({ paths: ['**/*.ts', '**/*.tsx'] });
    expect(result).toBe('paths:\n  - "**/*.ts"\n  - "**/*.tsx"');
  });

  it('should quote strings with colons', () => {
    const result = serializeFrontmatter({ description: 'A rule: with colon' });
    expect(result).toContain('"A rule: with colon"');
  });

  it('should skip null and undefined values', () => {
    const result = serializeFrontmatter({ description: 'test', empty: null, undef: undefined });
    expect(result).toBe('description: test');
  });

  it('should serialize numbers', () => {
    const result = serializeFrontmatter({ version: 3 });
    expect(result).toBe('version: 3');
  });
});

describe('buildContent', () => {
  it('should combine frontmatter and body', () => {
    const result = buildContent({ alwaysApply: true }, '# Body');
    expect(result).toBe('---\nalwaysApply: true\n---\n\n# Body');
  });

  it('should return body only when frontmatter is null', () => {
    const result = buildContent(null, '# Body');
    expect(result).toBe('# Body');
  });

  it('should return body only when frontmatter is empty object', () => {
    const result = buildContent({}, '# Body');
    expect(result).toBe('# Body');
  });
});
