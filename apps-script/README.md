# The Agency — Direct Website Nomination Desk

**No native Google Form needed.** Visitors fill out three fields directly on Kill Coin's GitHub Pages site.

## What's built
- `#nominate` on the website: public X profile/project (required), rant (required), optional evidence URL.
- Submissions will POST to a private Google Apps Script web app in a hidden iframe.
- The Apps Script creates a separate **Website Nominations** tab in the existing **PRIVATE** Agency intake spreadsheet and saves each submission as **PENDING REVIEW**.
- The website only displays **FILE RECEIVED** after a success message containing the matching submission ID. On failure/timeout the visitor keeps their draft.
- Nothing is published to the public case registry or to X automatically.

## One-time connection (Google authorization required)
1. Open the existing private workbook named **HITLIST Agency — PRIVATE Nomination Intake**.
2. Choose **Extensions → Apps Script** in that workbook. This makes the script *bound* to the private sheet; no sheet ID goes into public code.
3. Replace the default `Code.gs` with the entire contents of [Code.gs](./Code.gs) and save.
4. Choose **Deploy → New deployment → Select type: Web app**.
5. Select **Execute as: Me**. Set access to **Anyone** (anonymous visitors), then **Deploy** and approve Google's authorization prompts. This grants the script access to the private workbook, not public read access to the workbook.
6. Copy the published URL ending in **/exec**.
7. In this public GitHub repository, edit `agency-nominations-config.js` and paste that URL as `endpoint`. Commit the change.
8. Open `https://egoshiftlabs.github.io/Killcoin/#nominate` and confirm the button says **FILE THE NOMINATION**.
9. Submit a test with a fictional project and benign rant, verify the corresponding `Website Nominations` row, verify the website displays the case ID, then remove/mark the test row if desired. Also test an invalid URL and no-network/failure path.

## Privacy and behavior
- The private workbook, raw submission rows and owner permissions stay private; use a SEPARATE public-reviewed sheet for any published dossiers.
- Anyone can submit, but public cases require independent editorial review. Nominations are never proof of wrongdoing.
- Google Apps Script has execution limits and isn't designed for unmoderated high-volume public APIs. If traffic grows, add anti-abuse measures or move to a dedicated backend.
- Only use your own deployment URL. Do not publish authorization tokens, Apps Script editor links, or private spreadsheet IDs in the public GitHub files.
- If a form appears to time out, the visitor may retry; the same request ID helps avoid duplicate rows within the cache window.

## Verifying the receiver
If the browser reports a submission couldn't be confirmed despite a row appearing, check the Apps Script execution log and whether the HTML service can post a message from its iframe to `https://egoshiftlabs.github.io`. Don't claim an unconfirmed save. If iframe posting is blocked by a browser, use an approved same-origin API relay or dedicated service instead of pretending the request succeeded.
