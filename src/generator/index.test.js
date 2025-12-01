'use strict';

const path = require('path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { substituteString, substituteValue } = require('./substitute');
const { buildParams, renderRule } = require('./render');
const { findConfigs } = require('./discover');

const REPO_ROOT = path.resolve(__dirname, '../..');

// -- substituteString --

test('substituteString replaces a known param', () => {
  assert.equal(substituteString('{{ space_key }}', { space_key: 'ENG' }), 'ENG');
});

test('substituteString leaves dot-notation references unchanged', () => {
  const msg = 'Page: {{ page.title }}';
  assert.equal(substituteString(msg, { space_key: 'ENG' }), msg);
});

test('substituteString substitutes multiple params in one string', () => {
  const result = substituteString(
    '{{ space_key }} / {{ label_filter }}',
    { space_key: 'ENG', label_filter: 'rfc' }
  );
  assert.equal(result, 'ENG / rfc');
});

test('substituteString leaves unknown single-word references as-is', () => {
  assert.equal(substituteString('{{ unknown }}', {}), '{{ unknown }}');
});

test('substituteString converts boolean param to string', () => {
  assert.equal(substituteString('{{ flag }}', { flag: true }), 'true');
  assert.equal(substituteString('{{ flag }}', { flag: false }), 'false');
});

// -- substituteValue --

test('substituteValue substitutes recursively in an object', () => {
  const result = substituteValue(
    { a: '{{ x }}', b: { c: '{{ y }}' } },
    { x: '1', y: '2' }
  );
  assert.deepEqual(result, { a: '1', b: { c: '2' } });
});

test('substituteValue substitutes in arrays', () => {
  const result = substituteValue(['{{ x }}', '{{ y }}'], { x: 'A', y: 'B' });
  assert.deepEqual(result, ['A', 'B']);
});

test('substituteValue passes through non-string primitives', () => {
  assert.equal(substituteValue(42, {}), 42);
  assert.equal(substituteValue(true, {}), true);
  assert.equal(substituteValue(null, {}), null);
});

// -- buildParams --

test('buildParams applies template defaults', () => {
  const params = buildParams([{ name: 'generate_summary', default: true }], {});
  assert.equal(params.generate_summary, true);
});

test('buildParams lets config override defaults', () => {
  const params = buildParams(
    [{ name: 'generate_summary', default: true }],
    { generate_summary: false }
  );
  assert.equal(params.generate_summary, false);
});

test('buildParams omits required param with no default when not in config', () => {
  const params = buildParams([{ name: 'space_key', type: 'string' }], {});
  assert.equal(params.space_key, undefined);
});

// -- renderRule --

const TEMPLATE = {
  name: 'page-created-notify',
  parameters: [
    { name: 'space_key', type: 'string' },
    { name: 'label_filter', type: 'string', default: '' },
    { name: 'summary_property_key', type: 'string', default: 'automation.summary' },
    { name: 'slack_webhook_url', type: 'string' },
    { name: 'generate_summary', type: 'boolean', default: true },
  ],
  trigger: {
    event: 'page_created',
    conditions: [
      { field: 'space.key', operator: 'equals', value: '{{ space_key }}' },
      { field: 'page.labels', operator: 'contains', value: '{{ label_filter }}', skip_when_empty: true },
    ],
  },
  actions: [
    {
      name: 'generate-summary',
      type: 'generate_summary',
      when: '{{ generate_summary }}',
      config: { source: 'page.content', store_as_property: '{{ summary_property_key }}' },
    },
    {
      name: 'notify-slack',
      type: 'send_notification',
      config: {
        channel: 'slack',
        webhook_url: '{{ slack_webhook_url }}',
        message: 'New page: *{{ page.title }}*\n{{ page.url }}\n',
      },
    },
  ],
};

const CONFIG = {
  name: 'engineering-docs-notify',
  description: 'Notify #engineering-docs',
  template: 'page-created-notify',
  parameters: {
    space_key: 'ENG',
    label_filter: 'rfc',
    slack_webhook_url: '${SLACK_WEBHOOK_ENG_DOCS}',
    generate_summary: true,
  },
};

test('renderRule produces correct top-level fields', () => {
  const rule = renderRule(CONFIG, TEMPLATE);
  assert.equal(rule.version, '1');
  assert.equal(rule.name, 'engineering-docs-notify');
  assert.equal(rule.description, 'Notify #engineering-docs');
});

test('renderRule substitutes params into trigger conditions', () => {
  const rule = renderRule(CONFIG, TEMPLATE);
  assert.equal(rule.trigger.event, 'page_created');
  assert.equal(rule.trigger.conditions[0].value, 'ENG');
  assert.equal(rule.trigger.conditions[1].value, 'rfc');
});

test('renderRule strips skip_when_empty from output conditions', () => {
  const rule = renderRule(CONFIG, TEMPLATE);
  assert.equal(rule.trigger.conditions[1].skip_when_empty, undefined);
});

test('renderRule excludes condition when skip_when_empty and value is empty', () => {
  const configNoLabel = { ...CONFIG, parameters: { ...CONFIG.parameters, label_filter: '' } };
  const rule = renderRule(configNoLabel, TEMPLATE);
  assert.equal(rule.trigger.conditions.length, 1);
  assert.equal(rule.trigger.conditions[0].field, 'space.key');
});

test('renderRule includes action when when is true', () => {
  const rule = renderRule(CONFIG, TEMPLATE);
  assert.ok(rule.actions.some(a => a.name === 'generate-summary'));
});

test('renderRule excludes action when when is false', () => {
  const configNoSummary = { ...CONFIG, parameters: { ...CONFIG.parameters, generate_summary: false } };
  const rule = renderRule(configNoSummary, TEMPLATE);
  assert.ok(rule.actions.every(a => a.name !== 'generate-summary'));
});

test('renderRule strips when field from output actions', () => {
  const rule = renderRule(CONFIG, TEMPLATE);
  rule.actions.forEach(a => assert.equal(a.when, undefined));
});

test('renderRule substitutes params into action config', () => {
  const rule = renderRule(CONFIG, TEMPLATE);
  const summarize = rule.actions.find(a => a.name === 'generate-summary');
  assert.equal(summarize.config.store_as_property, 'automation.summary');
});

test('renderRule passes Confluence runtime fields through unchanged', () => {
  const rule = renderRule(CONFIG, TEMPLATE);
  const notify = rule.actions.find(a => a.name === 'notify-slack');
  assert.ok(notify.config.message.includes('{{ page.title }}'));
  assert.ok(notify.config.message.includes('{{ page.url }}'));
});

test('renderRule preserves env-var references in secret params', () => {
  const rule = renderRule(CONFIG, TEMPLATE);
  const notify = rule.actions.find(a => a.name === 'notify-slack');
  assert.equal(notify.config.webhook_url, '${SLACK_WEBHOOK_ENG_DOCS}');
});

test('renderRule includes non-conditional actions unconditionally', () => {
  const rule = renderRule(CONFIG, TEMPLATE);
  assert.ok(rule.actions.some(a => a.name === 'notify-slack'));
});

// -- findConfigs --

test('findConfigs returns single file when given a file path', () => {
  const cfgFile = path.join(REPO_ROOT, 'config', 'engineering-docs-notify.yaml');
  assert.deepEqual(findConfigs(cfgFile), [cfgFile]);
});

test('findConfigs discovers all yaml files in a directory', () => {
  const cfgDir = path.join(REPO_ROOT, 'config');
  const result = findConfigs(cfgDir);
  assert.ok(result.length >= 2);
  assert.ok(result.every(f => f.endsWith('.yaml') || f.endsWith('.yml')));
});

test('findConfigs returns files in sorted order', () => {
  const cfgDir = path.join(REPO_ROOT, 'config');
  const result = findConfigs(cfgDir);
  assert.deepEqual(result, [...result].sort());
});
