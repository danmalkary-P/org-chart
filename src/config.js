import fs from "node:fs";
import path from "node:path";

const SAVED_CONFIG_PATH = path.resolve(process.cwd(), ".pylon-config.json");

function readSavedConfig() {
  try {
    return JSON.parse(fs.readFileSync(SAVED_CONFIG_PATH, "utf-8"));
  } catch {
    return {};
  }
}

export function saveSavedConfig(updates) {
  const current = readSavedConfig();
  const next = { ...current, ...updates };
  fs.writeFileSync(SAVED_CONFIG_PATH, JSON.stringify(next, null, 2));
  return next;
}

export function loadConfig(env = process.env) {
  const port = Number.parseInt(env.PORT || "3000", 10);
  const saved = readSavedConfig();
  const pylonApiToken = env.PYLON_API_TOKEN || saved.pylonApiToken || "";

  return {
    port: Number.isFinite(port) ? port : 3000,
    publicBaseUrl: trimTrailingSlash(env.PUBLIC_BASE_URL || ""),
    demoMode: env.DEMO_MODE === "mock" ? "mock" : (pylonApiToken ? "live" : "mock"),
    pylonApiBase: trimTrailingSlash(env.PYLON_API_BASE || saved.pylonApiBase || "https://api.usepylon.com"),
    pylonMcpUrl: trimTrailingSlash(saved.pylonMcpUrl || "https://mcp.usepylon.com"),
    pylonApiToken,
    pylonTokenSource: env.PYLON_API_TOKEN ? "env" : (saved.pylonApiToken ? "settings" : "none"),
    openAiApiKey: env.OPENAI_API_KEY || ""
  };
}

export function resolveMode(searchParams, config) {
  const requested = searchParams.get("mode") || config.demoMode;
  const wantsLive = requested === "live";

  if (wantsLive && !config.pylonApiToken) {
    return {
      mode: "mock",
      requestedMode: "live",
      reason: "Live mode requested, but PYLON_API_TOKEN is not configured."
    };
  }

  return {
    mode: wantsLive ? "live" : "mock",
    requestedMode: wantsLive ? "live" : "mock",
    reason: ""
  };
}

export function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}
