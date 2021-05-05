const handler = async function (event, context) {
  //   {
  //     "token": "Jhj5dZrVaK7ZwHHjRyZWjbDl",
  //     "challenge": "3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P",
  //     "type": "url_verification"
  // }

  const request = JSON.parse(event.body);
  if (request.challenge) {
    return {
      statusCode: 200,
      body: request.challenge,
      // body: JSON.stringify({ identity, user, msg: data.value }),
    };
  }

  return {
    statusCode: 200,
    body: '',
  };
};

module.exports = { handler };
