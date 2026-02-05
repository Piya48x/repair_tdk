# Phatcha Auth Reset (Vite + React + Supabase + Tailwind)

## Setup

1. Install deps:
```bash
npm install
```

2. Create `.env` with:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=public-anon-key
```

3. Add Redirect URL in Supabase Auth settings:
   - http://localhost:5173/reset-password

4. Run dev:
```bash
npm run dev
```