export function renderPreviewPage({ title, payload }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      :root {
        color-scheme: light;
        --bg: #ffffff;
        --bg-soft: #f7f7f8;
        --panel: #ffffff;
        --text: #1b1b1b;
        --text-2: #414348;
        --muted: #5d6373;
        --border: #e7e8eb;
        --border-soft: #ecedee;
        --primary: #5532ed;
        --primary-hover: #4338ca;
        --primary-soft: #eef2ff;
        --primary-soft-2: #e0e7ff;
        --blue: #1d4ed8;
        --green: #047857;
        --green-soft: #d1fae5;
        --yellow: #b45309;
        --yellow-soft: #fde68a;
        --red: #b91c1c;
        --red-soft: #fee2e2;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font-family: "IBM Plex Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 13px;
        line-height: 1.5;
        -webkit-font-smoothing: antialiased;
      }
      header {
        align-items: center;
        background: var(--panel);
        border-bottom: 1px solid var(--border);
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
        min-height: 48px;
        padding: 8px 20px;
      }
      .header-nav {
        align-items: center;
        display: flex;
        flex: 1;
        gap: 8px;
        min-width: 0;
      }
      .back-link {
        color: var(--muted);
        font-size: 13px;
        font-weight: 500;
        text-decoration: none;
        white-space: nowrap;
      }
      .back-link:hover { color: var(--primary); }
      .breadcrumb-sep { color: var(--border); font-size: 14px; }
      .breadcrumb-current {
        color: var(--text);
        font-size: 13px;
        font-weight: 600;
        letter-spacing: -0.005em;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .header-badge {
        align-items: center;
        background: var(--primary-soft);
        border: 1px solid var(--primary-soft-2);
        border-radius: 999px;
        color: var(--primary);
        display: inline-flex;
        font-size: 11px;
        font-weight: 500;
        gap: 5px;
        padding: 2px 8px;
        white-space: nowrap;
      }
      .header-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      main {
        max-width: 760px;
        padding: 24px;
      }
      h1 {
        font-size: 20px;
        font-weight: 600;
        letter-spacing: -0.01em;
        margin: 0 0 6px;
      }
      .hint {
        color: var(--muted);
        margin: 0;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 14px;
      }
      .card {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 8px;
        margin-bottom: 12px;
        overflow: hidden;
      }
      .card h2 {
        border-bottom: 1px solid var(--border-soft);
        font-size: 13px;
        font-weight: 600;
        letter-spacing: -0.005em;
        margin: 0;
        padding: 10px 14px;
      }
      .card-body {
        padding: 14px;
      }
      .field {
        margin-bottom: 12px;
      }
      .field:last-child {
        margin-bottom: 0;
      }
      .label {
        color: var(--muted);
        display: block;
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0;
        margin-bottom: 4px;
        text-transform: none;
      }
      .value {
        color: var(--text);
        font-size: 13px;
        white-space: pre-wrap;
      }
      .badges {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .badge {
        border-radius: 999px;
        display: inline-flex;
        font-size: 11px;
        font-weight: 500;
        padding: 2px 8px;
      }
      .badge.green { background: var(--green-soft); color: var(--green); }
      .badge.blue { background: var(--primary-soft); color: var(--primary); }
      .badge.yellow { background: var(--yellow-soft); color: var(--yellow); }
      .badge.red { background: var(--red-soft); color: var(--red); }
      .badge.gray { background: var(--bg-soft); color: var(--text-2); }
      a.button {
        background: var(--primary);
        border-radius: 6px;
        color: #fff;
        display: inline-flex;
        align-items: center;
        font-size: 13px;
        font-weight: 500;
        padding: 7px 11px;
        text-decoration: none;
        transition: background-color 120ms ease;
      }
      a.button:hover { background: var(--primary-hover); }
      a.link {
        color: var(--primary);
        font-weight: 500;
      }
      a.link:hover { text-decoration: underline; }
      hr {
        border: 0;
        border-top: 1px solid var(--border-soft);
        margin: 12px 0;
      }
      @media (max-width: 640px) {
        header, main { padding: 14px 18px; }
      }
    </style>
  </head>
  <body>
    <header>
      <div class="header-nav">
        <a class="back-link" href="/">← Home</a>
        <span class="breadcrumb-sep">/</span>
        <span class="breadcrumb-current">${escapeHtml(title)}</span>
      </div>
      <span class="header-badge">Preview · Sidebar experience</span>
      <div class="header-actions">
        <a class="button" href="/compose">Input builder</a>
      </div>
    </header>
    <main>
      ${payload.components.map(renderComponent).join("\n")}
    </main>
  </body>
</html>`;
}

function renderComponent(component) {
  if (component.type === "card") {
    return `<section class="card">
      <h2>${escapeHtml(component.header?.title || "Card")}</h2>
      <div class="card-body">${(component.components || []).map(renderComponent).join("\n")}</div>
    </section>`;
  }

  if (component.type === "text") {
    return `<div class="field">
      <span class="label">${escapeHtml(component.label || "Text")}</span>
      <div class="value">${escapeHtml(component.value || "")}</div>
    </div>`;
  }

  if (component.type === "badge") {
    return `<div class="field">
      <span class="label">${escapeHtml(component.label || "Status")}</span>
      <div class="badges">${(component.items || []).map(renderBadge).join("")}</div>
    </div>`;
  }

  if (component.type === "button") {
    return `<div class="field"><a class="button" href="${escapeAttr(previewUrl(component.url || "#"))}">${escapeHtml(component.label || "Open")}</a></div>`;
  }

  if (component.type === "link") {
    return `<div class="field"><a class="link" href="${escapeAttr(component.url || "#")}">${escapeHtml(component.label || component.url || "Link")}</a></div>`;
  }

  if (component.type === "divider") {
    return "<hr>";
  }

  return `<pre>${escapeHtml(JSON.stringify(component, null, 2))}</pre>`;
}

function renderBadge(item) {
  const color = ["green", "blue", "yellow", "red", "gray"].includes(item.color) ? item.color : "gray";
  return `<span class="badge ${color}">${escapeHtml(item.value || "")}</span>`;
}

function previewUrl(value) {
  try {
    const url = new URL(value, "http://localhost");
    if (url.pathname === "/widgets/follow-up") {
      return `/preview/follow-up${url.search}`;
    }
    if (url.pathname === "/widgets/warm-intro") {
      return `/preview/warm-intro${url.search}`;
    }
    if (url.pathname === "/widgets/org-map") {
      return `/preview/org-map${url.search}`;
    }
  } catch {
    return value;
  }

  return value;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
