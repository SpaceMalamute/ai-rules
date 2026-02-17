import { ClaudeAdapter } from './claude.js';
import { CursorAdapter } from './cursor.js';
import { CopilotAdapter } from './copilot.js';
import { WindsurfAdapter } from './windsurf.js';

/**
 * Registry of all available adapters.
 */
export const ADAPTERS = {
  claude: ClaudeAdapter,
  cursor: CursorAdapter,
  copilot: CopilotAdapter,
  windsurf: WindsurfAdapter,
};

/**
 * List of available target identifiers.
 */
export const AVAILABLE_TARGETS = ['claude', 'cursor', 'copilot', 'windsurf'];

/**
 * Default target when none is specified.
 */
export const DEFAULT_TARGET = 'claude';

/**
 * Get an adapter instance for a target.
 * @param {string} target - Target identifier
 * @returns {import('./base.js').BaseAdapter}
 * @throws {Error} If target is not found
 */
export function getAdapter(target) {
  const AdapterClass = ADAPTERS[target];
  if (!AdapterClass) {
    throw new Error(`Unknown target: ${target}. Available: ${AVAILABLE_TARGETS.join(', ')}`);
  }
  return new AdapterClass();
}

/**
 * Get adapter class for a target.
 * @param {string} target - Target identifier
 * @returns {typeof import('./base.js').BaseAdapter}
 */
export function getAdapterClass(target) {
  const AdapterClass = ADAPTERS[target];
  if (!AdapterClass) {
    throw new Error(`Unknown target: ${target}. Available: ${AVAILABLE_TARGETS.join(', ')}`);
  }
  return AdapterClass;
}

/**
 * Check if a target is valid.
 * @param {string} target - Target identifier
 * @returns {boolean}
 */
export function isValidTarget(target) {
  return AVAILABLE_TARGETS.includes(target);
}
