require('dotenv').config();
const { GraphQLClient, gql } = require('graphql-request');
const { DateTime } = require('luxon');
const { postMessage } = require('../../util/slack');
const { schedule } = require('@netlify/functions');
var slackify = require('slackify-html');

const SLACK_ANNOUNCEMENTS_CHANNEL =
  process.env.TEST_SLACK_ANNOUNCEMENTS_CHANNEL ||
  process.env.SLACK_ANNOUNCEMENTS_CHANNEL;

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

  const rangeStart = DateTime.now().setZone('America/New_York').toISO();
  const rangeEnd = DateTime.now()
    .setZone('America/New_York')
    .plus({ days: 1 })
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
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `ℹ️ Links to join events will be posted here about 10 minutes before the event starts.`,
              },
            ],
          },
        ],
      };

      await postMessage(dailyMessage);
    }
  } catch (e) {
    console.error(e);
    return [];
  }
};

module.exports.handler = schedule('0 8 * * *', handler);
