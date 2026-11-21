# AR Filter Platform

Gallery + admin + per-filter QR codes + mobile AR camera (Three.js, WebRTC, MediaRecorder). Node.js 18+, **no npm packages needed**.

## Run locally
    node server.js        # http://localhost:3000
On first run an admin password is printed in the console (and its hash saved in data/admin.json).
To choose your own: `ADMIN_PASSWORD="your-long-password" node server.js`. Admin panel: /admin

## Publish online (HTTPS is REQUIRED for the phone camera)
Any host that runs Node works: Render, Railway, Fly.io, or a VPS with Caddy/Nginx + Let's Encrypt.
1. Upload this folder (or push it to GitHub and connect the host). Start command: `node server.js`.
2. Set the environment variable `ADMIN_PASSWORD`.
3. **Attach a persistent disk/volume** mounted at `data/` and `public/uploads/` — free tiers with ephemeral disks lose uploads on restart.
4. Open https://YOUR-DOMAIN/admin, sign in, and add filters. QR codes use the domain you are visiting, so open the admin from the final public domain before downloading QRs.
Keep the same domain permanently — QR codes contain it.

## Static hosting (view-only)
`public/` also works on Netlify/Cloudflare Pages/Vercel/GitHub Pages (it reads `filters.json`; `_redirects` maps `/f/*`). The admin needs the Node server, so manage on the server, then **Export ZIP** from the admin and upload the `public/` folder.

## Filter formats
* 2D overlay: transparent PNG/WEBP. * 3D: single-file `.glb` (best) or self-contained `.gltf`; built-in animations play automatically.
* Keep models under ~10 MB for fast mobile loading.
