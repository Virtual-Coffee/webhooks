const handler = async function (event, context) {
  return {
    statusCode: 200,
    body: '',
    // body: JSON.stringify({ identity, user, msg: data.value }),
  };
};

module.exports = { handler };
