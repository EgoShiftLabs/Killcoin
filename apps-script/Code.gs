/**
 * THE AGENCY — Website Nomination Receiver (Google Apps Script)
 * Install as a CONTAINER-BOUND script: open your existing PRIVATE Google Sheet,
 * Extensions > Apps Script, paste this Code.gs, deploy as a Web App.
 *
 * The public website collects ONLY: public X profile/project, rant, optional receipts.
 * Raw entries are saved to a private "Website Nominations" sheet for human review.
 * This script never updates the public approved case registry.
 */

const AGENCY_ORIGIN = "https://egoshiftlabs.github.io";
const INTAKE_TAB = "Website Nominations";
const COLUMNS = ["Received At (UTC)", "Case ID", "Public X Profile / Project", "What Happened", "Receipts URL", "Review Status", "Intake Source"];
const MAX_PROFILE = 120, MAX_RANT = 1600, MAX_RECEIPT = 500;
// Persistent script-property counters; CacheService alone expires too early for a day limit.
// Limits are global because anonymous Google Apps Script web apps cannot reliably see visitor IPs.
const MAX_PER_10_MIN = 30, MAX_PER_DAY = 300, MAX_PER_PROJECT_10_MIN = 8;
const RATE_PROPERTY = "AGENCY_RATE_COUNTERS";
const CONTACT_DATA = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?<![\w$])(?:\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(?!\w)|(?<![\w$])\+\d{10,14}(?!\w)/i;
const STREET_ADDRESS = /\b\d{1,6}\s+(?:[a-z0-9.-]+\s+){0,4}(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr)\b/i;

function doGet() {
  return HtmlService.createHtmlOutput("The Agency nomination receiver is standing by. Use the form at the Kill Coin website.");
}

function doPost(e) {
  var p = e && e.parameter ? e.parameter : {};
  var requestId = String(p.requestId || "").trim();
  if (!/^[0-9a-fA-F-]{16,80}$/.test(requestId)) {
    return respond_(requestId, false, "", "Invalid submission reference.");
  }
  try {
    // Honeypot: actual human visitors cannot see or tab to this input.
    if (String(p.website || "").trim()) return respond_(requestId, false, "", "Submission not accepted.");
    var profile = String(p.profile || "").trim();
    var rant = String(p.rant || "").trim();
    var receipts = String(p.receipt || "").trim();
    if (profile.length < 2 || profile.length > MAX_PROFILE) return respond_(requestId, false, "", "Add the public crypto project, token or contract.");
    if (rant.length < 8 || rant.length > MAX_RANT) return respond_(requestId, false, "", "Describe what happened in a few words.");
    if (receipts && (!/^https?:\/\/[^\s]+$/i.test(receipts) || receipts.length > MAX_RECEIPT)) return respond_(requestId, false, "", "Receipts must be a valid public link.");
    if (String(p.attest || "") !== "yes") return respond_(requestId, false, "", "Confirm the report concerns a public project and contains no threats or personal details.");
    if (CONTACT_DATA.test(profile + "\n" + rant + "\n" + receipts) || STREET_ADDRESS.test(profile + "\n" + rant)) {
      return respond_(requestId, false, "", "Remove private contact information or street addresses.");
    }
    var sheetFile = SpreadsheetApp.getActiveSpreadsheet();
    // For a standalone script, store your ID privately under Script Properties.
    if (!sheetFile) {
      var storedId = PropertiesService.getScriptProperties().getProperty("NOMINATION_SHEET_ID");
      if (!storedId) throw Error("No bound spreadsheet. Open the private Sheet and create the script from Extensions.");
      sheetFile = SpreadsheetApp.openById(storedId);
    }
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var cache = CacheService.getScriptCache();
      var cacheKey = "agency.nomination." + requestId;
      var existing = cache.get(cacheKey);
      if (existing) return respond_(requestId, true, existing, "");
      // Reject before writing the private spreadsheet. The lock serializes counters.
      if (!consumeRate_(profile)) return respond_(requestId, false, "", "The Agency desk is receiving too many submissions. Try again later.");
      var sheet = sheetFile.getSheetByName(INTAKE_TAB);
      if (!sheet) {
        sheet = sheetFile.insertSheet(INTAKE_TAB);
        sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]);
        sheet.setFrozenRows(1);
      }
      var received = new Date();
      var caseId = "KC-" + Utilities.formatDate(received, "Etc/UTC", "yyMMdd") + "-" + requestId.replace(/-/g, "").slice(0, 8).toUpperCase();
      var row = [received, caseId, safeCell_(profile), safeCell_(rant), safeCell_(receipts), "PENDING REVIEW", "Kill Coin website"];
      var rowNum = sheet.getLastRow() + 1;
      // Force free-text columns to plain text and neutralize spreadsheet formula injection.
      sheet.getRange(rowNum, 2, 1, 6).setNumberFormat("@");
      sheet.getRange(rowNum, 1, 1, COLUMNS.length).setValues([row]);
      SpreadsheetApp.flush();
      // Cache is best-effort: a failed cache write must not hide a real saved row.
      try { cache.put(cacheKey, caseId, 21600); } catch (cacheError) { console.warn("Intake cache unavailable"); }
      return respond_(requestId, true, caseId, "");
    } finally { lock.releaseLock(); }
  } catch (error) {
    console.error("Agency intake error: " + error);
    return respond_(requestId, false, "", "The Agency couldn't confirm a save. Please retry.");
  }
}

