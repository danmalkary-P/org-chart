export function loadConfig(env = process.env) {
  const port = Number.parseInt(env.PORT || "3000", 10);

  return {
    port: Number.isFinite(port) ? port : 3000,
    publicBaseUrl: trimTrailingSlash(env.PUBLIC_BASE_URL || ""),
    demoMode: env.DEMO_MODE === "live" ? "live" : "mock",
    pylonApiBase: trimTrailingSlash(env.PYLON_API_BASE || "https://api.usepylon.com"),
    pylonApiToken: env.PYLON_API_TOKEN || "",
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
