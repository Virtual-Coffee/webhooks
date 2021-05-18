require('dotenv').config();

const { WebClient } = require('@slack/web-api');
const web = new WebClient(process.env.TEST_SLACK_BOT_TOKEN);

const handler = async function (event, context) {
  const request = JSON.parse(event.body);

  if (request.key !== process.env.WEBHOOKS_VERIFICATION) {
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

  // return {
  //   statusCode: 200,
  //   body: '',
  // };
};

module.exports = { handler };
