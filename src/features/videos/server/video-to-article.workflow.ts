import { sleep } from "workflow";
import { start } from "workflow/api";

import { getCaptions, getVideoMetadata, type VideoMetadata } from "./captions";
import { createGitHubIssue } from "./github-issue";

// Cannot use the logger in workflow context
const Logger = console;

/**
 * Durable workflow for creating blog articles from YouTube videos
 *
 * This workflow:
 * 1. Fetches video metadata from YouTube
 * 2. Retrieves the transcript (with retry logic)
 * 3. Creates a GitHub issue assigned to Copilot agent
 */
export async function videoToArticleWorkflow(videoId: string): Promise<{ success: boolean; issueUrl: string }> {
  "use workflow";

  // Step 1: Fetch video metadata
  const metadata = await fetchVideoMetadata(videoId);
  Logger.info("Video metadata fetched", { scope: "VIDEO_WORKFLOW", videoId, title: metadata?.title });

  if (!metadata) {
    throw new Error(`Failed to fetch metadata for video ${videoId}`);
  }

  // Step 2: Fetch transcript
  let transcript = await fetchTranscript(videoId);
  Logger.info("Video transcript fetched", { scope: "VIDEO_WORKFLOW", videoId, length: transcript?.length });

  if (!transcript) {
    Logger.info("Transcript not available, retrying after delay", { scope: "VIDEO_WORKFLOW", videoId });
    // Wait and retry if captions not yet available
    // (YouTube can take time to process auto-captions)
    await sleep("2h");
    transcript = await fetchTranscript(videoId);
  }

  if (!transcript) {
    throw new Error(`Captions unavailable for video ${videoId}`);
  }

  // Step 3: Create GitHub issue assigned to Copilot
  const issueUrl = await createCopilotIssue({ videoId, metadata, transcript });
  Logger.info("GitHub issue created for video article", { scope: "VIDEO_WORKFLOW", videoId, issueUrl });

  return { success: true, issueUrl };
}

/**
 * Step function: Fetch video metadata from YouTube API
 */
async function fetchVideoMetadata(videoId: string): Promise<VideoMetadata | null> {
  "use step";

  return await getVideoMetadata(videoId);
}

/**
 * Step function: Fetch video transcript
 */
async function fetchTranscript(videoId: string): Promise<string | null> {
  "use step";

  // Use the public transcript API (no OAuth required)
  return await getCaptions(videoId);
}

/**
 * Step function: Create GitHub issue and assign to Copilot agent
 */
async function createCopilotIssue(data: { videoId: string; metadata: VideoMetadata; transcript: string }): Promise<string> {
  "use step";

  return await createGitHubIssue(data);
}

/**
 * Start the workflow execution
 * This is the entry point called by webhooks, API routes, and CLI
 */
export async function startVideoToArticleWorkflow(videoId: string): Promise<{ runId: string }> {
  const run = await start(videoToArticleWorkflow, [videoId]);
  return { runId: run.runId };
}
