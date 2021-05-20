require('dotenv').config();

const { postMessage, publishView } = require('../../util/slack');

const handler = async function (event, context) {
  const request = JSON.parse(event.body);

  if (request.key !== process.env.WEBHOOKS_VERIFICATION) {
    console.log('Not Authorized');
    throw new Error('Not Authorized');
  }

  let result;

  switch (request.action) {
    case 'postMessage':
      result = await postMessage(request.message);

      if (result.ok) {
        console.log(
          `Successfully posted message ${result.ts} to user ${
            result.message && result.message.username
          }`
        );
      } else {
        console.log('Error posting message:');
        console.log(result);
      }

      break;

    case 'publishView':
      result = await publishView(request.message);

      if (result.ok) {
        console.log(
          `Successfully published view to ${request.message.user_id}`
        );
      } else {
        console.log('Error publishing view:');
        console.log(result);
      }

      break;

    default:
      console.log('No action');
      break;
  }

  // return {
  //   statusCode: 200,
  //   body: '',
  // };
};

module.exports = { handler };
