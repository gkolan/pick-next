# Architecture

Vanilla ES modules, no framework. Vite serves them in development and bundles them
for production; GSAP (npm) drives all animation.

## State (`js/state.js`)

| Layer | Object | Lifetime |
|---|---|---|
| Persisted | `getData()`: teams, topic lists, question lists, active ids | `localStorage["picknext"]` |
| Session | `session`: pick history, raffle round, used topics/people, hot-seat progress, `startedAt`/`endedAt` | page lifetime; `session.reset()` on End/Close |
| Transient | `transient`: `isPicking`, timer, `pendingTurn`, `currentWinner`, `layoutMeta`, `pickInFlight`, `sessionGen` | runtime only |

"Out today" is persisted on the team as `team.away = { date, names }` and only counts
when `date` is today (`getPresentParticipants()`).

## UI states (`render.js → updateUI`)

- **Idle**: no history, nobody picked, not picking. Shows the Start button and lets
  you toggle names out.
- **Active**: picking or someone has the turn. Shows the turn bar, the Settings/Exit card
  (right) and the progress lane (left; Raffle shows the winners lane instead). The
  progress lane stays up for the whole session, including the recap.
- **Ended**: everyone present has finished their turn (including the final speaker's
  reveal pause and timer), or `session.endedAt` was stamped by
  `showRecapEarly()` or the raffle finishing. Shows the recap and hides the Settings/Exit
  card (the recap has Run Again and Close).

`updateUI()` is the single place that maps state to visibility; call it after changing state.

## Pick cycle concurrency

`beginPickCycle()` holds `transient.pickInFlight` for the whole cycle, including the reveal
and, for Hot Seat, the full question round. `isPickBusy()` guards every entry point:
button, Space, skip and timer auto-advance. `isPicking` alone is not a lock, because the
reveal clears it early. Ending a session bumps `sessionGen` and clears the lock, and
in-flight async work checks `gen` after every `await`. Escape mid-pick (`cancelPick()`)
also bumps `sessionGen` and resolves `runSuspenseAnimation()` with `null`, so a cancel
before the roulette starts still sticks. A Hot Seat question's timer expiry advances the
question (the round holds the lock), not a new pick. Hot Seat always auto-advances;
timeouts count as skipped questions, regardless of Standup's auto-advance setting.

`questionFlow.js` owns the pending question promise. Ending or cancelling a session
invalidates its generation, clears the pick lock and pending speaker timer token,
and settles the question with `null`. A stale continuation returns before touching
the timer, DOM, or history. `pendingTurn` holds a token during the speaker's reveal
pause, preventing an early recap and preventing an old timeout from starting a clock.

Settings use native `disabled` controls while a session is active, including mobile
menus, topic/question selectors and import. This blocks both mouse and keyboard input.

## Modules

| Area | Modules |
|---|---|
| Entry | `main.js` (init, timer hooks, share-link import, dev-only `window.__picknext`) |
| State & data | `state.js`, `storage.js`, `config.js`, `demoData.js`, `teams.js`, `topics.js`, `teamLink.js` |
| Picking | `pick.js`, `pickRaffle.js`, `pickIcebreaker.js`, `pickHotSeat.js`, `questionFlow.js`, `pickAnimations.js`, `suspense.js` |
| Roulette engine | `runPicker.js`, `pickerSequence.js`, `pickerTiming.js`, `pickerUtils.js` (crypto RNG) |
| Rendering | `render.js`, `renderCloud.js`, `renderHistory.js`, `layout.js`, `layoutBrick.js`, `layoutHelpers.js`, `svgHelpers.js`, `confetti.js`, `recapText.js` |
| Chrome & input | `domCache.js`, `mainEvents.js`, `eventsDialog.js`, `welcome.js`, `theatre.js`, `theme.js`, `timer.js`, `session.js` |
| Dialogs | `editor.js`, `topicEditor.js`, `questionEditor.js`, `promptDialog.js` |

## Layout

Name tags are absolutely positioned. `layMeasureText()` measures each tag in the DOM
with the same classes it will render with, so any CSS that changes a tag's box
(padding, border, font) changes the layout. Keep badges and stickers `position: absolute`.
The cloud re-lays out on resize and once web fonts finish loading.

## Styling

`styles.css` is organized by numbered sections. Every color, border and shadow comes
from the tokens in section 1. Dark mode redefines the same tokens, under
`prefers-color-scheme` or `html[data-theme="dark"]`. Text on colored fills uses
`--on-fill`. GSAP writes inline `rotate/translate: none` on elements it animates, so
tilts on name tags use `!important`.
