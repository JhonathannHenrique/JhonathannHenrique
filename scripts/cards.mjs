// Gera os cards de estatísticas e de linguagens (tema claro e escuro) em dist/.
// Uso: GITHUB_TOKEN=... node scripts/cards.mjs <usuario>
import { mkdirSync, writeFileSync } from "node:fs";

const login = process.argv[2];
const token = process.env.GITHUB_TOKEN;
if (!login || !token) {
  console.error("uso: GITHUB_TOKEN=... node scripts/cards.mjs <usuario>");
  process.exit(1);
}

// Linguagens que o Flutter gera sozinho (runners de Windows, Linux, iOS, Android, web).
// Num repositório com Dart elas não representam código escrito à mão.
const FLUTTER_BOILERPLATE = new Set([
  "C++", "C", "CMake", "Swift", "Kotlin", "Objective-C", "HTML", "Ruby", "Java",
]);

const THEMES = {
  light: { bg: "#ffffff", border: "#d0d7de", title: "#1a7f37", text: "#1f2328", muted: "#59636e", icon: "#1a7f37", track: "#eff2f5" },
  dark: { bg: "#0d1117", border: "#30363d", title: "#3fb950", text: "#e6edf3", muted: "#9198a1", icon: "#3fb950", track: "#21262d" },
};

const W = 420;
const H = 200;
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

const query = `
  query ($login: String!) {
    user(login: $login) {
      followers { totalCount }
      repositories(ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC, first: 100) {
        totalCount
        nodes {
          homepageUrl
          languages(first: 15, orderBy: { field: SIZE, direction: DESC }) {
            totalSize
            edges { size node { name color } }
          }
        }
      }
      contributionsCollection {
        totalCommitContributions
        restrictedContributionsCount
        contributionCalendar { totalContributions }
      }
    }
  }`;

const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query, variables: { login } }),
});
const { data, errors } = await res.json();
if (errors || !data?.user) {
  console.error(JSON.stringify(errors ?? data, null, 2));
  process.exit(1);
}
const user = data.user;
const repos = user.repositories.nodes;
const cc = user.contributionsCollection;

// Cada repositório soma a fração de cada linguagem nele, para um projeto grande
// não engolir os outros.
const langs = new Map();
for (const repo of repos) {
  let edges = repo.languages.edges;
  if (edges.some((e) => e.node.name === "Dart")) {
    edges = edges.filter((e) => !FLUTTER_BOILERPLATE.has(e.node.name));
  }
  const total = edges.reduce((n, e) => n + e.size, 0);
  for (const { size, node } of edges) {
    const cur = langs.get(node.name) ?? { name: node.name, color: node.color ?? "#8b949e", weight: 0 };
    cur.weight += size / total;
    langs.set(node.name, cur);
  }
}

const stats = [
  ["Contribuições no último ano", cc.contributionCalendar.totalContributions, "M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8.75-4.25v3.94l2.53 2.53-1.06 1.06-2.97-2.97V3.75h1.5Z"],
  ["Commits no último ano", cc.totalCommitContributions + cc.restrictedContributionsCount, "M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5Zm-1.43-.75a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z"],
  ["Repositórios públicos", user.repositories.totalCount, "M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8Z"],
  ["Projetos publicados (com site)", repos.filter((r) => r.homepageUrl).length, "M14.064 0h.186C15.216 0 16 .784 16 1.75v.186a8.752 8.752 0 0 1-2.564 6.186l-.458.459c-.314.314-.641.616-.979.904v3.207c0 .608-.315 1.172-.833 1.49l-2.774 1.707a.749.749 0 0 1-1.11-.418l-.954-3.102a1.214 1.214 0 0 1-.145-.125L3.754 9.816a1.218 1.218 0 0 1-.124-.145L.528 8.717a.749.749 0 0 1-.418-1.11l1.71-2.774A1.748 1.748 0 0 1 3.31 4h3.204c.288-.338.59-.665.904-.979l.459-.458A8.749 8.749 0 0 1 14.064 0ZM8.938 3.623h-.002l-.458.458c-.76.76-1.437 1.598-2.02 2.5l-1.5 2.317 2.143 2.143 2.317-1.5c.902-.583 1.74-1.26 2.499-2.02l.459-.458a7.25 7.25 0 0 0 2.123-5.127V1.75a.25.25 0 0 0-.25-.25h-.186a7.249 7.249 0 0 0-5.125 2.123ZM3.56 14.56c-.732.732-2.334 1.045-3.005 1.148a.234.234 0 0 1-.201-.064.234.234 0 0 1-.064-.201c.103-.671.416-2.273 1.15-3.003a1.502 1.502 0 1 1 2.12 2.12Zm6.94-3.935c-.088.06-.177.118-.266.175l-2.35 1.521.548 1.783 1.949-1.2a.25.25 0 0 0 .119-.213ZM3.678 8.116 5.2 5.766c.058-.09.117-.178.176-.266H3.309a.25.25 0 0 0-.213.119l-1.2 1.95ZM12 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"],
  ["Linguagens diferentes", langs.size, "m11.28 3.22 4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L13.94 8l-3.72-3.72a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215Zm-6.56 0a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L2.06 8l3.72 3.72a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L.47 8.53a.75.75 0 0 1 0-1.06Z"],
  ["Seguidores", user.followers.totalCount, "M2 5.5a3.5 3.5 0 1 1 5.898 2.549 5.508 5.508 0 0 1 3.034 4.084.75.75 0 1 1-1.482.235 4 4 0 0 0-7.9 0 .75.75 0 0 1-1.482-.236A5.507 5.507 0 0 1 3.102 8.05 3.493 3.493 0 0 1 2 5.5ZM11 4a3.001 3.001 0 0 1 2.22 5.018 5.01 5.01 0 0 1 2.56 3.012.749.749 0 0 1-.885.954.752.752 0 0 1-.549-.514 3.507 3.507 0 0 0-2.522-2.372.75.75 0 0 1-.574-.73v-.352a.75.75 0 0 1 .416-.672A1.5 1.5 0 0 0 11 5.5.75.75 0 0 1 11 4Zm-5.5-.5a2 2 0 1 0-.001 3.999A2 2 0 0 0 5.5 3.5Z"],
];

