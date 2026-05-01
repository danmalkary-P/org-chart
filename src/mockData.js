import { safeJsonClone } from "./utils.js";

const mockContexts = {
  "acme-risk": {
    mode: "mock",
    account: {
      id: "acme-risk",
      name: "Acme Robotics",
      domains: ["acmerobotics.com"],
      owner: {
        id: "usr_dana",
        name: "Dana Lee",
        email: "dana@yourcompany.com"
      },
      crm: {
        source: "Salesforce",
        opportunityName: "Acme Robotics Enterprise Expansion",
        opportunityStage: "Mutual evaluation",
        opportunityAmount: "$148k ARR",
        renewalDate: "2026-06-30",
        health: "At risk, expansion active",
        nextMeeting: "2026-05-04T17:00:00Z"
      }
    },
    departments: [
      { id: "dept_sales", name: "Sales", description: "AEs, SDRs, Sales management", color: "blue" },
      { id: "dept_support", name: "Support", description: "Customer support & success", color: "green" },
      { id: "dept_engineering", name: "Engineering", description: "Product & engineering teams", color: "purple" },
      { id: "dept_revops", name: "Revenue Ops", description: "RevOps & analytics", color: "orange" },
      { id: "dept_it", name: "IT", description: "IT infrastructure & security", color: "grey" }
    ],
    contacts: [
      {
        id: "con_marty",
        name: "Marty Reynolds",
        email: "marty.reynolds@acmerobotics.com",
        role: "CEO",
        accountId: "acme-risk",
        customFields: {
          buying_role: "Executive sponsor",
          sentiment: "Aware, supportive",
          ai_sentiment: "Positive",
          low_sentiment: false,
          ai_summary: "Executive sponsor for the enterprise rollout. Delegates technical decisions to Advith.",
          engagement_trend: "Stable",
          department: "Executive",
          lifecycle_stage: "Renewal"
        }
      },
      {
        id: "con_advith",
        name: "Advith Kurpad",
        email: "advith.kurpad@acmerobotics.com",
        role: "CTO",
        accountId: "acme-risk",
        customFields: {
          buying_role: "Technical decision maker",
          sentiment: "Cautious on security",
          ai_sentiment: "Neutral",
          low_sentiment: false,
          ai_summary: "Owns technical evaluation. Concerned about SSO and data export security.",
          engagement_trend: "Stable",
          department: "Engineering",
          lifecycle_stage: "Technical validation"
        }
      },
      {
        id: "con_jordan",
        name: "Jordan Avery",
        email: "jordan.avery@acmerobotics.com",
        role: "VP Operations",
        accountId: "acme-risk",
        customFields: {
          buying_role: "Operations champion",
          sentiment: "Enthusiastic",
          ai_sentiment: "Positive",
          low_sentiment: false,
          ai_summary: "Driving the 120-seat operations expansion. Key champion for field rollout.",
          engagement_trend: "Increasing",
          department: "Operations",
          lifecycle_stage: "Expansion evaluation"
        }
      },
      {
        id: "con_mia",
        name: "Mia Chen",
        email: "mia.chen@acmerobotics.com",
        role: "VP Revenue Operations",
        accountId: "acme-risk",
        phoneNumbers: ["14155550123"],
        primaryPhoneNumber: "14155550123",
        externalIds: [
          {
            label: "salesforce",
            external_id: "003ACME000MIA"
          }
        ],
        integrationUserIds: [
          {
            source: "salesforce",
            id: "003ACME000MIA"
          }
        ],
        customFields: {
          buying_role: "Economic buyer",
          sentiment: "Interested, cautious",
          ai_sentiment: "Positive",
          low_sentiment: false,
          ai_summary: "Strong champion driving expansion eval. Asking for case studies and pricing guardrails.",
          engagement_trend: "Increasing",
          salesforce_page: "https://salesforce.example.com/lightning/r/Contact/003ACME000MIA/view",
          department: "Revenue Operations",
          lifecycle_stage: "Expansion evaluation"
        }
      },
      {
        id: "con_omar",
        name: "Omar Silva",
        email: "omar.silva@acmerobotics.com",
        role: "Director of IT",
        accountId: "acme-risk",
        phoneNumbers: ["14155550987"],
        primaryPhoneNumber: "14155550987",
        externalIds: [
          {
            label: "salesforce",
            external_id: "003ACME000OMAR"
          }
        ],
        integrationUserIds: [
          {
            source: "salesforce",
            id: "003ACME000OMAR"
          }
        ],
        customFields: {
          buying_role: "Technical approver",
          sentiment: "Blocked on SSO",
          ai_sentiment: "Negative",
          low_sentiment: true,
          low_sentiment_reason: "Repeated SSO redirect failures over 14 days. Renewal risk if unresolved.",
          ai_summary: "Technical blocker. SSO migration stalled, frustration trending up.",
          engagement_trend: "Declining",
          salesforce_page: "https://salesforce.example.com/lightning/r/Contact/003ACME000OMAR/view",
          department: "IT",
          lifecycle_stage: "Technical validation"
        }
      }
    ],
    issues: [
      {
        id: "iss_sso_redirect",
        number: 4182,
        title: "SSO redirect fails on ACS URL",
        state: "open",
        priority: "high",
        severity: "high",
        tags: ["sso", "enterprise", "renewal-risk"],
        assignee: {
          id: "usr_diana",
          name: "Diana Lee",
          email: "diana@yourcompany.com"
        },
        requester: {
          id: "con_omar",
          name: "Omar Silva",
          email: "omar.silva@acmerobotics.com",
          title: "Director of IT"
        },
        createdAt: "2026-04-17T15:14:00Z",
        updatedAt: "2026-05-01T16:02:00Z",
        latestMessageActivityAt: "2026-05-01T16:02:00Z",
        url: "https://app.usepylon.com/issues/4182",
        bodyText: "Acme admins are hitting a redirect loop when authenticating via SAML. The ACS URL appears to be misconfigured after the IdP migration last month. This is blocking the admin pilot rollout."
      },
      {
        id: "iss_export_schema",
        number: 4169,
        title: "Export schema for Snowflake — column-level control",
        state: "triaged",
        priority: "medium",
        severity: "medium",
        tags: ["exports", "snowflake", "feature-request"],
        assignee: {
          id: "usr_diana",
          name: "Diana Lee",
          email: "diana@yourcompany.com"
        },
        requester: {
          id: "con_mia",
          name: "Mia Chen",
          email: "mia.chen@acmerobotics.com",
          title: "VP Revenue Operations"
        },
        createdAt: "2026-04-22T19:00:00Z",
        updatedAt: "2026-04-28T20:22:00Z",
        latestMessageActivityAt: "2026-04-28T20:22:00Z",
        url: "https://app.usepylon.com/issues/4169",
        bodyText: "RevOps wants to choose which columns sync into the customer.events table in Snowflake. Today the export is all-or-nothing, which is forcing them to mask PII downstream in dbt."
      },
      {
        id: "iss_pricing_guardrails",
        number: 4151,
        title: "Renewal pricing guardrails in admin",
        state: "logged",
        priority: "low",
        severity: "low",
        tags: ["admin", "pricing", "renewal"],
        assignee: {
          id: "usr_diana",
          name: "Diana Lee",
          email: "diana@yourcompany.com"
        },
        requester: {
          id: "con_mia",
          name: "Mia Chen",
          email: "mia.chen@acmerobotics.com",
          title: "VP Revenue Operations"
        },
        createdAt: "2026-04-13T14:00:00Z",
        updatedAt: "2026-04-14T10:30:00Z",
        latestMessageActivityAt: "2026-04-14T10:30:00Z",
        url: "https://app.usepylon.com/issues/4151",
        bodyText: "Mia wants admin-level controls to set pricing guardrails that prevent reps from offering discounts beyond approved thresholds during renewal negotiations."
      },
      {
        id: "iss_webhook_url",
        number: 4127,
        title: "Webhook retry policy exposes plaintext URL in logs",
        state: "resolved",
        priority: "medium",
        severity: "medium",
        tags: ["webhooks", "security", "logging"],
        assignee: {
          id: "usr_diana",
          name: "Diana Lee",
          email: "diana@yourcompany.com"
        },
        requester: {
          id: "con_omar",
          name: "Omar Silva",
          email: "omar.silva@acmerobotics.com",
          title: "Director of IT"
        },
        createdAt: "2026-04-09T11:00:00Z",
        updatedAt: "2026-04-12T16:45:00Z",
        latestMessageActivityAt: "2026-04-12T16:45:00Z",
        url: "https://app.usepylon.com/issues/4127",
        bodyText: "When a webhook delivery fails and retries, the full destination URL (including any embedded secrets) is written to the audit log in plaintext. Omar flagged this during their security review."
      }
    ],
    messages: [
      {
        issueId: "iss_sso_redirect",
        id: "msg_1",
        author: {
          name: "Omar Silva",
          email: "omar.silva@acmerobotics.com",
          type: "contact"
        },
        bodyText: "This is blocking our admin pilot. Please do not tell sales this is fixed until we test it.",
        createdAt: "2026-05-01T15:43:00Z",
        isInternal: false
      },
      {
        issueId: "iss_sso_redirect",
        id: "msg_2",
        author: {
          name: "Diana Lee",
          email: "diana@yourcompany.com",
          type: "user"
        },
        bodyText: "Internal note: likely misconfigured ACS URL. I can validate with Omar before Monday's call.",
        createdAt: "2026-05-01T16:02:00Z",
        isInternal: true
      },
      {
        issueId: "iss_export_schema",
        id: "msg_3",
        author: {
          name: "Mia Chen",
          email: "mia.chen@acmerobotics.com",
          type: "contact"
        },
        bodyText: "Could we get a column-picker on the Snowflake destination? Right now we're masking 6 fields in dbt and it's getting brittle.",
        createdAt: "2026-04-22T19:00:00Z",
        isInternal: false
      },
      {
        issueId: "iss_export_schema",
        id: "msg_4",
        author: {
          name: "Diana Lee",
          email: "diana@yourcompany.com",
          type: "user"
        },
        bodyText: "Makes sense — flagged this with the integrations PM. Putting it on the roadmap call this week.",
        createdAt: "2026-04-23T14:30:00Z",
        isInternal: false
      },
      {
        issueId: "iss_export_schema",
        id: "msg_5",
        author: {
          name: "Diana Lee",
          email: "diana@yourcompany.com",
          type: "user"
        },
        bodyText: "PM confirmed for Q3. Will let Mia know once it's officially scoped.",
        createdAt: "2026-04-28T20:22:00Z",
        isInternal: true
      }
    ],
    signals: {
      relationshipEvents: [
        {
          person: {
            id: "usr_sam",
            name: "Sam Patel",
            email: "sam@yourcompany.com",
            role: "CSM"
          },
          contact: "Mia Chen",
          strength: 91,
          reason: "Owned 12 account threads and helped Mia through export/security review.",
          evidenceUrl: "https://app.usepylon.com/issues/4169"
        },
        {
          person: {
            id: "usr_priya",
            name: "Priya Rao",
            email: "priya@yourcompany.com",
            role: "Solutions Engineer"
          },
          contact: "Omar Silva",
          strength: 83,
          reason: "Currently resolving Acme's SSO blocker with Omar.",
          evidenceUrl: "https://app.usepylon.com/issues/4182"
        },
        {
          person: {
            id: "usr_dana",
            name: "Dana Lee",
            email: "dana@yourcompany.com",
            role: "Account owner"
          },
          contact: "Mia Chen",
          strength: 76,
          reason: "Owns the Salesforce expansion opportunity and prior seat discussion.",
          evidenceUrl: "https://app.usepylon.com/issues/4120"
        }
      ],
      supportRisks: [
        "SSO redirect loop is open and customer explicitly asked us not to call it fixed.",
        "Export schema is part of the expansion decision and still needs confirmation."
      ],
      expansionHints: [
        "Asked about adding 120 operations seats.",
        "Mia linked stable exports to next-phase rollout.",
        "Upcoming meeting is tagged as enterprise expansion."
      ],
      recentCommitments: [
        "Priya will validate the SSO ACS URL with Omar before Monday's call.",
        "Sam will send the export schema confirmation after product review."
      ],
      calendarEvents: [
        {
          title: "Acme expansion follow-up",
          startsAt: "2026-05-04T17:00:00Z",
          attendees: ["mia.chen@acmerobotics.com", "omar.silva@acmerobotics.com", "dana@yourcompany.com"],
          summary: "Review admin pilot blockers, security export needs, and enterprise rollout timing."
        }
      ],
      callActivities: [
        {
          source: "Call activity",
          happenedAt: "2026-05-01T18:30:00Z",
          summary: "Mia is open to expansion if the SSO blocker and export schema are handled before the rollout date."
        }
      ],
      linkedinPeople: [],
      systemWarnings: []
    },
    opportunities: [
      {
        id: "opp_renewal_001",
        name: "Acme Robotics Enterprise Renewal",
        type: "renewal",
        stage: "Mutual evaluation",
        amount: 148000,
        closeDate: "2026-06-30",
        health: "at_risk",
        products: ["Enterprise Seat", "AI Agents"],
        owner: { name: "Dana Lee", email: "dana@yourcompany.com" },
        notes: "SSO blocker (issue #4182) and export schema (issue #4169) must be resolved before renewal negotiation.",
        nextSteps: "Resolve SSO ACS URL + deliver export schema, then negotiate renewal terms with Mia."
      },
      {
        id: "opp_expansion_001",
        name: "Operations Seat Expansion",
        type: "expansion",
        stage: "Discovery",
        amount: 43200,
        closeDate: "2026-07-15",
        health: "conditional",
        products: ["Enterprise Seat"],
        owner: { name: "Dana Lee", email: "dana@yourcompany.com" },
        notes: "Jordan Avery (VP Ops) mentioned interest in 120 additional seats for field operations rollout.",
        nextSteps: "Confirm seat count with Mia once technical blockers are resolved."
      }
    ],
    accountMetrics: {
      currentArr: 148000,
      renewalDate: "2026-06-29",
      healthScore: 6.2,
      healthTrend: "trending down",
      sentiment: "at_risk",
      lifecycle: "Middle",
      lifecycleSub: "3rd year customer",
      seatCount: 45,
      seatTier: "Enterprise tier",
      products: ["Enterprise Seat", "AI Agents"],
      upsellSignals: [
        { label: "Operations seat expansion", detail: "120 seats mentioned by Jordan Avery" },
        { label: "AI Assistants interest", detail: "Mia Chen asked for case studies" }
      ],
      riskSignals: [
        { label: "SSO blocker open", detail: "Issue #4182, 14 days unresolved" },
        { label: "Export schema pending", detail: "Issue #4169, blocks Snowflake rollout" },
        { label: "Frustration trending up", detail: "Omar Silva (Director of IT)" }
      ],
      recentActivity: [
        { text: "Mia Chen replied to renewal pricing thread", when: "2026-04-29T10:00:00Z", type: "Email", status: "Engaged" },
        { text: "Quarterly business review · Mia, Dana, Omar", when: "2026-04-24T14:00:00Z", type: "45 min", status: "Recap shared" },
        { text: "Omar Silva opened SSO blocker (#4182)", when: "2026-04-17T15:14:00Z", type: null, status: "Engineering triaged" }
      ]
    }
  },
  "quiet-bank": {
    mode: "mock",
    account: {
      id: "quiet-bank",
      name: "Quiet Bank",
      domains: ["quietbank.example"],
      owner: {
        id: "usr_alex",
        name: "Alex Morgan",
        email: "alex@yourcompany.com"
      },
      crm: {
        source: "HubSpot",
        opportunityName: "Quiet Bank Pilot",
        opportunityStage: "Discovery",
        opportunityAmount: "$22k ARR",
        renewalDate: "",
        health: "Neutral",
        nextMeeting: "2026-05-06T16:00:00Z"
      }
    },
    contacts: [
      {
        id: "con_riley",
        name: "Riley Shah",
        email: "riley.shah@quietbank.example",
        role: "Operations Lead",
        accountId: "quiet-bank",
        externalIds: [
          {
            label: "salesforce",
            external_id: "003QUIET000RILEY"
          }
        ],
        customFields: {
          buying_role: "Evaluator",
          salesforce_page: "https://salesforce.example.com/lightning/r/Contact/003QUIET000RILEY/view"
        }
      }
    ],
    issues: [],
    messages: [],
    signals: {
      relationshipEvents: [],
      supportRisks: [],
      expansionHints: ["Calendar invite mentions onboarding more support managers."],
      recentCommitments: [],
      calendarEvents: [
        {
          title: "Quiet Bank discovery follow-up",
          startsAt: "2026-05-06T16:00:00Z",
          attendees: ["riley.shah@quietbank.example", "alex@yourcompany.com"],
          summary: "Confirm goals, timeline, and success criteria for pilot."
        }
      ],
      callActivities: [],
      linkedinPeople: [],
      systemWarnings: []
    },
    opportunities: [
      {
        id: "opp_new_001",
        name: "Quiet Bank Pilot",
        type: "new_business",
        stage: "Discovery",
        amount: 22000,
        closeDate: "2026-07-01",
        health: "neutral",
        products: ["Professional Seat"],
        owner: { name: "Alex Morgan", email: "alex@yourcompany.com" },
        notes: "Early stage pilot — confirming fit and success criteria.",
        nextSteps: "Confirm goals, timeline, and success criteria on May 6 call."
      }
    ],
    accountMetrics: {
      currentArr: 0,
      renewalDate: null,
      healthScore: null,
      sentiment: "neutral",
      lifecycle: "Discovery",
      seatCount: 0,
      seatTier: "",
      products: [],
      upsellSignals: ["Onboarding more support managers (calendar signal)"],
      riskSignals: []
    }
  }
};

export function getMockContext({ accountId = "", requesterEmail = "" } = {}) {
  const accountKey = selectMockAccountKey(accountId, requesterEmail);
  return safeJsonClone(mockContexts[accountKey]);
}

function selectMockAccountKey(accountId, requesterEmail) {
  const haystack = `${accountId} ${requesterEmail}`.toLowerCase();
  if (haystack.includes("quiet") || haystack.includes("low") || haystack.includes("empty")) {
    return "quiet-bank";
  }
  return "acme-risk";
}
