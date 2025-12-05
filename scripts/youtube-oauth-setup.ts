/**
 * YouTube OAuth Setup Script
 *
 * This script helps you obtain a refresh token for the YouTube Data API.
 *
 * Prerequisites:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create or select a project
 * 3. Enable the "YouTube Data API v3"
 * 4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
 * 5. Choose "Web application"
 * 6. Add "http://localhost:3000/oauth/callback" to Authorized redirect URIs
 * 7. Copy the Client ID and Client Secret
 *
 * Usage:
 *   YOUTUBE_CLIENT_ID=xxx YOUTUBE_CLIENT_SECRET=xxx npx tsx scripts/youtube-oauth-setup.ts
 *
 * The script will:
 * 1. Print an authorization URL - open it in your browser
 * 2. After you authorize, you'll be redirected to localhost with a code
 * 3. Copy the code from the URL and paste it when prompted
 * 4. The script will exchange it for tokens and print the refresh token
 */

import { createServer } from "node:http";
import readline from "node:readline";
import { URL } from "node:url";

const CLIENT_ID = process.env["YOUTUBE_CLIENT_ID"];
const CLIENT_SECRET = process.env["YOUTUBE_CLIENT_SECRET"];
const REDIRECT_URI = "http://localhost:3000/oauth/callback";
const SCOPES = [
  "https://www.googleapis.com/auth/youtube.force-ssl", // Required for captions.download
  "https://www.googleapis.com/auth/youtube", // Required for videos.update and commentThreads.insert
];

if (!(CLIENT_ID && CLIENT_SECRET)) {
  console.error("Error: YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET environment variables are required");
  console.error("\nUsage:");
  console.error("  YOUTUBE_CLIENT_ID=xxx YOUTUBE_CLIENT_SECRET=xxx npx tsx scripts/youtube-oauth-setup.ts");
  process.exit(1);
}

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", SCOPES.join(" "));
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent"); // Force consent to get refresh token

console.log("\n🔐 YouTube OAuth Setup\n");
console.log("Step 1: Open this URL in your browser:\n");
console.log(`  ${authUrl.toString()}\n`);
console.log("Step 2: Authorize the application");
console.log("Step 3: You'll be redirected to localhost - copy the 'code' parameter from the URL\n");

// Start a simple server to catch the callback
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

  if (url.pathname === "/oauth/callback") {
    const code = url.searchParams.get("code");

    if (code) {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<h1>✅ Authorization successful!</h1><p>You can close this window and return to the terminal.</p>");

      // Exchange code for tokens
      console.log("\n📬 Received authorization code, exchanging for tokens...\n");

      try {
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            grant_type: "authorization_code",
          }),
        });

        const tokens = (await tokenResponse.json()) as {
          access_token?: string;
          refresh_token?: string;
          error?: string;
          error_description?: string;
        };

        if (tokens.error) {
          console.error(`❌ Error: ${tokens.error}`);
          console.error(`   ${tokens.error_description}`);
        } else if (tokens.refresh_token) {
          console.log("✅ Success! Add these to your .env file:\n");
          console.log(`YOUTUBE_CLIENT_ID=${CLIENT_ID}`);
          console.log(`YOUTUBE_CLIENT_SECRET=${CLIENT_SECRET}`);
          console.log(`YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`);
          console.log("\n");
        } else {
          console.error("❌ No refresh token received. Make sure you revoked previous access and try again.");
          console.log("   Go to https://myaccount.google.com/permissions and remove this app, then retry.");
        }
      } catch (error) {
        console.error("❌ Failed to exchange code for tokens:", error);
      }

      server.close();
      process.exit(0);
    } else {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end("<h1>❌ No code received</h1>");
    }
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(3000, () => {
  console.log("🌐 Listening on http://localhost:3000 for OAuth callback...\n");
  console.log("   (Make sure your Next.js dev server is stopped)\n");
});

// Handle manual code entry as fallback
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Or paste the authorization code here (if redirect didn't work): ", async (code) => {
  if (!code.trim()) {
    return;
  }

  console.log("\n📬 Exchanging code for tokens...\n");

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: code.trim(),
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokens = (await tokenResponse.json()) as {
      access_token?: string;
      refresh_token?: string;
      error?: string;
      error_description?: string;
    };

    if (tokens.error) {
      console.error(`❌ Error: ${tokens.error}`);
      console.error(`   ${tokens.error_description}`);
    } else if (tokens.refresh_token) {
      console.log("✅ Success! Add these to your .env file:\n");
      console.log(`YOUTUBE_CLIENT_ID=${CLIENT_ID}`);
      console.log(`YOUTUBE_CLIENT_SECRET=${CLIENT_SECRET}`);
      console.log(`YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log("\n");
    } else {
      console.error("❌ No refresh token received.");
    }
  } catch (error) {
    console.error("❌ Failed to exchange code:", error);
  }

  server.close();
  rl.close();
  process.exit(0);
});
