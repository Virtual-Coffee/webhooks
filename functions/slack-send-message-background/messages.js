exports.welcome = ({ user }) => ({
  link_names: true,
  unfurl_links: false,
  unfurl_media: false,
  channel: user.id,
  text: `👋 Hey @${user.name}, welcome to Virtual Coffee -- fondly referred to as VC around this space.`,
  blocks: [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `👋 Hey @${user.name}, welcome to Virtual Coffee -- fondly referred to as VC around this space.`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: ' ',
      },
    },
    {
      type: 'divider',
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: ' ',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: "❤️ Before doing anything else, please first take a moment to read our <https://virtualcoffee.io/code-of-conduct|Code of Conduct>. Our Code of Conduct is in effect at any Virtual Coffee function, including direct messages. If you have experienced or witnessed violations to Virtual Coffee's Code of Conduct, please use our <https://virtualcoffee.io/report-coc-violation/|Code of Conduct Violation Form> to let us know.",
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: ' ',
      },
    },
    {
      type: 'divider',
    },
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'Now for the fun part!',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'We have a lot going on here, but here are some places you might want to start:',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '✅ Head over to #welcome and introduce yourself to the rest of the group!',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '🎯 Check out #monthly-challenge to see what the community is working on together right now.',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '📣 The #announcements channel has the most recent news on events and initiatives happening in the community.',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: "💻 Our #co-working-room is a zoom room that's open all day, every day for members to quietly work, pair on solving problems, or just say hello.",
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '❓ #help-and-pairing is the space for asking questions about any and all tech related topics. But if you have a general question, we have a really welcoming community, so feel free to throw it in the channel that looks best.',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: ' ',
      },
    },
    {
      type: 'divider',
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: ' ',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: "❤️ And remember, you can always message one of our community maintainers, @rhawrot, @dan, @thesaramccombs, or @tkshillingford for any help and support you may need. \n\n *We're happy to have you here!*",
      },
    },
  ],
});
