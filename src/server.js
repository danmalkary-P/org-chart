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
      body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 40px; line-height: 1.45; color: #17202a; }
      code { background: #f3f5f7; padding: 2px 5px; border-radius: 4px; }
      a { color: #0957d0; }
      .wrap { max-width: 760px; }
    </style>
  </head>
  <body>
    <main class="wrap">
      <h1>Pylon Sales Heat</h1>
      <p>Sales workflow helpers for support-aware follow-up and warm intros.</p>
      <ul>
        <li><a href="/preview/follow-up?account_id=acme-risk">Follow-Up Writer</a></li>
        <li><a href="/preview/warm-intro?account_id=acme-risk">Warm Intro Mapper</a></li>
        <li><a href="/preview/org-map?account_id=acme-risk">Org Chart Mapper</a></li>
        <li><a href="/compose">Add notes, calendar context, and LinkedIn people</a></li>
      </ul>
      <p>Mode: <code>${config.demoMode}</code>. Live token configured: <code>${Boolean(config.pylonApiToken)}</code>.</p>
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
    <title>Pylon Sales Heat Composer</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 32px; line-height: 1.45; color: #17202a; }
      label { display: block; font-weight: 650; margin-top: 18px; }
      input, textarea { box-sizing: border-box; display: block; width: min(760px, 100%); margin-top: 6px; padding: 10px; border: 1px solid #ccd3dc; border-radius: 6px; font: inherit; }
      textarea { min-height: 92px; }
      button, a.button { display: inline-block; margin: 18px 12px 0 0; padding: 10px 14px; border-radius: 6px; border: 0; background: #0b57d0; color: white; text-decoration: none; font-weight: 650; cursor: pointer; }
      .wrap { max-width: 860px; }
      .hint { color: #5a6673; font-size: 0.94rem; }
      code { background: #f3f5f7; padding: 2px 5px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <main class="wrap">
      <h1>Sales Heat Input Builder</h1>
      <p class="hint">Use this for hackathon demos when you want to paste post-call notes or LinkedIn multithread leads without editing query strings by hand.</p>
      <label>Account ID</label>
      <input id="account" value="acme-risk">
      <label>Post-call notes</label>
      <textarea id="notes">Next step: send SSO validation by Monday. Also multithread the operations buyer from LinkedIn.</textarea>
      <label>Calendar summary</label>
      <textarea id="calendar">Pylon Google Calendar says this meeting is a renewal risk sync.</textarea>
      <label>LinkedIn people</label>
      <textarea id="people">Jordan Avery|VP Operations|Acme Robotics|https://linkedin.com/in/jordan-avery|Owns field operations rollout</textarea>
      <p class="hint">Format one person per line or semicolon: <code>Name|Title|Company|LinkedIn URL|Notes</code></p>
      <button type="button" onclick="openWidget('follow-up')">Open Follow-Up Writer</button>
      <button type="button" onclick="openWidget('warm-intro')">Open Warm Intro Mapper</button>
      <button type="button" onclick="openWidget('org-map')">Open Org Chart Mapper</button>
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
