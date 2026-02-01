#!/usr/bin/env node

const { run } = require('../src/cli.js');

run(process.argv.slice(2)).catch((err) => {
  console.error(err);
  process.exit(1);
});
