# Contributing

Thank you for improving PickNext.

## Before making a change

1. Read [docs/README.md](docs/README.md) and the guide for the area being
   changed. Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before touching
   picking, rendering, or state.
2. `updateUI()` in `js/render.js` owns what is visible. Change state, then call
   it, and keep visibility changes inside it.
3. Pick entry points check `isPickBusy()`. Async pick code re-checks
   `gen === transient.sessionGen` after every `await`.
4. Anything that picks people uses `getPresentParticipants()` and excludes
   `getAwayNames()` (out today).
5. Put participant, topic, and question text on the page with `textContent` or
   `escapeHtml()`, so it always renders as plain text.
6. Styling uses the color tokens at the top of `styles.css` and hard offset
   shadows. Check light and dark. CSS that changes a name tag's box
   size changes the layout; put decorations on `position: absolute` badges.
7. Put pure logic in DOM-free modules with a test in `tests/`.
8. Use plain language in docs. Button and menu labels must match the app exactly.

## Make and check the change

```bash
npm ci
```

```bash
npm run check
```

`npm run check` runs ESLint, every Vitest suite, and the production build. For
changes you can only see in a browser, also do the manual pass in
[docs/TESTING.md](docs/TESTING.md).

## Open a pull request

Use the pull request template. Include:

- What changed and why.
- The area changed (picking, rendering, styles, pure module, docs).
- The checks you ran and their results.
- Screenshots for UI changes, using the demo team, in the light theme unless
  the change is theme-specific.

By opening a pull request, you agree that your contribution may be used in
PickNext under the project's terms (see Copyright in the README).

## What belongs in Git

Commit source, tests, CI configuration, public documentation, and screenshots.

Everything else stays local; `.gitignore` covers it.
