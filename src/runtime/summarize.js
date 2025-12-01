'use strict';

// Generate a summary of a Confluence page.
//
// Stub: returns a truncated excerpt of the page content.
// Seam: replace this function body with a Claude API call when that
// integration is ready. The signature and return type must not change.
function summarize(page) {
  const text = (page.content || page.title || '').trim();
  if (!text) return '';
  return text.length > 280 ? text.slice(0, 277) + '...' : text;
}

module.exports = { summarize };
