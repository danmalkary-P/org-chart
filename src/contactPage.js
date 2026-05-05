export function renderContactPage({ contactData, context, backUrl }) {
  const c = contactData.contact || {};
  const links = contactData.links || {};
  const crmFields = contactData.crmFields || [];
  const issues = contactData.relatedIssues || [];
  const messages = contactData.recentMessages || [];
  const metrics = context.accountMetrics || {};
  const account = context.account || {};

  const initials = nameInitials(c.name);
  const relationship = crmFields.find((f) => f.label === "Relationship")?.value || "";
  const buyingRole = crmFields.find((f) => f.label === "Buying role")?.value || "";
  const openIssues = issues.filter((i) => i.state !== "closed");
  const closedIssues = issues.filter((i) => i.state === "closed");

  const profileFields = crmFields.filter(
    (f) => !["Relationship", "Buying role", "Internal owner"].includes(f.label) && f.value
  );

  const notesJson = JSON.stringify("").replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escHtml(c.name || "Contact")} — Org Mapper</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      :root {
        --bg: #ffffff;
        --surface: #ffffff;
        --surface-soft: #f7f7f8;
        --subtle: #f7f7f8;
        --text: #1b1b1b;
        --text-2: #414348;
        --muted: #5d6373;
        --faint: #99a1b3;
        --line: #e7e8eb;
        --line-soft: #ecedee;
        --line-strong: #d2d5da;
        --primary: #5532ed;
        --primary-hover: #4338ca;
        --primary-soft: #eef2ff;
        --primary-soft-2: #e0e7ff;
        --purple: #5532ed;
        --purple-soft: #eef2ff;
        --green: #047857;
        --green-soft: #d1fae5;
        --yellow: #b45309;
        --yellow-soft: #fde68a;
        --red: #b91c1c;
        --red-soft: #fee2e2;
        --blue: #1d4ed8;
        --blue-soft: #dbeafe;
        --shadow-card: 0 6px 24px 0 rgba(0,0,0,0.08);
        --ring: 0 0 0 3px rgba(85, 50, 237, 0.22);
      }
      *, *::before, *::after { box-sizing: border-box; }
      body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font-family: "IBM Plex Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 13px;
        line-height: 1.5;
        min-height: 100vh;
        -webkit-font-smoothing: antialiased;
      }
      a { color: var(--primary); text-decoration: none; }
      a:hover { text-decoration: underline; }
      h1, h2, h3 { margin: 0; }
      .topbar {
        align-items: center;
        background: var(--surface);
        border-bottom: 1px solid var(--line);
        display: flex;
        gap: 12px;
        justify-content: space-between;
        min-height: 48px;
        padding: 8px 20px;
        position: sticky;
        top: 0;
        z-index: 10;
      }
      .topbar-left {
        align-items: center;
        display: flex;
        gap: 10px;
        min-width: 0;
      }
      .back-link {
        align-items: center;
        color: var(--muted);
        display: flex;
        font-size: 13px;
        font-weight: 500;
        gap: 4px;
        white-space: nowrap;
      }
      .back-link:hover { color: var(--primary); text-decoration: none; }
      .sep { color: var(--line-strong); }
      .topbar-name {
        font-size: 13px;
        font-weight: 600;
        letter-spacing: -0.005em;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .topbar-right {
        display: flex;
        gap: 8px;
        flex-shrink: 0;
      }
      .btn {
        align-items: center;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 6px;
        color: var(--text);
        cursor: pointer;
        display: inline-flex;
        font: inherit;
        font-size: 13px;
        font-weight: 500;
        gap: 5px;
        padding: 6px 11px;
        text-decoration: none;
        transition: background-color 120ms ease, border-color 120ms ease;
      }
      .btn:hover { background: var(--surface-soft); text-decoration: none; }
      .btn-primary {
        background: var(--primary);
        border-color: transparent;
        color: #fff;
      }
      .btn-primary:hover { background: var(--primary-hover); }
      .content-shell {
        display: grid;
        grid-template-columns: 320px 1fr;
        min-height: calc(100vh - 48px);
      }
      .left-col {
        background: var(--surface);
        border-right: 1px solid var(--line);
        overflow-y: auto;
        padding: 22px 20px;
      }
      .right-col {
        background: var(--surface);
        overflow-y: auto;
        padding: 22px 24px;
      }
      .contact-hero {
        align-items: flex-start;
        display: flex;
        gap: 12px;
        margin-bottom: 18px;
      }
      .avatar {
        align-items: center;
        background: var(--primary-soft);
        border-radius: 50%;
        color: var(--primary);
        display: flex;
        flex-shrink: 0;
        font-size: 18px;
        font-weight: 600;
        height: 48px;
        justify-content: center;
        letter-spacing: -0.02em;
        width: 48px;
      }
      .avatar.champion { background: var(--green-soft); color: var(--green); }
      .avatar.risk { background: var(--red-soft); color: var(--red); }
      .hero-text { min-width: 0; }
      .hero-text h1 {
        color: var(--text);
        font-size: 16px;
        font-weight: 600;
        letter-spacing: -0.01em;
        margin-bottom: 2px;
      }
      .hero-title { color: var(--muted); font-size: 12px; margin-bottom: 8px; }
      .badge-row { display: flex; flex-wrap: wrap; gap: 5px; }
      .badge {
        border-radius: 999px;
        display: inline-flex;
        font-size: 11px;
        font-weight: 500;
        padding: 2px 8px;
      }
      .badge-champion { background: var(--green-soft); color: var(--green); }
      .badge-risk { background: var(--red-soft); color: var(--red); }
      .badge-decision { background: var(--primary-soft); color: var(--primary); }
      .badge-neutral { background: var(--surface-soft); color: var(--text-2); }
      .badge-research { background: var(--yellow-soft); color: var(--yellow); }
      .section-divider { border: none; border-top: 1px solid var(--line-soft); margin: 18px 0; }
      .section-label {
        color: var(--muted);
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0;
        margin-bottom: 10px;
        text-transform: none;
      }
      .field-list { display: grid; gap: 7px; }
      .field-row {
        display: grid;
        gap: 6px;
        grid-template-columns: 96px minmax(0, 1fr);
      }
      .field-label { color: var(--muted); font-size: 12px; padding-top: 1px; }
      .field-value { color: var(--text); font-size: 12px; overflow-wrap: anywhere; }
      .field-value a { color: var(--primary); font-weight: 500; }
      .account-chip {
        background: var(--surface-soft);
        border: 1px solid var(--line);
        border-radius: 8px;
        margin-bottom: 18px;
        padding: 12px;
      }
      .account-chip-name {
        color: var(--text);
        font-size: 13px;
        font-weight: 600;
        letter-spacing: -0.005em;
        margin-bottom: 8px;
      }
      .account-chip-metrics {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .metric-pill {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 6px;
        color: var(--muted);
        font-size: 11px;
        padding: 4px 8px;
      }
      .metric-pill strong {
        color: var(--text);
        display: block;
        font-size: 12px;
        font-weight: 600;
      }
      .right-col h2 {
        color: var(--text);
        font-size: 14px;
        font-weight: 600;
        letter-spacing: -0.005em;
        margin-bottom: 10px;
      }
      .right-section { margin-bottom: 24px; }
      .issue-card {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 8px;
        display: block;
        margin-bottom: 8px;
        padding: 11px 13px;
        text-decoration: none;
        transition: border-color 120ms ease, background-color 120ms ease;
      }
      .issue-card:hover {
        background: var(--surface-soft);
        border-color: var(--line-strong);
        text-decoration: none;
      }
      .issue-card-top {
        align-items: center;
        display: flex;
        gap: 8px;
        justify-content: space-between;
        margin-bottom: 4px;
      }
      .issue-number {
        color: var(--muted);
        font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, monospace;
        font-size: 11px;
        font-weight: 500;
      }
      .issue-title {
        color: var(--text);
        font-size: 13px;
        font-weight: 500;
      }
      .issue-meta { color: var(--muted); font-size: 12px; }
      .state-badge {
        border-radius: 999px;
        font-size: 10px;
        font-weight: 500;
        padding: 2px 7px;
        white-space: nowrap;
      }
      .state-waiting_on_you { background: var(--yellow-soft); color: var(--yellow); }
      .state-waiting_on_customer { background: var(--blue-soft); color: var(--blue); }
      .state-new { background: var(--green-soft); color: var(--green); }
      .state-closed { background: var(--surface-soft); color: var(--muted); }
      .state-on_hold { background: var(--primary-soft); color: var(--primary); }
      .priority-high { color: var(--red); }
      .priority-medium { color: var(--yellow); }
      .priority-low { color: var(--muted); }
      .message-thread { display: grid; gap: 8px; }
      .message-item {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 12px 14px;
      }
      .message-item.internal {
        background: var(--primary-soft);
        border-color: var(--primary-soft-2);
      }
      .message-header {
        align-items: center;
        display: flex;
        gap: 8px;
        margin-bottom: 5px;
      }
      .message-author {
        color: var(--text);
        font-size: 12px;
        font-weight: 600;
      }
      .message-time { color: var(--muted); font-size: 11px; }
      .message-internal-tag {
        background: var(--primary);
        border-radius: 4px;
        color: #fff;
        font-size: 10px;
        font-weight: 500;
        letter-spacing: 0.02em;
        padding: 1px 6px;
        text-transform: uppercase;
      }
      .message-body { color: var(--text-2); font-size: 13px; line-height: 1.55; }
      .notes-textarea {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 8px;
        font: inherit;
        font-family: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
        font-size: 13px;
        min-height: 120px;
        padding: 10px 12px;
        resize: vertical;
        width: 100%;
      }
      .notes-textarea:focus {
        border-color: var(--primary);
        box-shadow: var(--ring);
        outline: none;
      }
      .empty-state {
        color: var(--muted);
        font-size: 13px;
        padding: 8px 0;
      }
      @media (max-width: 860px) {
        .content-shell { grid-template-columns: 1fr; }
        .left-col { border-right: none; border-bottom: 1px solid var(--line); }
      }
    </style>
  </head>
  <body>
    <header class="topbar">
      <div class="topbar-left">
        <a class="back-link" href="${escAttr(backUrl)}">← Org Chart</a>
        <span class="sep">|</span>
        <span class="topbar-name">${escHtml(c.name || "Contact")}</span>
      </div>
      <div class="topbar-right">
        ${links.pylonContact ? `<a class="btn" href="${escAttr(links.pylonContact)}" target="_blank" rel="noreferrer">Pylon ↗</a>` : ""}
        ${links.salesforce ? `<a class="btn" href="${escAttr(links.salesforce)}" target="_blank" rel="noreferrer">Salesforce ↗</a>` : ""}
      </div>
    </header>

    <div class="content-shell">
      <aside class="left-col">
        <div class="contact-hero">
          <div class="avatar ${relClass(relationship)}">${escHtml(initials)}</div>
          <div class="hero-text">
            <h1>${escHtml(c.name || "Unknown contact")}</h1>
            <div class="hero-title">${escHtml(c.title || "")}</div>
            <div class="badge-row">
              ${relationship ? `<span class="badge ${badgeClass(relationship)}">${escHtml(relationship)}</span>` : ""}
              ${buyingRole ? `<span class="badge badge-neutral">${escHtml(buyingRole)}</span>` : ""}
            </div>
          </div>
        </div>

        ${account.name ? `
        <div class="account-chip">
          <div class="account-chip-name">${escHtml(account.name)}</div>
          <div class="account-chip-metrics">
            ${metrics.currentArr ? `<div class="metric-pill"><strong>${formatCurrency(metrics.currentArr)}</strong>Current ARR</div>` : ""}
            ${metrics.healthScore != null ? `<div class="metric-pill"><strong>${metrics.healthScore}/10</strong>Health</div>` : ""}
            ${metrics.renewalDate ? `<div class="metric-pill"><strong>${formatDate(metrics.renewalDate)}</strong>Renewal</div>` : ""}
            ${metrics.seatTier ? `<div class="metric-pill"><strong>${escHtml(metrics.seatTier)}</strong>Tier</div>` : ""}
          </div>
        </div>
        ` : ""}

        <div class="section-label">Contact</div>
        <div class="field-list">
          ${fieldRow("Email", c.email ? `<a href="mailto:${escAttr(c.email)}">${escHtml(c.email)}</a>` : null)}
          ${fieldRow("Phone", formatPhone(c.phone))}
          ${fieldRow("Portal role", c.portalRole)}
          ${fieldRow("Account", c.accountId)}
        </div>

        ${profileFields.length ? `
        <hr class="section-divider">
        <div class="section-label">CRM Fields</div>
        <div class="field-list">
          ${profileFields.slice(0, 8).map((f) => fieldRow(f.label, String(f.value || ""))).join("")}
        </div>
        ` : ""}

        ${metrics.products?.length ? `
        <hr class="section-divider">
        <div class="section-label">Products</div>
        <div class="badge-row">
          ${metrics.products.map((p) => `<span class="badge badge-neutral">${escHtml(p)}</span>`).join("")}
        </div>
        ` : ""}

        ${links.evidence ? `
        <hr class="section-divider">
        <div class="section-label">Evidence</div>
        <div class="field-list">
          ${fieldRow("Key issue", `<a href="${escAttr(links.evidence)}" target="_blank" rel="noreferrer">View in Pylon ↗</a>`)}
        </div>
        ` : ""}
      </aside>

      <main class="right-col">
        <section class="right-section">
          <h2>Open Issues (${openIssues.length})</h2>
          ${openIssues.length ? openIssues.map((issue) => renderIssueCard(issue)).join("") : '<div class="empty-state">No open issues for this contact.</div>'}
        </section>

        ${messages.length ? `
        <section class="right-section">
          <h2>Recent Messages</h2>
          <div class="message-thread">
            ${messages.map((msg) => renderMessage(msg)).join("")}
          </div>
        </section>
        ` : ""}

        ${closedIssues.length ? `
        <section class="right-section">
          <h2>Closed Issues (${closedIssues.length})</h2>
          ${closedIssues.map((issue) => renderIssueCard(issue)).join("")}
        </section>
        ` : ""}

        <section class="right-section">
          <h2>Notes</h2>
          <textarea class="notes-textarea" id="notes-input" placeholder="Add stakeholder notes..."></textarea>
          <div style="margin-top: 8px;">
            <button class="btn btn-primary" onclick="saveNotes()">Save notes</button>
          </div>
        </section>
      </main>
    </div>

    <script>
      const contactId = ${JSON.stringify(c.id || "").replace(/</g, "\\u003c")};
      const storageKey = \`contact-notes-\${contactId}\`;

      const notesInput = document.querySelector("#notes-input");
      if (notesInput) {
        try { notesInput.value = localStorage.getItem(storageKey) || ""; } catch {}
      }

      function saveNotes() {
        try { localStorage.setItem(storageKey, notesInput.value); } catch {}
        const btn = document.querySelector("button[onclick='saveNotes()']");
        if (btn) { btn.textContent = "Saved ✓"; setTimeout(() => { btn.textContent = "Save notes"; }, 1800); }
      }

      function formatRelativeTime(iso) {
        if (!iso) return "";
        const ms = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(ms / 60000);
        if (mins < 60) return \`\${mins}m ago\`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return \`\${hrs}h ago\`;
        return \`\${Math.floor(hrs / 24)}d ago\`;
      }

      document.querySelectorAll(".message-time[data-iso]").forEach((el) => {
        el.textContent = formatRelativeTime(el.dataset.iso);
      });
    </script>
  </body>
</html>`;
}

function renderIssueCard(issue) {
  const stateClass = `state-${(issue.state || "").replace(/\s+/g, "_")}`;
  const priorityClass = `priority-${issue.priority || "low"}`;
  const stateLabel = {
    waiting_on_you: "Waiting on you",
    waiting_on_customer: "Waiting on customer",
    new: "New",
    closed: "Closed",
    on_hold: "On hold"
  }[issue.state] || issue.state || "Unknown";
  const content = `
    <div class="issue-card-top">
      <span class="issue-number">#${escHtml(String(issue.number || ""))}</span>
      <span class="state-badge ${stateClass}">${escHtml(stateLabel)}</span>
    </div>
    <div class="issue-title">${escHtml(issue.title || "Untitled")}</div>
    <div class="issue-meta">
      <span class="${priorityClass}">${escHtml(issue.priority || "")}</span>
      ${issue.updatedAt ? ` · ${formatDate(issue.updatedAt)}` : ""}
    </div>`;
  if (issue.url) {
    return `<a class="issue-card" href="${escAttr(issue.url)}" target="_blank" rel="noreferrer">${content}</a>`;
  }
  return `<div class="issue-card">${content}</div>`;
}

function renderMessage(msg) {
  const author = msg.author || {};
  const isInternal = msg.isInternal;
  return `<div class="message-item${isInternal ? " internal" : ""}">
    <div class="message-header">
      <span class="message-author">${escHtml(author.name || "Unknown")}</span>
      ${isInternal ? '<span class="message-internal-tag">Internal</span>' : ""}
      <span class="message-time" data-iso="${escAttr(msg.createdAt || "")}">${escHtml(msg.createdAt || "")}</span>
    </div>
    <div class="message-body">${escHtml(msg.bodyText || "")}</div>
  </div>`;
}

function fieldRow(label, value) {
  if (!value) return "";
  return `<div class="field-row">
    <span class="field-label">${escHtml(label)}</span>
    <span class="field-value">${value}</span>
  </div>`;
}

function relClass(relationship) {
  if (relationship === "Champion / coach") return "champion";
  if (relationship === "Blocker / risk") return "risk";
  return "";
}

function badgeClass(relationship) {
  if (relationship === "Champion / coach") return "badge-champion";
  if (relationship === "Blocker / risk") return "badge-risk";
  if (relationship === "Decision maker") return "badge-decision";
  if (relationship === "Research lead") return "badge-research";
  return "badge-neutral";
}

function nameInitials(name) {
  return String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("") || "?";
}

function formatCurrency(amount) {
  if (!amount) return "";
  const n = Number(amount);
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

function formatPhone(phone) {
  if (!phone) return null;
  const d = String(phone).replace(/\D/g, "");
  if (d.length === 11 && d[0] === "1") {
    return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  }
  return phone;
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

function escHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escAttr(value) {
  return escHtml(value).replace(/`/g, "&#96;");
}
