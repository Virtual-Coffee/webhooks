import { postMessage, publishView } from '../../util/slack';

interface BackgroundRequest {
  key: string;
  action: string;
  message: Record<string, unknown>;
}

export default async (req: Request) => {
  const request = (await req.json()) as BackgroundRequest;

  if (request.key !== process.env.WEBHOOKS_VERIFICATION) {
    console.log('Not Authorized');
    throw new Error('Not Authorized');
  }

  let result: { ok?: boolean; ts?: string; message?: { username?: string } } | undefined;

  switch (request.action) {
    case 'postMessage':
      result = await postMessage(request.message as unknown as Parameters<typeof postMessage>[0]);

      if (result.ok) {
        console.log(
          `Successfully posted message ${result.ts} to user ${
            result.message && result.message.username
          }`,
        );
      } else {
        console.log('Error posting message:');
        console.log(result);
      }

      break;

    case 'publishView':
      result = await publishView(request.message as unknown as Parameters<typeof publishView>[0]);

      if (result.ok) {
        console.log(
          `Successfully published view to ${(request.message as Record<string, unknown>).user_id}`,
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
};
