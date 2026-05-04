import { routeRequest } from "../src/server.js";

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
