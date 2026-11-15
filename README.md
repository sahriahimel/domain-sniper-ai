# Domain Sniper AI

Next.js 14 app that researches live startup trends (Serper.dev), generates sniper domain candidates (Groq or Claude),
verifies availability (RDAP + DNS), and produces an Afternic listing pack for the top 3-4 picks.

## Run locally
1. `npm install`
2. Copy `.env.example` to `.env.local` and add keys (or add them later in the app's API keys window)
3. `npm run dev` and open http://localhost:3000

## Deploy
Push to GitHub, import the repo on vercel.com, optionally add the env vars from `.env.example`, and deploy.
