require('dotenv').config();

const { sendMessage } = require('../../util/slack');

const handler = async function (event, context) {
  const request = JSON.parse(event.body);

  if (request.key !== process.env.WEBHOOKS_VERIFICATION) {
    console.log('Not Authorized');
    throw new Error('Not Authorized');
  }

  switch (request.action) {
    case 'sendMessage':
      const result = await sendMessage(request.message);

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
