export function renderOrgMapPreview({ analysis, context = {} }) {
  const peopleJson = JSON.stringify(analysis.nodes).replace(/</g, "\\u003c");
  const suggestedRootsJson = JSON.stringify(suggestedRootIds(analysis.nodes)).replace(/</g, "\\u003c");
  const accountIdJson = JSON.stringify(analysis.accountId || "").replace(/</g, "\\u003c");
  const opportunitiesJson = JSON.stringify(context.opportunities || []).replace(/</g, "\\u003c");
  const accountMetricsJson = JSON.stringify(context.accountMetrics || {}).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Org Chart Mapper</title>
    <style>
      :root {
        --bg: #f7f7f8;
        --surface: #ffffff;
        --subtle: #fafafa;
        --text: #24262b;
        --muted: #69707d;
        --faint: #9aa3b3;
        --line: #e3e5ea;
        --line-strong: #cfd5df;
        --purple: #5b2df5;
        --purple-soft: #f1edff;
        --green: #147a3f;
        --yellow: #8a6100;
        --red: #b42318;
        --blue: #0b57d0;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.45;
      }
      button, .button {
        border: 0;
        border-radius: 7px;
        cursor: pointer;
        font: inherit;
        font-weight: 650;
        line-height: 1.2;
        padding: 8px 11px;
      }
      .button {
        display: inline-flex;
        text-decoration: none;
      }
      .primary {
        background: #222;
        color: white;
      }
      .secondary {
        background: #f2f3f5;
        color: #30333a;
      }
      .ghost {
        background: transparent;
        color: var(--muted);
      }
      .app-shell {
        display: grid;
        grid-template-columns: 54px 270px minmax(560px, 1fr) 350px 0px;
        min-height: 100vh;
        transition: grid-template-columns 200ms ease;
      }
      .app-shell.notes-open {
        grid-template-columns: 54px 270px minmax(360px, 1fr) 0px 430px;
      }
      .app-shell.notes-open .contacts-panel {
        overflow: hidden;
        padding: 0;
      }
      .rail {
        align-items: center;
        background: #fbfbfc;
        border-right: 1px solid var(--line);
        display: flex;
        flex-direction: column;
        gap: 14px;
        padding: 18px 10px;
      }
      .rail-dot {
        align-items: center;
        border: 1px solid transparent;
        border-radius: 8px;
        color: #555b66;
        display: flex;
        font-size: 18px;
        height: 32px;
        justify-content: center;
        width: 32px;
      }
      .rail-dot.active {
        background: #e8e8e8;
        color: #222;
      }
      .account-nav {
        background: #f4f4f6;
        border-right: 1px solid var(--line);
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        padding: 20px 16px;
      }
      .back {
        color: #667085;
        font-size: 14px;
        font-weight: 650;
        margin-bottom: 16px;
      }
      .account-summary-card {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 9px;
        margin-bottom: 16px;
        padding: 12px;
      }
      .account-summary-name {
        font-size: 13px;
        font-weight: 750;
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
        background: #f4f4f6;
        border-radius: 5px;
        font-size: 11px;
        padding: 3px 7px;
      }
      .summary-metric strong { display: block; font-size: 13px; font-weight: 800; line-height: 1.2; }
      .summary-renewal {
        color: var(--muted);
        font-size: 11px;
      }
      .nav-list {
        display: grid;
        gap: 2px;
        margin-bottom: 14px;
      }
      .nav-item {
        border-radius: 7px;
        color: #25272d;
        font-size: 13px;
        padding: 7px 10px;
      }
      .nav-item.active {
        color: var(--text);
        font-weight: 700;
      }
      .nav-section-label {
        color: var(--faint);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.06em;
        margin-bottom: 8px;
        padding: 0 2px;
        text-transform: uppercase;
      }
      .opp-list { display: grid; gap: 7px; }
      .opp-card {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 8px;
        cursor: pointer;
        padding: 10px 11px;
        text-align: left;
        transition: border-color 120ms ease, box-shadow 120ms ease;
        width: 100%;
      }
      .opp-card:hover {
        border-color: #888;
        box-shadow: 0 0 0 2px #eee;
      }
      .opp-card.active {
        border-color: #555;
        box-shadow: 0 0 0 2px #eee;
      }
      .opp-card-name {
        font-size: 12px;
        font-weight: 700;
        line-height: 1.3;
        margin-bottom: 3px;
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
        font-weight: 700;
        padding: 2px 7px;
      }
      .opp-health.at_risk { background: #e8e8e8; color: #333; }
      .opp-health.conditional { background: #e8e8e8; color: #333; }
      .opp-health.neutral { background: #eef2f6; color: #475467; }
      .opp-panel {
        background: var(--surface);
        border-right: 1px solid var(--line);
        bottom: 0;
        box-shadow: 4px 0 20px rgba(20, 24, 32, 0.08);
        left: 54px;
        overflow-y: auto;
        padding: 20px 18px;
        position: fixed;
        top: 0;
        transform: translateX(-110%);
        transition: transform 180ms ease;
        width: 300px;
        z-index: 25;
      }
      .opp-panel.open { transform: translateX(0); }
      .opp-panel-head {
        align-items: start;
        display: flex;
        gap: 8px;
        justify-content: space-between;
        margin-bottom: 16px;
      }
      .opp-panel-head h2 { font-size: 15px; }
      .opp-panel-close {
        align-items: center;
        background: transparent;
        border: 1px solid var(--line);
        border-radius: 6px;
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
      .opp-panel-close:hover { background: #f2f3f5; color: var(--text); }
      .opp-type-badge {
        border-radius: 999px;
        display: inline-flex;
        font-size: 10px;
        font-weight: 700;
        padding: 3px 8px;
        margin-bottom: 12px;
      }
      .opp-type-renewal, .opp-type-expansion, .opp-type-new_business { background: #ebebeb; color: #333; }
      .opp-field-list { display: grid; gap: 8px; margin-bottom: 14px; }
      .opp-field-row { display: grid; gap: 4px; grid-template-columns: 80px minmax(0,1fr); }
      .opp-field-label { color: var(--muted); font-size: 11px; padding-top: 1px; }
      .opp-field-value { font-size: 12px; overflow-wrap: anywhere; }
      .opp-text-block {
        background: #f9f9fb;
        border: 1px solid var(--line);
        border-radius: 7px;
        font-size: 12px;
        line-height: 1.55;
        padding: 10px;
      }
      .opp-text-label {
        color: var(--muted);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.05em;
        margin-bottom: 5px;
        text-transform: uppercase;
      }
      .view-profile-btn {
        color: #333;
        font-size: 12px;
        font-weight: 650;
        text-decoration: none;
      }
      .view-profile-btn:hover { text-decoration: underline; }
      .workspace {
        background: var(--surface);
        min-width: 0;
      }
      .topbar {
        align-items: center;
        border-bottom: 1px solid var(--line);
        display: flex;
        gap: 12px;
        justify-content: space-between;
        min-height: 61px;
        padding: 14px 24px;
      }
      .account-title {
        align-items: center;
        display: flex;
        gap: 10px;
        min-width: 0;
      }
      .linkedin {
        align-items: center;
        background: #0a66c2;
        border-radius: 3px;
        color: white;
        display: inline-flex;
        font-size: 13px;
        font-weight: 850;
        height: 20px;
        justify-content: center;
        width: 20px;
      }
      .title-stack {
        min-width: 0;
      }
      .title-stack strong {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .title-stack span {
        color: var(--muted);
        display: block;
        font-size: 12px;
      }
      .stage {
        padding: 24px 32px 34px;
      }
      .stage-head {
        align-items: start;
        display: flex;
        gap: 16px;
        justify-content: space-between;
        margin-bottom: 18px;
      }
      h1, h2 {
        margin: 0;
      }
      h1 {
        font-size: 25px;
        letter-spacing: 0;
      }
      h2 {
        font-size: 15px;
      }
      .muted {
        color: var(--muted);
      }
      .stage-actions, .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .map-panel {
        background: #fafafa;
        border: 1px solid var(--line);
        border-radius: 9px;
        min-height: 560px;
        overflow: auto;
        padding: 16px;
      }
      .profile-card.drop-above::before,
      .profile-card.drop-below::after {
        align-items: center;
        background: rgba(91, 45, 245, 0.18);
        border: 2px solid var(--purple);
        color: var(--purple);
        display: flex;
        font-size: 22px;
        font-weight: 900;
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
        border-bottom: 2px dashed var(--purple);
        border-radius: 12px 12px 0 0;
        content: "▲";
        top: -2px;
      }
      .profile-card.drop-below::after {
        border-radius: 0 0 12px 12px;
        border-top: 2px dashed var(--purple);
        bottom: -2px;
        content: "▼";
      }
      .tree {
        align-items: flex-start;
        display: flex;
        gap: 76px;
        justify-content: center;
        min-width: 720px;
        padding: 34px 18px 42px;
      }
      .empty-state {
        background: #fbfbfc;
        border: 1px solid var(--line);
        border-radius: 9px;
        color: var(--muted);
        padding: 28px;
        text-align: center;
      }
      .profile-card {
        background: transparent;
        cursor: grab;
        display: block;
        padding: 0;
        position: relative;
        text-align: initial;
        transition: opacity 140ms ease, transform 140ms ease;
        width: 200px;
        will-change: transform;
      }
      .profile-card:hover {
        transform: translateY(-2px);
      }
      .profile-card.active .profile-card-photo {
        outline: 3px solid var(--purple-soft);
        outline-offset: 0;
      }
      .profile-card.dragging {
        cursor: grabbing;
        opacity: 0.72;
        transform: scale(0.96);
      }
      .profile-card-photo {
        align-items: center;
        background: linear-gradient(135deg, #f1edff 0%, #e3f7eb 100%);
        border: 4px solid #fff;
        border-bottom: 0;
        border-radius: 18px 18px 6px 6px;
        box-shadow: 0 4px 12px rgba(15, 20, 30, 0.06);
        color: #475467;
        display: flex;
        font-size: 38px;
        font-weight: 850;
        height: 150px;
        justify-content: center;
        letter-spacing: -0.02em;
        position: relative;
        width: 100%;
      }
      .profile-card-info {
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 6px 18px rgba(15, 20, 30, 0.07);
        margin: -8px 8px 0;
        padding: 12px 12px 10px;
        position: relative;
        z-index: 2;
      }
      .profile-card-name {
        cursor: text;
        font-size: 14px;
        font-weight: 800;
        letter-spacing: -0.01em;
        line-height: 1.2;
        margin: 0 0 2px;
        overflow: hidden;
        text-align: center;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .profile-card-title {
        background: transparent;
        border: 1px dashed transparent;
        border-radius: 6px;
        color: var(--muted);
        cursor: text;
        display: block;
        font: inherit;
        font-size: 11.5px;
        line-height: 1.3;
        margin: 0 auto 11px;
        max-width: 100%;
        overflow: hidden;
        padding: 1px 6px;
        text-align: center;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .profile-card-title:hover {
        background: #f7f7f9;
        border-color: var(--line);
      }
      .title-chip-input {
        background: #fff;
        border: 1px solid #888;
        border-radius: 6px;
        color: #111;
        font: inherit;
        font-size: 11.5px;
        outline: none;
        padding: 1px 6px;
        text-align: center;
        width: 100%;
      }
      .profile-card-stats {
        border-top: 1px solid #eef0f3;
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        padding-top: 9px;
      }
      .profile-stat {
        align-items: center;
        border-right: 1px solid #eef0f3;
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
        padding: 0 4px;
      }
      .profile-stat:last-child {
        border-right: 0;
      }
      .profile-stat-icon {
        align-items: center;
        display: flex;
        height: 18px;
        justify-content: center;
      }
      .profile-stat-icon.purple { color: var(--purple); }
      .profile-stat-icon.green { color: var(--green); }
      .profile-stat-icon.blue { color: var(--blue); }
      .profile-stat-value {
        color: var(--text);
        font-size: 12px;
        font-weight: 700;
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
        font-size: 9.5px;
        font-weight: 500;
        letter-spacing: 0.02em;
      }
      .star-marker {
        align-items: center;
        background: #f4d83f;
        border: 2px solid #354047;
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
      .profile-card.is-key .star-marker {
        display: block;
      }
      .profile-name, .profile-meta, .badges, .profile-note, .owner { display: none; }
      .remove {
        align-items: center;
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid var(--line);
        border-radius: 999px;
        box-shadow: 0 3px 8px rgba(20, 24, 32, 0.08);
        color: var(--muted);
        display: flex;
        font-size: 13px;
        height: 24px;
        justify-content: center;
        opacity: 0;
        padding: 0;
        position: absolute;
        right: 8px;
        top: 8px;
        transition: opacity 120ms ease;
        width: 24px;
        z-index: 5;
      }
      .profile-card:hover .remove, .profile-card:focus-within .remove {
        opacity: 1;
      }
      .children {
        align-items: flex-start;
        border-left: 0;
        display: flex;
        gap: 52px;
        grid-column: auto;
        justify-content: center;
        margin: 24px 0 0;
        padding-left: 0;
        padding-top: 20px;
        position: relative;
      }
      .tree-node {
        align-items: center;
        display: flex;
        flex-direction: column;
        position: relative;
        transition: transform 160ms ease;
      }
      .tree-node.has-children > .children::before {
        background: var(--line-strong);
        content: "";
        height: 2px;
        left: 56px;
        position: absolute;
        right: 56px;
        top: 0;
      }
      .tree-node.has-children > .children::after {
        background: var(--line-strong);
        content: "";
        height: 30px;
        left: 50%;
        position: absolute;
        top: -30px;
        width: 2px;
      }
      .tree-node.has-children > .children > .tree-node::before {
        background: var(--line-strong);
        content: "";
        height: 22px;
        left: 50%;
        position: absolute;
        top: -22px;
        width: 2px;
      }
      .profile-card .profile-meta, .profile-card .badges {
        display: none;
      }
      .drag-preview {
        background: rgba(255, 255, 255, 0.96);
        border: 1px solid var(--line);
        border-radius: 12px;
        box-shadow: 0 10px 28px rgba(20, 24, 32, 0.14);
        color: #333;
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
        background: #ffffff;
        clip-path: polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0 50%);
        display: flex;
        font-size: 18px;
        font-weight: 850;
        height: 56px;
        justify-content: center;
        margin: 0 auto 5px;
        width: 64px;
      }
      .drag-preview-title {
        color: #30333a;
        font-size: 10px;
        font-weight: 760;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .insights {
        display: grid;
        gap: 14px;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        margin-top: 16px;
      }
      .insight-card {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 9px;
        padding: 14px;
      }
      ul {
        margin: 10px 0 0;
        padding-left: 18px;
      }
      li {
        margin-bottom: 8px;
      }
      .contacts-panel {
        background: var(--surface);
        border-left: 1px solid var(--line);
        min-width: 0;
        padding: 20px 16px;
      }
      .contacts-panel-inner {
        position: sticky;
        top: 16px;
      }
      .contacts-head {
        align-items: start;
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 10px;
      }
      .add-contact-form {
        background: #f7f7f8;
        border: 1px solid var(--line);
        border-radius: 8px;
        display: none;
        gap: 7px;
        margin-bottom: 12px;
        padding: 10px;
      }
      .add-contact-form.open { display: grid; }
      .add-contact-form input {
        border: 1px solid var(--line);
        border-radius: 6px;
        font: inherit;
        font-size: 12px;
        padding: 6px 8px;
        width: 100%;
      }
      .add-contact-form input:focus { border-color: #888; outline: none; }
      .add-contact-form-actions {
        display: flex;
        gap: 6px;
      }
      .add-contact-form-actions button {
        flex: 1;
        font-size: 12px;
        padding: 6px 8px;
      }
      .contact-list {
        display: grid;
        gap: 9px;
      }
      .contact-chip {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 8px;
        cursor: grab;
        display: grid;
        gap: 10px;
        grid-template-columns: 42px minmax(0, 1fr);
        padding: 10px;
        transition: opacity 160ms ease, filter 160ms ease, border-color 160ms ease;
      }
      .contact-chip:hover {
        border-color: #888;
      }
      .contact-chip.active {
        border-color: #555;
        box-shadow: 0 0 0 2px #eee;
      }
      .contact-chip[aria-disabled="true"] {
        cursor: pointer;
        filter: grayscale(1);
        opacity: 0.42;
      }
      .contact-photo {
        align-items: center;
        background: #eef2f6;
        border-radius: 999px;
        color: #4b5563;
        display: flex;
        font-weight: 850;
        height: 42px;
        justify-content: center;
        width: 42px;
      }
      .contact-name {
        font-weight: 760;
        overflow-wrap: anywhere;
      }
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
        padding: 18px;
        pointer-events: auto;
        visibility: visible;
      }
      .notes-panel textarea {
        border: 1px solid var(--line);
        border-radius: 8px;
        font: inherit;
        min-height: 180px;
        padding: 10px;
        resize: vertical;
        width: 100%;
      }
      #close-notes {
        align-items: center;
        border: 1px solid var(--line);
        border-radius: 6px;
        display: flex;
        font-size: 18px;
        height: 30px;
        justify-content: center;
        padding: 0;
        width: 30px;
        flex-shrink: 0;
      }
      #close-notes:hover { background: #f2f3f5; color: var(--text); }
      .notes-head {
        align-items: start;
        display: flex;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 14px;
      }
      .detail-status {
        color: var(--muted);
        font-size: 12px;
        margin-bottom: 12px;
      }
      .detail-content {
        display: grid;
        gap: 12px;
        margin-bottom: 14px;
      }
      .detail-section {
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 12px;
      }
      .detail-section h3 {
        font-size: 12px;
        margin: 0 0 9px;
        text-transform: uppercase;
      }
      .field-row {
        display: grid;
        gap: 8px;
        grid-template-columns: 108px minmax(0, 1fr);
        padding: 5px 0;
      }
      .field-row span {
        color: var(--muted);
        font-size: 12px;
      }
      .field-row strong, .field-row a {
        color: var(--text);
        font-size: 12px;
        overflow-wrap: anywhere;
      }
      .field-row a {
        color: #333;
        text-decoration: underline;
      }
      .mini-list {
        display: grid;
        gap: 8px;
      }
      .mini-item {
        background: #fbfbfc;
        border: 1px solid var(--line);
        border-radius: 7px;
        font-size: 12px;
        padding: 9px;
      }
      .mini-item strong {
        display: block;
        margin-bottom: 2px;
      }
      .notes-label {
        color: var(--muted);
        display: block;
        font-size: 12px;
        font-weight: 700;
        margin: 0 0 6px;
      }
      .linkedin-input {
        background: #fff;
        border: 1px solid var(--line);
        border-radius: 8px;
        font: inherit;
        font-size: 13px;
        padding: 8px 10px;
        width: 100%;
      }
      .linkedin-input:focus {
        border-color: #888;
        outline: none;
      }
      .card-linkedin {
        align-items: center;
        background: #0a66c2;
        border-radius: 4px;
        bottom: 6px;
        color: #fff;
        display: inline-flex;
        font-size: 11px;
        font-weight: 850;
        height: 22px;
        justify-content: center;
        position: absolute;
        right: 8px;
        text-decoration: none;
        width: 22px;
        z-index: 4;
      }
      .card-linkedin:hover {
        background: #084c93;
      }
      .sentiment-dot {
        border-radius: 50%;
        border: 2px solid #fff;
        box-shadow: 0 0 0 1px rgba(0,0,0,0.08);
        height: 16px;
        position: absolute;
        right: 12px;
        top: 12px;
        width: 16px;
        z-index: 4;
      }
      .sentiment-dot.positive { background: #18a957; }
      .sentiment-dot.negative { background: #d8423d; }
      .sentiment-dot.neutral { background: #c9a04a; }
      .ai-section {
        background: #faf8ff;
        border: 1px solid #e6dfff;
        border-radius: 8px;
        margin-top: 12px;
        padding: 10px 12px;
      }
      .ai-section h3 {
        align-items: center;
        color: var(--purple);
        display: flex;
        font-size: 12px;
        font-weight: 800;
        gap: 6px;
        letter-spacing: 0.04em;
        margin: 0 0 8px;
        text-transform: uppercase;
      }
      .ai-section h3::before {
        content: "✦";
        font-size: 13px;
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
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .ai-pill {
        align-self: flex-start;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
      }
      .ai-pill.positive { background: #e3f7eb; color: #0f6b34; }
      .ai-pill.negative { background: #fce6e5; color: #9a201c; }
      .ai-pill.neutral { background: #fdf3d7; color: #6e5208; }
      .connection-modal {
        display: none;
        inset: 0;
        position: fixed;
        z-index: 50;
      }
      .connection-modal.open { display: block; }
      .connection-modal-backdrop {
        background: rgba(20, 24, 31, 0.45);
        inset: 0;
        position: absolute;
      }
      .connection-modal-card {
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 20px 50px rgba(15, 20, 30, 0.18);
        left: 50%;
        max-width: 540px;
        padding: 22px;
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
      .connection-modal-head h2 { font-size: 17px; margin: 0 0 2px; }
      .connection-modal-head button {
        align-items: center;
        border: 1px solid var(--line);
        border-radius: 6px;
        display: flex;
        font-size: 18px;
        height: 28px;
        justify-content: center;
        width: 28px;
      }
      .connection-modal-body { display: flex; flex-direction: column; gap: 4px; }
      .connection-label {
        color: var(--muted);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.04em;
        margin-top: 10px;
        text-transform: uppercase;
      }
      .connection-email {
        background: #fff;
        border: 1px solid var(--line);
        border-radius: 8px;
        font: inherit;
        font-family: inherit;
        font-size: 13px;
        line-height: 1.45;
        padding: 9px 11px;
        resize: vertical;
        width: 100%;
      }
      .connection-email:focus {
        border-color: var(--purple);
        outline: none;
      }
      .picker {
        position: relative;
      }
      .picker-button {
        align-items: center;
        background: #fff;
        border: 1px solid var(--line);
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        font: inherit;
        font-size: 13px;
        font-weight: 500;
        justify-content: space-between;
        padding: 9px 11px;
        text-align: left;
        width: 100%;
      }
      .picker-button:focus,
      .picker.open .picker-button {
        border-color: var(--purple);
        outline: none;
      }
      .picker-label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .picker-label.placeholder {
        color: var(--muted);
        font-weight: 400;
      }
      .picker-caret {
        color: var(--muted);
        flex-shrink: 0;
        font-size: 11px;
        margin-left: 8px;
      }
      .picker-popover {
        background: #fff;
        border: 1px solid var(--line-strong);
        border-radius: 8px;
        box-shadow: 0 8px 22px rgba(15, 20, 30, 0.14);
        display: none;
        left: 0;
        margin-top: 4px;
        position: absolute;
        right: 0;
        top: 100%;
        z-index: 60;
      }
      .picker.open .picker-popover {
        display: block;
      }
      .picker-search {
        background: transparent;
        border: 0;
        border-bottom: 1px solid var(--line);
        border-radius: 8px 8px 0 0;
        font: inherit;
        font-size: 13px;
        outline: none;
        padding: 10px 12px;
        width: 100%;
      }
      .picker-list {
        max-height: 220px;
        overflow-y: auto;
        padding: 4px 0;
      }
      .picker-item {
        cursor: pointer;
        display: flex;
        flex-direction: column;
        font-size: 13px;
        gap: 1px;
        padding: 7px 12px;
      }
      .picker-item.active,
      .picker-item:hover {
        background: var(--purple-soft);
      }
      .picker-item strong {
        font-weight: 700;
      }
      .picker-item-meta {
        color: var(--muted);
        font-size: 11px;
      }
      .picker-empty {
        color: var(--muted);
        font-size: 12px;
        padding: 14px;
        text-align: center;
      }
      .connection-modal-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 16px;
      }
      .connection-pill {
        align-items: center;
        background: #f1edff;
        border: 1px solid #d6c9ff;
        border-radius: 999px;
        color: var(--purple);
        display: inline-flex;
        font-size: 10px;
        font-weight: 700;
        gap: 4px;
        margin: 8px auto 0;
        padding: 2px 8px;
      }
      .profile-card-info > .connection-pill {
        display: inline-flex;
        margin: 8px auto 0;
        text-align: center;
      }
      .profile-card-info {
        text-align: center;
      }
      .connection-line {
        background: var(--purple);
        height: 2px;
        opacity: 0.4;
        pointer-events: none;
        position: absolute;
        transform-origin: left center;
        z-index: 1;
      }
      @media (max-width: 1120px) {
        .app-shell {
          grid-template-columns: 54px minmax(0, 1fr) 330px 0px;
        }
        .app-shell.notes-open {
          grid-template-columns: 54px minmax(0, 1fr) 0px 380px;
        }
        .account-nav {
          display: none;
        }
      }
      @media (max-width: 860px) {
        .app-shell {
          grid-template-columns: 1fr;
        }
        .rail, .contacts-panel {
          display: none;
        }
        .stage {
          padding: 18px;
        }
        .insights {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <div class="app-shell">
      <aside class="rail" aria-label="Pylon-style app rail">
        <div class="rail-dot active" title="Org Chart">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="5" y="1" width="6" height="4" rx="1" fill="currentColor"/>
            <rect x="1" y="11" width="5" height="4" rx="1" fill="currentColor"/>
            <rect x="10" y="11" width="5" height="4" rx="1" fill="currentColor"/>
            <line x1="8" y1="5" x2="8" y2="9" stroke="currentColor" stroke-width="1.5"/>
            <line x1="3.5" y1="9" x2="12.5" y2="9" stroke="currentColor" stroke-width="1.5"/>
            <line x1="3.5" y1="9" x2="3.5" y2="11" stroke="currentColor" stroke-width="1.5"/>
            <line x1="12.5" y1="9" x2="12.5" y2="11" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </div>
        <div class="rail-dot" title="Issues">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.5"/>
            <line x1="8" y1="5" x2="8" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <circle cx="8" cy="11" r="0.75" fill="currentColor"/>
          </svg>
        </div>
        <div class="rail-dot" title="Settings">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="2.25" stroke="currentColor" stroke-width="1.5"/>
            <path d="M8 1.5v1.25M8 13.25V14.5M1.5 8h1.25M13.25 8H14.5M3.4 3.4l.88.88M11.72 11.72l.88.88M3.4 12.6l.88-.88M11.72 4.28l.88-.88" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="rail-dot" title="Contacts">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="5.5" r="2.75" stroke="currentColor" stroke-width="1.5"/>
            <path d="M2.5 13.5c0-3.04 2.46-5.5 5.5-5.5s5.5 2.46 5.5 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="rail-dot" title="Activity">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <polyline points="1.5,10 4.5,6 7,9 10,4 14.5,8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </aside>
      <aside class="account-nav" aria-label="Account navigation">
        <div class="back">← Accounts</div>
        <div class="account-summary-card" id="account-summary-card">
          <div class="account-summary-name">${escapeHtml(analysis.accountName)}</div>
          <div class="account-summary-metrics" id="account-summary-metrics">
            <div class="summary-metric"><strong id="summary-arr">—</strong>ARR</div>
            <div class="summary-metric"><strong id="summary-health">—</strong>Health</div>
          </div>
          <div class="summary-renewal" id="summary-renewal"></div>
        </div>
        <div class="nav-list">
          <div class="nav-item">Overview</div>
          <div class="nav-item">Issues</div>
          <div class="nav-item active">Org Chart Mapper</div>
          <div class="nav-item">Contacts</div>
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
              <span>Org Chart Mapper</span>
            </div>
          </div>
          <div class="actions">
            <a class="button secondary" href="/">Home</a>
            <a class="button secondary" href="/settings">Settings</a>
          </div>
        </header>
        <main class="stage">
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
          </section>
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
            <input id="new-contact-title" type="text" placeholder="Title / role" autocomplete="off">
            <div class="add-contact-form-actions">
              <button type="button" class="primary" id="save-new-contact">Add contact</button>
              <button type="button" class="secondary" id="cancel-new-contact">Cancel</button>
            </div>
          </div>
          <div id="people-list" class="contact-list"></div>
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
      const opportunities = ${opportunitiesJson};
      const accountMetrics = ${accountMetricsJson};
      const opportunitiesById = new Map(opportunities.map((o) => [o.id, o]));
      const peopleById = new Map(people.map((person) => [person.id, person]));
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
        if (!name) { document.querySelector("#new-contact-name").focus(); return; }
        addCustomContact(name, title || "—");
        document.querySelector("#new-contact-name").value = "";
        document.querySelector("#new-contact-title").value = "";
        addContactForm.classList.remove("open");
      });
      document.querySelector("#new-contact-name").addEventListener("keydown", (e) => {
        if (e.key === "Enter") document.querySelector("#new-contact-title").focus();
      });
      document.querySelector("#new-contact-title").addEventListener("keydown", (e) => {
        if (e.key === "Enter") document.querySelector("#save-new-contact").click();
      });

      orgTree.addEventListener("dragover", allowDrop);
      orgTree.addEventListener("drop", (event) => {
        if (event.target.closest(".profile-card")) return;
        event.preventDefault();
        const id = readDraggedId(event);
        if (id) placeAtRoot(id);
      });

      applySuggestedLayout();
      render();

      function render() {
        renderContacts();
        renderTree();
      }

      function renderContacts() {
        const placed = placedIds();
        placedCount.textContent = placed.size;
        peopleList.innerHTML = people.map((person) => renderContactChip(person, placed.has(person.id))).join("");
        peopleList.querySelectorAll(".contact-chip").forEach((chip) => {
          chip.addEventListener("click", () => openContactDetails(chip.dataset.personId));
          if (chip.getAttribute("aria-disabled") === "true") return;
          chip.addEventListener("dragstart", (event) => startDrag(event, chip.dataset.personId));
          chip.addEventListener("dragend", endDrag);
        });
      }

      function renderTree() {
        if (!state.roots.length) {
          orgTree.innerHTML = '<div class="empty-state">Drag a contact from the right sidebar to start the org chart.</div>';
          return;
        }

        orgTree.innerHTML = state.roots.map((id) => renderTreeNode(id)).join("");
        orgTree.querySelectorAll(".profile-card").forEach((card) => {
          card.addEventListener("click", (event) => {
            if (event.target.closest("button")) return;
            openContactDetails(card.dataset.personId);
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
        const linkedinUrl = state.linkedinById[id] || "";
        const sentiment = person.aiFields?.sentiment || "";
        const sentimentTitle = sentiment ? \`AI sentiment: \${sentiment}\${person.aiFields?.sentimentReason ? " — " + person.aiFields.sentimentReason : ""}\` : "";
        const connectionCount = state.connections.filter((c) => c.fromId === id || c.toId === id).length;
        const isKey = ["Champion / coach", "Decision maker", "Research lead"].includes(person.relationship);
        const displayTitle = state.customTitles[id] || person.title;
        const displayName = state.customNames[id] || person.name;
        const reportsCount = children.length;
        const department = person.department || extractDepartment(displayTitle);
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
              <div class="profile-stat" title="\${escapeAttr(department || "Department unknown")}">
                <div class="profile-stat-icon green">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <rect x="3" y="2" width="10" height="13" rx="1" stroke="currentColor" stroke-width="1.5"/>
                    <rect x="5.5" y="4.5" width="1.5" height="1.5" fill="currentColor"/>
                    <rect x="9" y="4.5" width="1.5" height="1.5" fill="currentColor"/>
                    <rect x="5.5" y="7.5" width="1.5" height="1.5" fill="currentColor"/>
                    <rect x="9" y="7.5" width="1.5" height="1.5" fill="currentColor"/>
                    <rect x="6.5" y="11" width="3" height="4" fill="currentColor"/>
                  </svg>
                </div>
                <div class="profile-stat-value">\${escapeHtml(department || "—")}</div>
                <div class="profile-stat-label">Department</div>
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
        const params = new URLSearchParams(window.location.search);
        if (accountId && !params.get("account_id")) params.set("account_id", accountId);
        params.set("contact_id", person.id || "");
        params.set("name", person.name || "");
        params.set("source", person.source || "");
        if (person.email) params.set("email", person.email);

        const response = await fetch(\`/api/contact-details?\${params.toString()}\`, {
          headers: { Accept: "application/json" }
        });
        const payload = await response.json();
        if (!response.ok || payload.error) {
          throw new Error(payload.error || "Contact lookup failed");
        }
        return payload;
      }

      function renderContactDetail(detail) {
        const contact = detail.contact || {};
        const node = peopleById.get(state.activeNoteId) || {};
        notesName.textContent = contact.name || "Contact details";
        notesTitle.textContent = [contact.title, detail.mode === "live" ? "Live Pylon" : "Demo data"].filter(Boolean).join(" · ");
        detailStatus.textContent = detail.sourceNote || "Loaded on click.";
        detailContent.innerHTML = [
          renderAiInsights(node.aiFields, contact.customFields),
          detailSection("Profile", [
            ["Email", contact.email],
            ["Phone", contact.phone],
            ["Account", contact.accountId],
            ["Portal role", contact.portalRole]
          ]),
          detailSection("Links", [
            ["Pylon", detail.links?.pylonContact],
            ["Salesforce", detail.links?.salesforce],
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
        for (const id of suggestedRoots) {
          if (peopleById.has(id)) state.roots.push(id);
        }
        const remaining = people.filter((person) => !state.roots.includes(person.id));
        const economicBuyer = people.find((person) => person.buyingRole === "Economic buyer") || peopleById.get(state.roots[0]);
        for (const person of remaining) {
          if (economicBuyer && person.id !== economicBuyer.id) {
            placeUnder(person.id, economicBuyer.id, { renderAfter: false });
          } else if (!state.roots.includes(person.id)) {
            state.roots.push(person.id);
          }
        }
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

      function addCustomContact(name, title) {
        const id = "custom_" + Math.random().toString(36).slice(2, 9);
        const person = {
          id, name, title,
          relationship: "Neutral / unknown",
          buyingRole: "Unknown",
          source: "Manual",
          email: "", owner: "", notes: "", level: "Unknown"
        };
        people.push(person);
        peopleById.set(id, person);
        state.notesById[id] = "";
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
