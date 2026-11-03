# Level 11 · The Last Copy — one path per ending

Real-event level (inspired by NotPetya, 27 June 2017; sources in `docs/sources-11.md`). Master tier, dusk light.
Decisions: ransom (None moment), network, lastcopy, manual, recovery (order puzzle), after.
Paths are written like `D/e A A A O5 A`: `D/e` = None of these, then Echo's suggestion; `~A` = the same choice made too slowly on a real-time node; `O5` = recovery order with 5 of 5 in place.
The validator walks about 184,000 paths for this level and takes about 40 seconds (the whole run is now close to a minute).

| Ending | Example path | Score |
|---|---|---|
| The last copy (good) | iris: D/e A A A O5 A | 100% |
| Back from the brink (mixed) | iris: B A A A O5 A | 77% |
| Rooted | iris: B B A A O5 A | ≤ 63% |
| Paid for nothing | iris: A A A A O5 A | ≤ 58% |
| The last copy, gone | iris: A A B A O5 A | ≤ 62% |

New mechanics:
- **Real-time spread** (`"spread"` on a choice node): a counter of hit machines ticks every real second while the node is open (only while the page is visible). Deciding after `slowAfter` seconds (45 at the ransom note, 30 at the network decision) fires the node's `slowEvent` once (−5 points each, shown as a butterfly effect with the seconds as its cause). The counter is text plus a bar; the bar animation is off with reduced motion.
- **Recovery-order puzzle** (`"order"` node): the player clicks five systems in order, with Undo and Confirm. Each item says what it needs. Points are shared per item in the right place; each item brought back before something it needs costs 60 minutes (`clashMinutes`). Flags: `identityFirst`, `orderRight`. The right order: identity directory → core network services → booking system → terminal operating systems → finance and payroll.

"None of these" is right only at the ransom note (it's a wiper). Suggestions: Echo (analyse a sample, correct), Jayson (restore backups at once, wrong), Moritz (segment now, correct), Iris (email the attackers, wrong). Every player sees at least one correct suggestion.
Misleading Consult hints: Iris at "ransom", Jayson at "lastcopy" and "recovery", Echo at "manual", Moritz at "after".
Hidden choices: E at "network" for Jayson (kill script), E at "lastcopy" for Iris (charter flight, her negotiation ability).
Moritz: segmentation ability at "network" B (Availability +10); weakness at "manual" A and "after" C (Reputation −5).

Butterfly effects (attacker minutes count until the network is cut or isolated; the jump to 15:00 counts too):
- 15 minutes → backup servers in the data centres are wiped (−5 points).
- 30 minutes → the worm reaches partner networks (−15 points).
- Powering ACC-LGS-01 on while connected → the last clean copy is wiped (−20 points).
- Plugging spare laptops into an uncleaned network → reinfection (−10 points).
Paying (in full or a test payment) costs −10 points, so "Paid for nothing" can't pass.

Log lines from spec section 11c (Level 11): the 09:41–09:46 lines, the analyst line and the recovery line.
TODO: author review — one new line not in 11c: "ACC-LGS-01 | Disk boot records being overwritten · ransom screen shown" (reuses the 09:46 wording for the butterfly).
