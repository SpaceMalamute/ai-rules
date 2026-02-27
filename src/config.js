import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const require = createRequire(import.meta.url);

export const CONFIGS_DIR = path.join(__dirname, '..', 'configs');
export const AVAILABLE_TECHS = ['angular', 'react', 'nextjs', 'nestjs', 'adonisjs', 'dotnet', 'fastapi', 'flask', 'hono', 'elysia', 'electron'];
export const AVAILABLE_TARGETS = ['claude', 'cursor', 'copilot', 'windsurf'];
export const DEFAULT_TARGET = 'claude';
export const VERSION = require('../package.json').version;

export const TECH_CONFIG = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'tech-config.json'), 'utf8')
);

/**
 * Get rule directories to include based on selected technologies.
 * Returns paths relative to the rules directory (e.g., "lang/typescript", "domain/frontend").
 */
export function getRulePathsToInclude(techs) {
  const paths = new Set();
  const { ruleMapping, alwaysInclude } = TECH_CONFIG;

  // Always include common rules
  alwaysInclude.forEach((dir) => paths.add(dir));

  // Add language and domain-specific rules based on selected techs
  for (const tech of techs) {
    const config = TECH_CONFIG.technologies[tech];
    if (!config) continue;

    // Add language-specific rules (e.g., "lang/typescript")
    if (config.language && ruleMapping.language[config.language]) {
      paths.add(ruleMapping.language[config.language]);
    }

    // Add domain-specific rules (e.g., "domain/frontend")
    if (config.type && ruleMapping.type[config.type]) {
      const domainRules = ruleMapping.type[config.type];
      if (Array.isArray(domainRules)) {
        domainRules.forEach((rule) => paths.add(rule));
      } else {
        paths.add(domainRules);
      }
    }
  }

  return paths;
}

/**
 * Check if a rule path should be included for the given technologies.
 * @param {string} rulePath - Path relative to rules dir (e.g., "lang/python/async.md")
 * @param {Set<string>} includedPaths - Set of paths to include
 * @returns {boolean}
 */
export function shouldIncludeRule(rulePath, includedPaths) {
  // Check if the path starts with any of the included paths
  for (const includedPath of includedPaths) {
    if (rulePath === includedPath || rulePath.startsWith(includedPath + '/')) {
      return true;
    }
  }
  return false;
}
