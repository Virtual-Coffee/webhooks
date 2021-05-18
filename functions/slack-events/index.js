require('dotenv').config();
const crypto = require('crypto');

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
      .createHmac('sha256', process.env.TEST_SLACK_SIGNING_SECRET)
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

const handler = async function (event, context) {
  // https://vc-webhooks-335424.netlify.live/.netlify/functions/slack-events
  //   {
  //     "token": "Jhj5dZrVaK7ZwHHjRyZWjbDl",
  //     "challenge": "3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P",
  //     "type": "url_verification"
  // }
  try {
    const request = JSON.parse(event.body);
    console.log(request);
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

        switch (request.event.type) {
          case EVENT_TEAM_JOIN:
            const result = await fetch('/slack-send-message', {
              method: 'POST',
              body: JSON.stringify({
                key: process.env.WEBHOOKS_VERIFICATION,
                event: request.event,
              }),
            });

            console.log(
              `Successfully send message ${result.ts} to user ${request.event.user}`
            );

            return {
              statusCode: 200,
              body: JSON.stringify({ success: true }),
            };

          default:
            break;
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
