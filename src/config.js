import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const require = createRequire(import.meta.url);

export const CONFIGS_DIR = path.join(__dirname, '..', 'configs');
export const AVAILABLE_TECHS = ['angular', 'nextjs', 'nestjs', 'dotnet', 'fastapi', 'flask'];
export const VERSION = require('../package.json').version;

export const TECH_CONFIG = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'tech-config.json'), 'utf8')
);

export function getRuleCategoriesToInclude(techs) {
  const categories = new Set();
  for (const tech of techs) {
    const config = TECH_CONFIG.technologies[tech];
    if (config?.includeRules) {
      config.includeRules.forEach((cat) => categories.add(cat));
    }
  }
  return categories;
}
