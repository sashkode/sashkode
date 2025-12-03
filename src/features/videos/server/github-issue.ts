import { env } from "~/env/server";
import { Logger } from "~/platform/server/logger";
import { toKebabCase } from "~/utils/shared/kebab-case";

import type { VideoMetadata } from "./captions";

const GITHUB_GRAPHQL_ENDPOINT = "https://api.github.com/graphql";
const REPO_OWNER = "sashkode";
const REPO_NAME = "sashkode";

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

type RepositoryIdResponse = {
  repository: {
    id: string;
  };
};

type CreateIssueResponse = {
  createIssue: {
    issue: {
      id: string;
      number: number;
      url: string;
    };
  };
};

type SuggestedActorsResponse = {
  repository: {
    suggestedActors: {
      nodes: Array<{
        id?: string;
        login: string;
      }>;
    };
  };
};

type ReplaceActorsResponse = {
  replaceActorsForAssignable: {
    assignable: {
      id: string;
      assignees: {
        nodes: Array<{ login: string }>;
      };
    };
  };
};

type SearchIssuesResponse = {
  search: {
    nodes: Array<{
      id: string;
      number: number;
      url: string;
      title: string;
      state: string;
    }>;
  };
};

/**
 * Execute a GraphQL query against GitHub API
 */
async function graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch(GITHUB_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const result = (await response.json()) as GraphQLResponse<T>;

  if (result.errors && result.errors.length > 0) {
    throw new Error(`GraphQL errors: ${result.errors.map((e) => e.message).join(", ")}`);
  }

  if (!result.data) {
    throw new Error("No data returned from GraphQL query");
  }

  return result.data;
}

/**
 * Get repository ID
 */
async function getRepositoryId(): Promise<string> {
  const query = `
    query GetRepositoryId($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        id
      }
    }
  `;

  const data = await graphql<RepositoryIdResponse>(query, {
    owner: REPO_OWNER,
    name: REPO_NAME,
  });

  return data.repository.id;
}

/**
 * Find an existing issue for a video ID (idempotency check)
 */
async function findExistingIssue(videoId: string): Promise<{ id: string; url: string } | null> {
  const query = `
    query SearchIssues($searchQuery: String!) {
      search(query: $searchQuery, type: ISSUE, first: 1) {
        nodes {
          ... on Issue {
            id
            number
            url
            title
            state
          }
        }
      }
    }
  `;

  // Search for issues in this repo containing the video ID
  const searchQuery = `repo:${REPO_OWNER}/${REPO_NAME} is:issue "Video ID: ${videoId}" in:body`;

  const data = await graphql<SearchIssuesResponse>(query, {
    searchQuery,
  });

  const existingIssue = data.search.nodes[0];
  if (existingIssue) {
    return { id: existingIssue.id, url: existingIssue.url };
  }

  return null;
}

/**
 * Get Copilot agent user ID from suggested actors
 */
async function getCopilotAgentId(): Promise<string | null> {
  const query = `
    query GetSuggestedActors($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        suggestedActors(first: 100, capabilities: CAN_BE_ASSIGNED) {
          nodes {
            login
            ... on User {
              id
            }
            ... on Bot {
              id
            }
          }
        }
      }
    }
  `;

  const data = await graphql<SuggestedActorsResponse>(query, {
    owner: REPO_OWNER,
    name: REPO_NAME,
  });

  // Find the Copilot agent - search case-insensitively and require an id
  const copilotAgent = data.repository.suggestedActors.nodes.find((actor) => {
    const login = actor.login.toLowerCase();
    return actor.id && (login.includes("copilot") || login === "copilot-swe-agent");
  });

  return copilotAgent?.id ?? null;
}

/**
 * Create a GitHub issue with the MDX generation task
 */
async function createIssue(repositoryId: string, title: string, body: string): Promise<{ id: string; url: string }> {
  const mutation = `
    mutation CreateIssue($repositoryId: ID!, $title: String!, $body: String!) {
      createIssue(input: {
        repositoryId: $repositoryId
        title: $title
        body: $body
      }) {
        issue {
          id
          number
          url
        }
      }
    }
  `;

  const data = await graphql<CreateIssueResponse>(mutation, {
    repositoryId,
    title,
    body,
  });

  return {
    id: data.createIssue.issue.id,
    url: data.createIssue.issue.url,
  };
}

/**
 * Assign an issue to Copilot using replaceActorsForAssignable
 * This mutation is more reliable for triggering Copilot coding agent
 */
