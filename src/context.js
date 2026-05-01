import { getMockContext } from "./mockData.js";
import {
  PylonClient,
  normalizeAccount,
  normalizeContact,
  normalizeIssue,
  normalizeMessage
} from "./pylonClient.js";
import { resolveMode } from "./config.js";
import { countBy, firstPresent, uniqueBy } from "./utils.js";
import { applyManualSalesInputs } from "./manualInputs.js";

export async function buildAccountContext(searchParams, config) {
  const modeInfo = resolveMode(searchParams, config);
  const accountId = searchParams.get("account_id") || "";
  const requesterEmail = searchParams.get("requester_email") || "";

  if (modeInfo.mode === "mock") {
    const context = getMockContext({ accountId, requesterEmail });
    context.mode = "mock";
    if (modeInfo.reason) {
      context.signals.systemWarnings.push(modeInfo.reason);
    }
    return { context: applyManualSalesInputs(context, searchParams), modeInfo };
  }

  const context = await buildLiveContext({ accountId, requesterEmail, config });
  context.mode = "live";
  return { context: applyManualSalesInputs(context, searchParams), modeInfo };
}

async function buildLiveContext({ accountId, requesterEmail, config }) {
  const client = new PylonClient({
    baseUrl: config.pylonApiBase,
    token: config.pylonApiToken
  });

  let resolvedAccountId = accountId;
  let seedContacts = [];

  if (!resolvedAccountId && requesterEmail) {
    seedContacts = extractData(await client.searchContactsByEmail(requesterEmail)).map(normalizeContact);
    resolvedAccountId = seedContacts[0]?.accountId || "";
  }

  if (!resolvedAccountId && requesterEmail.includes("@")) {
    const domain = requesterEmail.split("@").pop();
    const accounts = extractData(await client.searchAccountByDomain(domain));
    resolvedAccountId = accounts[0]?.id || "";
  }

  if (!resolvedAccountId) {
    throw new Error("No account_id or resolvable requester_email was provided.");
  }

  const accountPayload = await client.getAccount(resolvedAccountId);
  const account = normalizeAccount(accountPayload.data || accountPayload);

  const contacts = uniqueBy(
    [
      ...seedContacts,
      ...extractData(await client.searchContactsByAccount(account.id || resolvedAccountId)).map(normalizeContact)
    ],
    (contact) => contact.id || contact.email
  );

  const issues = extractData(await client.searchIssuesByAccount(account.id || resolvedAccountId))
    .map(normalizeIssue)
    .slice(0, 8)
    .map((issue) => enrichIssueWithContacts(issue, contacts));

  const messages = [];
  for (const issue of issues.slice(0, 3)) {
    const payload = await client.getIssueMessages(issue.id);
    messages.push(...extractData(payload).map((message) => normalizeMessage(message, issue.id)));
  }

  return {
    account,
    contacts,
    issues,
    messages,
    accountMetrics: buildAccountMetrics(account, issues),
    opportunities: buildOpportunities(account),
    departments: [],
    signals: inferSignals({ account, contacts, issues, messages })
  };
}

function enrichIssueWithContacts(issue, contacts) {
  if (issue.requester?.id && (!issue.requester.name || !issue.requester.email)) {
    const match = contacts.find((c) => c.id === issue.requester.id);
    if (match) {
      issue.requester = { id: match.id, name: match.name, email: match.email };
    }
  }
  return issue;
}

