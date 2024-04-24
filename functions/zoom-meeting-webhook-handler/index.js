require('dotenv').config();

const crypto = require('crypto');

const { updateMeetingStatus, updateMeetingAttendence } = require('./slack');

const rooms = require('../../data/rooms.json');

const EVENT_MEETING_STARTED = 'meeting.started';
const EVENT_MEETING_ENDED = 'meeting.ended';
const EVENT_PARTICIPANT_JOINED = 'meeting.participant_joined';
const EVENT_PARTICIPANT_LEFT = 'meeting.participant_left';

const ZOOM_SECRET =
  process.env.TEST_ZOOM_WEBHOOK_SECRET_TOKEN ||
  process.env.ZOOM_WEBHOOK_SECRET_TOKEN;

const handler = async function (event, context) {
  try {
    const message = `v0:${event.headers['x-zm-request-timestamp']}:${event.body}`;

    const hashForVerify = crypto
      .createHmac('sha256', ZOOM_SECRET)
      .update(message)
      .digest('hex');

    const signature = `v0=${hashForVerify}`;

    console.log('message');
    console.log(message);
    console.log('signature');
    console.log(signature);
    console.log('x-zm-signature');
    console.log(event.headers['x-zm-signature']);

    if (event.headers['x-zm-signature'] !== signature) {
      console.log('Unauthorized', event);
      return {
        statusCode: 401,
        body: '',
      };
    }

    const request = JSON.parse(event.body);

    if (request.event == 'endpoint.url_validation') {
      const hashForValidate = crypto
        .createHmac('sha256', ZOOM_SECRET)
        .update(request.payload.plainToken)
        .digest('hex');
      return {
        statusCode: 200,
        body: JSON.stringify({
          plainToken: request.payload.plainToken,
          encryptedToken: hashForValidate,
        }),
      };
    }

    // check our meeting ID. The meeting ID never changes, but the uuid is different for each instance

    const room = rooms.find(
      (room) => room.ZoomMeetingId === request.payload.object.id
    );
    console.log('incoming request');
    console.log('request payload');
    console.log(request.payload.object);
    console.log('request event');
    console.log(request.event);

    if (room) {
      const Airtable = require('airtable');
      const base = new Airtable().base(process.env.AIRTABLE_COWORKING_BASE);

      const { findRoomInstance } = require('./airtable');

      switch (request.event) {
        case EVENT_PARTICIPANT_JOINED:
        case EVENT_PARTICIPANT_LEFT:
          let roomInstance = await findRoomInstance(
            room,
            base,
            request.payload.object.uuid
          );

          if (roomInstance) {
            // create room event record
            console.log(`found room instance ${roomInstance.getId()}`);

            const updatedMeeting = await updateMeetingAttendence(
              room,
              roomInstance.get('slack_thread_timestamp'),
              request
            );
          }

          break;

        case EVENT_MEETING_STARTED:
          // post message to Slack and get result
          console.log('posting update');
          const result = await updateMeetingStatus(room);
          console.log('done posting update');

          // create new room instance
          const created = await base('room_instances').create({
            instance_uuid: request.payload.object.uuid,
            slack_thread_timestamp: result.ts,
            start_time: request.payload.object.start_time,
            room_record: [room.record_id],
          });

          if (!created) {
            throw new Error('no record created');
          }

          console.log(`room_event created: ${created.getId()}`);

          break;

        case EVENT_MEETING_ENDED:
          let roomInstanceEnd = await findRoomInstance(
            room,
            base,
            request.payload.object.uuid
          );

          if (roomInstanceEnd) {
            const slackedEnd = await updateMeetingStatus(
              room,
              roomInstanceEnd.get('slack_thread_timestamp')
            );

            // update room instance
            //
            const updated = await base('room_instances').update(
              roomInstanceEnd.getId(),
              {
                end_time: request.payload.object.end_time,
              }
            );

            if (!updated) {
              throw new Error('no record updated');
            }

            console.log(`room_event updated: ${updated.getId()}`);
          }

          break;

        default:
          break;
      }
    } else {
      console.log('meeting ID is not co-working meeting');
    }

    return {
      statusCode: 200,
      body: '',
    };
  } catch (error) {
    // output to netlify function log
    console.log(error);
    return {
      statusCode: 500,
      // Could be a custom message or object i.e. JSON.stringify(err)
      body: JSON.stringify({ msg: error.message }),
    };
  }
};

module.exports = { handler };
