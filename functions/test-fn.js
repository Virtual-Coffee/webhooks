const { test } = require('../testme');

const handler = async function (event, context) {
  test();

  return {
    statusCode: 200,
    body: 'OK',
  };
};

module.exports = { handler };
