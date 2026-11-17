# Website Builder: plan and rules

This file is the single source of truth for the Website Builder. It covers both
repositories (`agentic-ai-fe` and `agentic-ai-be`). Read it before any work on this
feature. If a request conflicts with it, follow the request, say so, and update this
file in the same change, so the plan and the code never disagree.

## 1. Goal

A person with no technical knowledge describes the website they want. The AI builds
all of it, frontend and backend, shows a working preview, and publishes it to a
public address. The person never sees code, a terminal or an error trace.

**Target user:** a layperson: a shop owner, a freelancer, a community organiser.

**In scope (first target):** describe, build, preview, revise by chat, publish to a
subdomain.

**Out of scope for now:** custom domains, payments, plans and billing, editing code
by hand, importing an existing site, visitor sign-in provided by the platform,
outbound email from a generated site. Do not build these as part of other work.

## 2. Product rules

These hold on every Builder screen, in addition to `DESIGN.md`.

1. **No technical or design words in the interface.** Never show "deploy", "build",
   "workspace", "repository", "container", "sandbox", "commit", "server", nor design
   words such as "serif", "font", "editorial", "minimalis", "industrial" or names of
   typefaces. Say "publish", "create", "website", "version". Write sentences a
   primary-school graduate understands, one idea each; buttons have at most three
   words. A test checks every `siteBuilder.*` text (`plain-words.test.ts`) and every
   look's name (`TestLooksUsePlainWords`).
2. **No technical errors on screen.** When a build fails, the agent repairs it. If it
   still fails, the person sees a plain sentence and a "Try again" button. Details go
   to the run log, which only "Advanced" shows.
3. **Two approvals only:** "Create" (after the summary) and "Publish". No approval
   per file or per command.
4. **Questions are choices, and only what is missing.** The planner asks zero to four
   questions about what the description does not say, each with buttons and
   "Lainnya" (free text). What the description already says is shown as "Yang sudah
   kami pahami", to correct rather than repeat. One question may be answered in the
   person's own words, without choices, when the site lives on personal content (how
   a couple met).
5. **The screen is chat and preview.** Files and logs sit behind "Advanced", closed
   by default.
6. **Every change can be undone.** Each finished run is a version the person can
   return to.
7. **Content is written for the person.** The AI writes real text in the person's
   language, never "lorem ipsum".
8. **Sites do not look alike.** The look of a site comes from a design direction the
   system picks and the person confirms, never from the model's defaults. See
   section 15.
9. **The website's language is the description's language**, not the interface's.
   It is shown, and can be changed, before the website is made.

## 3. User flow

| Step | What the person does | What the system does |
|---|---|---|
| 1. Describe | Writes one or two sentences | Creates a `Site` in `draft` |
| 2. Answer | Checks "what we understood", answers the questions still open (0 to 4), checks the website's language, opens the example website of a look and picks one of three, may upload a logo and photos | Planner reads the description (language, facts, contact details, wished colours); the system offers three looks that fit the kind of site and the wished colours |
| 3. Confirm | Reads a summary ("4 pages: Home, Services, Gallery, Contact") and presses Create | Stores the brief, queues an `AgentRun` |
| 4. Wait | Watches simple progress ("Writing the Services page...") | Agent worker writes files, builds, tests, repairs |
| 5. Preview | Sees the site first, at full width, with one sentence of what to do next; switches between phone and computer width | Site runner starts the preview |
| 6. Revise | Types a change, or clicks a part of the preview and says what to change | A new `AgentRun` on the same site; a new version when it finishes |
| 7. Publish | Presses Publish and confirms the address | A release is made and served at `<name>.<SITES_DOMAIN>` |
| 8. Later | Revises and publishes again, or returns to an older version | Previous releases are kept |

## 4. Fixed decisions

Change one only by editing this table first, with the reason.

