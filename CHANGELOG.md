# Changelog

This file records user-visible changes. The project is under active
development and has no tagged releases yet; **Unreleased** describes changes
prepared for the next release and does not imply they have been deployed.

## Unreleased

### Fixed

- The final Standup/Icebreaker speaker receives their reveal pause and full timer
  before the recap appears.
- Hot Seat timeouts advance the question and count it as skipped, independently
  of Standup's auto-advance setting. Ending a round clears its pending callback.
- Escape cancels picks during their opening delay as well as the roulette;
  cancelled continuations cannot overwrite a newer session or its timer.
- Active-session settings use native disabled controls, including mode tabs,
  Hot Seat fields, the Icebreaker topic selector, mobile menus and import.
- Bulk-pasting participant names fills the available slots up to 100 without
  counting newly added names twice.
- JSON import validates question lists and participant names, normalizes settings
  and active list IDs, and reports storage failures.

### Tests

- Added deterministic jsdom regressions for final turns, delayed timers,
  cancellation, Hot Seat timeout/exit, settings locks and 100-person bulk paste.
- Added pending-question cancellation and import-validation coverage.

### Added

- Demo crew of 15 of history's legends, with rotating one-liners per mode on the
  welcome screen.
- Standup **Skip Speaker** sends a person to the end of the queue; they come
  back once, after everyone else.
- Repository documentation: user guides per mode, screenshots in light and dark
  themes, contributing, support, security, CI workflows, and issue templates.
- Production security headers (`public/_headers`):
  Content-Security-Policy, nosniff, referrer policy, and long caching for
  hashed assets.

### Changed

- Production build uses relative asset URLs, so it runs at a domain root or
  under a sub-path.

## 0.1.0

Four modes (Standup, Raffle, Icebreaker, Hot Seat), neobrutalist design system
with light and dark themes, out today, share team link, session recaps,
presenter mode, keyboard shortcuts, and JSON export and import.
