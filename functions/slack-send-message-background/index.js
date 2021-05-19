require('dotenv').config();

const { WebClient } = require('@slack/web-api');
const web = new WebClient(process.env.SLACK_BOT_TOKEN);

const handler = async function (event, context) {
  const request = JSON.parse(event.body);

  console.log({ event, request });

  if (request.key !== process.env.WEBHOOKS_VERIFICATION) {
    console.log('Not Authorized');
    throw new Error('Not Authorized');
  }

  switch (request.action) {
    case 'greet':
      // welcome
      const { welcome } = require('./messages');

      const result = await web.chat.postMessage(
        welcome({ user: request.event.user })
      );

      console.log(
        `Successfully send message ${result.ts} to user ${request.event.user}`
      );

      break;

    default:
      break;
  }

  console.log('No action');

  // return {
  //   statusCode: 200,
  //   body: '',
  // };
};

module.exports = { handler };
