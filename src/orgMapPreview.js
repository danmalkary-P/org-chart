export function renderOrgMapPreview({ analysis, context = {} }) {
  const peopleJson = JSON.stringify(analysis.nodes).replace(/</g, "\\u003c");
  const suggestedRootsJson = JSON.stringify(suggestedRootIds(analysis.nodes)).replace(/</g, "\\u003c");
  const accountIdJson = JSON.stringify(analysis.accountId || "").replace(/</g, "\\u003c");
  const accountNameJson = JSON.stringify(analysis.accountName || "").replace(/</g, "\\u003c");
  const opportunitiesJson = JSON.stringify(context.opportunities || []).replace(/</g, "\\u003c");
  const accountMetricsJson = JSON.stringify(context.accountMetrics || {}).replace(/</g, "\\u003c");
  const issuesJson = JSON.stringify(context.issues || []).replace(/</g, "\\u003c");
  const messagesJson = JSON.stringify(context.messages || []).replace(/</g, "\\u003c");
  const departmentsJson = JSON.stringify((context.departments || []).map((d) => ({ ...d, type: "department" }))).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Org Chart Mapper · Pylon</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
      :root {
        /* Pylon Nexus tokens */
        --bg: #ffffff;
        --bg-rail: #f9f5e3;            /* cream rail (matches screenshot) */
        --surface: #ffffff;
        --surface-soft: #f7f7f8;       /* slate-25 */
        --subtle: #f7f7f8;

        --text: #1b1b1b;               /* type-primary */
        --text-2: #414348;             /* slate-700 */
        --muted: #5d6373;              /* slate-500 */
        --faint: #99a1b3;              /* slate-300 */

        --line: #e7e8eb;               /* border-default */
        --line-soft: #ecedee;          /* border-subtle */
        --line-strong: #d2d5da;        /* border-strong */

        --primary: #5532ed;            /* primary-base — Pylon indigo */
        --primary-hover: #4338ca;      /* primary-plus-1 */
        --primary-soft: #eef2ff;       /* primary-minus-6 — hover row */
        --primary-soft-2: #e0e7ff;     /* primary-minus-5 — selected row */
        --primary-faint: #f3f1ff;

        --accent-violet: #9747ff;
        --accent-violet-soft: #f5f3ff;

        --positive: #047857;
        --positive-soft: #d1fae5;
        --positive-faint: #ecfdf5;
        --notice: #b45309;
        --notice-soft: #fde68a;
        --notice-faint: #fffbeb;
        --negative: #b91c1c;
        --negative-soft: #fee2e2;
        --negative-faint: #fef2f2;

        --radius-sm: 4px;
        --radius-md: 6px;
        --radius-lg: 8px;
        --radius-xl: 12px;

        --shadow-card: 0 6px 24px 0 rgba(0,0,0,0.08);
        --shadow-pop: 0 12px 32px -6px rgba(15,20,30,0.14), 0 4px 10px -2px rgba(15,20,30,0.06);
        --ring-focus: 0 0 0 3px rgba(85, 50, 237, 0.22);

        /* Backwards-compat aliases (kept so existing class CSS works) */
        --purple: var(--primary);
        --purple-soft: var(--primary-soft);
        --green: var(--positive);
        --yellow: var(--notice);
        --red: var(--negative);
        --blue: #1d4ed8;
      }

      * { box-sizing: border-box; }
      html, body {
        font-family: "IBM Plex Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
      }
      body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font-size: 13px;
        line-height: 1.45;
      }

      /* ============ Buttons ============ */
      button, .button {
        border: 0;
        border-radius: var(--radius-md);
        cursor: pointer;
        font: inherit;
        font-weight: 500;
        line-height: 1.2;
        padding: 7px 11px;
        transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
      }
      .button {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        text-decoration: none;
      }
      .primary {
        background: var(--primary);
        color: #fff;
        font-weight: 500;
      }
      .primary:hover { background: var(--primary-hover); }
      .secondary {
        background: var(--surface);
        color: var(--text);
        border: 1px solid var(--line);
        font-weight: 500;
      }
      .secondary:hover { background: var(--surface-soft); }
      .ghost {
        background: transparent;
        color: var(--muted);
      }
      .ghost:hover { background: var(--surface-soft); color: var(--text); }
      :focus-visible { outline: none; box-shadow: var(--ring-focus); }

      /* ============ Shell ============ */
      .app-shell {
        display: grid;
        grid-template-columns: 188px minmax(520px, 1fr) 280px 0px;
        min-height: 100vh;
        transition: grid-template-columns 200ms ease;
      }
      .app-shell.notes-open {
        grid-template-columns: 188px minmax(340px, 1fr) 0px 380px;
      }
      .app-shell.notes-open .contacts-panel {
        overflow: hidden;
        padding: 0;
      }

      /* ============ Pylon-style cream rail ============ */
      .rail {
        align-items: center;
        background: var(--bg-rail);
        border-right: 1px solid #ece4c2;
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 10px 6px;
      }
      .rail::before {
        /* Pylon logo dot */
        align-items: center;
        background: var(--primary);
        border-radius: 7px;
        color: #fff;
        content: "";
        background-image: linear-gradient(135deg, #5532ed 0%, #9747ff 100%);
        display: block;
        height: 28px;
        margin-bottom: 6px;
        width: 28px;
        position: relative;
      }
      .rail-dot {
        align-items: center;
        border-radius: 6px;
        color: #6b6649;
        cursor: pointer;
        display: flex;
        height: 30px;
        justify-content: center;
        transition: background 120ms ease, color 120ms ease;
        width: 32px;
      }
      .rail-dot:hover { background: rgba(85, 50, 237, 0.06); color: var(--primary); }
      .rail-dot.active {
        background: var(--primary-soft-2);
        color: var(--primary);
      }

      /* ============ Account nav (second column) ============ */
      .account-nav {
        background: var(--surface);
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        padding: 14px 10px;
      }
      .back {
        align-items: center;
        color: var(--primary);
        display: flex;
        font-size: 13px;
        font-weight: 500;
        gap: 6px;
        margin-bottom: 12px;
        padding: 4px 8px;
      }
      .account-summary-card {
        background: transparent;
        border: 0;
        border-radius: 0;
        margin-bottom: 14px;
        padding: 4px 8px 12px;
        border-bottom: 1px solid var(--line-soft);
      }
      .account-summary-name {
        color: var(--text);
        font-size: 13px;
        font-weight: 600;
        letter-spacing: -0.005em;
        margin-bottom: 8px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .account-summary-metrics {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 6px;
      }
      .summary-metric {
        background: var(--surface-soft);
        border-radius: var(--radius-sm);
        color: var(--muted);
        font-size: 11px;
        line-height: 1.3;
        padding: 4px 7px;
      }
      .summary-metric strong {
        color: var(--text);
        display: block;
        font-size: 12px;
        font-weight: 600;
        line-height: 1.3;
      }
      .summary-renewal {
        color: var(--muted);
        font-size: 11px;
        padding: 0 1px;
      }
      .nav-list {
        display: grid;
        gap: 1px;
        margin-bottom: 14px;
      }
      .nav-item {
        align-items: center;
        background: transparent;
        border: 0;
        border-radius: var(--radius-md);
        color: var(--text-2);
        cursor: pointer;
        display: flex;
        font: inherit;
        font-size: 13px;
        font-weight: 400;
        gap: 8px;
        padding: 6px 8px;
        text-align: left;
        width: 100%;
      }
      .nav-item:hover { background: var(--primary-soft); color: var(--text); }
      .nav-item.active {
        background: var(--primary-soft);
        color: var(--primary);
        font-weight: 500;
      }
      .stage-view[hidden] { display: none; }
      .issues-list, .contacts-list-view, .overview-grid {
        background: #fff;
        border: 1px solid var(--line);
        border-radius: 12px;
        overflow: hidden;
      }
      .issue-row {
        align-items: center;
        border-bottom: 1px solid var(--line);
        display: grid;
        gap: 16px;
        grid-template-columns: 80px 1fr auto auto;
        padding: 14px 18px;
      }
      .issue-row:last-child { border-bottom: 0; }
      .issue-row:nth-child(even) { background: #fafafb; }
      .issue-num { color: var(--muted); font-size: 13px; font-weight: 500; }
      .issue-title { font-size: 14px; font-weight: 700; line-height: 1.3; }
      .issue-meta { color: var(--muted); font-size: 12px; margin-top: 3px; }
      .issue-state-pill {
        background: #eef2f6;
        border-radius: 999px;
        color: #475467;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.04em;
        padding: 4px 10px;
        text-transform: uppercase;
      }
      .issue-state-pill.open { background: #fdf3d7; color: #6e5208; }
      .issue-state-pill.triaged { background: #f1edff; color: var(--purple); }
      .issue-state-pill.logged { background: #eef2f6; color: #475467; }
      .issue-state-pill.resolved { background: #e3f7eb; color: #0f6b34; }
      .issue-state-pill.closed { background: #eef2f6; color: #475467; }
      .issue-assignee {
        align-items: center;
        background: var(--primary-soft);
        border-radius: 50%;
        color: var(--primary);
        display: inline-flex;
        font-size: 10px;
        font-weight: 700;
        height: 24px;
        justify-content: center;
        width: 24px;
      }
      .contact-row {
        align-items: center;
        border-bottom: 1px solid var(--line);
        display: grid;
        gap: 16px;
        grid-template-columns: 36px 1fr 1fr auto;
        padding: 14px 18px;
      }
      .contact-row:last-child { border-bottom: 0; }
      .contact-row:hover { background: #fafafb; cursor: pointer; }
      .contact-row-photo {
        align-items: center;
        background: var(--primary-soft);
        border-radius: 50%;
        color: var(--primary);
        display: flex;
        font-size: 12px;
        font-weight: 700;
        height: 36px;
        justify-content: center;
        width: 36px;
      }
      .contact-row-name { font-size: 14px; font-weight: 700; }
      .contact-row-title { color: var(--muted); font-size: 12px; margin-top: 2px; }
      .contact-row-email { color: var(--muted); font-size: 12px; }
      .overview-cards {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(4, 1fr);
      }
      .overview-card {
        background: #fff;
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 16px 18px;
      }
      .overview-card-label { color: var(--muted); font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
      .overview-card-value { font-size: 26px; font-weight: 800; letter-spacing: -0.01em; margin-top: 6px; }
      .overview-card-value small { font-size: 14px; font-weight: 500; color: var(--muted); }
      .overview-card-sub { color: var(--muted); font-size: 12px; margin-top: 4px; }
      .overview-card-sub.at-risk { color: #d03030; }

      /* ============ Overview signal sections ============ */
      .overview-signals {
        display: grid;
        gap: 16px;
        grid-template-columns: 1fr 1fr;
        margin-top: 16px;
      }
      .signal-section {
        background: #fff;
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 20px 22px;
      }
      .signal-section h2 { font-size: 15px; font-weight: 700; margin: 0 0 14px; }
      .signal-item {
        align-items: flex-start;
        display: flex;
        gap: 10px;
        padding: 7px 0;
      }
      .signal-dot {
        border-radius: 50%;
        flex-shrink: 0;
        height: 8px;
        margin-top: 5px;
        width: 8px;
      }
      .signal-dot.risk { background: #d03030; }
      .signal-dot.upsell { background: #16a34a; }
      .signal-label { font-size: 13px; font-weight: 600; }
      .signal-detail { color: var(--muted); font-size: 13px; }

      /* ============ Overview recent activity ============ */
      .overview-activity {
        background: #fff;
        border: 1px solid var(--line);
        border-radius: 12px;
        margin-top: 16px;
        padding: 20px 22px;
      }
      .overview-activity h2 { font-size: 15px; font-weight: 700; margin: 0 0 14px; }
      .activity-item {
        align-items: flex-start;
        display: flex;
        gap: 12px;
        padding: 10px 0;
      }
      .activity-item + .activity-item { border-top: 1px solid var(--line); }
      .activity-dot {
        background: var(--line);
        border-radius: 50%;
        flex-shrink: 0;
        height: 8px;
        margin-top: 6px;
        width: 8px;
      }
      .activity-text { font-size: 13px; font-weight: 500; line-height: 1.4; }
      .activity-meta { color: var(--muted); font-size: 12px; margin-top: 3px; }

      /* ============ Issue detail panel ============ */
      .issue-detail-panel {
        background: #fff;
        border-left: 1px solid var(--line);
        bottom: 0;
        display: none;
        flex-direction: column;
        overflow-y: auto;
        position: fixed;
        right: 0;
        top: 48px;
        width: 380px;
        z-index: 1000;
        box-shadow: -4px 0 20px rgba(0,0,0,0.08);
      }
      .issue-detail-panel.open { display: flex; }
      .issue-row.active { background: #f5f3ff; }
      .issue-row:hover { background: #fafafb; }
      .issue-row.active:hover { background: #f5f3ff; }
      .issue-detail-head {
        align-items: flex-start;
        display: flex;
        justify-content: space-between;
        padding: 20px 22px 0;
      }
      .issue-detail-head .close-btn {
        background: transparent;
        border: 0;
        color: var(--muted);
        cursor: pointer;
        font-size: 20px;
        line-height: 1;
        padding: 4px;
      }
      .issue-detail-head .close-btn:hover { color: var(--text); }
      .issue-detail-num { color: var(--muted); font-size: 13px; font-weight: 500; }
      .issue-detail-title { font-size: 17px; font-weight: 700; line-height: 1.35; margin-top: 4px; }
      .issue-detail-status-row {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
        padding: 0 22px;
      }
      .issue-detail-raised { color: var(--muted); font-size: 12px; }

      .issue-detail-section {
        border-top: 1px solid var(--line);
        margin-top: 16px;
        padding: 16px 22px;
      }
      .issue-detail-section h3 {
        color: var(--muted);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.04em;
        margin: 0 0 10px;
        text-transform: uppercase;
      }
      .issue-detail-body { color: var(--text-2); font-size: 13px; line-height: 1.55; }
      .issue-detail-props { display: grid; gap: 10px; }
      .issue-prop-row {
        align-items: center;
        display: grid;
        font-size: 13px;
        gap: 12px;
        grid-template-columns: 90px 1fr;
      }
      .issue-prop-label { color: var(--muted); font-weight: 500; text-transform: uppercase; font-size: 11px; letter-spacing: 0.03em; }
      .issue-prop-value { color: var(--text); font-weight: 500; }
      .issue-tags { display: flex; flex-wrap: wrap; gap: 6px; }
      .issue-tag {
        background: #f3f4f6;
        border-radius: 4px;
        color: var(--text-2);
        font-size: 12px;
        padding: 2px 8px;
      }

      /* Issue conversation */
      .issue-convo-list { display: grid; gap: 14px; }
      .issue-convo-msg {
        border-radius: 10px;
        padding: 12px 14px;
      }
      .issue-convo-msg.external { background: #f7f8fa; }
      .issue-convo-msg.internal { background: #fffbeb; border: 1px solid #fde68a; }
      .issue-convo-author {
        align-items: center;
        display: flex;
        gap: 8px;
        margin-bottom: 8px;
      }
      .issue-convo-avatar {
        align-items: center;
        background: var(--primary-soft);
        border-radius: 50%;
        color: var(--primary);
        display: inline-flex;
        font-size: 10px;
        font-weight: 700;
        height: 24px;
        justify-content: center;
        width: 24px;
      }
      .issue-convo-name { font-size: 13px; font-weight: 600; }
      .issue-convo-internal-badge {
        background: #f59e0b;
        border-radius: 4px;
        color: #fff;
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.04em;
        padding: 2px 6px;
        text-transform: uppercase;
      }
      .issue-convo-time { color: var(--muted); font-size: 11px; margin-left: auto; }
      .issue-convo-body { color: var(--text-2); font-size: 13px; line-height: 1.5; }
      .nav-section-label {
        color: var(--muted);
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0;
        margin: 6px 0 6px;
        padding: 0 8px;
        text-transform: none;
      }

      /* ============ Opportunity cards (left rail) ============ */
      .opp-list { display: grid; gap: 4px; padding: 0 4px; }
      .opp-card {
        background: transparent;
        border: 0;
        border-radius: var(--radius-md);
        cursor: pointer;
        padding: 8px 8px;
        text-align: left;
        transition: background-color 120ms ease;
        width: 100%;
      }
      .opp-card:hover { background: var(--primary-soft); }
      .opp-card.active {
        background: var(--primary-soft-2);
      }
      .opp-card-name {
        color: var(--text);
        font-size: 12px;
        font-weight: 500;
        line-height: 1.35;
        margin-bottom: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .opp-card-meta {
        color: var(--muted);
        font-size: 11px;
        margin-bottom: 5px;
      }
      .opp-health {
        border-radius: 999px;
        display: inline-flex;
        font-size: 10px;
        font-weight: 500;
        padding: 1px 7px;
      }
      .opp-health.at_risk { background: var(--negative-soft); color: var(--negative); }
      .opp-health.conditional { background: var(--notice-soft); color: var(--notice); }
      .opp-health.neutral { background: var(--positive-soft); color: var(--positive); }

      /* ============ Opportunity slide-over ============ */
      .opp-panel {
        background: var(--surface);
        border-right: 1px solid var(--line);
        bottom: 0;
        box-shadow: var(--shadow-pop);
        left: 48px;
        overflow-y: auto;
        padding: 18px 18px;
        position: fixed;
        top: 0;
        transform: translateX(-110%);
        transition: transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
        width: 320px;
        z-index: 25;
      }
      .opp-panel.open { transform: translateX(0); }
      .opp-panel-head {
        align-items: start;
        display: flex;
        gap: 8px;
        justify-content: space-between;
        margin-bottom: 14px;
      }
      .opp-panel-head h2 { font-size: 15px; font-weight: 600; letter-spacing: -0.005em; }
      .opp-panel-close {
        align-items: center;
        background: transparent;
        border: 1px solid var(--line);
        border-radius: var(--radius-md);
        color: var(--muted);
        cursor: pointer;
        display: flex;
        flex-shrink: 0;
        font-size: 16px;
        height: 28px;
        justify-content: center;
        padding: 0;
        width: 28px;
      }
      .opp-panel-close:hover { background: var(--surface-soft); color: var(--text); }
      .opp-type-badge {
        background: var(--primary-soft);
        border-radius: var(--radius-sm);
        color: var(--primary);
        display: inline-flex;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.02em;
        margin-bottom: 12px;
        padding: 3px 8px;
        text-transform: uppercase;
      }
      .opp-type-renewal { background: var(--primary-soft); color: var(--primary); }
      .opp-type-expansion { background: var(--positive-soft); color: var(--positive); }
      .opp-type-new_business { background: var(--accent-violet-soft); color: var(--accent-violet); }
      .opp-field-list { display: grid; gap: 8px; margin-bottom: 14px; }
      .opp-field-row { display: grid; gap: 4px; grid-template-columns: 88px minmax(0,1fr); }
      .opp-field-label { color: var(--muted); font-size: 12px; padding-top: 1px; }
      .opp-field-value { color: var(--text); font-size: 12px; overflow-wrap: anywhere; }
      .opp-text-block {
        background: var(--surface-soft);
        border: 1px solid var(--line);
        border-radius: var(--radius-md);
        color: var(--text-2);
        font-size: 12px;
        line-height: 1.55;
        padding: 10px 12px;
      }
      .opp-text-label {
        color: var(--muted);
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0;
        margin-bottom: 5px;
        text-transform: none;
      }
      .view-profile-btn {
        color: var(--primary);
        font-size: 12px;
        font-weight: 500;
        text-decoration: none;
      }
      .view-profile-btn:hover { text-decoration: underline; }

      /* ============ Workspace + topbar ============ */
      .workspace {
        background: var(--surface);
        min-width: 0;
      }
      .topbar {
        align-items: center;
        background: var(--surface);
        border-bottom: 1px solid var(--line);
        display: flex;
        gap: 12px;
        justify-content: space-between;
        min-height: 48px;
        padding: 8px 20px;
      }
      .account-title {
        align-items: center;
        display: flex;
        gap: 8px;
        min-width: 0;
      }
      .linkedin {
        align-items: center;
        background: linear-gradient(135deg, #5532ed 0%, #9747ff 100%);
        border-radius: var(--radius-sm);
        color: #fff;
        display: inline-flex;
        flex-shrink: 0;
        font-size: 11px;
        font-weight: 600;
        height: 22px;
        justify-content: center;
        letter-spacing: -0.01em;
        width: 22px;
      }
      .title-stack { min-width: 0; }
      .title-stack strong {
        color: var(--text);
        display: block;
        font-size: 13px;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .title-stack span {
        color: var(--muted);
        display: block;
        font-size: 12px;
      }

      /* ============ Stage ============ */
      .stage {
        padding: 16px 22px 28px;
      }
      .stage-head {
        align-items: start;
        display: flex;
        gap: 16px;
        justify-content: space-between;
        margin-bottom: 18px;
      }
      h1, h2 { margin: 0; }
      h1 {
        color: var(--text);
        font-size: 22px;
        font-weight: 600;
        letter-spacing: -0.01em;
        line-height: 28px;
      }
      h2 {
        font-size: 14px;
        font-weight: 600;
        letter-spacing: -0.005em;
      }
      .muted { color: var(--muted); font-size: 13px; }
      .stage-actions, .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      /* ============ Map panel ============ */
      .map-panel {
        background: var(--surface-soft);
        border: 1px solid var(--line);
        border-radius: var(--radius-xl);
        cursor: grab;
        min-height: 540px;
        overflow: auto;
        padding: 18px;
        position: relative;
      }
      .map-panel.panning,
      .map-panel.panning * { cursor: grabbing !important; }
      .map-panel.panning .profile-card { pointer-events: none; }
      .zoom-controls {
        align-items: center;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 8px;
        box-shadow: 0 1px 2px rgba(15, 20, 30, 0.04);
        bottom: 14px;
        display: inline-flex;
        gap: 0;
        padding: 2px;
        position: sticky;
        right: 14px;
        z-index: 8;
        float: right;
        margin-top: -32px;
        margin-bottom: -32px;
        margin-right: 0;
      }
      .zoom-btn {
        background: transparent;
        border: 0;
        border-radius: 6px;
        color: var(--text-2);
        cursor: pointer;
        font-family: inherit;
        font-size: 14px;
        font-weight: 500;
        height: 28px;
        line-height: 1;
        min-width: 28px;
        padding: 0 6px;
        transition: background-color 120ms ease;
      }
      .zoom-btn:hover { background: var(--surface-soft); color: var(--text); }
      .zoom-level {
        color: var(--muted);
        font-feature-settings: "tnum" 1;
        font-size: 11px;
        min-width: 44px;
      }
      .profile-card.drop-above::before,
      .profile-card.drop-below::after {
        align-items: center;
        background: rgba(85, 50, 237, 0.16);
        border: 2px solid var(--primary);
        color: var(--primary);
        display: flex;
        font-size: 22px;
        font-weight: 700;
        height: 50%;
        justify-content: center;
        left: -2px;
        line-height: 1;
        pointer-events: none;
        position: absolute;
        right: -2px;
        z-index: 5;
      }
      .profile-card.drop-above::before {
        border-bottom: 2px dashed var(--primary);
        border-radius: 12px 12px 0 0;
        content: "▲";
        top: -2px;
      }
      .profile-card.drop-below::after {
        border-radius: 0 0 12px 12px;
        border-top: 2px dashed var(--primary);
        bottom: -2px;
        content: "▼";
      }
      .tree {
        align-items: flex-start;
        display: flex;
        gap: var(--tw-col-gap, 48px);
        justify-content: center;
        min-width: 600px;
        padding: 24px 18px 36px;
        transform-origin: top center;
        transition: transform 140ms ease;
      }
      .empty-state {
        background: var(--surface);
        border: 1px dashed var(--line-strong);
        border-radius: var(--radius-lg);
        color: var(--muted);
        font-size: 13px;
        padding: 32px 24px;
        text-align: center;
      }

      /* ============ Profile cards ============ */
      .profile-card {
        --card-photo-h: var(--tw-photo-h, 138px);
        background: transparent;
        cursor: grab;
        display: block;
        padding: 0;
        position: relative;
        text-align: initial;
        transition: opacity 140ms ease, transform 140ms ease;
        width: var(--tw-card-w, 168px);
        will-change: transform;
      }
      .profile-card:hover { transform: translateY(-2px); }
      .profile-card.active .profile-card-photo {
        outline: 3px solid var(--primary-soft);
        outline-offset: 0;
      }
      .profile-card.dragging {
        cursor: grabbing;
        opacity: 0.72;
        transform: scale(0.96);
      }
      .profile-card-photo {
        align-items: center;
        background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%);
        border-radius: 999px 999px 8px 8px;
        box-shadow: 0 4px 14px rgba(15, 20, 30, 0.06);
        color: var(--primary);
        display: flex;
        font-size: 28px;
        font-weight: 600;
        height: var(--card-photo-h);
        justify-content: center;
        letter-spacing: -0.02em;
        position: relative;
        width: 100%;
      }
      .profile-card-info {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--radius-xl);
        box-shadow: var(--shadow-card);
        margin: -10px 0 0;
        padding: 9px 10px 7px;
        position: relative;
        z-index: 2;
      }
      .profile-card-name {
        color: var(--text);
        cursor: text;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: -0.005em;
        line-height: 1.25;
        margin: 0 0 2px;
        overflow: hidden;
        text-align: center;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .profile-card-title {
        background: transparent;
        border: 1px dashed transparent;
        border-radius: var(--radius-sm);
        color: var(--muted);
        cursor: text;
        display: block;
        font: inherit;
        font-size: 11px;
        line-height: 1.3;
        margin: 0 auto 9px;
        max-width: 100%;
        overflow: hidden;
        padding: 1px 6px;
        text-align: center;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .profile-card-title:hover {
        background: var(--surface-soft);
        border-color: var(--line);
      }
      .title-chip-input {
        background: #fff;
        border: 1px solid var(--primary);
        border-radius: var(--radius-sm);
        color: var(--text);
        font: inherit;
        font-size: 11px;
        outline: none;
        padding: 1px 6px;
        text-align: center;
        width: 100%;
      }
      .profile-card-stats {
        border-top: 1px solid var(--line-soft);
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        padding-top: 8px;
      }
      .profile-stat {
        align-items: center;
        border-right: 1px solid var(--line-soft);
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
        padding: 0 4px;
      }
      .profile-stat:last-child { border-right: 0; }
      .profile-stat-icon {
        align-items: center;
        display: flex;
        height: 16px;
        justify-content: center;
      }
      .profile-stat-icon.purple { color: var(--primary); }
      .profile-stat-icon.green { color: var(--positive); }
      .profile-stat-icon.blue { color: #1d4ed8; }
      .profile-stat-value {
        color: var(--text);
        font-size: 11px;
        font-weight: 600;
        line-height: 1.1;
        max-width: 100%;
        overflow: hidden;
        text-align: center;
        text-overflow: ellipsis;
        white-space: nowrap;
        width: 100%;
      }
      .profile-stat-label {
        color: var(--muted);
        font-size: 10px;
        font-weight: 400;
        letter-spacing: 0;
      }
      .star-marker {
        align-items: center;
        background: #f5b800;
        border: 2px solid #fff;
        clip-path: polygon(50% 0, 61% 34%, 98% 35%, 68% 56%, 79% 91%, 50% 70%, 21% 91%, 32% 56%, 2% 35%, 39% 34%);
        color: transparent;
        display: none;
        height: 22px;
        left: 10px;
        position: absolute;
        top: 6px;
        width: 22px;
        z-index: 4;
      }
      .profile-card.is-key .star-marker { display: block; }
      .profile-name, .profile-meta, .badges, .profile-note, .owner { display: none; }

      .remove {
        align-items: center;
        background: rgba(255, 255, 255, 0.96);
        border: 1px solid var(--line);
        border-radius: 999px;
        box-shadow: 0 3px 8px rgba(15, 20, 30, 0.08);
        color: var(--muted);
        display: flex;
        font-size: 13px;
        height: 22px;
        justify-content: center;
        opacity: 0;
        padding: 0;
        position: absolute;
        right: 8px;
        top: 8px;
        transition: opacity 120ms ease;
        width: 22px;
        z-index: 5;
      }
      .profile-card:hover .remove,
      .profile-card:focus-within .remove { opacity: 1; }

      /* ============ Tree connectors ============ */
      .children {
        align-items: flex-start;
        display: flex;
        gap: var(--tw-col-gap, 28px);
        justify-content: center;
        margin: var(--tw-row-gap, 22px) 0 0;
        padding-top: 18px;
        position: relative;
      }
      .tree-node {
        align-items: center;
        display: flex;
        flex-direction: column;
        position: relative;
        transition: transform 160ms ease;
      }
      /* Curved SVG connectors layer */
      .tree-node > .connector-svg {
        position: absolute;
        left: 0;
        top: 100%;
        pointer-events: none;
        overflow: visible;
        z-index: 0;
      }
      .tree-node > .connector-svg path {
        fill: none;
        stroke: var(--line-strong, #c4c8cf);
        stroke-width: 1.75;
        stroke-linecap: round;
        opacity: 0.85;
      }
      .profile-card .profile-meta, .profile-card .badges { display: none; }

      .drag-preview {
        background: rgba(255, 255, 255, 0.98);
        border: 1px solid var(--line);
        border-radius: var(--radius-xl);
        box-shadow: 0 12px 28px rgba(15, 20, 30, 0.14);
        color: var(--text);
        left: -1000px;
        padding: 7px;
        pointer-events: none;
        position: fixed;
        text-align: center;
        top: -1000px;
        width: 104px;
        z-index: 1000;
      }
      .drag-preview-photo {
        align-items: center;
        background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%);
        border-radius: 999px;
        color: var(--primary);
        display: flex;
        font-size: 16px;
        font-weight: 600;
        height: 56px;
        justify-content: center;
        margin: 0 auto 5px;
        width: 56px;
      }
      .drag-preview-title {
        color: var(--text-2);
        font-size: 10px;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* ============ Insights ============ */
      .insights {
        display: grid;
        gap: 14px;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        margin-top: 18px;
      }
      .insight-card {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--radius-lg);
        padding: 14px 16px;
      }
      .insight-card h2 {
        margin-bottom: 4px;
      }
      .insight-card-full { grid-column: 1 / -1; }
      .connections-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 10px;
      }
      .connections-empty {
        color: var(--muted);
        font-size: 13px;
        padding: 4px 0;
      }
      .connection-item {
        background: var(--surface-soft);
        border: 1px solid var(--line);
        border-radius: var(--radius-md);
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .connection-item-head {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 600;
        color: var(--text);
      }
      .connection-item-from, .connection-item-to {
        color: var(--text);
      }
      .connection-item-arrow {
        color: var(--muted);
        font-weight: 400;
      }
      .connection-item-delete {
        margin-left: auto;
        background: none;
        border: 0;
        color: var(--muted);
        font-size: 18px;
        line-height: 1;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 4px;
        opacity: 0.6;
        transition: opacity 80ms ease, background 80ms ease, color 80ms ease;
      }
      .connection-item-delete:hover { opacity: 1; background: rgba(0,0,0,0.05); color: var(--negative); }
      .connection-item-email {
        color: var(--text-2);
        font-size: 12px;
        line-height: 1.5;
        white-space: pre-wrap;
        max-height: 96px;
        overflow: hidden;
        position: relative;
      }
      .connection-item.expanded .connection-item-email {
        max-height: none;
      }
      .connection-item-toggle {
        align-self: flex-start;
        background: none;
        border: 0;
        color: var(--primary);
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        padding: 0;
      }
      .connection-item-toggle:hover { text-decoration: underline; }
      ul { margin: 8px 0 0; padding-left: 18px; color: var(--text-2); }
      li { margin-bottom: 6px; font-size: 13px; }

      /* ============ Contacts panel (right) ============ */
      .contacts-panel {
        background: var(--surface);
        border-left: 1px solid var(--line);
        min-width: 0;
        padding: 16px 12px;
      }
      .contacts-panel-inner {
        position: sticky;
        top: 16px;
        max-height: calc(100vh - 32px);
        overflow-y: auto;
        overscroll-behavior: contain;
        padding-right: 4px;
        scrollbar-width: thin;
      }
      .contacts-panel-inner::-webkit-scrollbar { width: 8px; }
      .contacts-panel-inner::-webkit-scrollbar-thumb { background: var(--line-strong); border-radius: 4px; }
      .contacts-panel-inner::-webkit-scrollbar-thumb:hover { background: var(--muted); }
      .buying-role-select {
        background: #fff;
        border: 1px solid var(--line);
        border-radius: var(--radius-md);
        font: inherit;
        font-size: 13px;
        padding: 6px 8px;
        color: var(--text);
      }
      .buying-role-select:focus {
        border-color: var(--primary);
        outline: none;
        box-shadow: var(--ring-focus);
      }
      .contacts-head {
        align-items: start;
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 10px;
        padding: 0 4px;
      }
      .contacts-head h2 { font-size: 13px; font-weight: 600; }
      .add-contact-form {
        background: var(--surface-soft);
        border: 1px solid var(--line);
        border-radius: var(--radius-lg);
        display: none;
        gap: 6px;
        margin-bottom: 12px;
        padding: 10px;
      }
      .add-contact-form.open { display: grid; }
      .add-contact-form input {
        background: #fff;
        border: 1px solid var(--line);
        border-radius: var(--radius-md);
        font: inherit;
        font-size: 12px;
        padding: 6px 8px;
        width: 100%;
      }
      .add-contact-form input:focus {
        border-color: var(--primary);
        box-shadow: var(--ring-focus);
        outline: none;
      }
      .add-contact-form-actions { display: flex; gap: 6px; }
      .add-contact-form-actions button { flex: 1; font-size: 12px; padding: 6px 8px; }

      .contact-list { display: grid; gap: 2px; }
      .contact-chip {
        background: transparent;
        border: 0;
        border-radius: var(--radius-md);
        cursor: grab;
        display: grid;
        gap: 10px;
        grid-template-columns: 32px minmax(0, 1fr);
        padding: 6px 8px;
        position: relative;
        transition: background-color 120ms ease, opacity 160ms ease;
      }
      .contact-chip:hover { background: var(--primary-soft); }
      .contact-chip.active { background: var(--primary-soft-2); }
      .contact-chip[aria-disabled="true"] {
        cursor: pointer;
        filter: grayscale(0.6);
        opacity: 0.5;
      }
      .contact-photo {
        align-items: center;
        background: var(--primary-soft);
        border-radius: 999px;
        color: var(--primary);
        display: flex;
        font-size: 11px;
        font-weight: 600;
        height: 32px;
        justify-content: center;
        width: 32px;
      }
      .contact-name {
        color: var(--text);
        font-size: 13px;
        font-weight: 500;
        line-height: 1.3;
        overflow-wrap: anywhere;
      }

      /* ============ Department chips (sidebar) ============ */
      .sidebar-section-label {
        align-items: center;
        color: var(--muted);
        display: flex;
        font-size: 11px;
        font-weight: 600;
        justify-content: space-between;
        letter-spacing: 0.03em;
        margin: 12px 8px 4px;
        text-transform: uppercase;
      }
      .add-dept-btn {
        background: transparent;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        color: var(--muted);
        cursor: pointer;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0;
        padding: 1px 6px;
        text-transform: none;
      }
      .add-dept-btn:hover { background: var(--primary-soft); border-color: var(--primary); color: var(--primary); }
      .dept-chip-actions { display: none; gap: 1px; position: absolute; right: 6px; top: 50%; transform: translateY(-50%); }
      .contact-chip:hover .dept-chip-actions { display: flex; }
      .dept-action-btn {
        align-items: center;
        background: transparent;
        border: 0;
        border-radius: 3px;
        color: var(--muted);
        cursor: pointer;
        display: flex;
        font-size: 13px;
        height: 20px;
        justify-content: center;
        padding: 0 5px;
      }
      .dept-action-btn:hover { background: var(--line-soft); color: var(--text); }
      .dept-chip {
        align-items: center;
        background: transparent;
        border: 0;
        border-radius: var(--radius-md);
        cursor: grab;
        display: flex;
        gap: 10px;
        padding: 6px 8px;
        transition: background-color 120ms ease, opacity 160ms ease;
        width: 100%;
      }
      .dept-photo { background: #f3f4f6 !important; color: #6b7280 !important; }
      .dept-chip:hover { background: var(--primary-soft); }
      .dept-chip[aria-disabled="true"] { cursor: pointer; filter: grayscale(0.6); opacity: 0.5; }
      .dept-icon {
        align-items: center;
        border-radius: var(--radius-sm);
        display: flex;
        flex-shrink: 0;
        height: 32px;
        justify-content: center;
        width: 32px;
      }
      .dept-icon.blue   { background: #e0eaff; color: #3358d4; }
      .dept-icon.green  { background: #dcfce7; color: #16a34a; }
      .dept-icon.purple { background: #f3f0ff; color: #6d28d9; }
      .dept-icon.orange { background: #fff7ed; color: #c2410c; }
      .dept-icon.grey   { background: #f3f4f6; color: #4b5563; }
      .dept-chip-name { color: var(--text); font-size: 13px; font-weight: 500; line-height: 1.3; }
      .dept-chip-desc { color: var(--muted); font-size: 11px; margin-top: 1px; }

      /* ============ Department card (tree) ============ */
      .dept-card {
        background: #fafafa;
        border: 1.5px solid var(--line);
        border-radius: 12px;
        cursor: pointer;
        display: flex;
        gap: 12px;
        min-width: 200px;
        padding: 12px 14px;
        position: relative;
        transition: box-shadow 140ms ease, border-color 140ms ease;
        user-select: none;
        width: 220px;
      }
      .dept-card:hover { border-color: #c4b5fd; box-shadow: 0 2px 10px rgba(0,0,0,0.07); }
      .dept-card.is-drop-target { border-color: var(--primary); background: var(--primary-soft); }
      .dept-card-icon {
        align-items: center;
        border-radius: 8px;
        display: flex;
        flex-shrink: 0;
        height: 36px;
        justify-content: center;
        width: 36px;
      }
      .dept-card-icon.blue   { background: #e0eaff; color: #3358d4; }
      .dept-card-icon.green  { background: #dcfce7; color: #16a34a; }
      .dept-card-icon.purple { background: #f3f0ff; color: #6d28d9; }
      .dept-card-icon.orange { background: #fff7ed; color: #c2410c; }
      .dept-card-icon.grey   { background: #f3f4f6; color: #4b5563; }
      .dept-card-body { min-width: 0; }
      .dept-card-name { font-size: 14px; font-weight: 700; line-height: 1.3; }
      .dept-card-desc { color: var(--muted); font-size: 11px; margin-top: 2px; }
      .dept-card-count { color: var(--muted); font-size: 11px; margin-top: 4px; }
      .dept-card .remove {
        position: absolute;
        right: 6px;
        top: 6px;
      }

      /* ============ Notes panel ============ */
      .notes-panel {
        background: var(--surface);
        border-left: 1px solid var(--line);
        min-width: 0;
        opacity: 0;
        overflow-x: hidden;
        overflow-y: auto;
        padding: 0;
        pointer-events: none;
        transition: opacity 180ms ease, padding 200ms ease;
        visibility: hidden;
      }
      .notes-panel.open {
        opacity: 1;
        padding: 16px 18px;
        pointer-events: auto;
        visibility: visible;
      }
      .notes-panel textarea {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--radius-lg);
        font: inherit;
        font-size: 13px;
        min-height: 160px;
        padding: 10px 12px;
        resize: vertical;
        width: 100%;
      }
      .notes-panel textarea:focus {
        border-color: var(--primary);
        box-shadow: var(--ring-focus);
        outline: none;
      }
      #close-notes {
        align-items: center;
        background: transparent;
        border: 1px solid var(--line);
        border-radius: var(--radius-md);
        color: var(--muted);
        cursor: pointer;
        display: flex;
        flex-shrink: 0;
        font-size: 16px;
        height: 28px;
        justify-content: center;
        padding: 0;
        width: 28px;
      }
      #close-notes:hover { background: var(--surface-soft); color: var(--text); }
      .notes-head {
        align-items: start;
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 14px;
      }
      #notes-name { font-size: 15px; font-weight: 600; letter-spacing: -0.005em; }
      .detail-status {
        color: var(--muted);
        font-size: 12px;
        margin-bottom: 12px;
      }
      .detail-content { display: grid; gap: 10px; margin-bottom: 14px; }
      .detail-section {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--radius-lg);
        padding: 12px 14px;
      }
      .detail-section h3 {
        color: var(--text);
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0;
        margin: 0 0 8px;
        text-transform: none;
      }
      .field-row {
        display: grid;
        gap: 8px;
        grid-template-columns: 100px minmax(0, 1fr);
        padding: 4px 0;
      }
      .field-row span {
        color: var(--muted);
        font-size: 12px;
      }
      .field-row strong, .field-row a {
        color: var(--text);
        font-size: 12px;
        font-weight: 500;
        overflow-wrap: anywhere;
      }
      .field-row a {
        color: var(--primary);
        text-decoration: none;
      }
      .field-row a:hover { text-decoration: underline; }
      .mini-list { display: grid; gap: 6px; }
      .mini-item {
        background: var(--surface-soft);
        border: 1px solid var(--line);
        border-radius: var(--radius-md);
        font-size: 12px;
        padding: 9px 10px;
      }
      .mini-item strong {
        color: var(--text);
        display: block;
        font-weight: 500;
        margin-bottom: 2px;
      }
      .notes-label {
        color: var(--muted);
        display: block;
        font-size: 12px;
        font-weight: 500;
        margin: 0 0 6px;
      }
      .linkedin-input {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--radius-lg);
        font: inherit;
        font-size: 13px;
        padding: 8px 10px;
        width: 100%;
      }
      .linkedin-input:focus {
        border-color: var(--primary);
        box-shadow: var(--ring-focus);
        outline: none;
      }

      .card-linkedin {
        align-items: center;
        background: #0a66c2;
        border-radius: var(--radius-sm);
        bottom: 6px;
        color: #fff;
        display: inline-flex;
        font-size: 10px;
        font-weight: 600;
        height: 20px;
        justify-content: center;
        position: absolute;
        right: 8px;
        text-decoration: none;
        width: 20px;
        z-index: 4;
      }
      .card-linkedin:hover { background: #084c93; }
      .sentiment-dot {
        border-radius: 50%;
        border: 2px solid #fff;
        box-shadow: 0 0 0 1px rgba(0,0,0,0.06);
        height: 14px;
        position: absolute;
        right: 12px;
        top: 12px;
        width: 14px;
        z-index: 4;
      }
      .sentiment-dot.positive { background: var(--positive); }
      .sentiment-dot.negative { background: var(--negative); }
      .sentiment-dot.neutral { background: #b45309; }

      /* ============ AI section ============ */
      .ai-section {
        background: linear-gradient(180deg, #faf8ff 0%, #fdf2f8 100%);
        border: 1px solid var(--accent-violet-soft);
        border-radius: var(--radius-lg);
        margin-top: 12px;
        padding: 12px 14px;
        position: relative;
      }
      .ai-section::before {
        background: linear-gradient(90deg, #5532ed 0%, #9747ff 55%, #f472b6 100%);
        border-radius: var(--radius-lg) var(--radius-lg) 0 0;
        content: "";
        height: 2px;
        left: 0;
        position: absolute;
        right: 0;
        top: 0;
      }
      .ai-section h3 {
        align-items: center;
        background: linear-gradient(90deg, #5532ed 0%, #9747ff 60%, #ec4899 100%);
        background-clip: text;
        color: transparent;
        display: flex;
        font-size: 11px;
        font-weight: 600;
        gap: 6px;
        letter-spacing: 0.02em;
        margin: 0 0 8px;
        text-transform: uppercase;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .ai-section h3::before {
        color: var(--primary);
        content: "✦";
        font-size: 13px;
        -webkit-text-fill-color: initial;
      }
      .ai-row {
        display: flex;
        flex-direction: column;
        font-size: 12px;
        gap: 2px;
        margin-bottom: 8px;
      }
      .ai-row:last-child { margin-bottom: 0; }
      .ai-row span {
        color: var(--muted);
        font-size: 10px;
        font-weight: 500;
        letter-spacing: 0.02em;
        text-transform: uppercase;
      }
      .ai-pill {
        align-self: flex-start;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 500;
        padding: 2px 8px;
      }
      .ai-pill.positive { background: var(--positive-soft); color: var(--positive); }
      .ai-pill.negative { background: var(--negative-soft); color: var(--negative); }
      .ai-pill.neutral { background: var(--notice-soft); color: var(--notice); }

      /* ============ AI section head + sentiment pill select ============ */
      .ai-section-head {
        align-items: center;
        display: flex;
        gap: 8px;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .ai-section-head h3 { margin: 0; }
      .ai-tag {
        background: linear-gradient(90deg, #5532ed 0%, #ec4899 100%);
        border-radius: 999px;
        color: #fff;
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.6px;
        padding: 2px 7px;
        text-transform: uppercase;
      }
      .pylon-tag {
        background: #1f1147;
        border-radius: 999px;
        color: #fff;
        font-size: 9px;
        font-weight: 700;
        letter-spacing: 0.6px;
        padding: 2px 7px;
        text-transform: uppercase;
      }
      .pylon-meta {
        font-size: 11px;
        margin-bottom: 8px;
      }
      .sentiment-pill-row {
        align-items: center;
        display: flex;
        gap: 10px;
        margin-bottom: 6px;
      }
      .sentiment-pill-select {
        appearance: none;
        background: var(--surface);
        background-image: linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%);
        background-position: calc(100% - 14px) 50%, calc(100% - 9px) 50%;
        background-repeat: no-repeat;
        background-size: 5px 5px, 5px 5px;
        border: 1px solid currentColor;
        border-radius: 999px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        padding: 4px 26px 4px 12px;
      }
      .sentiment-pill-select.engaged { background-color: #e0f2fe; color: #0369a1; }
      .sentiment-pill-select.cautious { background-color: #fef3c7; color: #b45309; }
      .sentiment-pill-select.blocker { background-color: #fee2e2; color: #b91c1c; }
      .sentiment-pill-select.champion { background-color: #ede9fe; color: #6d28d9; }
      .sentiment-pill-select option { background: #fff; color: var(--text); }

      /* ============ Pylon-sourced sections ============ */
      .pylon-section {
        background: linear-gradient(180deg, #f8fafc 0%, #f1f5fb 100%);
        border-color: #d8def0;
      }
      .next-step-list {
        display: grid;
        gap: 8px;
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .next-step-item {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 8px 10px;
      }
      .next-step-action {
        color: var(--text);
        font-size: 12.5px;
        font-weight: 500;
        line-height: 1.4;
      }
      .next-step-meta {
        align-items: center;
        color: var(--text-2);
        display: flex;
        flex-wrap: wrap;
        font-size: 11px;
        gap: 6px 10px;
        margin-top: 4px;
      }
      .next-step-owner {
        background: var(--surface-soft);
        border-radius: 999px;
        padding: 1px 8px;
      }
      .next-step-due { font-weight: 500; }

      .gap-list { display: grid; gap: 10px; }
      .gap-item {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 10px 12px;
      }
      .gap-head {
        align-items: center;
        display: flex;
        gap: 8px;
        justify-content: space-between;
        margin-bottom: 4px;
      }
      .gap-title { font-size: 12.5px; }
      .gap-status {
        background: var(--surface-soft);
        border-radius: 999px;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.3px;
        padding: 2px 8px;
        text-transform: uppercase;
      }
      .gap-status.planned { background: #dcfce7; color: #166534; }
      .gap-status.triaged { background: #dbeafe; color: #1e40af; }
      .gap-status.logged { background: #f1f5f9; color: #475569; }
      .gap-description {
        color: var(--text-2);
        font-size: 12px;
        line-height: 1.5;
        margin-bottom: 6px;
      }
      .gap-attribution {
        color: var(--text-2);
        font-size: 11px;
      }
      .gap-attribution strong { color: var(--text); font-weight: 600; }

      /* ============ Connection modal ============ */
      .connection-modal {
        display: none;
        inset: 0;
        position: fixed;
        z-index: 50;
      }
      .connection-modal.open { display: block; }
      .connection-modal-backdrop {
        background: rgba(15, 23, 42, 0.40);
        backdrop-filter: blur(4px);
        inset: 0;
        position: absolute;
      }
      .connection-modal-card {
        background: var(--surface);
        border-radius: var(--radius-xl);
        box-shadow: 0 24px 48px -12px rgba(15, 20, 30, 0.20);
        left: 50%;
        max-width: 520px;
        padding: 22px 24px;
        position: absolute;
        top: 50%;
        transform: translate(-50%, -50%);
        width: calc(100% - 48px);
      }
      .connection-modal-head {
        align-items: flex-start;
        display: flex;
        gap: 12px;
        justify-content: space-between;
        margin-bottom: 14px;
      }
      .connection-modal-head h2 {
        font-size: 17px;
        font-weight: 600;
        letter-spacing: -0.01em;
        margin: 0 0 2px;
      }
      .connection-modal-head button {
        align-items: center;
        background: transparent;
        border: 1px solid var(--line);
        border-radius: var(--radius-md);
        color: var(--muted);
        cursor: pointer;
        display: flex;
        font-size: 16px;
        height: 28px;
        justify-content: center;
        width: 28px;
      }
      .connection-modal-body { display: flex; flex-direction: column; gap: 4px; }
      .connection-label {
        color: var(--muted);
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0;
        margin-top: 10px;
        text-transform: none;
      }
      .connection-email {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--radius-lg);
        font: inherit;
        font-family: inherit;
        font-size: 13px;
        line-height: 1.5;
        padding: 10px 12px;
        resize: vertical;
        width: 100%;
      }
      .connection-email:focus {
        border-color: var(--primary);
        box-shadow: var(--ring-focus);
        outline: none;
      }

      /* ============ Picker (combobox) ============ */
      .picker { position: relative; }
      .picker-button {
        align-items: center;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--radius-lg);
        cursor: pointer;
        display: flex;
        font: inherit;
        font-size: 13px;
        font-weight: 400;
        justify-content: space-between;
        padding: 8px 11px;
        text-align: left;
        width: 100%;
      }
      .picker-button:hover { border-color: var(--line-strong); }
      .picker-button:focus,
      .picker.open .picker-button {
        border-color: var(--primary);
        box-shadow: var(--ring-focus);
        outline: none;
      }
      .picker-label {
        color: var(--text);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .picker-label.placeholder { color: var(--muted); font-weight: 400; }
      .picker-caret { color: var(--muted); flex-shrink: 0; font-size: 11px; margin-left: 8px; }
      .picker-popover {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-pop);
        display: none;
        left: 0;
        margin-top: 4px;
        position: absolute;
        right: 0;
        top: 100%;
        z-index: 60;
      }
      .picker.open .picker-popover { display: block; }
      .picker-search {
        background: transparent;
        border: 0;
        border-bottom: 1px solid var(--line);
        border-radius: var(--radius-lg) var(--radius-lg) 0 0;
        font: inherit;
        font-size: 13px;
        outline: none;
        padding: 10px 12px;
        width: 100%;
      }
      .picker-list { max-height: 220px; overflow-y: auto; padding: 4px 0; }
      .picker-item {
        cursor: pointer;
        display: flex;
        flex-direction: column;
        font-size: 13px;
        gap: 1px;
        padding: 7px 12px;
      }
      .picker-item.active, .picker-item:hover { background: var(--primary-soft); }
      .picker-item strong { color: var(--text); font-weight: 500; }
      .picker-item-meta { color: var(--muted); font-size: 11px; }
      .picker-empty { color: var(--muted); font-size: 12px; padding: 14px; text-align: center; }

      .connection-modal-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 16px;
      }

      .connection-pill {
        align-items: center;
        background: var(--primary-soft);
        border: 1px solid var(--primary-soft-2);
        border-radius: 999px;
        color: var(--primary);
        display: inline-flex;
        font-size: 10px;
        font-weight: 500;
        gap: 4px;
        margin: 8px auto 0;
        padding: 2px 8px;
      }
      .profile-card-info > .connection-pill {
        display: inline-flex;
        margin: 8px auto 0;
        text-align: center;
      }
      .profile-card-info { text-align: center; }
      .connection-line {
        background: var(--primary);
        height: 1.5px;
        opacity: 0.4;
        pointer-events: none;
        position: absolute;
        transform-origin: left center;
        z-index: 1;
      }

      @media (max-width: 1120px) {
        .app-shell {
          grid-template-columns: minmax(0, 1fr) 320px 0px;
        }
        .app-shell.notes-open {
          grid-template-columns: minmax(0, 1fr) 0px 380px;
        }
        .account-nav { display: none; }
      }
      @media (max-width: 860px) {
        .app-shell { grid-template-columns: 1fr; }
        .contacts-panel { display: none; }
        .stage { padding: 18px; }
        .insights { grid-template-columns: 1fr; }
      }

      /* ============ Tweak variants ============ */
      body { font-size: calc(13px * var(--tw-font-scale, 1)); }
      body.photo-circle .profile-card-photo {
        border-radius: 999px;
        aspect-ratio: 1 / 1;
        height: var(--card-photo-h);
        width: var(--card-photo-h);
        margin: 0 auto;
      }
      body.photo-circle .profile-card-info { margin-top: -16px; }
      body.photo-rect .profile-card-photo { border-radius: 12px 12px 8px 8px; }
      body.hide-stats .profile-card-stats { display: none; }
      body.hide-stats .profile-card-info { padding-bottom: 10px; }
      body.hide-photo .profile-card-photo { display: none; }
      body.hide-photo .profile-card-info {
        border-radius: var(--radius-xl);
        margin-top: 0;
      }
      body.hide-photo .profile-card { padding-top: 0; }

      /* ============ Tweaks panel ============ */
      .tweaks-panel {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 12px;
        bottom: 16px;
        box-shadow: var(--shadow-pop);
        display: none;
        flex-direction: column;
        font-family: "IBM Plex Sans", system-ui, sans-serif;
        max-height: calc(100vh - 32px);
        position: fixed;
        right: 16px;
        width: 280px;
        z-index: 100;
      }
      .tweaks-panel.open { display: flex; }
      .tweaks-head {
        align-items: center;
        border-bottom: 1px solid var(--line-soft);
        display: flex;
        justify-content: space-between;
        padding: 10px 12px;
      }
      .tweaks-head h3 {
        color: var(--text);
        font-size: 13px;
        font-weight: 600;
        letter-spacing: -0.005em;
        margin: 0;
      }
      .tweaks-close {
        background: transparent;
        border: 0;
        border-radius: 6px;
        color: var(--muted);
        cursor: pointer;
        font-size: 18px;
        height: 26px;
        line-height: 1;
        padding: 0;
        width: 26px;
      }
      .tweaks-close:hover { background: var(--surface-soft); color: var(--text); }
      .tweaks-body {
        display: flex;
        flex-direction: column;
        gap: 12px;
        overflow-y: auto;
        padding: 12px;
      }
      .tweak-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .tweak-section-title {
        color: var(--muted);
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .tweak-row {
        align-items: center;
        color: var(--text-2);
        display: flex;
        font-size: 12px;
        gap: 8px;
        justify-content: space-between;
      }
      .tweak-row > span:first-child { flex-shrink: 0; }
      .tweak-control {
        align-items: center;
        display: inline-flex;
        gap: 6px;
        min-width: 0;
      }
      .tweak-control input[type=range] {
        accent-color: var(--primary);
        width: 110px;
      }
      .tweak-control output {
        color: var(--muted);
        font-feature-settings: "tnum" 1;
        font-size: 11px;
        min-width: 36px;
        text-align: right;
      }
      .tweak-segmented {
        background: var(--surface-soft);
        border: 1px solid var(--line);
        border-radius: 6px;
        display: inline-flex;
        padding: 2px;
      }
      .tweak-segmented button {
        background: transparent;
        border: 0;
        border-radius: 4px;
        color: var(--muted);
        cursor: pointer;
        font-family: inherit;
        font-size: 11px;
        font-weight: 500;
        padding: 3px 8px;
      }
      .tweak-segmented button.active {
        background: var(--surface);
        box-shadow: 0 1px 2px rgba(15, 20, 30, 0.06);
        color: var(--text);
      }
      .tweak-reset {
        background: var(--surface-soft);
        border: 1px solid var(--line);
        border-radius: 6px;
        color: var(--text-2);
        cursor: pointer;
        font-family: inherit;
        font-size: 12px;
        font-weight: 500;
        margin-top: 4px;
        padding: 6px 10px;
      }
      .tweak-reset:hover { background: var(--line-soft); }
    </style>
  </head>
  <body>
    <div class="app-shell">
      <aside class="account-nav" aria-label="Account navigation">
        <div class="account-summary-card" id="account-summary-card">
          <div class="account-summary-name">${escapeHtml(analysis.accountName)}</div>
          <div class="account-summary-metrics" id="account-summary-metrics">
            <div class="summary-metric"><strong id="summary-arr">—</strong>ARR</div>
            <div class="summary-metric"><strong id="summary-health">—</strong>Health</div>
          </div>
          <div class="summary-renewal" id="summary-renewal"></div>
        </div>
        <div class="nav-list">
          <button type="button" class="nav-item" data-nav="overview">Overview</button>
          <button type="button" class="nav-item" data-nav="issues">Issues</button>
          <button type="button" class="nav-item active" data-nav="org-map">Org Chart Mapper</button>
          <button type="button" class="nav-item" data-nav="contacts">Contacts</button>
        </div>
        <div class="nav-section-label">Opportunities</div>
        <div class="opp-list" id="opp-list"></div>
      </aside>

      <aside id="opp-panel" class="opp-panel" aria-label="Opportunity details">
        <div class="opp-panel-head">
          <h2 id="opp-panel-name">Opportunity</h2>
          <button type="button" class="opp-panel-close" id="close-opp" title="Close">×</button>
        </div>
        <div id="opp-panel-content"></div>
      </aside>
      <section class="workspace">
        <header class="topbar">
          <div class="account-title">
            <span class="linkedin">in</span>
            <div class="title-stack">
              <strong>${escapeHtml(analysis.accountName)}</strong>
              <span id="topbar-subtitle">Org Chart Mapper</span>
            </div>
          </div>
          <div class="actions">
            <a class="button secondary" href="/">Home</a>
            <a class="button secondary" href="/settings">Settings</a>
          </div>
        </header>
        <main class="stage">
          <div data-view="org-map" class="stage-view">
            <div class="stage-head">
              <div>
                <h1>Org Chart Mapper</h1>
                <div class="muted">Build account hierarchy by dragging contacts from the right panel into the map.</div>
              </div>
              <div class="stage-actions">
                <button type="button" class="primary" id="make-connection">Make a connection</button>
                <button type="button" class="secondary" id="clear-chart">Clear chart</button>
              </div>
            </div>
            <section class="map-panel" aria-label="Org chart map">
              <div class="zoom-controls" role="group" aria-label="Zoom">
                <button type="button" class="zoom-btn" id="zoom-out" aria-label="Zoom out">−</button>
                <button type="button" class="zoom-btn zoom-level" id="zoom-fit" aria-label="Fit to view">100%</button>
                <button type="button" class="zoom-btn" id="zoom-in" aria-label="Zoom in">+</button>
              </div>
              <div id="org-tree" class="tree"></div>
            </section>
            <section class="insights">
              <div class="insight-card">
                <h2>Next Moves</h2>
                <ul>${analysis.nextMoves.map((move) => `<li>${escapeHtml(move)}</li>`).join("")}</ul>
              </div>
              <div class="insight-card">
                <h2>Gaps</h2>
                <ul>${(analysis.gaps.length ? analysis.gaps : ["No critical account-map gaps found."]).map((gap) => `<li>${escapeHtml(gap)}</li>`).join("")}</ul>
              </div>
              <div class="insight-card insight-card-full" id="connections-card">
                <h2>Saved Connections</h2>
                <div id="connections-list" class="connections-list"></div>
              </div>
            </section>
          </div>

          <div data-view="overview" class="stage-view" hidden>
            <div class="stage-head"><div><h1>Overview</h1><div class="muted">${escapeHtml(analysis.accountName)} — account summary and active opportunities.</div></div></div>
            <div id="overview-content"></div>
          </div>

          <div data-view="issues" class="stage-view" hidden style="position:relative;">
            <div class="stage-head">
              <div><h1>Issues</h1><div class="muted">Pylon issues raised by contacts at this account.</div></div>
              <div class="stage-actions">
                <button type="button" class="secondary" id="issues-filter">Filter</button>
                <button type="button" class="primary" id="issues-log">+ Log issue</button>
              </div>
            </div>
            <div id="issues-content" class="issues-list"></div>
            <aside id="issue-detail-panel" class="issue-detail-panel"></aside>
          </div>

          <div data-view="contacts" class="stage-view" hidden>
            <div class="stage-head"><div><h1>Contacts</h1><div class="muted">All contacts pulled from Pylon for this account.</div></div></div>
            <div id="contacts-content" class="contacts-list-view"></div>
          </div>
        </main>
      </section>
      <aside class="contacts-panel" aria-label="Contacts sidebar">
        <div class="contacts-panel-inner">
          <div class="contacts-head">
            <div>
              <h2>Contacts</h2>
              <div class="muted"><span id="placed-count">0</span> of <span id="total-count">${analysis.nodes.length}</span> in map</div>
            </div>
            <button type="button" class="secondary" id="add-contact-btn" style="font-size:11px;padding:5px 8px;flex-shrink:0;">+ Add</button>
          </div>
          <div id="add-contact-form" class="add-contact-form">
            <input id="new-contact-name" type="text" placeholder="Full name" autocomplete="off">
            <input id="new-contact-title" type="text" placeholder="Title (e.g. VP Operations)" autocomplete="off">
            <select id="new-contact-buying-role" class="buying-role-select">
              <option value="">Buying role (optional)</option>
              <option value="Champion">Champion</option>
              <option value="Economic buyer">Economic buyer</option>
              <option value="Technical approver">Technical approver</option>
              <option value="Operational buyer">Operational buyer</option>
              <option value="Access path">Access path</option>
              <option value="Potential stakeholder">Potential stakeholder</option>
            </select>
            <div class="add-contact-form-actions">
              <button type="button" class="primary" id="save-new-contact">Add contact</button>
              <button type="button" class="secondary" id="cancel-new-contact">Cancel</button>
            </div>
          </div>
          <div class="sidebar-section-label">People</div>
          <div id="people-list" class="contact-list"></div>
          <div class="sidebar-section-label">Departments <button type="button" id="add-dept-btn" class="add-dept-btn">+ Add</button></div>
          <div id="add-dept-form" class="add-contact-form">
            <input id="new-dept-name" type="text" placeholder="Group name (e.g. Sales)" autocomplete="off">
            <div class="add-contact-form-actions">
              <button type="button" class="primary" id="save-new-dept">Add</button>
              <button type="button" class="secondary" id="cancel-new-dept">Cancel</button>
            </div>
          </div>
          <div id="dept-list" class="contact-list"></div>
        </div>
      </aside>
      <aside id="notes-panel" class="notes-panel" aria-label="Contact details and notes">
      <div class="notes-head">
        <div>
          <h2 id="notes-name">Contact details</h2>
          <div id="notes-title" class="muted"></div>
          <a id="view-profile-link" href="#" target="_blank" class="view-profile-btn" style="display:none;">View full profile →</a>
        </div>
        <button type="button" class="ghost" id="close-notes" title="Close (Esc)">×</button>
      </div>
      <div id="detail-status" class="detail-status">Click a contact to load Pylon and CRM detail.</div>
      <div id="detail-content" class="detail-content"></div>
      <label class="notes-label" for="linkedin-input">LinkedIn URL</label>
      <input id="linkedin-input" type="url" class="linkedin-input" placeholder="https://linkedin.com/in/...">
      <label class="notes-label" for="notes-input" style="margin-top:14px;">Notes</label>
      <textarea id="notes-input" placeholder="Add notes for this stakeholder..."></textarea>
      <div class="actions" style="margin-top: 12px;">
        <button type="button" class="primary" id="save-notes">Save</button>
      </div>
      </aside>
      <div id="connection-modal" class="connection-modal" aria-hidden="true">
        <div class="connection-modal-backdrop"></div>
        <div class="connection-modal-card" role="dialog" aria-labelledby="connection-modal-title">
          <div class="connection-modal-head">
            <div>
              <h2 id="connection-modal-title">Make a connection</h2>
              <div class="muted" style="font-size:12px;">Pick the two people, then draft the intro email.</div>
            </div>
            <button type="button" class="ghost" id="connection-close" aria-label="Close">×</button>
          </div>
          <div class="connection-modal-body">
            <label class="connection-label">From (who you'll write to)</label>
            <div class="picker" data-picker="from">
              <button type="button" class="picker-button">
                <span class="picker-label">Select contact</span>
                <span class="picker-caret">▾</span>
              </button>
              <div class="picker-popover">
                <input type="search" class="picker-search" placeholder="Search by name or title" autocomplete="off">
                <div class="picker-list"></div>
              </div>
            </div>
            <label class="connection-label">To (who they should connect you with)</label>
            <div class="picker" data-picker="to">
              <button type="button" class="picker-button">
                <span class="picker-label">Select contact</span>
                <span class="picker-caret">▾</span>
              </button>
              <div class="picker-popover">
                <input type="search" class="picker-search" placeholder="Search by name or title" autocomplete="off">
                <div class="picker-list"></div>
              </div>
            </div>
            <label class="connection-label" for="conn-email">Email draft</label>
            <textarea id="conn-email" class="connection-email" rows="9" placeholder="Hi {from}, ..."></textarea>
          </div>
          <div class="connection-modal-actions">
            <button type="button" class="secondary" id="conn-regen">Regenerate draft</button>
            <button type="button" class="primary" id="conn-save">Save connection</button>
          </div>
        </div>
      </div>
    </div>

    <script>
      const people = ${peopleJson};
      const suggestedRoots = ${suggestedRootsJson};
      const accountId = ${accountIdJson};
      const accountName = ${accountNameJson};
      function pylonSlackChannel(name) {
        if (!name) return "";
        const slug = String(name).toLowerCase().trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        return slug ? "#pylon-" + slug : "";
      }
      const opportunities = ${opportunitiesJson};
      const accountMetrics = ${accountMetricsJson};
      const issues = ${issuesJson};
      const messages = ${messagesJson};
      const departments = ${departmentsJson};
      const DEPT_ICON_SVG = \`<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="1" y="4" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" stroke="currentColor" stroke-width="1.5"/><path d="M1 8h14" stroke="currentColor" stroke-width="1.3" stroke-dasharray="2 2"/></svg>\`;
      const opportunitiesById = new Map(opportunities.map((o) => [o.id, o]));
      const peopleById = new Map(people.map((person) => [person.id, person]));

      // Hydrate any custom contacts saved from previous sessions — scoped per-account so
      // people added on one account don't leak into another.
      const CUSTOM_CONTACTS_KEY = \`orgmap.customContacts.v2.\${accountId || "default"}\`;
      const LEGACY_CONTACTS_KEY = "orgmap.customContacts.v1";
      function loadSavedCustomContacts() {
        try {
          const raw = localStorage.getItem(CUSTOM_CONTACTS_KEY);
          if (!raw) return [];
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
          return [];
        }
      }
      function persistCustomContact(person) {
        try {
          const saved = loadSavedCustomContacts();
          const idx = saved.findIndex((p) => p.id === person.id);
          if (idx >= 0) saved[idx] = person;
          else saved.push(person);
          localStorage.setItem(CUSTOM_CONTACTS_KEY, JSON.stringify(saved));
        } catch (err) {
          // Storage may be unavailable — fail silently.
        }
      }
      // One-time cleanup: drop the unscoped legacy bucket and any stale v2 buckets that
      // were polluted with mock contacts before live Pylon mode shipped. Guarded by a
      // versioned flag so we only purge once per browser.
      try {
        localStorage.removeItem(LEGACY_CONTACTS_KEY);
        const PURGE_FLAG = "orgmap.customContacts.purged.v3";
        if (!localStorage.getItem(PURGE_FLAG)) {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith("orgmap.customContacts.v2.")) localStorage.removeItem(key);
          }
          localStorage.setItem(PURGE_FLAG, "1");
        }
      } catch (err) {}
      loadSavedCustomContacts().forEach((person) => {
        if (!person?.id || peopleById.has(person.id)) return;
        people.push(person);
        peopleById.set(person.id, person);
      });
      departments.forEach((dept) => {
        if (!dept?.id || peopleById.has(dept.id)) return;
        people.push(dept);
        peopleById.set(dept.id, dept);
      });
      requestAnimationFrame(() => {
        const totalEl = document.querySelector("#total-count");
        if (totalEl) totalEl.textContent = people.filter((p) => p.type !== "department").length;
      });

      const contactDetailCache = new Map();
      const state = {
        roots: [],
        childrenById: {},
        draggingId: null,
        draggingFromTree: false,
        activeNoteId: null,
        notesById: Object.fromEntries(people.map((person) => [person.id, person.notes || ""])),
        linkedinById: Object.fromEntries(people.map((person) => [person.id, person.linkedinUrl || ""])),
        customTitles: {},
        customNames: {},
        connections: []
      };

      // Snapshot the seed IDs so we know later which departments were created
      // by the user (and need to be persisted as part of chart state).
      const seedDeptIds = new Set(people.filter((p) => p.type === "department").map((p) => p.id));

      // ============ Chart-state persistence (per account, in localStorage) ============
      const CHART_STATE_KEY = \`orgmap.chartState.v1.\${accountId || "default"}\`;
      let chartSaveTimer = null;
      function loadChartState() {
        try {
          const raw = localStorage.getItem(CHART_STATE_KEY);
          if (!raw) return;
          const saved = JSON.parse(raw);
          if (!saved || typeof saved !== "object") return;
          // Restore custom departments before we restore structural state, so
          // their IDs are valid in roots/childrenById.
          (saved.customDepartments || []).forEach((dept) => {
            if (!dept?.id || peopleById.has(dept.id)) return;
            people.push({ ...dept, type: "department" });
            peopleById.set(dept.id, peopleById.get(dept.id) || people[people.length - 1]);
          });
          // Restore the structural fields. Filter to known IDs in case people
          // were removed from the seed since the last save.
          const known = (id) => peopleById.has(id);
          if (Array.isArray(saved.roots)) {
            state.roots = saved.roots.filter(known);
          }
          if (saved.childrenById && typeof saved.childrenById === "object") {
            for (const [parentId, childIds] of Object.entries(saved.childrenById)) {
              if (!known(parentId) || !Array.isArray(childIds)) continue;
              state.childrenById[parentId] = childIds.filter(known);
            }
          }
          if (saved.notesById) Object.assign(state.notesById, saved.notesById);
          if (saved.linkedinById) Object.assign(state.linkedinById, saved.linkedinById);
          if (saved.customTitles) Object.assign(state.customTitles, saved.customTitles);
          if (saved.customNames) Object.assign(state.customNames, saved.customNames);
          if (Array.isArray(saved.connections)) state.connections = saved.connections;
        } catch (err) {
          // Bad JSON or storage error — ignore and start fresh.
        }
      }
      function saveChartStateNow() {
        try {
          const customDepartments = people
            .filter((p) => p.type === "department" && !seedDeptIds.has(p.id))
            .map((p) => ({ id: p.id, name: p.name, type: "department" }));
          const payload = {
            schemaVersion: 1,
            updatedAt: Date.now(),
            roots: state.roots,
            childrenById: state.childrenById,
            notesById: state.notesById,
            linkedinById: state.linkedinById,
            customTitles: state.customTitles,
            customNames: state.customNames,
            connections: state.connections,
            customDepartments
          };
          localStorage.setItem(CHART_STATE_KEY, JSON.stringify(payload));
        } catch (err) {
          // Quota exceeded or storage unavailable — fail silently.
        }
      }
      function scheduleChartStateSave() {
        if (chartSaveTimer) clearTimeout(chartSaveTimer);
        chartSaveTimer = setTimeout(saveChartStateNow, 400);
      }
      // Hydrate any saved chart for this account before the first render.
      loadChartState();

      // Account summary + opportunity sidebar
      const viewProfileLink = document.querySelector("#view-profile-link");
      const summaryArr = document.querySelector("#summary-arr");
      const summaryHealth = document.querySelector("#summary-health");
      const summaryRenewal = document.querySelector("#summary-renewal");
      const oppList = document.querySelector("#opp-list");
      const oppPanel = document.querySelector("#opp-panel");
      const oppPanelName = document.querySelector("#opp-panel-name");
      const oppPanelContent = document.querySelector("#opp-panel-content");

      if (summaryArr && accountMetrics.currentArr) {
        summaryArr.textContent = formatCurrency(accountMetrics.currentArr);
      }
      if (summaryHealth && accountMetrics.healthScore != null) {
        summaryHealth.textContent = \`\${accountMetrics.healthScore}/10\`;
      }
      if (summaryRenewal && accountMetrics.renewalDate) {
        summaryRenewal.textContent = \`Renewal: \${formatDate(accountMetrics.renewalDate)}\`;
      }

      if (oppList) {
        if (opportunities.length) {
          oppList.innerHTML = opportunities.map((opp) => \`
            <button type="button" class="opp-card" data-opp-id="\${escapeAttr(opp.id)}">
              <div class="opp-card-name">\${escapeHtml(opp.name)}</div>
              <div class="opp-card-meta">\${opp.amount ? formatCurrency(opp.amount) + " · " : ""}\${escapeHtml(opp.stage || "")}</div>
              <span class="opp-health \${escapeAttr(opp.health || "neutral")}">\${escapeHtml(oppHealthLabel(opp.health))}</span>
            </button>
          \`).join("");
          oppList.querySelectorAll(".opp-card").forEach((card) => {
            card.addEventListener("click", () => openOpportunity(card.dataset.oppId));
          });
        } else {
          oppList.innerHTML = '<div style="color:var(--faint);font-size:12px;padding:4px 2px;">No open opportunities</div>';
        }
      }

      document.querySelector("#close-opp")?.addEventListener("click", closeOpportunity);

      function openOpportunity(id) {
        const opp = opportunitiesById.get(id);
        if (!opp) return;
        document.querySelectorAll(".opp-card").forEach((c) => c.classList.remove("active"));
        document.querySelector(\`.opp-card[data-opp-id="\${cssEscape(id)}"]\`)?.classList.add("active");
        oppPanelName.textContent = opp.name;
        oppPanelContent.innerHTML = renderOppDetail(opp);
        oppPanel.classList.add("open");
      }

      function closeOpportunity() {
        document.querySelectorAll(".opp-card").forEach((c) => c.classList.remove("active"));
        oppPanel.classList.remove("open");
      }

      function renderOppDetail(opp) {
        const typeLabels = { renewal: "Renewal", expansion: "Expansion", new_business: "New Business" };
        return \`
          <span class="opp-type-badge opp-type-\${escapeAttr(opp.type || "")}">\${escapeHtml(typeLabels[opp.type] || opp.type || "Opportunity")}</span>
          <div class="opp-field-list">
            \${oppFieldRow("Stage", opp.stage)}
            \${oppFieldRow("Amount", opp.amount ? formatCurrency(opp.amount) : null)}
            \${oppFieldRow("Close date", opp.closeDate ? formatDate(opp.closeDate) : null)}
            \${oppFieldRow("Health", oppHealthLabel(opp.health))}
            \${oppFieldRow("Owner", opp.owner?.name)}
            \${opp.products?.length ? oppFieldRow("Products", opp.products.join(", ")) : ""}
          </div>
          \${opp.nextSteps ? \`<div class="opp-text-label">Next steps</div><div class="opp-text-block">\${escapeHtml(opp.nextSteps)}</div><br>\` : ""}
          \${opp.notes ? \`<div class="opp-text-label">Notes</div><div class="opp-text-block">\${escapeHtml(opp.notes)}</div>\` : ""}
        \`;
      }

      function oppFieldRow(label, value) {
        if (!value) return "";
        return \`<div class="opp-field-row"><span class="opp-field-label">\${escapeHtml(label)}</span><span class="opp-field-value">\${escapeHtml(value)}</span></div>\`;
      }

      function oppHealthLabel(health) {
        return { at_risk: "At risk", conditional: "Conditional", neutral: "On track" }[health] || "Unknown";
      }

      function formatCurrency(n) {
        n = Number(n);
        if (n >= 1_000_000) return \`$\${(n / 1_000_000).toFixed(1)}M\`;
        if (n >= 1000) return \`$\${Math.round(n / 1000)}k\`;
        return \`$\${n}\`;
      }

      function formatDate(iso) {
        try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
        catch { return iso; }
      }

      const appShell = document.querySelector(".app-shell");
      const peopleList = document.querySelector("#people-list");
      const orgTree = document.querySelector("#org-tree");
      const placedCount = document.querySelector("#placed-count");
      const notesPanel = document.querySelector("#notes-panel");
      const notesName = document.querySelector("#notes-name");
      const notesTitle = document.querySelector("#notes-title");
      const notesInput = document.querySelector("#notes-input");
      const linkedinInput = document.querySelector("#linkedin-input");
      const detailStatus = document.querySelector("#detail-status");
      const detailContent = document.querySelector("#detail-content");

      // Sentiment pill: live color swap on edit
      detailContent.addEventListener("change", (event) => {
        const sel = event.target.closest("[data-sentiment-bucket]");
        if (!sel) return;
        sel.classList.remove("engaged", "cautious", "blocker", "champion");
        sel.classList.add(sel.value);
      });

      document.querySelector("#clear-chart").addEventListener("click", () => {
        state.roots = [];
        state.childrenById = {};
        state.connections = [];
        render();
      });

      const connectionModal = document.querySelector("#connection-modal");
      const connEmailField = document.querySelector("#conn-email");

      function setupPicker(name, onChange) {
        const root = connectionModal.querySelector(\`[data-picker="\${name}"]\`);
        const button = root.querySelector(".picker-button");
        const label = button.querySelector(".picker-label");
        const popover = root.querySelector(".picker-popover");
        const search = root.querySelector(".picker-search");
        const list = root.querySelector(".picker-list");
        let selectedId = "";
        let activeIndex = 0;
        let filtered = people.slice();

        function renderList() {
          if (!filtered.length) {
            list.innerHTML = '<div class="picker-empty">No contacts match.</div>';
            return;
          }
          list.innerHTML = filtered.map((p, i) =>
            \`<div class="picker-item\${i === activeIndex ? " active" : ""}" data-id="\${escapeAttr(p.id)}">
              <strong>\${escapeHtml(p.name)}</strong>
              <span class="picker-item-meta">\${escapeHtml(p.title || "")}</span>
            </div>\`
          ).join("");
        }

        function applyQuery(query) {
          const q = (query || "").trim().toLowerCase();
          filtered = q
            ? people.filter((p) =>
                (p.name || "").toLowerCase().includes(q) ||
                (p.title || "").toLowerCase().includes(q) ||
                (p.email || "").toLowerCase().includes(q))
            : people.slice();
          activeIndex = Math.min(activeIndex, Math.max(0, filtered.length - 1));
          renderList();
        }

        function open() {
          root.classList.add("open");
          activeIndex = Math.max(0, filtered.findIndex((p) => p.id === selectedId));
          if (activeIndex < 0) activeIndex = 0;
          renderList();
          requestAnimationFrame(() => {
            search.focus();
            search.select();
          });
        }

        function close() {
          root.classList.remove("open");
        }

        function setValue(id) {
          const person = peopleById.get(id);
          selectedId = id;
          if (person) {
            label.textContent = person.title ? \`\${person.name} — \${person.title}\` : person.name;
            label.classList.remove("placeholder");
          } else {
            label.textContent = "Select contact";
            label.classList.add("placeholder");
          }
          if (typeof onChange === "function") onChange(id);
        }

        button.addEventListener("click", (event) => {
          event.stopPropagation();
          if (root.classList.contains("open")) close();
          else open();
        });

        search.addEventListener("input", () => {
          activeIndex = 0;
          applyQuery(search.value);
        });

        search.addEventListener("keydown", (event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            close();
            button.focus();
            return;
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            activeIndex = Math.min(filtered.length - 1, activeIndex + 1);
            renderList();
            list.querySelectorAll(".picker-item")[activeIndex]?.scrollIntoView({ block: "nearest" });
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            activeIndex = Math.max(0, activeIndex - 1);
            renderList();
            list.querySelectorAll(".picker-item")[activeIndex]?.scrollIntoView({ block: "nearest" });
          } else if (event.key === "Enter") {
            event.preventDefault();
            const item = filtered[activeIndex];
            if (item) {
              setValue(item.id);
              close();
              button.focus();
            }
          }
        });

        list.addEventListener("click", (event) => {
          const item = event.target.closest(".picker-item");
          if (!item) return;
          setValue(item.dataset.id);
          close();
          button.focus();
        });

        document.addEventListener("click", (event) => {
          if (!root.contains(event.target)) close();
        });

        renderList();

        return {
          setValue,
          getValue: () => selectedId,
          reset() {
            search.value = "";
            applyQuery("");
          }
        };
      }

      function generateConnectionDraft() {
        const from = peopleById.get(connFromPicker.getValue());
        const to = peopleById.get(connToPicker.getValue());
        if (!from || !to) return "";
        const fromFirst = (from.name || "").split(" ")[0] || from.name || "";
        return \`Hi \${fromFirst},\\n\\nQuick ask — would you be open to making an introduction to \${to.name}\${to.title ? \` (\${to.title})\` : ""}? We're working through a few questions on our end and your perspective on who else should weigh in would be helpful.\\n\\nHappy to share more context first if useful — just let me know.\\n\\nThanks!\`;
      }

      const connFromPicker = setupPicker("from", () => { connEmailField.value = generateConnectionDraft(); });
      const connToPicker = setupPicker("to", () => { connEmailField.value = generateConnectionDraft(); });

      function openConnectionModal() {
        connFromPicker.reset();
        connToPicker.reset();
        if (people[0]) connFromPicker.setValue(people[0].id);
        if (people[1]) connToPicker.setValue(people[1].id);
        else if (people[0]) connToPicker.setValue(people[0].id);
        connEmailField.value = generateConnectionDraft();
        connectionModal.classList.add("open");
        connectionModal.setAttribute("aria-hidden", "false");
      }

      function closeConnectionModal() {
        connectionModal.classList.remove("open");
        connectionModal.setAttribute("aria-hidden", "true");
      }

      document.querySelector("#make-connection").addEventListener("click", openConnectionModal);
      document.querySelector("#connection-close").addEventListener("click", closeConnectionModal);
      connectionModal.querySelector(".connection-modal-backdrop").addEventListener("click", closeConnectionModal);
      document.querySelector("#conn-regen").addEventListener("click", () => {
        connEmailField.value = generateConnectionDraft();
      });
      document.querySelector("#conn-save").addEventListener("click", () => {
        const fromId = connFromPicker.getValue();
        const toId = connToPicker.getValue();
        if (!fromId || !toId || fromId === toId) {
          alert("Please select two different contacts.");
          return;
        }
        state.connections.push({
          id: "conn_" + Math.random().toString(36).slice(2, 9),
          fromId,
          toId,
          email: connEmailField.value
        });
        closeConnectionModal();
        render();
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && connectionModal.classList.contains("open")) closeConnectionModal();
      });
      document.querySelector("#close-notes").addEventListener("click", closeNotes);
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && notesPanel.classList.contains("open")) closeNotes();
      });
      document.addEventListener("keydown", (event) => {
        const panel = document.querySelector("#issue-detail-panel");
        if (event.key === "Escape" && panel?.classList.contains("open")) closeIssueDetail();
      });
      document.querySelector("#save-notes").addEventListener("click", () => {
        if (!state.activeNoteId) return;
        state.notesById[state.activeNoteId] = notesInput.value;
        state.linkedinById[state.activeNoteId] = linkedinInput.value.trim();
        render();
        closeNotes();
      });

      const addContactForm = document.querySelector("#add-contact-form");
      document.querySelector("#add-contact-btn").addEventListener("click", () => {
        addContactForm.classList.toggle("open");
        if (addContactForm.classList.contains("open")) {
          document.querySelector("#new-contact-name").focus();
        }
      });
      document.querySelector("#cancel-new-contact").addEventListener("click", () => {
        addContactForm.classList.remove("open");
        document.querySelector("#new-contact-name").value = "";
        document.querySelector("#new-contact-title").value = "";
      });
      document.querySelector("#save-new-contact").addEventListener("click", () => {
        const name = document.querySelector("#new-contact-name").value.trim();
        const title = document.querySelector("#new-contact-title").value.trim();
        const buyingRole = document.querySelector("#new-contact-buying-role").value;
        if (!name) { document.querySelector("#new-contact-name").focus(); return; }
        addCustomContact(name, title || "—", buyingRole);
        document.querySelector("#new-contact-name").value = "";
        document.querySelector("#new-contact-title").value = "";
        document.querySelector("#new-contact-buying-role").value = "";
        addContactForm.classList.remove("open");
      });
      document.querySelector("#new-contact-name").addEventListener("keydown", (e) => {
        if (e.key === "Enter") document.querySelector("#new-contact-title").focus();
      });
      document.querySelector("#new-contact-title").addEventListener("keydown", (e) => {
        if (e.key === "Enter") document.querySelector("#save-new-contact").click();
      });

      const addDeptForm = document.querySelector("#add-dept-form");
      document.querySelector("#add-dept-btn").addEventListener("click", () => {
        addDeptForm.classList.toggle("open");
        if (addDeptForm.classList.contains("open")) document.querySelector("#new-dept-name").focus();
      });
      document.querySelector("#cancel-new-dept").addEventListener("click", () => {
        addDeptForm.classList.remove("open");
        document.querySelector("#new-dept-name").value = "";
      });
      const saveNewDept = () => {
        const name = document.querySelector("#new-dept-name").value.trim();
        if (!name) { document.querySelector("#new-dept-name").focus(); return; }
        addDepartment(name);
        document.querySelector("#new-dept-name").value = "";
        addDeptForm.classList.remove("open");
      };
      document.querySelector("#save-new-dept").addEventListener("click", saveNewDept);
      document.querySelector("#new-dept-name").addEventListener("keydown", (e) => {
        if (e.key === "Enter") saveNewDept();
      });

      orgTree.addEventListener("dragover", allowDrop);
      orgTree.addEventListener("drop", (event) => {
        if (event.target.closest(".profile-card")) return;
        event.preventDefault();
        const id = readDraggedId(event);
        if (id) placeAtRoot(id);
      });

      // Start with an empty chart — everyone appears in the sidebar
      // for the user to drag onto the canvas.
      render();
      autoFitTree();
      setupNavigation();

      function autoFitTree() {
        requestAnimationFrame(() => {
          const panel = document.querySelector(".map-panel");
          const tree = document.querySelector("#org-tree");
          if (!panel || !tree) return;
          const availWidth = panel.clientWidth - 40;
          const naturalWidth = tree.scrollWidth;
          if (naturalWidth > availWidth) {
            const scale = Math.max(0.45, Math.floor((availWidth / naturalWidth) * 20) / 20);
            setTweak("scale", scale);
          }
        });
      }

      const tabLabels = { "overview": "Overview", "issues": "Issues", "org-map": "Org Chart Mapper", "contacts": "Contacts" };

      function setupNavigation() {
        const navItems = document.querySelectorAll(".nav-item[data-nav]");
        const views = document.querySelectorAll(".stage-view[data-view]");
        const topbarSubtitle = document.querySelector("#topbar-subtitle");
        navItems.forEach((item) => {
          item.addEventListener("click", () => {
            const target = item.dataset.nav;
            navItems.forEach((n) => n.classList.toggle("active", n === item));
            views.forEach((v) => { v.hidden = v.dataset.view !== target; });
            if (topbarSubtitle) topbarSubtitle.textContent = tabLabels[target] || target;
            closeIssueDetail();
            if (target === "overview") renderOverview();
            else if (target === "issues") renderIssues();
            else if (target === "contacts") renderContactsList();
          });
        });
      }

      function renderOverview() {
        const container = document.querySelector("#overview-content");
        if (!container) return;
        const arr = accountMetrics.currentArr ? formatCurrency(accountMetrics.currentArr) : "—";
        const health = accountMetrics.healthScore != null ? \`\${accountMetrics.healthScore}\` : "—";
        const healthSub = accountMetrics.healthTrend
          ? \`At risk · \${accountMetrics.healthTrend}\`
          : (accountMetrics.sentiment === "at_risk" ? "At risk" : "On track");
        const renewal = accountMetrics.renewalDate ? \`Renewal \${formatDate(accountMetrics.renewalDate)}\` : "—";
        const seats = accountMetrics.seatCount != null ? String(accountMetrics.seatCount) : "—";
        const seatTier = accountMetrics.seatTier || "";
        const lifecycle = accountMetrics.lifecycle || "—";
        const lifecycleSub = accountMetrics.lifecycleSub || "";
        const riskSignals = accountMetrics.riskSignals || [];
        const upsellSignals = accountMetrics.upsellSignals || [];
        const recentActivity = accountMetrics.recentActivity || [];

        const riskItems = riskSignals.map((s) => {
          const label = typeof s === "string" ? s : s.label;
          const detail = typeof s === "string" ? "" : (s.detail || "");
          return \`<div class="signal-item"><span class="signal-dot risk"></span><div><span class="signal-label">\${escapeHtml(label)}</span>\${detail ? \`<span class="signal-detail"> · \${escapeHtml(detail)}</span>\` : ""}</div></div>\`;
        }).join("");

        const upsellItems = upsellSignals.map((s) => {
          const label = typeof s === "string" ? s : s.label;
          const detail = typeof s === "string" ? "" : (s.detail || "");
          return \`<div class="signal-item"><span class="signal-dot upsell"></span><div><span class="signal-label">\${escapeHtml(label)}</span>\${detail ? \`<span class="signal-detail"> · \${escapeHtml(detail)}</span>\` : ""}</div></div>\`;
        }).join("");

        const activityItems = recentActivity.map((a) => {
          const when = a.when ? timeAgoShort(a.when) : "";
          const parts = [when, a.type, a.status].filter(Boolean);
          return \`<div class="activity-item"><span class="activity-dot"></span><div><div class="activity-text">\${escapeHtml(a.text)}</div><div class="activity-meta">\${escapeHtml(parts.join(" · "))}</div></div></div>\`;
        }).join("");

        container.innerHTML = \`
          <div class="overview-cards">
            <div class="overview-card">
              <div class="overview-card-label">Current ARR</div>
              <div class="overview-card-value">\${escapeHtml(arr)}</div>
              <div class="overview-card-sub">\${escapeHtml(renewal)}</div>
            </div>
            <div class="overview-card">
              <div class="overview-card-label">Health</div>
              <div class="overview-card-value">\${escapeHtml(health)}<small>/10</small></div>
              <div class="overview-card-sub at-risk">\${escapeHtml(healthSub)}</div>
            </div>
            <div class="overview-card">
              <div class="overview-card-label">Seats</div>
              <div class="overview-card-value">\${escapeHtml(seats)}</div>
              <div class="overview-card-sub">\${escapeHtml(seatTier)}</div>
            </div>
            <div class="overview-card">
              <div class="overview-card-label">Lifecycle</div>
              <div class="overview-card-value" style="font-size:20px;font-weight:700">\${escapeHtml(lifecycle)}</div>
              <div class="overview-card-sub">\${escapeHtml(lifecycleSub)}</div>
            </div>
          </div>
          \${(riskItems || upsellItems) ? \`
          <div class="overview-signals">
            \${riskItems ? \`<div class="signal-section"><h2>Risk signals</h2>\${riskItems}</div>\` : ""}
            \${upsellItems ? \`<div class="signal-section"><h2>Upsell signals</h2>\${upsellItems}</div>\` : ""}
          </div>\` : ""}
          \${activityItems ? \`
          <div class="overview-activity">
            <h2>Recent activity</h2>
            \${activityItems}
          </div>\` : ""}
        \`;
      }

      function timeAgoShort(iso) {
        try {
          const d = new Date(iso);
          const days = Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
          if (days === 0) return "Today";
          if (days === 1) return "1 day ago";
          if (days < 7) return \`\${days} days ago\`;
          if (days < 14) return "1 week ago";
          const months = Math.round(days / 30);
          if (months < 2) return "1 month ago";
          return \`\${months} months ago\`;
        } catch { return ""; }
      }

      function renderIssues() {
        const container = document.querySelector("#issues-content");
        if (!container) return;
        if (!issues.length) {
          container.innerHTML = '<div style="padding:32px;text-align:center;color:var(--muted)">No issues yet for this account.</div>';
          return;
        }
        container.innerHTML = issues.map((issue) => {
          const requesterName = issue.requester?.name || "Unknown";
          const requesterTitle = issue.requester?.title || "";
          const ago = issue.createdAt ? daysAgoLabel(issue.createdAt) : "";
          const state = (issue.state || "open").toLowerCase().replace(/_/g, "-");
          const stateLabel = state.replace(/-/g, " ").toUpperCase();
          const assigneeInitials = initials(issue.assignee?.name || "—");
          return \`<div class="issue-row" data-issue-id="\${escapeAttr(issue.id)}" style="cursor:pointer;">
            <div class="issue-num">#\${escapeHtml(String(issue.number || ""))}</div>
            <div>
              <div class="issue-title">\${escapeHtml(issue.title || "Untitled")}</div>
              <div class="issue-meta">Raised by \${escapeHtml(requesterName)}\${requesterTitle ? " · " + escapeHtml(requesterTitle) : ""}\${ago ? " · " + ago : ""}</div>
            </div>
            <div class="issue-state-pill \${state}">\${escapeHtml(stateLabel)}</div>
            <div class="issue-assignee" title="\${escapeAttr(issue.assignee?.name || "Unassigned")}">\${assigneeInitials}</div>
          </div>\`;
        }).join("");
        container.querySelectorAll(".issue-row").forEach((row) => {
          row.addEventListener("click", () => openIssueDetail(row.dataset.issueId));
        });
      }

      function openIssueDetail(id) {
        const issue = issues.find((i) => i.id === id);
        const panel = document.querySelector("#issue-detail-panel");
        if (!issue || !panel) return;
        document.querySelectorAll(".issue-row").forEach((r) => r.classList.toggle("active", r.dataset.issueId === id));
        const state = (issue.state || "open").toLowerCase().replace(/_/g, "-");
        const stateLabel = state.replace(/-/g, " ").toUpperCase();
        const requesterName = issue.requester?.name || "Unknown";
        const requesterTitle = issue.requester?.title || "";
        const ago = issue.createdAt ? daysAgoLabel(issue.createdAt) : "";
        const raisedBy = [requesterName, requesterTitle, ago].filter(Boolean).join(" · ");
        const issueMessages = messages.filter((m) => m.issueId === issue.id);
        const priority = issue.priority ? issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1) : "—";
        const severity = issue.severity ? issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1) : "—";
        const tags = (issue.tags || []).map((t) => \`<span class="issue-tag">\${escapeHtml(t)}</span>\`).join("");

        const convoHtml = issueMessages.map((msg) => {
          const authorName = msg.author?.name || "Unknown";
          const msgAgo = msg.createdAt ? daysAgoLabel(msg.createdAt) : "";
          return \`<div class="issue-convo-msg \${msg.isInternal ? "internal" : "external"}">
            <div class="issue-convo-author">
              <span class="issue-convo-avatar">\${initials(authorName)}</span>
              <span class="issue-convo-name">\${escapeHtml(authorName)}</span>
              \${msg.isInternal ? '<span class="issue-convo-internal-badge">Internal</span>' : ""}
              <span class="issue-convo-time">\${escapeHtml(msgAgo)}</span>
            </div>
            <div class="issue-convo-body">\${escapeHtml(msg.bodyText || "")}</div>
          </div>\`;
        }).join("");

        panel.innerHTML = \`
          <div class="issue-detail-head">
            <div>
              <div class="issue-detail-num">#\${escapeHtml(String(issue.number || ""))}</div>
              <div class="issue-detail-title">\${escapeHtml(issue.title || "Untitled")}</div>
            </div>
            <button type="button" class="close-btn" id="close-issue-detail">×</button>
          </div>
          <div class="issue-detail-status-row">
            <span class="issue-state-pill \${state}">\${escapeHtml(stateLabel)}</span>
            <span class="issue-detail-raised">Raised by \${escapeHtml(raisedBy)}</span>
          </div>
          \${issue.bodyText ? \`<div class="issue-detail-section"><h3>Description</h3><div class="issue-detail-body">\${escapeHtml(issue.bodyText)}</div></div>\` : ""}
          <div class="issue-detail-section">
            <h3>Properties</h3>
            <div class="issue-detail-props">
              \${issue.assignee ? \`<div class="issue-prop-row"><span class="issue-prop-label">Owner</span><span class="issue-prop-value">\${escapeHtml(issue.assignee.name)}</span></div>\` : ""}
              <div class="issue-prop-row"><span class="issue-prop-label">Priority</span><span class="issue-prop-value">\${escapeHtml(priority)}</span></div>
              <div class="issue-prop-row"><span class="issue-prop-label">Severity</span><span class="issue-prop-value">\${escapeHtml(severity)}</span></div>
              <div class="issue-prop-row"><span class="issue-prop-label">Reporter</span><span class="issue-prop-value">\${escapeHtml(requesterName)}</span></div>
              \${tags ? \`<div class="issue-prop-row"><span class="issue-prop-label">Tags</span><div class="issue-tags">\${tags}</div></div>\` : ""}
            </div>
          </div>
          \${issueMessages.length ? \`<div class="issue-detail-section"><h3>Conversation</h3><div class="issue-convo-list">\${convoHtml}</div></div>\` : ""}
        \`;
        panel.classList.add("open");
        panel.querySelector("#close-issue-detail").addEventListener("click", closeIssueDetail);
      }

      function closeIssueDetail() {
        const panel = document.querySelector("#issue-detail-panel");
        if (panel) panel.classList.remove("open");
        document.querySelectorAll(".issue-row").forEach((r) => r.classList.remove("active"));
      }

      function renderContactsList() {
        const container = document.querySelector("#contacts-content");
        if (!container) return;
        if (!people.length) {
          container.innerHTML = '<div style="padding:32px;text-align:center;color:var(--muted)">No contacts yet for this account.</div>';
          return;
        }
        container.innerHTML = people.map((person) => \`<div class="contact-row" data-person-id="\${escapeAttr(person.id)}">
          <div class="contact-row-photo">\${initials(person.name)}</div>
          <div>
            <div class="contact-row-name">\${escapeHtml(person.name)}</div>
            <div class="contact-row-title">\${escapeHtml(person.title || "")}</div>
          </div>
          <div class="contact-row-email">\${escapeHtml(person.email || person.source || "")}</div>
          <div class="issue-state-pill \${(person.relationship || "").toLowerCase().includes("blocker") ? "open" : "logged"}">\${escapeHtml((person.relationship || "—").split(" ")[0])}</div>
        </div>\`).join("");
        container.querySelectorAll(".contact-row").forEach((row) => {
          row.addEventListener("click", () => openContactDetails(row.dataset.personId));
        });
      }

      function daysAgoLabel(iso) {
        try {
          const d = new Date(iso);
          const days = Math.max(0, Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
          if (days === 0) return "today";
          if (days === 1) return "1 day ago";
          return \`\${days} days ago\`;
        } catch {
          return "";
        }
      }

      function render() {
        renderContacts();
        renderTree();
        renderConnections();
        scheduleChartStateSave();
      }

      function renderConnections() {
        const list = document.querySelector("#connections-list");
        if (!list) return;
        if (!state.connections.length) {
          list.innerHTML = '<div class="connections-empty">No saved connections yet. Click "Make a connection" above the chart to draft one.</div>';
          return;
        }
        const EMAIL_PREVIEW = 220;
        list.innerHTML = state.connections.map((conn) => {
          const from = peopleById.get(conn.fromId);
          const to = peopleById.get(conn.toId);
          const fromName = from?.name || "Unknown";
          const toName = to?.name || "Unknown";
          const email = conn.email || "";
          const truncated = email.length > EMAIL_PREVIEW;
          const preview = truncated ? email.slice(0, EMAIL_PREVIEW) + "…" : email;
          return \`
            <div class="connection-item" data-conn-id="\${escapeHtml(conn.id)}">
              <div class="connection-item-head">
                <span class="connection-item-from">\${escapeHtml(fromName)}</span>
                <span class="connection-item-arrow">→</span>
                <span class="connection-item-to">\${escapeHtml(toName)}</span>
                <button type="button" class="connection-item-delete" data-conn-delete="\${escapeHtml(conn.id)}" title="Delete">×</button>
              </div>
              \${email ? \`<div class="connection-item-email">\${escapeHtml(preview)}</div>\` : ""}
              \${truncated ? \`<button type="button" class="connection-item-toggle" data-conn-toggle="\${escapeHtml(conn.id)}">Show full email</button>\` : ""}
            </div>
          \`;
        }).join("");
        list.querySelectorAll("[data-conn-delete]").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const id = btn.getAttribute("data-conn-delete");
            state.connections = state.connections.filter((c) => c.id !== id);
            render();
          });
        });
        list.querySelectorAll("[data-conn-toggle]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-conn-toggle");
            const conn = state.connections.find((c) => c.id === id);
            if (!conn) return;
            const item = btn.closest(".connection-item");
            const emailEl = item?.querySelector(".connection-item-email");
            if (item.classList.contains("expanded")) {
              item.classList.remove("expanded");
              emailEl.textContent = conn.email.slice(0, 220) + "…";
              btn.textContent = "Show full email";
            } else {
              item.classList.add("expanded");
              emailEl.textContent = conn.email;
              btn.textContent = "Hide";
            }
          });
        });
      }

      function renderContacts() {
        const placed = placedIds();
        const contactPeople = people.filter((p) => p.type !== "department");
        const deptPeople = people.filter((p) => p.type === "department");
        const placedDepts = deptPeople.filter((d) => placed.has(d.id)).length;
        placedCount.textContent = placed.size - placedDepts;

        peopleList.innerHTML = contactPeople.map((person) => renderContactChip(person, placed.has(person.id))).join("");
        peopleList.querySelectorAll(".contact-chip").forEach((chip) => {
          chip.addEventListener("click", () => openContactDetails(chip.dataset.personId));
          if (chip.getAttribute("aria-disabled") === "true") return;
          chip.addEventListener("dragstart", (event) => startDrag(event, chip.dataset.personId));
          chip.addEventListener("dragend", endDrag);
        });

        const deptList = document.querySelector("#dept-list");
        if (deptList) {
          deptList.innerHTML = deptPeople.map((dept) => renderDeptChip(dept, placed.has(dept.id))).join("");
          deptList.querySelectorAll(".contact-chip").forEach((chip) => {
            if (chip.getAttribute("aria-disabled") === "true") return;
            chip.addEventListener("dragstart", (event) => startDrag(event, chip.dataset.personId));
            chip.addEventListener("dragend", endDrag);
          });
          deptList.querySelectorAll(".dept-rename-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
              e.stopPropagation();
              e.preventDefault();
              const id = btn.dataset.personId;
              const dept = peopleById.get(id);
              if (!dept) return;
              const chip = btn.closest(".contact-chip");
              const nameEl = chip.querySelector(".contact-name");
              const input = document.createElement("input");
              input.type = "text";
              input.value = dept.name;
              input.style.cssText = "border:1px solid var(--primary);border-radius:3px;font:inherit;font-size:13px;font-weight:500;padding:1px 4px;width:100%;outline:none;background:#fff;";
              nameEl.replaceWith(input);
              input.focus();
              input.select();
              let saved = false;
              const finish = (save) => {
                if (saved) return;
                saved = true;
                if (save && input.value.trim()) renameDepartment(id, input.value);
                else render();
              };
              input.addEventListener("keydown", (ev) => {
                if (ev.key === "Enter") { ev.preventDefault(); finish(true); }
                if (ev.key === "Escape") finish(false);
              });
              input.addEventListener("blur", () => finish(true));
            });
          });
          deptList.querySelectorAll(".dept-delete-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
              e.stopPropagation();
              e.preventDefault();
              deleteDepartment(btn.dataset.personId);
            });
          });
        }
      }

      function renderTree() {
        if (!state.roots.length) {
          orgTree.innerHTML = '<div class="empty-state">Drag a contact from the right sidebar to start the org chart.</div>';
          return;
        }

        orgTree.innerHTML = state.roots.map((id) => renderTreeNode(id)).join("");
        orgTree.querySelectorAll(".profile-card, .dept-card").forEach((card) => {
          card.addEventListener("click", (event) => {
            if (event.target.closest("button")) return;
            if (!card.classList.contains("dept-card")) openContactDetails(card.dataset.personId);
          });
          card.addEventListener("dragstart", (event) => startDrag(event, card.dataset.personId));
          card.addEventListener("dragend", endDrag);
          card.addEventListener("dragover", (event) => {
            allowDrop(event);
            const rect = card.getBoundingClientRect();
            const isTop = event.clientY < rect.top + rect.height / 2;
            card.classList.toggle("drop-above", isTop);
            card.classList.toggle("drop-below", !isTop);
          });
          card.addEventListener("dragleave", (event) => {
            if (!card.contains(event.relatedTarget)) {
              card.classList.remove("drop-above", "drop-below");
            }
          });
          card.addEventListener("drop", (event) => {
            event.preventDefault();
            event.stopPropagation();
            const isAbove = card.classList.contains("drop-above");
            card.classList.remove("drop-above", "drop-below");
            const id = readDraggedId(event);
            const targetId = card.dataset.personId;
            if (!id || id === targetId) return;
            if (isDescendant(targetId, id)) return;
            if (isAbove) {
              placeAbove(id, targetId);
            } else {
              placeUnder(id, targetId);
            }
          });
        });
        orgTree.querySelectorAll(".remove").forEach((button) => {
          button.addEventListener("click", (event) => {
            event.stopPropagation();
            removeFromChart(button.dataset.personId);
            render();
          });
        });
        orgTree.querySelectorAll(".title-chip").forEach((chip) => {
          chip.addEventListener("click", (event) => {
            event.stopPropagation();
            startTitleEdit(chip);
          });
        });
        orgTree.querySelectorAll(".profile-card-name[data-person-id]").forEach((nameEl) => {
          nameEl.addEventListener("click", (event) => {
            event.stopPropagation();
            startNameEdit(nameEl);
          });
        });
      }

      function renderDeptChip(dept, isPlaced) {
        return \`<article class="contact-chip" draggable="\${!isPlaced}" data-person-id="\${escapeAttr(dept.id)}" aria-disabled="\${isPlaced}">
          <div class="contact-photo dept-photo">\${DEPT_ICON_SVG}</div>
          <div>
            <div class="contact-name">\${escapeHtml(dept.name)}</div>
            \${isPlaced ? \`<div class="contact-meta" style="font-size:11px">In map</div>\` : ""}
          </div>
          <div class="dept-chip-actions">
            <button type="button" class="dept-action-btn dept-rename-btn" data-person-id="\${escapeAttr(dept.id)}" title="Rename" draggable="false">✎</button>
            <button type="button" class="dept-action-btn dept-delete-btn" data-person-id="\${escapeAttr(dept.id)}" title="Delete" draggable="false">×</button>
          </div>
        </article>\`;
      }

      function addDepartment(name) {
        const trimmed = name.trim();
        if (!trimmed) return;
        const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "_");
        const id = "dept_" + slug + "_" + Date.now();
        const dept = { id, name: trimmed, type: "department" };
        people.push(dept);
        peopleById.set(id, dept);
        render();
      }

      function renameDepartment(id, newName) {
        const trimmed = newName.trim();
        if (!trimmed) return;
        const dept = peopleById.get(id);
        if (!dept) return;
        dept.name = trimmed;
        render();
      }

      function deleteDepartment(id) {
        const children = state.childrenById[id] || [];
        const parentId = Object.keys(state.childrenById).find((pid) => (state.childrenById[pid] || []).includes(id));
        if (parentId) {
          state.childrenById[parentId] = state.childrenById[parentId].filter((c) => c !== id);
          children.forEach((childId) => state.childrenById[parentId].push(childId));
        } else {
          children.forEach((childId) => { if (!state.roots.includes(childId)) state.roots.push(childId); });
        }
        state.roots = state.roots.filter((r) => r !== id);
        delete state.childrenById[id];
        const idx = people.findIndex((p) => p.id === id);
        if (idx !== -1) people.splice(idx, 1);
        peopleById.delete(id);
        render();
      }

      function renderContactChip(person, isPlaced) {
        return \`<article class="contact-chip" draggable="\${!isPlaced}" data-person-id="\${escapeAttr(person.id)}" aria-disabled="\${isPlaced}">
          <div class="contact-photo">\${initials(person.name)}</div>
          <div>
            <div class="contact-name">\${escapeHtml(person.name)}</div>
            <div class="contact-meta">\${escapeHtml(person.title)}</div>
            <div class="badges">
              <span class="badge \${relationshipClass(person.relationship)}">\${escapeHtml(person.relationship)}</span>
              <span class="badge neutral">\${escapeHtml(isPlaced ? "In map" : person.buyingRole)}</span>
            </div>
          </div>
        </article>\`;
      }

      function renderTreeNode(id) {
        const person = peopleById.get(id);
        if (!person) return "";
        const children = state.childrenById[id] || [];

        if (person.type === "department") {
          return \`<div class="tree-node \${children.length ? "has-children" : ""}">
            <article class="profile-card" draggable="true" data-person-id="\${escapeAttr(id)}" data-in-tree="1">
              <button type="button" class="remove ghost" data-person-id="\${escapeAttr(id)}" aria-label="Remove \${escapeAttr(person.name)}">×</button>
              <div class="profile-card-photo dept-photo">\${DEPT_ICON_SVG}</div>
              <div class="profile-card-info">
                <div class="profile-card-name">\${escapeHtml(person.name)}</div>
              </div>
            </article>
            \${children.length ? \`<div class="children">\${children.map((childId) => renderTreeNode(childId)).join("")}</div>\` : ""}
          </div>\`;
        }

        const linkedinUrl = state.linkedinById[id] || "";
        const sentiment = person.aiFields?.sentiment || "";
        const sentimentTitle = sentiment ? \`AI sentiment: \${sentiment}\${person.aiFields?.sentimentReason ? " — " + person.aiFields.sentimentReason : ""}\` : "";
        const connectionCount = state.connections.filter((c) => c.fromId === id || c.toId === id).length;
        const isKey = ["Champion / coach", "Decision maker", "Research lead"].includes(person.relationship);
        const displayTitle = state.customTitles[id] || person.title;
        const displayName = state.customNames[id] || person.name;
        const reportsCount = children.length;
        const role = extractRole(displayTitle);
        return \`<div class="tree-node \${children.length ? "has-children" : ""}">
        <article class="profile-card \${isKey ? "is-key" : ""}" draggable="true" data-person-id="\${escapeAttr(id)}" data-in-tree="1">
          <div class="star-marker" aria-hidden="true"></div>
          \${sentiment ? \`<div class="sentiment-dot \${sentiment}" title="\${escapeAttr(sentimentTitle)}"></div>\` : ""}
          <button type="button" class="remove ghost" data-person-id="\${escapeAttr(id)}" aria-label="Remove \${escapeAttr(displayName)}">×</button>
          <div class="profile-card-photo">\${initials(displayName)}</div>
          <div class="profile-card-info">
            <div class="profile-card-name" data-person-id="\${escapeAttr(id)}" title="Click to edit name">\${escapeHtml(displayName)}</div>
            <button type="button" draggable="false" class="profile-card-title title-chip" data-person-id="\${escapeAttr(id)}" title="Click to edit title">\${escapeHtml(displayTitle)}</button>
            <div class="profile-card-stats">
              <div class="profile-stat" title="Direct reports in this chart">
                <div class="profile-stat-icon purple">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <rect x="5.5" y="1" width="5" height="4" rx="1" stroke="currentColor" stroke-width="1.5"/>
                    <rect x="1" y="11" width="5" height="4" rx="1" stroke="currentColor" stroke-width="1.5"/>
                    <rect x="10" y="11" width="5" height="4" rx="1" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M8 5.5v3M3.5 8.5h9M3.5 8.5v2.5M12.5 8.5v2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </div>
                <div class="profile-stat-value">\${reportsCount}</div>
                <div class="profile-stat-label">Reports</div>
              </div>
              <div class="profile-stat" title="\${escapeAttr(role || "Role")}">
                <div class="profile-stat-icon blue">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <rect x="2" y="5" width="12" height="9" rx="1" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M6 5V3.5h4V5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M2 9h12" stroke="currentColor" stroke-width="1.5"/>
                  </svg>
                </div>
                <div class="profile-stat-value">\${escapeHtml(role || "—")}</div>
                <div class="profile-stat-label">Role</div>
              </div>
            </div>
            \${connectionCount ? \`<div class="connection-pill">↔ \${connectionCount} connection\${connectionCount > 1 ? "s" : ""}</div>\` : ""}
            \${linkedinUrl ? \`<a href="\${escapeAttr(linkedinUrl)}" target="_blank" rel="noopener" class="card-linkedin" draggable="false" title="Open LinkedIn profile" onclick="event.stopPropagation()">in</a>\` : ""}
          </div>
        </article>
        \${children.length ? \`<div class="children">\${children.map((childId) => renderTreeNode(childId)).join("")}</div>\` : ""}
        </div>\`;
      }

      function extractRole(title) {
        const t = (title || "").trim();
        const match = t.match(/\\b(CEO|CFO|CTO|COO|CRO|CMO|CSO|CIO|SVP|EVP|VP|Senior\\s+Director|Director|Senior\\s+Manager|Manager|Lead|Head|President|Chief|Founder|Partner|Principal|Architect)\\b/i);
        if (match) {
          const word = match[1].replace(/\\s+/g, " ");
          return /^[A-Z]+$/.test(word) ? word : word.replace(/\\b\\w/g, (c) => c.toUpperCase());
        }
        return (t.split(/\\s+/)[0] || "").substring(0, 12);
      }

      function extractDepartment(title) {
        const t = (title || "").trim();
        const cleaned = t.replace(/^(CEO|CFO|CTO|COO|CRO|CMO|CSO|CIO|SVP|EVP|VP|Senior\\s+Director|Director|Senior\\s+Manager|Manager|Lead|Head|President|Chief|Founder|Partner|Principal|Architect)\\b\\s*(of\\s+)?/i, "").trim();
        return cleaned;
      }

      async function openContactDetails(id) {
        const person = peopleById.get(id);
        if (!person) return;
        state.activeNoteId = id;
        markActiveContact(id);
        notesName.textContent = person.name;
        notesTitle.textContent = \`\${person.title} · \${person.source}\`;
        notesInput.value = state.notesById[id] || "";
        linkedinInput.value = state.linkedinById[id] || "";
        notesPanel.classList.add("open");
        appShell.classList.add("notes-open");
        if (viewProfileLink) {
          const params = new URLSearchParams(window.location.search);
          if (accountId && !params.get("account_id")) params.set("account_id", accountId);
          params.set("contact_id", person.id || "");
          params.set("name", person.name || "");
          params.set("source", person.source || "");
          if (person.email) params.set("email", person.email);
          viewProfileLink.href = \`/preview/contact?\${params.toString()}\`;
          viewProfileLink.style.display = "inline";
        }
        detailStatus.textContent = "Loading Pylon contact details...";
        detailContent.innerHTML = renderLocalContactSummary(person);

        if (contactDetailCache.has(id)) {
          renderContactDetail(contactDetailCache.get(id));
          return;
        }

        try {
          const detail = await loadContactDetails(person);
          contactDetailCache.set(id, detail);
          if (state.activeNoteId === id) renderContactDetail(detail);
        } catch (error) {
          if (state.activeNoteId !== id) return;
          detailStatus.textContent = "Could not load contact detail.";
          detailContent.innerHTML = \`<div class="detail-section"><div class="field-row"><span>Error</span><strong>\${escapeHtml(error.message)}</strong></div></div>\`;
        }
      }

      function closeNotes() {
        state.activeNoteId = null;
        markActiveContact("");
        notesPanel.classList.remove("open");
        appShell.classList.remove("notes-open");
        if (viewProfileLink) viewProfileLink.style.display = "none";
      }

      async function loadContactDetails(person) {
        // Synthesize Pylon-shaped data from the local mock context — this static preview
        // can't reach the live MCP, so we pull from people/customFields/notes locally.
        await new Promise((r) => setTimeout(r, 320)); // pretend network
        return buildPylonContactDetail(person);
      }

      function buildPylonContactDetail(person) {
        const ai = person.aiFields || {};
        const lastCallDate = "Apr 24"; // pretend most recent call
        const nextStepsByPerson = {
          con_mia: [
            { action: "Send export schema doc + walkthrough video", owner: "Dana Lee", due: "May 2" },
            { action: "Confirm renewal pricing guardrails", owner: "Dana Lee", due: "May 9" },
            { action: "Loop in Mia on SSO unblock once issue #4182 lands", owner: "Customer Success", due: "When ready" }
          ],
          con_omar: [
            { action: "Validate ACS URL after CDN cutover", owner: "Omar Silva", due: "Apr 30" },
            { action: "Review SSO migration runbook with TAM", owner: "Dana Lee", due: "May 1" }
          ]
        };
        const gapsByPerson = {
          con_mia: [
            { title: "Custom export schema for Snowflake", description: "Mia needs column-level control before approving rollout. Currently piping through Workato adds 2 days latency.", raisedBy: "Mia Chen", status: "Triaged" },
            { title: "Renewal pricing guardrails in admin", description: "Wants self-service guardrails so finance can preview ARR impact before commit.", raisedBy: "Mia Chen", status: "Logged" }
          ],
          con_omar: [
            { title: "SSO ACS URL must accept multiple values", description: "IT pushed ACS URL change behind CDN; redirects fail intermittently. Needs allow-list, not single value.", raisedBy: "Omar Silva", status: "Planned" },
            { title: "Audit log export for SOC2 evidence", description: "Compliance team asked for monthly audit log dump; current export is gated to admins only.", raisedBy: "Omar Silva", status: "Logged" }
          ]
        };
        const fallbackNextSteps = [
          { action: "Schedule discovery follow-up", owner: "Account team", due: "This week" }
        ];
        const fallbackGaps = [];
        return {
          mode: "demo",
          sourceNote: \`Pulled from Pylon · last call \${lastCallDate}\`,
          contact: {
            name: person.name,
            title: person.title,
            email: person.email,
            phone: person.phone || "",
            accountId: person.accountId || accountId || "",
            portalRole: person.buyingRole || "",
            customFields: ai
          },
          aiFields: ai,
          lastCall: { date: lastCallDate, summary: ai.summary || "" },
          pylonNextSteps: nextStepsByPerson[person.id] || fallbackNextSteps,
          pylonGaps: gapsByPerson[person.id] || fallbackGaps,
          links: {
            pylonContact: accountId ? \`https://app.usepylon.com/accounts/\${accountId}\` : "",
            evidence: person.linkedinUrl || ""
          },
          crmFields: [],
          externalIds: [],
          relatedIssues: [],
          recentMessages: [],
          systemWarnings: []
        };
      }

      function renderContactDetail(detail) {
        const contact = detail.contact || {};
        const node = peopleById.get(state.activeNoteId) || {};
        notesName.textContent = contact.name || "Contact details";
        notesTitle.textContent = [contact.title, "Pylon contact"].filter(Boolean).join(" · ");
        detailStatus.textContent = detail.sourceNote || "";
        detailContent.innerHTML = [
          renderSentimentBlock(node.aiFields, contact.customFields),
          renderPylonNextSteps(detail.pylonNextSteps, detail.lastCall),
          renderPylonGaps(detail.pylonGaps),
          detailSection("Profile", [
            ["Email", contact.email],
            ["Phone", contact.phone],
            ["Channel", pylonSlackChannel(accountName)],
            ["Portal role", contact.portalRole]
          ]),
          detailSection("Links", [
            ["Pylon", detail.links?.pylonContact],
            ["Evidence", detail.links?.evidence]
          ]),
          detail.crmFields?.length ? detailSection("CRM Fields", detail.crmFields.map((field) => [field.label, field.value])) : "",
          detail.externalIds?.length ? listSection("External IDs", detail.externalIds.map((item) => ({
            title: item.label || item.source || "External ID",
            body: item.external_id || item.id || ""
          }))) : "",
          detail.relatedIssues?.length ? listSection("Related Pylon Issues", detail.relatedIssues.map((issue) => ({
            title: issue.number ? \`#\${issue.number} · \${issue.title}\` : issue.title,
            body: [issue.state, issue.priority, issue.updatedAt].filter(Boolean).join(" · "),
            url: issue.url
          }))) : "",
          detail.recentMessages?.length ? listSection("Recent Activity", detail.recentMessages.map((message) => ({
            title: [message.author?.name, message.isInternal ? "Internal" : "Customer"].filter(Boolean).join(" · "),
            body: message.bodyText
          }))) : "",
          detail.systemWarnings?.length ? listSection("Warnings", detail.systemWarnings.map((warning) => ({
            title: "System",
            body: warning
          }))) : ""
        ].join("");
      }

      // Map raw sentiment to the four canonical pill labels.
      function pylonSentimentBucket(aiFields, customFields) {
        const fields = aiFields || {};
        const cf = customFields || {};
        const raw = (cf.sentiment_label || cf.ai_sentiment || cf.sentiment || fields.sentiment || "").toString().toLowerCase();
        const reason = (fields.sentimentReason || cf.low_sentiment_reason || cf.sentiment || "").toString().toLowerCase();
        const text = \`\${raw} \${reason}\`;
        if (/champion/.test(text)) return "champion";
        if (/block|risk|frustrat|angry|stalled/.test(text)) return "blocker";
        if (/caution|hesitant|mixed|neutral/.test(text)) return "cautious";
        if (/positive|engag|interested|happy|strong|excited/.test(text)) return "engaged";
        return raw ? "cautious" : "";
      }

      function renderSentimentBlock(aiFields, customFields) {
        const bucket = pylonSentimentBucket(aiFields, customFields);
        if (!bucket) return "";
        const label = bucket.charAt(0).toUpperCase() + bucket.slice(1);
        const reason = (aiFields?.sentimentReason || aiFields?.summary || customFields?.low_sentiment_reason || customFields?.ai_summary || "").toString();
        return \`<section class="ai-section">
          <div class="ai-section-head">
            <h3>Sentiment</h3>
            <span class="ai-tag" title="Auto-classified by Pylon">AI</span>
          </div>
          <div class="sentiment-pill-row">
            <select class="sentiment-pill-select \${escapeAttr(bucket)}" data-sentiment-bucket>
              <option value="engaged" \${bucket === "engaged" ? "selected" : ""}>Engaged</option>
              <option value="cautious" \${bucket === "cautious" ? "selected" : ""}>Cautious</option>
              <option value="blocker" \${bucket === "blocker" ? "selected" : ""}>Blocker</option>
              <option value="champion" \${bucket === "champion" ? "selected" : ""}>Champion</option>
            </select>
            <span class="muted">Auto-classified · editable</span>
          </div>
          \${reason ? \`<div class="ai-row"><span>Why</span>\${escapeHtml(reason)}</div>\` : ""}
        </section>\`;
      }

      function renderPylonNextSteps(nextSteps, lastCall) {
        if (!nextSteps?.length) return "";
        const meta = lastCall?.date ? \`From last call · \${escapeHtml(lastCall.date)}\` : "From Pylon";
        return \`<section class="detail-section pylon-section">
          <div class="ai-section-head">
            <h3>Next Steps</h3>
            <span class="pylon-tag" title="Sourced from Pylon MCP">Pylon</span>
          </div>
          <div class="muted pylon-meta">\${meta}</div>
          <ul class="next-step-list">
            \${nextSteps.map((step) => \`
              <li class="next-step-item">
                <div class="next-step-action">\${escapeHtml(step.action || "")}</div>
                <div class="next-step-meta">
                  \${step.owner ? \`<span class="next-step-owner">\${escapeHtml(step.owner)}</span>\` : ""}
                  \${step.due ? \`<span class="next-step-due">Due \${escapeHtml(step.due)}</span>\` : ""}
                </div>
              </li>\`).join("")}
          </ul>
        </section>\`;
      }

      function renderPylonGaps(gaps) {
        if (!gaps?.length) return "";
        return \`<section class="detail-section pylon-section">
          <div class="ai-section-head">
            <h3>Gaps · Feature Requests</h3>
            <span class="pylon-tag" title="Sourced from Pylon MCP">Pylon</span>
          </div>
          <div class="gap-list">
            \${gaps.map((gap) => \`
              <div class="gap-item">
                <div class="gap-head">
                  <strong class="gap-title">\${escapeHtml(gap.title || "")}</strong>
                  \${gap.status ? \`<span class="gap-status \${escapeAttr(gap.status.toLowerCase())}">\${escapeHtml(gap.status)}</span>\` : ""}
                </div>
                \${gap.description ? \`<div class="gap-description">\${escapeHtml(gap.description)}</div>\` : ""}
                \${gap.raisedBy ? \`<div class="gap-attribution">Raised by <strong>\${escapeHtml(gap.raisedBy)}</strong></div>\` : ""}
              </div>\`).join("")}
          </div>
        </section>\`;
      }

      function renderAiInsights(aiFields, customFields) {
        const fields = aiFields || {};
        const cf = customFields || {};
        const sentiment = fields.sentiment || "";
        const summary = fields.summary || cf.ai_summary || "";
        const reason = fields.sentimentReason || cf.low_sentiment_reason || "";
        const trend = fields.engagementTrend || cf.engagement_trend || "";
        if (!sentiment && !summary && !reason && !trend) return "";
        const rows = [];
        if (sentiment) {
          const label = sentiment.charAt(0).toUpperCase() + sentiment.slice(1);
          rows.push(\`<div class="ai-row"><span>Sentiment</span><div class="ai-pill \${sentiment}">\${escapeHtml(label)}</div></div>\`);
        }
        if (reason) rows.push(\`<div class="ai-row"><span>Why</span>\${escapeHtml(reason)}</div>\`);
        if (summary) rows.push(\`<div class="ai-row"><span>AI summary</span>\${escapeHtml(summary)}</div>\`);
        if (trend) rows.push(\`<div class="ai-row"><span>Engagement trend</span>\${escapeHtml(trend)}</div>\`);
        return \`<section class="ai-section"><h3>AI Insights</h3>\${rows.join("")}</section>\`;
      }

      function renderLocalContactSummary(person) {
        return detailSection("Selected Contact", [
          ["Name", person.name],
          ["Title", person.title],
          ["Source", person.source],
          ["Relationship", person.relationship],
          ["Buying role", person.buyingRole]
        ]);
      }

      function detailSection(title, rows) {
        const visibleRows = rows.filter(([, value]) => value !== undefined && value !== null && value !== "");
        if (!visibleRows.length) return "";
        return \`<section class="detail-section"><h3>\${escapeHtml(title)}</h3>\${visibleRows.map(([label, value]) => \`
          <div class="field-row"><span>\${escapeHtml(label)}</span><strong>\${renderDetailValue(value)}</strong></div>
        \`).join("")}</section>\`;
      }

      function listSection(title, items) {
        const visibleItems = items.filter((item) => item.title || item.body);
        if (!visibleItems.length) return "";
        return \`<section class="detail-section"><h3>\${escapeHtml(title)}</h3><div class="mini-list">\${visibleItems.map((item) => \`
          <div class="mini-item">
            \${item.url ? \`<a href="\${escapeAttr(item.url)}" target="_blank" rel="noreferrer"><strong>\${escapeHtml(item.title)}</strong></a>\` : \`<strong>\${escapeHtml(item.title)}</strong>\`}
            <div class="muted">\${escapeHtml(item.body || "")}</div>
          </div>
        \`).join("")}</div></section>\`;
      }

      function renderDetailValue(value) {
        if (Array.isArray(value)) return escapeHtml(value.join(", "));
        const text = String(value || "");
        if (/^https?:\\/\\//i.test(text)) {
          return \`<a href="\${escapeAttr(text)}" target="_blank" rel="noreferrer">\${escapeHtml(shortUrl(text))}</a>\`;
        }
        return escapeHtml(text);
      }

      function shortUrl(value) {
        try {
          const url = new URL(value);
          return \`\${url.hostname}\${url.pathname.length > 1 ? url.pathname : ""}\`;
        } catch {
          return value;
        }
      }

      function markActiveContact(id) {
        document.querySelectorAll(".contact-chip.active, .profile-card.active").forEach((node) => node.classList.remove("active"));
        if (!id) return;
        document.querySelectorAll(\`[data-person-id="\${cssEscape(id)}"]\`).forEach((node) => {
          if (node.classList.contains("contact-chip") || node.classList.contains("profile-card")) {
            node.classList.add("active");
          }
        });
      }

      function cssEscape(value) {
        if (window.CSS?.escape) return CSS.escape(value);
        return String(value).replace(/"/g, "\\\\\\"");
      }

      function applySuggestedLayout() {
        state.roots = [];
        state.childrenById = {};
        const contactPeople = people.filter((p) => p.type !== "department");
        if (!contactPeople.length) return;

        const LEVEL_RANK = { "Executive": 0, "VP / Head": 1, "Director / Manager": 2, "Working Team": 3 };
        const sorted = [...contactPeople].sort((a, b) => (LEVEL_RANK[a.level] ?? 4) - (LEVEL_RANK[b.level] ?? 4));

        const topPerson =
          sorted.find((p) => /\b(ceo|chief executive|founder|owner|president)\b/i.test(p.title || "")) ||
          sorted[0];
        if (!topPerson) return;
        state.roots.push(topPerson.id);

        const placed = [topPerson];
        for (const person of sorted) {
          if (person.id === topPerson.id) continue;
          const rank = LEVEL_RANK[person.level] ?? 4;
          const seniors = placed.filter((p) => (LEVEL_RANK[p.level] ?? 4) < rank);
          const parent = domainMatch(person, seniors) || topPerson;
          placeUnder(person.id, parent.id, { renderAfter: false });
          placed.push(person);
        }
      }

      function domainMatch(person, candidates) {
        const personTitle = (person.title || "").toLowerCase();
        const DOMAINS = [
          ["it", "security", "infra", "cto", "ciso", "engineer"],
          ["revenue", "revops", "finance", "cfo", "coo"],
          ["sales", "bdr", "sdr", "account executive"],
          ["product", "design", "ux", "cpo"],
          ["legal", "compliance", "procurement"],
          ["ops", "operations"],
        ];
        const hits = (title) => (words) => words.some((w) => title.includes(w));
        for (const words of DOMAINS) {
          if (hits(personTitle)(words)) {
            const match = candidates.find((c) => hits((c.title || "").toLowerCase())(words));
            if (match) return match;
          }
        }
        return null;
      }

      function placeAtRoot(id) {
        if (!peopleById.has(id)) return;
        detach(id);
        if (!state.roots.includes(id)) state.roots.push(id);
        render();
      }

      function placeUnder(id, parentId, options = { renderAfter: true }) {
        if (!peopleById.has(id) || !peopleById.has(parentId) || id === parentId) return;
        detach(id);
        state.childrenById[parentId] ||= [];
        if (!state.childrenById[parentId].includes(id)) state.childrenById[parentId].push(id);
        if (options.renderAfter) render();
      }

      function placeAbove(id, targetId) {
        if (!peopleById.has(id) || !peopleById.has(targetId) || id === targetId) return;
        if (isDescendant(targetId, id)) return;
        detach(id);
        const targetParent = findParentId(targetId);
        if (targetParent) {
          const siblings = state.childrenById[targetParent];
          const idx = siblings.indexOf(targetId);
          if (idx !== -1) siblings.splice(idx, 1, id);
        } else {
          const idx = state.roots.indexOf(targetId);
          if (idx !== -1) state.roots.splice(idx, 1, id);
          else state.roots.push(id);
        }
        state.childrenById[id] ||= [];
        if (!state.childrenById[id].includes(targetId)) state.childrenById[id].push(targetId);
        render();
      }

      function removeFromChart(id) {
        const descendants = allDescendants(id);
        detach(id);
        delete state.childrenById[id];
        for (const childId of descendants) {
          delete state.childrenById[childId];
          detach(childId);
        }
      }

      function detach(id) {
        state.roots = state.roots.filter((rootId) => rootId !== id);
        for (const [parentId, children] of Object.entries(state.childrenById)) {
          state.childrenById[parentId] = children.filter((childId) => childId !== id);
        }
      }

      function placedIds() {
        const ids = new Set(state.roots);
        for (const rootId of state.roots) collectDescendants(rootId, ids);
        return ids;
      }

      function allDescendants(id) {
        const ids = new Set();
        collectDescendants(id, ids);
        ids.delete(id);
        return [...ids];
      }

      function collectDescendants(id, ids) {
        ids.add(id);
        for (const childId of state.childrenById[id] || []) collectDescendants(childId, ids);
      }

      function isDescendant(candidateId, ancestorId) {
        return allDescendants(ancestorId).includes(candidateId);
      }

      function startDrag(event, id) {
        state.draggingId = id;
        state.draggingFromTree = !!event.currentTarget.dataset.inTree;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", id);
        setDragPreview(event, id);
        event.currentTarget.classList?.add("dragging");
      }

      function setDragPreview(event, id) {
        const person = peopleById.get(id);
        if (!person || !event.dataTransfer?.setDragImage) return;
        const preview = document.createElement("div");
        preview.className = "drag-preview";
        preview.innerHTML = \`<div class="drag-preview-photo">\${initials(person.name)}</div><div class="drag-preview-title">\${escapeHtml(person.title)}</div>\`;
        document.body.appendChild(preview);
        event.dataTransfer.setDragImage(preview, 52, 42);
        requestAnimationFrame(() => preview.remove());
      }

      function endDrag(event) {
        state.draggingId = null;
        state.draggingFromTree = false;
        event.currentTarget.classList?.remove("dragging");
        document.querySelectorAll(".drag-over, .drop-above, .drop-below").forEach((el) =>
          el.classList.remove("drag-over", "drop-above", "drop-below")
        );
      }

      function allowDrop(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }

      function readDraggedId(event) {
        return event.dataTransfer.getData("text/plain") || state.draggingId;
      }

      function findParentId(id) {
        for (const [parentId, children] of Object.entries(state.childrenById)) {
          if (children.includes(id)) return parentId;
        }
        return null;
      }

      function insertRelativeTo(id, targetId, position) {
        detach(id);
        const parentId = findParentId(targetId);
        if (parentId) {
          const siblings = state.childrenById[parentId];
          const idx = siblings.indexOf(targetId);
          siblings.splice(position === "before" ? idx : idx + 1, 0, id);
        } else {
          const idx = state.roots.indexOf(targetId);
          state.roots.splice(position === "before" ? idx : idx + 1, 0, id);
        }
        render();
      }

      function addCustomContact(name, title, buyingRole) {
        const id = "custom_" + Math.random().toString(36).slice(2, 9);
        const person = {
          id, name, title,
          relationship: "Neutral / unknown",
          buyingRole: buyingRole || "Unknown",
          source: "Manual",
          email: "", owner: "", notes: "", level: "Unknown"
        };
        people.push(person);
        peopleById.set(id, person);
        state.notesById[id] = "";
        persistCustomContact(person);
        document.querySelector("#total-count").textContent = people.length;
        render();
      }

      function promotePerson(id) {
        const parentId = findParentId(id);
        if (!parentId) return;
        const grandparentId = findParentId(parentId);
        detach(id);
        if (grandparentId) {
          state.childrenById[grandparentId] ||= [];
          const idx = state.childrenById[grandparentId].indexOf(parentId);
          if (idx !== -1) {
            state.childrenById[grandparentId].splice(idx + 1, 0, id);
          } else {
            state.childrenById[grandparentId].push(id);
          }
        } else {
          const rootIdx = state.roots.indexOf(parentId);
          if (rootIdx !== -1) {
            state.roots.splice(rootIdx + 1, 0, id);
          } else {
            state.roots.push(id);
          }
        }
        render();
      }

      function startTitleEdit(chip) {
        const id = chip.dataset.personId;
        const person = peopleById.get(id);
        if (!person) return;
        const current = state.customTitles[id] || person.title;
        const input = document.createElement("input");
        input.className = "title-chip-input";
        input.value = current;
        chip.replaceWith(input);
        input.focus();
        input.select();
        function commit() {
          const val = input.value.trim();
          if (val) state.customTitles[id] = val;
          render();
        }
        input.addEventListener("blur", commit);
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") { e.preventDefault(); input.blur(); }
          if (e.key === "Escape") { input.removeEventListener("blur", commit); render(); }
        });
      }

      function startNameEdit(nameEl) {
        const id = nameEl.dataset.personId;
        const person = peopleById.get(id);
        if (!person) return;
        const current = state.customNames[id] || person.name;
        const input = document.createElement("input");
        input.style.cssText = "font:inherit;font-size:11px;font-weight:800;border:1px solid #888;border-radius:4px;padding:2px 4px;width:100px;text-align:center;outline:none;";
        input.value = current;
        nameEl.replaceWith(input);
        input.focus();
        input.select();
        function commit() {
          const val = input.value.trim();
          if (val) state.customNames[id] = val;
          render();
        }
        input.addEventListener("blur", commit);
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") { e.preventDefault(); input.blur(); }
          if (e.key === "Escape") { input.removeEventListener("blur", commit); render(); }
        });
      }

      function initials(name) {
        return String(name || "?")
          .split(/\\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0].toUpperCase())
          .join("") || "?";
      }

      function relationshipClass(relationship) {
        if (relationship === "Champion / coach") return "champion";
        if (relationship === "Blocker / risk") return "risk";
        if (relationship === "Decision maker") return "decision";
        if (relationship === "Research lead") return "research";
        return "neutral";
      }

      function escapeHtml(value) {
        return String(value ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      }

      function escapeAttr(value) {
        return escapeHtml(value).replace(/\\\`/g, "&#96;");
      }

      /* ===================== Zoom + Tweaks ===================== */
      const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
        "scale": 1,
        "cardWidth": 168,
        "photoHeight": 138,
        "rowGap": 22,
        "colGap": 24,
        "fontScale": 1,
        "showStats": true,
        "showPhoto": false,
        "photoShape": "arch"
      }/*EDITMODE-END*/;

      const tweakState = { ...TWEAK_DEFAULTS };

      function applyTweaks() {
        const root = document.documentElement;
        const tree = document.getElementById("org-tree");
        if (tree) tree.style.transform = \`scale(\${tweakState.scale})\`;
        root.style.setProperty("--tw-card-w", tweakState.cardWidth + "px");
        root.style.setProperty("--tw-photo-h", tweakState.photoHeight + "px");
        root.style.setProperty("--tw-row-gap", tweakState.rowGap + "px");
        root.style.setProperty("--tw-col-gap", tweakState.colGap + "px");
        root.style.setProperty("--tw-font-scale", String(tweakState.fontScale));
        document.body.classList.toggle("hide-stats", !tweakState.showStats);
        document.body.classList.toggle("hide-photo", !tweakState.showPhoto);
        document.body.classList.toggle("photo-circle", tweakState.photoShape === "circle");
        document.body.classList.toggle("photo-rect", tweakState.photoShape === "rect");
        const zl = document.getElementById("zoom-fit");
        if (zl) zl.textContent = Math.round(tweakState.scale * 100) + "%";
      }

      function setTweak(key, value) {
        tweakState[key] = value;
        applyTweaks();
        try {
          window.parent.postMessage({ type: "__edit_mode_set_keys", edits: { [key]: value } }, "*");
        } catch (_) {}
      }

      // Zoom controls
      const ZOOM_STEP = 0.1;
      const ZOOM_MIN = 0.4;
      const ZOOM_MAX = 2;
      document.getElementById("zoom-in")?.addEventListener("click", () => {
        setTweak("scale", Math.min(ZOOM_MAX, +(tweakState.scale + ZOOM_STEP).toFixed(2)));
      });
      document.getElementById("zoom-out")?.addEventListener("click", () => {
        setTweak("scale", Math.max(ZOOM_MIN, +(tweakState.scale - ZOOM_STEP).toFixed(2)));
      });
      document.getElementById("zoom-fit")?.addEventListener("click", () => {
        setTweak("scale", 1);
      });
      // Ctrl/Cmd + scroll to zoom
      document.querySelector(".map-panel")?.addEventListener("wheel", (e) => {
        if (!(e.ctrlKey || e.metaKey)) return;
        e.preventDefault();
        const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
        setTweak("scale", Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(tweakState.scale + delta).toFixed(2))));
      }, { passive: false });
      // Keyboard shortcuts
      document.addEventListener("keydown", (e) => {
        if (e.target.matches("input, textarea, [contenteditable]")) return;
        if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+")) {
          e.preventDefault();
          setTweak("scale", Math.min(ZOOM_MAX, +(tweakState.scale + ZOOM_STEP).toFixed(2)));
        } else if ((e.ctrlKey || e.metaKey) && e.key === "-") {
          e.preventDefault();
          setTweak("scale", Math.max(ZOOM_MIN, +(tweakState.scale - ZOOM_STEP).toFixed(2)));
        } else if ((e.ctrlKey || e.metaKey) && e.key === "0") {
          e.preventDefault();
          setTweak("scale", 1);
        }
      });

      // ============ Tweaks panel ============
      function buildTweaksPanel() {
        if (document.getElementById("tweaks-panel")) return;
        const wrap = document.createElement("div");
        wrap.id = "tweaks-panel";
        wrap.className = "tweaks-panel";
        wrap.setAttribute("aria-label", "Tweaks");
        wrap.innerHTML = \`
          <header class="tweaks-head">
            <h3>Tweaks</h3>
            <button type="button" class="tweaks-close" aria-label="Close tweaks">×</button>
          </header>
          <div class="tweaks-body">
            <div class="tweak-section">
              <div class="tweak-section-title">Org chart</div>
              <label class="tweak-row">
                <span>Zoom</span>
                <span class="tweak-control">
                  <input type="range" data-tweak="scale" min="0.4" max="2" step="0.05" value="\${tweakState.scale}">
                  <output data-output="scale">\${Math.round(tweakState.scale * 100)}%</output>
                </span>
              </label>
              <label class="tweak-row">
                <span>Card width</span>
                <span class="tweak-control">
                  <input type="range" data-tweak="cardWidth" min="120" max="240" step="4" value="\${tweakState.cardWidth}">
                  <output data-output="cardWidth">\${tweakState.cardWidth}px</output>
                </span>
              </label>
              <label class="tweak-row">
                <span>Photo height</span>
                <span class="tweak-control">
                  <input type="range" data-tweak="photoHeight" min="80" max="200" step="2" value="\${tweakState.photoHeight}">
                  <output data-output="photoHeight">\${tweakState.photoHeight}px</output>
                </span>
              </label>
              <label class="tweak-row">
                <span>Show photo</span>
                <span class="tweak-control">
                  <input type="checkbox" data-tweak="showPhoto" \${tweakState.showPhoto ? "checked" : ""}>
                </span>
              </label>
              <label class="tweak-row">
                <span>Photo shape</span>
                <span class="tweak-segmented" role="radiogroup">
                  <button type="button" data-tweak-radio="photoShape" data-value="arch">Arch</button>
                  <button type="button" data-tweak-radio="photoShape" data-value="circle">Circle</button>
                  <button type="button" data-tweak-radio="photoShape" data-value="rect">Rect</button>
                </span>
              </label>
              <label class="tweak-row">
                <span>Show stats</span>
                <span class="tweak-control">
                  <input type="checkbox" data-tweak="showStats" \${tweakState.showStats ? "checked" : ""}>
                </span>
              </label>
            </div>
            <div class="tweak-section">
              <div class="tweak-section-title">Spacing</div>
              <label class="tweak-row">
                <span>Row gap</span>
                <span class="tweak-control">
                  <input type="range" data-tweak="rowGap" min="12" max="60" step="2" value="\${tweakState.rowGap}">
                  <output data-output="rowGap">\${tweakState.rowGap}px</output>
                </span>
              </label>
              <label class="tweak-row">
                <span>Column gap</span>
                <span class="tweak-control">
                  <input type="range" data-tweak="colGap" min="20" max="100" step="2" value="\${tweakState.colGap}">
                  <output data-output="colGap">\${tweakState.colGap}px</output>
                </span>
              </label>
            </div>
            <div class="tweak-section">
              <div class="tweak-section-title">Type</div>
              <label class="tweak-row">
                <span>UI text scale</span>
                <span class="tweak-control">
                  <input type="range" data-tweak="fontScale" min="0.85" max="1.2" step="0.025" value="\${tweakState.fontScale}">
                  <output data-output="fontScale">\${Math.round(tweakState.fontScale * 100)}%</output>
                </span>
              </label>
            </div>
            <button type="button" class="tweak-reset">Reset</button>
          </div>
        \`;
        document.body.appendChild(wrap);

        wrap.querySelector(".tweaks-close").addEventListener("click", () => {
          wrap.classList.remove("open");
          try { window.parent.postMessage({ type: "__edit_mode_dismissed" }, "*"); } catch (_) {}
        });
        wrap.querySelectorAll("input[type=range]").forEach((input) => {
          input.addEventListener("input", () => {
            const key = input.dataset.tweak;
            const val = parseFloat(input.value);
            setTweak(key, val);
            const out = wrap.querySelector(\`[data-output="\${key}"]\`);
            if (out) {
              if (key === "scale" || key === "fontScale") out.textContent = Math.round(val * 100) + "%";
              else out.textContent = val + "px";
            }
          });
        });
        wrap.querySelectorAll("input[type=checkbox]").forEach((input) => {
          input.addEventListener("change", () => {
            setTweak(input.dataset.tweak, input.checked);
          });
        });
        wrap.querySelectorAll("[data-tweak-radio]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const key = btn.dataset.tweakRadio;
            setTweak(key, btn.dataset.value);
            wrap.querySelectorAll(\`[data-tweak-radio="\${key}"]\`).forEach((b) => b.classList.toggle("active", b.dataset.value === btn.dataset.value));
          });
        });
        // Initial active states for radio
        wrap.querySelectorAll("[data-tweak-radio]").forEach((btn) => {
          btn.classList.toggle("active", tweakState[btn.dataset.tweakRadio] === btn.dataset.value);
        });
        wrap.querySelector(".tweak-reset").addEventListener("click", () => {
          Object.keys(TWEAK_DEFAULTS).forEach((k) => setTweak(k, TWEAK_DEFAULTS[k]));
          // refresh inputs to defaults
          wrap.querySelectorAll("input[type=range]").forEach((i) => {
            i.value = String(TWEAK_DEFAULTS[i.dataset.tweak]);
            const out = wrap.querySelector(\`[data-output="\${i.dataset.tweak}"]\`);
            if (out) {
              const v = TWEAK_DEFAULTS[i.dataset.tweak];
              if (i.dataset.tweak === "scale" || i.dataset.tweak === "fontScale") out.textContent = Math.round(v * 100) + "%";
              else out.textContent = v + "px";
            }
          });
          wrap.querySelectorAll("input[type=checkbox]").forEach((i) => { i.checked = !!TWEAK_DEFAULTS[i.dataset.tweak]; });
          wrap.querySelectorAll("[data-tweak-radio]").forEach((b) => {
            b.classList.toggle("active", TWEAK_DEFAULTS[b.dataset.tweakRadio] === b.dataset.value);
          });
        });
      }

      // Tweaks host integration
      window.addEventListener("message", (event) => {
        const msg = event.data || {};
        if (msg.type === "__activate_edit_mode") {
          buildTweaksPanel();
          document.getElementById("tweaks-panel").classList.add("open");
        } else if (msg.type === "__deactivate_edit_mode") {
          document.getElementById("tweaks-panel")?.classList.remove("open");
        }
      });
      try { window.parent.postMessage({ type: "__edit_mode_available" }, "*"); } catch (_) {}

      // Apply defaults at boot
      applyTweaks();

      // ============ Click-and-drag panning ============
      (function setupMapPan() {
        const mapPanel = document.querySelector(".map-panel");
        if (!mapPanel) return;

        let pan = null;
        const isInteractive = (el) =>
          el && el.closest && (
            el.closest(".profile-card") ||
            el.closest("button") ||
            el.closest("a") ||
            el.closest("input, textarea, [contenteditable]") ||
            el.closest(".zoom-controls") ||
            el.closest(".connection-pill") ||
            el.closest(".tweaks-panel")
          );

        mapPanel.addEventListener("mousedown", (e) => {
          if (e.button !== 0 && e.button !== 1) return;
          if (e.button === 0 && isInteractive(e.target)) return;
          pan = {
            startX: e.clientX,
            startY: e.clientY,
            scrollLeft: mapPanel.scrollLeft,
            scrollTop: mapPanel.scrollTop,
            moved: false
          };
          mapPanel.classList.add("panning");
          e.preventDefault();
        });

        window.addEventListener("mousemove", (e) => {
          if (!pan) return;
          const dx = e.clientX - pan.startX;
          const dy = e.clientY - pan.startY;
          if (!pan.moved && Math.hypot(dx, dy) > 3) pan.moved = true;
          if (pan.moved) {
            mapPanel.scrollLeft = pan.scrollLeft - dx;
            mapPanel.scrollTop = pan.scrollTop - dy;
          }
        });

        window.addEventListener("mouseup", () => {
          if (!pan) return;
          mapPanel.classList.remove("panning");
          pan = null;
        });

        mapPanel.addEventListener("mouseleave", () => {
          // keep pan active when mouse leaves panel; stop on global mouseup
        });

        // Touch panning (single-finger on empty space)
        mapPanel.addEventListener("touchstart", (e) => {
          if (e.touches.length !== 1) return;
          if (isInteractive(e.target)) return;
          const t = e.touches[0];
          pan = {
            startX: t.clientX,
            startY: t.clientY,
            scrollLeft: mapPanel.scrollLeft,
            scrollTop: mapPanel.scrollTop,
            moved: false
          };
        }, { passive: true });

        mapPanel.addEventListener("touchmove", (e) => {
          if (!pan || e.touches.length !== 1) return;
          const t = e.touches[0];
          const dx = t.clientX - pan.startX;
          const dy = t.clientY - pan.startY;
          if (Math.hypot(dx, dy) > 3) {
            mapPanel.scrollLeft = pan.scrollLeft - dx;
            mapPanel.scrollTop = pan.scrollTop - dy;
            pan.moved = true;
          }
        }, { passive: true });

        mapPanel.addEventListener("touchend", () => { pan = null; });
      })();

      // ============ Curved connector lines ============
      (function setupCurvedConnectors() {
        const treeRoot = document.querySelector(".org-tree, .map-panel") || document.body;

        function drawAll() {
          // Account for the #org-tree transform: scale() — getBoundingClientRect()
          // returns post-scale pixels, but svg.style values get scaled again,
          // so we divide deltas by the current scale.
          const tree = document.getElementById("org-tree");
          let zoom = 1;
          if (tree) {
            const m = tree.style.transform.match(/scale\\(([\\d.]+)\\)/);
            if (m) zoom = parseFloat(m[1]) || 1;
          }
          const parents = document.querySelectorAll(".tree-node.has-children");
          parents.forEach((parent) => {
            // Find parent's profile card and direct children's cards
            const parentCard = parent.querySelector(":scope > .profile-card");
            const childrenWrap = parent.querySelector(":scope > .children");
            if (!parentCard || !childrenWrap) return;
            const childNodes = childrenWrap.querySelectorAll(":scope > .tree-node");
            if (!childNodes.length) return;

            // Get or create SVG inside parent (positioned at parent's bottom)
            let svg = parent.querySelector(":scope > svg.connector-svg");
            if (!svg) {
              svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
              svg.setAttribute("class", "connector-svg");
              parent.appendChild(svg);
            }

            const parentRect = parent.getBoundingClientRect();
            const parentCardRect = parentCard.getBoundingClientRect();

            // SVG sized to span from parent bottom edge down to bottom of children wrap
            const svgTopAbs = parentCardRect.bottom;
            // bottom = top of child cards
            let childTopMin = Infinity;
            let childLeftMin = Infinity;
            let childRightMax = -Infinity;
            const childPoints = [];
            childNodes.forEach((cn) => {
              const cc = cn.querySelector(":scope > .profile-card");
              if (!cc) return;
              const r = cc.getBoundingClientRect();
              if (r.top < childTopMin) childTopMin = r.top;
              const cx = r.left + r.width / 2;
              if (r.left < childLeftMin) childLeftMin = r.left;
              if (r.right > childRightMax) childRightMax = r.right;
              childPoints.push({ x: cx, y: r.top });
            });
            if (!childPoints.length) return;

            const parentBottomCenterX = parentCardRect.left + parentCardRect.width / 2;

            const left = Math.min(parentCardRect.left, childLeftMin) - 4;
            const right = Math.max(parentCardRect.right, childRightMax) + 4;
            const widthScaled = right - left;
            const heightScaled = Math.max(childTopMin - svgTopAbs, 1);
            const width = widthScaled / zoom;
            const height = heightScaled / zoom;

            // Position svg relative to parent (.tree-node) — divide by zoom because
            // the svg itself sits inside the scaled #org-tree.
            svg.style.left = ((left - parentRect.left) / zoom) + "px";
            svg.style.top = ((svgTopAbs - parentRect.top) / zoom) + "px";
            svg.setAttribute("width", width);
            svg.setAttribute("height", height);
            svg.setAttribute("viewBox", \`0 0 \${width} \${height}\`);

            // Build curved path for each child (in unscaled coords)
            const px = (parentBottomCenterX - left) / zoom;
            const py = 0;
            const paths = childPoints.map(({ x, y }) => {
              const cx = (x - left) / zoom;
              const cy = (y - svgTopAbs) / zoom;
              // Cubic Bezier: control points pulled toward midline vertically.
              // c1 below parent (downward), c2 above child (downward-curving in)
              const midY = (py + cy) / 2;
              const c1x = px;
              const c1y = midY;
              const c2x = cx;
              const c2y = midY;
              return \`M \${px} \${py} C \${c1x} \${c1y}, \${c2x} \${c2y}, \${cx} \${cy}\`;
            });

            // Single combined path element for perf
            let path = svg.querySelector("path");
            if (!path) {
              path = document.createElementNS("http://www.w3.org/2000/svg", "path");
              svg.appendChild(path);
            }
            path.setAttribute("d", paths.join(" "));
          });
        }

        // Redraw on resize, scroll, zoom changes, and after fonts load
        let raf;
        function schedule() {
          if (raf) return;
          raf = requestAnimationFrame(() => { raf = null; drawAll(); });
        }

        window.addEventListener("resize", schedule);
        // Watch for tweak/zoom changes via mutation on style attribute of .org-canvas
        const canvas = document.querySelector(".org-canvas") || document.body;
        const mo = new MutationObserver(schedule);
        mo.observe(canvas, { attributes: true, attributeFilter: ["style", "class"], subtree: true });
        // Watch body class changes (tweak toggles)
        const bodyMo = new MutationObserver(schedule);
        bodyMo.observe(document.body, { attributes: true, attributeFilter: ["style", "class"] });
        // Watch :root style changes
        const rootMo = new MutationObserver(schedule);
        rootMo.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });

        // Initial passes
        schedule();
        setTimeout(schedule, 100);
        setTimeout(schedule, 400);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);

        // Expose for manual redraw if needed
        window.__redrawConnectors = schedule;
      })();
    </script>
  </body>
</html>`;
}

function metric(label, value, detail) {
  return `<div class="metric">
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(value)}</strong>
    <span>${escapeHtml(detail)}</span>
  </div>`;
}

function suggestedRootIds(nodes) {
  const seniorRoots = nodes.filter((node) => node.level === "Executive" || node.level === "VP / Head");
  if (seniorRoots.length) return seniorRoots.map((node) => node.id);
  const economicBuyer = nodes.find((node) => node.buyingRole === "Economic buyer");
  if (economicBuyer) return [economicBuyer.id];
  const executive = nodes.find((node) => node.level === "Executive" || node.level === "VP / Head");
  if (executive) return [executive.id];
  return nodes[0] ? [nodes[0].id] : [];
}

function yesNo(value) {
  return value ? "✓ Mapped" : "✗ Missing";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
