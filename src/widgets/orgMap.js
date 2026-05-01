import { buildOrgMapAnalysis } from "../generators.js";
import {
  badge,
  card,
  evidenceCard,
  modeCard,
  response,
  text
} from "../pylonComponents.js";
import { formatList } from "../utils.js";

export function renderOrgMapWidget({ context, modeInfo, baseUrl, searchParams, liveEnabled }) {
  const analysis = buildOrgMapAnalysis(context);

  return response([
    card("Org Chart Mapper", [
      badge("Coverage", [{ value: `${analysis.coverage.score}/100`, color: coverageColor(analysis.coverage.score) }]),
      text("Mapped people", `${analysis.coverage.totalPeople} people, ${analysis.coverage.ownedCount} with internal owners`),
      text("Account roles", roleSummary(analysis)),
      text("Gaps", formatList(analysis.gaps, "No critical account-map gaps found."))
    ]),
    card("Customer map", [
      text("Org levels", levelSummary(analysis)),
      text("Political read", politicalSummary(analysis))
    ]),
    card("Next moves", [
      text("Recommended actions", formatList(analysis.nextMoves))
    ]),
    evidenceCard(analysis.evidenceLinks),
    modeCard({
      modeInfo,
      baseUrl,
      pathname: "/widgets/org-map",
      searchParams,
      liveEnabled
    })
  ]);
}

export function buildOrgMapPreviewData(context) {
  return buildOrgMapAnalysis(context);
}

function roleSummary(analysis) {
  return [
    analysis.coverage.hasEconomicBuyer ? "Economic buyer mapped" : "Economic buyer missing",
    analysis.coverage.hasTechnicalApprover ? "Technical approver mapped" : "Technical approver missing",
    analysis.coverage.hasChampion ? "Champion/coach mapped" : "Champion/coach missing",
    analysis.coverage.hasRisk ? "Blocker/risk visible" : "No blocker visible",
    analysis.coverage.hasResearchLead ? "LinkedIn research leads added" : "No LinkedIn research leads"
  ].map((item) => `- ${item}`).join("\n");
}

function levelSummary(analysis) {
  return analysis.groupedLevels
    .map((group) => {
      const people = group.nodes
        .map((node) => `${node.name} (${node.title}) - ${node.relationship}, ${node.buyingRole}`)
        .join("; ");
      return `${group.level}: ${people}`;
    })
    .join("\n");
}

function politicalSummary(analysis) {
  return analysis.nodes
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((node) => `${node.name}: ${node.relationship}; owner: ${node.owner}; ${node.notes || node.ownerReason}`)
    .join("\n");
}

function coverageColor(score) {
  if (score >= 75) return "green";
  if (score >= 50) return "blue";
  return "yellow";
}
