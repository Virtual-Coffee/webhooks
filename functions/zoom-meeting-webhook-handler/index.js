require('dotenv').config();

const { updateMeetingStatus, updateMeetingAttendence } = require('./slack');

const EVENT_MEETING_STARTED = 'meeting.started';
const EVENT_MEETING_ENDED = 'meeting.ended';
const EVENT_PARTICIPANT_JOINED = 'meeting.participant_joined';
const EVENT_PARTICIPANT_LEFT = 'meeting.participant_left';

const handler = async function (event, context) {
  try {
    if (event.headers.authorization !== process.env.ZOOM_WEBHOOK_AUTH) {
      console.log('Unauthorized', event);
      return {
        statusCode: 401,
        body: '',
      };
    }

    const request = JSON.parse(event.body);

    console.log(request);

    // check our meeting ID. The meeting ID never changes, but the uuid is different for each instance
    if (request.payload.object.id === process.env.ZOOM_COWORKING_MEETING_ID) {
      const Airtable = require('airtable');
      const base = new Airtable().base(process.env.AIRTABLE_COWORKING_BASE);

      const { findRoomInstance } = require('./airtable');

      switch (request.event) {
        case EVENT_PARTICIPANT_JOINED:
        case EVENT_PARTICIPANT_LEFT:
          let roomInstance = await findRoomInstance(
            base,
            request.payload.object.uuid
          );

          if (roomInstance) {
            // create room event record
            console.log(`found room instance ${roomInstance.getId()}`);

            const updatedMeeting = await updateMeetingAttendence(
              roomInstance.get('slack_thread_timestamp'),
              request
            );
          }

          break;

        case EVENT_MEETING_STARTED:
          // post message to Slack and get result
          const result = await updateMeetingStatus();

          // create new room instance
          const created = await base('room_instances').create({
            instance_uuid: request.payload.object.uuid,
            slack_thread_timestamp: result.ts,
            start_time: request.payload.object.start_time,
          });

          if (!created) {
            throw new Error('no record created');
          }

          console.log(`room_event created: ${created.getId()}`);

          break;

        case EVENT_MEETING_ENDED:
          let roomInstanceEnd = await findRoomInstance(
            base,
            request.payload.object.uuid
          );

          if (roomInstanceEnd) {
            const slackedEnd = await updateMeetingStatus(
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
    }

    console.log('meeting ID is not co-working meeting');

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
