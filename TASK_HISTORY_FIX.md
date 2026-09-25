# Task History Fix

This frontend reads Tasks directly from `GET /api/tasks` and refreshes on mount, window focus, visibility changes, and the `tasks:refresh` event.

After an AI chat finishes, the AI page dispatches `tasks:refresh`, so the Tasks page gets the latest PostgreSQL data.

Task titles are clickable and open `/ai?task=<id>` to load persisted messages from `/api/tasks/:id/messages`.

## Important
Replace the existing `fe` folder with this frontend package instead of merging selected files. Then run `npm install` and `npm run dev`.
