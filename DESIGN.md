# Design system: Agentic AI web app

Follow these rules for every screen, component and style change in this repository.
They describe how the app already looks, so new work matches it. If a request
conflicts with a rule, follow the request and point out the conflict.

## Character

Clean, calm and professional. Plenty of white space, one accent color, and hierarchy
made with size and weight instead of decoration. Function comes before ornament.

## Colors

Colors live in `src/styles/theme.css` as CSS variables, for light mode (`:root`) and
dark mode (`.dark`). Always use their Tailwind names, so both modes work automatically.

| Use | Class |
|---|---|
| Page background and text | `bg-background`, `text-foreground` |
| Cards and panels | `bg-card`, `text-card-foreground` |
| Main action | `bg-primary`, `text-primary-foreground` |
| Quiet surface and secondary text | `bg-muted`, `text-muted-foreground` |
| Hover on quiet controls | `bg-accent`, `text-accent-foreground` |
| Errors and destructive actions | `bg-destructive`, `text-destructive` |
| Borders and inputs | `border-border`, `border-input` |
| Focus ring | `ring-ring` |
| Charts | `chart-1` to `chart-5` |

- Do not use hex values, or palette colors such as `bg-blue-500`, for interface colors.
- The one exception is status, which has no token yet. Use these pairs, with both modes:
  - Success: `text-emerald-600 dark:text-emerald-400`, background `bg-emerald-500/10`
  - Warning: `text-amber-700 dark:text-amber-400`, background `bg-amber-500/10`
- Never let color carry meaning alone: add an icon or a word.

## Typography

Inter is the interface font. Do not add other fonts.

| Use | Classes |
|---|---|
| Page title | `text-2xl font-semibold tracking-tight` |
| Section title | `text-base font-semibold` |
| Body | `text-sm` |
| Helper text and metadata | `text-xs text-muted-foreground` |

## Spacing and shape

- Use the Tailwind spacing scale only, not values like `p-[13px]`.
- Page content goes in `Main` from `@/components/layout/main`.
- Common gaps: `gap-2` inside a control, `gap-4` between cards, `space-y-6` between sections.
- Radius comes from `--radius`: `rounded-md` for controls, `rounded-lg` or `rounded-xl` for cards.
- Prefer borders to shadows. Only floating things (dialogs, menus) get a shadow.

## Components

Reuse before writing anything new.

- Controls: `@/components/ui` (`Button`, `Input`, `Textarea`, `Select`, `Dialog`, `Card`, `Table`, `Badge`, and the rest).
- Confirming a destructive action: `ConfirmDialog` from `@/components/confirm-dialog`. Never `window.confirm`.
- Messages after an action: `toast` from `sonner`.
- Icons: `lucide-react`, default size `size-4`. Icon-only buttons need an `aria-label`.
- Merge class names with `cn` from `@/lib/utils`.
- Larger features go in `src/features/<name>`, with API calls in `data/api.ts`.

## States

Every screen that loads data handles all of these:

- **Loading:** a spinner with text (`Loader2`) or a skeleton.
- **Empty:** a dashed box with an icon, a short explanation and the next action.
- **Error:** a readable message with `role='alert'`, and a retry where it helps.

Buttons that start work are disabled and show progress until it finishes.

## Text

The app has two languages, English and Indonesian. All interface text goes through
`useTranslation`, with keys added to both `src/i18n/locales/en.json` and
`src/i18n/locales/id.json`. Never hardcode a label, placeholder, `aria-label` or toast.

- Both files always have the same keys, and no value is empty.
- Write the Indonesian text as Indonesian, not a copy of the English.
- Product names, URLs and example values (such as `name@example.com`) may stay as they are.

## Layout and accessibility

- Works from phone width up, with no horizontal page scroll. Start with the small layout and add `sm:`, `md:`, `lg:`.
- Check every change in both light and dark mode.
- Everything works by keyboard, with a visible focus state.
- Inputs have labels.

## Motion

Keep it short and purposeful: `transition-colors` on hover, and nothing that delays
the user. Anything larger must respect `prefers-reduced-motion`.

## Existing code

Some older screens break these rules. Do not copy them, and do not restyle them as
part of unrelated work: follow the rules in what you touch, and mention the rest.

## Automatic checks

`scripts/check-design.mjs` checks these rules, so they do not depend on anyone remembering them.

- **While Claude Code works:** a hook in `.claude/settings.json` checks every file it edits and
  reports problems straight back, so it fixes them before you see the change.
- **By hand:** `npm run design:check` checks what this branch changes compared with `main`.
  `node scripts/check-design.mjs --all` lists what older code still breaks.
- **On pull requests:** the CI workflow runs the same check and fails when new lines break a rule.

It checks hex colors, palette colors, arbitrary values like `p-[13px]`, `window.confirm` and
`alert`, text that skips `t()`, keys missing from either language file, and that both language
files have the same keys. Only new and changed lines are checked, so older screens pass until
someone touches them.

When a line must break a rule on purpose, put a comment containing `design-system-ignore` and
the reason on that line or the line above it. Spacing, wording and visual polish still need a
person to look at the result.
