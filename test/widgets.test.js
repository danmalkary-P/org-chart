import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { routeRequest } from "../src/server.js";
import { loadConfig } from "../src/config.js";

describe("Pylon Sales Heat widgets", () => {
  const config = loadConfig({
    PORT: "3000",
    DEMO_MODE: "mock",
    PUBLIC_BASE_URL: "http://localhost:3000",
    PYLON_API_BASE: "https://api.usepylon.com",
    PYLON_API_TOKEN: ""
  });

  it("echoes Pylon Custom App verification codes", async () => {
    const response = await request("/widgets/follow-up?request_type=verify&code=abc123");
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json, { code: "abc123" });
  });

  it("serves a browser helper for manual sales inputs", async () => {
    const response = await routeRequest({
      method: "GET",
      url: "/compose",
      headers: { host: "localhost:3000" },
      config
    });

    assert.equal(response.statusCode, 200);
    assert.match(response.body, /Sales Heat Input Builder/);
    assert.match(response.body, /LinkedIn people/);
  });

  it("serves browser previews for the Pylon component payloads", async () => {
    const response = await routeRequest({
      method: "GET",
      url: "/preview/follow-up?account_id=acme-risk",
      headers: { host: "localhost:3000" },
      config
    });

    assert.equal(response.statusCode, 200);
    assert.match(response.headers["Content-Type"], /text\/html/);
    assert.match(response.body, /Sales preview/);
    assert.match(response.body, /Follow-Up Writer/);
    assert.doesNotMatch(response.body, /Raw Pylon JSON/);
    assert.doesNotMatch(response.body, /href="\/widgets\/follow-up/);
  });

  it("keeps the homepage focused on clean previews", async () => {
    const response = await routeRequest({
      method: "GET",
      url: "/",
      headers: { host: "localhost:3000" },
      config
    });

    assert.equal(response.statusCode, 200);
    assert.match(response.body, /\/preview\/follow-up/);
    assert.doesNotMatch(response.body, /Raw Follow-Up JSON for Pylon/);
    assert.doesNotMatch(response.body, /\/widgets\/follow-up/);
  });

  it("keeps Pylon ingestion endpoints available in the background", async () => {
    const response = await request("/pylon/endpoints.json");

    assert.equal(response.statusCode, 200);
    assert.equal(response.json.customApps.followUpWriter, "http://localhost:3000/widgets/follow-up");
    assert.equal(response.json.customApps.warmIntroMapper, "http://localhost:3000/widgets/warm-intro");
    assert.equal(response.json.customApps.orgChartMapper, "http://localhost:3000/widgets/org-map");
  });

  it("renders a support-aware follow-up widget for a rich account", async () => {
    const response = await request("/widgets/follow-up?account_id=acme-risk");
    const payload = response.json;
    const serialized = JSON.stringify(payload);

    assert.equal(response.statusCode, 200);
    assert.ok(Array.isArray(payload.components));
    assert.match(serialized, /Follow-Up Writer/);
    assert.match(serialized, /Do not overpromise/);
    assert.match(serialized, /Copy draft/);
    assert.match(serialized, /Pylon issue #4182/);
  });

  it("renders a warm intro widget with ranked connectors", async () => {
    const response = await request("/widgets/warm-intro?account_id=acme-risk");
    const payload = response.json;
    const serialized = JSON.stringify(payload);

    assert.equal(response.statusCode, 200);
    assert.match(serialized, /Warm Intro Mapper/);
    assert.match(serialized, /Sam Patel/);
    assert.match(serialized, /Copy intro ask/);
    assert.match(serialized, /Mia Chen/);
  });

  it("renders an org chart mapper widget for Pylon ingestion", async () => {
    const people = encodeURIComponent(
      "Jordan Avery|VP Operations|Acme Robotics|https://linkedin.com/in/jordan-avery|Owns field operations rollout"
    );
    const response = await request(`/widgets/org-map?account_id=acme-risk&linkedin_people=${people}`);
    const payload = response.json;
    const serialized = JSON.stringify(payload);

    assert.equal(response.statusCode, 200);
    assert.match(serialized, /Org Chart Mapper/);
    assert.match(serialized, /Economic buyer/);
    assert.match(serialized, /Technical approver/);
    assert.match(serialized, /Jordan Avery/);
    assert.match(serialized, /Blocker \/ risk/);
  });

  it("serves a clean visual org chart preview", async () => {
    const people = encodeURIComponent(
      "Jordan Avery|VP Operations|Acme Robotics|https://linkedin.com/in/jordan-avery|Owns field operations rollout"
    );
    const response = await routeRequest({
      method: "GET",
      url: `/preview/org-map?account_id=acme-risk&linkedin_people=${people}`,
      headers: { host: "localhost:3000" },
      config
    });

    assert.equal(response.statusCode, 200);
    assert.match(response.headers["Content-Type"], /text\/html/);
    assert.match(response.body, /Acme Robotics/);
    assert.match(response.body, /Org Chart Mapper/);
    assert.match(response.body, /Jordan Avery/);
    assert.match(response.body, /Contacts/);
    assert.match(response.body, /contact-chip/);
    assert.match(response.body, /Org Chart Mapper/);
    assert.match(response.body, /data-person-id/);
    assert.match(response.body, /aria-disabled/);
    assert.match(response.body, /Drop contact here as a top-level person/);
    assert.match(response.body, /placeUnder/);
    assert.match(response.body, /profile-photo/);
    assert.match(response.body, /tree-node/);
    assert.match(response.body, /star-marker/);
    assert.match(response.body, /Use suggested layout/);
    assert.match(response.body, /title-chip/);
    assert.match(response.body, /Add notes for/);
    assert.match(response.body, /notes-panel/);
    assert.match(response.body, /Contact details/);
    assert.match(response.body, /\/api\/contact-details/);
    assert.match(response.body, /Save notes/);
    assert.match(response.body, /Champion \/ coach/);
    assert.doesNotMatch(response.body, /Raw Pylon JSON/);
  });

  it("loads contact details lazily for an org-map contact", async () => {
    const response = await request("/api/contact-details?account_id=acme-risk&contact_id=con_mia&email=mia.chen%40acmerobotics.com");
    const payload = response.json;
    const serialized = JSON.stringify(payload);

    assert.equal(response.statusCode, 200);
    assert.equal(payload.contact.name, "Mia Chen");
    assert.match(payload.sourceNote, /Loaded on click/);
    assert.match(serialized, /Salesforce/);
    assert.match(serialized, /salesforce.example.com/);
    assert.match(serialized, /Need export schema before rollout/);
  });

  it("scores LinkedIn multithread candidates from manual input", async () => {
    const people = encodeURIComponent(
      "Jordan Avery|VP Operations|Acme Robotics|https://linkedin.com/in/jordan-avery|Owns field operations rollout"
    );
    const response = await request(`/widgets/warm-intro?account_id=acme-risk&linkedin_people=${people}`);
    const payload = response.json;
    const serialized = JSON.stringify(payload);

    assert.equal(response.statusCode, 200);
    assert.match(serialized, /LinkedIn multithread/);
    assert.match(serialized, /Jordan Avery/);
    assert.match(serialized, /field operations rollout/);
    assert.match(serialized, /Ask Sam Patel/);
  });

  it("uses post-call notes and calendar context in follow-up drafting", async () => {
    const notes = encodeURIComponent("Next step: send SSO validation by Monday. Also multithread the operations buyer from LinkedIn.");
    const summary = encodeURIComponent("Pylon Google Calendar says this meeting is a renewal risk sync.");
    const response = await request(
      `/widgets/follow-up?account_id=acme-risk&post_call_notes=${notes}&calendar_summary=${summary}&calendar_title=Renewal%20sync`
    );
    const payload = response.json;
    const serialized = JSON.stringify(payload);

    assert.equal(response.statusCode, 200);
    assert.match(serialized, /Post-call notes included/);
    assert.match(serialized, /Pylon Google Calendar/);
    assert.match(serialized, /send SSO validation by Monday/i);
  });

  it("falls back gracefully for accounts with thin relationship data", async () => {
    const response = await request("/widgets/warm-intro?account_id=quiet-bank");
    const payload = response.json;
    const serialized = JSON.stringify(payload);

    assert.equal(response.statusCode, 200);
    assert.match(serialized, /LOW|MEDIUM/);
    assert.match(serialized, /No strong warm intro path|Alex Morgan/);
  });

  it("serves draft text without sending customer-facing messages", async () => {
    const response = await request("/drafts/follow-up.txt?account_id=acme-risk");
    const text = response.body;

    assert.equal(response.statusCode, 200);
    assert.match(text, /Subject:/);
    assert.match(text, /Draft only|Hi Mia|follow up/i);
    assert.doesNotMatch(text, /sent to customer/i);
  });

  async function request(url) {
    const result = await routeRequest({
      method: "GET",
      url,
      headers: { host: "localhost:3000" },
      config
    });

    return {
      ...result,
      json: result.headers["Content-Type"]?.includes("application/json") ? JSON.parse(result.body) : null
    };
  }
});
