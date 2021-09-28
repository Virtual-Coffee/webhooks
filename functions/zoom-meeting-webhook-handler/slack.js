require('dotenv').config();

const { postMessage, updateMessage } = require('../../util/slack');

// timestamp: if we have a timestamp, that means we've ended the meeting and are trying to update the message
// otherwise, post a new message

async function updateMeetingStatus(room, timestamp) {
  const message = {
    channel: room.SlackChannelId,
    text: timestamp ? room.MessageSessionEnded : room.MessageSessionStarted,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: timestamp
            ? room.MessageSessionEnded
            : room.MessageSessionStarted,
        },
        accessory: {
          type: 'button',
          text: {
            type: 'plain_text',
            text: timestamp ? room.ButtonStartNew : room.ButtonJoin,
            emoji: true,
          },
          value: 'join_meeting',
          url: room.ZoomMeetingInviteUrl,
          action_id: 'button-action',
          style: 'primary',
          confirm: {
            title: {
              type: 'plain_text',
              text: room.NoticeTitle,
            },
            text: {
              type: 'mrkdwn',
              text: room.NoticeBody,
            },
            confirm: {
              type: 'plain_text',
              text: room.NoticeConfirm,
            },
            deny: {
              type: 'plain_text',
              text: room.NoticeCancel,
            },
          },
        },
      },
      ...(room.ContextBody
        ? [
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: room.ContextBody,
                },
              ],
            },
          ]
        : []),
    ],
  };

  console.log(JSON.stringify(message));

  const result = timestamp
    ? await updateMessage({ ...message, ts: timestamp })
    : await postMessage(message);

  console.log(
    `Successfully send message ${result.ts} in conversation ${room.SlackChannelId}`
  );

  return result;
}

async function updateMeetingAttendence(room, thread_ts, zoomRequest) {
  const username = zoomRequest.payload.object.participant.user_name;
  const result = await postMessage({
    thread_ts,
    text:
      zoomRequest.event === 'meeting.participant_joined'
        ? `${username} has joined!`
        : `${username} has left. We'll miss you!`,
    channel: room.SlackChannelId,
  });

  console.log(
    `Successfully send message ${result.ts} in conversation ${room.SlackChannelId}`
  );

  return result;
}

module.exports = { updateMeetingStatus, updateMeetingAttendence };
