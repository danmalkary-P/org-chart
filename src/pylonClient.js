import { stripHtml } from "./utils.js";

export class PylonClient {
  constructor({ baseUrl, token }) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async getAccount(id) {
    return this.request(`/accounts/${encodeURIComponent(id)}`);
  }

  async getContact(id) {
    return this.request(`/contacts/${encodeURIComponent(id)}?limit=1`);
  }

  async listAccounts(limit = 100) {
    return this.request(`/accounts?limit=${limit}`);
  }

  async searchAccountsByName(query, limit = 10) {
    return this.request("/accounts/search", {
      method: "POST",
      body: {
        limit,
        filter: { field: "name", operator: "string_contains", value: query }
      }
    });
  }

  async searchAccountByDomain(domain) {
    return this.request("/accounts/search", {
      method: "POST",
      body: {
        limit: 1,
        filter: { field: "domains", operator: "contains", value: domain }
      }
    });
  }

  async searchContactsByEmail(email) {
    return this.request("/contacts/search", {
      method: "POST",
      body: {
        limit: 5,
        filter: { field: "email", operator: "equals", value: email }
      }
    });
  }

  async searchContactsByAccount(accountId) {
    return this.request("/contacts/search", {
      method: "POST",
      body: {
        limit: 50,
        filter: { field: "account_id", operator: "equals", value: accountId }
      }
    });
  }

  async searchIssuesByAccount(accountId) {
    return this.request("/issues/search", {
      method: "POST",
      body: {
        limit: 25,
        filter: { field: "account_id", operator: "equals", value: accountId }
      }
    });
  }

  async getIssueMessages(issueId) {
    return this.request(`/issues/${encodeURIComponent(issueId)}/messages`);
  }

  async request(path, { method = "GET", body } = {}) {
    if (!this.token) {
      throw new Error("PYLON_API_TOKEN is required for live mode.");
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};

    if (!response.ok) {
      const message = payload?.errors?.join("; ") || payload?.message || payload?.error || response.statusText;
      throw new Error(`Pylon API ${response.status} ${path}: ${message}`);
    }

    return payload;
  }
}

