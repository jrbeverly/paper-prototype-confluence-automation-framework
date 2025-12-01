'use strict';

// Replace {{ param_name }} with values from params.
// Only substitutes single word-character keys, so Confluence runtime
// references like {{ page.title }} (dot notation) pass through unchanged.
function substituteString(str, params) {
  return str.replace(/{{\s*(\w+)\s*}}/g, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      return String(params[key]);
    }
    return match;
  });
}

function substituteValue(value, params) {
  if (typeof value === 'string') return substituteString(value, params);
  if (Array.isArray(value)) return value.map(item => substituteValue(item, params));
  if (value !== null && typeof value === 'object') {
    const result = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = substituteValue(v, params);
    }
    return result;
  }
  return value;
}

module.exports = { substituteString, substituteValue };
