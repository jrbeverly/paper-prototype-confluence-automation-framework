'use strict';

const { substituteValue } = require('./substitute');

function buildParams(templateParams, configParams) {
  const result = {};
  for (const p of (templateParams || [])) {
    if ('default' in p) result[p.name] = p.default;
  }
  return Object.assign(result, configParams || {});
}

function isFalsy(val) {
  if (val === false || val === null || val === undefined) return true;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    return s === '' || s === 'false' || s === '0';
  }
  return val === 0;
}

function renderRule(config, template) {
  const params = buildParams(template.parameters, config.parameters);

  const rawTrigger = substituteValue(template.trigger || {}, params);
  const conditions = (rawTrigger.conditions || [])
    .filter(c => !(c.skip_when_empty && (c.value === '' || c.value == null)))
    .map(({ skip_when_empty, ...rest }) => rest);

  const actions = (template.actions || [])
    .map(action => substituteValue(action, params))
    .filter(action => !('when' in action) || !isFalsy(action.when))
    .map(({ when, ...rest }) => rest);

  return {
    version: '1',
    name: config.name,
    description: (config.description || '').trim(),
    trigger: { event: rawTrigger.event, conditions },
    actions,
  };
}

module.exports = { buildParams, renderRule };
