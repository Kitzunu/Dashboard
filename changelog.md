# Changelog

## 9a5e365 — Refactor Table of Contents in README

**Author**: Kitzunu | **Date**: 2026-04-04 14:18:21 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/9a5e3656e8a3f386be92147a54ebf5b82f8cdacf

Reorganize Table of Contents for better readability

<!-- entry-separator -->

## 410efd3 — Add Changelog page to Dashboard group

**Author**: Copilot | **Date**: 2026-04-04 14:13:46 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/410efd34acb0c5c0ff41381041df1a7a66f9eb9c

The `---` entry separator collided with the same token used in PR/merge commit bodies, causing the parser to split mid-entry and absorb all remaining entries as the first commit's body — only 1 entry rendered instead of 130+. The hash badge was a plain label with a redundant separate link column.

### Separator (`changelog.md`, `changelog.js`, `changelog.yml`)
- Replaced `---` with `<!-- entry-separator -->` — an HTML comment that cannot appear in any git commit message
- Backend parser (`parseChangelog`) now splits on the new token
- Workflow writes new entries using the same token

### UI (`ChangelogPage.jsx`)
- Hash badge rendered as `<a href={entry.link}>` — clicking it opens the GitHub commit URL directly
- Removed the dedicated LINK column; `colSpan` updated to 4

