# Security

## Report a security concern

Please report a possible security problem privately, through GitHub's private
security reporting for this repository. If that option is unavailable, contact
the repository owner through their GitHub profile and ask for a secure way to
send details. Keep real team names and exported data out of the first message.

Include:

- A short description of the concern.
- The affected file or feature.
- Steps that show the problem using the demo team or made-up names.
- The possible effect: script injection through a name, topic, question, team
  link, or import file; data leaving the browser; or data loss.
- A safe way to contact you.

## What the design promises

- Teams, topics, and questions live in the browser's `localStorage` and stay
  on the device. The hosted site counts anonymous page views with Plausible,
  and team links (`#team=`) stay private to the browser.
- Participant, topic, and question text always renders as escaped text.
- Team links (`#team=`) and import files are decoded strictly, and only data
  that is well formed and within the app's limits is accepted.
- Picks use the browser's crypto RNG.

We treat any change that weakens one of these as a security concern.

## Keep local information private

- Use the demo team or made-up names in examples, screenshots, and issues.
- Share team links and exported JSON from real teams only through private
  channels.
