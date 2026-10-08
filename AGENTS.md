<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Standalone website checkout

This repository contains only the Morrow website. Run npm commands from the root. Desktop and backend code lives in `tanishqagg-dev/jarvis-by-skills4u`. Keep `.env*` files except `.env.example`, `.netlify`, dependencies, build output, and installers out of Git. Netlify deploys `main` to `morrow.aestrum.in`. Run `npm test`, `npm run typecheck`, and `npm run build` before publishing changes.
