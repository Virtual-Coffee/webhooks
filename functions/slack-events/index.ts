import { welcome, appHome } from './messages';
import { postMessage, publishView } from '../../util/slack';
import { requireEnv } from '../../util/env';
import { verifySlackRequest } from '../../util/verify';

const SLACK_SIGNING_SECRET =
  process.env.TEST_SLACK_SIGNING_SECRET ||
  requireEnv('SLACK_SIGNING_SECRET');

const EVENT_TEAM_JOIN = 'team_join';
const EVENT_APP_HOME_OPENED = 'app_home_opened';

export default async (req: Request) => {
  try {
    const rawBody = await req.text();
    const request = JSON.parse(rawBody);

    switch (request.type) {
      case 'url_verification':
        if (request.challenge) {
          console.log('Valid url_verification');
          return new Response(request.challenge, { status: 200 });
        }
        break;
      case 'event_callback': {
        const isValid = verifySlackRequest(rawBody, req.headers, SLACK_SIGNING_SECRET);

        if (!isValid.valid) {
          console.log('Failed validation: ', isValid.reason);
          return new Response(isValid.reason, { status: 400 });
        }

        let result: { ok?: boolean } | null = null;

        switch (request.event.type) {
          case EVENT_TEAM_JOIN:
            console.log('Posting to slack-background for team join');

            result = await postMessage(
              welcome({ event: request.event }),
              {
                background: true,
              },
            );

            break;

          case EVENT_APP_HOME_OPENED:
            console.log('Posting to slack-background for app home');

            result = await publishView(
              appHome({ event: request.event }),
              {
                background: true,
              },
            );
            break;

          default:
            break;
        }

        if (result) {
          if (result.ok) {
            console.log(`Successfully posted to slack-background`);

            return new Response(JSON.stringify({ success: true }), {
              status: 200,
            });
          } else {
            console.log(`Error posting to slack-background`);
            console.log(result);

            return new Response(JSON.stringify({ success: false }), {
              status: 400,
            });
          }
        }
        break;
      }
      default:
        break;
    }

    console.log('Unknown action.');
    return new Response(JSON.stringify({ message: 'Unknown action.' }), {
      status: 400,
    });
  } catch (error) {
    console.log(error);
    return new Response('', { status: 500 });
  }
};
