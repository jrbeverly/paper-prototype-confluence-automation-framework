#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { createClient } = require('./client');

const REPO_ROOT = path.resolve(__dirname, '../..');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dist') args.dist = argv[++i];
    if (argv[i] === '--endpoint-url') args.endpointUrl = argv[++i];
    if (argv[i] === '--space-key') args.spaceKey = argv[++i];
  }
  return args;
}

// Replace every ${ENDPOINT_URL} placeholder in the serialised definition with
// the resolved serverless endpoint URL (e.g. the Terraform function_url output).
function injectEndpointUrl(definition, endpointUrl) {
  if (!endpointUrl) return definition;
  const replaced = JSON.stringify(definition).replace(/\$\{ENDPOINT_URL\}/g, endpointUrl);
  return JSON.parse(replaced);
}

async function main(argv) {
  const args = parseArgs(argv);
  const distDir = path.resolve(args.dist || path.join(REPO_ROOT, 'dist'));
  const endpointUrl = args.endpointUrl || process.env.ENDPOINT_URL;
  const spaceKey = args.spaceKey || process.env.CONFLUENCE_SPACE_KEY;

  const baseUrl = process.env.CONFLUENCE_BASE_URL;
  const email = process.env.CONFLUENCE_EMAIL;
  const token = process.env.CONFLUENCE_API_TOKEN;

  if (!baseUrl || !email || !token) {
    process.stderr.write(
      'Required env vars: CONFLUENCE_BASE_URL, CONFLUENCE_EMAIL, CONFLUENCE_API_TOKEN\n'
    );
    process.exit(1);
  }

  const client = createClient({ baseUrl, email, token });

  const files = fs.readdirSync(distDir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .map(f => path.join(distDir, f));

  if (files.length === 0) {
    process.stderr.write(`No JSON files found in: ${distDir}\n`);
    process.exit(1);
  }

  for (const file of files) {
    const definition = JSON.parse(fs.readFileSync(file, 'utf8'));
    const injected = injectEndpointUrl(definition, endpointUrl);
    const result = await client.upsertRule(injected, spaceKey);
    process.stdout.write(`Deployed: ${injected.name} (${result.action})\n`);
  }
}

if (require.main === module) {
  main(process.argv.slice(2)).catch(err => {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  });
}

module.exports = { injectEndpointUrl };
