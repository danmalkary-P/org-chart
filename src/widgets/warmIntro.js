import { buildWarmIntroAnalysis } from "../generators.js";
import {
  badge,
  button,
  card,
  evidenceCard,
  modeCard,
  response,
  text
} from "../pylonComponents.js";
import { makeAbsoluteUrl, truncate } from "../utils.js";

export function renderWarmIntroWidget({ context, modeInfo, baseUrl, searchParams, liveEnabled }) {
  const analysis = buildWarmIntroAnalysis(context);
  const introUrl = makeAbsoluteUrl(baseUrl, "/drafts/intro-ask.txt", Object.fromEntries(searchParams.entries()));

  return response([
    card("Warm Intro Mapper", [
      badge("Confidence", [{ value: analysis.confidence.toUpperCase(), color: confidenceColor(analysis.confidence) }]),
      text("Likely champion", formatChampion(analysis.champion)),
      text(
        "Intro path",
        analysis.fallback
          ? "No strong warm intro path found yet."
          : analysis.connectors
              .slice(0, 3)
              .map((connector, index) => `${index + 1}. ${connector.name} (${connector.role}) - ${connector.score}/100\n${connector.reason}`)
              .join("\n\n")
      ),
      button("Copy intro ask", introUrl)
    ]),
    card("Suggested ask", [
      text("Message", truncate(analysis.introAsk, 1400))
    ]),
    multithreadCard(analysis),
    evidenceCard(analysis.evidenceLinks),
    modeCard({
      modeInfo,
      baseUrl,
      pathname: "/widgets/warm-intro",
      searchParams,
      liveEnabled
    })
  ]);
}

export function renderWarmIntroText(context) {
  const analysis = buildWarmIntroAnalysis(context);
  return analysis.introAsk;
}

function formatChampion(champion) {
  if (!champion?.name && !champion?.email) return "No customer-side champion identified yet.";
  return [champion.name, champion.role, champion.email].filter(Boolean).join(" - ");
}

function confidenceColor(confidence) {
  if (confidence === "High") return "green";
  if (confidence === "Medium") return "blue";
  return "yellow";
}

function multithreadCard(analysis) {
  if (!analysis.multithreadTargets.length) {
    return card("LinkedIn multithread", [
      text("Candidates", "Add linkedin_people to score customer-side multithread opportunities.")
    ]);
  }

  return card("LinkedIn multithread", [
    text(
      "Candidates",
      analysis.multithreadTargets
        .slice(0, 4)
        .map((person, index) =>
          `${index + 1}. ${person.name}${person.title ? ` - ${person.title}` : ""} (${person.score}/100)\n${person.reason}\n${person.suggestedPath}`
        )
        .join("\n\n")
    )
  ]);
}
