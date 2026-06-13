import { jsPDF } from "jspdf";
import type { AnalysisResult, RankedCandidate } from "@workspace/api-client-react";

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  primary:    [16, 185, 129] as [number, number, number],   // emerald-500
  primaryDark:[5,  150, 105] as [number, number, number],   // emerald-600
  ink:        [15,  23,  42] as [number, number, number],   // slate-900
  muted:      [100, 116, 139] as [number, number, number],  // slate-500
  faint:      [148, 163, 184] as [number, number, number],  // slate-400
  border:     [226, 232, 240] as [number, number, number],  // slate-200
  surface:    [248, 250, 252] as [number, number, number],  // slate-50
  white:      [255, 255, 255] as [number, number, number],
  emeraldBg:  [209, 250, 229] as [number, number, number],  // emerald-100
  redBg:      [254, 226, 226] as [number, number, number],  // red-100
  redText:    [185,  28,  28] as [number, number, number],  // red-700
  grayBg:     [241, 245, 249] as [number, number, number],  // slate-100
  amber:      [217, 119,   6] as [number, number, number],  // amber-600
};

const PAGE_W    = 210;
const PAGE_H    = 297;
const MARGIN    = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;

// ── Helpers ───────────────────────────────────────────────────────────────────

function hex(rgb: [number, number, number]): string {
  return `#${rgb.map(v => v.toString(16).padStart(2, "0")).join("")}`;
}

function rgb(doc: jsPDF, color: [number, number, number], type: "fill" | "draw" | "text") {
  if (type === "fill")  doc.setFillColor(color[0], color[1], color[2]);
  if (type === "draw")  doc.setDrawColor(color[0], color[1], color[2]);
  if (type === "text")  doc.setTextColor(color[0], color[1], color[2]);
}

function checkPage(doc: jsPDF, y: number, needed = 14): number {
  if (y + needed > PAGE_H - 16) {
    doc.addPage();
    drawPageFooter(doc);
    return 22;
  }
  return y;
}

function drawPageFooter(doc: jsPDF) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  rgb(doc, C.faint, "text");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(
    `RecruitIntel ATS Report  ·  Page ${pageCount}`,
    PAGE_W / 2,
    PAGE_H - 8,
    { align: "center" }
  );
  rgb(doc, C.border, "draw");
  doc.setLineWidth(0.3);
  doc.line(MARGIN, PAGE_H - 13, PAGE_W - MARGIN, PAGE_H - 13);
}

function scoreColor(score: number): [number, number, number] {
  if (score >= 80) return C.primary;
  if (score >= 60) return C.amber;
  return [220, 38, 38];
}

function scoreLabel(score: number): string {
  if (score >= 85) return "Excellent Match";
  if (score >= 70) return "Good Match";
  if (score >= 50) return "Partial Match";
  return "Weak Match";
}

function drawProgressBar(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  value: number,
  barH = 3.5
) {
  rgb(doc, C.border, "fill");
  doc.roundedRect(x, y, w, barH, 1, 1, "F");

  const filled = Math.max(0, Math.min(1, value / 100)) * w;
  if (filled > 0) {
    rgb(doc, scoreColor(value), "fill");
    doc.roundedRect(x, y, filled, barH, 1, 1, "F");
  }
}

function drawSectionHeader(doc: jsPDF, y: number, title: string): number {
  y = checkPage(doc, y, 14);
  rgb(doc, C.surface, "fill");
  rgb(doc, C.border, "draw");
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, CONTENT_W, 9, 1, 1, "FD");

  rgb(doc, C.primaryDark, "text");
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text(title.toUpperCase(), MARGIN + 4, y + 6);

  return y + 13;
}

