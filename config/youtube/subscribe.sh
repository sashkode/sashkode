#!/bin/bash

# YouTube PubSubHubbub subscription script
# Run this to register your webhook endpoint with YouTube

set -e

# Configuration - update these values
CHANNEL_ID="${YOUTUBE_CHANNEL_ID:?'Set YOUTUBE_CHANNEL_ID environment variable'}"
CALLBACK_URL="${WEBHOOK_CALLBACK_URL:-https://your-domain.vercel.app/api/webhooks/youtube}"
HUB_URL="https://pubsubhubbub.appspot.com/subscribe"

# Load webhook secret from environment
if [ -z "$YOUTUBE_WEBHOOK_SECRET" ]; then
  echo "Warning: YOUTUBE_WEBHOOK_SECRET not set. Subscription will work but signatures won't be verified."
fi

echo "Subscribing to YouTube channel updates..."
echo "  Channel ID: $CHANNEL_ID"
echo "  Callback URL: $CALLBACK_URL"
echo ""

# Subscribe to channel feed
curl -X POST "$HUB_URL" \
  -d "hub.callback=$CALLBACK_URL" \
  -d "hub.topic=https://www.youtube.com/xml/feeds/videos.xml?channel_id=$CHANNEL_ID" \
  -d "hub.verify=async" \
  -d "hub.mode=subscribe" \
  ${YOUTUBE_WEBHOOK_SECRET:+-d "hub.secret=$YOUTUBE_WEBHOOK_SECRET"} \
  -w "\n\nHTTP Status: %{http_code}\n"

echo ""
echo "Subscription request sent!"
echo ""
echo "Next steps:"
echo "1. Check your webhook endpoint logs for the verification request"
echo "2. YouTube will send a GET request with hub.challenge parameter"
echo "3. Your endpoint must return the hub.challenge value to confirm"
echo ""
echo "Note: Subscriptions expire after ~10 days and need to be renewed."
echo "Consider setting up a cron job to run this script periodically."
