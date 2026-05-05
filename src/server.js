import http from "node:http";
import { loadConfig, saveSavedConfig } from "./config.js";
import { buildContactDetails } from "./contactDetails.js";
import { buildAccountContext } from "./context.js";
import { errorResponse } from "./pylonComponents.js";
import { renderOrgMapPreview } from "./orgMapPreview.js";
import { renderContactPage } from "./contactPage.js";
import { renderPreviewPage } from "./previewHtml.js";
import { renderFollowUpText, renderFollowUpWidget } from "./widgets/followUp.js";
import { buildOrgMapPreviewData, renderOrgMapWidget } from "./widgets/orgMap.js";
import { renderWarmIntroText, renderWarmIntroWidget } from "./widgets/warmIntro.js";

export function createAppServer({ config: _initialConfig = loadConfig() } = {}) {
  return http.createServer(async (req, res) => {
    const result = await routeRequest({
      method: req.method,
      url: req.url,
      headers: req.headers,
      config: loadConfig(),
      body: await readBody(req)
    });
    writeResult(res, result);
  });
}

function readBody(req) {
  return new Promise((resolve) => {
    if (req.method === "GET" || req.method === "HEAD") {
      resolve("");
      return;
    }
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => resolve(data));
    req.on("error", () => resolve(""));
  });
}

