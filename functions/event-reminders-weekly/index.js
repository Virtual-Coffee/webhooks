require('dotenv').config();
const { GraphQLClient, gql } = require('graphql-request');
const { DateTime } = require('luxon');
const { postMessage } = require('../../util/slack');
const { schedule } = require('@netlify/functions');

const SLACK_ANNOUNCEMENTS_CHANNEL =
  process.env.TEST_SLACK_ANNOUNCEMENTS_CHANNEL ||
  process.env.SLACK_ANNOUNCEMENTS_CHANNEL;

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
          eventSlackAnnouncementsChannelId
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

  const rangeStart = DateTime.now()
    .setZone('America/New_York')
    .set({ hour: 0 })
    .toISO();
  const rangeEnd = DateTime.now()
    .setZone('America/New_York')
    .plus({ weeks: 1 })
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
                )}>* in <#${
                  event.eventSlackAnnouncementsChannelId ||
                  DEFAULT_SLACK_EVENT_CHANNEL
                }>\n${event.title}`,
              },
            };
          }),
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `ℹ️ Links to join will be posted in the specified channel about 10 minutes before the event starts.`,
              },
            ],
          },
          {
            type: 'divider',
          },
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

module.exports.handler = schedule('0 12 * * 1', handler);
