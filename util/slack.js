require('dotenv').config();

const { WebClient } = require('@slack/web-api');
const web = new WebClient(process.env.SLACK_BOT_TOKEN);

async function postMessage(message) {
  return await web.chat.postMessage(message);
}

async function updateMessage(message) {
  return await web.chat.update(message);
}

module.exports({ postMessage, updateMessage });
