'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { injectEndpointUrl } = require('./index');
const { upsertRule } = require('./client');

// -- injectEndpointUrl --

test('injectEndpointUrl replaces ${ENDPOINT_URL} in definition', () => {
  const def = { name: 'test', actions: [{ config: { url: '${ENDPOINT_URL}' } }] };
  const result = injectEndpointUrl(def, 'https://lambda.example.com/fn');
  assert.equal(result.actions[0].config.url, 'https://lambda.example.com/fn');
});

test('injectEndpointUrl returns definition unchanged when endpointUrl is null', () => {
  const def = { name: 'test', actions: [] };
  const result = injectEndpointUrl(def, null);
  assert.deepEqual(result, def);
});

test('injectEndpointUrl replaces all occurrences in the definition', () => {
  const def = { a: '${ENDPOINT_URL}', b: '${ENDPOINT_URL}' };
  const result = injectEndpointUrl(def, 'https://example.com');
  assert.equal(result.a, 'https://example.com');
  assert.equal(result.b, 'https://example.com');
});

test('injectEndpointUrl replaces deeply nested references', () => {
  const def = { trigger: {}, actions: [{ config: { webhook: '${ENDPOINT_URL}' } }] };
  const result = injectEndpointUrl(def, 'https://fn.example.com');
  assert.equal(result.actions[0].config.webhook, 'https://fn.example.com');
});

test('injectEndpointUrl does not mutate the original definition', () => {
  const def = { url: '${ENDPOINT_URL}' };
  injectEndpointUrl(def, 'https://example.com');
  assert.equal(def.url, '${ENDPOINT_URL}');
});

// -- upsertRule --

test('upsertRule creates rule when no existing rules match', async () => {
  const created = [];
  const result = await upsertRule(
    { name: 'my-rule' },
    'ENG',
    {
      listRules: async () => [],
      createRule: async (rule, spaceKey) => { created.push({ rule, spaceKey }); return { id: 42 }; },
      updateRule: async () => {},
    }
  );
  assert.equal(result.action, 'created');
  assert.equal(result.id, 42);
  assert.equal(created.length, 1);
  assert.equal(created[0].rule.name, 'my-rule');
  assert.equal(created[0].spaceKey, 'ENG');
});

test('upsertRule updates rule when name matches an existing rule', async () => {
  const updated = [];
  const result = await upsertRule(
    { name: 'my-rule' },
    'ENG',
    {
      listRules: async () => [{ id: 7, name: 'my-rule' }],
      createRule: async () => {},
      updateRule: async (id, rule) => { updated.push({ id, rule }); },
    }
  );
  assert.equal(result.action, 'updated');
  assert.equal(result.id, 7);
  assert.equal(updated[0].id, 7);
  assert.equal(updated[0].rule.name, 'my-rule');
});

test('upsertRule handles list response wrapped under a rules property', async () => {
  const result = await upsertRule(
    { name: 'new-rule' },
    'ENG',
    {
      listRules: async () => ({ rules: [{ id: 1, name: 'other-rule' }] }),
      createRule: async () => ({ id: 99 }),
      updateRule: async () => {},
    }
  );
  assert.equal(result.action, 'created');
  assert.equal(result.id, 99);
});

test('upsertRule matches by name only, ignoring other fields', async () => {
  const updated = [];
  const result = await upsertRule(
    { name: 'target', version: '1' },
    'ENG',
    {
      listRules: async () => [
        { id: 1, name: 'other' },
        { id: 2, name: 'target' },
      ],
      createRule: async () => {},
      updateRule: async (id, rule) => { updated.push({ id, rule }); },
    }
  );
  assert.equal(result.action, 'updated');
  assert.equal(result.id, 2);
  assert.equal(updated.length, 1);
});

test('upsertRule creates when list is empty object with no rules key', async () => {
  const created = [];
  const result = await upsertRule(
    { name: 'solo-rule' },
    'ENG',
    {
      listRules: async () => ({}),
      createRule: async (rule) => { created.push(rule); return { id: 1 }; },
      updateRule: async () => {},
    }
  );
  assert.equal(result.action, 'created');
  assert.equal(created.length, 1);
});
