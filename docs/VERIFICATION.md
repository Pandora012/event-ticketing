# Verification record

Verified on 22 October 2026 in the connected cloud workspace. Results below are from executed commands against the implemented application; no database concurrency tests used mocks.

## Runtime

- Node.js 24.19.0 and npm 11.9.0.
- Next.js 16.4.2, React 19.3.1, Prisma 6.19.3.
- PostgreSQL 17 in Docker Compose; the development database is `eventify` and the disposable test database is `eventify_test`.
- Chromium at `/usr/bin/chromium` for Playwright.

## Commands and results

| Command / check                                                          | Observed result                                                                                                                         |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `npm install`, followed by a clean `npm ci`                              | Installed successfully from the lockfile                                                                                                |
| `npm run setup:local`                                                    | Existing ignored `.env` preserved; setup helper also provides exclusive creation with independent random secrets for a fresh checkout   |
| `docker compose up -d --wait` / `npm run db:up`                          | PostgreSQL healthy                                                                                                                      |
| `npm run db:generate`                                                    | Prisma Client generated successfully with artifact verification enabled                                                                 |
| `npm run db:migrate`                                                     | Initial migration applied; subsequent runs found no pending migrations                                                                  |
| `npm run db:seed`                                                        | Six fictional events, two local accounts, three tickets; repeat run preserved existing records                                          |
| `npm run db:test:create`                                                 | Dedicated test database created; repeat run reported that it already exists                                                             |
| `npm run lint`                                                           | Passed, no errors or warnings                                                                                                           |
| `npm run format:check`                                                   | Passed                                                                                                                                  |
| `npm test`                                                               | **18 passed**, 0 failed, 0 skipped                                                                                                      |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` | **4 passed**, 0 failed, 0 skipped                                                                                                       |
| `npm run build`                                                          | Production Next build succeeded for all routes                                                                                          |
| `npm start` + internal browser smoke                                     | Database readiness, rendered event data, proxied login, three persistent demo tickets, tablet layout, and browser-console checks passed |
| `npm audit --omit=dev`                                                   | 0 known vulnerabilities at verification time                                                                                            |
| SVG parsing                                                              | All six local artwork files are valid XML                                                                                               |
| Repository inspection                                                    | No application `.ts` or `.tsx` files; `.env`, dependencies, build output, and test traces are ignored                                   |

The production-bundle smoke used local HTTP with the API’s development cookie settings. It verifies the built frontend and API integration, not a production HTTPS deployment.

## Integration coverage

The 18 API tests exercise input validation, signup/login/logout, HttpOnly cookies, private routes, role authorization, origin/CSRF rejection, organizer ownership, event filters, duplicates, full capacity, concurrent final-slot reservations, concurrent duplicate reservations, past/draft events, owner-only QR access, hash-only token storage, forged credentials, check-in, replay, simultaneous scans, wrong-event scans, check-in eligibility, and event edits/deletion with existing attendees.

Both concurrency tests submit simultaneous HTTP requests to the real Express application backed by the dedicated PostgreSQL database. They assert exactly one successful reservation/check-in and inspect persisted rows.

## Browser coverage

1. Desktop and mobile discovery, actual local artwork, search, category filtering, empty results, responsive navigation, and accessibility scans.
2. Organizer signup → create and edit a published event → separate mobile attendee signup → registration → QR ticket → guest list → denied-camera fallback → manual check-in → replay rejection → dashboard attendance → updated attendee ticket status. No manual page refresh is required for the registration and admission flow.
3. Protected-route redirects, login validation, session persistence after reload, and logout.
4. Real QR decoding through `html5-qrcode`, using Chromium’s synthetic camera stream carrying a valid ticket payload, followed by successful admission through Express/PostgreSQL.

Axe reported zero WCAG A/AA violations on the audited home, filtered discovery, login, event form, ticket, check-in, and dashboard states. This is automated coverage of those states, not certification of all accessibility requirements. Desktop (1440 px), mobile (390 px), and a tablet smoke check (768 px) were exercised. The homepage and ticket mobile checks verified that the document did not overflow horizontally. Screenshots are in `docs/screenshots/`.

## Issues found and resolved

- Prisma engine downloads were initially blocked. The official `binaries.prisma.sh` domain was added to the environment draft and became reachable. Checksum and TLS verification were never disabled.
- Two SVGs contained unescaped ampersands; their XML was corrected and the browser now verifies the expected artwork.
- Accessibility tests caught low-contrast button and hover-link text. Accessible text/hover colors were applied while retaining the editorial accent.
- Browser tests found a logout routing race. Logout now clears the cookies and navigates to a fresh public page without competing protected-route redirects.
- The first synthetic-camera attempt failed to decode; the synthetic frame’s QR module scale was adjusted. The final full browser run decoded and admitted the ticket successfully.
- The dependency audit identified advisories in Prisma’s CLI configuration dependencies. Prisma was updated to 6.19.3 and its `deepmerge-ts` dependency received a scoped 8.0.2 override. Clean installation, generation, migration, both suites, and the production build passed with the final lockfile.

## Remaining verification boundaries

A physical phone camera, Safari/Firefox, production HTTPS/cross-site cookie deployment, email integrations, and restoration into a newly published cloud task were not tested. Physical camera permission and focus behavior should be checked on the target devices before a real event. The configured MVP intentionally has no payments, password recovery, email verification, cancellation, notifications, or offline admission.

Cloud `install_script`, `start_skill`, and the Prisma network-domain addition were saved to the configuration draft. Draft persistence does not publish the environment; review/save and publication happen in environment settings. GitHub publication of the source files and screenshots is separate from cloud environment publication and application deployment.
