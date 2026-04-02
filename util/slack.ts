import { WebClient } from '@slack/web-api';
import type { ChatPostMessageArguments, ChatUpdateArguments, ViewsPublishArguments } from '@slack/web-api';

const SLACK_BOT_TOKEN =
  process.env.TEST_SLACK_BOT_TOKEN || process.env.SLACK_BOT_TOKEN;
const APP_HOST = process.env.TEST_APP_HOST || process.env.APP_HOST;

const web = new WebClient(SLACK_BOT_TOKEN);

async function postBackgroundAction(json: Record<string, unknown> = {}) {
  return await fetch(`${APP_HOST}/slack-send-message`, {
    method: 'POST',
    body: JSON.stringify({
      key: process.env.WEBHOOKS_VERIFICATION,
      ...json,
    }),
  });
}

export async function postMessage(
  message: ChatPostMessageArguments,
  { background = false } = {},
) {
  return background
    ? await postBackgroundAction({
        message,
        action: 'postMessage',
      })
    : await web.chat.postMessage(message);
}

export async function updateMessage(
  message: ChatUpdateArguments,
  { background = false } = {},
) {
  return background
    ? await postBackgroundAction({
        message,
        action: 'updateMessage',
      })
    : await web.chat.update(message);
}

export async function publishView(
  message: ViewsPublishArguments,
  { background = false } = {},
) {
  return background
    ? await postBackgroundAction({
        message,
        action: 'publishView',
      })
    : await web.views.publish(message);
}
