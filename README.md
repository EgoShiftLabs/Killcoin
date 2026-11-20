# KILL COIN / THE AGENCY

**THE TRENCHES HAVE AN AGENCY NOW.**

A community-driven crypto satire and original noir-fiction entertainment project. The Agency has an original operative roster, recruitment cards, a project-level case nomination desk, and a separate editorial case registry. Fictional assassin characters and real-world project review are distinct.

- [Live website](https://egoshiftlabs.github.io/Killcoin/)
- [Nomination desk](https://egoshiftlabs.github.io/Killcoin/#nominate)
- [Public reviewed case registry](https://egoshiftlabs.github.io/Killcoin/agency/)
- [Agency whitepaper](docs/AGENCY_WHITEPAPER_V1_1.md)
- [Intake receiver and deployment guide](apps-script/README.md)
- [Public registry workflow](docs/REGISTRY.md)

## What's live

- Original fictional operative roster and PFP downloads.
- Recruitment-card generation for three featured agents.
- Direct website nomination form -> bound Google Apps Script -> private Google Sheet, with case number on confirmed save. The flow was verified end-to-end on November 19, 2026.
- Editorial-only case registry code, which does not display raw nominations and may show no approved cases until the public publishing pipeline is configured.

**Not live:** GTA VI roleplay servers, multiplayer integration, real-time squad identity, automatically published allegations, or automated investigations.

## Trust boundaries

Nominations concern public crypto projects, tokens and contracts, not private people. Allegations require editorial review and evidence before public publication. The fictional assassin story world is entertainment, not a threat or invitation to target real people.

The public `agency-nominations-config.js` contains only the Apps Script web-app URL. Never commit Google authorization secrets, private spreadsheet identifiers, raw submissions or private contact details.

## Contributing and validation

The site uses plain HTML/CSS/JS on GitHub Pages and a separate Apps Script receiver. Changes to `apps-script/Code.gs` **do not deploy automatically** when GitHub is updated.

Run local tests with Node 22+:

```bash
node --test tests/intake.test.mjs tests/registry.test.mjs
```

For changes to the receiver, follow the careful two-stage deployment checklist in [apps-script/README.md](apps-script/README.md). Use a reviewable pull request and test with a harmless project before enabling major traffic.
