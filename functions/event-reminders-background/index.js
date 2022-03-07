require('dotenv').config();
const { GraphQLClient, gql } = require('graphql-request');
const { DateTime } = require('luxon');
const { postMessage, publishView } = require('../../util/slack');
var slackify = require('slackify-html');

const SLACK_ANNOUNCEMENTS_CHANNEL =
  process.env.TEST_SLACK_ANNOUNCEMENTS_CHANNEL ||
  process.env.SLACK_ANNOUNCEMENTS_CHANNEL;

const SLACK_EVENT_ADMIN_CHANNEL =
  process.env.TEST_SLACK_EVENT_ADMIN_CHANNEL ||
  process.env.SLACK_EVENT_ADMIN_CHANNEL;

const calendarsQuery = gql`
  query getCalendars {
    solspace_calendar {
      calendars {
        handle
      }
    }
  }
`;

function createEventsQuery(calendars) {
  return gql`
	query getEvents($rangeStart: String!, $rangeEnd: String!) {
		solspace_calendar {
			events(rangeStart: $rangeStart, rangeEnd: $rangeEnd) {
				id
				title
				startDateLocalized
				endDateLocalized
				${calendars.solspace_calendar.calendars.map(
          ({ handle }) => `
				... on ${handle}_Event {
					eventCalendarDescription
					eventJoinLink
					eventZoomHostCode
					id
				}
				`
        )}
			}
		}
	}
`;
}

