# Parking Zero / Park Go Recife

## Cloudflare Pages

Use Cloudflare Pages Git integration with these settings:

- Build command: `npm run build`
- Build output directory: `dist`
- Deploy command: leave empty
- Node version: `22.12.0` or newer

Do not use `npx wrangler deploy` as a deploy command for Pages. That command targets Workers
and triggers Wrangler's interactive TanStack setup. If you want to deploy manually from a local
terminal, use:

```bash
npm run deploy:cloudflare
```

Required environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
