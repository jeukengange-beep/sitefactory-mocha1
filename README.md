## Site-Factory

This app was created using https://getmocha.com.
Need help or want to join the community? Join our [Discord](https://discord.gg/shDEGBSe2d).

To run the Vite dev server only:
```
npm install
npm run dev
```

During development, the Vite server proxies any request starting with `/api` to the local Cloudflare Worker running on [http://localhost:8787](http://localhost:8787). This allows the React app's fetch calls (for example `fetch('/api/projects')`) to be handled by the worker without changing URLs between environments.

To start both the Vite server and the worker together, use the combined command:
```
npm run dev:full
```
This script runs `wrangler dev` and `npm run dev` in parallel. When both processes are running, any frontend fetch to `/api/...` will be routed through the Vite proxy to the worker, and you can observe the corresponding requests in the Wrangler logs.

### Running the API on Render

The Cloudflare Worker API can now run as a regular Node server backed by SQLite. To deploy it on [Render](https://render.com):

1. Create a new **Web Service** and point it at this repository.
2. Use the default **Build Command** (`npm run build`) so TypeScript checks run before the service boots.
3. Set the **Start Command** to `npm start` – this launches the Hono server with the SQLite adapter.
4. (Optional) Attach a persistent disk and expose its mount path through `DATABASE_PATH` (for example `/var/data/sitefactory.db`). Without a disk the database resets on every deploy.
5. Add any API secrets you rely on (`GOOGLE_AI_API_KEY`, etc.) as environment variables.

The server automatically applies the SQL migrations in the `migrations/` directory when it starts.

### Deployment configuration

If you deploy the React frontend separately (for example on Vercel), expose the backend origin through the `VITE_API_BASE_URL` environment variable. Set it to the fully qualified base URL of your Render service, such as `https://sitefactory-api.onrender.com`. All frontend API calls will automatically prefix this value, while the local development proxy continues to work when the variable is unset.