function drawChip(
  doc: jsPDF,
  x: number,
  y: number,
  text: string,
  bg: [number, number, number],
  textColor: [number, number, number]
): number {
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  const tw = doc.getTextWidth(text);
  const chipW = tw + 6;
  const chipH = 5.5;
  rgb(doc, bg, "fill");
  doc.roundedRect(x, y - 4, chipW, chipH, 1.5, 1.5, "F");
  rgb(doc, textColor, "text");
  doc.text(text, x + 3, y);
  return chipW + 2.5;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function exportAnalysisPDF(result: AnalysisResult): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // ── Cover header bar ──────────────────────────────────────────────────────
  rgb(doc, C.ink, "fill");
  doc.rect(0, 0, PAGE_W, 36, "F");

  // Brand
  rgb(doc, C.primary, "text");
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("RecruitIntel", MARGIN, 14);

  rgb(doc, C.faint, "text");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("AI RESUME SCREENING REPORT", MARGIN, 20);

  // Score badge (top-right)
  const sc = result.ats_score;
  const badgeX = PAGE_W - MARGIN - 24;
  rgb(doc, scoreColor(sc), "fill");
  doc.roundedRect(badgeX, 6, 24, 22, 3, 3, "F");
  rgb(doc, C.white, "text");
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(sc.toFixed(0), badgeX + 12, 21, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("/ 100", badgeX + 12, 26, { align: "center" });

  let y = 46;

  // ── Metadata row ──────────────────────────────────────────────────────────
  rgb(doc, C.border, "fill");
  doc.roundedRect(MARGIN, y, CONTENT_W, 20, 2, 2, "F");

  const col = CONTENT_W / 4;
  const fields: [string, string][] = [
    ["CANDIDATE",  result.candidate_name],
    ["POSITION",   result.job_title],
    ["REPORT ID",  `#${result.id}`],
    ["GENERATED",  new Date(result.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })],
  ];
  fields.forEach(([label, value], idx) => {
    const cx = MARGIN + 4 + idx * col;
    rgb(doc, C.muted, "text");
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(label, cx, y + 6);

    rgb(doc, C.ink, "text");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    const lines = doc.splitTextToSize(value, col - 4);
    doc.text(lines[0], cx, y + 13);
  });

  y += 28;

  // ── ATS verdict ───────────────────────────────────────────────────────────
  y = checkPage(doc, y, 24);
  const verdictColor = scoreColor(sc);
  rgb(doc, verdictColor, "fill");
  doc.roundedRect(MARGIN, y, CONTENT_W, 18, 2, 2, "F");

  rgb(doc, C.white, "text");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`${scoreLabel(sc)}  —  ${sc.toFixed(1)} / 100`, MARGIN + 5, y + 7);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  const overallLines = doc.splitTextToSize(result.explanation.overall, CONTENT_W - 10);
  doc.text(overallLines[0], MARGIN + 5, y + 14);

  y += 25;

  // ── Score Breakdown ───────────────────────────────────────────────────────
  y = drawSectionHeader(doc, y, "Score Breakdown");

  const metrics: [string, number, string][] = [
    ["Skill Match",          result.score_breakdown.skill_match,          "Direct overlap of required vs. possessed skills (40% weight)"],
    ["Semantic Similarity",  result.score_breakdown.semantic_similarity,   "Contextual meaning match via NLP embeddings (30% weight)"],
    ["Experience Alignment", result.score_breakdown.experience_match,      "Years of experience and seniority level (20% weight)"],
    ["Education Match",      result.score_breakdown.education_match,       "Degree requirements and field of study (10% weight)"],
    ["Keyword Coverage",     result.score_breakdown.keyword_coverage,      "Density of domain-specific terminology"],
  ];

  metrics.forEach(([label, val, desc]) => {
    y = checkPage(doc, y, 16);

    rgb(doc, C.ink, "text");
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text(label, MARGIN, y + 4);

    rgb(doc, scoreColor(val), "text");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`${val.toFixed(1)}%`, PAGE_W - MARGIN, y + 4, { align: "right" });

    rgb(doc, C.muted, "text");
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(desc, MARGIN, y + 8.5);

    drawProgressBar(doc, MARGIN, y + 11, CONTENT_W, val);
    y += 18;
  });

  y += 4;

  // ── Evaluation Summary ────────────────────────────────────────────────────
  y = drawSectionHeader(doc, y, "Evaluation Summary");

  // Strengths
  y = checkPage(doc, y, 10);
  rgb(doc, C.primary, "text");
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("Key Strengths", MARGIN, y + 4);
  y += 8;

  result.explanation.strengths.forEach((str) => {
    y = checkPage(doc, y, 10);
    rgb(doc, C.primary, "fill");
    doc.circle(MARGIN + 1.5, y + 1.5, 1.2, "F");
    rgb(doc, C.ink, "text");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(str, CONTENT_W - 8);
    doc.text(lines, MARGIN + 5, y + 4);
    y += lines.length * 5 + 3;
  });

  y += 4;

  // Weaknesses
  y = checkPage(doc, y, 10);
  rgb(doc, C.amber, "text");
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("Potential Risks", MARGIN, y + 4);
  y += 8;

  result.explanation.weaknesses.forEach((wk) => {
    y = checkPage(doc, y, 10);
    rgb(doc, C.amber, "fill");
    doc.circle(MARGIN + 1.5, y + 1.5, 1.2, "F");
    rgb(doc, C.ink, "text");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(wk, CONTENT_W - 8);
    doc.text(lines, MARGIN + 5, y + 4);
    y += lines.length * 5 + 3;
  });

  y += 4;

  // Score reasoning quote
  y = checkPage(doc, y, 16);
  rgb(doc, C.surface, "fill");
  rgb(doc, C.primary, "draw");
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y, MARGIN, y + 16);
  doc.setLineWidth(0.3);
  rgb(doc, C.muted, "text");
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  const reasonLines = doc.splitTextToSize(result.explanation.score_reasoning, CONTENT_W - 8);
  const reasonH = reasonLines.length * 4.5 + 6;
  y = checkPage(doc, y, reasonH);
  doc.text(reasonLines, MARGIN + 5, y + 5);
  y += reasonH + 4;

  // ── Skill Gap Analysis ────────────────────────────────────────────────────
  y = drawSectionHeader(doc, y, "Skill Gap Analysis");

  const skillGroups: [string, string[], [number,number,number], [number,number,number]][] = [
    ["Matched Required Skills",  result.skill_gap.matched_skills, C.emeraldBg, C.primaryDark],
    ["Missing Required Skills",  result.skill_gap.missing_skills,  C.redBg,     C.redText],
    ["Additional Skills Found",  result.skill_gap.extra_skills,    C.grayBg,    C.muted],
  ];

  skillGroups.forEach(([groupLabel, skills, bg, textColor]) => {
    y = checkPage(doc, y, 12);
    rgb(doc, C.ink, "text");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`${groupLabel}  (${skills.length})`, MARGIN, y + 4);
    y += 7;

    if (skills.length === 0) {
      y = checkPage(doc, y, 8);
      rgb(doc, C.faint, "text");
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text(groupLabel.includes("Missing") ? "No missing skills" : "None found", MARGIN + 2, y + 4);
      y += 9;
    } else {
      let cx = MARGIN;
      let rowY = y;
      skills.forEach((skill) => {
        const chipW = doc.getTextWidth(skill) + 8;
        if (cx + chipW > PAGE_W - MARGIN) {
          cx = MARGIN;
          rowY += 8;
          rowY = checkPage(doc, rowY, 8);
        }
        drawChip(doc, cx, rowY + 4, skill, bg, textColor);
        cx += chipW;
      });
      y = rowY + 10;
    }
    y += 4;
  });

  // ── Recommendations ───────────────────────────────────────────────────────
  y = drawSectionHeader(doc, y, "Actionable Recommendations");

  result.recommendations.forEach((rec, idx) => {
    y = checkPage(doc, y, 18);

    const isHigh   = rec.priority.toLowerCase() === "high";
    const isMedium = rec.priority.toLowerCase() === "medium";
    const numBg: [number,number,number] = isHigh ? [220, 38, 38] : isMedium ? C.amber : C.muted;

    // Number circle
    rgb(doc, numBg, "fill");
    doc.circle(MARGIN + 3, y + 4, 3.5, "F");
    rgb(doc, C.white, "text");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text(`${idx + 1}`, MARGIN + 3, y + 5.5, { align: "center" });

    // Category label
    rgb(doc, C.muted, "text");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text(`${rec.category.toUpperCase()}  ·  ${rec.priority.toUpperCase()} PRIORITY`, MARGIN + 9, y + 3);

    // Suggestion text
    rgb(doc, C.ink, "text");
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(rec.suggestion, CONTENT_W - 12);
    doc.text(lines, MARGIN + 9, y + 9);
    y += lines.length * 5 + 10;

    // Divider
    if (idx < result.recommendations.length - 1) {
      y = checkPage(doc, y, 6);
      rgb(doc, C.border, "draw");
      doc.setLineWidth(0.2);
      doc.line(MARGIN, y, PAGE_W - MARGIN, y);
      y += 4;
    }
  });

  // ── Footer on last page ───────────────────────────────────────────────────
  drawPageFooter(doc);

  // ── Save ──────────────────────────────────────────────────────────────────
  const filename = `RecruitIntel_${result.candidate_name.replace(/\s+/g, "_")}_${result.job_title.replace(/\s+/g, "_")}.pdf`;
  doc.save(filename);
}

