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
