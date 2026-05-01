import { formatList, firstPresent, truncate, uniqueBy } from "./utils.js";

const CLOSED_STATES = new Set(["closed", "resolved"]);

export function buildFollowUpAnalysis(context) {
  const openIssues = context.issues.filter((issue) => !CLOSED_STATES.has(issue.state));
  const highRiskIssues = openIssues.filter((issue) => {
    const tags = issue.tags?.join(" ") || "";
    return ["urgent", "high"].includes(issue.priority) || /risk|block|incident|sso|renewal/i.test(tags);
  });

  const calendar = context.signals.calendarEvents[0];
  const call = context.signals.callActivities[0];
  const linkedinPeople = context.signals.linkedinPeople || [];
  const risks = uniqueStrings([
    ...context.signals.supportRisks,
    ...highRiskIssues.map((issue) => `${issue.title} is still ${issue.state || "open"}.`)
  ]).slice(0, 4);
  const expansionHints = uniqueStrings(context.signals.expansionHints).slice(0, 4);
  const commitments = uniqueStrings(context.signals.recentCommitments).slice(0, 4);
  const primaryContact = selectPrimaryContact(context);

  const recap = [
    call?.summary ? `${call.source || "Call activity"}: ${call.summary}` : "",
    calendar?.summary ? `${calendar.source || "Calendar"}: ${calendar.summary}` : "",
    context.account.crm?.opportunityStage ? `CRM stage: ${context.account.crm.opportunityStage}.` : "",
    linkedinPeople.length
      ? `Potential multithread targets from LinkedIn: ${linkedinPeople.slice(0, 3).map((person) => person.name).join(", ")}.`
      : "",
    expansionHints[0]
  ].filter(Boolean);

  const nextSteps = commitments.length
    ? commitments
    : [
        "Confirm the customer's success criteria and timeline.",
        "Share a concise recap with any open support caveats clearly separated from the commercial ask."
      ];

  const warnings = risks.length
    ? risks.map((risk) => `Do not overpromise: ${truncate(risk, 180)}`)
    : ["No active support blockers found in the current context."];

  const subject = `${context.account.name} follow-up: recap and next steps`;
  const draftText = renderFollowUpDraft({
    context,
    primaryContact,
    recap,
    nextSteps,
    risks,
    expansionHints
  });

  return {
    confidence: calculateFollowUpConfidence({ call, calendar, openIssues, context }),
    subject,
    recap,
    nextSteps,
    manualInputs: {
      postCallNotes: call?.source === "Post-call notes",
      calendarEvent: Boolean(calendar),
      linkedinPeople
    },
    warnings,
    draftText,
    evidenceLinks: evidenceLinks(context)
  };
}

export function buildWarmIntroAnalysis(context) {
  const connectors = rankConnectors(context);
  const champion = selectPrimaryContact(context);
  const multithreadTargets = rankMultithreadTargets(context, connectors);
  const topConnector = connectors[0];

  const fallback = connectors.length === 0 || connectors[0].score < 45;
  const introAsk = fallback
    ? renderFallbackIntroAsk({ context, champion, multithreadTargets })
    : renderIntroAsk({ context, connector: topConnector, champion, multithreadTargets });

  return {
    confidence: fallback ? "Low" : connectors[0].score >= 80 ? "High" : "Medium",
    connectors,
    champion,
    multithreadTargets,
    introAsk,
    fallback,
    evidenceLinks: evidenceLinks(context)
  };
}

export function buildOrgMapAnalysis(context) {
  const connectors = rankConnectors(context);
  const multithreadTargets = rankMultithreadTargets(context, connectors);
  const contactNodes = context.contacts.map((contact) => buildContactNode({ contact, context, connectors }));
  const linkedinNodes = multithreadTargets.map((person) => buildLinkedInNode({ person, connectors }));
  const nodes = uniqueBy([...contactNodes, ...linkedinNodes], (node) => node.email || node.name);
  const groupedLevels = groupOrgNodes(nodes);
  const coverage = calculateOrgCoverage(nodes);
  const gaps = findOrgGaps(coverage);
  const nextMoves = buildOrgNextMoves({ context, nodes, connectors, multithreadTargets, gaps });

  return {
    accountId: context.account.id,
    accountName: context.account.name,
    confidence: coverage.score >= 75 ? "High" : coverage.score >= 50 ? "Medium" : "Low",
    coverage,
    nodes,
    groupedLevels,
    gaps,
    connectors,
    nextMoves,
    evidenceLinks: evidenceLinks(context)
  };
}

