# BrResume

BrResume is an Angular-based resume builder. It lets you edit resume content in the browser, switch between multiple layouts, reorder sections, and export the finished result as a PDF.

## Features

- Multiple resume templates, including single-column and split-layout variants
- Light and dark themes
- Drag-and-drop section ordering
- Local persistence in `localStorage`
- Profile photo upload and removal
- PDF export from the rendered preview
- Basic ATS-oriented scoring and warnings

## Prerequisites

- Node.js and npm

## Install

```bash
npm install
```

## Development

Start the local dev server:

```bash
npm start
```

Open the app at `http://localhost:4200/`.

## Build

```bash
npm run build
```

## Test

```bash
npm test
```

## SSR preview

If you build the server bundle, you can run the SSR entry point with:

```bash
npm run serve:ssr:br-resume
```

## Project structure

- `src/app/` - main resume builder UI and behavior
- `src/server.ts` - SSR server entry point
- `public/` - static assets

## Notes

- Resume data is stored locally in the browser and restored on reload.
- PDF export captures the rendered preview, so the output matches the current theme and template.