export async function routeRequest({ method = "GET", url: rawUrl = "/", headers = {}, config = loadConfig(), body = "" }) {
  try {
    const baseUrl = requestBaseUrl(headers, config);
    const url = new URL(rawUrl, baseUrl);

    if (url.pathname === "/" && method === "GET") {
      return htmlResult(homeHtml(config));
    }

    if (url.pathname === "/compose" && method === "GET") {
      return htmlResult(composeHtml(config));
    }

    if (url.pathname === "/settings" && method === "GET") {
      return htmlResult(settingsHtml(config));
    }

    if (url.pathname === "/api/settings" && method === "POST") {
      try {
        const payload = body ? JSON.parse(body) : {};
        const updates = {};
        if (typeof payload.pylonMcpUrl === "string") updates.pylonMcpUrl = payload.pylonMcpUrl.trim();
        if (typeof payload.pylonApiBase === "string") updates.pylonApiBase = payload.pylonApiBase.trim();
        if (typeof payload.pylonApiToken === "string" && payload.pylonApiToken && !payload.pylonApiToken.startsWith("•")) {
          updates.pylonApiToken = payload.pylonApiToken.trim();
        }
        if (payload.clearToken === true) updates.pylonApiToken = "";
        saveSavedConfig(updates);
        const fresh = loadConfig();
        return jsonResult({
          ok: true,
          tokenSource: fresh.pylonTokenSource,
          tokenConfigured: Boolean(fresh.pylonApiToken),
          pylonMcpUrl: fresh.pylonMcpUrl,
          pylonApiBase: fresh.pylonApiBase
        });
      } catch (error) {
        return jsonResult({ ok: false, error: error.message }, 200);
      }
    }

    if (url.pathname === "/api/test-mcp" && method === "POST") {
      const fresh = loadConfig();
      if (!fresh.pylonApiToken) {
        return jsonResult({ ok: false, error: "No Pylon token saved. Add one in settings first." }, 200);
      }
      try {
        const response = await fetch(`${fresh.pylonApiBase}/me`, {
          headers: { Authorization: `Bearer ${fresh.pylonApiToken}`, Accept: "application/json" }
        });
        const text = await response.text();
        if (!response.ok) {
          return jsonResult({ ok: false, error: `Pylon API ${response.status}: ${text.slice(0, 200)}` }, 200);
        }
        const me = JSON.parse(text);
        return jsonResult({
          ok: true,
          identity: { name: me?.data?.name || me?.name || "Pylon user", email: me?.data?.email || me?.email || "" },
          mcpUrl: fresh.pylonMcpUrl,
          apiBase: fresh.pylonApiBase
        });
      } catch (error) {
        return jsonResult({ ok: false, error: error.message }, 200);
      }
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
          orgChartMapper: `${baseUrl}/preview/org-map?account_id=acme-risk`
        }
      });
    }

    if (url.pathname === "/api/contact-details" && method === "GET") {
      return jsonResult(await buildContactDetails(url.searchParams, config));
    }

    if (url.pathname === "/api/accounts/search" && method === "GET") {
      const q = (url.searchParams.get("q") || "").trim();
      if (!q) return jsonResult({ accounts: [] });
      if (!config.pylonApiToken) return jsonResult({ accounts: [], error: "No Pylon token configured." });
      try {
        const { PylonClient, normalizeAccount } = await import("./pylonClient.js");
        const client = new PylonClient({ baseUrl: config.pylonApiBase, token: config.pylonApiToken });
        const result = await client.searchAccountsByName(q, 10);
        const accounts = (Array.isArray(result?.data) ? result.data : [])
          .map(normalizeAccount)
          .map((a) => ({ id: a.id, name: a.name, domain: a.domains?.[0] || "" }));
        return jsonResult({ accounts });
      } catch (error) {
        return jsonResult({ accounts: [], error: error.message });
      }
    }

    if (url.pathname === "/api/test-connection" && method === "GET") {
      if (!config.pylonApiToken) {
        return jsonResult({ ok: false, error: "PYLON_API_TOKEN is not set. Add it to your .env file." }, 200);
      }
      try {
        const { PylonClient } = await import("./pylonClient.js");
        const client = new PylonClient({ baseUrl: config.pylonApiBase, token: config.pylonApiToken });
        const result = await client.searchIssuesByAccount("test");
        return jsonResult({ ok: true, mode: "live", apiBase: config.pylonApiBase, message: "Pylon API connection successful." });
      } catch (error) {
        return jsonResult({ ok: false, error: error.message, hint: "Check that PYLON_API_TOKEN is valid and has API access." }, 200);
      }
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

    if (url.pathname === "/preview/org-map" && method === "GET") {
      const { context } = await buildAccountContext(url.searchParams, config);
      return htmlResult(renderOrgMapPreview({ analysis: buildOrgMapPreviewData(context), context }));
    }

    if (url.pathname === "/preview/contact" && method === "GET") {
      const accountId = url.searchParams.get("account_id") || "";
      const [contactData, { context }] = await Promise.all([
        buildContactDetails(url.searchParams, config),
        buildAccountContext(url.searchParams, config)
      ]);
      const backUrl = `${baseUrl}/preview/org-map${accountId ? `?account_id=${encodeURIComponent(accountId)}` : ""}`;
      return htmlResult(renderContactPage({ contactData, context, backUrl }));
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
        gap: 12px;
      }
      .logo {
        width: 28px; height: 28px;
        background: var(--purple);
        border-radius: 7px;
        display: flex; align-items: center; justify-content: center;
        color: white;
        font-weight: 800;
        font-size: 14px;
      }
      .logo-text { font-weight: 700; font-size: 15px; letter-spacing: -0.01em; }
      .logo-text span { color: var(--muted); font-weight: 400; margin-left: 6px; font-size: 13px; }
      main {
        min-height: calc(100vh - 60px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }
      .search-stack {
        width: 100%;
        max-width: 560px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
      }
      .search-stack h1 {
        font-size: 22px;
        font-weight: 700;
        letter-spacing: -0.01em;
        margin: 0 0 4px;
        text-align: center;
      }
      .search-stack .lead {
        color: var(--muted);
        font-size: 14px;
        margin: 0 0 8px;
        text-align: center;
      }
      .search-wrapper { position: relative; width: 100%; }
      .search-input {
        width: 100%;
        padding: 14px 18px 14px 46px;
        border: 1px solid var(--border);
        border-radius: 10px;
        font-size: 16px;
        font-family: inherit;
        background: var(--surface);
        color: var(--text);
        outline: none;
        box-shadow: 0 1px 2px rgba(15,23,42,0.04);
        transition: border-color 120ms ease, box-shadow 120ms ease;
      }
      .search-input:focus {
        border-color: var(--purple);
        box-shadow: 0 0 0 3px rgba(91,45,245,0.14);
      }
      .search-icon {
        position: absolute;
        left: 16px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--muted);
        pointer-events: none;
        font-size: 17px;
      }
      .search-dropdown {
        position: absolute;
        top: calc(100% + 6px);
        left: 0; right: 0;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 10px;
        box-shadow: 0 6px 24px rgba(0,0,0,0.08);
        z-index: 100;
        overflow: hidden;
      }
      .search-dropdown.hidden { display: none; }
      .dropdown-item {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 12px 16px;
        cursor: pointer;
        font-size: 14px;
        transition: background 80ms ease;
      }
      .dropdown-item:hover, .dropdown-item.active { background: var(--purple-soft); }
      .dropdown-item-name { font-weight: 600; color: var(--text); }
      .dropdown-item-domain { font-size: 12px; color: var(--muted); }
      .dropdown-empty { padding: 12px 16px; font-size: 13px; color: var(--muted); }
      .recent-accounts {
        width: 100%;
        margin-top: 6px;
      }
      .recent-accounts.hidden { display: none; }
      .recent-label {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--muted);
        margin: 0 0 6px;
        padding: 0 4px;
      }
      .recent-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .recent-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border-radius: 8px;
        cursor: pointer;
        transition: background 80ms ease;
      }
      .recent-item:hover { background: var(--surface); }
      .recent-item-icon {
        width: 24px; height: 24px;
        border-radius: 6px;
        background: var(--purple-soft);
        color: var(--purple);
        display: flex; align-items: center; justify-content: center;
        font-weight: 700;
        font-size: 11px;
        flex-shrink: 0;
      }
      .recent-item-text {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 1px;
        min-width: 0;
      }
      .recent-item-name {
        font-weight: 600;
        font-size: 14px;
        color: var(--text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .recent-item-domain {
        font-size: 12px;
        color: var(--muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .recent-item-remove {
        background: none;
        border: 0;
        color: var(--muted);
        font-size: 16px;
        line-height: 1;
        cursor: pointer;
        padding: 4px 6px;
        border-radius: 4px;
        opacity: 0;
        transition: opacity 80ms ease, background 80ms ease, color 80ms ease;
      }
      .recent-item:hover .recent-item-remove { opacity: 1; }
      .recent-item-remove:hover { background: rgba(0,0,0,0.05); color: var(--text); }
      .hint { color: var(--muted); font-size: 12px; }
      .hint kbd {
        background: var(--surface);
        border: 1px solid var(--border);
        border-bottom-width: 2px;
        border-radius: 5px;
        padding: 1px 6px;
        font-family: ui-monospace, monospace;
        font-size: 11px;
      }
    </style>
  </head>
  <body>
    <header>
      <div class="logo">P</div>
      <div class="logo-text">Pylon Sales Heat<span>${config.pylonApiToken ? "Live mode" : "Configure token in Settings"}</span></div>
    </header>
    <main>
      <div class="search-stack">
        <h1>Look up an account</h1>
        <p class="lead">Search Pylon by account name, then hit <kbd>↵</kbd> to open the org chart.</p>
        <div class="search-wrapper">
          <span class="search-icon">⌕</span>
          <input id="account-search" class="search-input" type="text" placeholder="Search accounts…" autocomplete="off" autofocus>
          <div id="search-dropdown" class="search-dropdown hidden"></div>
        </div>
        <div class="hint"><kbd>↑</kbd> <kbd>↓</kbd> to navigate, <kbd>↵</kbd> to open, <kbd>esc</kbd> to clear</div>
        <div id="recent-accounts" class="recent-accounts hidden">
          <div class="recent-label">Recent</div>
          <div id="recent-list" class="recent-list"></div>
        </div>
      </div>
    </main>
    <script>
      const searchInput = document.getElementById("account-search");
      const dropdown = document.getElementById("search-dropdown");

      let debounceTimer = null;
      let activeIndex = -1;
      let results = [];

      const RECENT_KEY = "pylon-recent-accounts";
      const RECENT_MAX = 8;

      function loadRecent() {
        try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); }
        catch { return []; }
      }
      function saveRecent(account) {
        try {
          const list = loadRecent().filter((a) => a.id !== account.id);
          list.unshift({
            id: account.id,
            name: account.name || "",
            domain: account.domain || "",
            viewedAt: Date.now()
          });
          localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
        } catch {}
      }
      function removeRecent(id) {
        try {
          const list = loadRecent().filter((a) => a.id !== id);
          localStorage.setItem(RECENT_KEY, JSON.stringify(list));
          renderRecent();
        } catch {}
      }
      function renderRecent() {
        const wrap = document.getElementById("recent-accounts");
        const list = document.getElementById("recent-list");
        const items = loadRecent();
        if (!items.length) { wrap.classList.add("hidden"); return; }
        wrap.classList.remove("hidden");
        list.innerHTML = items.map((a) =>
          '<div class="recent-item" data-id="' + escapeHtml(a.id) + '">' +
            '<div class="recent-item-icon">' + escapeHtml(((a.name || "?").trim().charAt(0) || "?").toUpperCase()) + '</div>' +
            '<div class="recent-item-text">' +
              '<span class="recent-item-name">' + escapeHtml(a.name || "Unknown") + '</span>' +
              (a.domain ? '<span class="recent-item-domain">' + escapeHtml(a.domain) + '</span>' : '') +
            '</div>' +
            '<button class="recent-item-remove" type="button" title="Remove" data-remove="' + escapeHtml(a.id) + '">×</button>' +
          '</div>'
        ).join("");
        list.querySelectorAll(".recent-item").forEach((el) => {
          el.addEventListener("click", (e) => {
            if (e.target.closest(".recent-item-remove")) return;
            const id = el.dataset.id;
            const item = loadRecent().find((a) => a.id === id);
            if (item) openAccount(item);
          });
        });
        list.querySelectorAll(".recent-item-remove").forEach((el) => {
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            removeRecent(el.dataset.remove);
          });
        });
      }

      function openAccount(account) {
        const id = typeof account === "string" ? account : (account && account.id);
        if (!id) return;
        if (account && typeof account === "object") saveRecent(account);
        window.location.href = "/preview/org-map?account_id=" + encodeURIComponent(id);
      }

      function closeDropdown() {
        dropdown.classList.add("hidden");
        dropdown.innerHTML = "";
        activeIndex = -1;
        results = [];
      }

      function renderDropdown(items, query) {
        results = items;
        activeIndex = items.length ? 0 : -1;
        if (!items.length) {
          dropdown.innerHTML = '<div class="dropdown-empty">No accounts found for "' + escapeHtml(query) + '"</div>';
        } else {
          dropdown.innerHTML = items.map((item, i) =>
            '<div class="dropdown-item' + (i === 0 ? ' active' : '') + '" data-index="' + i + '">' +
              '<span class="dropdown-item-name">' + escapeHtml(item.name) + '</span>' +
              (item.domain ? '<span class="dropdown-item-domain">' + escapeHtml(item.domain) + '</span>' : '') +
            '</div>'
          ).join("");
          dropdown.querySelectorAll(".dropdown-item").forEach((el) => {
            el.addEventListener("mousedown", (e) => {
              e.preventDefault();
              const idx = parseInt(el.dataset.index, 10);
              openAccount(results[idx]);
            });
          });
        }
        dropdown.classList.remove("hidden");
      }

      function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
      }

      async function doSearch(q) {
        if (!q) { closeDropdown(); return; }
        try {
          const res = await fetch("/api/accounts/search?q=" + encodeURIComponent(q));
          const data = await res.json();
          if (searchInput.value.trim() !== q) return;
          if (data.error && !(data.accounts || []).length) {
            dropdown.innerHTML = '<div class="dropdown-empty">' + escapeHtml(data.error) + '</div>';
            dropdown.classList.remove("hidden");
            return;
          }
          renderDropdown(data.accounts || [], q);
        } catch {
          closeDropdown();
        }
      }

      searchInput.addEventListener("input", () => {
        const q = searchInput.value.trim();
        clearTimeout(debounceTimer);
        if (!q) { closeDropdown(); return; }
        debounceTimer = setTimeout(() => doSearch(q), 220);
      });

      searchInput.addEventListener("keydown", (e) => {
        const items = dropdown.querySelectorAll(".dropdown-item");
        if (e.key === "ArrowDown") {
          e.preventDefault();
          activeIndex = Math.min(activeIndex + 1, items.length - 1);
          items.forEach((el, i) => el.classList.toggle("active", i === activeIndex));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          activeIndex = Math.max(activeIndex - 1, 0);
          items.forEach((el, i) => el.classList.toggle("active", i === activeIndex));
        } else if (e.key === "Enter") {
          e.preventDefault();
          const target = activeIndex >= 0 ? results[activeIndex] : results[0];
          if (target) openAccount(target);
        } else if (e.key === "Escape") {
          if (!dropdown.classList.contains("hidden")) {
            closeDropdown();
          } else {
            searchInput.value = "";
          }
        }
      });

      document.addEventListener("click", (e) => {
        if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) closeDropdown();
      });

      renderRecent();
    </script>
  </body>
