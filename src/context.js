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

  try {
    const context = await buildLiveContext({ accountId, requesterEmail, config });
    context.mode = "live";
    return { context: applyManualSalesInputs(context, searchParams), modeInfo };
  } catch (error) {
    const context = getMockContext({ accountId, requesterEmail });
    context.mode = "mock";
    context.signals.systemWarnings.push(`Live Pylon fetch failed; using mock data. ${error.message}`);
    return {
      context: applyManualSalesInputs(context, searchParams),
      modeInfo: {
        mode: "mock",
        requestedMode: "live",
        reason: error.message
      }
    };
  }
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
    .slice(0, 8);

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
    signals: inferSignals({ account, contacts, issues, messages })
  };
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
    supportRisks: inferSupportRisks(openIssues, messages),
    expansionHints: inferExpansionHints({ account, issues, messages }),
    recentCommitments: inferCommitments(messages),
    calendarEvents: inferCalendarEvents(account),
    callActivities: [],
    linkedinPeople: [],
    systemWarnings: []
  };
}

function inferSupportRisks(openIssues, messages) {
  const risks = [];
  for (const issue of openIssues) {
    if (["urgent", "high"].includes(issue.priority) || issue.tags?.some((tag) => /risk|block|sso|incident/i.test(tag))) {
      risks.push(`${issue.title} is still ${issue.state || "open"}${issue.priority ? ` with ${issue.priority} priority` : ""}.`);
    }
  }

  for (const message of messages) {
    if (/block|angry|frustrat|not fixed|urgent|risk/i.test(message.bodyText)) {
      risks.push(message.bodyText);
    }
  }

  return risks.slice(0, 4);
}

function inferExpansionHints({ account, issues, messages }) {
  const hintText = [
    account.crm?.opportunityName,
    account.crm?.opportunityStage,
    account.crm?.opportunityAmount,
    ...issues.map((issue) => `${issue.title} ${issue.bodyText} ${issue.tags?.join(" ")}`),
    ...messages.map((message) => message.bodyText)
  ].join(" ");

  const hints = [];
  if (/expansion|upsell|seat|rollout|enterprise|pilot/i.test(hintText)) {
    hints.push("Expansion language appears in CRM fields, issue titles, tags, or messages.");
  }
  if (account.crm?.opportunityAmount) {
    hints.push(`CRM opportunity amount: ${account.crm.opportunityAmount}.`);
  }
  if (account.crm?.opportunityStage) {
    hints.push(`CRM stage: ${account.crm.opportunityStage}.`);
  }
  return hints.slice(0, 4);
}

function inferCommitments(messages) {
  return messages
    .filter((message) => /will|by |before|next step|follow up|send/i.test(message.bodyText))
    .map((message) => message.bodyText)
    .slice(0, 4);
}

function inferCalendarEvents(account) {
  if (!account.crm?.nextMeeting) return [];
  return [
    {
      title: `${account.name} follow-up`,
      startsAt: account.crm.nextMeeting,
      attendees: [account.owner?.email].filter(Boolean),
      summary: "CRM next meeting field."
    }
  ];
}

function extractData(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (payload?.data) return [payload.data];
  return [];
}
