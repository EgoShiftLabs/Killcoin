# HITLIST Agency — Public Case Registry

This independent registry runs from the **Killcoin** repository at `/agency/`, without reading or connecting to Watchtower Crypto. The private Agency nomination and ranking workbooks are separate from the public site; no Google Form responder link is connected until explicitly configured. It displays only data in the reviewed, curated JSON file `data/approved-nominees.json`.

**The original Google Forms response spreadsheet must remain private.** It is NOT the public feed and is never included as a source in the frontend.

## Source-to-public flow

1. People submit crypto project nominations through Google Forms. The linked response spreadsheet is a **private queue** and may contain unverified or confidential data.
2. The Agency checks that the entry is about a **crypto project or public project narrative, not a private individual**, reviews evidence, and decides whether it should appear publicly.
3. A moderator copies only the selected public case fields to a **different** spreadsheet named `HITLIST Agency — Public Approved Registry`, never a tab in the raw response file. Before approving, remove personally identifying information, unsupported defamatory claims and private form answers.
4. The **public registry sheet alone** is published as CSV. It contains no unpublished nominations.
5. Set the GitHub repository Actions **variable** `HITLIST_PUBLIC_CSV_URL` to the published CSV URL. The workflow `HITLIST Agency registry sync` converts reviewed rows into a safely filtered JSON list.

## Public sheet columns

Use EXACT header names in row 1:

```
case_id,target,ticker,chain,contract,alleged_offense,evidence_url,case_status,approved_at,publish,nomination_count
```

- `publish` must be `YES` for a case to appear.
- `nomination_count` is the reviewed number of eligible nominations for a canonical target; enter a nonnegative whole number. This is an editorial count, NOT proof of unique human votes. The public registry sorts approved cases by this count.
- `case_status`: `ACTIVE`, `UNDER SURVEILLANCE` or `ARCHIVED`.
- `evidence_url` must be a public HTTPS URL.
- `case_id`, `target`, `alleged_offense`, `evidence_url`, and `case_status` are required.
- `approved_at` is a display date, never a claim of official law-enforcement findings.
- The published CSV is a public source; do not include email addresses, submission timestamps, or internal moderator notes.

## Publishing and sync

In Google Sheets, create a brand-new, separate public registry; choose **File → Share → Publish to web → choose the public sheet tab → Comma-separated values (.csv) → Publish**, then copy the published CSV link.

In GitHub, **Settings → Secrets and variables → Actions → Variables → New repository variable**:
- Name: `HITLIST_PUBLIC_CSV_URL`
- Value: published CSV URL of **the separate approved-only public sheet**.

Run **Actions → HITLIST Agency registry sync → Run workflow** after the first approved entry. The workflow also checks for changes hourly. It will not run a public sync if the variable is missing.

To review locally without pulling from Google: edit `data/approved-nominees.json` with approved entries that match the JSON shape, or run the script using a public-only CSV URL.

## Trust boundaries

No live wallet APIs, automated fact-checking, database, submission inbox, or agency authorizations exist in this module. The public page does not accept or store submissions; the existing homepage X-draft form remains unchanged pending a confirmed Google Form responder URL. Evidence links are clickable, but the reader must assess claims independently. No allegation should be presented as a proven crime merely because it appeared in a community nomination.

## Tests

```bash
node --test tests/registry.test.mjs
```
