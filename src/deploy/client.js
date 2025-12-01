'use strict';

// Idempotent upsert: find rule by name, create if absent, update if present.
// Accepts listRules/createRule/updateRule as a dep bag so the logic is
// testable without touching the network.
async function upsertRule(rule, spaceKey, { listRules, createRule, updateRule }) {
  const existing = await listRules(spaceKey);
  const rules = Array.isArray(existing) ? existing : (existing.rules || []);
  const match = rules.find(r => r.name === rule.name);
  if (match) {
    await updateRule(match.id, rule);
    return { action: 'updated', id: match.id };
  }
  const created = await createRule(rule, spaceKey);
  return { action: 'created', id: created.id };
}

function createClient({ baseUrl, email, token }) {
  const auth = Buffer.from(`${email}:${token}`).toString('base64');
  const headers = {
    Authorization: `Basic ${auth}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  async function request(method, urlPath, body) {
    const url = `${baseUrl}/wiki/rest/automation/1.0${urlPath}`;
    const opts = { method, headers };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const response = await fetch(url, opts);
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Confluence API ${method} ${urlPath} responded ${response.status}: ${text}`);
    }
    return response.json();
  }

  const client = {
    listRules(spaceKey) {
      const qs = spaceKey ? `?spaceKey=${encodeURIComponent(spaceKey)}` : '';
      return request('GET', `/rule${qs}`);
    },
    createRule(rule, spaceKey) {
      const body = spaceKey ? { ...rule, spaceKey } : rule;
      return request('POST', '/rule', body);
    },
    updateRule(id, rule) {
      return request('PUT', `/rule/${encodeURIComponent(String(id))}`, rule);
    },
  };
  client.upsertRule = (rule, spaceKey) => upsertRule(rule, spaceKey, client);
  return client;
}

module.exports = { createClient, upsertRule };