// ── Bulk Ranking Export ───────────────────────────────────────────────────────

export function exportRankingPDF(candidates: RankedCandidate[], jobTitle: string): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  // medal colors for top 3
  const medalColor = (rank: number): [number, number, number] => {
    if (rank === 1) return C.primary;
    if (rank === 2) return [148, 163, 184]; // silver
    if (rank === 3) return [180, 120, 60];  // bronze
    return C.muted;
  };

  // ── Page 1 — Summary & Leaderboard ───────────────────────────────────────

  // Header bar
  rgb(doc, C.ink, "fill");
  doc.rect(0, 0, PAGE_W, 36, "F");

  rgb(doc, C.primary, "text");
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("RecruitIntel", MARGIN, 14);

  rgb(doc, C.faint, "text");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("CANDIDATE RANKING REPORT", MARGIN, 20);

  rgb(doc, C.faint, "text");
  doc.setFontSize(8);
  doc.text(dateStr, PAGE_W - MARGIN, 14, { align: "right" });

  rgb(doc, C.white, "text");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  const jobLabel = doc.splitTextToSize(jobTitle, PAGE_W - MARGIN * 2 - 20);
  doc.text(jobLabel[0], MARGIN, 29);

  let y = 46;

  // ── Summary stats row ─────────────────────────────────────────────────────
  const avgScore = candidates.reduce((s, c) => s + c.ats_score, 0) / candidates.length;
  const topScore = candidates[0]?.ats_score ?? 0;
  const topName  = candidates[0]?.candidate_name ?? "—";
  const weakCount = candidates.filter(c => c.ats_score < 50).length;

  const statCols: [string, string][] = [
    ["CANDIDATES RANKED", candidates.length.toString()],
    ["AVERAGE ATS SCORE",  avgScore.toFixed(1)],
    ["TOP SCORE",          topScore.toFixed(1)],
    ["BELOW THRESHOLD",    `${weakCount} (< 50)`],
  ];

  rgb(doc, C.surface, "fill");
  rgb(doc, C.border, "draw");
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, CONTENT_W, 20, 2, 2, "FD");

  const cw = CONTENT_W / statCols.length;
  statCols.forEach(([label, val], idx) => {
    const cx = MARGIN + 4 + idx * cw;
    rgb(doc, C.muted, "text");
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(label, cx, y + 6);
    rgb(doc, idx === 2 ? scoreColor(topScore) : C.ink, "text");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(val, cx, y + 14);
  });

  y += 28;

  // ── Top performer callout ─────────────────────────────────────────────────
  y = checkPage(doc, y, 16);
  rgb(doc, C.primary, "fill");
  doc.roundedRect(MARGIN, y, CONTENT_W, 14, 2, 2, "F");
  rgb(doc, C.white, "text");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("TOP CANDIDATE", MARGIN + 5, y + 5);
  doc.setFontSize(10);
  doc.text(`${topName}  —  ${topScore.toFixed(1)} / 100`, MARGIN + 5, y + 11);
  y += 20;

  // ── Leaderboard table ─────────────────────────────────────────────────────
  y = drawSectionHeader(doc, y, "Leaderboard — All Candidates");

  // Table header
  y = checkPage(doc, y, 8);
  rgb(doc, C.surface, "fill");
  doc.rect(MARGIN, y, CONTENT_W, 7, "F");

  const COL = {
    rank:    MARGIN,
    name:    MARGIN + 12,
    score:   MARGIN + 80,
    skill:   MARGIN + 108,
    bar:     MARGIN + 132,
  };

  rgb(doc, C.muted, "text");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("#",             COL.rank  + 2, y + 5);
  doc.text("CANDIDATE",     COL.name,      y + 5);
  doc.text("ATS SCORE",     COL.score,     y + 5);
  doc.text("SKILL MATCH",   COL.skill,     y + 5);
  doc.text("SCORE BAR",     COL.bar,       y + 5);
  y += 9;

  // Divider
  rgb(doc, C.border, "draw");
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y - 1, PAGE_W - MARGIN, y - 1);

  candidates.forEach((c, idx) => {
    const rowH = 12;
    y = checkPage(doc, y, rowH + 2);

    // Zebra stripe
    if (idx % 2 === 0) {
      rgb(doc, [250, 252, 255], "fill");
      doc.rect(MARGIN, y, CONTENT_W, rowH, "F");
    }

    // Rank badge
    const mc = medalColor(c.rank);
    rgb(doc, mc, "fill");
    doc.roundedRect(COL.rank, y + 2, 9, 8, 1.5, 1.5, "F");
    rgb(doc, C.white, "text");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text(c.rank.toString(), COL.rank + 4.5, y + 7.5, { align: "center" });

    // Candidate name
    rgb(doc, C.ink, "text");
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    const nameLines = doc.splitTextToSize(c.candidate_name, 60);
    doc.text(nameLines[0], COL.name, y + 7.5);

    // ATS score
    rgb(doc, scoreColor(c.ats_score), "text");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(c.ats_score.toFixed(1), COL.score + 8, y + 7.5, { align: "right" });
    rgb(doc, C.muted, "text");
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("/ 100", COL.score + 9, y + 7.5);

    // Skill match
    rgb(doc, C.ink, "text");
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text(`${c.skill_match.toFixed(1)}%`, COL.skill + 14, y + 7.5, { align: "right" });

    // Score bar
    const barW = CONTENT_W - (COL.bar - MARGIN) - 2;
    drawProgressBar(doc, COL.bar, y + 4.5, barW, c.ats_score, 3);

    y += rowH;

    // Row divider
    rgb(doc, C.border, "draw");
    doc.setLineWidth(0.15);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  });

  y += 8;

  // ── Per-candidate skill gap cards ─────────────────────────────────────────
  y = drawSectionHeader(doc, y, "Skill Gap Detail — All Candidates");

  candidates.forEach((c) => {
    const cardMinH = 36;
    y = checkPage(doc, y, cardMinH);

    // Card border
    rgb(doc, C.surface, "fill");
    rgb(doc, C.border, "draw");
    doc.setLineWidth(0.3);

    // Left accent bar (color by rank)
    const mc = medalColor(c.rank);
    rgb(doc, mc, "fill");
    doc.roundedRect(MARGIN, y, 2.5, cardMinH, 0.5, 0.5, "F");

    // Candidate header
    rgb(doc, C.ink, "text");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`#${c.rank}  ${c.candidate_name}`, MARGIN + 6, y + 6);

    rgb(doc, scoreColor(c.ats_score), "text");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`${c.ats_score.toFixed(1)}`, PAGE_W - MARGIN, y + 6, { align: "right" });
    rgb(doc, C.muted, "text");
    doc.setFontSize(7);
    doc.text("ATS", PAGE_W - MARGIN, y + 11, { align: "right" });

    // Score bar under header
    drawProgressBar(doc, MARGIN + 6, y + 13, CONTENT_W - 8, c.ats_score, 2.5);

    let chipY = y + 19;

    // Matched skills
    rgb(doc, C.primaryDark, "text");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(`MATCHED  (${c.matched_skills.length})`, MARGIN + 6, chipY);
    chipY += 5;

    if (c.matched_skills.length === 0) {
      rgb(doc, C.faint, "text");
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "italic");
      doc.text("None", MARGIN + 6, chipY + 3);
      chipY += 7;
    } else {
      let cx = MARGIN + 6;
      for (const skill of c.matched_skills) {
        const chipW = doc.getTextWidth(skill) + 8;
        if (cx + chipW > PAGE_W - MARGIN) {
          cx = MARGIN + 6;
          chipY += 8;
          chipY = checkPage(doc, chipY, 8);
        }
        drawChip(doc, cx, chipY + 4, skill, C.emeraldBg, C.primaryDark);
        cx += chipW;
      }
      chipY += 9;
    }

    // Missing skills
    chipY = checkPage(doc, chipY, 14);
    rgb(doc, C.redText, "text");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(`MISSING  (${c.missing_skills.length})`, MARGIN + 6, chipY);
    chipY += 5;

    if (c.missing_skills.length === 0) {
      rgb(doc, C.faint, "text");
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "italic");
      doc.text("None — full coverage", MARGIN + 6, chipY + 3);
      chipY += 7;
    } else {
      let cx = MARGIN + 6;
      for (const skill of c.missing_skills) {
        const chipW = doc.getTextWidth(skill) + 8;
        if (cx + chipW > PAGE_W - MARGIN) {
          cx = MARGIN + 6;
          chipY += 8;
          chipY = checkPage(doc, chipY, 8);
        }
        drawChip(doc, cx, chipY + 4, skill, C.redBg, C.redText);
        cx += chipW;
      }
      chipY += 9;
    }

    y = chipY + 6;

    // Divider between cards
    rgb(doc, C.border, "draw");
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y - 3, PAGE_W - MARGIN, y - 3);
  });

  // ── Footer ────────────────────────────────────────────────────────────────
  drawPageFooter(doc);

  const safeJob = jobTitle.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
  doc.save(`RecruitIntel_Ranking_${safeJob}_${now.getFullYear()}.pdf`);
}
