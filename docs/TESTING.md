# Testing

```bash
npm test            # run once
npm run test:watch  # watch mode
npm run check       # lint + test + production build
```

Vitest runs pure-module tests in Node and session/DOM regressions in jsdom.
The session suite loads the real HTML and exercises state, rendering, timers and
orchestration with fake timers; visual animation, layout and audio are mocked.
For real-browser animation and accessibility, use the manual pass below. All
suites run in `npm run check` and in CI. Run `npm audit` to check dependencies.

| File | Covers |
|---|---|
| `config.test.js` | limits, `formatOrdinal`, mode defaults |
| `demoData.test.js` | demo teams, `makeParticipants` |
| `storage.test.js` | save/load, import validation and normalization, saved data kept safe on bad imports |
| `questionFlow.test.js` | pending question cancellation and replacement |
| `sessionFlows.test.js` | final speaker, delayed timer cancellation, stale pick locks, Hot Seat expiry/exit, native settings locks, bulk paste to 100 |
| `state.test.js` | ids, init, active accessors, "out today" (toggle, expiry, present list) |
| `suspense.test.js` | suspense durations per mode |
| `topics.test.js` | random topic selection with exclusions |
| `pickerUtils.test.js` | crypto RNG helpers |
| `recapText.test.js` | Recap time formatting |
| `teamLink.test.js` | share-link round trip (non-ASCII, timers) and payload validation |
| `skipQueue.test.js` | Standup skip: skipped speakers return once, after everyone else |
| `headers.test.js` | `public/_headers` CSP allows the inline theme script in `index.html` by hash |

## Manual browser pass

With `npm run dev` running:

1. First run: the setup card (mode tabs, rotating demo one-liner) → Continue → Start.
   **Use my own team →** → paste names → Continue.
2. Standup: pause/resume, skip, Escape during the roulette (Pick Next must work again),
   then play to the end. Check a one-person team: the reveal pause and full turn
   happen before the recap. Skipped picks and return turns appear separately.
3. Raffle: 1st place gets confetti, badges survive a window resize, the podium recap appears.
4. Icebreaker: the topic cloud is readable (12 topics max), the turn bar stays (faded) while
   the topic is drawn, then a person is picked.
5. Hot Seat: the question card owns the controls; the round ends with "survived" and the
   Progress card turns green. Progress, turn bar and Settings/Exit card are the same height.
6. Idle: tap names to mark them out today; they sit out every pick.
7. Settings → Copy team link → open the link in a private window → Add Team.
8. Theme button cycles system/light/dark; check a 375px-wide viewport.

In dev, `window.__picknext` exposes `gsap`, `session`, `transient`, `renderCloud` and
`updateUI` for poking at state. It is stripped from production builds.
