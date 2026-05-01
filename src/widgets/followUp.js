import { buildFollowUpAnalysis } from "../generators.js";
import {
  badge,
  button,
  card,
  divider,
  evidenceCard,
  modeCard,
  response,
  text,
  warningCard
} from "../pylonComponents.js";
import { formatList, makeAbsoluteUrl, truncate } from "../utils.js";

export function renderFollowUpWidget({ context, modeInfo, baseUrl, searchParams, liveEnabled }) {
  const analysis = buildFollowUpAnalysis(context);
  const draftUrl = makeAbsoluteUrl(baseUrl, "/drafts/follow-up.txt", Object.fromEntries(searchParams.entries()));

  return response(
    [
      card("Follow-Up Writer", [
        badge("Confidence", [{ value: analysis.confidence.toUpperCase(), color: confidenceColor(analysis.confidence) }]),
        text("Subject", analysis.subject),
        text("Recap", formatList(analysis.recap, "No call or calendar recap found. Use this as a neutral follow-up.")),
        text("Next steps", formatList(analysis.nextSteps)),
        button("Copy draft", draftUrl)
      ]),
      inputContextCard(analysis),
      warningCard(analysis.warnings),
      card("Draft", [
        text("Email", truncate(analysis.draftText, 1800)),
        divider(),
        text("Safety", "Draft only. No customer-facing message is sent by this widget.")
      ]),
      evidenceCard(analysis.evidenceLinks),
      modeCard({
        modeInfo,
        baseUrl,
        pathname: "/widgets/follow-up",
        searchParams,
        liveEnabled
      })
    ].filter(Boolean)
  );
}

export function renderFollowUpText(context) {
  const analysis = buildFollowUpAnalysis(context);
  return [`Subject: ${analysis.subject}`, "", analysis.draftText].join("\n");
}

function confidenceColor(confidence) {
  if (confidence === "High") return "green";
  if (confidence === "Medium") return "blue";
  return "yellow";
}

function inputContextCard(analysis) {
  const lines = [
    analysis.manualInputs.postCallNotes ? "Post-call notes included" : "",
    analysis.manualInputs.calendarEvent ? "Calendar event included" : "",
    analysis.manualInputs.linkedinPeople.length
      ? `${analysis.manualInputs.linkedinPeople.length} LinkedIn multithread candidate${analysis.manualInputs.linkedinPeople.length === 1 ? "" : "s"} included`
      : ""
  ].filter(Boolean);

  if (!lines.length) return null;
  return card("Sales inputs", [text("Context", formatList(lines))]);
}
