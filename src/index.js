const { run } = require('./cli');
const { init, update, status } = require('./installer');
const { readManifest } = require('./merge');
const { VERSION } = require('./config');

module.exports = {
  run,
  init,
  update,
  status,
  readManifest,
  VERSION,
};
