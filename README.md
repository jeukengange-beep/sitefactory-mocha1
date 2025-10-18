## Site-Factory

This app was created using https://getmocha.com.
Need help or want to join the community? Join our [Discord](https://discord.gg/shDEGBSe2d).

## Development workflow

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the Cloudflare Worker locally in a dedicated terminal:

   ```bash
   npx wrangler dev --local --persist-to=./.wrangler/state --port 8787
   ```

   - `--persist-to` lets you keep a local D1 database between runs.
   - Make sure your `.dev.vars` file contains the required environment variables (see below).

3. Run the Vite development server in another terminal:

   ```bash
   npm run dev
   ```

   By default Vite listens on port `5173`. To route `fetch('/api/*')` calls to the worker running on `http://127.0.0.1:8787`, add the snippet below to the `server` section of `vite.config.ts`:

   ```ts
   proxy: {
     '/api': {
       target: 'http://127.0.0.1:8787',
       changeOrigin: true,
     },
   }
   ```

## Environment variables

Create a `.dev.vars` file (used by `wrangler dev`) with the following keys:

| Variable             | Required | Description |
| -------------------- | -------- | ----------- |
| `GOOGLE_AI_API_KEY`  | Optional | Google Generative AI key used for `/api/analyze` and `/api/inspirations`. When absent the worker now falls back to deterministic content so local development continues to work. |

`DB` and `R2_BUCKET` bindings are automatically configured by Wrangler according to `wrangler.json` and need no manual setup for local development.