const handler = async function (event, context) {
  const graphQLClient = new GraphQLClient(`${process.env.CMS_URL}/api`, {
    headers: {
      Authorization: `bearer ${process.env.CMS_TOKEN}`,
    },
  });

  console.log('Fetching events');

  // types = weekly, daily, hourly
  const reminderType = event.queryStringParameters.type;

  const rangeStart = DateTime.now().toISO();
  const rangeEnd = DateTime.now()
    .plus(
      reminderType === 'weekly'
        ? { weeks: 1 }
        : reminderType === 'daily'
        ? { days: 1 }
        : { hours: 1 }
    )
    .toISO();

  try {
    const calendarsResponse = await graphQLClient.request(calendarsQuery);
    const eventsResponse = await graphQLClient.request(
      createEventsQuery(calendarsResponse),
      {
        rangeStart,
        rangeEnd,
      }
    );

    const eventsList = eventsResponse.solspace_calendar.events;
    if (eventsList && eventsList.length) {
      switch (reminderType) {
        case 'weekly':
          const weeklyMessage = {
            channel: SLACK_ANNOUNCEMENTS_CHANNEL,
            text: `This weeks events are: ${eventsList
              .map((event) => {
                return `${event.title}: ${DateTime.fromISO(
                  event.startDateLocalized
                ).toFormat('EEEE, fff')}`;
              })
              .join(', ')}`,
            unfurl_links: false,
            unfurl_media: false,
            blocks: [
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: "📆 This Week's Events Are:",
                  emoji: true,
                },
              },
              ...eventsList.map((event) => {
                const eventDate = DateTime.fromISO(event.startDateLocalized);
                // TODO - colate these by date
                return {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `*<!date^${eventDate.toSeconds()}^{date_long_pretty} {time}|${eventDate.toFormat(
                      'EEEE, fff'
                    )}>*\n${event.title}`,
                  },
                };
              }),
              {
                type: 'context',
                elements: [
                  {
                    type: 'mrkdwn',
                    text: `See details and more events at <https://virtualcoffee.io/events|VirtualCoffee.IO>!`,
                  },
                ],
              },
            ],
          };

          await postMessage(weeklyMessage);
          break;

        case 'daily':
          const dayCheck = new Date();
          if (dayCheck.getDay() === 1) {
            // don't run this one on monday, since the weekly one runs on monday
            return;
          }

          const dailyMessage = {
            channel: SLACK_ANNOUNCEMENTS_CHANNEL,
            text: `Today's events are: ${eventsList
              .map((event) => {
                return `${event.title}: ${DateTime.fromISO(
                  event.startDateLocalized
                ).toFormat('EEEE, fff')}`;
              })
              .join(', ')}`,
            unfurl_links: false,
            unfurl_media: false,
            blocks: [
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: "📆 Today's Events Are:",
                  emoji: true,
                },
              },
              ...eventsList.reduce((list, event) => {
                const eventDate = DateTime.fromISO(event.startDateLocalized);
                return [
                  ...list,
                  {
                    type: 'section',
                    text: {
                      type: 'mrkdwn',
                      text: `*${
                        event.title
                      }*\n<!date^${eventDate.toSeconds()}^{date_long_pretty} {time}|${eventDate.toFormat(
                        'EEEE, fff'
                      )}>`,
                    },
                  },
                  {
                    type: 'context',
                    elements: [
                      {
                        type: 'mrkdwn',
                        text: slackify(event.eventCalendarDescription),
                      },
                    ],
                  },
                  {
                    type: 'divider',
                  },
                ];
              }, []),
            ],
          };

          await postMessage(dailyMessage);
          break;

        case 'hourly':
          const hourlyMessage = {
            channel: SLACK_ANNOUNCEMENTS_CHANNEL,
            text: `Starting soon: ${eventsList
              .map((event) => {
                return `${event.title}: ${DateTime.fromISO(
                  event.startDateLocalized
                ).toFormat('EEEE, fff')}`;
              })
              .join(', ')}`,
            unfurl_links: false,
            unfurl_media: false,
            blocks: [
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: '⏰ Starting Soon:',
                  emoji: true,
                },
              },
              ...eventsList.reduce((list, event) => {
                const eventDate = DateTime.fromISO(event.startDateLocalized);

                const titleBlock = {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `*${
                      event.title
                    }*\n<!date^${eventDate.toSeconds()}^{date_long_pretty} {time}|${eventDate.toFormat(
                      'EEEE, fff'
                    )}>`,
                  },
                };

                if (
                  event.eventJoinLink &&
                  event.eventJoinLink.substring(0, 4) === 'http'
                ) {
                  titleBlock.accessory = {
                    type: 'button',
                    text: {
                      type: 'plain_text',
                      text: 'Join Event',
                      emoji: true,
                    },
                    value: `join_event_${event.id}`,
                    url: event.eventJoinLink,
                    action_id: 'button-join-event',
                  };
                }

                console.log(event.eventCalendarDescription);

                return [
                  ...list,
                  titleBlock,
                  ...(event.eventJoinLink &&
                  event.eventJoinLink.substring(0, 4) !== 'http'
                    ? [
                        {
                          type: 'section',
                          text: {
                            type: 'mrkdwn',
                            text: `*Location:* ${event.eventJoinLink}`,
                          },
                        },
                      ]
                    : []),
                  {
                    type: 'context',
                    elements: [
                      {
                        type: 'mrkdwn',
                        text: slackify(event.eventCalendarDescription),
                      },
                    ],
                  },
                  {
                    type: 'divider',
                  },
                ];
              }, []),
            ],
          };

          const hourlyAdminMessage = {
            channel: SLACK_EVENT_ADMIN_CHANNEL,
            text: `Starting soon: ${eventsList
              .map((event) => {
                return `${event.title}: ${DateTime.fromISO(
                  event.startDateLocalized
                ).toFormat('EEEE, fff')}`;
              })
              .join(', ')}`,
            unfurl_links: false,
            unfurl_media: false,
            blocks: [
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: '⏰ Starting Soon:',
                  emoji: true,
                },
              },
              ...eventsList.reduce((list, event) => {
                const eventDate = DateTime.fromISO(event.startDateLocalized);

                const titleBlock = {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `*${
                      event.title
                    }*\n<!date^${eventDate.toSeconds()}^{date_long_pretty} {time}|${eventDate.toFormat(
                      'EEEE, fff'
                    )}>`,
                  },
                };

                if (
                  event.eventJoinLink &&
                  event.eventJoinLink.substring(0, 4) === 'http'
                ) {
                  titleBlock.accessory = {
                    type: 'button',
                    text: {
                      type: 'plain_text',
                      text: 'Join Event',
                      emoji: true,
                    },
                    value: `join_event_${event.id}`,
                    url: event.eventJoinLink,
                    action_id: 'button-join-event',
                  };
                }

                return [
                  ...list,
                  titleBlock,
                  {
                    type: 'section',
                    text: {
                      type: 'mrkdwn',
                      text: `*Location:* ${event.eventJoinLink}`,
                    },
                  },
                  ...(event.eventZoomHostCode
                    ? [
                        {
                          type: 'section',
                          text: {
                            type: 'mrkdwn',
                            text: `*Host Code:* ${event.eventZoomHostCode}`,
                          },
                        },
                      ]
                    : []),
                ];
              }, []),
            ],
          };

          await postMessage(hourlyAdminMessage);
          await postMessage(hourlyMessage);
          console.log(JSON.stringify(hourlyMessage, null, 2));
          break;

        default:
          break;
      }
    }
  } catch (e) {
    console.error(e);
    return [];
  }
};

module.exports = { handler };
