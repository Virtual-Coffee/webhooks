require('dotenv').config();

const crypto = require('crypto');
const messages = require('./messages');

const { postMessage, publishView } = require('../../util/slack');

function verify(event) {
  const slackSignature = event.headers['x-slack-signature'];
  const timestamp = event.headers['x-slack-request-timestamp'];
  // convert current time from milliseconds to seconds
  const time = Math.floor(new Date().getTime() / 1000);
  if (Math.abs(time - timestamp) > 300) {
    return {
      valid: false,
      reason: 'Ignore this request.',
    };
  }

  const verificationString = `v0:${timestamp}:${event.body}`;
  const mySignature =
    'v0=' +
    crypto
      .createHmac('sha256', process.env.SLACK_SIGNING_SECRET)
      .update(verificationString, 'utf8')
      .digest('hex');

  if (
    crypto.timingSafeEqual(
      Buffer.from(mySignature, 'utf8'),
      Buffer.from(slackSignature, 'utf8')
    )
  ) {
    return {
      valid: true,
    };
  } else {
    return {
      valid: false,
      reason: 'Verification Failed.',
    };
  }
}

const EVENT_TEAM_JOIN = 'team_join';
const EVENT_APP_HOME_OPENED = 'app_home_opened';

const handler = async function (event, context) {
  try {
    const request = JSON.parse(event.body);

    switch (request.type) {
      case 'url_verification':
        if (request.challenge) {
          console.log('Valid url_verification');
          return {
            statusCode: 200,
            body: request.challenge,
            // body: JSON.stringify({ identity, user, msg: data.value }),
          };
        }
        break;
      case 'event_callback':
        const isValid = verify(event);

        if (!isValid.valid) {
          console.log('Failed validation: ', isValid.reason);
          return {
            statusCode: 400,
            body: isValid.reason,
          };
        }
        // v0

        let result = null;

        switch (request.event.type) {
          case EVENT_TEAM_JOIN:
            console.log('Posting to slack-background for team join');

            result = await postMessage(
              messages.welcome({ event: request.event }),
              {
                background: true,
              }
            );

            break;

          case EVENT_APP_HOME_OPENED:
            console.log('Posting to slack-background for app home');

            result = await publishView(
              messages.appHome({ event: request.event }),
              {
                background: true,
              }
            );
            break;

          default:
            break;
        }

        if (result) {
          if (result.ok) {
            console.log(`Successfully posted to slack-background`);

            return {
              statusCode: 200,
              body: JSON.stringify({ success: true }),
            };
          } else {
            console.log(`Error posting to slack-background`);

            console.log(result);

            return {
              statusCode: 400,
              body: JSON.stringify({ success: false }),
            };
          }
        }

      default:
        break;
    }

    console.log('Unknown action.');
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Unknown action.' }),
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: 500,
      body: '',
    };
  }

  // return {
  //   statusCode: 200,
  //   body: '',
  // };
};

module.exports = { handler };
