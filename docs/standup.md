# Standup

## What it does

Standup picks the next speaker, starts their timer, and keeps track of who has
had a turn. When everyone present has spoken, it shows a recap with the order
and the time each person used.

## Run one

1. Choose **Standup** on the setup card and press **Continue →** (or use the
   **Standup** tab in the header).
2. Tap any names that are out today (see [Teams and data](teams-and-data.md#out-today)).
   The stickers under the team name show the turn length and chances; click them
   to change either one.
3. Press **Start** or <kbd>Space</kbd>. The roulette lands on the first speaker.
4. When they are done, press **Pick Next** or <kbd>Space</kbd>.

The bar at the top shows the timer, the speaker, and how many have gone
(`2 / 15`). **Progress** on the left lists the order so far (**+** shows
everyone); **Settings** and **Exit Standup** are on the right. Names already
picked turn faded and dashed in the cloud.

Each speaker gets a short "You're up!" pause before their timer starts, and the
recap appears after the final speaker's turn.

## During a turn

| Control | Key | What it does |
| --- | --- | --- |
| **Pick Next** | <kbd>Space</kbd> | Ends this turn and picks the next speaker. |
| **Skip Speaker** | <kbd>S</kbd> | Sends this person to the end of the queue. They come back once everyone else has spoken. Skipped a second time, they are done. |
| **Pause** | <kbd>P</kbd> | Stops and resumes the timer. |
| **Exit Standup** | <kbd>Esc</kbd> | Ends the session. <kbd>Esc</kbd> during the roulette cancels just that pick. |
| Keyboard only | <kbd>E</kbd> | Ends the session and shows the recap now. |

## When the timer runs out

Settings → **Auto-advance when timer ends**:

- **On** (default): the next speaker is picked automatically.
- **Off**: the timer keeps counting into overtime and **Pick Next** turns red.

## Settings

| Setting | Default | Notes |
| --- | --- | --- |
| Timer Duration (sec) | 120 | 5 to 1200. The demo crew uses 30. |
| Auto-advance when timer ends | On | |
| Pick in random order | On | Off follows the displayed cloud rows, left to right. |

A person can have their own timer that overrides the default; set it in
**Edit → Edit Team**.

## The recap

Lists picks in speaking order, with time used and the session total. A skipped
speaker can appear twice: the skipped pick and their later turn.
**Run Again** starts a fresh session with the same team; **Close** goes back to
the start screen.