function buildAccountMetrics(account, issues) {
  const sf = account.salesforce || {};
  const sentiment = mapSentimentBucket(account.sentiment);
  return {
    currentArr: sf.arr ?? null,
    renewalDate: sf.renewalDate || null,
    healthScore: account.health?.score ?? null,
    healthTrend: trendLabel(account.health?.change30d),
    sentiment,
    sentimentLabel: account.sentiment || "",
    relationshipStrength: account.health?.relationshipStrength || "",
    lifecycle: titleCase(account.lifecycleStage),
    lifecycleSub: account.industry || "",
    seatCount: sf.paidSeats ?? null,
    seatTier: sf.seatTier ? `${sf.seatTier} tier` : "",
    products: sf.products || [],
    upsellSignals: account.upsellSignals.map((label) => ({ label, detail: account.aiSummaries.upsellSummary || "" })),
    riskSignals: account.riskSignals.map((label) => ({ label, detail: "" })),
    accountIntelligenceSignals: account.accountIntelligenceSignals,
    nextSteps: account.nextSteps,
    nextStepsCurrentStatus: account.nextStepsCurrentStatus,
    aiKickOffContext: account.aiSummaries.kickOffContext,
    aiLastCallSummary: account.aiSummaries.lastCallSummary,
    championName: account.championName,
    lastMeetingDate: account.meetings.lastMeetingDate,
    nextMeetingDate: account.meetings.nextMeetingDate,
    issueCount30d: account.issueCount30d,
    openIssuesLast90d: account.openIssuesLast90d,
    tags: account.tags || [],
    recentActivity: buildRecentActivity(account, issues)
  };
}

function buildOpportunities(account) {
  const sf = account.salesforce || {};
  if (!sf.latestOpportunityName) return [];
  return [
    {
      id: `opp_${account.id}`,
      name: sf.latestOpportunityName,
      type: /renewal/i.test(sf.latestOpportunityName) ? "renewal" : /expan|upsell/i.test(sf.latestOpportunityName) ? "expansion" : "new_business",
      stage: sf.latestOpportunityForecast || "",
      amount: sf.latestOpportunityArr ?? null,
      closeDate: sf.latestOpportunityCloseDate || "",
      health: mapSentimentBucket(account.sentiment),
      products: sf.products || [],
      owner: account.owner,
      notes: sf.contractNotes || account.aiSummaries.upsellSummary || "",
      nextSteps: account.nextSteps || ""
    }
  ];
}

function buildRecentActivity(account, issues) {
  const out = [];
  if (account.meetings.lastMeetingDate) {
    out.push({
      text: "Last meeting recorded",
      when: account.meetings.lastMeetingDate,
      type: "Meeting",
      status: account.aiSummaries.lastCallSummary ? "Recap available" : ""
    });
  }
  for (const issue of issues.slice(0, 4)) {
    if (!issue.latestMessageActivityAt) continue;
    out.push({
      text: `${issue.requester?.name || "Customer"}: ${issue.title}`,
      when: issue.latestMessageActivityAt,
      type: titleCase(issue.state) || "Issue",
      status: titleCase(issue.priority)
    });
  }
  return out;
}

function mapSentimentBucket(label = "") {
  const lower = String(label).toLowerCase();
  if (/advocate|positive|champion|enthusi/.test(lower)) return "positive";
  if (/risk|negative|frustrat|blocked|churn/.test(lower)) return "at_risk";
  return "neutral";
}

function trendLabel(change) {
  if (change == null || Number.isNaN(change)) return "";
  if (change > 0.1) return "trending up";
  if (change < -0.1) return "trending down";
  return "stable";
}

