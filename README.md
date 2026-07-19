# BrResume

BrResume is an Angular-based resume builder. It lets you edit resume content in the browser, switch templates, reorder sections, and export the result as a PDF.

## Setup Instructions

1. Install dependencies: `npm install`
2. Start the app: `npm start`
3. Open `http://localhost:4200/`
4. Build for production: `npm run build`
5. Run tests: `npm test`

## AI Tools Used

- OpenCode, powered by `gpt-5.4-mini`

## Where AI Helped

- Refactoring shared resume and storage types into dedicated files
- Moving browser persistence logic into a service
- Cleaning up `app.ts` by removing duplicated auth and storage helpers
- Updating the README structure and wording

## What I Implemented Myself

- The resume builder UI and editor flow
- Template switching, theming, and section ordering behavior
- PDF export and photo upload handling
- Local persistence for users, sessions, and resume workspaces
- The final integration and verification of the refactor

## Challenges Faced

- The main component had grown large, so separating shared logic without breaking behavior took care
- LocalStorage state had to stay compatible while moving code into a service
- The build produced CommonJS warnings from PDF-related dependencies, which are noisy but non-blocking

## If I Had More Time

- Add an AI resume assistant that can generate or populate resume content from a user prompt, reducing manual data entry
- Reduce the remaining logic in `app.ts` by splitting it into smaller feature services
- Improve accessibility and keyboard navigation across the editor
- Add import/export for saved resume data
- Remove or replace the CommonJS dependencies that trigger build warnings
