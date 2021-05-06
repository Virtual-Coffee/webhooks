require('dotenv').config();

const { WebClient } = require('@slack/web-api');
const web = new WebClient(process.env.SLACK_BOT_TOKEN);

// timestamp: if we have a timestamp, that means we've ended the meeting and are trying to update the message
// otherwise, post a new message

async function updateMeetingStatus(timestamp) {
  // https://app.slack.com/block-kit-builder/T014AAKN3KP#%7B%22blocks%22:%5B%7B%22type%22:%22section%22,%22text%22:%7B%22type%22:%22mrkdwn%22,%22text%22:%22A%20new%20Co-Working%20Session%20has%20Started!%22%7D,%22accessory%22:%7B%22type%22:%22button%22,%22text%22:%7B%22type%22:%22plain_text%22,%22text%22:%22Join%20Now!%22,%22emoji%22:true%7D,%22value%22:%22click_me_123%22,%22url%22:%22https://us02web.zoom.us/j/81323022832?pwd=Rm1PcG13RTBrMlMzQi8yaXVlc3hmdz09%22,%22action_id%22:%22button-action%22,%22style%22:%22primary%22,%22confirm%22:%7B%22title%22:%7B%22type%22:%22plain_text%22,%22text%22:%22Heads%20up!%22%7D,%22text%22:%7B%22type%22:%22mrkdwn%22,%22text%22:%22This%20is%20a%20Zoom%20link%20-%20following%20it%20will%20most%20likely%20open%20Zoom%20and%20add%20you%20to%20our%20Co-Working%20Room.%20%5Cn%5Cn%20Additionally,%20as%20always,%20our%20%3Chttps://virtualcoffee.io/code-of-conduct%7CCode%20of%20Conduct%3E%20is%20in%20effect.%20%5Cn%5Cn%20Just%20want%20to%20make%20sure%20we're%20all%20on%20the%20same%20page%20%F0%9F%98%83%22%7D,%22confirm%22:%7B%22type%22:%22plain_text%22,%22text%22:%22Let's%20go!%22%7D,%22deny%22:%7B%22type%22:%22plain_text%22,%22text%22:%22Stop,%20I've%20changed%20my%20mind!%22%7D%7D%7D%7D%5D%7D
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
