const fs = require('fs');
const path = require('path');

const CONFIGS_DIR = path.join(__dirname, '..', 'configs');
const AVAILABLE_TECHS = ['angular', 'nextjs', 'nestjs', 'dotnet', 'fastapi', 'flask'];
const VERSION = require('../package.json').version;

const TECH_CONFIG = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'tech-config.json'), 'utf8')
);

function getRuleCategoriesToInclude(techs) {
  const categories = new Set();
  for (const tech of techs) {
    const config = TECH_CONFIG.technologies[tech];
    if (config?.includeRules) {
      config.includeRules.forEach((cat) => categories.add(cat));
    }
  }
  return categories;
}

module.exports = {
  CONFIGS_DIR,
  AVAILABLE_TECHS,
  VERSION,
  TECH_CONFIG,
  getRuleCategoriesToInclude,
};