const top = [...langs.values()].sort((a, b) => b.weight - a.weight).slice(0, 8);
const topTotal = top.reduce((n, l) => n + l.weight, 0);
for (const l of top) l.pct = (l.weight / topTotal) * 100;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmt = (n) => n.toLocaleString("pt-BR");

function frame(t, title, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}">
<style>
  text { font-family: ${FONT}; }
  .title { font-size: 16px; font-weight: 600; fill: ${t.title}; }
  .label { font-size: 13px; fill: ${t.text}; }
  .value { font-size: 13px; font-weight: 700; fill: ${t.text}; }
  .muted { font-size: 12px; fill: ${t.muted}; }
  .row { animation: fade .5s ease-out backwards; }
  .bar { transform-box: fill-box; transform-origin: left center; animation: grow .9s ease-out .2s backwards; }
  @keyframes fade { from { opacity: 0; transform: translateX(-6px); } }
  @keyframes grow { from { transform: scaleX(0); } }
  @media (prefers-reduced-motion: reduce) { .row, .bar { animation: none; } }
</style>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="8" fill="${t.bg}" stroke="${t.border}"/>
<text x="24" y="34" class="title">${esc(title)}</text>
${body}
</svg>
`;
}

function statsCard(t) {
  const rows = stats
    .map(([label, value, icon], i) => {
      const y = 62 + i * 22;
      return `<g class="row" style="animation-delay:${i * 120}ms">
  <svg x="24" y="${y - 12}" width="14" height="14" viewBox="0 0 16 16"><path fill="${t.icon}" d="${icon}"/></svg>
  <text x="46" y="${y}" class="label">${esc(label)}</text>
  <text x="${W - 24}" y="${y}" class="value" text-anchor="end">${fmt(value)}</text>
</g>`;
    })
    .join("\n");
  return frame(t, "Estatísticas no GitHub", rows);
}

function langsCard(t) {
  const barW = W - 48;
  let x = 24;
  const segs = top
    .map((l) => {
      const w = (l.pct / 100) * barW;
      const r = `<rect x="${x.toFixed(2)}" y="50" width="${w.toFixed(2)}" height="10" fill="${l.color}"/>`;
      x += w;
      return r;
    })
    .join("");
  const legend = top
    .map((l, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const lx = 24 + col * (barW / 2 + 8);
      const ly = 90 + row * 26;
      return `<g class="row" style="animation-delay:${300 + i * 90}ms">
  <circle cx="${lx + 5}" cy="${ly - 4}" r="5" fill="${l.color}"/>
  <text x="${lx + 16}" y="${ly}" class="label">${esc(l.name)}</text>
  <text x="${lx + barW / 2 - 12}" y="${ly}" class="muted" text-anchor="end">${l.pct.toFixed(1).replace(".", ",")}%</text>
</g>`;
    })
    .join("\n");
  const bar = `<clipPath id="r"><rect x="24" y="50" width="${barW}" height="10" rx="5"/></clipPath>
<rect x="24" y="50" width="${barW}" height="10" rx="5" fill="${t.track}"/>
<g clip-path="url(#r)"><g class="bar">${segs}</g></g>`;
  return frame(t, "Linguagens mais usadas", `${bar}\n${legend}`);
}

mkdirSync("dist", { recursive: true });
for (const [name, t] of Object.entries(THEMES)) {
  const suffix = name === "dark" ? "-dark" : "";
  writeFileSync(`dist/stats${suffix}.svg`, statsCard(t));
  writeFileSync(`dist/langs${suffix}.svg`, langsCard(t));
}
console.log("stats:", Object.fromEntries(stats.map(([k, v]) => [k, v])));
console.log("linguagens:", top.map((l) => `${l.name} ${l.pct.toFixed(1)}%`).join(", "));
