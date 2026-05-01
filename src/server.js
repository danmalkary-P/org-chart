import http from "node:http";
import { loadConfig } from "./config.js";
import { buildContactDetails } from "./contactDetails.js";
import { buildAccountContext } from "./context.js";
import { errorResponse } from "./pylonComponents.js";
import { renderOrgMapPreview } from "./orgMapPreview.js";
import { renderPreviewPage } from "./previewHtml.js";
import { renderFollowUpText, renderFollowUpWidget } from "./widgets/followUp.js";
import { buildOrgMapPreviewData, renderOrgMapWidget } from "./widgets/orgMap.js";
import { renderWarmIntroText, renderWarmIntroWidget } from "./widgets/warmIntro.js";

export function createAppServer({ config = loadConfig() } = {}) {
  return http.createServer(async (req, res) => {
    const result = await routeRequest({
      method: req.method,
      url: req.url,
      headers: req.headers,
      config
    });
    writeResult(res, result);
  });
}

export async function routeRequest({ method = "GET", url: rawUrl = "/", headers = {}, config = loadConfig() }) {
  try {
    const baseUrl = requestBaseUrl(headers, config);
    const url = new URL(rawUrl, baseUrl);

    if (url.pathname === "/" && method === "GET") {
      return htmlResult(homeHtml(config));
    }

    if (url.pathname === "/compose" && method === "GET") {
      return htmlResult(composeHtml(config));
    }

    if (url.pathname === "/health" && method === "GET") {
      return jsonResult({ ok: true, service: "pylon-sales-heat" });
    }

    if (url.pathname === "/pylon/endpoints.json" && method === "GET") {
      return jsonResult({
        service: "pylon-sales-heat",
        customApps: {
          followUpWriter: `${baseUrl}/widgets/follow-up`,
          warmIntroMapper: `${baseUrl}/widgets/warm-intro`,
          orgChartMapper: `${baseUrl}/widgets/org-map`
        },
        verification: "Pylon calls each widget with request_type=verify&code=...; the endpoint echoes { code }.",
        browserPreviews: {
          followUpWriter: `${baseUrl}/preview/follow-up?account_id=acme-risk`,
          warmIntroMapper: `${baseUrl}/preview/warm-intro?account_id=acme-risk`,
          orgChartMapper: `${baseUrl}/preview/org-map?account_id=acme-risk`
        }
      });
    }

    if (url.pathname === "/api/contact-details" && method === "GET") {
      return jsonResult(await buildContactDetails(url.searchParams, config));
    }

    if (url.pathname === "/preview/follow-up" && method === "GET") {
      const { context, modeInfo } = await buildAccountContext(url.searchParams, config);
      const payload = renderFollowUpWidget({
        context,
        modeInfo,
        baseUrl,
        searchParams: url.searchParams,
        liveEnabled: Boolean(config.pylonApiToken)
      });
      return htmlResult(
        renderPreviewPage({
          title: "Follow-Up Writer",
          payload
        })
      );
    }

    if (url.pathname === "/preview/warm-intro" && method === "GET") {
      const { context, modeInfo } = await buildAccountContext(url.searchParams, config);
      const payload = renderWarmIntroWidget({
        context,
        modeInfo,
        baseUrl,
        searchParams: url.searchParams,
        liveEnabled: Boolean(config.pylonApiToken)
      });
      return htmlResult(
        renderPreviewPage({
          title: "Warm Intro Mapper",
          payload
        })
      );
    }

    if (url.pathname === "/preview/org-map" && method === "GET") {
      const { context } = await buildAccountContext(url.searchParams, config);
      return htmlResult(renderOrgMapPreview({ analysis: buildOrgMapPreviewData(context) }));
    }

    if (url.pathname === "/widgets/follow-up" && method === "GET") {
      const verification = verificationResult(url);
      if (verification) return verification;

      const { context, modeInfo } = await buildAccountContext(url.searchParams, config);
      return jsonResult(
        renderFollowUpWidget({
          context,
          modeInfo,
          baseUrl,
          searchParams: url.searchParams,
          liveEnabled: Boolean(config.pylonApiToken)
        })
      );
    }

    if (url.pathname === "/widgets/warm-intro" && method === "GET") {
      const verification = verificationResult(url);
      if (verification) return verification;

      const { context, modeInfo } = await buildAccountContext(url.searchParams, config);
      return jsonResult(
        renderWarmIntroWidget({
          context,
          modeInfo,
          baseUrl,
          searchParams: url.searchParams,
          liveEnabled: Boolean(config.pylonApiToken)
        })
      );
    }

    if (url.pathname === "/widgets/org-map" && method === "GET") {
      const verification = verificationResult(url);
      if (verification) return verification;

      const { context, modeInfo } = await buildAccountContext(url.searchParams, config);
      return jsonResult(
        renderOrgMapWidget({
          context,
          modeInfo,
          baseUrl,
          searchParams: url.searchParams,
          liveEnabled: Boolean(config.pylonApiToken)
        })
      );
    }

    if (url.pathname === "/drafts/follow-up.txt" && method === "GET") {
      const { context } = await buildAccountContext(url.searchParams, config);
      return textResult(renderFollowUpText(context));
    }

    if (url.pathname === "/drafts/intro-ask.txt" && method === "GET") {
      const { context } = await buildAccountContext(url.searchParams, config);
      return textResult(renderWarmIntroText(context));
    }

    if (url.pathname === "/debug/context" && method === "GET") {
      const { context, modeInfo } = await buildAccountContext(url.searchParams, config);
      return jsonResult({ modeInfo, context });
    }

    return jsonResult(errorResponse(`No route for ${method} ${url.pathname}`), 404);
  } catch (error) {
    return jsonResult(errorResponse(error.message), 200);
  }
}

