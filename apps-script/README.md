# The Agency — private Google Apps Script nomination receiver

The public website `#nominate` form accepts a **project, token, or contract**, a factual explanation of the complaint, an optional public receipt URL, and a required attestation. It does not request a wallet or email.

The website posts to a bound Apps Script Web App using a hidden iframe. A successful response includes the case ID; raw entries stay in the private `Website Nominations` tab with `PENDING REVIEW`.

## Already operational

The previous three-field version was verified end-to-end with a legitimate test record on November 19, 2026. The public endpoint is stored in `agency-nominations-config.js`.

**Important: GitHub code and Google's deployed script are separate.** Updating `apps-script/Code.gs` in the repository does not deploy the changed receiver.

## Safe rollout for the proposed project-level receiver

1. Review and approve the GitHub pull request for site, code and tests.
2. Merge the site first. The old receiver will ignore the extra `attest` field; its existing three fields remain the same. The site can therefore operate before the receiver is redeployed.
3. Open the existing **private** Agency Google Sheet, select **Extensions → Apps Script**, and open the *bound* project.
4. Replace the contents of `Code.gs` with the **approved new version** from the repository, and save.
5. Select **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy**. Editing this deployment should preserve its `/exec` URL.
6. Keep **Execute as: Me**, access **Anyone**, and approve any required authorization prompts. This does **not** make the Sheet publicly readable.
7. Test a harmless fictional project from the live site with the checkbox checked. Verify the new row and case ID in the private Sheet.
8. Try submitting without the checkbox and with a contact detail; confirm both are blocked.
9. If anything fails, stop and inspect the Apps Script execution log. The previous GitHub version can be restored separately; Google deployment version must also be rolled back by its owner.

Do not paste the private Sheet ID or Google's owner credentials into public repository files.

## Guardrails and limitations

- Server requires `attest=yes` and rejects obvious email addresses, US/international-format phones and street-address patterns. No regex can guarantee removal of all personal data; human review is still mandatory.
- Persistent `PropertiesService` counters enforce UTC-day and fixed ten-minute windows: at most **30 total submissions per 10-minute window**, **300 per UTC day**, and **8 per project per ten-minute window**, checked under `LockService` before writing to Sheets.
- Limits are global because Apps Script cannot reliably identify an anonymous visitor's IP. A determined spammer can exhaust shared quotas by rotating projects. **This is NOT comprehensive denial-of-service protection.** For meaningful public traffic, plan a gateway with human-verification / Turnstile and reliable per-client rate limits.
- Counters are consumed before writing; a failed spreadsheet operation can count against the limit. A failed rate-counter persistence should reject the submission rather than silently disable protection.
- Duplicate retries can reuse a recent response while the six-hour `CacheService` cache entry remains available; retry protection after cache eviction is not guaranteed.
- The website reports a saved case only when it receives the matching server response. Failed or timed-out submissions retain the draft.
- Approval of a private Sheet row does not automatically publish it.

## Tests

```bash
node --test tests/intake.test.mjs tests/registry.test.mjs
```

The tests mock Google Apps Script and time; they cover data checks, idempotency during the cache window, fixed ten-minute and UTC-day limits, expiration and benign blockchain addresses. They do **not** test the real deployment or guarantee abuse prevention. See [docs/REGISTRY.md](../docs/REGISTRY.md) for public publishing procedures.