async function assignIssue(issueId: string, assigneeId: string): Promise<void> {
  const mutation = `
    mutation ReplaceActors($issueId: ID!, $actorIds: [ID!]!) {
      replaceActorsForAssignable(input: {
        assignableId: $issueId
        actorIds: $actorIds
      }) {
        assignable {
          ... on Issue {
            id
            assignees(first: 10) {
              nodes {
                login
              }
            }
          }
        }
      }
    }
  `;

  const data = await graphql<ReplaceActorsResponse>(mutation, {
    issueId,
    actorIds: [assigneeId],
  });

  const assignees = data.replaceActorsForAssignable.assignable.assignees.nodes;
  Logger.info(`Issue assigned to: ${assignees.map((a) => a.login).join(", ")}`, {
    scope: "GITHUB_ISSUE",
    topic: "assign",
  });
}

/**
 * Generate the issue body template for the blog article writing task
 */
function generateIssueBody(data: { videoId: string; metadata: VideoMetadata; transcript: string }): string {
  const { videoId, metadata, transcript } = data;
  const publishDate = new Date(metadata.publishedAt).toISOString().split("T")[0];
  const slug = toKebabCase(metadata.title);

  return `## 🎬 Write Blog Article for YouTube Video

**Video ID:** ${videoId}
**Title:** ${metadata.title}
**Published:** ${publishDate}
**Channel:** ${metadata.channelTitle}

### Agent Instructions

Follow the instructions in \`.github/copilot/agents/article-writer.md\` for complete guidance.

**Key principles:**
- Create **supporting material**, not a transcript — the article complements the video
- **Explore the repository** for related code, utilities, types, and configurations
- Use **GitHub permalinks** to \`trunk\` branch for code references

### Output

Create a blog article at \`content/videos/${slug}.mdx\`

#### Frontmatter (required)
\`\`\`yaml
---
title: ${metadata.title}
description: {generated-description}
author: sashkode
date: ${publishDate}
youtubeVideoId: ${videoId}
---
\`\`\`

### Repository Exploration

Before writing, search the \`sashkode/sashkode\` repository for:
- Direct implementations mentioned in the transcript
- Related utilities in \`src/utils/\` 
- Type definitions and interfaces
- Configuration files in \`config/\`
- Any code that supports the video's topic

Include relevant code even if not explicitly mentioned in the video.

### GitHub Permalinks

Link to code using the \`trunk\` branch:
\`\`\`
https://github.com/sashkode/sashkode/blob/trunk/path/to/file.ts#L10-L20
\`\`\`

### Code Block Guidelines
- Use \`// [!code ++]\` and \`// [!code --]\` for diff highlighting
- Use \`// [!code highlight]\` for emphasizing important lines
- Use \`tab="filename.tsx"\` attribute for multi-file examples
- Add \`title="path/to/file.ts"\` to code blocks

### Reference Files
- Agent instructions: \`.github/copilot/agents/article-writer.md\`
- Example article: \`content/videos/welcome.mdx\`
- MDX components: \`src/features/videos/shared/mdx-components.tsx\`

### Video Description

\`\`\`
${metadata.description}
\`\`\`

### Full Transcript

\`\`\`
${transcript}
\`\`\`
`;
}

/**
 * Create a GitHub issue for the Copilot agent to write a blog article
 * Idempotent: will return existing issue URL if one already exists for this video
 */
export async function createGitHubIssue(data: { videoId: string; metadata: VideoMetadata; transcript: string }): Promise<string> {
  const { videoId, metadata } = data;

  // Idempotency check: see if an issue already exists for this video
  const existingIssue = await findExistingIssue(videoId);
  if (existingIssue) {
    Logger.info(`Issue already exists for video ${videoId}: ${existingIssue.url}`, {
      scope: "GITHUB_ISSUE",
      topic: "idempotency",
    });
    return existingIssue.url;
  }

  // Get repository ID
  const repositoryId = await getRepositoryId();

  // Generate issue content
  const title = `📝 Write Article: ${metadata.title}`;
  const body = generateIssueBody(data);

  // Create the issue
  const issue = await createIssue(repositoryId, title, body);
  Logger.info(`Created issue: ${issue.url}`, { scope: "GITHUB_ISSUE", topic: "create" });

  // Try to assign to Copilot agent
  Logger.info("Looking for Copilot agent...", { scope: "GITHUB_ISSUE", topic: "assign" });
  const copilotAgentId = await getCopilotAgentId();
  Logger.info(`Copilot agent ID: ${copilotAgentId ?? "not found"}`, { scope: "GITHUB_ISSUE", topic: "assign" });

  if (copilotAgentId) {
    Logger.info(`Assigning issue ${issue.id} to Copilot agent ${copilotAgentId}...`, { scope: "GITHUB_ISSUE", topic: "assign" });
    await assignIssue(issue.id, copilotAgentId);
    Logger.info("Assigned issue to Copilot agent", { scope: "GITHUB_ISSUE", topic: "assign" });
  } else {
    Logger.warn("Copilot agent not found in suggested actors, issue created without assignment", {
      scope: "GITHUB_ISSUE",
      topic: "assign",
    });
  }

  return issue.url;
}