| Topic | Decision | Reason |
|---|---|---|
| Generated stack | One template: React 19 + Vite 8 + Tailwind 4 (frontend), Node 24 with Hono (backend), SQLite (data) | One language and one image give consistent results |
| Shape of a site | One Node process that serves the built frontend and `/api/*`, on one port, with one data file | Simple to preview, publish, limit and move |
| Dependencies | Pinned in `deploy/site-image/package-lock.json` and installed in the site image (`agentic-site-node:1`) when the host builds it. Sites have no `node_modules` and no install job. The agent may not add or upgrade packages | Removes the largest source of broken builds and supply-chain risk, and builds need no network |
| Database driver | Node's built-in `node:sqlite` | The install job cannot build native add-ons |
| Visual design | The system picks from a curated library of design directions and writes it into the site as tokens. The model does not choose fonts, colours or page composition | Left alone, a model gives every site the same look |
| Colours a person asks for | Each look has its own palette and two curated variants (36 palettes, all checked for contrast by `TestPalettesAreReadable`). Colour words in the description or the planner's `look_wish` (`ColourTags`) rank looks and pick the matching variant | A wish ("tema kebun hijau") is honoured without letting the model invent colours |
| Languages | `Site.language` is the website's, detected from the description by the planner, with a word count (`DetectLanguage`) as fallback; `Site.ui_language` is the builder's (questions, progress, messages) | An Indonesian description in an English interface made an English site |
| Seeing a look first | One example website per look, made once by the normal pipeline (`cmd/builder-samples`), served as static files at `contoh-<look>.<PREVIEW_DOMAIN>`; its screenshot is the card's picture (`scripts/capture-looks.mjs`) | A look cannot be judged from three colour dots |
| Finished pieces (kit) | `web/src/kit/` in the template: Guestbook, Countdown, Timeline, AddToCalendar, MapLink, Ornament, Monogram, FramedPhoto, PhotoGallery, styled only by the theme's tokens. Written again into every site at every run (`RefreshFixedFiles`); the agent may use them, never change them | Raises the floor of every site, and an invitation looks like one without the model inventing widgets |
| Guest book | A form marked `guestbook` in the brief shows only its fields `name` and `message` through `GET /api/forms/<name>/public`; every other answer stays private. `server/routes/forms.js` is fixed by the template | Wishes on an invitation are public by nature; attendance and phone numbers are not |
| Continuing a stopped run | A progress record per site (`<site>/progress.json`, keyed by the brief, look and request) lists the finished parts; the same work started again skips them. Cleared when the run succeeds or a version is restored | A model error late in a run cost the whole run |
| Moods and kinds | Each look has hand-written mood words (`MoodTags`) and `fits`; for a known kind, looks made for other kinds are offered only when fewer than three fit (`relatedKinds` counts as fitting) | A wedding was offered a workshop look and a shop look |
| Fonts | A fixed set of font families ships inside the template | The agent cannot add packages, and sites must not depend on an outside font service |
| Choice of AI model | Automatic, ranked like the chat's Auto (coding steps rank for coding, questions and summaries for speed) over the system models and the person's own; combo models are skipped. The person never picks a model, and the Builder shows no model choice | A layperson cannot judge models; choosing one would only confuse |
| Where the agent loop runs | On the server, in an agent worker (`cmd/agent-worker`) | A run continues when the tab is closed |
| Agent protocol | The worker runs fixed steps (layout, each page, check, repair, review) and the model answers with complete files in `<file path="...">` blocks. No native tool calling | Works with every model the router serves, including free ones without tool calling; each step is small enough for short context windows |
| Build check | One sandbox job, `site-build`: type check, build, render every page once, bundle the server, start it and call it. Errors name the file and line | Catches what breaks a page before the person sees it, and gives the repair step precise errors |
| Approval model | Per plan and per publish (rule 3). Inside its own site the agent writes and builds freely | Per-file approval cannot work for a whole site |
| Preview | The built site of the current version running in a container, replaced after each run. No hot reload | Preview and published site behave the same |
| Preview access | The signature is in the host name: `p-<site>-<expiry>-<signature>.<PREVIEW_DOMAIN>`, valid 2 hours, checked by the gateway | Every request of the page carries it without a cookie, so it works inside the builder's frame |
| Outbound network from a site | None | Stops spam, scanning and data theft from generated code |
| Addresses | Published: `<name>.<SITES_DOMAIN>`. Preview: the signed name above. Development: `*.sites.localhost` and `*.preview.localhost` on port 8090, which browsers resolve to this computer. Previews, examples and published sites may share one domain (`p-...` and `contoh-...` names are never given to a site), because a free wildcard certificate covers one level of names only | Wildcard DNS and TLS, nothing to set up per site |
| Domains | Both come from configuration. One domain is acceptable in development; before strangers can publish, sites move to a domain separate from the app | Reputation and cookie isolation |
| Product name in code | `Site` (model, routes, feature folder `sites`) | One word everywhere |

## 5. Architecture

```
Browser (Builder: chat | preview)
   |  REST + SSE
   v
API server (Gin) ---- PostgreSQL (sites, runs, steps, releases)
   |  queues AgentRun                     never runs site code
   v
Agent worker  (cmd/agent-worker)
   |  model calls: system and own models, ranked like Auto, waits out rate limits
   |  writes files into the site's workspace, queues "site-build" jobs
   v
Workspace storage + execution worker (Phase 6, plus the site-build job)

Site runner  (cmd/site-runner)
   |  reconciles containers with the database every 3 seconds
   |  one container per preview and per published site, each on its own internal network
   v
Gateway container (deploy/site-image/tools/gateway.mjs, port 8090)
   |  host name -> container; checks preview signatures
   v
Caddy in production (wildcard TLS) in front of the gateway
```

| Part | State | Notes |
|---|---|---|
| Workspace storage, file API, change list | Exists | A `Site` owns one workspace |
| Execution worker, Docker executor, job allowlist | Exists | Add job types for the template (build, test) |
| Model router, combos, skills, memory, agent roles | Exists | Reused by the agent worker |
| Tool Registry | Exists | Not used by the Builder: the worker writes files itself, inside the allowlist of section 6, so there is no per-call approval to skip |
| `AgentRun`, `AgentRunStep`, agent worker | New | Same claiming pattern as the execution worker (`FOR UPDATE SKIP LOCKED`) |
| Site template | New | Lives in the backend repository, copied into a new workspace |
| Site runner and proxy | New | Separate binary, the only part besides the execution worker that talks to Docker |
| Builder screens | New | `src/features/sites`, routes under `/sites` |
| Design Studio | Removed 2026-11-16 | The person only describes the website (section 20) |
| Landing page generator | Exists | Not extended and not yet removed |

## 6. Generated site template

```
site/
  web/index.html          Written by the worker (language, name, description)
  web/src/theme.css       Design tokens of the chosen direction. Written by the worker
  web/src/site.ts         The facts from the brief (name, pages, contact, pictures). Written by the worker
  web/src/routes.tsx      One route per page of the brief. Written by the worker
  web/src/main.tsx, App.tsx, router.tsx, components/SiteForm.tsx   Fixed by the template
  web/src/kit/            Finished pieces (Guestbook, Countdown, Timeline...). Fixed by the template
  web/src/components/     Layout.tsx and shared pieces. Written by the agent
  web/src/pages/          One file per page. Written by the agent
  web/public/uploads/     The person's logo and photos
  server/index.js, db.js  Fixed: static files, /api/health, opens DATA_DIR/site.db
  server/routes/          index.js registers routes; forms.js (fixed) stores answers and lists guest books. The agent may add files
  server/schema.sql       Tables, CREATE TABLE IF NOT EXISTS. The agent may add tables
  site.json               The brief and the direction in machine form. Written by the worker
```

