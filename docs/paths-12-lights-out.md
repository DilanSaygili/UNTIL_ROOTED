# Level 12 · Lights Out — one path per ending

Real-event level (inspired by the Ukraine power grid attack, 23 December 2015; sources in `docs/sources-12.md`). Master tier, dark light. The last main level: it ends the way Level 1 began, with an email.
Decisions: email (prologue, spring), cursor (None moment + real-time counter), power (log puzzle), public, restore, cert.
Paths are written like `A D/m P0 A A A`: `D/m` = None of these, then Moritz's suggestion; `P0` = log puzzle solved with no wrong picks; `~` = decided too slowly on the real-time node.
The validator walks about 35,000 paths for this level.

| Ending | Example path | Score |
|---|---|---|
| Lights back on (good) | iris: A D/m P0 A A A | 100% |
| Dawn, eventually (mixed) | iris: A D/m P0 A A C | 93% |
| Rooted | iris: A A P0 A A A | ≤ 58% |
| Lost the public | iris: A D/m P0 C A A | ≤ 58% |
| Kept in the dark | iris: A D/m P0 A A B | ≤ 50% |

Mechanics combined: a playable prologue (months earlier), "None of these" with teammate suggestions, misleading Consult hints, a real-time counter (substations switched off; 40 seconds), a log puzzle (all four lines are from spec 11c), hidden character choices, butterfly effects with causes, and a new one:
- **Lights going out** (`"lights"` on a node, 0–4, as a number or variants `[{ if, value }]`): the console's top bar, meters and event feed dim one by one; each step also writes "Another screen goes dark in the control room." in the feed, so it is not only visual. Text stays readable, and the transition is off with reduced motion. If the control centre loses its backup power, the screens go dark one step sooner.

"None of these" is right only at "cursor". Suggestions: Moritz (cut all remote access, correct), Jayson (second mouse, wrong), Echo (crews to substations for manual control, correct), Iris (message the attacker, wrong).
Misleading Consult hints: Jayson at "email", Echo at "public", Moritz at "restore".
Hidden choices: E at "email" for Echo (analyses it alone for a week), E at "public" for Iris (live TV message, her negotiation ability).
Moritz's weakness: Reputation −5 at "public" A and "cert" C.

Butterfly effects (attacker minutes count until remote access is cut or the substations go to manual control):
- Enabling the attachment in spring → the forensic timeline starts on your laptop (−5 points).
- 10 minutes → more breakers open (−5 points).
- 25 minutes → substation communication firmware overwritten (−20 points).
- Reaching "public" at 16:55 or later → the control centre's backup power switches off (−5 points; screens go darker).
Misleading the public costs −20 points and keeping the findings internal −25, so neither can pass.

All log lines come from spec section 11c (Level 12). No new log lines.
