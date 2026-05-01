export function renderPreviewPage({ title, payload }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f6f8fb;
        --panel: #ffffff;
        --text: #15202b;
        --muted: #667085;
        --border: #d9e0e8;
        --blue: #0b57d0;
        --green: #147a3f;
        --yellow: #8a6100;
        --red: #b42318;
      }
      body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.45;
      }
      header {
        border-bottom: 1px solid var(--border);
        background: var(--panel);
        padding: 20px 24px;
      }
      main {
        max-width: 760px;
        padding: 24px;
      }
      h1 {
        margin: 0 0 6px;
        font-size: 22px;
        letter-spacing: 0;
      }
      .hint {
        color: var(--muted);
        margin: 0;
      }
      .actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 14px;
      }
      .card {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 8px;
        margin-bottom: 14px;
        overflow: hidden;
      }
      .card h2 {
        font-size: 15px;
        margin: 0;
        padding: 12px 14px;
        border-bottom: 1px solid var(--border);
      }
      .card-body {
        padding: 14px;
      }
      .field {
        margin-bottom: 14px;
      }
      .field:last-child {
        margin-bottom: 0;
      }
      .label {
        display: block;
        color: var(--muted);
        font-size: 12px;
        font-weight: 650;
        margin-bottom: 4px;
        text-transform: uppercase;
      }
      .value {
        white-space: pre-wrap;
      }
      .badges {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .badge {
        border-radius: 999px;
        display: inline-flex;
        font-size: 12px;
        font-weight: 750;
        padding: 3px 8px;
      }
      .badge.green { background: #e8f5ed; color: var(--green); }
      .badge.blue { background: #e8f0fe; color: var(--blue); }
      .badge.yellow { background: #fff7df; color: var(--yellow); }
      .badge.red { background: #fdeceb; color: var(--red); }
      .badge.gray { background: #eef2f6; color: #475467; }
      a.button {
        background: var(--blue);
        border-radius: 6px;
        color: white;
        display: inline-block;
        font-weight: 700;
        padding: 9px 12px;
        text-decoration: none;
      }
      a.link {
        color: var(--blue);
        font-weight: 650;
      }
      hr {
        border: 0;
        border-top: 1px solid var(--border);
        margin: 12px 0;
      }
      @media (max-width: 640px) {
        header, main { padding: 18px; }
      }
    </style>
  </head>
  <body>
    <header>
      <h1>${escapeHtml(title)}</h1>
      <p class="hint">Sales preview of the sidebar experience.</p>
      <div class="actions">
        <a class="button" href="/">Home</a>
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