Rules the agent follows (they go in the agent's system prompt, and the worker
enforces the ones marked *enforced*):

- Write only `web/src/pages/*`, `web/src/components/*`, `web/src/sections/*`,
  `server/routes/*` (one level, `.tsx`, `.ts` or `.js`) and `server/schema.sql`.
  Everything the worker writes or the template fixes is refused. *Enforced*
  (`CheckAgentPath`, tested).
- Colours, fonts, radius and spacing come from the tokens in `theme.css` only. No hex
  values, no `font-family` and no palette classes in pages or sections. *Enforced.*
- Compose each page following the direction's composition (described in words for
  each direction, see section 15), with the sections in the order the brief gives.
- No secrets, tokens or personal data in the code. No calls to outside services.
- Every page works at phone width and has real text in the site's language.
- Every form validates its input on the server.
- The site passes `build` and the template's smoke test before a run may finish. *Enforced.*

## 7. Agent run

1. The API creates an `AgentRun` (`queued`) with the brief or the revision request.
2. The agent worker claims it and works through fixed steps, each stored as an
   `AgentRunStep` and streamed to the browser over SSE: write the generated files
   (theme, site facts, routes), then the layout, then each page (create), or one
   change across the files (revise). A revise answer may also carry a new page list
   (`<pages>`), from which the worker writes the routes again.
3. A plain-text check finds what breaks the design rules (hex colours, palette
   classes, fonts in code, gradients, pictures from the internet) and asks for a fix.
   Then the worker always runs the `site-build` job. On failure its output goes back
   to the model with the files it names, for repair.
4. Once the build passes, the Review agent reads the pages against the design
   direction and the "never" list in section 15 and returns concrete fixes. The
   Coding agent applies them, and the build runs again.
5. On success the worker copies the source and the built output into a version
   directory and makes it the current version; the site runner replaces the preview.
   When a review fix breaks the site and cannot be repaired, the files from before
   that review round are put back and the reviewed version is kept. When the review
   cannot reach a model or runs out of time, the checked website is saved without it.
6. A run that stops keeps its finished parts in the progress record; "Lanjutkan"
   starts the same work again and skips them. A run that stops before writing
   anything puts the workspace back to the current version.

**Limits, enforced by the worker:** at most 60 model calls per run, 5 repair
attempts, 2 review rounds, 20 minutes per run, one active run per site, two per
person, and the existing per-user job limits. A rate-limited model is asked again
after the wait it names (up to 60 seconds, 4 times) before the next model is tried;
model calls count toward the daily system-model quota like chat calls. When every model
fails, the worker waits and asks again for up to 3 minutes ("Menunggu AI siap..."). A run that hits a limit ends as `failed` with a plain message, and the site
stays on its last good version.

**Roles:** Planning writes the brief, Coding writes the site, Debugging repairs
failed builds, Review checks the design. Use the existing agent roles; do not add new ones in the first target.

**Progress text:** each step carries a short human sentence (`summary`) in the
person's language. The interface shows only that sentence, never the tool name.

## 8. Data model (new tables)

