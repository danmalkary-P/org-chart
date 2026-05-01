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

  async searchAccountByDomain(domain) {
    return this.request("/accounts/search", {
      method: "POST",
      body: {
        limit: 1,
        filter: {
          operator: "AND",
          conditions: [
            {
              field: "domains",
              operator: "contains",
              value: domain
            }
          ]
        }
      }
    });
  }

  async searchContactsByEmail(email) {
    return this.request("/contacts/search", {
      method: "POST",
      body: {
        limit: 5,
        filter: {
          operator: "AND",
          conditions: [
            {
              field: "email",
              operator: "equals",
              value: email
            }
          ]
        }
      }
    });
  }

  async searchContactsByAccount(accountId) {
    return this.request("/contacts/search", {
      method: "POST",
      body: {
        limit: 25,
        filter: {
          operator: "AND",
          conditions: [
            {
              field: "account_id",
              operator: "equals",
              value: accountId
            }
          ]
        }
      }
    });
  }

  async searchIssuesByAccount(accountId) {
    return this.request("/issues/search", {
      method: "POST",
      body: {
        limit: 8,
        filter: {
          operator: "AND",
          conditions: [
            {
              field: "account_id",
              operator: "equals",
              value: accountId
            }
          ]
        }
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
      const message = payload?.message || payload?.error || response.statusText;
      throw new Error(`Pylon API ${response.status}: ${message}`);
    }

    return payload;
  }
}

export function normalizeAccount(raw = {}) {
  const owner = raw.owner || {};
  return {
    id: raw.id || "",
    name: raw.name || "Unknown account",
    domains: raw.domains || (raw.domain ? [raw.domain] : []),
    owner: {
      id: owner.id || raw.owner_id || "",
      name: owner.name || owner.email || "Account owner",
      email: owner.email || ""
    },
    crm: normalizeCrm(raw)
  };
}

export function normalizeContact(raw = {}) {
  const emails = normalizeEmails(raw);
  return {
    id: raw.id || "",
    name: raw.name || raw.email || "Unknown contact",
    email: raw.email || emails[0] || "",
    emails,
    role: raw.custom_fields?.role?.value || raw.title || "",
    accountId: raw.account?.id || raw.account_id || "",
    avatarUrl: raw.avatar_url || "",
    phoneNumbers: raw.phone_numbers || [],
    primaryPhoneNumber: raw.primary_phone_number || "",
    portalRole: raw.portal_role || "",
    portalRoleId: raw.portal_role_id || "",
    externalIds: raw.external_ids || [],
    integrationUserIds: raw.integration_user_ids || [],
    customFields: flattenCustomFields(raw.custom_fields)
  };
}

export function normalizeIssue(raw = {}) {
  const assignee = raw.assignee || {};
  const requester = raw.requester || raw.contact || {};
  return {
    id: raw.id || "",
    number: raw.number || raw.issue_number || "",
    title: raw.title || "Untitled issue",
    state: raw.state || raw.status || "",
    priority: raw.priority || "",
    tags: raw.tags || [],
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
    createdAt: raw.created_at || "",
    updatedAt: raw.updated_at || "",
    latestMessageActivityAt: raw.latest_message_activity_at || "",
    url: raw.url || (raw.id ? `https://app.usepylon.com/issues/${raw.id}` : ""),
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
    return Object.fromEntries(
      customFields.map((field) => [field.slug, field.value ?? field.values?.join(", ") ?? ""])
    );
  }

  return Object.fromEntries(
    Object.entries(customFields).map(([slug, field]) => [
      slug,
      field?.value ?? field?.values?.join(", ") ?? ""
    ])
  );
}

function normalizeEmails(raw = {}) {
  if (Array.isArray(raw.emails)) {
    return raw.emails
      .map((entry) => (typeof entry === "string" ? entry : entry?.email))
      .filter(Boolean);
  }

  return raw.email ? [raw.email] : [];
}
