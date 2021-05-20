require('dotenv').config();

const { WebClient } = require('@slack/web-api');
const web = new WebClient(process.env.TEST_SLACK_BOT_TOKEN);

async function postMessage(message) {
  return await web.chat.postMessage(message);
}

async function updateMessage(message) {
  return await web.chat.update(message);
}

async function postBackgroundMessage({ host, message }) {
  await fetch(`${host}/slack-send-message`, {
    method: 'POST',
    body: JSON.stringify({
      key: process.env.WEBHOOKS_VERIFICATION,
      action: 'sendMessage',
      message,
    }),
  });
}

module.exports = { postMessage, updateMessage, postBackgroundMessage };
