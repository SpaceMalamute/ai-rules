/**
 * Frontmatter parser and serializer for markdown files.
 * Handles YAML frontmatter delimited by --- markers.
 */

/**
 * Parse YAML frontmatter from markdown content.
 * @param {string} content - The markdown content with optional frontmatter
 * @returns {{ frontmatter: Record<string, unknown> | null, body: string }}
 */
export function parseFrontmatter(content) {
  const lines = content.split('\n');

  // Check if content starts with frontmatter delimiter
  if (lines[0]?.trim() !== '---') {
    return { frontmatter: null, body: content };
  }

  // Find closing delimiter
  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return { frontmatter: null, body: content };
  }

  // Extract frontmatter YAML
  const yamlLines = lines.slice(1, endIndex);
  const frontmatter = parseYaml(yamlLines.join('\n'));

  // Extract body (everything after closing delimiter)
  const body = lines.slice(endIndex + 1).join('\n').replace(/^\n+/, '');

  return { frontmatter, body };
}

/**
 * Simple YAML parser for frontmatter.
 * Supports: strings, booleans, arrays (list format), simple objects.
 * @param {string} yaml - YAML string to parse
 * @returns {Record<string, unknown>}
 */
function parseYaml(yaml) {
  const result = {};
  const lines = yaml.split('\n');
  let currentKey = null;
  let currentArray = null;

  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) continue;

    // Check for array item (starts with -)
    if (line.match(/^\s*-\s/)) {
      if (currentKey && currentArray !== null) {
        const value = line.replace(/^\s*-\s*/, '').trim();
        currentArray.push(parseValue(value));
      }
      continue;
    }

    // Check for key: value
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const [, key, rawValue] = match;
      const value = rawValue.trim();

      // If value is empty, might be an array or object
      if (!value) {
        currentKey = key;
        currentArray = [];
        result[key] = currentArray;
      } else {
        currentKey = null;
        currentArray = null;
        result[key] = parseValue(value);
      }
    }
  }

  return result;
}

/**
 * Parse a YAML value string.
 * @param {string} value - The value string
 * @returns {string | boolean | number}
 */
function parseValue(value) {
  // Remove quotes if present
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  // Boolean
  if (value === 'true') return true;
  if (value === 'false') return false;

  // Number
  if (!isNaN(Number(value)) && value !== '') {
    return Number(value);
  }

  return value;
}

/**
 * Serialize an object to YAML frontmatter format.
 * @param {Record<string, unknown>} obj - Object to serialize
 * @returns {string} - YAML string (without --- delimiters)
 */
export function serializeFrontmatter(obj) {
  const lines = [];

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;

    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        lines.push(`  - "${item}"`);
      }
    } else if (typeof value === 'boolean') {
      lines.push(`${key}: ${value}`);
    } else if (typeof value === 'number') {
      lines.push(`${key}: ${value}`);
    } else if (typeof value === 'string') {
      // Quote strings that contain special characters
      if (value.includes(':') || value.includes('#') || value.includes("'") || value.includes('"')) {
        lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
      } else {
        lines.push(`${key}: ${value}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Build complete markdown content with frontmatter.
 * @param {Record<string, unknown> | null} frontmatter - Frontmatter object
 * @param {string} body - Markdown body
 * @returns {string} - Complete markdown content
 */
export function buildContent(frontmatter, body) {
  if (!frontmatter || Object.keys(frontmatter).length === 0) {
    return body;
  }

  const yaml = serializeFrontmatter(frontmatter);
  return `---\n${yaml}\n---\n\n${body}`;
}
