# thumb.insyd.in

The landing page for [thumb MCP](https://github.com/ishan-crd/thumb-mcp), in the look of its launch film
(made in Studio by Insyd from its `thumb-launch` template). A standalone Vite + React static site with no backend.

```bash
cd site
pnpm install
pnpm dev         # http://localhost:4330
pnpm build       # → dist/
```

**Deploy (Vercel):** a project on this repo with **Root Directory** set to `site`. Everything
else comes from `vercel.json`. Domain: `thumb.insyd.in`.

`public/film.mp4` is the launch film's preview render with the audio stripped. `public/og.png` is the hero at 1200×630.
