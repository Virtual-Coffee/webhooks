require('dotenv').config();

const { WebClient } = require("@slack/web-api");

const SLACK_COWORKING_CHANNEL_ID = process.env.SLACK_COWORKING_CHANNEL_ID;
const SLACK_COWORKING_CHANNEL_NAME = process.env.SLACK_COWORKING_CHANNEL_NAME;

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

const ZOOM_COWORKING_JOIN_URL = process.env.ZOOM_COWORKING_JOIN_URL;
const ZOOM_DESKTOP_COWORKING_APP_JOIN_URL = process.env.ZOOM_DESKTOP_COWORKING_APP_JOIN_URL;

const slack = new WebClient(SLACK_BOT_TOKEN);


function parseBody(event) {
  let body = event.body || "";
  if (event.isBase64Encoded) body = Buffer.from(body, "base64").toString("utf8");
  const ct = (event.headers?.["content-type"] || event.headers?.["Content-Type"] || "").toLowerCase();

  if (ct.includes("application/json")) return body ? JSON.parse(body) : {};
  if (ct.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(body));
  }
  // try JSON, else return raw string
  try { return body ? JSON.parse(body) : {}; } catch { return { raw: body }; }
}


async function handleStartCall() {
  // Create a Slack call and post a call block
  const created = await slack.calls.add({
    title: "co-working-room",
    external_unique_id: "0xDEADBEEF",
    join_url: ZOOM_COWORKING_JOIN_URL,
    desktop_app_join_url: ZOOM_DESKTOP_COWORKING_APP_JOIN_URL,
  });

  const call_id = created?.call?.id;
  await slack.chat.postMessage({
    channel: SLACK_COWORKING_CHANNEL_NAME,
    blocks: [{ type: "call", call_id }],
  });

  return call_id;
}


function handleValidation(zoomEvent) {
  const plainToken = zoomEvent?.payload?.plainToken || "";
  const encryptedToken = crypto
    .createHmac("sha256", ZOOM_WEBHOOK_SECRET_TOKEN)
    .update(plainToken)
    .digest("hex");
  return { plainToken, encryptedToken };
}


async function getCallIdFromChannel() {
  const resp = await slack.conversations.history({ channel: SLACK_COWORKING_CHANNEL_ID, limit: 1 });
  const msg = resp?.messages?.[0];
  const block0 = msg?.blocks?.[0];
  // Slack “call” block may expose call_id directly or inside the block payload
  if (block0?.call_id) return block0.call_id;
  if (block0?.call?.v1?.id) return block0.call.v1.id;
  throw new Error("Could not determine current call_id from channel history.");
}


async function addParticipantToCall(zoomEvent) {
  const slackUser = toSlackUser(zoomEvent);
  const call_id = await getCallIdFromChannel();
  await slack.calls.participants.add({ id: call_id, users: [slackUser] });
}


async function removeParticipantFromCall(zoomEvent) {
  const slackUser = toSlackUser(zoomEvent);
  const call_id = await getCallIdFromChannel();
  await slack.calls.participants.remove({ id: call_id, users: [slackUser] });
}


function toSlackUser(zoomEvent) {
  const zoomDisplayName = zoomEvent?.payload?.object?.participant?.user_name;
  return {
    external_id: zoomDisplayName,
    display_name: zoomDisplayName,
  };
}


function isSlashCommand(event) {
  const body = parseBody(event);
  return typeof body?.command === "string" && body.command.startsWith("/");
}


function getSlashCommand(event) {
  const body = parseBody(event);
  return typeof body?.command === "string" && body.command;
}


function getSlashText(event) {
  const body = parseBody(event);
  return typeof body?.text === "string" && body.text;
}


async function getActiveParticipants() {
  const resp = await slack.conversations.history({ channel: SLACK_COWORKING_CHANNEL_ID, limit: 1 });
  return resp?.messages?.[0]?.blocks?.[0]?.call?.v1?.active_participants ?? [];
}


async function endCall() {
  const call_id = await getCallIdFromChannel();
  await slack.calls.end({ id: call_id });
}


exports.handler = async function(event) {
  if (isSlashCommand(event)) {
    const slashCommand = getSlashCommand(event);
    if (slashCommand === "/co-working-room") {
      const slashText = getSlashText(event);
      if (slashText == "end") {
        await endCall();
      }
      const call_id = await handleStartCall();
      return { statusCode: 200, body: JSON.stringify(call_id) }
    }
  }

  // Zoom webhooks
  const zoomEvent = parseBody(event);
  const zoomEventName = zoomEvent?.event;

  if (zoomEventName === "endpoint.url_validation") {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(handleValidation(zoomEvent))
    }
  }

  else if (zoomEventName === "meeting.participant_joined") {
    await addParticipantToCall(zoomEvent);
    return { statusCode: 204 };
  }

  else if (zoomEventName === "meeting.participant_left") {
    await removeParticipantFromCall(zoomEvent);
    const active = await getActiveParticipants();
    if (active.length === 0) {
      await endCall();
    }
    return { statusCode: 204 };
  }

  return {
    statusCode: 200
  };
};

