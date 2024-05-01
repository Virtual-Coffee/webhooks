require('dotenv').config();

const { updateMeetingAttendence } = require('../zoom-meeting-webhook-handler/slack.js');

const rooms = require('../../data/rooms.json');

const handler = async function (event, context) {
  try {
    const request = JSON.parse(event.body);

    console.log('PRINTING REQUEST FROM handle-participant-joined-left-background')
    console.log(JSON.stringify(request, null, 2))

    // check our meeting ID. The meeting ID never changes, but the uuid is different for each instance

    const room = rooms.find(
      (room) => room.ZoomMeetingId === request.payload.object.id
    );

    if (room) {
      const Airtable = require('airtable');
      const base = new Airtable().base(process.env.AIRTABLE_COWORKING_BASE);

      const { findRoomInstance } = require('../zoom-meeting-webhook-handler/airtable');

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
