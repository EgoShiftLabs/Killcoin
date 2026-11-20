# HITLIST Agency — Public Reviewed Registry

The public case registry lives at `/agency/` and renders **only curated** `data/approved-nominees.json`. It does not fetch or expose raw anonymous nominations.

## Current submission path

1. Visitors file project/token/contract allegations directly on the homepage at `/#nominate`.
2. `agency-nominations.js` POSTs to the public Google Apps Script Web App at the endpoint in `agency-nominations-config.js`.
3. Bound `apps-script/Code.gs` writes to the **private** `Website Nominations` tab in the Agency review workbook. Each accepted submission receives a case ID and `PENDING REVIEW`.
4. Editors check context, evidence, private details and factual accuracy. They can mark a private row approved or rejected for their own workflow.
5. **Approval in the private Sheet does not automatically publish a case.** The editor must separately curate permitted fields in the independent `HITLIST Agency — Public Approved Registry` workbook.
6. The public-only reviewed Sheet can be published as CSV, and GitHub Actions can sync its approved rows to `data/approved-nominees.json`. The deployment must be configured before expecting automatic publication.

This is project-level investigative commentary, not a list of people to target. Sample fictional dossiers are entertainment, not verified project allegations.

## Public approved-only columns

Use these exact CSV headers:

```csv
case_id,target,ticker,chain,contract,alleged_offense,evidence_url,case_status,approved_at,publish,nomination_count
```

- `publish`: exactly `YES` for publication.
- `case_status`: `ACTIVE`, `UNDER SURVEILLANCE`, or `ARCHIVED`.
- `evidence_url`: public HTTPS URL; review it before publishing.
- `case_id`, `target`, `alleged_offense`, `evidence_url`, `case_status`: required.
- `nomination_count`: nonnegative editorial count, not proof of unique voters.
- Never copy raw rants, emails, private identifiers, other PII, or submission timestamps into the published sheet.

## Publication setup

1. In the **separate approved-only** Sheet, choose **File → Share → Publish to web**, select only the public tab and CSV format.
2. In GitHub **Settings → Secrets and variables → Actions → Variables**, create `HITLIST_PUBLIC_CSV_URL` containing that published CSV URL.
3. Run the **HITLIST Agency registry sync** GitHub workflow or allow its scheduled sync.
4. Confirm `data/approved-nominees.json` contains only approved reviewed cases, and check the rendered public registry.

The separate private intake spreadsheet must **never** be published to web.

## Local verification

```bash
node --test tests/intake.test.mjs tests/registry.test.mjs
```

The Node intake tests use simulated Google services and do not confirm a live Google deployment. Test an authorized end-to-end submission only after deploying a new Apps Script version; inspect the private Sheet and the matching on-page acknowledgement.