### Workflow (`changelog.yml`)
- Skips any commit whose subject starts with `chore: update changelog` — prevents CI update commits from appearing as real entries
- Added comments documenting both self-trigger guards: `paths-ignore: changelog.md` (won't fire if only the changelog changed) and `[skip ci]` in the commit message (GitHub drops the run entirely)

### `changelog.md`
- Regenerated from `origin/master` commits only — strips branch/conversation commits and all CI changelog-update commits (132 clean entries)

---------

Co-authored-by: copilot-swe-agent[bot] <198982749+Copilot@users.noreply.github.com>
Co-authored-by: Kitzunu <24550914+Kitzunu@users.noreply.github.com>

<!-- entry-separator -->

## d2d1d109 — Alerts: checkbox batch delete + filter-scoped Clear All (#44)

**Author**: Copilot | **Date**: 2026-04-04 13:35:25 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/d2d1d1095c046f47cb61dc78dafd82739acfde86

No way to delete an arbitrary subset of alerts; "Clear All" wiped every alert regardless of active filters.

### Backend (`alertsRoutes.js`)
- `DELETE /api/alerts` now accepts `?ids=1&ids=2` for batch deletion (max 500, integer-validated); empty/invalid ID lists return 400
- `DELETE /api/alerts` forwards `?severity=` and `?type=` so Clear All is scoped to the active filter

### API (`api.js`)
- Added `deleteAlerts(ids[])` — single DELETE with IDs as repeated `ids` params; rejects immediately if array is empty (prevents accidentally hitting the "delete all" backend path)
- `clearAlerts` signature changed from `(olderThan)` to `({ severity, type, olderThan })`
### UI (`AlertsPage.jsx`)
- Checkbox column on every row; header checkbox supports checked / indeterminate / unchecked tri-state
- **"Delete Selected (N)"** button appears in header when ≥1 row is checked; clicking opens a confirmation modal before any deletion
- **"Clear All"** passes active severity/type filters to the API; confirmation text describes exact scope (e.g. *"all critical Server Crash alerts matching the current filter"*)
- Selection state cleared on page or filter change

* closes https://github.com/Kitzunu/Dashboard/issues/40
---------

Co-authored-by: copilot-swe-agent[bot] <198982749+Copilot@users.noreply.github.com>
Co-authored-by: Kitzunu <24550914+Kitzunu@users.noreply.github.com>

<!-- entry-separator -->

## 2b1a5dc3 — fix: inputs clipped to intrinsic width; remove frontend/dist from repo (#43)

**Author**: Copilot | **Date**: 2026-04-04 12:51:27 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/2b1a5dc359ab6501a76a281cbccffdb2b55e96be

This pull request introduces a new API endpoint to list available server-side dump files for import, improves the character dump import modal with file selection and optional GUID assignment, and unifies modal dialog styling across the frontend for a more consistent user experience. There are also minor UI and style improvements for form inputs and tabbed controls.

**New API and Integration for Server-Side Dump Files:**

* Added a new backend route `GET /api/pdump/list-files` to list `.sql` and `.txt` files in the configured dump directory, and exposed it via the frontend API as `pdumpListFiles`. [[1]](diffhunk://#diff-ae915a09839e6a132e2fca840a1ff5c3376c81d597c32cb0a5b38ab55f466da5R457-R473) [[2]](diffhunk://#diff-a89738858630f071121be18ff14b0d8ef770e718126254d86d2a0f0ce52d8547R198-R200)
* The character dump import modal now fetches and displays available server dump files, allowing users to select a file for import directly from the UI. [[1]](diffhunk://#diff-d27145f7641b1c54cec6f63ada0fae708633d8580db057fe18a47cfb0fd9ccddR201-R206) [[2]](diffhunk://#diff-d27145f7641b1c54cec6f63ada0fae708633d8580db057fe18a47cfb0fd9ccddR216-R218) [[3]](diffhunk://#diff-d27145f7641b1c54cec6f63ada0fae708633d8580db057fe18a47cfb0fd9ccddR307-R321)

**Improvements to Character Dump Import Modal:**

* Added an optional "New GUID" field to the import modal, letting users specify a character GUID or leave blank to auto-assign. [[1]](diffhunk://#diff-d27145f7641b1c54cec6f63ada0fae708633d8580db057fe18a47cfb0fd9ccddR251-R255) [[2]](diffhunk://#diff-d27145f7641b1c54cec6f63ada0fae708633d8580db057fe18a47cfb0fd9ccddR379-R393)
* Enhanced tabbed controls for selecting between file upload and server path, and improved result and action button styling. [[1]](diffhunk://#diff-d27145f7641b1c54cec6f63ada0fae708633d8580db057fe18a47cfb0fd9ccddL265-R284) [[2]](diffhunk://#diff-d27145f7641b1c54cec6f63ada0fae708633d8580db057fe18a47cfb0fd9ccddL371-R408)

**Consistent Modal Dialog Styling:**

* Applied the new `.modal-structured` class to all modals with headers/footers for consistent padding and layout, and added a `.modal-body` class for body content. (F43eb8f3L43R127, [[1]](diffhunk://#diff-d27145f7641b1c54cec6f63ada0fae708633d8580db057fe18a47cfb0fd9ccddL265-R284) [[2]](diffhunk://#diff-80249640c818212aefaa624108ac7e5e71d5d09126c670d9914706c8aebded0cL255-R255) [[3]](diffhunk://#diff-4915bd953edabf78d43e5ae97b0f44eeefa999ab5b0b1ebda7eacb3ea45d32a9L8-R8) [[4]](diffhunk://#diff-aafb58cb33703fa71778f4561c50d4365c544c40d9f03eeba392c7d99c543aeaL142-R142) [[5]](diffhunk://#diff-6cc3d7c20e81de9e1fc617ac692bd39ac01a003399e5e1171e2afa2b13240c0dL534-R534) [[6]](diffhunk://#diff-84d166812776258c0b3d206331fd3f7482331f07918a06b333dac5b24e7411fcL81-R81) [[7]](diffhunk://#diff-b6889d573bf684293ea3c3e654c123bd3502dd1f8155470375a1e5a906f0c236R548-R553)

**Form and Tab UI Enhancements:**

* Updated form input styling for better alignment and usability, including full-width inputs and improved `.form-label` spacing. [[1]](diffhunk://#diff-b6889d573bf684293ea3c3e654c123bd3502dd1f8155470375a1e5a906f0c236R256-R257) [[2]](diffhunk://#diff-b6889d573bf684293ea3c3e654c123bd3502dd1f8155470375a1e5a906f0c236R1959-R1960)
* Improved tab button styles and hover effects in modals for a clearer, more interactive experience. (F43eb8f3L43R127, [[1]](diffhunk://#diff-d27145f7641b1c54cec6f63ada0fae708633d8580db057fe18a47cfb0fd9ccddL265-R284) [[2]](diffhunk://#diff-d27145f7641b1c54cec6f63ada0fae708633d8580db057fe18a47cfb0fd9ccddL332-R354)

**Minor Style Tweaks:**

* Adjusted `.db-select` and other input styles for better layout consistency.

<!-- entry-separator -->

## 498c678a — Reset CONFIG_PATH and BACKUP_PATH in .env.example

**Author**: Kitzunu | **Date**: 2026-04-04 11:56:29 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/498c678ae354dc6770b81e78c4b31977418f5811

Clear CONFIG_PATH and BACKUP_PATH for default settings.

<!-- entry-separator -->

## 40ff27cf — Revise README TOC, sections, and tables

**Author**: Kitzunu | **Date**: 2026-04-04 01:32:43 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/40ff27cf66b996b660b1942beb368a569594d51a

Reorganize and clean up README.md: add a top-level "AzerothCore Dashboard" heading and expanded Table of Contents with detailed Pages entries, introduce a Character Dumps section, and move scheduler/mysqldump notes out of the pdump paragraph. Reformat several Markdown tables (Discord Alerts, Access Levels, Audit Log, Settings, Environment keys) for consistent alignment and readability, add a "What is logged" subheading under Audit Log Setup, and remove duplicated/relocated lines. Overall cosmetic and structural edits to improve navigation and clarity.

<!-- entry-separator -->

## 9688a147 — Add character pdump export/import support

**Author**: Kitzunu | **Date**: 2026-04-04 01:21:02 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/9688a1473cf4a66951a9f60be893ec45110464d6

Introduce full pdump export/import functionality.

- Add backend route (backend/routes/pdump.js) to generate .sql dumps for a character and to load/import dumps with full GUID remapping for characters, items, mail, pets, equipment sets, etc. Exposes endpoints to download or save dumps to a server path and to import via uploaded content or server-side path. Implements GUID offset calculation, parsing/remapping of INSERT statements, transactional execution, validation (account exists, max 10 chars), and audit logging. Routes require GM level 2.
- Register pdump routes in backend/server.js.
- Frontend: add API helpers (pdumpDefaultPath, pdumpLoad, pdumpSave, pdumpDownload) and UI components in CharacterPage.jsx: PDumpModal (export download/server-save) and PDumpLoadModal (upload/server-path import), plus buttons to trigger import/export.
- Add PDUMP_OUTPUT_PATH to .env.example and document usage and behavior in README.md (default ./pdump, auto-create directory, pre-filled paths). Add pdump/ to .gitignore.

This change enables admins to export .pdump-compatible SQL dumps and import them safely from the dashboard, supporting both browser downloads and server-side storage.

<!-- entry-separator -->

## 85dfaba5 — Fix SecondsSinceMessage column casing

**Author**: Kitzunu | **Date**: 2026-04-03 20:52:19 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/85dfaba593a581bc9d4f244449a37cbe68d45fdf

Query and mapping updated to use the correct column name 'SecondsSinceMessage' (matching DB casing) in backend/routes/spamreports.js. This fixes a mismatch that caused the secondsSinceMessage field to be undefined in API responses.

<!-- entry-separator -->

## 797b03c1 — Update character inventory SQL preset

**Author**: Kitzunu | **Date**: 2026-04-03 18:24:57 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/797b03c1774c475d72df16b630876df9c3ef649c

Refine the 'Character inventory' preset SQL: rename the selected alias to character_name, count items using COUNT(i.item) instead of COUNT(i.guid), add GROUP BY c.guid, c.name to satisfy aggregation rules, and append a trailing semicolon for correctness.

<!-- entry-separator -->

## cb308c8f — Add backend health endpoint and gate frontend start

**Author**: Kitzunu | **Date**: 2026-04-03 18:15:43 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/cb308c8fbf83e6d7cf72b19fd5b127940a025802

Expose a /api/health endpoint and adjust CORS handling so missing origins are denied without throwing. Update package.json to use wait-on so the frontend waits for the backend health check before starting, and update README to document the frontend gating behavior. These changes prevent the browser/Vite from hitting the API before the backend (and CORS/routing) are fully initialized.

<!-- entry-separator -->

## 1c18419e — Fetch and use DBC races/classes in CharacterPage

**Author**: Kitzunu | **Date**: 2026-04-03 18:14:07 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/1c18419e77d275e3656a4b9ed0e486a271795668

Replace static FALLBACK_RACES/FALLBACK_CLASSES lookups with component state populated from API DBC endpoints. Initialize races/classes state with fallbacks, fetch updated mappings on mount (api.getDBCRaces / api.getDBCClasses) and use them in the character list and detail view, falling back to raw IDs if unavailable.

<!-- entry-separator -->

## e6711bc6 — Load races and classes from API in CharacterPage

**Author**: Kitzunu | **Date**: 2026-04-03 18:04:51 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/e6711bc6341ac4b49af29e694f4291a67cf2a3af

OverviewTab now initializes local races/classes state from FALLBACK_* and fetches DBC races and classes on mount via api.getDBCRaces()/api.getDBCClasses(). The rendered Race/Class labels now use the fetched maps (falling back to the raw id if absent). Network errors are ignored silently to preserve existing behavior.

<!-- entry-separator -->

## f101129e — Support onViewCharacter to view characters

**Author**: Kitzunu | **Date**: 2026-04-03 17:43:51 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/f101129e25ad60106ffebb3ea9813c90387abbad

Add an onViewCharacter callback prop and wire it through layout and relevant pages so character names can be clicked to navigate to the character view. Updated components: Layout (passes onViewCharacter to TicketsPage, AccountsPage, GuildsPage), AccountsPage/AccountDetailModal (renders name as a button when provided), TicketsPage/TicketRow (renders player name as a button and prevents row toggle propagation), and GuildsPage/MembersTab (renders member names as buttons). This enables in-app navigation to a character detail page when a guid is available.

* closes https://github.com/Kitzunu/Dashboard/issues/39

<!-- entry-separator -->

## 46f8b1d1 — Clarify restart instruction for env changes

**Author**: Kitzunu | **Date**: 2026-04-03 17:34:52 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/46f8b1d194a085584abe5eedff84e39e9bf148a0

Make the restart requirement explicit for .env edits by updating the toast notification and the Environment section subtitle to state that the backend server must be restarted for the changes to take effect. This improves clarity for users saving environment settings.

<!-- entry-separator -->

## 8eb23358 — Add manual server-stop Discord alert

**Author**: Kitzunu | **Date**: 2026-04-03 17:29:58 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/8eb233584180e5af6df2d73e59719b8aaea40341

Introduce a new Discord alert for manually stopped game servers. Added default settings (discord.alert_server_stop and discord.message_server_stop) and UI controls in SettingsPage, implemented sendServerStop in backend/discord.js (using existing embed/sending logic), and wired it into server.js to be sent when a stop is intentional. Also removed the previous cooldown/anti-spam tracking and related checks from discord.js and updated the module exports accordingly. Small formatting/cleanup applied to related code.

<!-- entry-separator -->

## 1c7a55c5 — Support comma-separated frontend CORS origins (#38)

**Author**: Kitzunu | **Date**: 2026-04-03 17:19:45 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/1c7a55c50281b66a4dbe2e93e2932eab23d5e4e9

* Support comma-separated frontend CORS origins

Allow the FRONTEND_URL env var to contain comma-separated origins (e.g. localhost and LAN IP). Parse the value with split/trim/filter and pass an array to socket.io when multiple origins are provided; keep a single string for a single origin. Retains the default http://localhost:5173.

* Make env-based CORS and IP allowlist dynamic

Rework CORS origin handling and IP allowlist so changes to environment vars (e.g. via the .env editor) apply immediately without restarting the server. In ipAllowlist.js the allowlist is now re-parsed on each request instead of cached globally. In server.js added getFrontendOrigins() and dynamicOrigin() to re-read FRONTEND_URL per request and supplied dynamicOrigin as the CORS callback for both Express and Socket.IO. Also updated the startup log to print the current frontend origins.

<!-- entry-separator -->

## f1e1d9c0 — Track intentional server stops and adjust alerts

**Author**: Kitzunu | **Date**: 2026-04-03 17:08:50 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/f1e1d9c08cfd9f69b23efaa42bcf270194ed89fc

Add intentional-stop tracking to distinguish manual shutdowns from crashes. Introduce markIntentionalStop and consumeIntentionalStop in backend/processManager.js and export them. The servers stop route now marks a stop as intentional before calling stopServer. server.js consumes that flag to log a 'server_stop' (info) and avoid sending crash alerts/Discord notifications when a stop was user-initiated; otherwise it keeps the existing crash handling. Update frontend AlertsPage to display a 'Server Stopped' alert type and badge styling.

<!-- entry-separator -->

## e5d90435 — Reset opposing alert state on alert send

**Author**: Kitzunu | **Date**: 2026-04-03 17:04:41 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/e5d9043540c93293d23382fa52d94034a80c62ae

Clear the opposing lastSent key when sending crash/online alerts to avoid blocking the next opposite alert. Adds lastSent.delete(`online.${server}`) in sendServerCrash and lastSent.delete(`crash.${server}`) in sendServerOnline (placed after markSent) so online and crash notifications don't suppress each other.

<!-- entry-separator -->

## 6d920473 — Add useEffect to CharacterPage imports

**Author**: Kitzunu | **Date**: 2026-04-03 17:02:15 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/6d9204738346ea7040149ae7c875aa8a3c7b0eb6

Include useEffect in the React import in frontend/src/components/CharacterPage.jsx to enable use of effect hooks within the component. This prepares the file for side-effect logic that relies on useEffect.

<!-- entry-separator -->

## ca91b3b5 — Add character nav from Players to Character page

**Author**: Kitzunu | **Date**: 2026-04-03 14:21:37 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/ca91b3b5e1ce520122c854d8f8228904a031b6d8

Enable navigating from the Players list directly to a character detail. Layout: add charNavGuid state, wire Players page to set it and switch to the Characters page, and pass initialGuid into CharacterPage. PlayersPage: accept onViewCharacter prop and render player names as a .btn-link button that calls the callback when provided. CharacterPage: accept initialGuid and auto-open the character on mount (useEffect intentionally omits openDetail from deps). index.css: add .btn-link styles. This streamlines workflow for viewing a character from the players list.

<!-- entry-separator -->

## 58680ae9 — Add alerts system: DB, API, UI, logging

**Author**: Kitzunu | **Date**: 2026-04-03 14:08:09 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/58680ae98ed94f4f7b25ec9ceac40f6c8e1fd65f

Introduce a new system alert feature across backend and frontend: create alerts DB table and SQL migration; add backend alertLogger to persist alerts; expose /api/alerts routes for listing and deleting alerts (GM level 1+ to view, level 3 required for deletes/clear); wire alert logging into server events (server online/crash, agent disconnect, resource threshold breaches and latency breaches) and send corresponding Discord latency alerts; extend thresholds to include latencyWarn/latencyCritical with validation; add frontend API methods, AlertsPage UI, and nav entry; update HomePage threshold settings to configure latency thresholds. Includes minor docs updates.

<!-- entry-separator -->

## fc8e76ac — Make sidebar nav groups draggable and relabel

**Author**: Kitzunu | **Date**: 2026-04-03 13:18:40 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/fc8e76ac7861239ab19c316bc153bf45a514618f

Add draggable, persistable sidebar group ordering with drag handles and visual states. Introduces getInitialGroupOrder/localStorage key `ac-nav-group-order`, drag handlers (start/over/drop/end), and orderedGroups rendering. Clean up nav labels by removing emoji, move Players-related items into a dedicated "Players" group in the nav and README. Update CSS: make .nav-item flex, adjust paddings, add .nav-group-drag-handle, hover/dragging/drag-over styles, and tweak kbd padding to align with new layout. Improves UX by allowing users to reorder nav groups and provides clearer, emoji-free labels.

<!-- entry-separator -->

## b20d2002 — Document .env editor and dashboard management

**Author**: Kitzunu | **Date**: 2026-04-03 13:02:47 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/b20d2002195d2a8bd9b0f0c87ed8408e08a1a762

Update README to document new Dashboard Management features and editable .env keys. Adds explanations for Restart Backend/Agent/Frontend actions (confirmation modals, audit-logging, agent restart warning that game servers will be temporarily unmanaged) and notes that .env edits require backend/agent restarts. Reflects role/permission changes (GM/Admin access to Settings/.env editor and Dashboard Management), adds audit-log entries for Scheduled Tasks, Settings, Environment, and Dashboard restarts, and documents Alerts UI and confirmation changes. Also lists new backend/frontend files and lightweight runner scripts (run.js, runAgent.js) used to auto-restart processes.

<!-- entry-separator -->

## 1dc2ec7e — Add dashboard process management & agent runner

**Author**: Kitzunu | **Date**: 2026-04-03 12:58:40 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/1dc2ec7e45a536075395fd2a7dca50660805e91d

Add UI and API endpoints to manage/restart processes and introduce a resilient agent runner.

- New backend/routes/dashboardManage.js: exposes POST endpoints to restart backend, agent, and frontend (GM level 3 only); frontend restart returns a manual-instruction response.
- Added backend/runAgent.js: spawns serverAgent.js and restarts it when it exits with code 42.
- Updated backend/serverAgent.js: added POST /restart which exits with code 42 to trigger the runner restart.
- Exposed restartAgent in backend/processManager.js to call the agent restart endpoint.
- Removed the old /api/settings/restart route from settingsRoutes.js and moved dashboard restart actions to the new dashboardManage routes.
- Frontend: added API methods (restartBackend, restartAgent, restartFrontend), a new DashboardManagePage component, and a navigation entry in Layout.jsx.
- package.json: start:server-agent now runs backend/runAgent.js so the agent is automatically restarted when it requests a restart.

This change centralizes process control in the dashboard UI, allows safe agent restarts handled by a supervisor, and clarifies that the Vite dev frontend cannot be restarted remotely.

<!-- entry-separator -->

## 9ed61ad6 — Add .env editor, restart runner & UI

**Author**: Kitzunu | **Date**: 2026-04-03 12:48:12 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/9ed61ad6cade0e01b014e535cbded9465456d7e4

Introduce a safe, whitelisted .env editor and restart workflow across backend and frontend. Adds backend/routes/envSettings.js to read/write a vetted set of .env keys (excludes DB creds, JWT_SECRET, PORT), requires GM level 3, parses existing .env lines (preserving comments), updates process.env for immediate effect, writes changes to disk and audits saves. Adds POST /api/settings/restart which triggers process.exit(42) and mounts the env-settings route in server.js. Adds backend/run.js as a supervisor that restarts server.js when it exits with code 42 and updates CORS handling to accept comma-separated FRONTEND_URL origins. Frontend: exposes new API methods (getEnvSettings, saveEnvSettings, restartBackend), extends SettingsPage.jsx with grouped environment settings UI (dirty state, save button, restart prompt/button), and small CSS for warnings and dirty inputs. package.json start script updated to run the new backend runner.

* closes https://github.com/Kitzunu/Dashboard/issues/37

<!-- entry-separator -->

## 3667675a — Coerce truthy checks to boolean in UI badges

**Author**: Kitzunu | **Date**: 2026-04-03 12:26:04 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/3667675a8b4a92699bebe9582165d2813b1901ac

Use explicit boolean coercion (!!) for conditional JSX rendering of online/locked badges to avoid treating non-boolean values as React children. Applies to frontend/src/components/AccountsPage.jsx and frontend/src/components/CharacterPage.jsx to ensure consistent badge rendering.

*closes https://github.com/Kitzunu/Dashboard/issues/36

<!-- entry-separator -->

## 73d7e40c — Add alerts dropdown with sound toggle

**Author**: Kitzunu | **Date**: 2026-04-03 12:18:22 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/73d7e40c9e4c9c7a5b3b4b39b8b65a3e4acb80ca

Replace the old NotificationBell with a new AlertsDropdown that combines popup notification and alert-sound controls in a single dropdown. fireNotification now accepts options ({ sound, popup }) so sound and browser popup can be toggled independently. Added soundEnabled state and persisted it to localStorage (ac-sound-enabled) with a corresponding ref and toggle handler. checkAlerts now passes the appropriate options so alerts can be popup-only, sound-only, or both. Also added click-outside handling for the dropdown and small UI tweaks (chevrons for dropdowns and threshold toggle).

<!-- entry-separator -->

## 81f2ee0d — Add removal confirmation modal for name filters

**Author**: Kitzunu | **Date**: 2026-04-03 02:52:32 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/81f2ee0d4984fb162fc720240726a0d502d6a844

Introduce a RemoveModal component to confirm removing names from profanity/reserved lists. Add removeTarget state to track the selected name, update the Remove button to open the modal, and refactor handleRemove to use removeTarget and clear it on success or error. This prevents accidental deletions by requiring explicit confirmation before calling api.removeNameFilter.

<!-- entry-separator -->

## db310f66 — Document Name Filters feature; small CSS tweak

**Author**: Kitzunu | **Date**: 2026-04-03 02:46:05 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/db310f66c291cb08d8637e37394137dbc0e6542c

Add documentation for the new Name Filters feature (profanity_name and reserved_name) including UI details, permissions (GM level 2 can view/add/remove), audit logging, and entries for related frontend files (namefilters.js, NameFiltersPage.jsx). Also update README tables and action list to include name filter actions. Minor CSS change: include .guild-bank-info alongside .guild-ranks-list to share the same flex layout.

<!-- entry-separator -->

## 4e87703f — Add name filters API and management UI

**Author**: Kitzunu | **Date**: 2026-04-03 02:42:45 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/4e87703fa29821f90fdad3e57c643c6dcb04850c

Introduce name filters feature: add backend route /api/namefilters with GET/POST/DELETE to manage 'profanity' and 'reserved' lists (GM level 2 required, 12-char limit, duplicate handling, and audit logging). Register the route in server.js. Add frontend API helpers (getNameFilters, addNameFilter, removeNameFilter), a new NameFiltersPage React component for listing, filtering, adding and removing names, and wire the page into Layout navigation.

<!-- entry-separator -->

## f6e651f5 — Parse MySQL DATETIME and robust date formatting

**Author**: Kitzunu | **Date**: 2026-04-03 02:37:32 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/f6e651f555fbb7187ea00b47021117d0f5be9be6

Add parseDate helper to normalize timestamp inputs (numeric Unix seconds or MySQL DATETIME strings) and replace space with 'T' for ISO parsing. Refactor fmtUnix and fmtUnixFull to use parseDate, return '—' for missing/invalid dates, and preserve locale formatting for valid dates.

<!-- entry-separator -->

## eaae4a1d — Add character search/detail API & UI

**Author**: Kitzunu | **Date**: 2026-04-03 02:36:12 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/eaae4a1dc45b545a7fff96f177c7656d4ef6bc71

Implements a new Characters feature end-to-end. Adds a backend route (backend/routes/characters.js) providing character search and full-character detail (equipment, bags, bank, reputation, currency, achievements, auras, stats) using char/world DBs; search requires >=2 chars and GM level 1. Extends backend/dbc.js to load and expose additional DBC tables (factions, achievements, categories, char titles, spells) and exports helper getters; init logs and gracefully handles missing DBC_PATH. Registers the route in backend/server.js. Frontend: exposes api.searchCharacters / api.getCharacter, adds a new CharacterPage React component with tabbed UI (Overview, Stats, Equipment, Bags, Bank, Auras, Reputation, Achievements) and integrates WoWHead links; minor layout/CSS and README updates documenting the new feature. Handles missing tables gracefully and keeps world/char queries defensive.

<!-- entry-separator -->

## b36f95ce — Add guild bank event & money logs + UI

**Author**: Kitzunu | **Date**: 2026-04-03 01:19:09 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/b36f95ce77f5894506325177b95079b9b0db5b48

Backend: query guild_bank_eventlog for item events (tabs <100) and money events (tabs >=100), resolve item names from item_template and return enriched eventLog and moneyLog alongside tab data. Limits logs to 200 entries and maps item templates for proper naming/quality. Frontend: refactor BankTab into sections (Info, Items, Item Log, Money Log), add BankItemLink and event description rendering, refresh Wowhead links after render, and display item/money logs. Pass bankMoney into BankTab to show total gold. Improves visibility of bank activity and item metadata in the UI.

<!-- entry-separator -->

## aac6f6c9 — Merge branch 'master' of https://github.com/Kitzunu/Dashboard

**Author**: Kitzunu | **Date**: 2026-04-03 01:13:13 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/aac6f6c9ae76224db1bbf7c3cbf8f9af1e09098b

<!-- entry-separator -->

## 469c8882 — Add WoWHead tooltips to guild bank items

**Author**: Kitzunu | **Date**: 2026-04-03 01:13:09 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/469c88826a6d56301f61e9b5628223d4fad2c95a

Include the WoWHead widget in index.html and annotate bank item names with data-wowhead links pointing to the WotLK domain. Add a useEffect in GuildsPage to call window.$WowheadPower.refreshLinks() after items render so tooltips are initialized. Links open the corresponding Wowhead item pages in a new tab and preserve existing quality color styling.

<!-- entry-separator -->

## ddaa5bf9 — Add guild bank endpoint and UI

**Author**: Kitzunu | **Date**: 2026-04-03 01:02:37 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/ddaa5bf9aeb8f9f846ae958014e3d07f314e945b

Backend: add GET /api/guilds/:id/bank to return guild bank tabs and items; queries char DB for tabs/items and world DB for item_template info, merges templates into items and groups by tab; import worldPool and basic error handling. Frontend: expose api.getGuildBank, add BankTab React component (fetches bank, shows tabs, item list with quality colours), add Bank to guild page tabs, and render BankTab for selected guild. UI/CSS: add .guilds-list-panel layout and guild bank styles; replace some .table usages with .data-table and rename channels-list-panel to guilds-list-panel.

<!-- entry-separator -->

## ea87303b — Use window hostname for API/socket URLs (#35)

**Author**: Kitzunu | **Date**: 2026-04-03 00:36:15 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/ea87303b4047a5a809ac00a98a330379db4090f0

Detect the frontend host at runtime and build BASE_URL using window.location.hostname so the frontend served from a LAN IP will connect back to the same host. Keeps existing VITE_API_URL override and falls back to 'localhost' when window is undefined (e.g. SSR). Also adds a README section with LAN/Remote Access instructions (ALLOWED_IPS, FRONTEND_URL) to guide accessing the dashboard from other devices on the same network.

<!-- entry-separator -->

## b31e4f86 — Add guilds management page and API

**Author**: Kitzunu | **Date**: 2026-04-02 19:04:04 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/b31e4f865548e9da18a5be4c18ae33b939cf6222

Introduce a new Guilds feature: adds backend routes (/api/guilds, /api/guilds/:id) that use charPool queries to return guild list and full guild details (members, ranks, event log) and require GM level 1. Register the guilds routes in backend/server.js with JWT auth. Add frontend api methods (getGuilds, getGuild), a new GuildsPage React component (list, search, detail panel with tabard preview, members, ranks, event log) and wire it into Layout navigation. Include CSS for guild UI and minor spacing adjustments, and update README to document the Guilds feature and permission changes.

* closes https://github.com/Kitzunu/Dashboard/issues/10

<!-- entry-separator -->

## 612013d8 — Update README.md

**Author**: Kitzunu | **Date**: 2026-04-02 18:37:54 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/612013d8639f4f22a81078374e7fec43c48a099f

<!-- entry-separator -->

## 4e424f33 — Update README: dashboard files & Discord notes

**Author**: Kitzunu | **Date**: 2026-04-02 18:35:26 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/4e424f335fb2c82f1fb7e70483ae9c61f2722c7e

Sync README with recent code changes: add scheduledTasks.js and settingsRoutes.js to the Dashboard file list, clarify that Discord Alerts → Avatar URL defaults to the dashboard icon hosted on GitHub (instead of "blank"), and update the discord.js summary to mention server offline/online alerts alongside thresholds and agent disconnects. Keeps documentation aligned with the implementation.

<!-- entry-separator -->

## 6ade1b9e — Use hosted icon URL for Discord avatar

**Author**: Kitzunu | **Date**: 2026-04-02 18:28:30 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/6ade1b9e5d3582181e8859f609b26aab6506d170

Replace local dashboard icon fallback with a static hosted image URL for Discord webhook avatar. Removes the detectBackendUrl logic and deletes backend/public/icon.png, and updates defaults in backend/dashboardSettings.js and frontend SettingsPage.jsx so the dashboard uses the raw.githubusercontent.com icon URL as the default avatar.

<!-- entry-separator -->

## 725af173 — Add Discord 'server online' alert and init sync

**Author**: Kitzunu | **Date**: 2026-04-02 18:21:21 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/725af173c4bae4c4053b95684ddf56112cb2ce4c

Introduce a new "server online" Discord alert: add settings and default messages (frontend and dashboard defaults), implement sendServerOnline in backend/discord.js (uses settings, payload meta, template interpolation, cooldown and webhook posting), and export it. Update server.js to call the online alert when a server transitions from offline → running. Ensure initial server status is emitted to internal listeners in serverBridge so components receive sync on init. Also update README and refactor payload meta lookup to use settings.getAll().

<!-- entry-separator -->

## 85c17f82 — Add Discord webhook alerting

**Author**: Kitzunu | **Date**: 2026-04-02 18:13:17 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/85c17f828c04b19dbc05e187d12944e8e321569d

Introduce Discord webhook-based alerts across the dashboard. Adds a new backend/discord.js module to send crash, resource-threshold, and agent-disconnect notifications (with 5-minute cooldowns); new dashboard settings and defaults in backend/dashboardSettings.js; an icon asset served at /img for webhook avatar fallbacks; and a POST /api/settings/discord/test endpoint to validate webhooks. Integrates alerts into server lifecycle: serverBridge now emits events (server-status, agent-disconnected) and server.js listens to them and to resource polling to trigger alerts. Frontend: exposes api.testDiscordWebhook, adds a Discord Alerts section to SettingsPage with editable messages and a Send Test Message button, and minor styling/tidy changes. README and .env.example updated to document DISCORD_WEBHOOK_URL and alert behavior. Also bumps memory threshold in thresholds.json.

<!-- entry-separator -->

## ed4363f6 — Emit overview via socket and harden queries

**Author**: Kitzunu | **Date**: 2026-04-02 17:41:50 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/ed4363f6262146f1ec8d111b5753e91c10e59ca8

Make overview data resilient and real-time: backend overview route now wraps each DB call so a single failure won't block the response and reuses thresholds/window logic. getCpuUsage was moved and reused. server now supports subscribe-overview/unsubscribe-overview, adds emitOverview to push an overview:update to the "overview" room, and calls it after resource polls. Frontend HomePage accepts a socket prop, performs an initial HTTP load, and subscribes to overview:update for live updates (Layout passes the socket). Minor UI tweaks to resource graphs to handle missing system data and socket helper getSocket() was added.

<!-- entry-separator -->

## eedb5a04 — Show audit detail modal on row click

**Author**: Kitzunu | **Date**: 2026-04-02 17:17:00 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/eedb5a049bbc86cc7e17558b5c78c5b1d3f0b54d

Add AuditDetailModal component and wiring to open it when an audit table row is clicked. The modal shows metadata (time, user, IP, action, status) and a details pane, uses formatDate and actionBadgeClass, and can be closed by clicking the overlay or the Close button. Also add selectedRow state, row onClick handler and pointer cursor styling to enable the new interaction.

<!-- entry-separator -->

## 79033835 — Add scheduled tasks (backup & restart)

**Author**: Kitzunu | **Date**: 2026-04-02 17:09:54 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/79033835377638dc0fe65cc20740ef21dc31eeb4

Introduce a scheduled tasks system to automate database backups and server restarts. Adds a backend scheduler (backend/scheduler.js) that checks tasks every minute, task REST endpoints (backend/routes/scheduledTasks.js) with Run Now support, and integrates the scheduler and routes into server.js. Creates a scheduled_tasks table (sql/acore_dashboard.sql) and a frontend UI to manage tasks (frontend/src/components/ScheduledTasksPage.jsx) plus API bindings (frontend/src/api.js). Also updates README and .env.example with backup configuration, and ignores the backups/ folder in .gitignore. Tasks are audited, can run mysqldump (configurable via MYSQLDUMP_PATH and BACKUP_PATH), and use processManager to handle restarts.

<!-- entry-separator -->

## 8e51fa55 — Validate config keys when computing diffs

**Author**: Kitzunu | **Date**: 2026-04-02 16:28:44 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/8e51fa5582a0ce43922da47c5334363cd3a3cd28

Replace the loose regex-based parsing with a stricter key validator and a small parseKV helper. Keys are now validated against /^[A-Za-z][A-Za-z0-9_.]*$/ and lines without '=' or with invalid keys are ignored. This makes the diff summary generation more robust by avoiding accidental matches of non-KV lines and ensuring trimmed key/value extraction for both old and new content.

<!-- entry-separator -->

## 06aaff2d — Add mutes management (API + UI)

**Author**: Kitzunu | **Date**: 2026-04-02 16:19:25 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/06aaff2d1b2e572f72cea4bfe1db6ae3ca30cf84

Introduce account mutes management: add a new backend route (backend/routes/mutes.js) exposing GET /api/mutes (list active mutes, GM level 2) and DELETE /api/mutes/:id (unmute by account id, GM level 3) which clears mutetime and records an audit entry. Register the route in backend/server.js. On the frontend, add api methods (getMutes, unmute), a new MutesPage React component with modals to issue and confirm unmute actions, and wire the page into the app layout/navigation. Update README to include Mutes in the feature list and tree. This change provides UI and API integration to view, issue, and revoke account mutes.

*closes https://github.com/Kitzunu/Dashboard/issues/34

<!-- entry-separator -->

## 37de053a — Add account flags admin UI and API

**Author**: Kitzunu | **Date**: 2026-04-02 16:15:17 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/37de053ae382d376af7ee493a3013b33e28981f4

Expose and manage account Flags: include Flags in account GET, add PATCH /api/accounts/:id/flags (require GM level 3) with validation and audit logging, and add frontend support (api.setAccountFlags). Implement UI in AccountDetailModal to view/toggle known flag bits with save/discard flow and busy states, plus accompanying CSS. Update README to mention Account Flags.

*closes https://github.com/Kitzunu/Dashboard/issues/32

<!-- entry-separator -->

## 53c25d88 — Bump express to ^5.2.1

**Author**: Kitzunu | **Date**: 2026-04-02 15:26:10 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/53c25d8845cee96b77e957832d232426e7cf2b46

Upgrade Express dependency from ^4.19.2 to ^5.2.1 in backend/package.json and regenerate package-lock.json. The lockfile shows extensive dependency updates (body-parser, content-disposition, debug, type-is, path-to-regexp, send, serve-static, etc.) and newer engine requirements (Node >=18). Run npm install and test the backend for any breaking changes introduced by Express v5 and the updated transitive dependencies.

<!-- entry-separator -->

## 8d60bda8 — Silence dotenv logs and bump dotenv to v17

**Author**: Kitzunu | **Date**: 2026-04-02 15:23:31 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/8d60bda8b4148e51e911e5f8ed10b0f223ce17c0

Add quiet: true to dotenv.config calls in backend/audit.js, backend/db.js, and backend/server.js to suppress dotenv startup messages. Also bump dotenv dependency to ^17.4.0 in package.json and update package-lock.json accordingly.

<!-- entry-separator -->

## a40f4b1a — Bump react and react-dom to 19.2.4

**Author**: Kitzunu | **Date**: 2026-04-02 15:05:36 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/a40f4b1a65cad8dc5999938aa3408fd4d3eedd3c

Upgrade frontend React dependencies to ^19.2.4 in package.json and update package-lock.json to reflect the new dependency tree. The lockfile now includes updated scheduler and peer dependency versions and removes some obsolete transient entries. Run npm install to apply the changes locally.

<!-- entry-separator -->

## b1310ce7 — Upgrade @vitejs/plugin-react to ^6.0.1

**Author**: Kitzunu | **Date**: 2026-04-02 15:03:57 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/b1310ce7fd146f8340c17c3b75e37734bbde0af3

Bump devDependency @vitejs/plugin-react from ^4.3.1 to ^6.0.1 and regenerate frontend/package-lock.json. Run npm install and verify the build and Node-version compatibility after the major plugin upgrade.

<!-- entry-separator -->

## 46c6fc90 — Bump concurrently to ^9.2.1

**Author**: Kitzunu | **Date**: 2026-04-02 15:00:51 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/46c6fc9091bc09cda0b5bebd730c8ecf4034a14d

Upgrade devDependency 'concurrently' from ^8.2.2 to ^9.2.1 in package.json and update package-lock.json accordingly. The lockfile was regenerated to reflect the new concurrently version, updated transitive dependency versions and metadata (resolved URL, integrity) and the updated engine requirement.

<!-- entry-separator -->

## b948139b — Bump express-rate-limit to 8.3.2 in lockfile

**Author**: Kitzunu | **Date**: 2026-04-02 14:58:19 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/b948139bf765e7a0005cc54c18de8504d6cb81e2

Update backend/package-lock.json to use express-rate-limit@8.3.2 — updates version, resolved tarball URL, integrity hash, and adds the MIT license field. No source code changes.

<!-- entry-separator -->

## acfafd03 — Bump lodash to 4.18.1

**Author**: Kitzunu | **Date**: 2026-04-02 14:41:23 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/acfafd0309fc48b537af6f2ef1a25315d0753fc8

CVE-2026-4800
CVE-2026-2950

<!-- entry-separator -->

## 594ab12d — Add mute toggle for browser alert notifications

**Author**: Kitzunu | **Date**: 2026-04-02 13:14:37 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/594ab12d1613c21772e6b8d51fd709dbc7624725

Make browser alert notifications user-controllable. NotificationBell now accepts enabled and onToggle props and renders toggle buttons (🔔/🔕) with appropriate titles. HomePage gains notifEnabled state persisted to localStorage (defaults to enabled unless explicitly 'false'), plus notifEnabledRef to avoid stale closures. A handleToggleNotif handler updates state, localStorage, and shows a toast. checkAlerts now checks notifEnabledRef before calling fireNotification. Minor effect syncs added to keep refs up-to-date and NotificationBell is passed the new props.

<!-- entry-separator -->

## 7ce7ee6c — Add standalone server agent and bridge

**Author**: Kitzunu | **Date**: 2026-04-02 13:09:35 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/7ce7ee6c6eda734d1f23760c255f0df2124e2323

Decouple game server lifecycle from the dashboard by introducing a standalone server agent (backend/serverAgent.js) that owns worldserver/authserver processes and exposes a small HTTP API + SSE stream. Add serverBridge (backend/serverBridge.js) which connects to the agent's SSE stream and forwards events to frontend Socket.IO clients. Convert processManager to an async HTTP client proxying management calls to the agent, preserve old API (setIO kept as no-op) and add getAllStatus/getLogs async calls. Update backend routes to await processManager methods and initialize the bridge in server.js. Frontend: show dashboard connectivity card and handle agent connected/disconnected state. Add AGENT_PORT and AGENT_SECRET to .env.example and start:server-agent npm script; update README with usage and behavior notes. Security: agent requests require X-Agent-Token header.

<!-- entry-separator -->

## 217468db — Remove expansions 3-6 from EXPANSION_LABELS

**Author**: Kitzunu | **Date**: 2026-04-02 12:45:43 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/217468dbc1408da690cf60917e116310d1ce2374

Prune EXPANSION_LABELS to include only Classic, The Burning Crusade, and Wrath of the Lich King by removing entries for Cataclysm, Mists of Pandaria, Warlords of Draenor, and Legion. This narrows the supported/Displayed expansions in the accounts UI to the first three entries.

* closes https://github.com/Kitzunu/Dashboard/issues/31

<!-- entry-separator -->

## 8247d2d9 — Support recursive CONFIG_PATH and subdir configs

**Author**: Kitzunu | **Date**: 2026-04-02 12:41:10 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/8247d2d908a80a1cbb6c86ffcf843afef6f6e64e

Load .conf files recursively from CONFIG_PATH (including subdirectories) and expose them as forward-slash relative keys without the .conf extension. Implemented walkDir to collect files, updated getConfigMap to use it, and changed backend routes to accept config names with slashes via regex routes and use the captured name for reads/saves and audit logs. Updated .env.example and README to document recursive CONFIG_PATH behavior and precedence over exe-derived files. Frontend now shows a clear error when no config files are found and suggests setting CONFIG_PATH.

*closes https://github.com/Kitzunu/Dashboard/issues/29

<!-- entry-separator -->

## ebe9d12b — DB query UI: presets, editor, pagination

**Author**: Kitzunu | **Date**: 2026-04-02 12:24:31 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/ebe9d12b2c70440c11f11adf52da9c1e89675fdd

Enhance DB Query UI and README: add free-form SQL editor with Ctrl+Enter run, preset-to-editor loading, and a database selector. Implement runQuery/handlePreset/handleRun logic and track query, database, pagination (page, pageSize, pageInput) state to support paged results and an "All" option; add prev/next, page jump input, and page-size selector. Update CSS to improve table layout and style the results table and page-jump input. README updated to document presets, free-form editing, supported query types, Ctrl+Enter shortcut, and audit logging.

* closes https://github.com/Kitzunu/Dashboard/issues/20

<!-- entry-separator -->

## b57dec7f — Restrict GM level dropdown for high-level accounts

**Author**: Kitzunu | **Date**: 2026-04-02 12:10:16 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/b57dec7fcddae7caf881868621ca6ffdce78b66b

Update AccountsPage.jsx to only render the GM Level <select> when the user canAdmin and the account's gmlevel (defaulting to 0) is less than 4. This prevents showing/editing the dropdown for accounts with gmlevel >= 4 while preserving the existing value/default handling and disabled state.

* closes https://github.com/Kitzunu/Dashboard/issues/33

<!-- entry-separator -->

## cd44b66e — Extract shared constants into constants.js

**Author**: Kitzunu | **Date**: 2026-04-02 12:08:03 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/cd44b66e476c85790d0f009810add07f4748eff5

Move FALLBACK_RACES, FALLBACK_CLASSES, and GM_LABELS into a new frontend/src/constants.js and update AccountsPage, PlayersPage, and Layout to import them. Removes duplicated local definitions and centralizes common labels for reuse and easier maintenance.

<!-- entry-separator -->

## 031458cd — Add DBC race & class name support

**Author**: Kitzunu | **Date**: 2026-04-02 12:03:49 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/031458cd224c720d2276fb31b1004078a9f75b05

Load ChrRaces.dbc and ChrClasses.dbc and expose race/class lookups to the app. Backend: added loadRaceNames/loadClassNames, getters (getRaceName/getClassName/getAllRaces/getAllClasses), updated init to eager-load the tables and exported the new functions; routes added /api/dbc/races and /api/dbc/classes and status now reports race/class counts. Frontend: added api calls for races/classes and updated PlayersPage and AccountsPage to fetch DBC lookups at runtime and fall back to bundled static name maps (renamed to FALLBACK_RACES/FALLBACK_CLASSES). README: document the additional required DBC files (ChrRaces.dbc, ChrClasses.dbc) and update descriptions.

*closes https://github.com/Kitzunu/Dashboard/issues/30

<!-- entry-separator -->

## 5ea0292e — Add dashboard settings subsystem and UI

**Author**: Kitzunu | **Date**: 2026-04-01 18:54:35 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/5ea0292ee58b0655e49a08f6c52cef1dd41b4895

Introduce a dashboard-wide settings feature stored in acore_dashboard.settings. Adds SQL migration and creates the settings table in audit initialization. Implements backend module (backend/dashboardSettings.js) and REST routes (backend/routes/settingsRoutes.js) with audit logging on saves and mounts /api/settings in the server. Integrates the config editor to respect the config.bak_enabled setting before creating .bak backups. Exposes getSettings/saveSettings in the frontend API and adds a new Settings page component, navigation entry, and styles (frontend/src/components/SettingsPage.jsx, Layout.jsx, api.js, index.css). README updated to document the Settings area.

<!-- entry-separator -->

## c6fdc6d4 — Increase JSON limit to 10MB; extend graphMinutes

**Author**: Kitzunu | **Date**: 2026-04-01 18:47:36 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/c6fdc6d428ccff8933626edebe2bdcd2f05d9282

Raise Express JSON body parser limit to 10MB in backend/server.js to allow larger request payloads (e.g., bigger telemetry or uploads). Also change graphMinutes from 1 to 60 in backend/thresholds.json to extend the monitoring graph window to the last hour.

<!-- entry-separator -->

## 3563d6cf — Add resource history and rolling graphs

**Author**: Kitzunu | **Date**: 2026-04-01 18:41:30 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/3563d6cffd6e739c7bb5c4b36c9480777971dec8

Collect and display CPU/memory usage history and add configurable graphing. Backend: add resourceHistory module, poll OS CPU/memory every 30s (uses brief 200ms snapshot delta to compute CPU%) and store a 120-point rolling buffer; expose filtered history via /api/overview using thresholds.graphMinutes. Extend thresholds to include graphMinutes (default 60) with validation and update thresholds.json. Frontend: replace single-value resource bars with ResourceGraph SVG components that render a rolling area/line graph, add Graph history setting to Thresholds UI (saves graphMinutes), wire overview to use resourceHistory, and add related CSS. README updated to mention rolling 60-minute history graphs.

* closes https://github.com/Kitzunu/Dashboard/issues/26

<!-- entry-separator -->

## a4ab7c87 — Pass 'manual' to logout and adjust threshold panel

**Author**: Kitzunu | **Date**: 2026-04-01 18:28:37 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/a4ab7c870947f4a6acefcf35433e3f70b630c6b1

Call logout with a 'manual' argument when the user clicks the Logout button so the app can distinguish manual sign-outs. Update .threshold-settings/.threshold-panel styles to render the panel as an absolutely positioned dropdown anchored to the toggle (position, top/right, z-index), switch background to var(--surface), and add a box-shadow; remove the previous flex-based layout so the panel overlays content correctly.

*closes https://github.com/Kitzunu/Dashboard/issues/27

<!-- entry-separator -->

## 2e460c99 — Send logout reason to server and log it

**Author**: Kitzunu | **Date**: 2026-04-01 18:11:37 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/2e460c999dbed6fe1d61621fef3d9c686de9a2b5

Pass a logout reason from the frontend to the backend for improved audit logging. Backend: auth/logout now reads req.body.reason and records 'idle_timeout' or falls back to 'manual' when calling logAudit. Frontend: api.logout accepts an optional reason and App.logout defaults to 'manual'. Layout uses onLogout('idle_timeout') for idle timeouts and explicitly sends 'manual' for the logout button. This allows distinguishing user-initiated logouts from idle timeouts in audit records.

*closes https://github.com/Kitzunu/Dashboard/issues/28

<!-- entry-separator -->

## 5f4b2b5e — Add configurable session idle timeout

**Author**: Kitzunu | **Date**: 2026-03-31 23:46:49 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/5f4b2b5ed3b9091127c3e01c6ff65cece420cafd

Introduce an IDLE_TIMEOUT_MINUTES setting and implement client/server handling for idle session auto-logout. Added the env var to .env.example and documented behavior in README (60s warning, activity resets timer, value is sent to the frontend at login). Backend: include idleTimeoutMinutes in the /login response. Frontend: new useIdleTimeout hook in Layout.jsx to track activity, show a 60-second warning modal, and auto-logout when the timeout elapses; includes small debounce on activity events. Also added CSS for the idle warning modal.

<!-- entry-separator -->

## 00944617 — Add audit logging and Audit Log UI

**Author**: Kitzunu | **Date**: 2026-03-31 23:24:56 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/009446172b18657cc75c7ec4029ba5d2b146de1b

Introduce a new audit logging system and UI. Adds backend audit helper (backend/audit.js) that auto-creates/connects to a separate acore_dashboard DB, provides logAudit/audit helpers, exposes a pool getter and starts a configurable retention purge job. Adds an audit log read endpoint (backend/routes/auditLogRoutes.js) with pagination, filters and search. Wire audit() / logAudit() calls into many existing routes (accounts, bans, announcements, autobroadcast, bugreports, channels, config, console, db queries, mail, mailserver, servers, servertools, spamreports, auth login/logout, etc.) so actions are recorded. Export a dashboard DB pool from backend/db.js and mount the audit route & retention job in backend/server.js.

Frontend: add api.getAuditLog, call logout endpoint on logout, and add the Audit Log page component (frontend/src/components/AuditLogPage.jsx) with filters, action multi-select, paging and badges. Documentation and config: update .env.example (DASHBOARD_DB, AUDIT_LOG_RETENTION_DAYS), README with setup/usage and feature notes, and add a one-time SQL setup file (sql/acore_dashboard.sql). Audit writes are fire-and-forget (failures do not block main operations) and the retention job deletes old entries when configured.

<!-- entry-separator -->

## 47454808 — Add Spam Reports feature

**Author**: Kitzunu | **Date**: 2026-03-31 22:30:34 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/474548084ceaf274e426c48441be70c93489b284

Introduce a Spam Reports management feature across backend and frontend.

Backend: add routes/backend/routes/spamreports.js providing GET /api/spamreports (paginated, pageSize=25, filter by type, search by spammer name or description) and DELETE endpoints to remove a single report (GM level 2) or clear all reports (GM level 3). Routes join characters to show spammer names and return type labels. Register the new router in backend/server.js.

Frontend: add API methods (getSpamReports, deleteSpamReport, clearSpamReports) and a new SpamReportsPage component for listing, filtering, searching, sorting, pagination, and a detail modal. UI respects GM levels for delete/clear actions and parses chat report descriptions for display. Update Layout to include navigation and page mounting. Update README to document the feature and GM access. Minor CSS whitespace tweak.

<!-- entry-separator -->

## ad9cda5a — Add Channels management UI and API

**Author**: Kitzunu | **Date**: 2026-03-31 17:30:54 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/ad9cda5aefea732b6438ac97bbf4a39fb180c554

Implements a new Channels feature allowing browsing and management of in-game chat channels. Adds a backend route (backend/routes/channels.js) exposing list, detail, unban and delete endpoints with GM-level guards (view GM1, unban GM2, delete GM3) and defensive SQL fallbacks when optional tables are missing. Registers the route in backend/server.js at /api/channels. Exposes client API helpers in frontend/src/api.js and a full React ChannelsPage (frontend/src/components/ChannelsPage.jsx) with search, detail panel, channel config parsing, banned players list, unban/delete actions and GM-level UI gating. Updates layout to include navigation and route mounting, adds styling in frontend/src/index.css, and updates README.md to document the Channels feature and permissions.

*closes https://github.com/Kitzunu/Dashboard/issues/9

<!-- entry-separator -->

## b3ad6552 — Bug reports: add state, search, assignee & UI

**Author**: Kitzunu | **Date**: 2026-03-30 23:15:30 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/b3ad6552697ffd858d7f610c2f07b2c2b6ceec73

Backend: add support for state and search query params when listing bug reports; search splits terms and matches against JSON fields (character/zone/subject/etc.) and assignee. Include state, assignee and comment in list and detail responses and replace DELETE dismiss with a PATCH /api/bugreports/:id to update state/assignee/comment.

Frontend: update api client to accept state/search and add updateBugReport (PATCH). BugReportsPage UI: add Open/Closed tabs, type filter, server-side search input, sortable columns, client-side sorting, display assignee column, per-row close/reopen action, and pass canEdit to the detail modal. ReportDetailModal: refactor to support editing assignee/comment, close/reopen toggle, show state badge, and optimistic UI updates. CSS: add styles for admin fields. These changes improve admin workflow for triaging and managing FeedbackUI reports.

* closes https://github.com/Kitzunu/Dashboard/issues/16

<!-- entry-separator -->

## f7960e11 — Add pagination to account search

**Author**: Kitzunu | **Date**: 2026-03-30 22:51:56 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/f7960e113c17fab3c4da7d6bb825ee133e241929

Implement pagination for the accounts list (50 per page). Backend: add PAGE_SIZE, support ?page= on GET /api/accounts, count total results, use LIMIT/OFFSET and return rows plus pagination metadata (total, page, pageSize, totalPages). Frontend: update api.searchAccounts to accept page, AccountsPage loads accounts on mount, tracks page/total/totalPages, adjusts search flow/messages, adds Prev/Next controls and pagination CSS. README updated to document the new behavior and page controls.

<!-- entry-separator -->

## c65b9652 — Show 0 players when worldserver is down

**Author**: Kitzunu | **Date**: 2026-03-30 22:41:51 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/c65b9652a66d0674aca24f78e652ce5900a12f6b

* closes https://github.com/Kitzunu/Dashboard/issues/13

<!-- entry-separator -->

## a3168d82 — Improve server startup log messages

**Author**: Kitzunu | **Date**: 2026-03-30 22:38:51 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/a3168d82a7120fc57becaac402810a35ed9fe9be

* closes https://github.com/Kitzunu/Dashboard/issues/4

<!-- entry-separator -->

## 7dfbc551 — Allow staging items/conditions for new templates

**Author**: Kitzunu | **Date**: 2026-03-30 22:35:38 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/7dfbc551989899e40c4feb2b50d9baddff077ef9

Enable adding and removing Mail Server items and conditions while creating a new template by using temporary _key entries client-side. Batch-create staged items and conditions after the template is created (API calls made after receiving new template ID). Adjust UI: items/conditions tabs are available when creating a template, the Recipients tab is edit-only for existing templates, and Save/Create button is shown appropriately. Use id ?? _key as list keys and update add/delete flows to handle both staged and persisted entries. Also update README to document that recipients are edit-only and that items/conditions can be added before saving.

<!-- entry-separator -->

## 203f7bd7 — Introduce grouped sidebar navigation

**Author**: Kitzunu | **Date**: 2026-03-30 22:30:46 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/203f7bd7c1a6edcaab63959a7d9ef675620be600

* closes https://github.com/Kitzunu/Dashboard/issues/15

<!-- entry-separator -->

## 2f2d7ecf — Update README: expanded features, config, and structure

**Author**: Kitzunu | **Date**: 2026-03-30 22:17:47 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/2f2d7ecf536d0d32fb430c9bc4d856d4a3c25b36

Rework README to reflect new features, reorganize setup and configuration, and document project structure. Expanded the Features section with detailed Overview, Console, Players, Tickets, Mail, Mail Server, Lag/Bug reports, Servers, DB Query, Config, and Alerts (thresholds and notifications). Added a dedicated Configuration section with env examples (server paths, CONFIG_PATH, DB, JWT, ALLOWED_IPS, DBC_PATH) and a note on generating a strong JWT_SECRET. Clarified startup instructions and access-level (GM) table, and updated DBC integration and console/lag handling notes. Updated Project Structure to list new/renamed backend routes, threshold persistence (thresholds.json), and frontend components; trimmed and clarified various descriptions and defaults throughout.

<!-- entry-separator -->

## 88d14c4e — Support CONFIG_PATH and async config lookup

**Author**: Kitzunu | **Date**: 2026-03-30 22:09:24 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/88d14c4e9f36302028b8d6b31399eee9fc09e33a

* closes https://github.com/Kitzunu/Dashboard/issues/21

<!-- entry-separator -->

## 902be6e7 — Revert "Default Vite backend URL to 0.0.0.0 rather than localhost. (#3)"

**Author**: Kitzunu | **Date**: 2026-03-30 21:59:29 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/902be6e76765bdeba9385733f3d0bc677dc11ba5

This reverts commit 5ba2c8123347112e7ae2938236d58d610b793304.

<!-- entry-separator -->

## fae9fb7f — Remove .server prefix from announcement commands

**Author**: Kitzunu | **Date**: 2026-03-30 20:28:15 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/fae9fb7f134a7fa57e92d7cb8b64c973f7a90b5c

* closes https://github.com/Kitzunu/Dashboard/issues/18

<!-- entry-separator -->

## e933eb13 — Add data and framework to show more content for bug report view. (#22)

**Author**: Benjamin Jackson | **Date**: 2026-03-30 20:25:08 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/e933eb137e1d8d284e2257c6a881f12bf6596acb

Init.

<!-- entry-separator -->

## 5ba2c812 — Default Vite backend URL to 0.0.0.0 rather than localhost. (#3)

**Author**: Benjamin Jackson | **Date**: 2026-03-30 20:23:18 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/5ba2c8123347112e7ae2938236d58d610b793304

* Init.

* Socket.

<!-- entry-separator -->

## 5f570a22 — Add explicit backend listening address. (#2)

**Author**: Benjamin Jackson | **Date**: 2026-03-30 20:22:05 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/5f570a22f3426279d1d2e0476b0d6a0e83322df6

* Init.

* dummy

<!-- entry-separator -->

## 4da86224 — Add explicit address to vite configuration. (#1)

**Author**: Benjamin Jackson | **Date**: 2026-03-30 20:20:51 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/4da86224f2bc5af1ca3f8d39ec906ab6c9073c7e

* Init.

* dummy

* double dummy

<!-- entry-separator -->

## ff4b5cf0 — Bump esbuild and vite in /frontend (#17)

**Author**: dependabot[bot] | **Date**: 2026-03-30 20:19:06 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/ff4b5cf07bcc8331d34f81d36eb43f464ca970df

Removes [esbuild](https://github.com/evanw/esbuild). It's no longer used after updating ancestor dependency [vite](https://github.com/vitejs/vite/tree/HEAD/packages/vite). These dependencies need to be updated together.


Removes `esbuild`

Updates `vite` from 5.4.21 to 8.0.3
- [Release notes](https://github.com/vitejs/vite/releases)
- [Changelog](https://github.com/vitejs/vite/blob/main/packages/vite/CHANGELOG.md)
- [Commits](https://github.com/vitejs/vite/commits/create-vite@8.0.3/packages/vite)

---
updated-dependencies:
- dependency-name: esbuild
  dependency-version: 
  dependency-type: indirect
- dependency-name: vite
  dependency-version: 8.0.3
  dependency-type: direct:development
...

Signed-off-by: dependabot[bot] <support@github.com>
Co-authored-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>

<!-- entry-separator -->

## 716622f6 — Init. (#14)

**Author**: Benjamin Jackson | **Date**: 2026-03-29 23:41:26 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/716622f6e5a05a458d1158c57ed810ff95e6a140

<!-- entry-separator -->

## 40ef0d32 — Add worldserver latency monitor and UI

**Author**: Kitzunu | **Date**: 2026-03-29 22:42:41 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/40ef0d322d7f20b6aa0c6c2c9e647e83959b893c

Introduce a TCP-based latency monitor for the worldserver and surface stats in the UI. Added backend/latencyMonitor.js which measures TCP round-trip time (uses process.hrtime.bigint for precision), keeps a rolling window (max 120 samples ≈ 60 min), and computes mean/median/P95/P99/max. It skips unreachable hosts and is configurable via WORLDSERVER_HOST and WORLDSERVER_PORT (defaults to 127.0.0.1:8085) with a 3s timeout. Server now starts the monitor (poll every 30s) and the overview route exposes serverLatency. Frontend: added a LatencyPanel to HomePage.jsx to display count, mean, median, P95, P99 and max with colour-coding, and corresponding CSS styling in index.css. Documentation and .env.example updated to mention the new env vars and the latency metric.

<!-- entry-separator -->

## 2a584a7d — Clarify README .env examples and add DBC_PATH

**Author**: Kitzunu | **Date**: 2026-03-29 21:54:13 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/2a584a7d5f522c6020e025d72eac37328eb59a59

Update README .env example to clarify AzerothCore executable/config paths and add optional working-directory variables (WORLDSERVER_DIR/AUTHSERVER_DIR). Improve wording for config file behavior, move PORT/FRONTEND_URL grouping, expand ALLOWED_IPS docs with examples, and add a new DBC_PATH entry with platform examples for WotLK DBFilesClient. Also remind users to set a strong JWT_SECRET and include small wording/formatting tweaks for clarity.

<!-- entry-separator -->

## ce978feb — Batch console lines, memoize AnsiLine

**Author**: Kitzunu | **Date**: 2026-03-29 21:49:56 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/ce978febc90eef6062397da5527fb672e032b046

Memoize AnsiLine to avoid re-renders unless text changes. Buffer incoming console lines and flush them once per animation frame (requestAnimationFrame) to reduce state updates and rendering overhead, with a 2000-line cap preserved. Replace scrollIntoView with direct scrollTop assignment for auto-scroll to avoid layout thrashing, remove the endRef, and cancel any pending RAF on unmount. Also add refs and effects to keep autoScroll state accessible inside the RAF flush callback.

<!-- entry-separator -->

## cac9a666 — Resolve player zone names via DBC

**Author**: Kitzunu | **Date**: 2026-03-29 21:46:42 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/cac9a6660ed3d780b3253b7f1543db346e8c4a88

Lookup area names on the backend using the dbc module and include a zoneName field in the players API response (falls back to null/raw zone ID when not available). Remove the large hardcoded ZONES map from the frontend and display p.zoneName (or p.zone if unresolved). Update README to document that zones are resolved from AreaTable.dbc when DBC_PATH is configured.

<!-- entry-separator -->

## 0902aa9a — Add DBC lookup support and UI integration

**Author**: Kitzunu | **Date**: 2026-03-29 21:44:23 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/0902aa9a19477553a7811558a529358dcb1c0f54

Add optional WotLK (3.3.5a) DBC support to resolve map/area IDs to human-readable names in lag reports. Introduces a lightweight DBC binary parser (backend/dbc.js) that reads Map.dbc and AreaTable.dbc, new API routes (/api/dbc/maps, /api/dbc/areas, /api/dbc/status) with GM-level auth, and server initialization to pre-load tables when DBC_PATH is configured. Update lag reports endpoints to include mapName (and topMaps.mapName) and update the frontend (api.js + LagReportsPage.jsx) to fetch/use DBC data and display resolved map names with a MapCell fallback of "Map {id}" when DBC data is unavailable. Documentation (.env.example, README.md) updated with DBC_PATH examples and behavior notes. Also includes small UI/code cleanups in LagReportsPage (formatting, state grouping, stats fields) and wires authentication for the new routes. Gracefully falls back when DBC files or DBC_PATH are not present.

<!-- entry-separator -->

## d8c3141a — Update inputs and modal/form layout styles

**Author**: Kitzunu | **Date**: 2026-03-29 21:16:06 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/d8c3141ac4fa8116204f466fbc1f37bb904fcbf2

Expand input selectors (number, email, search, unnamed inputs) and switch input background to --surface2 for consistent surface styling. Add structured modal header/footer (.modal-header, .modal-title, .modal-close, .modal-footer) and related close-button hover states for tabbed/modal layouts. Adjust code container and bug-report-detail padding/overflow to improve layout, convert ms-money-row to a column layout and refine ms-money-label typography. Introduce generic .form-row and .form-label helpers and consolidate shared form styling for better spacing and responsive behavior.

<!-- entry-separator -->

## d46834cf — Add Mail Server templates UI and API

**Author**: Kitzunu | **Date**: 2026-03-29 21:11:23 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/d46834cf463b81bd86a10528e2d9a697757da244

Implements a Mail Server templates feature: adds backend API routes (backend/routes/mailserver.js) for full CRUD of templates, items, conditions and recipients with GM-level access checks, and wires the router into backend/server.js. Adds frontend support (frontend/src/api.js) and a new MailServerPage.jsx component with modal editor (General / Items / Conditions / Recipients), list view, delete confirmation, and related styles (frontend/src/index.css). Updates Layout.jsx to expose the page in the nav and documents the feature in README.md.

<!-- entry-separator -->

## 1ea128b2 — Add browser alert notifications; bump thresholds

**Author**: Kitzunu | **Date**: 2026-03-29 21:00:34 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/1ea128b2b99fc5cfb24ab6828fef68e4fe61459d

Introduce browser alert notifications and a notification bell in the Overview header. Implements Web Audio API two-tone beeps (ascending for CPU, descending for memory), Notification API usage (permission request, granted/denied states, tagged notifications to replace same-type alerts) and fires alerts once on threshold crossing. Adds UI (bell button, status indicators) and CSS for the header controls. Also refactors HomePage to use refs for thresholds and alert state to avoid stale closures and to check alert transitions during polling. Update backend/thresholds.json defaults to 100% for CPU and memory and update README to document the new notification behavior.

<!-- entry-separator -->

## e73c92f6 — Add Lag Reports feature (frontend + backend)

**Author**: Kitzunu | **Date**: 2026-03-29 20:55:01 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/e73c92f6cf78f2f72137da3aef15e91f98b878ca

Add full Lag Reports support: new backend route (backend/routes/lagreports.js) with paginated listing (50/page), aggregate stats, top reporters/maps, and delete endpoints (view GM1, dismiss GM2, clear-all GM3). Mount the route in backend/server.js. Improve bug report parsing (parseContent) to handle bare keys and tab-indented continuation lines. Frontend: new LagReportsPage component, API methods (getLagReports, getLagStats, deleteLagReport, clearLagReports), Layout navigation entry, and CSS styles for stats, badges, filters, tables, and latency colouring. Update README to document the new Lag Reports functionality.

<!-- entry-separator -->

## bd5763bb — Add Bug Reports UI, API, and backend

**Author**: Kitzunu | **Date**: 2026-03-29 20:43:06 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/bd5763bbbee1fe14cf68bfb0d3338b5a0fabdddf

Introduce a full Bug Reports feature: backend route (backend/routes/bugreports.js) exposing paginated list, detail, and DELETE endpoints (requireGMLevel 1 for viewing, 2 for dismissing). Register routes in backend/server.js. Add frontend API helpers (frontend/src/api.js), new BugReportsPage component (frontend/src/components/BugReportsPage.jsx), layout/nav entry, and accompanying CSS (frontend/src/index.css) for listing, filtering, detail modal, and dismissing reports (25 per page, filter by type). Update README.md with feature docs and usage notes. Also modify thresholds.json CPU/memory values (cpu: 80→15, memory: 80→50).

<!-- entry-separator -->

## 95b4c87d — Add resource alerts and threshold settings

**Author**: Kitzunu | **Date**: 2026-03-29 20:31:32 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/95b4c87dcf916a22b93e1e57e85dbcd6db48852b

Introduce configurable CPU and memory alert thresholds persisted to backend/thresholds.json and surfaced in the UI. Backend: add thresholds module (load/save) and thresholds.json, new /api/thresholds GET/PUT routes (GM auth), sample CPU usage across cores (200ms) and include memPct/cpuUsage and thresholds in the overview response. Frontend: API helpers for thresholds, new ThresholdSettings and ResourceBar components (replace old MemoryBar) to show memory and CPU bars with warn/critical coloring, save thresholds from the UI, and make core revision a clickable GitHub commit link. Update README and styles (index.css) to document and style the new controls and warnings.

<!-- entry-separator -->

## ddc2504e — Clarify 'text' mail type hint

**Author**: Kitzunu | **Date**: 2026-03-29 13:38:34 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/ddc2504ea617308a8a8f1684b86c7692d6e33117

Update the helper text in MailPage.jsx for the 'text' mail type to indicate it uses the "send mail" command instead of the incorrect "server set motd" command. This corrects the user-facing hint to avoid confusion about which server command is used for plain mail messages.

<!-- entry-separator -->

## 3b9dc1ef — Accounts: expansion, email, ban, mute, delete

**Author**: Kitzunu | **Date**: 2026-03-29 11:33:43 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/3b9dc1efe80f86c4cddd87184f6212cc0aebf30b

Add several account management features and UI for GM tools. Backend: include account.expansion in queries, fix result variable naming, add endpoints to set expansion (PATCH /api/accounts/:id/expansion), update account email (PATCH /api/accounts/:id/email), delete accounts via GM command (DELETE /api/accounts/:id), and mute/unmute characters (POST /api/accounts/mute, POST /api/accounts/unmute). Also normalize processManager commands (remove leading dot) and ensure parseInt calls use radix. Frontend: expose new API methods (setExpansion, setEmail, deleteAccount, muteCharacter, unmuteCharacter) and add UI support — expansion labels/select, playtime column, DeleteAccount, EditEmail, Ban and Mute modals, mute/unmute actions per character, and assorted UI/formatting tweaks. README updated to document the new capabilities (expansion, email edit, bans, resets, delete, mute).

<!-- entry-separator -->

## 579f11b7 — Add Mail and Server Tools UI and API

**Author**: Kitzunu | **Date**: 2026-03-29 11:19:48 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/579f11b77ad10278966128ba9a00efa5ad5a4246

Introduce in-dashboard tools for sending in-game mail/items/money and managing server-level actions. Backend: add /api/mail and /api/servertools routes (send mail/items/money, get/set MOTD, schedule/cancel restart) with GM-level guards and DB queries for MOTD/version; register routes in server.js. Frontend: add MailPage, integrate mail nav item, add API helpers (sendMail/sendMailItems/sendMailMoney/getMOTD/setMOTD/restartServer/cancelRestart), extend ServersPage with Scheduled Restart and MOTD sections, and display MOTD/version on HomePage. UI: add CSS for mail, MOTD, restart, and version blocks. Docs: update README to document Send Mail, Servers (scheduled restart & MOTD), IP allowlist env var, roles, and file layout changes.

<!-- entry-separator -->

## 8b56b5e0 — Add IP allowlist middleware

**Author**: Kitzunu | **Date**: 2026-03-29 10:47:30 +0200 | **Link**: https://github.com/Kitzunu/Dashboard/commit/8b56b5e010da255810764d7144cef648275c77f6

Introduce backend/middleware/ipAllowlist.js to restrict access by IP using an ALLOWED_IPS env var (comma-separated). The middleware defaults to localhost (::1, 127.0.0.1 and ::ffff:127.0.0.1), expands IPv4 entries to their IPv6-mapped form, checks req.ip (falling back to socket address), logs blocked attempts, and returns 403 for non-allowlisted IPs. Wire the middleware into backend/server.js (app.use(ipAllowlist)) and update .env.example with ALLOWED_IPS documentation and a default value.

<!-- entry-separator -->

## 6802300e — Remove GitHub Pages workflow and update templates

**Author**: Kitzunu | **Date**: 2026-03-29 01:22:43 +0100 | **Link**: https://github.com/Kitzunu/Dashboard/commit/6802300ee1f53d51cda0b6772c0c1f47a7c4b544

Delete the .github/workflows/static.yml workflow that built and deployed the frontend to GitHub Pages. Also trim the AnnouncePage templates by removing the 'Server is back online!' and 'Welcome to the server!' messages to keep the announcement list focused.

<!-- entry-separator -->

## 05018b7e — Update working directory for frontend build steps

**Author**: Kitzunu | **Date**: 2026-03-29 01:13:54 +0100 | **Link**: https://github.com/Kitzunu/Dashboard/commit/05018b7ee4d553ce84877fc2926a252ff32303fa

<!-- entry-separator -->

## 03a7e237 — Enhance deployment workflow for static content

**Author**: Kitzunu | **Date**: 2026-03-29 01:11:48 +0100 | **Link**: https://github.com/Kitzunu/Dashboard/commit/03a7e23769b53a81cbeef89160b894903e506883

Updated the GitHub Actions workflow to include Node.js setup, install dependencies, and build the project before deployment.

<!-- entry-separator -->

## bd59a105 — Update artifact upload path in static.yml

**Author**: Kitzunu | **Date**: 2026-03-29 01:08:56 +0100 | **Link**: https://github.com/Kitzunu/Dashboard/commit/bd59a105f77c7115e3a9fc10f32e236b3da2069e

Change artifact upload path to './frontend' for GitHub Pages deployment.

<!-- entry-separator -->

## bc2a5dc7 — Add GitHub Actions workflow for GitHub Pages deployment

**Author**: Kitzunu | **Date**: 2026-03-29 01:06:37 +0100 | **Link**: https://github.com/Kitzunu/Dashboard/commit/bc2a5dc79603ebfbab7f73966464fec8cf72da1e

This workflow automates the deployment of static content to GitHub Pages on pushes to the master branch or manually via the Actions tab.

<!-- entry-separator -->

## 568309dc — Use authPool for autobroadcast routes

**Author**: Kitzunu | **Date**: 2026-03-29 00:59:53 +0100 | **Link**: https://github.com/Kitzunu/Dashboard/commit/568309dc78ea3add0d4cd70349060a3889828c4e

Replace worldPool with authPool in backend/routes/autobroadcast.js so all CRUD queries (GET, POST, PUT, DELETE) use the correct database connection. This ensures the autobroadcast endpoints operate against the intended auth database pool and fixes inconsistent pool usage.

<!-- entry-separator -->

## 49963a9e — Add overview, announcements & account tools

**Author**: Kitzunu | **Date**: 2026-03-29 00:47:37 +0100 | **Link**: https://github.com/Kitzunu/Dashboard/commit/49963a9e9f2522733de5431782227ca737443121

Introduce backend and frontend support for an Overview dashboard, Announcements, Accounts management, and Autobroadcast features. Adds new backend modules and routes: playerHistory (rolling history, max 120 points), overview, announcements (in-memory history, max 50), accounts (search, detail, GM level, lock, password, create) and autobroadcast (CRUD). processManager now records start times and exposes pid/startTime; server polls player count every 30s and records it to playerHistory. Frontend api endpoints added and new React pages/components (AccountsPage, AnnouncePage, AutobroadcastPage, HomePage) plus layout/style tweaks. All routes are protected with requireGMLevel checks and database interactions use existing pools.

<!-- entry-separator -->

## c72cc885 — Add in-browser config editor and API

**Author**: Kitzunu | **Date**: 2026-03-29 00:35:17 +0100 | **Link**: https://github.com/Kitzunu/Dashboard/commit/c72cc885ca23a0922e892cfa615c417c49112574

Introduce a new config editor feature for administrators: adds a backend route (backend/routes/config.js) exposing list/read/save endpoints for worldserver/authserver config files (requires GM level 3). Server now mounts the config routes (backend/server.js). Frontend: new API methods, a full ConfigPage component (frontend/src/components/ConfigPage.jsx), navigation entry and page wiring (Layout.jsx), and editor styles (index.css). README and .env.example updated to document optional WORLDSERVER_CONF/AUTHSERVER_CONF env vars; backend falls back to deriving .conf paths from the executable paths. Saving creates a .bak backup before writing; basic search, line numbers, unsaved-change indicators, and discard/save confirmations are provided in the UI.

<!-- entry-separator -->

## 8ac51146 — Expand README with features, pages, and architecture

**Author**: Kitzunu | **Date**: 2026-03-29 00:21:16 +0100 | **Link**: https://github.com/Kitzunu/Dashboard/commit/8ac511463a496e457a0d32f7c786a492a89bb4a3

Significantly enrich README: document new dashboard features (ANSI-colored console, persistent command history, player filters, multi-type bans, GM ticketing, toast notifications, session management, auto-restart, detailed server shutdown options), add a new Pages section describing Console, Players, Tickets, Bans, Servers and DB Query behavior, and clarify authentication (SRP6 verifier) and login rate limiting. Update GM role table and project structure to reflect new backend routes (tickets, multi-type bans, auto-restart, enhanced auth) and new frontend components/utilities (TicketsPage, ansi parser, improved API and toast handling). Also clarify process lifecycle, graceful shutdown behavior, and add credits. These docs changes align README with implemented backend/frontend features and runtime behavior.

<!-- entry-separator -->

## 757fb2b4 — Add GM tickets UI and API

**Author**: Kitzunu | **Date**: 2026-03-29 00:16:16 +0100 | **Link**: https://github.com/Kitzunu/Dashboard/commit/757fb2b431ac5c124e43d3ad515855b202eef8b9

Introduce full GM ticket support: add backend /api/tickets routes (count, list, all, close, respond, comment, assign/unassign, escalate/deescalate) and register them in server.js. Add a new TicketsPage React component with ticket list, expand/detail view, respond modal, assign/comment controls, periodic polling and optimistic updates. Expose ticket endpoints in frontend api.js and show ticket count badge in the sidebar (with polling). Improve player ban flow: include account last_ip in players query, extend ban endpoint to accept type (character/account/ip) and target override, and update PlayersPage and BanModal to select ban type/target. Misc: add CSS for tickets/modals and tweak polling logic to avoid counting players when worldserver is offline.

<!-- entry-separator -->

## dcd552a7 — Support account/character/IP bans (API + UI)

**Author**: Kitzunu | **Date**: 2026-03-28 23:34:23 +0100 | **Link**: https://github.com/Kitzunu/Dashboard/commit/dcd552a778c6dc4d49ae4a88f2a46a7295d4c3c8

Expand bans functionality to cover accounts, characters, and IPs. Backend: return grouped ban lists (accounts, characters, ips), add POST /api/bans to issue bans via processManager (.ban GM command), and add separate DELETE endpoints for unbanning accounts, characters and IPs; wire in charPool alongside authPool. Frontend: update api client for new endpoints, vastly revamp BansPage with tabs for accounts/characters/ips, add Issue Ban modal, Unban confirmation modal, per-tab tables and unban flows, and refresh/count UI. CSS: add styles for tabs, modal elements and monospace IP cells. This enables managing and issuing bans for multiple target types from the UI.

<!-- entry-separator -->

## 6800685c — Allow fallback JWT secret and remove enforcement

**Author**: Kitzunu | **Date**: 2026-03-28 23:25:37 +0100 | **Link**: https://github.com/Kitzunu/Dashboard/commit/6800685cdbedab7b4bbe40bf157e9fcc2956157f

Remove the startup check that enforced a non-default JWT_SECRET in backend/server.js and add a fallback 'secret' value in backend/routes/auth.js when signing JWTs. This prevents the app from exiting if JWT_SECRET is not set (useful for local/dev), but is insecure for production—set JWT_SECRET to a strong random value for deployment.

<!-- entry-separator -->

## 656ff3cf — Support graceful stop, autorestart & ANSI colors

**Author**: Kitzunu | **Date**: 2026-03-28 23:18:53 +0100 | **Link**: https://github.com/Kitzunu/Dashboard/commit/656ff3cfdc447ad38d000763f84133ba29b5a4f6

Add graceful shutdown options and auto-restart support for managed servers, preserve SGR color codes for frontend console rendering, and harden authentication endpoints.

Changes include: processManager now preserves SGR color codes, supports stop modes (exit vs shutdown with delay), and implements auto-restart with a new setAutoRestart API and status flag; server startup validation now requires a real JWT_SECRET; auth route login is rate-limited using express-rate-limit and no longer falls back to a default JWT secret; servers routes accept stop mode/delay and a new autorestart endpoint; frontend adds an ANSI parser and renders colored console lines, updates API calls for stop/autorestart, and implements a stop modal + autorestart toggle in the Servers page; minor CSS added for the new UI. Also adds express-rate-limit to backend dependencies.

<!-- entry-separator -->

## 22737d07 — Delete .env

**Author**: Kitzunu | **Date**: 2026-03-28 23:14:42 +0100 | **Link**: https://github.com/Kitzunu/Dashboard/commit/22737d076b4a42157fa453ea0a87a4c89d647c86

<!-- entry-separator -->

## b67db774 — Ignore local .env and .claude/

**Author**: Kitzunu | **Date**: 2026-03-28 23:13:25 +0100 | **Link**: https://github.com/Kitzunu/Dashboard/commit/b67db77416b4624d7bde05d0be93f4eed7b34826

Add .env and .claude/ to .gitignore to prevent committing local environment variables and the Claude-related directory (e.g. caches or local files). Keeps sensitive data and large local files out of the repo.

<!-- entry-separator -->

## e336ee32 — Add detailed README for AzerothCore Dashboard

**Author**: Kitzunu | **Date**: 2026-03-28 23:09:09 +0100 | **Link**: https://github.com/Kitzunu/Dashboard/commit/e336ee32216554f391d6269c9180dea72f583a7a

Replace the minimal README with a comprehensive project README for the AzerothCore Dashboard. Adds project overview, feature list, requirements, step-by-step installation and run instructions, example .env configuration, GM role mapping, database setup snippet, project structure, and operational notes about server processes and session behavior. This improves onboarding and documentation for developers and operators.

<!-- entry-separator -->

## 8c3ddcd3 — Add bans UI/backend, toasts, player count

**Author**: Kitzunu | **Date**: 2026-03-28 23:07:01 +0100 | **Link**: https://github.com/Kitzunu/Dashboard/commit/8c3ddcd3bd49f49443c270edb46e14cdcd8d5eed

Introduce account ban management and UI feedback: add a new backend route (routes/bans.js) to list active bans and clear (unban) them (requires GM level 2), and register it in server.js. Add frontend support: api methods (getBans, unbanAccount, getPlayerCount), a new BansPage component for viewing/unbanning, and a lightweight toast system (toast.js + ToastContainer) with styles. Enhance Layout to show a player-count nav badge (polled every 30s), surface toasts, and add a Bans nav item. Update PlayersPage to handle world offline state, show zone names (ZONES mapping) and use toasts for feedback; add /api/players/count endpoint on the backend. ServersPage now uses toasts for status messages and redundant flash state was removed. Include CSS for nav badge, toasts, offline notice and bans-related styles.

<!-- entry-separator -->

## feddd71f — Use brand image instead of emoji icons

**Author**: Kitzunu | **Date**: 2026-03-28 22:12:32 +0100 | **Link**: https://github.com/Kitzunu/Dashboard/commit/feddd71f2c8e55a58db7acf9e58675ec59ef8667

Replace the emoji-based brand icons with an actual image (../../img/icon.png) in Layout.jsx and Login.jsx. The image is added to the sidebar brand and login emblem with specified widths (38 and 64) and alt text for consistent branding and better control over the icon appearance.

<!-- entry-separator -->

## 79094cf8 — Add brand icon and favicon

**Author**: Kitzunu | **Date**: 2026-03-28 21:54:11 +0100 | **Link**: https://github.com/Kitzunu/Dashboard/commit/79094cf865c9cd984d208abf2bb29900ba3b5491

Add frontend/img/icon.png and use it as the site favicon and brand graphic. index.html now links the PNG as a 32x32 favicon. Layout.jsx and Login.jsx replace the '⚔' emoji with an img referencing img/icon.png (inline sizing and draggable=false) so the brand image is shown consistently in the sidebar and login screen.

<!-- entry-separator -->

## 73fe5b30 — Update GitHub Actions to use latest checkout and setup-node

**Author**: Kitzunu | **Date**: 2026-03-28 20:36:49 +0100 | **Link**: https://github.com/Kitzunu/Dashboard/commit/73fe5b30e8d7b5865647c19948a5e9046b93aadb

<!-- entry-separator -->

## fc7703ee — Update node.js.yml

**Author**: Kitzunu | **Date**: 2026-03-28 20:34:07 +0100 | **Link**: https://github.com/Kitzunu/Dashboard/commit/fc7703eeca4a6d927a5ec959c77c0575ddca99bc

<!-- entry-separator -->

## 87b67741 — Add Node.js CI workflow for testing

**Author**: Kitzunu | **Date**: 2026-03-28 20:21:21 +0100 | **Link**: https://github.com/Kitzunu/Dashboard/commit/87b6774104cb374dad71b1a83c1da5b96e2a0dd8

This workflow installs dependencies, builds the code, and runs tests across multiple Node.js versions.

<!-- entry-separator -->

## a7274a3b — Persist console history & autoscroll; add filter

**Author**: Kitzunu | **Date**: 2026-03-28 20:06:07 +0100 | **Link**: https://github.com/Kitzunu/Dashboard/commit/a7274a3b1af2d16c9f51b865b73505d672a45db7

ConsolePanel: persist command history (sessionStorage per-server, capped to 50 entries) and autoscroll preference (localStorage per-server); add loading state and message while fetching logs; save history on send and restore on mount. PlayersPage: add a text filter (name/account/username), show filtered results with a Clear button, and update empty-state messaging when a filter is active. CSS: add styles for console loading message and filter input/row.

<!-- entry-separator -->

## c6c3e8e9 — Merge branch 'master' of https://github.com/Kitzunu/Dashboard

**Author**: Kitzunu | **Date**: 2026-03-28 20:02:09 +0100 | **Link**: https://github.com/Kitzunu/Dashboard/commit/c6c3e8e953746c0dd2740813c6886d22ff6999a1

<!-- entry-separator -->

## 8b45334a — Graceful shutdown for worldserver

**Author**: Kitzunu | **Date**: 2026-03-28 20:01:23 +0100 | **Link**: https://github.com/Kitzunu/Dashboard/commit/8b45334ac850cc92adb99aba75ca76dd2225fa50

Attempt a graceful shutdown for the 'worldserver' process by writing "server shutdown 0\n" to its stdin and fall back to proc.kill() on error; other servers continue to be killed directly. Additionally, updated Vite dependency metadata and optimized frontend deps (react/react-dom/jsx runtimes, socket.io-client), removed stale chunk files and maps, and applied frontend changes in App.jsx, api.js and ServersPage.jsx (build/artifact updates and related frontend edits).

<!-- entry-separator -->

## d6cbc7d5 — Clean up .gitignore by removing obsolete entries

**Author**: Kitzunu | **Date**: 2026-03-28 19:56:19 +0100 | **Link**: https://github.com/Kitzunu/Dashboard/commit/d6cbc7d5e223bac1b54cdd34387d68d1aa474ac7

Remove a number of outdated or redundant ignore patterns from .gitignore (misc caches and logs, coverage folders, e2e artifacts, system files like .DS_Store/Thumbs.db, and .nx/.angular cache entries). The .vscode exceptions are preserved. This simplifies the file and reduces duplicate or unnecessary rules.

<!-- entry-separator -->

## da0bcbe4 — Delete backend/node_modules directory

**Author**: Kitzunu | **Date**: 2026-03-28 19:55:18 +0100 | **Link**: https://github.com/Kitzunu/Dashboard/commit/da0bcbe405d804729441561afbcd9ea0f757bc9d

<!-- entry-separator -->

## 4b28b55f — Delete frontend/node_modules directory

**Author**: Kitzunu | **Date**: 2026-03-28 19:55:08 +0100 | **Link**: https://github.com/Kitzunu/Dashboard/commit/4b28b55f20bc1bef5a9ee24fc0018038fdb56ade

<!-- entry-separator -->

## 9f2c6e9c — Delete node_modules directory

**Author**: Kitzunu | **Date**: 2026-03-28 19:54:58 +0100 | **Link**: https://github.com/Kitzunu/Dashboard/commit/9f2c6e9ca7ef5fda46faedcb3b9807a90bd6757b

<!-- entry-separator -->

## f2bd2fcf — Initial commit

**Author**: Kitzunu | **Date**: 2026-03-28 19:51:37 +0100 | **Link**: https://github.com/Kitzunu/Dashboard/commit/f2bd2fcf9c96f07fdfceafa7574d7aba1098b5a6
