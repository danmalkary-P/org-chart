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
    contacts: [
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
        title: "SAML redirect loops for Acme admins",
        state: "waiting_on_you",
        priority: "high",
        tags: ["sso", "enterprise", "renewal-risk"],
        assignee: {
          id: "usr_priya",
          name: "Priya Rao",
          email: "priya@yourcompany.com"
        },
        requester: {
          id: "con_omar",
          name: "Omar Silva",
          email: "omar.silva@acmerobotics.com"
        },
        createdAt: "2026-04-27T15:14:00Z",
        updatedAt: "2026-05-01T16:02:00Z",
        latestMessageActivityAt: "2026-05-01T16:02:00Z",
        url: "https://app.usepylon.com/issues/4182",
        bodyText: "Acme admins get stuck in a redirect loop after SAML login."
      },
      {
        id: "iss_export_schema",
        number: 4169,
        title: "Need export schema before rollout",
        state: "waiting_on_customer",
        priority: "medium",
        tags: ["data-export", "security-review"],
        assignee: {
          id: "usr_sam",
          name: "Sam Patel",
          email: "sam@yourcompany.com"
        },
        requester: {
          id: "con_mia",
          name: "Mia Chen",
          email: "mia.chen@acmerobotics.com"
        },
        createdAt: "2026-04-24T19:00:00Z",
        updatedAt: "2026-04-30T20:22:00Z",
        latestMessageActivityAt: "2026-04-30T20:22:00Z",
        url: "https://app.usepylon.com/issues/4169",
        bodyText: "Mia asked for the export schema before committing to a larger rollout."
      },
      {
        id: "iss_seats",
        number: 4120,
        title: "Question about adding 120 operations seats",
        state: "closed",
        priority: "low",
        tags: ["expansion", "seats"],
        assignee: {
          id: "usr_dana",
          name: "Dana Lee",
          email: "dana@yourcompany.com"
        },
        requester: {
          id: "con_mia",
          name: "Mia Chen",
          email: "mia.chen@acmerobotics.com"
        },
        createdAt: "2026-04-16T18:00:00Z",
        updatedAt: "2026-04-17T11:12:00Z",
        latestMessageActivityAt: "2026-04-17T11:12:00Z",
        url: "https://app.usepylon.com/issues/4120",
        bodyText: "Mia asked whether the operations team could be added under a single rollout plan."
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
          name: "Priya Rao",
          email: "priya@yourcompany.com",
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
        bodyText: "If the schema is stable, we can include the ops team in the next phase.",
        createdAt: "2026-04-30T20:22:00Z",
        isInternal: false
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
