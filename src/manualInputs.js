import { stripHtml, truncate } from "./utils.js";

export function applyManualSalesInputs(context, searchParams) {
  ensureSignalArrays(context);

  const calendarEvent = parseCalendarEvent(searchParams);
  if (calendarEvent) {
    context.signals.calendarEvents = [calendarEvent, ...context.signals.calendarEvents];
  }

  const postCallNotes = firstParam(searchParams, "post_call_notes", "call_notes", "post_call_note");
  if (postCallNotes) {
    const summary = truncate(stripHtml(postCallNotes), 700);
    context.signals.callActivities = [
      {
        source: "Post-call notes",
        happenedAt: firstParam(searchParams, "call_happened_at", "call_time") || "",
        summary
      },
      ...context.signals.callActivities
    ];
    context.signals.recentCommitments = [
      ...extractCommitments(summary),
      ...context.signals.recentCommitments
    ];
    context.signals.expansionHints = [
      ...extractExpansionHints(summary),
      ...context.signals.expansionHints
    ];
  }

  const linkedinPeople = parseLinkedInPeople(firstParam(searchParams, "linkedin_people", "multithread_people"));
  if (linkedinPeople.length) {
    context.signals.linkedinPeople = [...linkedinPeople, ...context.signals.linkedinPeople];
    context.signals.expansionHints = [
      ...linkedinPeople.map((person) => `LinkedIn multithread candidate: ${person.name}${person.title ? `, ${person.title}` : ""}.`),
      ...context.signals.expansionHints
    ];
  }

  return context;
}

export function parseLinkedInPeople(value = "") {
  const trimmed = stripHtml(value);
  if (!trimmed) return [];

  const fromJson = parsePeopleJson(trimmed);
  if (fromJson.length) return fromJson;

  return trimmed
    .split(/\n|;/)
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record, index) => {
      const parts = record.includes("|")
        ? record.split("|").map((part) => part.trim())
        : record.split(",").map((part) => part.trim());

      const [name, title = "", company = "", linkedinUrl = "", notes = ""] = parts;
      return normalizeLinkedInPerson({ name, title, company, linkedinUrl, notes }, index);
    })
    .filter((person) => person.name);
}

function parseCalendarEvent(searchParams) {
  const encodedEvent = firstParam(searchParams, "calendar_event", "google_calendar_event");
  if (encodedEvent) {
    const parts = encodedEvent.split("|").map((part) => stripHtml(part));
    const [title, startsAt = "", attendees = "", summary = ""] = parts;
    return {
      title: title || "Calendar event",
      startsAt,
      attendees: attendees.split(",").map((email) => email.trim()).filter(Boolean),
      summary: summary || title || "Calendar event from Pylon Google Calendar context.",
      source: "Pylon Google Calendar"
    };
  }

  const title = firstParam(searchParams, "calendar_title", "event_title");
  const summary = firstParam(searchParams, "calendar_summary", "event_summary");
  const attendees = firstParam(searchParams, "calendar_attendees", "event_attendees");
  const startsAt = firstParam(searchParams, "calendar_starts_at", "event_starts_at");

  if (!title && !summary && !attendees && !startsAt) return null;

  return {
    title: title || "Calendar event",
    startsAt,
    attendees: attendees.split(",").map((email) => email.trim()).filter(Boolean),
    summary: summary || title || "Calendar event from Pylon Google Calendar context.",
    source: "Pylon Google Calendar"
  };
}

function parsePeopleJson(value) {
  if (!value.startsWith("[") && !value.startsWith("{")) return [];

  try {
    const parsed = JSON.parse(value);
    const items = Array.isArray(parsed) ? parsed : [parsed];
    return items
      .map((person, index) =>
        normalizeLinkedInPerson(
          {
            name: person.name || "",
            title: person.title || person.role || "",
            company: person.company || "",
            linkedinUrl: person.linkedinUrl || person.linkedin_url || person.url || "",
            notes: person.notes || person.reason || ""
          },
          index
        )
      )
      .filter((person) => person.name);
  } catch {
    return [];
  }
}

function normalizeLinkedInPerson(person, index) {
  return {
    id: `linkedin_${index}_${slugify(person.name || "candidate")}`,
    name: stripHtml(person.name || ""),
    title: stripHtml(person.title || ""),
    company: stripHtml(person.company || ""),
    linkedinUrl: stripHtml(person.linkedinUrl || ""),
    notes: stripHtml(person.notes || ""),
    source: "LinkedIn manual input"
  };
}

function extractCommitments(notes) {
  return notes
    .split(/\.|\n/)
    .map((line) => line.trim())
    .filter((line) => /will|send|follow up|next step|by |before|owner|todo|commit/i.test(line))
    .slice(0, 4);
}

function extractExpansionHints(notes) {
  return notes
    .split(/\.|\n/)
    .map((line) => line.trim())
    .filter((line) => /expansion|seat|multithread|stakeholder|buyer|champion|economic|rollout|renewal|pilot|linkedin/i.test(line))
    .slice(0, 4);
}

function ensureSignalArrays(context) {
  context.signals ||= {};
  context.signals.relationshipEvents ||= [];
  context.signals.supportRisks ||= [];
  context.signals.expansionHints ||= [];
  context.signals.recentCommitments ||= [];
  context.signals.calendarEvents ||= [];
  context.signals.callActivities ||= [];
  context.signals.linkedinPeople ||= [];
  context.signals.systemWarnings ||= [];
}

function firstParam(searchParams, ...names) {
  for (const name of names) {
    const value = searchParams.get(name);
    if (value) return value;
  }
  return "";
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
