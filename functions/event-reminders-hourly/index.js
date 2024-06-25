require('dotenv').config();
const { GraphQLClient, gql } = require('graphql-request');
const { DateTime } = require('luxon');
const { postMessage } = require('../../util/slack');
var slackify = require('slackify-html');
const { schedule } = require('@netlify/functions');

const SLACK_ANNOUNCEMENTS_CHANNEL =
  process.env.TEST_SLACK_ANNOUNCEMENTS_CHANNEL ||
  process.env.SLACK_ANNOUNCEMENTS_CHANNEL;

const SLACK_EVENT_ADMIN_CHANNEL =
  process.env.TEST_SLACK_EVENT_ADMIN_CHANNEL ||
  process.env.SLACK_EVENT_ADMIN_CHANNEL;

const DEFAULT_SLACK_EVENT_CHANNEL = 'C017WAKN883';

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
          eventSlackAnnouncementsChannelId
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

  const rangeStart = DateTime.now()
    .setZone('America/New_York')
    .set({ hour: 0 })
    .toISO();
  const rangeEnd = DateTime.now()
    .setZone('America/New_York')
    .plus({ hours: 1 })
    .toISO();

  console.log('Fetching events', rangeStart, rangeEnd);

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
      // filter out past events
      const now = DateTime.now();
      const filteredList = eventsList.filter((event) => {
        return now < DateTime.fromISO(event.startDateLocalized);
      });

      if (filteredList.length) {
        const hourlyMessages = filteredList.flatMap((event) => {
          const eventDate = DateTime.fromISO(event.startDateLocalized);

          const createMessage = (channel) => {
            const message = {
              channel: channel,
              text: `Starting soon: ${event.title}: ${eventDate.toFormat(
                'EEEE, fff'
              )}`,
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
              ],
            };

            const titleBlock = {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*${event.title}*\n<!date^${eventDate.toSeconds()}^{date_long_pretty} {time}|${eventDate.toFormat(
                  'EEEE, fff'
                )}>`,
              },
            };

            if (event.eventJoinLink && event.eventJoinLink.substring(0, 4) === 'http') {
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

            message.blocks.push(titleBlock);

            if (event.eventJoinLink && event.eventJoinLink.substring(0, 4) !== 'http') {
              message.blocks.push({
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*Location:* ${event.eventJoinLink}`,
                },
              });
            }

            message.blocks.push(
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
              }
            );

            return message;
          };

          const messages = [
            createMessage(DEFAULT_SLACK_EVENT_CHANNEL)
          ];
        
          if (event.eventSlackAnnouncementsChannelId) {
            messages.push(createMessage(event.eventSlackAnnouncementsChannelId));
          }
        
          return messages;
        });

        const hourlyAdminMessage = {
          channel: SLACK_EVENT_ADMIN_CHANNEL,
          text: `Starting soon: ${filteredList
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
            ...filteredList.reduce((list, event) => {
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

              const channels = [DEFAULT_SLACK_EVENT_CHANNEL];
              if (event.eventSlackAnnouncementsChannelId) {
                channels.push(event.eventSlackAnnouncementsChannelId);
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
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `*Announcement posted to:* ` + channels.map(channel => `<#${channel}>`).join(' '),
                  },
                },
                {
                  type: 'divider',
                },
              ];
            }, []),
          ],
        };

        await postMessage(hourlyAdminMessage);

        await Promise.all(
          hourlyMessages.map((message) => postMessage(message))
        );
        // console.log(JSON.stringify(hourlyMessage, null, 2));
      }
    }
    return {
      statusCode: 200,
    };
  } catch (e) {
    console.error(e);
    return {
      statusCode: 500,
    };
  }
};

module.exports.handler = schedule('50 * * * *', handler);
