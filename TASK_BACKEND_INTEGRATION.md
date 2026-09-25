# Task Backend Integration

Frontend:
- `src/features/tasks/data/api.ts` calls `/api/tasks`.
- Task list is loaded from PostgreSQL through the backend.
- Create/update/delete use the protected API.
- Agent-generated tasks are persisted through the same API.
- Access-token refresh continues through the existing `apiFetch()` helper.

Backend:
- Added `models.Task`.
- Added `handlers/tasks.go`.
- Added protected routes:
  - GET `/api/tasks`
  - POST `/api/tasks`
  - PATCH `/api/tasks/:id`
  - DELETE `/api/tasks/:id`
- Added `models.Task` to GORM AutoMigrate.

Database:
The backend uses GORM AutoMigrate, so the `tasks` table is created automatically when the server starts with a valid PostgreSQL configuration.

Run backend:
```powershell
cd backend
go mod download
go run .
```

Run frontend:
```powershell
pnpm install
pnpm dev
```

The backend test/build could not be executed in the packaging environment because Go attempted to download its toolchain and outbound network access is disabled there.
