#!/usr/bin/env node
'use strict';

// Simulates a Confluence page-updated event flowing through the full pipeline:
//   page event → runtime handler → summarize → (captured) Slack notification
const { createHandler } = require('../runtime/index');

const PAGE_EVENT = {
  body: JSON.stringify({
    page: {
      title: 'RFC-042: Async Job Queue',
      content:
        'This RFC proposes introducing an async job queue for background processing. ' +
        'The current synchronous approach blocks request threads during long-running ' +
        'operations, impacting latency under load. The proposed solution uses a ' +
        'Redis-backed queue with worker processes consuming tasks from a shared topic.',
      url: 'https://myorg.atlassian.net/wiki/spaces/ENG/pages/123456789',
      author: { displayName: 'Alice Chen' },
    },
    space: { key: 'ENG', name: 'Engineering' },
  }),
};

async function main() {
  process.stdout.write('=== End-to-end demo ===\n\n');
  process.stdout.write('Event: page updated in Engineering (ENG)\n');

  let posted = null;
  process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/demo';

  const handler = createHandler({
    post: async (_url, message) => {
      posted = message;
    },
  });

  const result = await handler(PAGE_EVENT);

  process.stdout.write(`Handler: ${result.statusCode}\n`);
  process.stdout.write(`Summary: ${JSON.parse(result.body).summary}\n\n`);
  process.stdout.write('Slack notification:\n');
  process.stdout.write('---\n');
  process.stdout.write(posted + '\n');
  process.stdout.write('---\n');
}

main().catch(err => {
  process.stderr.write(`${err.message}\n`);
  process.exit(1);
});