function consumeRate_(profile) {
  // This is basic flood control, not bot authentication or per-IP limiting.
  // One hostile submitter can still consume a shared global allowance.
  var props = PropertiesService.getScriptProperties();
  var now = new Date();
  var day = Utilities.formatDate(now, "Etc/UTC", "yyyyMMdd");
  var windowId = String(Math.floor(now.getTime() / 600000));
  var state;
  try { state = JSON.parse(props.getProperty(RATE_PROPERTY) || "{}"); }
  catch (parseError) { throw Error("Cannot read Agency rate counters."); }
  if (state.day !== day) {
    state = {day: day, dayCount: 0, windowId: windowId, windowCount: 0, projects: {}};
  } else if (state.windowId !== windowId) {
    state.windowId = windowId;
    state.windowCount = 0;
    state.projects = {};
  }
  // The project limit reduces repeat floods against one target, but cannot stop
  // an attacker rotating fake project names. Use a proper anti-bot gateway if needed.
  var key = encodeURIComponent(String(profile).toLowerCase().trim()).slice(0, 180);
  var targetCount = Number(state.projects[key] || 0);
  if (state.dayCount >= MAX_PER_DAY || state.windowCount >= MAX_PER_10_MIN || targetCount >= MAX_PER_PROJECT_10_MIN) return false;
  state.dayCount++;
  state.windowCount++;
  state.projects[key] = targetCount + 1;
  props.setProperty(RATE_PROPERTY, JSON.stringify(state));
  return true;
}

function safeCell_(value) {
  // Quotes at the beginning prevent submitted text from becoming a Sheet formula.
  var valueString = String(value || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  return /^[=+\-@]/.test(valueString) ? "'" + valueString : valueString;
}

function respond_(requestId, ok, caseId, message) {
  var payload = JSON.stringify({
    type: "killcoin.nomination.result",
    requestId: String(requestId || "").slice(0, 80),
    ok: !!ok,
    caseId: String(caseId || "").slice(0, 60),
    message: String(message || "").slice(0, 240)
  }).replace(/</g, "\\u003c");
  var content = '<!doctype html><html><head><meta charset="utf-8"></head><body>' +
    '<script>window.top.postMessage(' + payload + ',' + JSON.stringify(AGENCY_ORIGIN) + ');</script>' +
    '</body></html>';
  // Required for the hidden result frame inside the official Kill Coin website.
  return HtmlService.createHtmlOutput(content).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