export function normalizeAccount(raw = {}) {
  const owner = raw.owner || {};
  const fields = flattenCustomFields(raw.custom_fields);
  return {
    id: raw.id || "",
    name: raw.name || "Unknown account",
    domains: raw.domains || (raw.domain ? [raw.domain] : []),
    tags: raw.tags || [],
    type: raw.type || "",
    owner: {
      id: owner.id || raw.owner_id || "",
      name: owner.name || owner.email || "Account owner",
      email: owner.email || ""
    },
    channels: raw.channels || [],
    latestActivityAt: raw.latest_customer_activity_time || "",
    sentiment: pickSentiment(fields),
    health: {
      score: numberOrNull(fields.health_score ?? fields.beta_health_score ?? fields.health_health_score),
      change30d: numberOrNull(fields.change_in_health_score_30d ?? fields.percentage_health_change_30_days),
      relationshipStrength: fields.relationship_strength || "",
      churnRisk: fields.health_churn_risk || "",
      engagementLevel: fields.health_engagement_level || "",
      avgResponseTimeHours: numberOrNull(fields.health_avg_response_time_hours),
      openIssuesCount: numberOrNull(fields.health_open_issues_count),
      daysSinceLastIssue: numberOrNull(fields.health_days_since_last_issue),
      csatScore: numberOrNull(fields.health_csat_score),
      npsScore: numberOrNull(fields.health_nps_score)
    },
    salesforce: {
      arr: numberOrNull(fields["account.salesforce.Current_ARR__c"] ?? fields["salesforce.arr"]),
      renewalDate: fields["account.salesforce.Renewal_Date__c"] || fields["salesforce.renewal_date"] || "",
      seatTier: fields["account.salesforce.Seat_Tier__c"] || fields["salesforce.seat_tier"] || "",
      products: arrayOrEmpty(fields["account.salesforce.Product_List__c"] || fields["salesforce.products"]),
      paidSeats: numberOrNull(fields["account.salesforce.Paid_Seats__c"] ?? fields["salesforce.paidseats"]),
      utilizedSeats: numberOrNull(fields.health_weekly_utilized_seats),
      annualRevenue: numberOrNull(fields["account.salesforce.AnnualRevenue"]),
      employees: numberOrNull(fields["account.salesforce.NumberOfEmployees"]),
      latestOpportunityName: fields["account.salesforce.Latest_Open_Opportunity_Name__c"] || "",
      latestOpportunityCloseDate: fields["account.salesforce.Latest_Open_Opportunity_Close_Date__c"] || "",
      latestOpportunityArr: numberOrNull(fields["account.salesforce.Latest_Open_Opportunity_Expansion_ARR__c"]),
      latestOpportunityForecast: fields["account.salesforce.Latest_Open_Opportunity_Forecast_Cat__c"] || "",
      contractNotes: fields["account.salesforce.Contract_Notes__c"] || "",
      dealStage: fields["salesforce.dealstage"] || ""
    },
    lifecycleStage: fields.lifecycle_stage || "",
    industry: fields.industry || fields.company_industry || fields.company_industry_v2 || "",
    employees: numberOrNull(fields.employee_count ?? fields.employee_count_web),
    upsellSignals: arrayOrEmpty(fields.upsell_signal_v3 || fields.upsell_potential || fields.upsell_opportunities_ai || fields.health_upsell_opportunity),
    riskSignals: arrayOrEmpty(fields.risk_signal || fields.potential_save_signals_v2 || fields.health_churn_risk),
    accountIntelligenceSignals: arrayOrEmpty(fields.account_intelligence_signal || fields.account_intel_signal_v2),
    aiSummaries: {
      kickOffContext: fields.kick_off_context || "",
      kickOffGoals: fields.kick_off_goals || "",
      lastCallSummary: fields.last_call_summary || fields["custom_call_recorder.last_call_summary"] || "",
      upsellSummary: fields.account_intelligence_upsell_summary_claude || fields.am_upsell_signal || fields.health_upsell_opportunity || "",
      reasonsToReachOut: fields.reasons_to_reach_out || ""
    },
    nextSteps: fields.account_next_steps || fields.next_steps || fields.onboarding_next_steps || "",
    nextStepsCurrentStatus: fields.next_steps_current_status || "",
    meetings: {
      lastMeetingDate: fields["calendar.last_meeting_date"] || fields.last_meeting_date || "",
      nextMeetingDate: fields["calendar.next_meeting_date"] || fields.next_meeting || "",
      meetingsLast365d: numberOrNull(fields.total_meetings_365_days)
    },
    championName: fields.champion_name_ai_generated || "",
    issueCount30d: numberOrNull(fields.issue_count_30d),
    openIssuesLast90d: numberOrNull(fields.open_issues_with_pylon_last_90_days ?? fields.health_open_issues_count),
    crm: normalizeCrm(raw),
    rawFields: fields
  };
}

export function normalizeContact(raw = {}) {
  const emails = normalizeEmails(raw);
  const fields = flattenCustomFields(raw.custom_fields);
  // Pylon stores contact titles inconsistently across customers (Salesforce sync,
  // HubSpot sync, manual custom fields). Try the common locations in order.
  const role = fields["contact.salesforce.Title"]
    || fields["contact.hubspot.Title"]
    || fields["contact.hubspot.jobtitle"]
    || fields["contact.title"]
    || fields.title
    || fields.job_title
    || fields.jobtitle
    || fields.contact_title
    || fields.role
    || fields.position
    || raw.title
    || raw.job_title
    || "";
  return {
    id: raw.id || "",
    name: raw.name || raw.email || "Unknown contact",
    email: raw.email || emails[0] || "",
    emails,
    role,
    accountId: raw.account?.id || raw.account_id || "",
    avatarUrl: raw.avatar_url || "",
    phoneNumbers: raw.phone_numbers || [],
    primaryPhoneNumber: raw.primary_phone_number || "",
    portalRole: raw.portal_role || "",
    portalRoleId: raw.portal_role_id || "",
    externalIds: raw.external_ids || [],
    integrationUserIds: raw.integration_user_ids || [],
    linkedinUrl: fields["salesforce.LinkedIn_URL__c"] || fields.linkedin_url || "",
    sentiment: pickContactSentiment(fields),
    aiSummary: fields.ai_summary || fields.contact_ai_summary || "",
    lastMeetingDate: fields["calendar.contact.last_meeting_date"] || "",
    inSlackChannel: fields.in_slack_channel === "true",
    userStory: fields.user_story || "",
    customFields: fields
  };
}

