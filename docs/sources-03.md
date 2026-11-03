# Level 3 · Patient Zero — sources for "What actually happened…"

Every fact in the "What actually happened…" screen was checked against these sources on 14 October 2026.
In-game, the company is the fictional Keyhaven; real names appear only in that screen.

| Fact used | Source |
|---|---|
| Aug 2022: portions of the development environment accessed through a single compromised developer account; portions of source code and technical information taken | LastPass notice (Aug 25, 2022 entry) |
| Sept 2022: no evidence of access to customer data or encrypted password vaults | LastPass notice (Sept 15, 2022 update) |
| Nov 30, 2022: unusual activity in third-party cloud storage shared with affiliate GoTo | LastPass notice (Nov 30, 2022 update) |
| Dec 22, 2022: backup of customer vault data copied; usernames, passwords, secure notes and form data encrypted with 256-bit AES, decryptable only with a key derived from the master password; URLs unencrypted; basic account information (names, billing and email addresses, phone numbers, IP addresses) copied | LastPass notice (Dec 22, 2022 update) |
| Second attack targeted one of four DevOps engineers with access to the decryption keys; used information from the first incident; activity from Aug 12 to Oct 26, 2022 | The Hacker News, February 2023 |
| Engineer's home computer ran Plex with CVE-2020-5741, fixed in May 2020; Plex said the employee never upgraded; keylogger captured the master password after MFA | The Hacker News, March 2023 |

- LastPass, Notice of recent security incident: https://blog.lastpass.com/posts/2022/12/notice-of-recent-security-incident
- The Hacker News, LastPass reveals second attack (Feb 2023): https://thehackernews.com/2023/02/lastpass-reveals-second-attack.html
- The Hacker News, LastPass hack and the engineer's unpatched Plex software (Mar 2023): https://thehackernews.com/2023/03/lastpass-hack-engineers-failure-to.html

TODO: verify — CIS Controls v8 Safeguard 12.8 wording and RFC 3227 "order of volatility" (used in Level 3's Why? panels) against the original documents before release.
