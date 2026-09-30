# Spoonful — OpenAI edition

Spoonful is an AI recipe-search web app. It returns a complete recipe with
ingredients, step-by-step instructions, servings scaling, unit conversion,
tick-off lists and browser bookmarks.

## AI provider

This version is configured specifically for the OpenAI API.

- Provider: OpenAI
- Default model: `gpt-5.6-luna`
- Base URL: `https://api.openai.com/v1`
- Your API key is kept on the Node server and is never exposed to the browser.

OpenAI's current model documentation lists GPT-5.6 Luna as a cost-sensitive,
high-volume model. Model availability and pricing can change, so check the
current OpenAI documentation for your account.

## Run locally

You need Node.js 20.6+ for the included `npm run dev` command.

1. Copy `.env.example` to `.env`.
2. Replace `PASTE_YOUR_OPENAI_API_KEY_HERE` with your own OpenAI API key.
3. Run:

```bash
npm run dev
```

4. Open:

```text
http://localhost:3000
```

You do **not** need to install an npm package for this version.

## Important: ChatGPT subscription vs API

This app cannot use my private ChatGPT credentials or your normal ChatGPT
subscription automatically. A website/server needs its own OpenAI API
authentication. Do not put an API key into `public/app.js` or any browser code.

## Searches

There is no per-user search quota built into the Spoonful UI. However, every
new uncached search can make an API request and your OpenAI account may charge
for API usage or enforce its own limits. The app therefore includes:

- browser-safe server-side API key handling
- per-IP burst protection
- optional daily call cap
- 24-hour server-side caching by default

Set `DAILY_CALL_CAP` to a positive number before making the site public if you
want a hard application-level spending safeguard.

## Project structure

- `server.js` — Node server and OpenAI adapter
- `public/` — Spoonful web interface
- `.env.example` — OpenAI configuration template
- `Dockerfile` — optional Docker deployment