export function normalizeIssue(raw = {}) {
  const assignee = raw.assignee || {};
  const requester = raw.requester || raw.contact || {};
  const fields = flattenCustomFields(raw.custom_fields);
  return {
    id: raw.id || "",
    number: raw.number || raw.issue_number || "",
    title: raw.title || "Untitled issue",
    state: raw.state || raw.status || "",
    priority: raw.priority || fields.priority || "",
    tags: raw.tags || [],
    productArea: fields.product_area || "",
    feature: fields.feature || "",
    type: raw.type || "",
    source: raw.source || "",
    team: raw.team?.name || "",
    assignee: {
      id: assignee.id || raw.assignee_id || "",
      name: assignee.name || assignee.email || "",
      email: assignee.email || ""
    },
    requester: {
      id: requester.id || raw.requester_id || "",
      name: requester.name || requester.email || "",
      email: requester.email || ""
    },
    externalIssues: raw.external_issues || [],
    createdAt: raw.created_at || "",
    updatedAt: raw.updated_at || "",
    latestMessageActivityAt: raw.latest_message_activity_at || raw.latest_message_time || "",
    firstResponseTime: raw.first_response_time || "",
    url: raw.link || raw.url || (raw.number ? `https://app.usepylon.com/issues?issueNumber=${raw.number}` : raw.id ? `https://app.usepylon.com/issues/${raw.id}` : ""),
    bodyText: stripHtml(raw.body_html || raw.body || "")
  };
}

export function normalizeMessage(raw = {}, issueId = "") {
  const author = raw.author || {};
  const contact = author.contact || {};
  const user = author.user || {};
  const name = author.name || contact.name || user.name || contact.email || user.email || "Unknown";
  const email = contact.email || user.email || "";
  return {
    issueId,
    id: raw.id || "",
    author: {
      name,
      email,
      type: contact.id ? "contact" : "user"
    },
    bodyText: stripHtml(raw.body_html || raw.body || raw.text || ""),
    createdAt: raw.created_at || "",
    isInternal: Boolean(raw.is_internal || raw.internal || raw.note)
  };
}

function normalizeCrm(raw) {
  const fields = flattenCustomFields(raw.custom_fields);
  const crmDetails = raw.crm_settings?.details || [];
  return {
    source: crmDetails.map((detail) => detail.source).filter(Boolean).join(", "),
    opportunityName: fields.opportunity_name || fields.opportunity || "",
    opportunityStage: fields.opportunity_stage || fields.stage || "",
    opportunityAmount: fields.arr || fields.amount || fields.opportunity_amount || "",
    renewalDate: fields.renewal_date || "",
    health: fields.health || fields.account_health || "",
    raw: fields
  };
}

function flattenCustomFields(customFields = {}) {
  if (Array.isArray(customFields)) {
    return Object.fromEntries(customFields.map((f) => [f.slug, fieldValue(f)]));
  }
  return Object.fromEntries(Object.entries(customFields).map(([slug, f]) => [slug, fieldValue(f)]));
}

function fieldValue(field) {
  if (!field) return "";
  if (Array.isArray(field.interpreted_values) && field.interpreted_values.length) return field.interpreted_values;
  if (Array.isArray(field.values) && field.values.length) return field.values;
  if (field.interpreted_value !== undefined && field.interpreted_value !== "") return field.interpreted_value;
  if (field.value !== undefined && field.value !== "") return field.value;
  return "";
}

function pickSentiment(fields) {
  const candidates = [
    fields.account_sentiment_v2,
    fields.account_sentiment,
    fields.sentiment,
    fields.sentiment_manual,
    fields.classify_customer_sentiment,
    fields.sentimentt
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c;
  }
  return "";
}

function pickContactSentiment(fields) {
  const candidates = [
    fields.contact_sentiment,
    fields.ai_sentiment,
    fields.sentiment
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c;
  }
  return "";
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function arrayOrEmpty(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value];
  return [];
}

function normalizeEmails(raw = {}) {
  if (Array.isArray(raw.emails)) {
    return raw.emails
      .map((entry) => (typeof entry === "string" ? entry : entry?.email))
      .filter(Boolean);
  }

  return raw.email ? [raw.email] : [];
}
