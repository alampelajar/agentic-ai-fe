# Agentic AI UI refresh

This version keeps the existing Agentic AI API/business logic and refreshes the UI toward a restrained production SaaS/developer-tool aesthetic.

Key changes:
- Reduced rounded-card and glassmorphism feel.
- Removed the heavy header blur/shadow treatment.
- More restrained dark theme tokens.
- More compact sidebar/header.
- Cleaner chat message hierarchy.
- Refined composer focus state.
- Subtle borders instead of decorative effects.
- Reduced decorative icon sizing.
- Added reduced-motion support.

Primary files changed:
- `src/features/ai/index.tsx`
- `src/styles/index.css`
- `src/styles/theme.css`
- `src/components/layout/app-sidebar.tsx`
- `src/components/layout/header.tsx`

The backend/API endpoints and Agent/Model selection logic were not intentionally changed.
