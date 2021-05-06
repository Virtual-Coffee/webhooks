require('dotenv').config();
const crypto = require('crypto');

const { WebClient } = require('@slack/web-api');
// const web = new WebClient(process.env.SLACK_BOT_TOKEN);
const web = new WebClient(
  'xoxb-2058222876048-2047060586769-vbavfhv9iv0pYfyW93rfhnfX'
);

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
          return {
            statusCode: 400,
            body: isValid.reason,
          };
        }
        // v0

        const result = await web.chat.postMessage({
          text: 'Hello!',
          channel: request.event.user,
        });

        console.log(
          `Successfully send message ${result.ts} to user ${request.event.user}`
        );

        return {
          statusCode: 200,
          body: '',
        };

      default:
        return {
          statusCode: 200,
          body: '',
        };
    }
  } catch (error) {
    console.log(error);
    return {
      statusCode: 200,
      body: '',
    };
  }

  // return {
  //   statusCode: 200,
  //   body: '',
  // };
};

module.exports = { handler };