function titleCase(value = "") {
  return String(value).replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

function inferSignals({ account, contacts, issues, messages }) {
  const openIssues = issues.filter((issue) => !["closed", "resolved"].includes(issue.state));
  const issueOwnerCounts = countBy(openIssues, (issue) => issue.assignee?.email || issue.assignee?.name);
  const relationshipEvents = [];

  for (const [assigneeKey, count] of issueOwnerCounts.entries()) {
    const issue = openIssues.find((item) => (item.assignee?.email || item.assignee?.name) === assigneeKey);
    if (!issue?.assignee?.name && !issue?.assignee?.email) continue;
    relationshipEvents.push({
      person: {
        id: issue.assignee.id,
        name: firstPresent(issue.assignee.name, issue.assignee.email),
        email: issue.assignee.email,
        role: "Pylon issue owner"
      },
      contact: firstPresent(issue.requester?.name, issue.requester?.email, contacts[0]?.name),
      strength: Math.min(90, 55 + count * 12),
      reason: `Worked ${count} recent/open issue${count === 1 ? "" : "s"} for ${account.name}.`,
      evidenceUrl: issue.url
    });
  }

  if (account.owner?.email || account.owner?.name) {
    relationshipEvents.push({
      person: {
        id: account.owner.id,
        name: firstPresent(account.owner.name, account.owner.email),
        email: account.owner.email,
        role: "Account owner"
      },
      contact: contacts[0]?.name || "account team",
      strength: 70,
      reason: "Listed as the account owner in Pylon/CRM context.",
      evidenceUrl: ""
    });
  }

  return {
    relationshipEvents,
    supportRisks: inferSupportRisks(account, openIssues, messages),
    expansionHints: inferExpansionHints({ account, issues, messages }),
    recentCommitments: inferCommitments(account, messages),
    calendarEvents: inferCalendarEvents(account),
    callActivities: inferCallActivities(account),
    linkedinPeople: [],
    systemWarnings: []
  };
}

function inferSupportRisks(account, openIssues, messages) {
  const risks = [];

  for (const label of account.riskSignals || []) {
    risks.push(label);
  }

  for (const issue of openIssues) {
    if (["urgent", "high"].includes(String(issue.priority).toLowerCase()) || issue.tags?.some((tag) => /risk|block|sso|incident|escalat/i.test(tag))) {
      risks.push(`${issue.title} — ${issue.state || "open"}${issue.priority ? ` (${issue.priority})` : ""}`);
    }
  }

  for (const message of messages) {
    if (/block|angry|frustrat|not fixed|urgent|risk/i.test(message.bodyText)) {
      risks.push(message.bodyText.slice(0, 220));
    }
  }

  return Array.from(new Set(risks)).slice(0, 5);
}

function inferExpansionHints({ account, issues, messages }) {
  const hints = [];

  for (const label of account.upsellSignals || []) hints.push(label);
  for (const label of account.accountIntelligenceSignals || []) hints.push(label);

  if (account.salesforce?.latestOpportunityName) {
    const arr = account.salesforce.latestOpportunityArr;
    hints.push(`${account.salesforce.latestOpportunityName}${arr ? ` · $${arr.toLocaleString()}` : ""}`);
  }

  if (account.aiSummaries?.upsellSummary) hints.push(account.aiSummaries.upsellSummary);

  return Array.from(new Set(hints.filter(Boolean))).slice(0, 6);
}

function inferCommitments(account, messages) {
  const commits = [];
  if (account.nextSteps) commits.push(account.nextSteps);
  if (account.nextStepsCurrentStatus) commits.push(account.nextStepsCurrentStatus);
  for (const message of messages) {
    if (/will|by |before|next step|follow up|send/i.test(message.bodyText)) {
      commits.push(message.bodyText.slice(0, 220));
    }
  }
  return Array.from(new Set(commits.filter(Boolean))).slice(0, 5);
}

function inferCalendarEvents(account) {
  const events = [];
  if (account.meetings?.nextMeetingDate) {
    events.push({
      title: `${account.name} — upcoming meeting`,
      startsAt: account.meetings.nextMeetingDate,
      attendees: [account.owner?.email].filter(Boolean),
      summary: "From Pylon calendar integration."
    });
  }
  return events;
}

function inferCallActivities(account) {
  if (!account.aiSummaries?.lastCallSummary) return [];
  return [
    {
      source: "Last call summary",
      happenedAt: account.meetings?.lastMeetingDate || "",
      summary: account.aiSummaries.lastCallSummary
    }
  ];
}

function extractData(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (payload?.data) return [payload.data];
  return [];
}
