import { env } from "~/env/server";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

// Cache for OAuth access token
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

/**
 * Get a valid OAuth access token, refreshing if needed
 */
async function getAccessToken(): Promise<string> {
  // Check if we have a valid cached token (with 5 min buffer)
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt - 5 * 60 * 1000) {
    return cachedAccessToken.token;
  }

  // Refresh the token
  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.YOUTUBE_CLIENT_ID,
      client_secret: env.YOUTUBE_CLIENT_SECRET,
      refresh_token: env.YOUTUBE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh OAuth token: ${error}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };

  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  console.info("OAuth access token refreshed", { scope: "YOUTUBE_API" });
  return cachedAccessToken.token;
}

export type VideoMetadata = {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  channelTitle: string;
  thumbnailUrl: string;
};

type YouTubeVideoResponse = {
  items?: Array<{
    id: string;
    snippet: {
      title: string;
      description: string;
      publishedAt: string;
      channelTitle: string;
      thumbnails: {
        maxres?: { url: string };
        high?: { url: string };
        default?: { url: string };
      };
    };
  }>;
};

/**
 * Fetch video metadata from YouTube Data API
 */
export async function getVideoMetadata(videoId: string): Promise<VideoMetadata | null> {
  const url = new URL(`${YOUTUBE_API_BASE}/videos`);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("id", videoId);
  url.searchParams.set("key", env.YOUTUBE_API_KEY);

  const response = await fetch(url.toString());

  if (!response.ok) {
    console.error(`Failed to fetch video metadata: ${response.status} ${response.statusText}`, { scope: "YOUTUBE_API" });
    return null;
  }

  const data = (await response.json()) as YouTubeVideoResponse;
  const video = data.items?.[0];

  if (!video) {
    console.error(`Video not found: ${videoId}`, { scope: "YOUTUBE_API" });
    return null;
  }

  const thumbnails = video.snippet.thumbnails;
  const thumbnailUrl = thumbnails.maxres?.url ?? thumbnails.high?.url ?? thumbnails.default?.url ?? "";

  return {
    videoId: video.id,
    title: video.snippet.title,
    description: video.snippet.description,
    publishedAt: video.snippet.publishedAt,
    channelTitle: video.snippet.channelTitle,
    thumbnailUrl,
  };
}

type CaptionListResponse = {
  items?: Array<{
    id: string;
    snippet: {
      language: string;
      trackKind: string;
      name: string;
    };
  }>;
};

/**
 * List available caption tracks for a video
 */
async function listCaptions(videoId: string): Promise<CaptionListResponse["items"]> {
  const accessToken = await getAccessToken();

  const url = new URL(`${YOUTUBE_API_BASE}/captions`);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("videoId", videoId);

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    console.error(`Failed to list captions: ${response.status} ${response.statusText}`, { scope: "YOUTUBE_API" });
    return;
  }

  const data = (await response.json()) as CaptionListResponse;
  return data.items;
}

/**
 * Download caption content by caption ID using OAuth
 */
async function downloadCaption(captionId: string): Promise<string | null> {
  const accessToken = await getAccessToken();

  const url = new URL(`${YOUTUBE_API_BASE}/captions/${captionId}`);
  url.searchParams.set("tfmt", "srt");

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    console.error(`Failed to download caption: ${response.status} ${response.statusText}`, { scope: "YOUTUBE_API" });
    return null;
  }

  return response.text();
}

/**
 * Parse SRT format transcript into plain text
 */
function parseSrt(srtContent: string): string {
  const lines = srtContent.split("\n");
  const textLines: string[] = [];
  const timingRegex = /^\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}/;
  const sequenceRegex = /^\d+$/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || sequenceRegex.test(trimmed) || timingRegex.test(trimmed)) {
      continue;
    }
    textLines.push(trimmed);
  }

  return textLines.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Fetch captions for a video using YouTube Data API with OAuth
 * Prefers English captions, falls back to auto-generated (ASR)
 */
export async function getCaptions(videoId: string): Promise<string | null> {
  try {
    const captions = await listCaptions(videoId);

    if (!captions || captions.length === 0) {
      console.info(`No captions available for video ${videoId}`, { scope: "YOUTUBE_API" });
      return null;
    }

    // Sort captions: prefer English, then standard over ASR
    const sortedCaptions = [...captions].sort((a, b) => {
      const aIsEnglish = a.snippet.language.startsWith("en") ? 0 : 1;
      const bIsEnglish = b.snippet.language.startsWith("en") ? 0 : 1;
      if (aIsEnglish !== bIsEnglish) {
        return aIsEnglish - bIsEnglish;
      }

      const aIsStandard = a.snippet.trackKind === "standard" ? 0 : 1;
      const bIsStandard = b.snippet.trackKind === "standard" ? 0 : 1;
      return aIsStandard - bIsStandard;
    });

    const bestCaption = sortedCaptions[0];
    if (!bestCaption) {
      return null;
    }

    console.info(`Using caption: ${bestCaption.snippet.language} (${bestCaption.snippet.trackKind})`, {
      scope: "YOUTUBE_API",
    });

    const srtContent = await downloadCaption(bestCaption.id);
    if (!srtContent) {
      return null;
    }

    const transcript = parseSrt(srtContent);
    console.info(`Fetched transcript for video ${videoId} (${transcript.length} chars)`, { scope: "YOUTUBE_API" });
    return transcript;
  } catch (error) {
    console.error("Failed to fetch captions", { scope: "YOUTUBE_API", error });
    return null;
  }
}
