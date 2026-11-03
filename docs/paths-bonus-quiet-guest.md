# Bonus · The Quiet Guest — one path per ending

Real-event bonus level (inspired by the SolarWinds compromise found in December 2020; sources in `docs/sources-bonus.md`). Unlocked by passing Level 12. Played with Master rules (underground centre, purple hat, "None of these", misleading Consult) in yellow light. It is numbered 13 inside the game but shown on screen as "Bonus level"; passing it keeps the player's title (there is no 13th title).
Decisions: mfa (week 1), tokens (week 2), beacon (week 3, None moment), build (week 4), chain (week 5, order puzzle: the attack timeline), after.
New mechanic: **long hunt.** Each decision is a week apart (`clockAt` + `days: 7`), and every week of attacker access counts. Clues are sparse: one log line per week. Week 5 asks the player to put the clues back in the order they happened (the reverse of the order they were found).

| Ending | Example path | Score |
|---|---|---|
| Found the quiet guest (good) | iris: A A D/m A O5 A | 100% |
| Guest evicted, late (mixed) | iris: A A A A O5 A | 58% |
| Crossed the line | jayson: A E D/m A O5 A | ≤ 58% |
| Kept it quiet | iris: A A A B O5 A | ≤ 50% |
| Rooted | iris: A B A A O5 A | ≤ 47% |

"None of these" is right only at "beacon" (all three options trust the monitoring tool). Suggestions: Moritz (isolate and image the monitoring servers, correct), Jayson (block one domain, wrong), Echo (take the servers offline and examine the software, correct), Iris (call vendor support, wrong).
Misleading Consult hints: Jayson at "mfa" and "after", Moritz at "tokens" and "beacon", Echo at "build".
Hidden choices: Echo at "mfa" (watches the device alone), Jayson at "tokens" (hack back, −10), Iris at "build" (negotiates a joint warning with the vendor's CEO).
Moritz's weakness: Reputation −5 at "build" C.

Butterfly effects (attacker minutes run until the monitoring servers are isolated; a week is 10,080 minutes):
- After ~3.5 days, if the extra MFA device was left: nightly VPN use as the employee (−5 points).
- After ~10 days, if the token-signing certificate wasn't rotated: executives' mailboxes read (−10 points).
- After ~17 days, if the monitoring servers are still connected: a second tool and the red team's toolkit stolen (−15 points).
Keeping the discovery quiet costs −25 points, so it can't pass.

All log lines come from spec section 11c (Bonus). No new log lines.
Small code changes for the bonus: `save.js` no longer sets an empty title for level 13; the report says "Bonus level unlocked" after Level 12 and nothing after the bonus; screens say "Bonus level" instead of "Level 13"; the order puzzle can name its summary line (`shortLabel`, here "Attack timeline").
