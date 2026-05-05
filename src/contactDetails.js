import { resolveMode } from "./config.js";
import { buildOrgMapAnalysis } from "./generators.js";
import { applyManualSalesInputs } from "./manualInputs.js";
import { getMockContext } from "./mockData.js";
import {
  normalizeContact,
  normalizeIssue,
  normalizeMessage,
  PylonClient
} from "./pylonClient.js";
import { firstPresent, truncate } from "./utils.js";

export async function buildContactDetails(searchParams, config) {
  const modeInfo = resolveMode(searchParams, config);

  if (modeInfo.mode === "mock" || isResearchLead(searchParams)) {
    return buildMockContactDetails(searchParams, modeInfo);
  }

  try {
    return await buildLiveContactDetails(searchParams, config, modeInfo);
  } catch (error) {
    const fallback = buildMockContactDetails(searchParams, {
      ...modeInfo,
      mode: "mock",
      reason: error.message
    });
    fallback.systemWarnings.push(`Live contact lookup failed; showing demo-shaped data. ${error.message}`);
    return fallback;
  }
}

function buildMockContactDetails(searchParams, modeInfo) {
  const accountId = searchParams.get("account_id") || "";
  const requesterEmail = searchParams.get("requester_email") || "";
  const context = applyManualSalesInputs(getMockContext({ accountId, requesterEmail }), searchParams);
  const analysis = buildOrgMapAnalysis(context);
  const node = findNode(analysis.nodes, searchParams);
  const contact = findContact(context.contacts, searchParams, node);

  if (!contact && node?.source === "LinkedIn research") {
    return buildResearchLeadDetails({ node, context, modeInfo });
  }

  const selected = contact || {
    id: searchParams.get("contact_id") || "",
    name: searchParams.get("name") || node?.name || "Unknown contact",
    email: searchParams.get("email") || node?.email || "",
    role: node?.title || "Role unknown",
    accountId: context.account.id,
    customFields: {}
  };

  return buildContactPayload({
    mode: modeInfo.mode,
    sourceNote: "Loaded on click from mock data shaped like Pylon's Contacts API response.",
    account: context.account,
    contact: selected,
    node,
    issues: relatedIssues(context.issues, selected),
    messages: relatedMessages(context.messages, selected, relatedIssues(context.issues, selected)),
    systemWarnings: [modeInfo.reason].filter(Boolean)
  });
}

async function buildLiveContactDetails(searchParams, config, modeInfo) {
  const client = new PylonClient({
    baseUrl: config.pylonApiBase,
    token: config.pylonApiToken
  });

  const contact = await fetchLiveContact(client, searchParams);
  const accountId = firstPresent(searchParams.get("account_id"), contact.accountId);
  let issues = [];
  let messages = [];

  if (accountId) {
    issues = extractData(await client.searchIssuesByAccount(accountId))
      .map(normalizeIssue)
      .filter((issue) => contactMatchesIssue(issue, contact))
      .slice(0, 6);

    for (const issue of issues.slice(0, 3)) {
      const payload = await client.getIssueMessages(issue.id);
      messages.push(...extractData(payload).map((message) => normalizeMessage(message, issue.id)));
    }
  }

  return buildContactPayload({
    mode: modeInfo.mode,
    sourceNote: "Loaded on click from Pylon's Contacts API.",
    account: { id: accountId, name: "" },
    contact,
    node: null,
    issues,
    messages: relatedMessages(messages, contact, issues),
    systemWarnings: []
  });
}

async function fetchLiveContact(client, searchParams) {
  const contactId = searchParams.get("contact_id") || "";
  const email = searchParams.get("email") || "";

  if (contactId && !isResearchLeadId(contactId)) {
    const payload = await client.getContact(contactId);
    return normalizeContact(payload.data || payload);
  }

  if (email) {
    const contacts = extractData(await client.searchContactsByEmail(email)).map(normalizeContact);
    if (contacts[0]) return contacts[0];
  }

  throw new Error("No Pylon contact id or email was available for this person.");
}

function buildResearchLeadDetails({ node, context, modeInfo }) {
  return {
    mode: modeInfo.mode,
    fetchedAt: new Date().toISOString(),
    sourceNote: "This person is a LinkedIn research lead and is not linked to a Pylon contact yet.",
    contact: {
      id: node.id,
      name: node.name,
      email: "",
      title: node.title,
      accountId: context.account.id,
      phone: "",
      portalRole: "",
      avatarUrl: ""
    },
    links: {
      pylonContact: "",
      salesforce: "",
      evidence: node.evidenceUrl || ""
    },
    crmFields: [
      { label: "Source", value: node.source },
      { label: "Research notes", value: node.notes },
      { label: "Suggested owner", value: node.owner }
    ].filter((field) => field.value),
    externalIds: [],
    integrationUserIds: [],
    relatedIssues: [],
    recentMessages: [],
    systemWarnings: [modeInfo.reason].filter(Boolean)
  };
}

