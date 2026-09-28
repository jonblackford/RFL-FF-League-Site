export type WeeklyReportDocument = {
  league: string;
  season: string;
  week: number;
  teams: { name: string; points: number }[];
  matchups: string[];
  awards: { title: string; teamName: string; description: string }[];
  notes: string;
  generatedAt: string;
  performers?: { name: string; team: string; points: number }[];
};
const escape = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function weeklyReportHtml(report: WeeklyReportDocument) {
  const max = Math.max(1, ...report.teams.map((t) => t.points));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escape(report.league)} - ${escape(report.season)} Week ${report.week} report</title><style>
 @page{size:A4;margin:16mm 15mm}*{box-sizing:border-box}body{font:11pt/1.55 Arial,sans-serif;color:#14263e;background:white;margin:0}main{max-width:760px;margin:24px auto}header{background:#15273f;color:white;padding:26px;border-radius:12px;margin-bottom:22px}h1{font-size:26pt;line-height:1.15;margin:8px 0}h2{font-size:16pt;margin:22px 0 10px;break-after:avoid}p{margin:5px 0}.eyebrow{font-size:9pt;letter-spacing:2px;text-transform:uppercase}.muted{color:#62748a;font-size:9pt}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.card{padding:14px;border:1px solid #dfe6ee;border-radius:8px;break-inside:avoid}.big{font-size:24pt;font-weight:bold}.row{display:grid;grid-template-columns:1fr 72px;gap:16px;align-items:center;break-inside:avoid;margin:12px 0}.bar{height:7px;background:#e9eef4;margin-top:4px;border-radius:4px}.fill{height:7px;background:#b82e49;border-radius:4px}.points{text-align:right;font-weight:bold}.notes{white-space:pre-wrap;border:1px solid #dfe6ee;padding:16px;min-height:80px;overflow-wrap:anywhere}footer{margin-top:25px;border-top:1px solid #dfe6ee;padding-top:12px;font-size:9pt;color:#62748a}.toolbar{padding:15px;background:#f4f7fa;display:flex;justify-content:center;gap:15px}button{background:#15273f;color:white;border:0;border-radius:6px;padding:10px 18px;cursor:pointer}section,article{overflow-wrap:anywhere}@media print{.toolbar{display:none}main{max-width:none;margin:0}header,.fill{-webkit-print-color-adjust:exact;print-color-adjust:exact}a{color:inherit}h1,h2{break-after:avoid}.grid{break-inside:avoid}}
 </style></head><body><div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button><span>Select “Save as PDF” in the print dialog.</span></div><main>
 <header><p class="eyebrow">RFL Agent · Weekly league report</p><h1>${escape(report.league)}</h1><p>${escape(report.season)} season · Week ${report.week}</p></header>
 <div class="grid"><article class="card"><p class="muted">Highest score</p><p class="big">${report.teams[0]?.points.toFixed(2) ?? "—"}</p><p>${escape(report.teams[0]?.name ?? "No scored teams")}</p></article><article class="card"><p class="muted">League average</p><p class="big">${report.teams.length ? (report.teams.reduce((s, t) => s + t.points, 0) / report.teams.length).toFixed(2) : "—"}</p><p>${report.teams.length} scored teams</p></article></div>
 <section><h2>Team scoring</h2>${report.teams.map((t, i) => `<div class="row"><div>${i + 1}. ${escape(t.name)}<div class="bar"><div class="fill" style="width:${Math.max(0, (t.points / max) * 100)}%"></div></div></div><div class="points">${t.points.toFixed(2)}</div></div>`).join("")}</section>
 <section><h2>Matchup results</h2>${report.matchups.length ? report.matchups.map((m) => `<p class="card">${escape(m)}</p>`).join("") : "<p>No head-to-head result available.</p>"}</section>
 ${report.awards.length ? `<section><h2>Weekly awards</h2>${report.awards.map((a) => `<article class="card"><strong>${escape(a.title)} · ${escape(a.teamName)}</strong><p>${escape(a.description)}</p></article>`).join("")}</section>` : ""}
 ${report.performers?.length ? `<section><h2>Top player performances</h2>${report.performers.map((p) => `<p class="card"><strong>${escape(p.name)}</strong> · ${escape(p.team)} · ${p.points.toFixed(2)} points</p>`).join("")}</section>` : ""}
 <section><h2>Manager notes & next steps</h2><div class="notes">${escape(report.notes || "No notes added.")}</div></section>
 <footer>Generated ${escape(report.generatedAt)}. Source: imported league results, with the league’s recorded scoring. Results and bench awards describe past performance. They are not forecasts. AI commentary is not included unless you add it to your notes.</footer>
 </main></body></html>`;
}
export function openWeeklyReportPrint(report: WeeklyReportDocument) {
  const popup = window.open("", "_blank");
  if (!popup) throw new Error("Allow pop-ups to open your PDF report.");
  popup.opener = null;
  popup.document.open();
  popup.document.write(weeklyReportHtml(report));
  popup.document.close();
  popup.focus();
  return popup;
}
