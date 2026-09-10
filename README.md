# Vishwajeet Patil — Professional Portfolio

A construction management and project engineering portfolio covering professional experience, academic projects, education, skills, and AI in construction.

The background follows one scroll-driven construction workflow: crane pickup, excavator loading, truck handoff and transport, unloading, and roller compaction. It includes a persistent cargo container, reversible motion, mobile framing, and a reduced-motion alternative.

## Run locally

Requires Node.js 22.13 or newer and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by the development server.

## Build

```sh
npm run build
```

The site uses React, TypeScript, and Vinext. The configured static export is generated in `dist/client`.

## Main files

- `app/page.tsx`: portfolio content and navigation
- `app/globals.css`: architectural theme and responsive layout
- `components/construction-site.tsx`: construction artwork and scroll rendering
- `components/construction-site.css`: construction scene styling
- `lib/construction-workflow.ts`: shared timeline, handoffs, material quantities, and camera
- `lib/site-motion.ts`: equipment geometry and motion helpers
- `public/`: resume, favicon, and equipment artwork

Local environment files, dependencies, generated builds, and temporary working files are excluded from version control. `.openai/hosting.json` retains the existing Sites project configuration; uploading this repository to GitHub does not itself publish the website.
