# webhooks

Repo/Netlify Functions for responding to various webhooks

## `/slack-send-message-background`

A [Netlify background function](https://docs.netlify.com/functions/build-with-javascript/#background-function-format) for sending messages to Slack via the [Slack Web API](https://api.slack.com/web).

This function accepts POST requests to send specific messages in Slack. This is set up as a background function in order to prevent our slack event handlers from backing up, and to abstract the Web API connections into one service. All other functions listed below may use this to send messages to Slack.

## `/slack-events`

Handles [Slack Events](https://api.slack.com/apis/connections/events-api) for the VirtualCoffee.io Slack App.

### Subscribed events:

- `team_join` - sends a `action: 'join'` `POST` to `/slack-send-message-background` in order to welcome new members to the Slack team

## `/slack-interactivity`

Currently a stub that responds with a `200 OK` message to any request. In order for Slack buttons to not throw an error, bots need [interactivity](https://api.slack.com/messaging/interactivity#components) turned on. Currently this endpoint does nothing else.

## `/zoom-meeting-webhook-handler`

Handles webhook events from the [VC Zoom App](https://marketplace.zoom.us/develop/apps/39j9yl-tTHaU9X45f6uBGQ/information).

### Subscribed events:

- `meeting.started`: Posts a message to the Co-Working Slack channel, and saves a reference to that in airtable.
- `meeting.ended`: Looks up the airtable record for the meeting instance, and updates the Slack message to say it has ended.
- `meeting.participant_joined`: Updates the slack thread for the co-working instance.
- `meeting.participant_left`: Updates the slack thread for the co-working instance.
