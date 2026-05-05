# Org Mapper

Two Pylon Custom App sidebar widgets for sales workflows:

- **Follow-Up Writer:** drafts a post-call email using account support context, calendar/call activity, and recent commitments.
- **Warm Intro Mapper:** ranks internal connectors using Pylon interactions plus CRM-synced account/contact fields.
- **Org Chart Mapper:** maps decision makers, champions, blockers, internal owners, and LinkedIn research leads, with a drag-and-drop org canvas for strategic accounts.

The app is mock-first for reliable demos, with live Pylon API adapters behind env vars.

## Run

```bash
npm test
npm start
```

Default URL: `http://localhost:3000`.

Useful local endpoints:

```text
GET /compose
GET /preview/follow-up?account_id=acme-risk
GET /preview/warm-intro?account_id=acme-risk
GET /preview/org-map?account_id=acme-risk
GET /widgets/follow-up?account_id=acme-risk
GET /widgets/warm-intro?account_id=acme-risk
GET /widgets/org-map?account_id=acme-risk
GET /widgets/follow-up?account_id=quiet-bank
GET /pylon/endpoints.json
GET /debug/context?account_id=acme-risk
```

Use `/preview/...` in the clean browser frontend. Use `/widgets/...` for Pylon Custom Apps; those routes intentionally return JSON and are not linked from the user-facing UI.

You can also pass sales context directly through query params:

```text
post_call_notes=...
calendar_title=...
calendar_summary=...
calendar_attendees=buyer@example.com,ae@yourcompany.com
linkedin_people=Name|Title|Company|LinkedIn URL|Notes;Name 2|Title 2|Company|URL|Notes
```

Example:

```text
/widgets/warm-intro?account_id=acme-risk&linkedin_people=Jordan%20Avery%7CVP%20Operations%7CAcme%20Robotics%7Chttps%3A%2F%2Flinkedin.com%2Fin%2Fjordan-avery%7COwns%20field%20operations%20rollout
```

`linkedin_people` can also be a URL-encoded JSON array with `name`, `title`, `company`, `linkedinUrl`, and `notes`.

For a browser-friendly demo input screen, open:

```text
http://localhost:3000/compose
```

## Pylon Custom App Setup

Create three Pylon Custom Apps and point each app at one endpoint:

```text
https://YOUR_PUBLIC_URL/widgets/follow-up
https://YOUR_PUBLIC_URL/widgets/warm-intro
https://YOUR_PUBLIC_URL/widgets/org-map
```

Pylon will call the endpoint with `request_type=verify&code=...`; this service echoes the code as JSON. For normal loads, Pylon sends account/issue/requester identifiers and the service returns Custom App component JSON.

## Live Pylon Mode

Copy `.env.example` to your shell or deployment environment and set:

```bash
export DEMO_MODE=live
export PYLON_API_TOKEN=...
export PUBLIC_BASE_URL=https://YOUR_PUBLIC_URL
npm start
```

Live mode attempts to fetch account, contacts, issues, and selected issue messages. If a live call fails or a token is missing, the widget falls back to mock data and shows a system warning in the response.

## Demo Notes

- Nothing is sent to customers. The follow-up is draft-only.
- "Copy" buttons open plain-text endpoints so the user can copy the generated text.
- Evidence links are included when available. Mock links use Pylon-shaped URLs for the demo story.
- LinkedIn people are treated as user-provided research leads, not confirmed contacts.
- The org chart preview is interactive in the browser: drag contact chips from the right sidebar into the center canvas, drop onto another person to nest underneath, and already-placed people are greyed out. Click any mapped person or sidebar contact to lazily load Pylon contact details, CRM/Salesforce fields, related issues, and recent activity. The title chip opens the same panel so sales can add stakeholder notes without preloading every contact.
- Lazy contact detail endpoint: `/api/contact-details?account_id=&contact_id=&email=&mode=`. In live mode it calls Pylon's Contacts API only after click; in mock mode it returns demo-shaped contact, Salesforce, and issue data.