function verificationResult(url) {
  if (url.searchParams.get("request_type") !== "verify") return null;
  return jsonResult({ code: url.searchParams.get("code") || "" });
}

function requestBaseUrl(headers, config) {
  if (config.publicBaseUrl) return config.publicBaseUrl;

  const proto = headers["x-forwarded-proto"] || "http";
  const host = headers["x-forwarded-host"] || headers.host || `localhost:${config.port}`;
  return `${proto}://${host}`;
}

function jsonResult(payload, statusCode = 200) {
  return {
    statusCode,
    headers: jsonHeaders(),
    body: JSON.stringify(payload, null, 2)
  };
}

function textResult(payload, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store"
    },
    body: payload
  };
}

function htmlResult(payload, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    },
    body: payload
  };
}

function jsonHeaders() {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  };
}

function writeResult(res, result) {
  res.writeHead(result.statusCode, result.headers);
  res.end(result.body);
}

function homeHtml(config) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Pylon Sales Heat</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      :root {
        --bg: #f6f8fb;
        --surface: #ffffff;
        --text: #15202b;
        --muted: #667085;
        --border: #d9e0e8;
        --blue: #0b57d0;
        --blue-soft: #e8f0fe;
        --purple: #5b2df5;
        --purple-soft: #f1edff;
        --green: #147a3f;
        --green-soft: #e8f5ed;
      }
      body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.5;
        min-height: 100vh;
      }
      header {
        background: var(--surface);
        border-bottom: 1px solid var(--border);
        padding: 18px 32px;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .logo {
        width: 32px;
        height: 32px;
        background: var(--purple);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 800;
        font-size: 15px;
        flex-shrink: 0;
      }
      .logo-text {
        font-weight: 700;
        font-size: 16px;
        letter-spacing: -0.01em;
      }
      .logo-text span {
        color: var(--muted);
        font-weight: 400;
        margin-left: 6px;
        font-size: 13px;
      }
      main {
        max-width: 900px;
        margin: 0 auto;
        padding: 48px 24px 64px;
      }
      .hero {
        margin-bottom: 40px;
      }
      .hero h1 {
        font-size: 32px;
        font-weight: 800;
        letter-spacing: -0.02em;
        margin: 0 0 10px;
        line-height: 1.2;
      }
      .hero p {
        color: var(--muted);
        font-size: 17px;
        margin: 0 0 24px;
      }
      .hero-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      .btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 10px 16px;
        border-radius: 7px;
        font-weight: 650;
        font-size: 14px;
        text-decoration: none;
        border: 1px solid transparent;
        cursor: pointer;
        transition: filter 120ms ease, box-shadow 120ms ease;
      }
      .btn:hover { filter: brightness(0.94); }
      .btn-primary { background: var(--purple); color: white; }
      .btn-secondary { background: var(--surface); color: var(--text); border-color: var(--border); }
      .section-label {
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--muted);
        margin: 0 0 14px;
      }
      .cards {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 16px;
        margin-bottom: 36px;
      }
      .card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 20px;
        text-decoration: none;
        color: inherit;
        display: flex;
        flex-direction: column;
        gap: 10px;
        transition: border-color 130ms ease, box-shadow 130ms ease, transform 130ms ease;
      }
      .card:hover {
        border-color: var(--purple);
        box-shadow: 0 4px 16px rgba(91, 45, 245, 0.10);
        transform: translateY(-2px);
      }
      .card-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
      }
      .card-icon.blue { background: var(--blue-soft); }
      .card-icon.purple { background: var(--purple-soft); }
      .card-icon.green { background: var(--green-soft); }
      .card h2 {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
      }
      .card p {
        margin: 0;
        color: var(--muted);
        font-size: 13px;
        line-height: 1.5;
        flex: 1;
      }
      .card-cta {
        font-size: 13px;
        font-weight: 650;
        color: var(--purple);
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .status-bar {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 12px 16px;
        display: flex;
        gap: 20px;
        flex-wrap: wrap;
        font-size: 13px;
      }
      .status-item {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--muted);
      }
      .status-dot {
        width: 7px;
        height: 7px;
        border-radius: 999px;
        flex-shrink: 0;
      }
      .dot-green { background: #2dce89; }
      .dot-yellow { background: #f6c90e; }
      .status-item strong { color: var(--text); }
    </style>
  </head>
  <body>
    <header>
      <div class="logo">P</div>
      <div>
        <div class="logo-text">Pylon Sales Heat<span>Sales intelligence widgets</span></div>
      </div>
    </header>
    <main>
      <div class="hero">
        <h1>Support-aware sales workflows</h1>
        <p>Turn Pylon account context into follow-up emails, warm intro paths, and org chart maps — right inside your CRM sidebar.</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="/compose">Build a demo with your inputs</a>
          <a class="btn btn-secondary" href="/pylon/endpoints.json">API endpoints</a>
        </div>
      </div>

      <div class="section-label">Try the widgets (demo account: Acme Robotics)</div>
      <div class="cards">
        <a class="card" href="/preview/follow-up?account_id=acme-risk">
          <div class="card-icon blue">✉</div>
          <h2>Follow-Up Writer</h2>
          <p>Drafts a post-call email grounded in open Pylon issues, calendar context, and committed next steps. Keeps promises separate from commercial asks.</p>
          <div class="card-cta">Open preview →</div>
        </a>
        <a class="card" href="/preview/warm-intro?account_id=acme-risk">
          <div class="card-icon green">🤝</div>
          <h2>Warm Intro Mapper</h2>
          <p>Scores internal teammates by their relationship strength to a contact and drafts a precise intro-ask. Surfaces LinkedIn multithread candidates.</p>
          <div class="card-cta">Open preview →</div>
        </a>
        <a class="card" href="/preview/org-map?account_id=acme-risk">
          <div class="card-icon purple">🗂</div>
          <h2>Org Chart Mapper</h2>
          <p>Builds an interactive buying-team hierarchy from Pylon contacts. Drag people into position, see coverage gaps, and track decision-maker paths.</p>
          <div class="card-cta">Open preview →</div>
        </a>
      </div>

      <div class="status-bar">
        <div class="status-item">
          <div class="status-dot ${config.pylonApiToken ? "dot-green" : "dot-yellow"}"></div>
          <span>Live Pylon data: <strong>${config.pylonApiToken ? "connected" : "not configured"}</strong></span>
        </div>
        <div class="status-item">
          <div class="status-dot dot-green"></div>
          <span>Mode: <strong>${config.demoMode}</strong></span>
        </div>
        <div class="status-item">
          <a href="/health" style="color: inherit; text-decoration: none;">Health check ↗</a>
        </div>
      </div>
    </main>
  </body>
</html>`;
}

function composeHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Input Builder — Pylon Sales Heat</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      :root {
        --bg: #f6f8fb;
        --surface: #ffffff;
        --text: #15202b;
        --muted: #667085;
        --border: #d9e0e8;
        --border-focus: #5b2df5;
        --purple: #5b2df5;
        --purple-soft: #f1edff;
      }
      body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.5;
        min-height: 100vh;
      }
      header {
        background: var(--surface);
        border-bottom: 1px solid var(--border);
        padding: 14px 28px;
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .back-link {
        color: var(--muted);
        text-decoration: none;
        font-size: 14px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .back-link:hover { color: var(--text); }
      .header-sep { color: var(--border); }
      .header-title { font-weight: 700; font-size: 15px; }
      main {
        max-width: 680px;
        margin: 0 auto;
        padding: 36px 24px 56px;
      }
      .page-header {
        margin-bottom: 28px;
      }
      .page-header h1 {
        font-size: 24px;
        font-weight: 800;
        letter-spacing: -0.015em;
        margin: 0 0 6px;
      }
      .page-header p {
        color: var(--muted);
        font-size: 14px;
        margin: 0;
      }
      .form-section {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 16px;
      }
      .form-section-title {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--muted);
        margin: 0 0 16px;
      }
      .field {
        margin-bottom: 16px;
      }
      .field:last-child { margin-bottom: 0; }
      label {
        display: block;
        font-weight: 650;
        font-size: 13px;
        margin-bottom: 5px;
      }
      .field-hint {
        color: var(--muted);
        font-size: 12px;
        margin: 4px 0 0;
      }
      input, textarea {
        display: block;
        width: 100%;
        padding: 9px 11px;
        border: 1px solid var(--border);
        border-radius: 7px;
        font: inherit;
        font-size: 14px;
        background: var(--surface);
        color: var(--text);
        outline: none;
        transition: border-color 120ms ease, box-shadow 120ms ease;
      }
      input:focus, textarea:focus {
        border-color: var(--border-focus);
        box-shadow: 0 0 0 3px rgba(91, 45, 245, 0.12);
      }
      textarea { min-height: 90px; resize: vertical; }
      code {
        background: #f3f5f7;
        padding: 2px 5px;
        border-radius: 4px;
        font-size: 12px;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 10px 16px;
        border-radius: 7px;
        font: inherit;
        font-weight: 650;
        font-size: 14px;
        text-decoration: none;
        border: 1px solid transparent;
        cursor: pointer;
        transition: filter 120ms ease;
      }
      .btn:hover { filter: brightness(0.93); }
      .btn-primary { background: var(--purple); color: white; border: none; }
      .btn-secondary { background: var(--surface); color: var(--text); border-color: var(--border); }
    </style>
  </head>
  <body>
    <header>
      <a class="back-link" href="/">← Home</a>
      <span class="header-sep">|</span>
      <span class="header-title">Input Builder</span>
    </header>
    <main>
      <div class="page-header">
        <h1>Build a widget preview</h1>
        <p>Paste post-call notes, calendar context, or LinkedIn leads to preview any widget with realistic data — no query-string editing needed.</p>
      </div>

      <div class="form-section">
        <div class="form-section-title">Account</div>
        <div class="field">
          <label for="account">Account ID</label>
          <input id="account" value="acme-risk" placeholder="e.g. acme-risk">
          <div class="field-hint">Use <code>acme-risk</code> for the high-signal demo or <code>quiet-bank</code> for a low-signal one.</div>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-title">Sales context</div>
        <div class="field">
          <label for="notes">Post-call notes</label>
          <textarea id="notes">Next step: send SSO validation by Monday. Also multithread the operations buyer from LinkedIn.</textarea>
          <div class="field-hint">What happened on the call? Commitments, blockers, next steps.</div>
        </div>
        <div class="field">
          <label for="calendar">Calendar summary</label>
          <textarea id="calendar">Pylon Google Calendar says this meeting is a renewal risk sync.</textarea>
          <div class="field-hint">Paste the meeting description or a Gong/Chorus summary.</div>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-title">LinkedIn multithread leads</div>
        <div class="field">
          <label for="people">People</label>
          <textarea id="people">Jordan Avery|VP Operations|Acme Robotics|https://linkedin.com/in/jordan-avery|Owns field operations rollout</textarea>
          <div class="field-hint">One person per line: <code>Name | Title | Company | LinkedIn URL | Notes</code></div>
        </div>
      </div>

      <div class="actions">
        <button type="button" class="btn btn-primary" onclick="openWidget('follow-up')">✉ Follow-Up Writer</button>
        <button type="button" class="btn btn-secondary" onclick="openWidget('warm-intro')">🤝 Warm Intro Mapper</button>
        <button type="button" class="btn btn-secondary" onclick="openWidget('org-map')">🗂 Org Chart Mapper</button>
      </div>
      <script>
        function buildParams() {
          const params = new URLSearchParams();
          params.set("account_id", document.querySelector("#account").value || "acme-risk");
          const notes = document.querySelector("#notes").value;
          const calendar = document.querySelector("#calendar").value;
          const people = document.querySelector("#people").value;
          if (notes) params.set("post_call_notes", notes);
          if (calendar) params.set("calendar_summary", calendar);
          if (people) params.set("linkedin_people", people);
          return params;
        }

        function openWidget(name) {
          window.location.href = "/preview/" + name + "?" + buildParams().toString();
        }
      </script>
    </main>
  </body>
</html>`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadConfig();
  const server = createAppServer({ config });
  server.listen(config.port, () => {
    console.log(`Pylon Sales Heat listening on http://localhost:${config.port}`);
  });
}