</html>`;
}

function settingsHtml(config) {
  const tokenStored = Boolean(config.pylonApiToken);
  const tokenSource = config.pylonTokenSource;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Settings — Pylon Sales Heat</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      body { margin: 0; background: #f6f8fb; color: #15202b; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.5; }
      header { background: #fff; border-bottom: 1px solid #d9e0e8; padding: 14px 28px; display: flex; align-items: center; gap: 14px; }
      header a { color: #5b2df5; text-decoration: none; font-weight: 600; font-size: 14px; }
      header strong { font-size: 15px; }
      main { max-width: 720px; margin: 0 auto; padding: 36px 24px 64px; }
      h1 { font-size: 26px; letter-spacing: -0.01em; margin: 0 0 8px; }
      .lead { color: #667085; margin: 0 0 28px; }
      .card { background: #fff; border: 1px solid #d9e0e8; border-radius: 10px; padding: 22px; margin-bottom: 18px; }
      .card h2 { font-size: 15px; margin: 0 0 4px; }
      .card .hint { color: #667085; font-size: 13px; margin: 0 0 16px; }
      label { display: block; font-size: 12px; font-weight: 700; color: #475467; margin: 12px 0 6px; }
      input { width: 100%; border: 1px solid #d9e0e8; border-radius: 8px; padding: 10px 12px; font: inherit; font-size: 14px; }
      input:focus { outline: none; border-color: #5b2df5; box-shadow: 0 0 0 3px rgba(91,45,245,0.12); }
      .row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 16px; }
      button { background: #5b2df5; color: #fff; border: 0; border-radius: 8px; padding: 10px 16px; font-weight: 650; font-size: 14px; cursor: pointer; }
      button:hover { filter: brightness(0.95); }
      button.secondary { background: #fff; color: #15202b; border: 1px solid #d9e0e8; }
      button.danger { background: #fff; color: #b42318; border: 1px solid #fcd5cf; }
      .status { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #475467; }
      .dot { width: 8px; height: 8px; border-radius: 50%; }
      .dot.green { background: #18a957; }
      .dot.gray { background: #98a2b3; }
      .dot.red { background: #d8423d; }
      .status-pill { background: #f4f6f9; border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 600; }
      pre { background: #f4f6f9; border-radius: 8px; padding: 12px; font-size: 12px; overflow-x: auto; margin: 0; }
      .alert { border-radius: 8px; padding: 10px 12px; font-size: 13px; margin-top: 12px; }
      .alert.ok { background: #e8f5ed; color: #0f6b34; }
      .alert.err { background: #fce6e5; color: #9a201c; }
    </style>
  </head>
  <body>
    <header>
      <a href="/">← Home</a>
      <span style="color:#cfd5df">|</span>
      <strong>Settings</strong>
    </header>
    <main>
      <h1>Pylon MCP connection</h1>
      <p class="lead">Connect this app to your Pylon workspace via the MCP server. The same API token authenticates both <code>mcp.usepylon.com</code> and the REST API.</p>

      <div class="card">
        <h2>Connection</h2>
        <p class="hint">Token source: <span class="status-pill">${escapeHtmlServer(tokenSource)}</span></p>

        <label for="mcp-url">Pylon MCP URL</label>
        <input id="mcp-url" type="url" value="${escapeHtmlServer(config.pylonMcpUrl)}">

        <label for="api-base">Pylon REST API base</label>
        <input id="api-base" type="url" value="${escapeHtmlServer(config.pylonApiBase)}">

        <label for="api-token">Pylon API token</label>
        <input id="api-token" type="password" placeholder="${tokenStored ? "•••••••••••• (saved — paste a new value to replace)" : "Paste your token from Pylon admin"}">

        <div class="row">
          <button id="save-btn">Save</button>
          <button class="secondary" id="test-btn">Test connection</button>
          ${tokenStored ? '<button class="danger" id="clear-btn">Clear saved token</button>' : ""}
          <span class="status"><span class="dot ${tokenStored ? "green" : "gray"}"></span>${tokenStored ? "Token saved" : "Not connected"}</span>
        </div>
        <div id="alert"></div>
      </div>

      <div class="card">
        <h2>How to get a token</h2>
        <p class="hint">In Pylon: Settings → API → Create token. Admin role required. The token is stored locally in <code>.pylon-config.json</code> (gitignored).</p>
      </div>
    </main>
    <script>
      const alertEl = document.getElementById("alert");
      function showAlert(kind, msg) {
        alertEl.innerHTML = '<div class="alert ' + kind + '">' + msg + '</div>';
      }
      async function postJson(path, payload) {
        const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        return res.json();
      }
      document.getElementById("save-btn").addEventListener("click", async () => {
        const payload = {
          pylonMcpUrl: document.getElementById("mcp-url").value,
          pylonApiBase: document.getElementById("api-base").value,
          pylonApiToken: document.getElementById("api-token").value
        };
        const result = await postJson("/api/settings", payload);
        if (result.ok) {
          showAlert("ok", "Settings saved.");
          setTimeout(() => window.location.reload(), 800);
        } else {
          showAlert("err", "Save failed: " + (result.error || "unknown"));
        }
      });
      document.getElementById("test-btn").addEventListener("click", async () => {
        showAlert("ok", "Testing...");
        const result = await postJson("/api/test-mcp", {});
        if (result.ok) {
          showAlert("ok", "Connected as " + (result.identity.name || result.identity.email || "Pylon user") + ".");
        } else {
          showAlert("err", "Test failed: " + (result.error || "unknown"));
        }
      });
      const clearBtn = document.getElementById("clear-btn");
      if (clearBtn) {
        clearBtn.addEventListener("click", async () => {
          const result = await postJson("/api/settings", { clearToken: true });
          if (result.ok) window.location.reload();
        });
      }
    </script>
  </body>
</html>`;
}

function escapeHtmlServer(value) {
  return String(value || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
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

// Vercel serverless handler — default export required by @vercel/node
export default async function handler(req, res) {
  const body = await readBody(req);
  const result = await routeRequest({
    method: req.method,
    url: req.url,
    headers: req.headers,
    body,
  });
  res.writeHead(result.statusCode, result.headers);
  res.end(result.body);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadConfig();
  const server = createAppServer({ config });
  server.listen(config.port, () => {
    console.log(`Pylon Sales Heat listening on http://localhost:${config.port}`);
  });
}
