'use strict';

const fs = require('fs');
const path = require('path');

function findConfigs(inputPath) {
  if (fs.statSync(inputPath).isDirectory()) {
    return fs.readdirSync(inputPath)
      .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
      .sort()
      .map(f => path.join(inputPath, f));
  }
  return [inputPath];
}

module.exports = { findConfigs };
