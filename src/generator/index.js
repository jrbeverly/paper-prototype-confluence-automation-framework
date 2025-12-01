#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { renderRule } = require('./render');
const { findConfigs } = require('./discover');

const REPO_ROOT = path.resolve(__dirname, '../..');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--config') args.config = argv[++i];
    if (argv[i] === '--out') args.out = argv[++i];
  }
  return args;
}

function generateOne(configPath, outPath) {
  const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
  const templatePath = path.join(REPO_ROOT, 'templates', `${config.template}.yaml`);
  const template = yaml.load(fs.readFileSync(templatePath, 'utf8'));
  const rule = renderRule(config, template);
  const json = JSON.stringify(rule, null, 2) + '\n';
  if (outPath) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, json);
    process.stdout.write(`Generated: ${outPath}\n`);
  } else {
    process.stdout.write(json);
  }
}

function main(argv) {
  const args = parseArgs(argv);
  const configInput = path.resolve(args.config || path.join(REPO_ROOT, 'config'));
  const isDir = fs.statSync(configInput).isDirectory();

  if (isDir) {
    const outDir = path.resolve(args.out || path.join(REPO_ROOT, 'dist'));
    const configFiles = findConfigs(configInput);
    if (configFiles.length === 0) {
      process.stderr.write(`No config files found in: ${configInput}\n`);
      process.exit(1);
    }
    for (const cfgFile of configFiles) {
      const base = path.basename(cfgFile, path.extname(cfgFile));
      generateOne(cfgFile, path.join(outDir, `${base}.json`));
    }
  } else {
    generateOne(configInput, args.out ? path.resolve(args.out) : null);
  }
}

if (require.main === module) {
  main(process.argv.slice(2));
}