| Model | Main fields |
|---|---|
| `Site` | `user_id`, `workspace_id`, `name`, `slug` (unique, the subdomain), `status` (`draft`, `building`, `ready`, `published`, `failed`), `brief` (JSON), `design_direction` (the direction's key), `language`, `published_release_id` |
| `AgentRun` | `site_id`, `user_id`, `kind` (`create`, `revise`), `request`, `status` (`queued`, `running`, `completed`, `failed`, `cancelled`), `error_message`, `started_at`, `finished_at` |
| `AgentRunStep` | `agent_run_id`, `index`, `kind` (`model`, `tool`, `build`, `test`), `summary`, `detail` (redacted, bounded), `status` |
| `SiteVersion` | `site_id`, `agent_run_id`, `number`, `summary` |
| `SiteRelease` | `site_id`, `site_version_id`, `number`, `status` (`live`, `superseded`), `published_at` |

`Site` also keeps the questions, answers and uploaded pictures (JSON), the current
version and the time the preview was last asked for. `ExecutionJob.AgentRunID` is
filled for site builds; its foreign key is not added yet. File content never goes
into PostgreSQL.

## 9. API (new routes, all under `/api`, all signed-in and owner-checked)

| Method and path | Purpose |
|---|---|
| `GET/POST /sites` | List; create from a description |
| `GET/PATCH/DELETE /sites/:id` | Read, rename, delete (stops its containers) |
| `POST /sites/:id/questions` | Returns the clarifying questions for the description and three design directions to choose from |
| `POST /sites/:id/brief` | Stores the answers, returns the summary |
| `POST /sites/:id/runs` | Starts a create or revise run |
| `GET /sites/:id/runs/:runId/events` | SSE stream of steps |
| `POST /sites/:id/runs/:runId/cancel` | Stops a run |
| `GET /sites/:id/versions`, `POST /sites/:id/versions/:n/restore` | List versions, go back to one |
| `POST/DELETE /sites/:id/images` | Upload a photo or the logo (PNG, JPG, WEBP, 3 MB, 8 at most); forget one |
| `GET /sites/:id/preview` | A fresh signed preview address; keeps the preview running |
| `POST /sites/:id/publish`, `POST /sites/:id/unpublish` | Publish the current version at an address; take it offline |
| `GET /sites/slug-available?slug=&site_id=` | Checks an address before publishing |

Versions come with `GET /sites/:id`. Errors carry a `code` that the interface
translates (`siteBuilder.errors.<code>`).

Frontend calls live in `src/features/sites/data/api.ts`.

## 10. Preview and publishing

- **Preview:** after a successful run the site runner starts a container from the
  approved Node image with the site's built output mounted read-only and a preview
  data directory mounted read-write, running one fixed command. Previews stop after
  30 minutes without a request and start again on the next one.
- **Publish:** a release points at a version; a version directory is never changed
  after it is written, so it is served as it is. The runner starts the live container
  from it with the site's live data directory and the gateway maps the address to it.
  Publishing again replaces the live container. Preview data and live data are
  separate and never copied over each other.
- **Going back:** restoring a version changes the workspace and the preview only. The
  published site changes only when the person publishes again.
- **Slugs:** lower-case letters, digits and hyphens, 3 to 40 characters. Reserved
  names (`app`, `api`, `www`, `admin`, `mail`, `preview` and similar), and names that
  start with `p-` or `contoh-` (previews and examples), are refused.
- **DNS and TLS:** one wildcard record and one wildcard certificate per domain,
  handled by Caddy. Nothing is created per site.

## 11. Security rules

These are not negotiable and each needs a test.

1. The API server never runs site code. Only the execution worker and the site
   runner start containers.
2. Site containers keep every Phase 6 restriction: non-root, read-only root
   filesystem, all capabilities dropped, `no-new-privileges`, memory, CPU and PID
   limits, no Docker socket, none of the server's environment.
3. Site containers accept connections from the proxy only and have no outbound
   network.
4. Preview and published sites are served from a different origin than the app. The
   app's session cookies are host-only and never sent to a site.
5. A person can reach only their own sites, runs, versions and previews. A preview
   address alone does not grant access; it needs a short-lived signed token.
6. Model output is untrusted. Paths from the model go through the workspace path
   checks, and the write allowlist in section 6 is enforced by the worker, not by
   the prompt.
7. `CLOUD_EXECUTION_ENABLED` and `ALLOW_PUBLIC_CODE_EXECUTION` keep their meaning.
   The Builder does not work around them. Opening it to strangers still requires the
   "Before public code execution" list in `docs/phase7-public-readiness.md`.
8. Published sites are public content. Keep the owner, time and release of every
   publish in the audit log, and give admins a way to take a site offline.

## 12. Stages

Work in order. A stage is done only when its exit check passes. Tick the box here in
the change that finishes it.

- [x] **Stage 1: Agent on the server.** `AgentRun`, `AgentRunStep`, the agent
  worker, the SSE stream. (No Tool Registry build mode: see section 5.)
  *Done 2026-11-16:* runs started through the API finish with no browser open; one run
  per site and cancelling a queued run are tested (`TestSitesOwnershipAndFlow`).
  Cancelling a running run was not exercised end to end.
  *Exit check:* a run started through the API writes files into a workspace and
  finishes with the browser closed; limits and cancel are tested.
- [ ] **Stage 2: Template and build.** The site template, the build and smoke-test
  job types, the write allowlist, the repair loop, versions, the first twelve design
  directions with their tokens and section variants, the review step.
  *Exit check:* from a one-sentence description the worker produces a site that
  builds and passes the smoke test, with no dependency install beyond the template's;
  the same description built with two different directions gives two sites that
  differ in fonts, colours and page composition.
  *Done 2026-11-16, partly:* all twelve directions build in the sandbox, and two real
  sites (a workshop in "Bold industrial", a bakery in "Warm editorial") were made,
  repaired, reviewed and saved as versions. The same description with two directions
  was not compared yet.
- [x] **Stage 3: Builder screens.** Describe, questions, the choice of look, summary, progress, chat
  revision, version list, in both languages.
  *Exit check:* a person can go from description to a finished run without seeing a
  technical word; `npm run design:check` passes.
  *Done 2026-11-16:* walked through in Indonesian in the browser, light and dark, at
  phone width; technical details only behind "Tampilkan detail teknis".
- [x] **Stage 4: Preview.** Site runner, proxy, preview token, idle stop, the preview
  pane with phone and desktop width.
  *Exit check:* the preview shows the site with a working form that stores data; a
  site cannot reach the internet or another site (tested).
  *Done 2026-11-16:* form answers are stored; from inside a site container the
  internet, the host and the other site's container are unreachable, the filesystem
  is read-only and no secret is visible. These were checked by hand on Docker Desktop,
  not yet as automated tests. The 30-minute idle stop was not observed.
- [ ] **Stage 5: Publish.** Slugs, releases, wildcard domain, publish again, restore.
  *Exit check:* a published site answers on its subdomain over HTTPS on staging,
  survives a restart of the runner, and an older version can be published again.
  *Works locally (2026-11-16):* two sites published at `*.sites.localhost:8090` and
  kept running through a runner restart. Not done: HTTPS on staging, and publishing an
  older version again after a restore was not exercised.
  *Real domain (2026-11-16):* the three published sites answer at
  `https://<name>.accpewe.my.id` through Cloudflare Tunnel from the development
  computer, with a valid certificate; unknown and reserved names get the gateway's
  "no website" page, and the builder links to the HTTPS address. Previews
  (`https://p-<site>-<signed>.accpewe.my.id`) and the looks' examples
  (`https://contoh-<look>.accpewe.my.id`) moved to the same domain; a forged preview
  name is refused. This is a test from one computer, not a staging server.

## 13. Open questions

Answer these in the stage noted, then move the answer into section 4.

- Answered: the worker uses `<file>` blocks, not native tool calling (section 4,
  "Agent protocol").
- Answered: dependencies are baked into the site image, so there is no install job;
  `node:sqlite` works on Node 24 without a flag (section 4).
- Stage 4: how many sites can one host keep running within its memory? Sets the
  per-user site limit and the idle-stop time for published sites.

## 14. Working rules

- One stage per branch and pull request, named `feat/builder-<stage>` in each
  repository. Backend first when a stage needs both. (The first version of all five
  stages was built on one branch, `feat/website-builder`, in each repository, because
  it was asked for as one testable feature.)
- Frontend work follows `DESIGN.md` and section 2 here. Backend work follows the
  patterns of Phase 6: an interface for anything that touches Docker or storage,
  integration tests beside the handlers, limits as named constants.
- Every new route has an ownership test. Every rule in section 11 has a test.
- Architecture detail that outgrows this file goes to
  `agentic-ai-be/docs/website-builder-<topic>.md`, linked from here. This file stays
  the summary and the list of decisions.
- Do not start a later stage, or anything in "Out of scope", without being asked.

## 15. Design variety

A model asked for a website without direction returns the same one every time: the
same font, a purple gradient on white, a centred hero, large rounded corners.
Forbidding one default only moves it to the next most common choice. So variety is
the system's job, and the model's job is to carry out a direction well.

### Design directions

A direction is one complete, curated look, stored as data in the backend repository
beside the template. Each has:

| Field | Content |
|---|---|
| `key`, `name`, `description` | Identity, with the name and description in both languages |
| `fits` | Kinds of site it suits (food, workshop, portfolio, event, community, shop and so on) |
| `fonts` | A heading and a body family from the template's font set |
| `palette` | Background, surface, text, muted, primary and accent colours, checked for contrast |
| `shape` | Radius, border weight, shadow or none, spacing density |
| `composition` | Which section variants to use (which hero, which gallery, which contact block) and the page rhythm |
| `voice` | Tone for the written text (warm, formal, playful) |
| `tags`, `variants` | The colours of the palette, and two curated other palettes with their own tags |
| `moods`, `kit` | Everyday words for the feeling of the look, and which finished pieces it uses and how |
| `preview` | The example website and its screenshot, made once (section 4, "Seeing a look first") |

Rules:

- **The system chooses, the person confirms.** From the description and answers the
  system picks three directions whose `fits` match, and shows them as pictures with a
  plain name. The person picks one. No design vocabulary is asked of them.
- **No repeats in a row.** A direction used for a person's last site is not offered
  first for their next one. Among directions that fit equally, the choice is random.
- **The direction is applied as tokens.** The worker writes `theme.css` and the
  `composition` into `site.json` before the Coding agent starts. The agent builds
  with them and cannot change them (section 6).
- **Changing the look later** means choosing another direction, which is a revise run
  that rewrites the tokens and recomposes the pages. Small requests ("make it more
  cheerful") adjust the palette within the direction.
- **The person's own material comes first.** An uploaded logo and photos are used
  before any stock or placeholder picture, and the text names the real business, its
  place and its services. Specific content does more for a distinct site than style.
- **The library is curated by people.** New directions are added by hand, each with
  its preview picture and a built sample. Started with twelve; two looks for
  celebrations ("Romantis dan lembut", "Meriah dan hangat") were added in round 2.
  Quality matters more than number.

### Never, unless the direction says so

The Coding agent's prompt carries this list, and the Review step checks it:

- A gradient as the main background, or gradient buttons.
- Every section centred, or the same card grid repeated down the page.
- Emoji in headings or as icons.
- Vague hero text that could belong to any business ("Welcome to our website").
- Heavy shadows on everything, or corners rounder than the direction's `shape`.
- Animation scattered over the page. One purposeful moment at most, and it respects
  `prefers-reduced-motion`.
- Placeholder text or pictures left in a finished site.

### Review step

The Review agent gets the brief, the direction and the page source, and answers with
a short list of concrete fixes or "pass". It checks the list above, that the
composition was followed, that the text has the direction's voice, and that each page
reads well at phone width. The token rule (no hex values, no `font-family`, no
palette classes) is checked by the worker with a plain text search, not left to the
model. Judging a screenshot of the rendered page is out of scope for the first
target.

## 16. Running it on this computer

Five processes, all from the backend folder, with Docker Desktop running:

```
docker build -t agentic-site-node:1 deploy/site-image      # once, and after changing deploy/site-image
CLOUD_EXECUTION_ENABLED=true go run .                      # API server, port 8080
CLOUD_EXECUTION_ENABLED=true go run ./cmd/execution-worker # builds and checks sites in the sandbox
go run ./cmd/agent-worker                                  # writes the sites with the AI models
go run ./cmd/site-runner                                   # previews and published sites, gateway on 8090
```

and the frontend with `npm run dev`. Open "Pembuat Website" in the sidebar.

The example website of every look is made once, with the workers running:

```
go run ./cmd/builder-samples -create     # queues one site per look (about an hour on Groq's free tier)
go run ./cmd/builder-samples -collect    # copies the finished ones to SITE_DATA_ROOT/_samples
node scripts/capture-looks.mjs           # in the frontend: the card pictures, public/looks/<look>.jpg
```

- Previews open at `http://p-<site>-<signed>.preview.localhost:8090/`, published sites
  at `http://<name>.sites.localhost:8090/`. Chrome, Edge and Firefox send every
  `*.localhost` name to this computer, so no DNS or hosts file is needed.
- To serve the made websites (previews, examples and published sites) under a real
  domain from this computer (Cloudflare Tunnel, HTTPS), follow
  `agentic-ai-be/docs/website-builder-real-domain.md`. In use now: `thismy.web.id` (before 2026-11-17: `accpewe.my.id`).
  Published addresses may also use their own scheme and port while previews stay
  local (`SITES_PUBLIC_SCHEME`, `SITES_PUBLIC_PORT`).
- Only one agent worker per database (`BUILDER_MULTIPLE_WORKERS` unset): on start it
  fails the runs a stopped worker left running.
- How fast a site is made depends on the models. With the free tier of Groq
  (8,000 tokens a minute) a four-page site takes about 10 to 15 minutes, because the
  worker waits out the rate limit between pages. A model with higher limits makes it
  a few minutes.
- What runs where: the site's code runs only in containers started by the execution
  worker (checks) and the site runner (previews and published sites), never in the
  API server or the agent worker.

## 17. Not done yet

Known gaps of the first version, in rough order of importance:

- Clicking a part of the preview to say what to change (flow step 6) is not built;
  changes are asked for in the text box.
- The owner cannot read the form answers a site stores yet (they are in the site's
  SQLite file), and there is no e-mail notice for them.
- Admins have no screen to take a published site offline (rule 8); the owner can.
- The review reads code, not screenshots.
- `ExecutionJob.AgentRunID` has no foreign key yet.
- Only tested on Docker Desktop for Windows. A Linux host needs the data folders
  writable by the containers' user (65534), and opening the Builder to strangers
  still needs the isolation and quota work in `docs/phase7-public-readiness.md`.

## 18. Revision round 1 (from the owner's first test on 2026-11-16)

Built on 2026-11-16; sections 2, 3, 4, 15 and 16 describe the result. What differs
from this plan, and what was checked, is noted under each item.

### R1. The website's language follows the description, not the interface

*Found:* site 3 was described in Indonesian and written in English. The frontend sends
the interface language (`i18n.language`) as the site's language, so a person whose
interface is in English always gets an English site.

- The planner detects the language of the description in the questions step
  (`"language": "id" | "en"` in its JSON answer); a word-list check is the fallback
  when the model gives none. The interface language is no longer used for this.
- The summary step shows it ("Bahasa website: Indonesia") with a way to change it
  before Create.
- Two languages are kept apart on `Site`: `language` (the website's text) and
  `ui_language` (questions, progress sentences, error messages: the language the
  person reads the builder in).
- The plain-text check gains a language check on pages (a page of an Indonesian site
  that is mostly common English words is sent back for repair), and the review
  prompt names the language first.
- *Check:* with the interface in English, an Indonesian description gives Indonesian
  questions' answers, an Indonesian site, and English progress text. Tested with a
  fake model in `TestSitesOwnershipAndFlow` and once for real.
- *Done:* the language choice sits in "Tentang usaha Anda" and the summary shows it.
  Real check: an Indonesian invitation described with the interface in English got
  English questions, an Indonesian brief and an English summary.

### R2. See the look before choosing it

*Found:* the look is chosen from small colour cards, and "Change look" is chosen blind:
the person cannot tell how their website will look until a run has finished. Also,
site 3 asked for a "green garden" theme in its description and got ivory and gold,
because a wish about the look in the description is ignored.

- **A real example per look.** Each of the twelve directions gets one sample website,
  built once by the same pipeline and stored with the template. The card shows a
  screenshot of it (prepared by hand, as section 15 already requires), and "Lihat
  contoh" opens the live sample in a large frame, at computer and phone width.
- **The same in "Change look".** The dialog shows the screenshots and the live samples,
  and says plainly that the current version is kept and can be returned to.
- **Wishes about the look are honoured.** The planner extracts a `look_wish` from the
  description and answers (colours, mood). Directions are ranked by it as well as by
  the kind of site, and each direction gets two or three curated palette variants
  (for example a green one) the system may choose. The model still never invents
  colours.
- **Preview first after the run.** When the first run finishes, the screen opens on the
  preview at full width with one sentence ("Ini website Anda. Periksa dulu, lalu
  terbitkan atau minta perubahan."); the change box and the buttons come second. The
  publish dialog names the version being published and links back to the preview.
- *Check:* a person can open a live example of every look before Create and before
  "Change look"; a description that names a colour gets a direction or variant with
  that colour among the three offered.
- *To confirm with the owner:* whether the preview pane itself failed to show during
  the test (that would be a bug to fix first, not this item).
- *Done:* variants, colour wishes, example dialog in the wizard and in "Change look",
  preview first with "Ini website Anda", the version named in the publish dialog. The
  examples are made by the pipeline; a card shows a drawing in the look's colours until
  its example exists.

### R3. Plain language everywhere

*Found:* several texts use design or technical words a layperson does not know.

- Rules, added to section 2: a sentence a primary-school graduate understands; no
  design words ("serif", "editorial", "minimalis", "industrial", "font", names of
  typefaces); buttons of at most three words; one idea per sentence.
- Looks get everyday names and descriptions ("Hangat dan klasik" instead of
  "Editorial hangat"; "judul besar bergaya majalah" without "serif"); the line that
  names the typefaces is removed from the cards.
- Labels to rewrite, both languages: "Pratinjau" -> "Lihat website", "Versi" ->
  "Riwayat perubahan", "Kerjakan perubahan" -> "Ubah", "Data usaha" -> "Tentang usaha
  Anda", "Perbarui versi terbit" -> "Terbitkan perubahan", "Lebar komputer / ponsel"
  -> "Tampilan komputer / HP", "Tampilkan detail teknis" stays but moves out of the
  first build screen into a small link. The full list is made by reading every
  `siteBuilder.*` text once.
- The questions prompt gets limits: a question of at most 12 words, an option of at
  most 4 words, no word from the banned list above.
- *Check:* a banned-word test over `siteBuilder.*` in both language files and over the
  directions' names and descriptions; the owner reads the screens once and marks what
  is still hard.
- *Done:* both tests exist and pass; the owner's reading is still to come.

### R4. Questions that adapt, like Emergent's

*Background:* Emergent's agent also asks clarifying questions before it builds, in the
chat, and mainly when the prompt leaves something unclear; it has a "talk it through"
plan mode in which the person approves a plan first. Our builder always asks up to
four multiple-choice questions.

- The planner asks only what the description does not already answer: zero to four
  questions. A detailed description goes straight to "Tentang usaha Anda".
- What the description already states (name, date, place, theme, pages) is filled in
  and shown as "Yang sudah kami pahami", so the person corrects instead of repeating.
- Every question keeps choices plus "Lainnya" with free text (rule 4 is unchanged).
- *Check:* a detailed description gets fewer questions than a one-line one, and none
  that repeats a fact from the description (tested with a fake model for the flow,
  judged by hand for real models).
- *Done, with one change:* a description with nothing left to ask does not skip the
  first step; it shows "Yang sudah kami pahami" and "Cerita Anda sudah cukup jelas",
  so the person still sees what was understood. Contact details found in the
  description are filled in on "Tentang usaha Anda".

**Order:** R1 (small, a real bug), R3 (texts only), R4 (prompt and wizard), R2 (the
largest: twelve sample sites, variants, new screens).

## 19. Revision round 2 (from the owner's tests on 2026-11-16)

Built on 2026-11-16; sections 2, 4, 6, 7 and 15 describe the result. Checked for real
with site 20 (the same wedding description, interface in English, the 9Router combo):
what each item's check found is noted under it.

*Found in:* a run stopped by a model error had to start again from the beginning, and
a wedding invitation ("Raka & Nadia", site 18, built in one run with the 9Router combo)
came out tidy but plain: text only, an empty gallery, an empty story page, a guest
book that never showed a message, business questions in step 2, and two of the three
offered looks meant for a workshop and a shop.

### R5. A stopped run continues where it stopped

*Found:* the files of finished steps stay on disk, but no record says which steps
finished, so "Try again" writes the layout and every page again. A failed revise
throws away a change that was already written. One moment in which every model fails
ends the run.

- The worker keeps a progress record per site, outside the agent's allowlist: the
  direction and variant, a hash of the brief, and the parts finished (generated files,
  layout, each page, "all written"). It is valid only while the brief and the look
  are unchanged.
- "Try again" becomes "Lanjutkan" when a record exists. The new run skips the finished
  parts: a run that stopped at page 4 starts at page 4, and one that stopped in the
  check starts at the check. The screen says one plain sentence ("Bagian yang sudah
  jadi tetap disimpan.").
- A revise that stopped after its change was written keeps the change and continues
  at the check. The current version stays untouched until the new one passes.
- When every model fails, the worker waits and asks again for up to 3 minutes, with
  the step "Menunggu AI siap...", before the run fails.
- *Check:* a fake model that fails on the third page, then works: the second run
  writes no layout and no first two pages (tested); a revise stopped in the check
  keeps its files (tested).
- *Done, checked differently:* the record is unit-tested (`TestProgressBelongsToOneWork`);
  the worker's skipping was checked for real instead of with a fake model, because the
  worker needs the database and the sandbox. Site 20 was stopped after the menu and two
  pages; "Continue" went straight to the third page. A later run that failed in the
  review continued straight at the check. Not exercised: a revise stopped halfway.
- *Added:* a review that cannot reach a model keeps the checked website (site 20's
  free models were out of quota), and the stop dialog now says the finished parts are
  kept.

### R6. Questions and looks that fit the kind of website

*Found:* step 2 is titled "Tentang usaha Anda" and asks for a business name and
opening hours for a wedding; the couple's names and the venue in the description are
not filled in; the looks offered for "romantis dan elegan" included "Tegas dan kuat"
and "Ramai dan siap jualan".

- The planner's `kind` comes from a fixed list (shop, food, service, workshop,
  clinic, portfolio, wedding, event, community, personal). Step 2 follows it: for a
  wedding or event the title is "Tentang acara Anda", the name field is "Nama
  pasangan" or "Nama acara", opening hours are left out, date and place are shown.
  Every label goes through `t()` in both languages.
- Facts from "Yang sudah kami pahami" fill step 2: name, address or place, date,
  contact.
- Mood words in the description or answers (romantis, elegan, ceria, tenang,
  mewah, sederhana) rank looks the way colour words do (`MoodTags`, beside
  `ColourTags`), from tags written by hand on each direction.
- A look whose `fits` does not include the kind is offered only when fewer than three
  looks fit.
- *Check:* the wedding description of site 18 gets "Tentang acara Anda", the names and
  place filled in, and three looks that fit a wedding (tested with a fake planner);
  `TestLooksUsePlainWords` covers the new labels.
- *Done:* `TestWeddingGetsLooksThatFit`, `TestMoodWords`; for real, site 20 got "About
  your event" with the names and place filled in, no opening hours, and Romantic and
  soft, Calm and elegant, Festive and warm. The kind list is still the union of the
  looks' `fits`, not a fixed list. Also fitting weddings now: Hangat dan klasik,
  Sederhana dan alami, Akrab dan buatan tangan.

### R7. Ask for what makes the website personal, never show empty boxes

*Found:* the gallery shows beige boxes because no photo was uploaded, and "Cerita
Kami" has almost no text because the story was never asked for. The rule against
invented content is right; the missing step is asking for the content.

- For kinds that live on personal content (wedding, event, portfolio, personal) the
  planner may use one of its questions to ask for it, with free text ("Ceritakan
  singkat bagaimana kalian bertemu"), and step 2 asks for photos with a sentence that
  says why ("Foto kalian membuat undangan terasa hidup").
- A page or section that needs material the person did not give is left out of the
  brief, or merged into another page, with a line in the summary ("Galeri ditambahkan
  setelah Anda mengunggah foto"). The person can add it later by uploading photos and
  asking for the change.
- The plain-text check refuses empty picture frames and placeholder boxes in pages, as
  it refuses pictures from the internet.
- *Check:* a brief without photos has no gallery page and no empty frame (tested); a
  brief with a story answer puts the story on the page in the person's words.
- *Done:* the empty-frame check is tested (`TestEmptyFramesAreRefused`); the brief rule
  is in the prompt, judged for real: site 20 asked for the story, planned no gallery,
  said photos can be added later, and its story page tells the answer in the couple's
  words without new facts.

### R8. More attractive, still inside the chosen look

*Found:* "Mewah dan tenang" was carried out correctly, but a wedding invitation needs
more than a correct page: nothing on it says "invitation".

- **Fixed pieces in the template** (`web/src/kit/`, written by people, not the agent):
  a countdown to a date (one purposeful moment, respecting `prefers-reduced-motion`),
  a timeline of the day, an "add to calendar" button (an `.ics` file made in the
  browser, no outside service), a "show the way" link to a map address, a framed
  photo, a decorative divider and a monogram, all styled only by the theme's tokens.
  The agent may use them and may not change them (allowlist).
- **Each direction says which pieces and ornaments it uses** in its composition, so a
  wedding in "Mewah dan tenang" gets thin gold dividers and a monogram, and the same
  wedding in another look gets other pieces.
- **Two curated looks for celebrations**, made like the twelve (palette checked by
  `TestPalettesAreReadable`, plain names, example website), for example "Romantis dan
  lembut" and "Meriah dan hangat". `fits` includes wedding and event.
- The review step checks that a wedding or event page uses the pieces its direction
  names.
- *Check:* the description of site 18 built again gives a home page with a countdown,
  the schedule as a timeline, an "add to calendar" button and the direction's
  ornaments, and passes the build; the owner judges whether it now looks attractive.
- *Done:* site 20 (Romantis dan lembut) has the arch monogram, the countdown, "Simpan
  tanggal", flourish dividers, the schedule and a map link, and builds. Every kit piece
  was also built together in the sandbox. The two new looks have no example website
  yet (`builder-samples -create` makes them). The owner's judgement is still to come.

### R9. A guest book that shows the messages

*Found:* the confirmation page promised that messages appear at once, but the
template can only store form answers, never show them, and the agent did not build a
way. The review noticed it; its fix did not work.

- The template gains a public list for forms marked public in `site.json`: `GET
  /api/forms/<name>/public` returns only the fields named public (for example name and
  message, never attendance, phone or e-mail), newest first, at most 100, as text.
- A fixed `Guestbook` piece in the kit shows them and refreshes after a message is
  sent. The confirmation form names which fields are public.
- The smoke test sends a message to a public form and reads it back.
- Pages may not promise that answers appear unless the form is public (review rule).
- The owner hiding a message comes with "the owner reads the form answers"
  (section 17), not here.
- *Check:* on site 18 rebuilt, a sent wish appears under "Ucapan dan Doa" without
  reloading, and the public list returns no attendance field (tested in the template
  and in the smoke test).
- *Done:* on site 20 a wish appeared at once and `/api/forms/.../public` returned only
  the name and the message, not attendance or the number of guests; the smoke test
  checks the same on every build with a guest book. Site 18 itself was not rebuilt.

**Order:** R9 (a broken promise on a live page), R5 (lost work), R6 (questions and
looks), R7 (content), R8 (the largest: kit, ornaments, two new looks with examples).

## 20. One product: the website builder (from the owner, 2026-11-16)

The app was an agent workspace with a website builder inside. It becomes a website
builder only: a person describes a website and gets it. Everything about agents and
models leaves the person's screens; what is still needed moves to the admin app
(`admin-agentic-ai`) or runs unseen in the background.

Planned, item by item, each in its own change:

| Feature | In the person's app | Becomes |
|---|---|---|
| Design Studio | Removed | **Done 2026-11-16:** menu, routes, `src/features/design-studio`, its texts, `/api/design-projects` and the model are gone. The `design_projects` table is no longer migrated; designs made before are deleted with their owner's account |
| Agent list | Removed | Admin: the existing Agents page (the Planning, Coding, Debugging and Review roles) |
| Skills | Removed | Admin page; used by the agent worker as guidance |
| Combos, model health | Removed | Admin Models page: the order of models and their health; the builder keeps choosing automatically |
| Memory | Removed | Background only: facts the person gave before (business name, contact, last look) to fill in their next website |
| Workspaces | Removed | Background only: every site keeps its workspace; admins may open one to investigate |
| Apps (free and paid models) | Removed | Removed, or integrations in the admin app |
| Chat (`/ai`) and its history | Removed | Changes to a website are asked for in the builder's "Minta perubahan" box |
| Overview | Kept, rewritten | A summary of the person's websites: how many, online, being made, the latest five |

**Done in the person's app (2026-11-16):** the pages, menus, texts and frontend code of
all the features above are gone (`src/features/ai`, `agents`, `apps`, `paid-models`,
`skills`, `combos`, `memory`, `model-health`, `workspaces`, `users`, `delegation`, and
the chat history in the sidebar). After signing in, a person lands on `/sites`; the
menu is Website (Overview, Make a website) and Settings. The diff helper the local
runner still uses moved to `src/features/desktop-runtime/line-diff.ts`.
**Backend, done 2026-11-16:** the routes of these features left the signed-in user's
group and are served to admins only under `/api/admin/...` (`routes_admin_features.go`
in the backend): agents (`/agent-catalog`, the full list with models), skills, memory,
workspaces with their runs and tools, the chat, delegations, tool activities, model
health and combos. The person's own models and providers (`/api/ai/models`,
`/api/ai/providers`) are gone; admins manage system models through the existing admin
routes. A test fails if one of them is put back on the user's group
(`TestBackgroundFeaturesAreNotOpenToUsers`). The admin app calls
`/api/admin/agent-catalog` instead of `/api/agents`. The handlers still scope data to
the signed-in admin; admin pages that manage skills, memory, combos and workspaces for
everyone are still to be built.
Kept for now by the owner's choice: Tasks and the GitHub integration in Settings.

Still proposed: a "Pesan masuk" view of form answers per site (section 17), and
removing Tasks and the GitHub integration later. User routes for the removed
features move under `/api/admin/...`; their tables stay.

