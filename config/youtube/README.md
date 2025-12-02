# YouTube Webhook Setup

This directory contains configuration for YouTube PubSubHubbub webhook integration.

## Finding Your YouTube Channel ID

1. Go to your YouTube channel page
2. Click on "About" or look at the URL
3. The channel ID is in the format `UC...` (24 characters starting with "UC")

Alternatively, use the [YouTube Channel ID Finder](https://commentpicker.com/youtube-channel-id.php).

## Setting Up the Webhook

### 1. Deploy Your Application

First, deploy your application to get your webhook URL:
```
https://your-domain.vercel.app/api/webhooks/youtube
```

### 2. Set Environment Variables

Add these to your Vercel project (or `.env.local` for local testing):

| Variable | Description |
|----------|-------------|
| `YOUTUBE_CHANNEL_ID` | Your YouTube channel ID (UC...) |
| `YOUTUBE_WEBHOOK_SECRET` | Random secret for HMAC signature verification |
| `APP_URL` | Your deployed application URL (e.g., https://your-domain.vercel.app) |
| `CRON_SECRET` | Vercel cron secret for authenticating cron job requests |

Generate random secrets:
```bash
openssl rand -hex 32
```

### 3. Initial Subscription

For the initial subscription, you can either:

**Option A: Use the Vercel Cron endpoint manually**
After deployment, trigger the cron endpoint once to set up the initial subscription.

**Option B: Use the subscription script**
```bash
export YOUTUBE_CHANNEL_ID="UC..."
export YOUTUBE_WEBHOOK_SECRET="your-secret"
export WEBHOOK_CALLBACK_URL="https://your-domain.vercel.app/api/webhooks/youtube"

./config/youtube/subscribe.sh
```

### 4. Verify the Subscription

After subscribing:
1. Check your Vercel function logs
2. YouTube will send a GET request with `hub.challenge` parameter
3. Your webhook should return this value (already implemented in the route handler)

## Subscription Renewal

**Important:** PubSubHubbub subscriptions expire after approximately 10 days.

A Vercel Cron job is configured to automatically renew the subscription daily. See `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/youtube-subscription",
      "schedule": "0 0 * * *"
    }
  ]
}
```

The cron job runs at midnight UTC every day, ensuring the subscription never expires.

## Testing

### Test with Manual Trigger

Instead of waiting for a real video, test the workflow:

```bash
# Using the API endpoint
curl -X POST "https://your-domain.vercel.app/api/videos/generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_API_KEY" \
  -d '{"videoId": "dQw4w9WgXcQ"}'
```

### Test with CLI

```bash
pnpm generate-article --video-id=dQw4w9WgXcQ
```

## Troubleshooting

### Webhook not receiving notifications

1. Verify your callback URL is publicly accessible
2. Check that the subscription was confirmed (look for hub.challenge in logs)
3. Ensure your channel has public videos
4. Note: YouTube may delay notifications by a few minutes

### Signature verification failing

1. Ensure `YOUTUBE_WEBHOOK_SECRET` matches between subscription and server
2. Check that you're using the raw request body for HMAC calculation
3. The signature header format is `sha1=<hex-digest>`

### Captions not available

YouTube auto-generates captions, but this can take time:
- Immediately after upload: captions may not exist
- The workflow includes a 10-minute retry delay
- Some videos may never have captions (music, non-speech content)

## Architecture

```
YouTube → PubSubHubbub → POST /api/webhooks/youtube
                              ↓
                        Parse Atom XML
                              ↓
                        Extract videoId
                              ↓
                        Start Workflow
                              ↓
                   videoToArticleWorkflow()
                    ├── fetchVideoMetadata()
                    ├── fetchTranscript()
                    └── createCopilotIssue()
                              ↓
                    GitHub Issue Created
                              ↓
                    Copilot Agent Writes Article
                              ↓
                    Pull Request Created
```
