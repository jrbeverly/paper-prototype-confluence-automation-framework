'use strict';

const { summarize } = require('./summarize');
const { postToSlack } = require('./slack');

// createHandler accepts optional dependency overrides, enabling test injection
// without altering the exported handler's Lambda-compatible signature.
function createHandler(deps = {}) {
  const post = deps.post || postToSlack;

  return async function handler(event) {
    const body =
      typeof event.body === 'string' ? JSON.parse(event.body) : (event.body ?? {});
    const { page = {}, space = {} } = body;

    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) throw new Error('SLACK_WEBHOOK_URL environment variable is not set');

    const summary = summarize(page);

    const lines = [
      `*${page.title || 'Untitled'}*`,
      `Space: ${space.name || space.key || 'Unknown'} | Author: ${page.author?.displayName || 'Unknown'}`,
    ];
    if (page.url) lines.push(page.url);
    if (summary) lines.push('', `Summary: ${summary}`);

    await post(webhookUrl, lines.join('\n'));

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, summary }),
    };
  };
}

const handler = createHandler();
module.exports = { handler, createHandler };
