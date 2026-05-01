import { makeAbsoluteUrl, truncate } from "./utils.js";

export function response(components) {
  return { components };
}

export function card(title, components) {
  return {
    type: "card",
    header: { title },
    components
  };
}

export function text(label, value) {
  return {
    type: "text",
    label,
    value: value || "Not available"
  };
}

export function badge(label, items) {
  return {
    type: "badge",
    label,
    items: items.map((item) => ({
      value: item.value,
      color: item.color || "gray"
    }))
  };
}

export function link(label, url) {
  return {
    type: "link",
    label,
    url
  };
}

export function button(label, url) {
  return {
    type: "button",
    button_type: "link",
    label,
    url
  };
}

export function divider() {
  return { type: "divider" };
}

export function modeCard({ modeInfo, baseUrl, pathname, searchParams, liveEnabled }) {
  return card("Demo controls", [
    badge("Data", [
      {
        value: modeInfo.mode === "live" ? "LIVE PYLON" : "MOCK DEMO",
        color: modeInfo.mode === "live" ? "green" : "yellow"
      },
      ...(modeInfo.requestedMode !== modeInfo.mode
        ? [{ value: "FALLBACK", color: "red" }]
        : [])
    ]),
    ...(modeInfo.reason ? [text("Mode note", truncate(modeInfo.reason, 220))] : []),
    button("Mock account", makeModeUrl({ baseUrl, pathname, searchParams, mode: "mock" })),
    button(
      liveEnabled ? "Live data" : "Live data needs token",
      makeModeUrl({ baseUrl, pathname, searchParams, mode: "live" })
    )
  ]);
}

export function evidenceCard(evidenceLinks) {
  if (!evidenceLinks.length) {
    return card("Evidence", [text("Source", "Inferred from available Pylon and CRM context.")]);
  }

  return card(
    "Evidence",
    evidenceLinks.map((item) => link(item.label, item.url))
  );
}

export function warningCard(warnings) {
  if (!warnings.length) return null;
  return card("Watchouts", [badge("Risk", [{ value: "DRAFT ONLY", color: "blue" }]), text("Notes", warnings.join("\n"))]);
}

export function errorResponse(message) {
  return response([
    card("Sales Heat error", [
      badge("Status", [{ value: "ERROR", color: "red" }]),
      text("Message", message)
    ])
  ]);
}

function makeModeUrl({ baseUrl, pathname, searchParams, mode }) {
  const params = Object.fromEntries(searchParams.entries());
  params.mode = mode;
  params.request_type = "";
  params.code = "";
  return makeAbsoluteUrl(baseUrl, pathname, params);
}
