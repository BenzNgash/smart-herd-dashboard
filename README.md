# Smart Herd Live Dashboard

React + Vite + Supabase live dashboard for the Smart Herd prototype.

## What it shows
- Model 1 stream freshness
- 15-minute aggregation freshness
- Render/XGBoost health
- Model 2 shadow prediction freshness
- live behavior proportions
- data quality, confidence, temperature and battery
- 24-hour behavior and Model 2 history
- herd overview

## Browser credentials
Use only the Supabase Project URL and **publishable** key (`sb_publishable_...`).
Never put the Supabase secret key in this dashboard.

## Setup
1. Run `supabase_dashboard_setup.sql` in Supabase SQL Editor.
2. Create/invite one Supabase Auth user.
3. Copy `.env.example` to `.env` and fill the URL/publishable key.
4. `npm install`
5. `npm run dev`

## Vercel
Import the GitHub repo into Vercel and add:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_RENDER_HEALTH_URL=https://smart-herd-ai-service-1.onrender.com/health`

Model 2 remains explicitly labelled SHADOW because the deployed public benchmark model is not yet field-calibrated.