function buildContactPayload({ mode, sourceNote, account, contact, node, issues, messages, systemWarnings }) {
  const fields = contact.customFields || {};
  // Link to the contact's account page in Pylon, not the contact record.
  const accountIdForLink = contact.accountId || account?.id || "";
  const pylonContact = accountIdForLink
    ? `https://app.usepylon.com/accounts/${encodeURIComponent(accountIdForLink)}`
    : "";

  return {
    mode,
    fetchedAt: new Date().toISOString(),
    sourceNote,
    contact: {
      id: contact.id || "",
      name: contact.name || contact.email || "Unknown contact",
      email: contact.email || "",
      emails: contact.emails || [contact.email].filter(Boolean),
      title: contact.role || contact.title || node?.title || "Role unknown",
      accountId: contact.accountId || account?.id || "",
      phone: firstPresent(contact.primaryPhoneNumber, contact.phoneNumbers?.[0]),
      phoneNumbers: contact.phoneNumbers || [],
      portalRole: contact.portalRole || "",
      avatarUrl: contact.avatarUrl || ""
    },
    links: {
      pylonContact,
      salesforce: salesforceUrl(contact),
      evidence: node?.evidenceUrl || issues[0]?.url || ""
    },
    crmFields: crmFields(contact, node),
    externalIds: contact.externalIds || [],
    integrationUserIds: contact.integrationUserIds || [],
    relatedIssues: issues.map((issue) => ({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      state: issue.state,
      priority: issue.priority,
      updatedAt: issue.updatedAt,
      url: issue.url
    })),
    recentMessages: messages.slice(0, 5).map((message) => ({
      id: message.id,
      issueId: message.issueId,
      author: message.author,
      bodyText: truncate(message.bodyText, 180),
      createdAt: message.createdAt,
      isInternal: message.isInternal
    })),
    systemWarnings
  };
}

function crmFields(contact, node) {
  const fields = Object.entries(contact.customFields || {}).map(([slug, value]) => ({
    label: humanize(slug),
    value
  }));

  if (node?.buyingRole) fields.unshift({ label: "Buying role", value: node.buyingRole });
  if (node?.relationship) fields.unshift({ label: "Relationship", value: node.relationship });
  if (node?.owner) fields.push({ label: "Internal owner", value: node.owner });

  const seen = new Set();
  return fields.filter((field) => {
    if (field.value === undefined || field.value === null || field.value === "") return false;
    const key = `${field.label}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function salesforceUrl(contact) {
  const fields = contact.customFields || {};
  return firstPresent(
    fields.salesforce_page,
    fields.salesforce_url,
    fields.salesforce_contact_url,
    fields.sf_contact_url
  );
}

function findNode(nodes, searchParams) {
  const contactId = searchParams.get("contact_id") || "";
  const email = (searchParams.get("email") || "").toLowerCase();
  const name = (searchParams.get("name") || "").toLowerCase();

  return nodes.find((node) =>
    (contactId && node.id === contactId) ||
    (email && node.email?.toLowerCase() === email) ||
    (name && node.name?.toLowerCase() === name)
  );
}

function findContact(contacts, searchParams, node) {
  const contactId = searchParams.get("contact_id") || node?.id || "";
  const email = (searchParams.get("email") || node?.email || "").toLowerCase();
  const name = (searchParams.get("name") || node?.name || "").toLowerCase();

  return contacts.find((contact) =>
    (contactId && contact.id === contactId) ||
    (email && contact.email?.toLowerCase() === email) ||
    (name && contact.name?.toLowerCase() === name)
  );
}

function relatedIssues(issues, contact) {
  return issues.filter((issue) => contactMatchesIssue(issue, contact)).slice(0, 6);
}

function contactMatchesIssue(issue, contact) {
  const requestText = [
    issue.requester?.id,
    issue.requester?.name,
    issue.requester?.email
  ].filter(Boolean).join(" ").toLowerCase();

  return [
    contact.id,
    contact.name,
    contact.email
  ].filter(Boolean).some((value) => requestText.includes(String(value).toLowerCase()));
}

function relatedMessages(messages, contact, issues = []) {
  const issueIds = new Set(issues.map((issue) => issue.id).filter(Boolean));
  const contactTokens = [contact.name, contact.email]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return messages.filter((message) => {
    if (issueIds.has(message.issueId)) return true;
    const authorText = [message.author?.name, message.author?.email].filter(Boolean).join(" ").toLowerCase();
    return contactTokens.some((token) => authorText.includes(token));
  });
}

function isResearchLead(searchParams) {
  return isResearchLeadId(searchParams.get("contact_id") || "") ||
    searchParams.get("source") === "LinkedIn research";
}

function isResearchLeadId(value) {
  return String(value || "").startsWith("linkedin_");
}

function extractData(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (payload?.data) return [payload.data];
  return [];
}

function humanize(value) {
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
