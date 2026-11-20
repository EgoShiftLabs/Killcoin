/* Kill Coin / The Agency — three-field nomination desk.
   Uses an isolated POST iframe and a Google Apps Script postMessage acknowledgment.
   Never claims a case was saved without a verified server response. */
(() => {
  "use strict";
  const form = document.getElementById("agencyNominationForm");
  if (!form) return;
  const button = document.getElementById("agencySubmitNomination");
  const message = document.getElementById("agencyNominationMessage");
  const connection = document.getElementById("agencyIntakeConnection");
  const savedCard = document.getElementById("agencySavedCase");
  const savedId = document.getElementById("agencySavedCaseId");
  const draft = document.getElementById("agencyCopyNomination");
  const frame = document.getElementById("agencySubmissionFrame");
  const share = document.getElementById("agencyShareFiling");
  const endpoint = (window.KILLCOIN_INTAKE?.endpoint || "").trim();
  const validEndpoint = /^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec(?:\?.*)?$/.test(endpoint);
  // Basic client-side PII guard; the private receiver enforces the same rules.
  const CONTACT_DATA = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?<![\w$])(?:\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(?!\w)|(?<![\w$])\+\d{10,14}(?!\w)/i;
  const STREET_ADDRESS = /\b\d{1,6}\s+(?:[a-z0-9.-]+\s+){0,4}(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr)\b/i;
  let busy = false;
  let pendingId = "";
  let timeout = null;
  function report(text, state) {
    message.textContent = text;
    message.dataset.state = state || "";
  }
  function markReady() {
    connection.textContent = validEndpoint ? "● SECURE INTAKE ONLINE" : "● PRIVATE INTAKE AWAITING CONNECTION";
    connection.dataset.online = validEndpoint ? "true" : "false";
    button.disabled = !validEndpoint;
    button.textContent = validEndpoint ? "FILE THE NOMINATION ↗" : "SUBMISSIONS OPEN AFTER CONNECTION";
  }
  function randomId() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return [...bytes].map(x => x.toString(16).padStart(2, "0")).join("");
  }
  function allowedMessageSource(origin) {
    try {
      const u = new URL(origin);
      return u.protocol === "https:" && (
        u.hostname === "script.google.com" ||
        u.hostname === "script.googleusercontent.com" ||
        u.hostname.endsWith(".script.googleusercontent.com") ||
        u.hostname.endsWith(".googleusercontent.com")
      );
    } catch { return false; }
  }
  function finish() {
    busy = false;
    if (timeout) clearTimeout(timeout);
    timeout = null;
    button.disabled = !validEndpoint;
    button.textContent = validEndpoint ? "FILE THE NOMINATION ↗" : "SUBMISSIONS OPEN AFTER CONNECTION";
  }
  window.addEventListener("message", event => {
    if (!busy || !pendingId || !allowedMessageSource(event.origin)) return;
    const data = event.data;
    if (!data || data.type !== "killcoin.nomination.result" || data.requestId !== pendingId) return;
    finish();
    if (data.ok === true) {
      const caseId = typeof data.caseId === "string" ? data.caseId : "RECEIVED";
      savedId.textContent = caseId.slice(0, 60);
      savedCard.hidden = false;
      report("DOSSIER RECEIVED. The Agency has your story. Files are reviewed privately before anything goes public.", "success");
      message.classList.remove("intake-burn");
      void message.offsetWidth;
      message.classList.add("intake-burn");
      form.reset();
      pendingId = "";
      document.getElementById("agencyRequestId").value = "";
    } else {
      report(typeof data.message === "string" ? data.message.slice(0, 240) : "The desk couldn't save this nomination. Your draft is still here.", "error");
    }
  });
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!validEndpoint) { report("The private submission receiver is not connected yet. You can copy your draft below.", "error"); return; }
    if (busy || !form.reportValidity()) return;
    const profile = form.elements.namedItem("profile").value.trim();
    const rant = form.elements.namedItem("rant").value.trim();
    const receipt = form.elements.namedItem("receipt").value.trim();
    if (profile.length < 2 || rant.length < 8) {
      report("Name the public project or contract and tell us what happened (at least eight characters).", "error"); return;
    }
    if (CONTACT_DATA.test(profile + "\n" + rant + "\n" + receipt) || STREET_ADDRESS.test(profile + "\n" + rant)) {
      report("Remove contact details or private addresses. This desk accepts project information, not personal data.", "error"); return;
    }
    const attest = form.elements.namedItem("attest");
    if (!attest || !attest.checked) {
      report("Confirm this is a project-level report and contains no threats or private personal information.", "error");
      if (attest) attest.focus();
      return;
    }
    if (receipt) {
      try { const url = new URL(receipt); if (!["https:", "http:"].includes(url.protocol)) throw Error("protocol"); }
      catch { report("The optional receipts link needs to be a valid http(s) URL.", "error"); return; }
    }
    if (!pendingId) pendingId = randomId();
    document.getElementById("agencyRequestId").value = pendingId;
    savedCard.hidden = true;
    busy = true;
    button.disabled = true;
    button.textContent = "FILING THE DOSSIER…";
    report("Sending your story to the private Agency desk…", "pending");
    // A real browser form POST works without a CORS preflight.
    // The receiver must reply with a postMessage acknowledgment to the site.
    form.action = endpoint;
    form.method = "POST";
    form.target = frame.name;
    form.submit();
    timeout = setTimeout(() => {
      if (!busy) return;
      finish();
      report("The Agency couldn't confirm that this file was saved. Your draft is still here. Please check the connection before retrying.", "error");
    }, 35000);
  });
  draft.addEventListener("click", async () => {
    const profile = form.elements.namedItem("profile").value.trim();
    const rant = form.elements.namedItem("rant").value.trim();
    const receipt = form.elements.namedItem("receipt").value.trim();
    if (!profile && !rant && !receipt) { report("Write the nomination first, then copy your draft.", "error"); return; }
    const text = ["KILL COIN / THE AGENCY — PROJECT NOMINATION", "PROJECT / TOKEN / CONTRACT: " + profile, "WHAT HAPPENED: " + rant, "PUBLIC RECEIPTS: " + (receipt || "Not attached")].join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      report("DRAFT COPIED. This only copies your text; it does not file a nomination.", "info");
    } catch {
      report("Copy wasn't available in this browser. Select your text to save it.", "error");
    }
  });
  share.addEventListener("click", () => {
    const text = "I just filed a dossier with THE AGENCY. The trenches have an agency now. ☠️ Join the operation: https://egoshiftlabs.github.io/Killcoin/#nominate @hitlist187 #KillCoin #Hitlist";
    window.open("https://x.com/intent/tweet?text=" + encodeURIComponent(text), "_blank", "noopener,noreferrer");
  });
  markReady();
})();
