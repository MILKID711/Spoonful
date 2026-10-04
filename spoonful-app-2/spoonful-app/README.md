# Spoonful

Recipe search powered by Google. Type a dish or ingredient and Spoonful looks it up
with Google Search, then gives you the full ingredient list and step-by-step method,
with servings scaling, metric/US units, tick-off lists and bookmarks. The recipe can be
emailed to the person who searched for it. Bookmarks are saved in each visitor's browser.

The Gemini API key lives only on your server.

## Run it

Needs Node 18 or newer. No packages to install.

```
cp .env.example .env      # then paste your Gemini key into AI_API_KEY
npm run dev               # Node 20.6+, or export the variables and run: node server.js
```

Open http://localhost:3000.

## How recipes are found (Google)

Spoonful calls Google's Gemini API with **Grounding with Google Search** switched on.
For each search, Gemini runs Google searches, reads what comes back and writes one
recipe in your app's format. Under every recipe the page shows **Found with Google**:
the pages Google used, plus Google's own search suggestions.

1. Get a key at https://aistudio.google.com/apikey and put it in `AI_API_KEY`.
2. **Google Search needs a paid-tier key** (a Google Cloud project with billing on).
   At the time of writing it is not offered on the free tier for current Gemini models.
3. `AI_MODEL` defaults to `gemini-3.5-flash-lite` (fast and cheap). `gemini-3.8-flash`
   is stronger and costs more.
4. No billing yet? Set `GOOGLE_SEARCH=0`. Gemini then answers from its own knowledge,
   works on a free key, and the Google box is hidden.

The old Claude option is gone: `AI_PROVIDER=anthropic` now stops with a message
explaining the switch. `AI_PROVIDER=openai` still works for any OpenAI-compatible
API, but it has no Google Search.

Smaller models can occasionally break the recipe format. The app shows a "Try again"
button when that happens. If it happens often, try a bigger model.

## Email the recipe to the person who searched

After a recipe appears, the visitor sees **Get this recipe by email**. They type an
address and press **Send recipe**. The email contains the recipe at the servings and
units they have on screen. Ticking **Send me every recipe I find** emails each new
recipe automatically as soon as it is ready. The address and that choice are
remembered in their browser.

Emails go out from **your own Google account** through a small Apps Script web app, so
you need no paid email service. One-time setup (a computer is easiest; on a phone,
switch the browser to "Desktop site" for script.google.com):

1. Go to https://script.google.com, create a **New project** and paste in
   `email-relay/Code.gs`.
2. Replace `PASTE-A-LONG-RANDOM-STRING-HERE` with your own long random string.
3. Choose the function `testSend` and press **Run**. Approve the permission prompt
   (Google warns about an unverified app because it is your own script; use
   Advanced, then continue). A test email arrives in your inbox.
4. **Deploy > New deployment > Web app**. Set *Execute as* to **Me** and *Who has
   access* to **Anyone**. Copy the URL that ends in `/exec`.
5. Put these in `.env` and restart Spoonful:
   ```
   EMAIL_RELAY_URL=https://script.google.com/macros/s/.../exec
   EMAIL_RELAY_SECRET=the same string you put in Code.gs
   ```
   The startup log should say `Email: on`. Opening the `/exec` URL in a browser should
   say "Spoonful email relay is running."

If you edit `Code.gs` later, use Deploy > Manage deployments > Edit > New version.
If sending fails, the server log says why (wrong secret, wrong access setting, quota).

How it is protected:

- Only recipes **this server just wrote** can be emailed. Every recipe is signed, so the
  email form cannot be used to send arbitrary text. Recipes cut short and bookmarked
  recipes are not signed, so they cannot be emailed. A signed recipe is good for 24 hours.
- Limits: `EMAIL_LIMIT_PER_HOUR` per visitor (20), `EMAIL_LIMIT_PER_ADDRESS_DAY` per
  address (20) and `EMAIL_DAILY_CAP` for the whole site (80). Google itself allows
  about 100 recipients a day on a free Gmail account and about 1,500 on Workspace, so
  raise `EMAIL_DAILY_CAP` only if you have Workspace.
- Every email says why the person received it. The server keeps no copy of any recipe or
  email; it only counts sends in memory, for the limits.
- Anyone can type any address. They can only send that address a recipe, and the limits
  above apply, but it is a reason to keep the caps modest.

## "Unlimited" and what it costs

There is no search limit for visitors in this app, but every fresh search is a Gemini
call and Google bills you for it. With Google Search on, the main cost is the searches
themselves: a few thousand a month are free, then roughly $14 per 1,000 at the time of
writing, and one recipe can run more than one search. Check
https://ai.google.dev/gemini-api/docs/pricing for current numbers. Ways to keep it
affordable:

1. **Spend limit at Google.** Set a budget alert on your Google Cloud billing account
   before you go public.
2. **`DAILY_CALL_CAP`** is a global breaker. When it is hit, visitors see a friendly
   "at capacity" message instead of your bill growing.
3. **Caching** is on by default, but it only applies when `GOOGLE_SEARCH=0`. Google's
   terms for Search grounding do not allow caching grounded results, so with Google
   Search on, every search is a fresh call.
4. **`GOOGLE_SEARCH=0`** removes the search charges entirely, and the free tier may
   cover a small site.

`RATE_LIMIT_PER_MIN` only stops one visitor from hammering the site.

## Put it online

Any host that runs Node works (Render, Railway, Fly.io, a VPS) or a Docker host
(a `Dockerfile` is included). Set the environment variables from `.env.example` in the
host's dashboard, set `TRUST_PROXY=1`, and use HTTPS (most hosts do this for you).
If you run more than one copy of the server, set the same `EMAIL_SIGNING_SECRET` on
each.

## Before you go live

- Set a spend limit at Google (see above).
- Add a privacy policy and terms of use. Searches are sent to your server and to Google
  (the Gemini API). Email addresses typed into the email box go to your server and then
  to your Apps Script; copies of the emails sit in the Sent folder of the Google account
  that runs it. Bookmarks, and the remembered address, stay in the visitor's browser.
- Read the "Grounding with Google Search" part of
  https://ai.google.dev/gemini-api/terms. Spoonful shows Google's search suggestions with
  each recipe and does not cache grounded results, as the terms ask. The terms also say
  not to modify grounded results, and Spoonful rescales servings and converts units, which
  edits the text. Check that this is acceptable for your launch, or use `GOOGLE_SEARCH=0`.
- Keep the AI notice at the bottom of the app. Recipes are AI-written and can be wrong, so
  allergen and food-safety wording matters.
- Rate limits and the cache live in memory, so a restart resets them. If you run several
  copies of the server, each has its own; a shared store such as Redis would be the next
  step.

## Files

- `server.js` the whole backend (no dependencies)
- `public/` the web app (`index.html`, `app.css`, `app.js`)
- `email-relay/Code.gs` the Google Apps Script that sends the emails
- `.env.example` every setting, explained
- `Dockerfile` optional container build