function renderFollowUpDraft({ context, primaryContact, recap, nextSteps, risks, expansionHints }) {
  const firstName = primaryContact.name?.split(" ")[0] || "there";
  const multithreadParagraph = context.signals.linkedinPeople?.length
    ? `I also saw a few possible stakeholders to multithread with: ${context.signals.linkedinPeople
        .slice(0, 3)
        .map((person) => `${person.name}${person.title ? ` (${person.title})` : ""}`)
        .join(", ")}. I would treat those as research leads until we have a warm path.`
    : "";
  const riskParagraph = risks.length
    ? `I also want to be precise on the open support items: ${risks.map((risk) => risk.replace(/\.$/, "")).join("; ")}. I will keep those separate from rollout timing until the owners confirm status.`
    : "I did not see active support blockers in the current Pylon context, so the next step can stay focused on confirming fit, timing, and rollout criteria.";

  const expansionParagraph = expansionHints.length
    ? `The strongest expansion signals I saw were: ${expansionHints.join(" ")}`
    : "The current signal is early, so I would keep the ask lightweight and centered on next-step clarity.";

  const draftLines = [
    `Hi ${firstName},`,
    "",
    `Thanks for the conversation about ${context.account.name}. I wanted to send a crisp recap and make sure we are tracking the right next steps.`,
    "",
    "My read from the discussion:",
    formatList(recap.length ? recap : ["Confirm goals, rollout path, and success criteria."]),
    "",
    riskParagraph,
    ""
  ];

  if (multithreadParagraph) {
    draftLines.push(multithreadParagraph, "");
  }

  draftLines.push(
    expansionParagraph,
    "",
    "Next steps:",
    formatList(nextSteps),
    "",
    "I will follow up with the right owners and keep the commercial next steps tied to what is actually confirmed.",
    "",
    "Best,"
  );

  return draftLines.join("\n");
}

function renderIntroAsk({ context, connector, champion, multithreadTargets }) {
  const championName = champion.name || champion.email || "the customer contact";
  const topTarget = multithreadTargets[0];
  const multithreadLine = topTarget
    ? `If it is appropriate, I also want to learn whether ${topTarget.name}${topTarget.title ? ` (${topTarget.title})` : ""} should be included as a second thread.`
    : "I am also checking whether there is a good second thread we should add before the next meeting.";

  return [
    `Hey ${connector.name.split(" ")[0] || connector.name} - I am working on the ${context.account.name} conversation and it looks like you have the warmest path to ${championName}.`,
    "",
    `Why I am asking: ${connector.reason}`,
    "",
    multithreadLine,
    "",
    "Could you either introduce me or give me the two-minute version of what matters most before I follow up? I will keep the ask narrow and avoid stepping on any open support commitments."
  ].join("\n");
}

function renderFallbackIntroAsk({ context, champion, multithreadTargets }) {
  const target = multithreadTargets[0];
  if (target) {
    return `I do not have a strong internal warm path for ${context.account.name} yet. The best multithread lead from LinkedIn is ${target.name}${target.title ? ` (${target.title})` : ""}. Suggested next move: ask the account owner who may know ${target.name} or ${champion.name || "the current buyer"} before reaching out cold.`;
  }

  return `I do not have a strong warm intro path for ${context.account.name} yet. Suggested next move: ask the account owner who has the strongest relationship with ${champion.name || "the buyer"} and check recent Pylon threads before reaching out.`;
}

function rankConnectors(context) {
  const fromRelationshipEvents = context.signals.relationshipEvents.map((event) => ({
    id: event.person.id || event.person.email || event.person.name,
    name: event.person.name || event.person.email || "Unknown teammate",
    email: event.person.email || "",
    role: event.person.role || "Internal teammate",
    score: event.strength || 60,
    reason: event.reason || "Inferred from Pylon relationship activity.",
    contact: event.contact || "",
    evidenceUrl: event.evidenceUrl || ""
  }));

  const fromIssueAssignees = context.issues
    .filter((issue) => issue.assignee?.name || issue.assignee?.email)
    .map((issue) => ({
      id: issue.assignee.id || issue.assignee.email || issue.assignee.name,
      name: firstPresent(issue.assignee.name, issue.assignee.email),
      email: issue.assignee.email || "",
      role: "Pylon issue owner",
      score: issue.state === "closed" ? 48 : issue.priority === "high" ? 72 : 62,
      reason: `Owned "${issue.title}" for this account.`,
      contact: firstPresent(issue.requester?.name, issue.requester?.email),
      evidenceUrl: issue.url || ""
    }));

  const accountOwner = context.account.owner?.name || context.account.owner?.email
    ? [
        {
          id: context.account.owner.id || context.account.owner.email,
          name: firstPresent(context.account.owner.name, context.account.owner.email),
          email: context.account.owner.email || "",
          role: "Account owner",
          score: 70,
          reason: "Listed as the account owner in Pylon/CRM context.",
          contact: context.contacts[0]?.name || "",
          evidenceUrl: ""
        }
      ]
    : [];

  const merged = new Map();
  for (const connector of [...fromRelationshipEvents, ...fromIssueAssignees, ...accountOwner]) {
    const key = connector.id || connector.email || connector.name;
    const existing = merged.get(key);
    if (!existing || connector.score > existing.score) {
      merged.set(key, connector);
    } else {
      existing.reason = `${existing.reason} Also: ${connector.reason}`;
      existing.score = Math.max(existing.score, connector.score);
    }
  }

  return [...merged.values()].sort((a, b) => b.score - a.score).slice(0, 5);
}

