declare namespace NodeJS {
  interface ProcessEnv {
    // CMS
    CMS_URL?: string;
    CMS_TOKEN?: string;

    // Slack
    SLACK_BOT_TOKEN?: string;
    SLACK_SIGNING_SECRET?: string;
    SLACK_ANNOUNCEMENTS_CHANNEL?: string;
    SLACK_EVENT_ADMIN_CHANNEL?: string;

    // Zoom
    ZOOM_WEBHOOK_SECRET_TOKEN?: string;
    ZOOM_WEBHOOK_AUTH?: string;

    // Airtable
    AIRTABLE_COWORKING_BASE?: string;

    // App
    APP_HOST?: string;
    WEBHOOKS_VERIFICATION?: string;

    // Test overrides
    TEST_SLACK_BOT_TOKEN?: string;
    TEST_SLACK_SIGNING_SECRET?: string;
    TEST_SLACK_ANNOUNCEMENTS_CHANNEL?: string;
    TEST_SLACK_EVENT_ADMIN_CHANNEL?: string;
    TEST_APP_HOST?: string;
    TEST_ZOOM_WEBHOOK_SECRET_TOKEN?: string;
    TEST_ZOOM_WEBHOOK_AUTH?: string;
  }
}
