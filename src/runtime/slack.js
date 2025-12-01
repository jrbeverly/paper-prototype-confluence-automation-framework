'use strict';

async function postToSlack(webhookUrl, message) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message }),
  });
  if (!response.ok) {
    throw new Error(`Slack webhook responded with status ${response.status}`);
  }
}

module.exports = { postToSlack };