function rankMultithreadTargets(context, connectors) {
  const existingEmails = new Set(context.contacts.map((contact) => contact.email).filter(Boolean));
  const connector = connectors[0];

  return (context.signals.linkedinPeople || [])
    .map((person) => {
      const title = person.title || "";
      const notes = person.notes || "";
      const seniorityScore = /chief|cxo|ceo|coo|cro|cfo|vp|vice president|head|director/i.test(title) ? 28 : 12;
      const buyingRoleScore = /revops|revenue|operations|it|security|finance|procurement|support|customer/i.test(`${title} ${notes}`) ? 22 : 8;
      const companyScore = person.company && context.account.name.toLowerCase().includes(person.company.toLowerCase()) ? 10 : 0;
      const knownContactPenalty = existingEmails.has(person.email) ? -10 : 0;
      const score = Math.max(30, Math.min(95, 35 + seniorityScore + buyingRoleScore + companyScore + knownContactPenalty));

      return {
        ...person,
        score,
        suggestedPath: connector
          ? `Ask ${connector.name} whether ${person.name} is a credible second thread.`
          : "Ask the account owner for a relationship check before reaching out.",
        reason: buildMultithreadReason({ person, score })
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

function buildContactNode({ contact, context, connectors }) {
  const roleText = `${contact.role || ""} ${JSON.stringify(contact.customFields || {})}`;
  const relatedIssues = context.issues.filter((issue) => {
    const requester = `${issue.requester?.name || ""} ${issue.requester?.email || ""}`.toLowerCase();
    return requester.includes((contact.email || contact.name || "").toLowerCase()) ||
      requester.includes((contact.name || "").toLowerCase());
  });
  const owner = selectOwnerForContact({ contact, connectors });
  const relationship = inferRelationshipStatus({ roleText, relatedIssues, contact });
  const buyingRole = inferBuyingRole(roleText, relationship);

  return {
    id: contact.id || contact.email || contact.name,
    name: contact.name || contact.email || "Unknown contact",
    email: contact.email || "",
    title: contact.role || contact.customFields?.title || "Role unknown",
    level: inferOrgLevel(roleText),
    department: contact.customFields?.department || "",
    buyingRole,
    relationship,
    owner: owner?.name || "Unowned",
    ownerReason: owner?.reason || "No internal owner found yet.",
    source: "Pylon contact",
    score: relationshipScore(relationship, owner),
    evidenceUrl: relatedIssues[0]?.url || owner?.evidenceUrl || "",
    notes: buildNodeNotes({ contact, relatedIssues }),
    aiFields: extractAiFields(contact.customFields)
  };
}

function extractAiFields(customFields = {}) {
  const sentiment = pickSentiment(customFields);
  return {
    sentiment,
    sentimentReason: customFields.low_sentiment_reason || customFields.sentiment_reason || customFields.sentiment || "",
    summary: customFields.ai_summary || customFields.account_summary || "",
    engagementTrend: customFields.engagement_trend || ""
  };
}

function pickSentiment(customFields) {
  const explicit = (customFields.ai_sentiment || customFields.sentiment_label || "").toString().toLowerCase();
  if (explicit) {
    if (/posit|champion|happy|strong/.test(explicit)) return "positive";
    if (/negat|low|risk|block|frustrat|angry/.test(explicit)) return "negative";
    if (/neutral|mixed|caution/.test(explicit)) return "neutral";
  }
  if (customFields.low_sentiment === true || customFields.low_sentiment === "true") return "negative";
  const text = `${customFields.sentiment || ""}`.toLowerCase();
  if (/block|risk|frustrat|angry|negat/.test(text)) return "negative";
  if (/champion|positive|interested|engag/.test(text)) return "positive";
  if (text) return "neutral";
  return "";
}

function buildLinkedInNode({ person, connectors }) {
  const owner = connectors[0];
  return {
    id: person.id,
    name: person.name,
    email: "",
    title: person.title || "Role unknown",
    level: inferOrgLevel(`${person.title || ""} ${person.notes || ""}`, "LinkedIn research"),
    buyingRole: inferBuyingRole(`${person.title || ""} ${person.notes || ""}`, "Research lead"),
    relationship: "Research lead",
    owner: owner?.name || "Unowned",
    ownerReason: person.suggestedPath || "Ask the account owner to validate this path.",
    source: "LinkedIn research",
    score: person.score,
    evidenceUrl: person.linkedinUrl,
    notes: person.reason
  };
}

function selectOwnerForContact({ contact, connectors }) {
  const contactName = (contact.name || "").toLowerCase();
  const contactEmail = (contact.email || "").toLowerCase();

  return connectors.find((connector) => {
    const target = `${connector.contact || ""}`.toLowerCase();
    return target.includes(contactName) || target.includes(contactEmail);
  }) || connectors[0];
}

function inferRelationshipStatus({ roleText, relatedIssues, contact }) {
  const customText = `${JSON.stringify(contact.customFields || {})} ${roleText}`;
  if (/block|blocked|blocker|risk|angry|frustrat|opposed|not fixed/i.test(customText)) return "Blocker / risk";
  if (relatedIssues.some((issue) => /block|risk|sso|incident|urgent/i.test(`${issue.title} ${issue.tags?.join(" ")}`))) {
    return "Blocker / risk";
  }
  if (/champion|coach|interested|positive|economic buyer/i.test(customText)) return "Champion / coach";
  if (/assistant|chief of staff|ea\b/i.test(roleText)) return "Access path";
  if (/vp|chief|head|director|buyer/i.test(roleText)) return "Decision maker";
  return "Unknown";
}

function inferBuyingRole(text, relationship = "") {
  if (/economic|budget|cfo|cro|chief|vp revenue|revenue operations/i.test(text)) return "Economic buyer";
  if (/security|it|engineering|sso|admin|technical|procurement|legal/i.test(text)) return "Technical approver";
  if (/assistant|chief of staff|ea\b/i.test(text)) return "Access path";
  if (/operations|rollout|support|customer|success/i.test(text)) return "Operational buyer";
  if (relationship === "Research lead") return "Potential stakeholder";
  if (relationship === "Champion / coach") return "Champion";
  return "Unknown buying role";
}

function inferOrgLevel(text, fallback = "Working Team") {
  if (/assistant|chief of staff|ea\b/i.test(text)) return "Access Path";
  if (/\b(chief|ceo|cfo|coo|cro|cto|cio|ciso|cxo|founder)\b/i.test(text)) return "Executive";
  if (/vp|vice president|head of|gm\b/i.test(text)) return "VP / Head";
  if (/director|manager|lead/i.test(text)) return "Director / Manager";
  if (fallback === "LinkedIn research") return "Research Leads";
  return "Working Team";
}

function groupOrgNodes(nodes) {
  const order = ["Executive", "VP / Head", "Director / Manager", "Working Team", "Access Path", "Research Leads"];
  return order
    .map((level) => ({
      level,
      nodes: nodes.filter((node) => node.level === level).sort((a, b) => b.score - a.score)
    }))
    .filter((group) => group.nodes.length);
}

function calculateOrgCoverage(nodes) {
  const hasEconomicBuyer = nodes.some((node) => node.buyingRole === "Economic buyer");
  const hasTechnicalApprover = nodes.some((node) => node.buyingRole === "Technical approver");
  const hasChampion = nodes.some((node) => node.relationship === "Champion / coach");
  const hasRisk = nodes.some((node) => node.relationship === "Blocker / risk");
  const hasResearchLead = nodes.some((node) => node.relationship === "Research lead");
  const ownedCount = nodes.filter((node) => node.owner !== "Unowned").length;
  const score = Math.min(
    100,
    (hasEconomicBuyer ? 24 : 0) +
      (hasTechnicalApprover ? 20 : 0) +
      (hasChampion ? 22 : 0) +
      (hasRisk ? 12 : 0) +
      (hasResearchLead ? 10 : 0) +
      Math.round((ownedCount / Math.max(nodes.length, 1)) * 12)
  );

  return {
    score,
    hasEconomicBuyer,
    hasTechnicalApprover,
    hasChampion,
    hasRisk,
    hasResearchLead,
    ownedCount,
    totalPeople: nodes.length
  };
}

function findOrgGaps(coverage) {
  return [
    coverage.hasEconomicBuyer ? "" : "No clear economic buyer mapped.",
    coverage.hasTechnicalApprover ? "" : "No clear technical approver mapped.",
    coverage.hasChampion ? "" : "No confirmed champion or coach mapped.",
    coverage.hasResearchLead ? "" : "No LinkedIn multithread research leads added yet."
  ].filter(Boolean);
}

function buildOrgNextMoves({ context, nodes, connectors, multithreadTargets, gaps }) {
  const moves = [];
  const blocker = nodes.find((node) => node.relationship === "Blocker / risk");
  const champion = nodes.find((node) => node.relationship === "Champion / coach" || node.buyingRole === "Economic buyer");
  const topResearchLead = multithreadTargets[0];
  const topConnector = connectors[0];

  if (blocker) {
    moves.push(`Resolve or contain ${blocker.name}'s blocker before asking for broader rollout commitment.`);
  }
  if (champion && topResearchLead) {
    moves.push(`Ask ${champion.name} whether ${topResearchLead.name} should join the next conversation.`);
  } else if (topResearchLead && topConnector) {
    moves.push(`Ask ${topConnector.name} to validate ${topResearchLead.name} as a multithread path.`);
  }
  if (gaps.length) {
    moves.push(`Fill account-map gap: ${gaps[0]}`);
  }
  moves.push(`Keep the org map tied to Pylon evidence before adding new people to ${context.account.name}.`);

  return uniqueStrings(moves).slice(0, 4);
}

function relationshipScore(relationship, owner) {
  const base = {
    "Champion / coach": 86,
    "Decision maker": 76,
    "Blocker / risk": 72,
    "Access path": 62,
    Unknown: 42
  }[relationship] || 48;
  return owner ? Math.min(95, base + 8) : base;
}

function buildNodeNotes({ contact, relatedIssues }) {
  const notes = [];
  // Sentiment now surfaces as its own AI pill in the sidebar — keep it out of free-text notes.
  if (contact.customFields?.buying_role) notes.push(`Buying role: ${contact.customFields.buying_role}.`);
  if (relatedIssues[0]) notes.push(`Recent issue: ${relatedIssues[0].title}.`);
  return notes.join(" ");
}

function buildMultithreadReason({ person, score }) {
  const details = [];
  if (/chief|cxo|ceo|coo|cro|cfo|vp|vice president|head|director/i.test(person.title || "")) {
    details.push("senior enough to influence evaluation");
  }
  if (/revops|revenue|operations|it|security|finance|procurement|support|customer/i.test(`${person.title || ""} ${person.notes || ""}`)) {
    details.push("role maps to rollout, budget, security, or operations");
  }
  if (person.notes) {
    details.push(person.notes);
  }
  return details.length
    ? `${details.join("; ")}. Score ${score}/100 from LinkedIn manual input.`
    : `Potential second thread from LinkedIn manual input. Score ${score}/100.`;
}

function selectPrimaryContact(context) {
  const economicBuyer = context.contacts.find((contact) =>
    /economic|buyer|vp|chief|head/i.test(`${contact.role} ${JSON.stringify(contact.customFields || {})}`)
  );
  return economicBuyer || context.contacts[0] || { name: "", email: "" };
}

function calculateFollowUpConfidence({ call, calendar, openIssues, context }) {
  let score = 35;
  if (call) score += 25;
  if (calendar) score += 15;
  if (context.messages.length) score += 15;
  if (openIssues.length) score += 10;

  if (score >= 80) return "High";
  if (score >= 55) return "Medium";
  return "Low";
}

function evidenceLinks(context) {
  return uniqueBy(
    [
      ...context.issues.map((issue) => ({
        label: issue.number ? `Pylon issue #${issue.number}` : issue.title,
        url: issue.url
      })),
      ...context.signals.relationshipEvents.map((event) => ({
        label: `${event.person.name || "Connector"} evidence`,
        url: event.evidenceUrl
      })),
      ...(context.signals.linkedinPeople || []).map((person) => ({
        label: `${person.name} on LinkedIn`,
        url: person.linkedinUrl
      }))
    ].filter((item) => item.url),
    (item) => item.url
  ).slice(0, 5);
}

function uniqueStrings(items) {
  return [...new Set(items.filter(Boolean))];
}
