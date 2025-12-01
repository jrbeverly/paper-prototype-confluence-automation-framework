'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { summarize } = require('./summarize');
const { createHandler } = require('./index');

// -- summarize --

test('summarize returns content unchanged when short', () => {
  assert.equal(summarize({ content: 'Hello world', title: 'T' }), 'Hello world');
});

test('summarize truncates content longer than 280 chars', () => {
  const result = summarize({ content: 'x'.repeat(300) });
  assert.ok(result.endsWith('...'));
  assert.ok(result.length <= 280);
});

test('summarize falls back to title when content is absent', () => {
  assert.equal(summarize({ title: 'My Title' }), 'My Title');
});

test('summarize returns empty string when both content and title are absent', () => {
  assert.equal(summarize({}), '');
});

// -- handler --

const sampleEvent = {
  body: JSON.stringify({
    page: {
      title: 'Test Page',
      content: 'This is the page content.',
      url: 'https://example.atlassian.net/wiki/spaces/ENG/pages/1',
      author: { displayName: 'Jane Doe' },
    },
    space: { key: 'ENG', name: 'Engineering' },
  }),
};

test('handler produces summary and posts to Slack', async () => {
  process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
  const posts = [];
  const handler = createHandler({ post: async (url, msg) => posts.push({ url, msg }) });

  const response = await handler(sampleEvent);

  assert.equal(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.equal(body.ok, true);
  assert.equal(body.summary, 'This is the page content.');
  assert.equal(posts.length, 1);
  assert.equal(posts[0].url, 'https://hooks.slack.com/test');
  assert.ok(posts[0].msg.includes('Test Page'));
  assert.ok(posts[0].msg.includes('This is the page content.'));
  assert.ok(posts[0].msg.includes('Jane Doe'));
});

test('handler includes page URL in Slack message', async () => {
  process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
  const posts = [];
  const handler = createHandler({ post: async (url, msg) => posts.push({ url, msg }) });

  await handler(sampleEvent);

  assert.ok(posts[0].msg.includes('https://example.atlassian.net'));
});

test('handler accepts pre-parsed body', async () => {
  process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
  const posts = [];
  const handler = createHandler({ post: async (url, msg) => posts.push({ url, msg }) });

  const response = await handler({ body: JSON.parse(sampleEvent.body) });
  assert.equal(response.statusCode, 200);
  assert.equal(posts.length, 1);
});

test('handler throws when SLACK_WEBHOOK_URL is not set', async () => {
  delete process.env.SLACK_WEBHOOK_URL;
  const handler = createHandler({ post: async () => {} });

  await assert.rejects(
    () => handler({ body: JSON.stringify({ page: { title: 'T' }, space: {} }) }),
    /SLACK_WEBHOOK_URL/
  );
});
