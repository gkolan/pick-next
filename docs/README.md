# PickNext documentation

Start with the question you have; each guide stands on its own.

To try it, open [picknext.io](https://picknext.io) and pick a format. The demo
crew is already loaded.

## I want to run a session

1. [Standup](standup.md): timed turns, skip, pause, auto-advance or overtime.
2. [Raffle](raffle.md): prize draws from last place to 1st, podium recap.
3. [Icebreaker](icebreaker.md): a topic, then a person to answer it.
4. [Hot Seat](hot-seat.md): one person, a round of timed questions.

Screenshots of every mode in light and dark themes are in
[`screenshots/`](screenshots/) and in the [README](../README.md#see-it-in-action).

## I want to set things up

- [Teams and data](teams-and-data.md): teams, out today, chances, per-person
  timers, team links, export and import.
- [Presenting](presenting.md): presenter mode, keyboard shortcuts, theme,
  sound, phones and TVs.

## I want to change the code

- Run it locally: `npm ci && npm run dev`, then open
  [localhost:5173](http://localhost:5173).
- [Architecture](ARCHITECTURE.md): state layers, UI states, pick-cycle
  concurrency, modules, layout, styling.
- [Testing](TESTING.md): the Vitest suites and the manual browser pass.
- [Contributing](../CONTRIBUTING.md): checks and pull request guidance.
