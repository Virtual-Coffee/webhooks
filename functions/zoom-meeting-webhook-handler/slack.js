require('dotenv').config();

const { WebClient } = require('@slack/web-api');
const web = new WebClient(process.env.SLACK_BOT_TOKEN);

// timestamp: if we have a timestamp, that means we've ended the meeting and are trying to update the message
// otherwise, post a new message

async function updateMeetingStatus(timestamp) {
  const message = {
    channel: process.env.SLACK_COWORKING_CHANNEL_ID,
    text: timestamp
      ? 'The current Co-Working Session has ended.'
      : 'A new Co-Working Session has Started!',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: timestamp
            ? 'The current Co-Working Session has ended.'
            : 'A new Co-Working Session has Started!',
        },
        accessory: {
          type: 'button',
          text: {
            type: 'plain_text',
            text: timestamp ? 'Start a New Session!' : 'Join Now!',
            emoji: true,
          },
          value: 'join_meeting',
          url:
            'https://us02web.zoom.us/j/81323022832?pwd=Rm1PcG13RTBrMlMzQi8yaXVlc3hmdz09',
          action_id: 'button-action',
          style: 'primary',
          confirm: {
            title: {
              type: 'plain_text',
              text: 'Heads up!',
            },
            text: {
              type: 'mrkdwn',
              text:
                "This is a Zoom link - following it will most likely open Zoom and add you to our Co-Working Room. \n\n Additionally, as always, our <https://virtualcoffee.io/code-of-conduct|Code of Conduct> is in effect. \n\n Just want to make sure we're all on the same page 😃",
            },
            confirm: {
              type: 'plain_text',
              text: "Let's go!",
            },
            deny: {
              type: 'plain_text',
              text: "Stop, I've changed my mind!",
            },
          },
        },
      },
    ],
  };

  console.log({ timestamp });

  const result = timestamp
    ? await web.chat.update({ ...message, ts: timestamp })
    : await web.chat.postMessage(message);

  console.log(
    `Successfully send message ${result.ts} in conversation ${process.env.SLACK_COWORKING_CHANNEL_ID}`
  );

  return result;
}

async function updateMeetingAttendence(thread_ts, zoomRequest) {
  const username = zoomRequest.payload.object.participant.user_name;
  const result = await web.chat.postMessage({
    thread_ts,
    text:
      zoomRequest.event === 'meeting.participant_joined'
        ? `${username} has joined!`
        : `${username} has left. We'll miss you!`,
    channel: process.env.SLACK_COWORKING_CHANNEL_ID,
  });

  console.log(
    `Successfully send message ${result.ts} in conversation ${process.env.SLACK_COWORKING_CHANNEL_ID}`
  );

  return result;
}

module.exports = { updateMeetingStatus, updateMeetingAttendence };
