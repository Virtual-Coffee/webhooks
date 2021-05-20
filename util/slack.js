require('dotenv').config();
const fetch = require('node-fetch');
const { WebClient } = require('@slack/web-api');
const web = new WebClient(process.env.TEST_SLACK_BOT_TOKEN);

async function postBackgroundAction(json = {}) {
  return await fetch(`${process.env.TEST_APP_HOST}/slack-send-message`, {
    method: 'POST',
    body: JSON.stringify({
      key: process.env.WEBHOOKS_VERIFICATION,
      ...json,
    }),
  });
}

async function postMessage(message, { background = false } = {}) {
  return background
    ? await postBackgroundAction({
        message,
        action: 'postMessage',
      })
    : await web.chat.postMessage(message);
}

async function updateMessage(message, { background = false } = {}) {
  return background
    ? await postBackgroundAction({
        message,
        action: 'updateMessage',
      })
    : await web.chat.update(message);
}

async function publishView(message, { background = false } = {}) {
  return background
    ? await postBackgroundAction({
        message,
        action: 'publishView',
      })
    : await web.views.publish(message);
}

module.exports = { postMessage, updateMessage, publishView };
