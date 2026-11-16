"use strict";

// Standalone fixtures: this mockup never connects to a bank or executes an order.
const brokerEscape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const brokerMoney = (value) =>
  Number(value).toLocaleString("fr-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const brokerButton = (view, label) =>
  `<button type="button" data-view="${view}">${label}</button>`;

// Fixed SVG outlines keep the reference icons independent of system glyph fonts.
function decorateBrokerIcons(root) {
  const paths = {
    chevron: "M6 9l6 6 6-6",
    circle: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
    play: "m8 5 12 7-12 7Z",
    person: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 22v-3a8 8 0 0 1 16 0v3Z",
    logout: "M9 4H3v16h6M8 12h13m-5-5 5 5-5 5",
    plus: "M12 5v14M5 12h14",
    upload: "M12 17V3m-5 5 5-5 5 5M4 15v6h16v-6",
    bookmark: "M6 3h12v18l-6-4-6 4Z",
    scales: "M12 3v18M5 21h14M3 7h18M6 7l-4 8h8Zm12 0-4 8h8Z",
    bell: "M5 17h14l-2-4V8a5 5 0 0 0-10 0v5ZM10 21h4",
    drag: "M12 2v20M2 12h20M8 6l4-4 4 4M8 18l4 4 4-4M6 8l-4 4 4 4M18 8l4 4-4 4",
    pencil: "m4 16 12-12 4 4L8 20H4ZM14 6l4 4",
    heart: "M12 21 3 12a6 6 0 0 1 9-8 6 6 0 0 1 9 8Z",
    document: "M5 2h10l4 4v16H5ZM14 2v6h5M8 12h8M8 16h8",
    star: "m12 2 3 7 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1Z",
    target:
      "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z",
    menu: "M4 5h16M4 12h16M4 19h16",
    diamond: "m12 3 9 9-9 9-9-9Z",
    grid: "M3 3h18v18H3ZM3 9h18M3 15h18M9 3v18M15 3v18",
    gear: "M12 4V1m0 22v-3M4 12H1m22 0h-3M6 6 4 4m16 16-2-2M6 18l-2 2M20 4l-2 2M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
    expand: "M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6",
    minus: "M4 12h16",
    trash: "M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7",
  };
  const symbols = {
    "⌄": "chevron",
    "◯": "circle",
    "▷": "play",
    "♙": "person",
    "⇥": "logout",
    "⊕": "plus",
    "♧": "upload",
    "▴": "chevron",
    "▯": "bookmark",
    "⚖": "scales",
    "✥": "drag",
    "♢": "pencil",
    "♥": "heart",
    "▤": "document",
    "☆": "star",
    "★": "star",
    "⊙": "target",
    "☰": "menu",
    "◇": "diamond",
    "▥": "grid",
    "▦": "grid",
    "⚙": "gear",
    "⛶": "expand",
    "⊖": "minus",
    "＋": "plus",
    "✉": "document",
  };
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if ([...node.textContent].some((c) => symbols[c])) nodes.push(node);
  }
  for (const node of nodes) {
    const fragment = document.createDocumentFragment();
    for (const char of node.textContent) {
      if (!symbols[char]) {
        fragment.append(document.createTextNode(char));
        continue;
      }
      const name = symbols[char];
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("class", "broker-icon");
      svg.setAttribute("aria-hidden", "true");
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path.setAttribute("d", paths[name]);
      svg.append(path);
      if (char === "★" || char === "♥") svg.classList.add("filled-icon");
      if (char === "▴") svg.classList.add("sort-icon");
      if (
        node.parentElement?.matches('[data-action="alert"],.profile-line-icon')
      )
        path.setAttribute("d", paths.bell);
      if (node.parentElement?.matches('[data-remove-reference], [data-remove], [data-action="delete-list"], [data-action="etf-remove"]'))
        path.setAttribute("d", paths.trash);
      fragment.append(svg);
    }
    node.replaceWith(fragment);
  }
}

function initBrokerage(data, selectProfile, markDirty) {
  if (new URLSearchParams(location.search).get("demo") !== "brokerage") return;
  mountBrokerage(data, { selectProfile, markDirty });
}

function mountBrokerage(data, integration = null) {
  const referenceWatchlist = [
      [
        "LSPD",
        "LIGHTSPEED COMMERCE INC.",
        "19.10",
        "-0.21",
        "-1.09%",
        "19.09",
        "19.10",
        "252.47K",
        "18.80-19.18",
      ],
      [
        "INE",
        "INNERGEX RENEWABLE ENRGY INC.",
        "8.03",
        "-0.20",
        "-2.43%",
        "8.02",
        "8.03",
        "280.78K",
        "7.95-8.11",
      ],
      [
        "BIP.UN",
        "BROOKFIELD INFRASTRUCTURE PARTNERS LP",
        "38.78",
        "-0.86",
        "-2.17%",
        "38.70",
        "38.74",
        "213.33K",
        "38.27-38.95",
      ],
      [
        "T",
        "TELUS CORP",
        "21.95",
        "-0.34",
        "-1.53%",
        "21.94",
        "21.95",
        "2.43M",
        "21.90-22.15",
      ],
      [
        "AC",
        "AIR CANADA",
        "19.75",
        "0.06",
        "0.28%",
        "19.74",
        "19.75",
        "924.76K",
        "19.48-19.89",
      ],
    ];
  // Native345s: second lines are transcribed without inferring an unseen label.
  const referenceListDepth = {
    LSPD: {bidSize: "100", askSize: "200", secondaryVolume: "597.27K"},
    INE: {bidSize: "600", askSize: "700", secondaryVolume: "587.77K"},
    "BIP.UN": {bidSize: "900", askSize: "100", secondaryVolume: "534.54K"},
    T: {bidSize: "200", askSize: "10.3K", secondaryVolume: "3.84M"},
    AC: {bidSize: "3.5K", askSize: "1.7K", secondaryVolume: "2.27M"},
  };
  // These are observations of the 2024 walkthrough, separate from the pack.
  const referenceHoldings = [
    ["ZQQ", "BMO NASDAQ 100 EQ ETF", "42.87"],
    ["BBD.B", "BOMBARDIER INC-B SVS NEW", "59.87"],
    ["ENB", "ENBRIDGE INC", "47.06"],
    ["K", "KINROSS GOLD CORP", "8.68"],
    ["LEV", "LION ELECTRIC COMPANY", "1.76"],
    ["NA", "NATIONAL BANK OF CDA", "113.34"],
  ];
  const referenceQuickQuotes = [
        [
          "ZQQ",
          "BMO NASDAQ 100 EQ ETF",
          "42.87",
          "-0.43 (-0.99%)",
          "42.90",
          "42.91",
          "24.99K",
          "50.92K",
          "42.85",
          "43.30",
        ],
        [
          "BBD.B",
          "BOMBARDIER INC-B SVS NEW",
          "59.87",
          "-1.57 (-2.56%)",
          "59.86",
          "59.93",
          "300.95K",
          "409.67K",
          "59.40",
          "61.55",
        ],
        [
          "ENB",
          "ENBRIDGE INC",
          "47.06",
          "-0.84 (-1.75%)",
          "47.06",
          "47.07",
          "2.26M",
          "4.27M",
          "46.96",
          "47.98",
        ],
        [
          "K",
          "KINROSS GOLD CORP",
          "8.68",
          "-0.08 (-0.91%)",
          "8.68",
          "8.69",
          "1.81M",
          "4.12M",
          "8.50",
          "8.92",
        ],
        [
          "LEV",
          "LION ELECTRIC COMPANY",
          "1.76",
          "-0.04 (-2.22%)",
          "1.76",
          "1.77",
          "107.36K",
          "308.64K",
          "1.74",
          "1.82",
        ],
        [
          "NA",
          "NATIONAL BANK OF CDA",
          "113.34",
          "-0.45 (-0.40%)",
          "113.34",
          "113.38",
          "310.86K",
          "2.85M",
          "112.53",
          "114.00",
        ],
      ];
  const referenceAssets = [...referenceWatchlist, ...referenceHoldings].map(
    (row) => ({ticker: row[0], name: row[1], market: "TOR", currency: "CAD",
      reference: true, observation: row}),
  );
  const securities = [...data.assets, ...referenceAssets.filter(
    (item) => !data.assets.some((a) => a.ticker === item.ticker))];
  const assets = data.assets;
  let profileKey = "robert",
    ticker = integration ? "NVDA" : "FTS.TO",
    currentView = "summary",
    quoteTab = "Overview";
  const lists = [{id: 1, name: "STOCKS ON MY RADAR", favorite: false,
    observed: [...referenceWatchlist], added: [], unseen: 3}];
  let selectedListId = 1, nextListId = 2, listCount = 5;
  let alerts = [], orders = [];
  let etfTab = 0, etfRegion = "Canada", etfCollapsed = false;
  const selectedList = () => lists.find((list) => list.id === selectedListId);
  function ensureList() {
    if (!selectedList()) {
      const list = {id: nextListId++, name: "My watchlist", favorite: false,
        observed: [], added: [], unseen: 0};
      lists.push(list); selectedListId = list.id; listCount++;
    }
    return selectedList();
  }
  let range = "1Y",
    activeMenu = "";
  const shell = document.createElement("section");
  shell.id = "brokerage";
  shell.setAttribute("aria-label", "Mockup de plateforme de courtage");
  shell.innerHTML = `
    <header class="bank-header"><a class="bank-brand" href="/assets/mockup.html" aria-label="National Bank Direct Brokerage · simulation"><img src="/assets/nbdb-reference-logo.png" alt="National Bank Direct Brokerage"></a>
      <div class="bank-utilities"><button data-action="help" aria-label="FAQ">FAQ</button><button data-action="messages" aria-label="Messages"><svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor"><rect x="3" y="5" width="18" height="14" rx="1"/><path d="m3 6 9 7 9-7"/></svg></button>
      <button data-view="profile" class="user-chip"><span class="user-outline">♙</span> <span id="broker-user">Usage Interne Seulement</span></button><button class="logout" data-action="logout">⇥ &nbsp; Logout</button></div></header>
    <div class="bank-page"><div class="bank-toolbar"><nav class="bank-nav" aria-label="Main navigation"></nav>
      <div class="bank-actions"><button data-action="buy">Buy</button><button data-action="sell" class="sell">Sell</button><button data-action="transfer">Transfer</button><button data-action="search" class="blue">Get a quote <span class="search-symbol"></span></button><button data-action="tools">Toolbox⌄</button></div><div id="bank-navigation-dropdown" class="bank-dropdown" hidden></div></div>
      <div class="bank-heading"><h1 id="broker-page-title">Summary</h1><select class="account-selector" aria-label="Selected accounts"><option>4 selected accounts</option><option>CAD Margin</option><option>USD Margin</option></select><div class="reference-time"><span class="refresh-symbol"><svg viewBox="0 0 50 50" aria-hidden="true"><path d="M10 19A16 16 0 0 1 38 13l4 7M42 7v13H29M40 31A16 16 0 0 1 12 37l-4-7M8 43V30h13" fill="none" stroke="#1578bb" stroke-width="3"/><path class="quote-refresh-ring" d="M27 2A23 23 0 0 1 27 48" fill="none" stroke="#c40023" stroke-width="3"/></svg></span><span id="quote-timestamp">Apr 10, 2024, 1:22:35 PM <span class="info-icon">i</span><small>Quotes are delayed by 15 min</small></span></div><select class="view-selector" aria-label="Display view"><option>Normal view</option><option>Compact view</option></select><div class="bank-context" ${integration ? "" : "hidden"}><label for="broker-profile">Verity</label><select id="broker-profile"></select></div></div>
      <div id="broker-content"></div><footer class="bank-footer"><span>◯ in &nbsp; ◯ ▷</span><span>♧ &nbsp; Print &nbsp; Version Française &nbsp; | &nbsp; Privacy Policy &nbsp; | &nbsp; ABC’s of security &nbsp; | &nbsp; Digital data policy &nbsp; | &nbsp; Accessibility &nbsp; | &nbsp; Sitemap &nbsp; | &nbsp; Go to our home page &nbsp; <img src="/assets/nbdb-reference-logo.png" alt="National Bank"></span></footer><div class="reference-notice">SIMULATION · Walkthrough snapshot, 10 Apr 2024 · No bank connection</div></div>
    <dialog id="broker-action-dialog" aria-labelledby="broker-action-title"><div class="action-heading"><h2 id="broker-action-title"></h2><button data-action="close" aria-label="Fermer">×</button></div><div id="broker-action-body"></div></dialog>
    <button class="bank-chat" data-action="messages" aria-label="Chat"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 8h23a5 5 0 0 1 5 5v13a5 5 0 0 1-5 5H18L8 39v-8a5 5 0 0 1-5-5V13a5 5 0 0 1 5-5" fill="white"/><path d="M36 21h3a5 5 0 0 1 5 5v16l-8-7H22a5 5 0 0 1-5-4h14a6 6 0 0 0 5-6Z" fill="#adc7d7"/></svg></button><div class="broker-toast" role="status" aria-live="polite" hidden></div>`;
  document.body.classList.add("brokerage-mode");
  const laboratory = integration ? document.querySelector("main") : null;
  if (laboratory) laboratory.before(shell);
  else document.getElementById("mockup-root").append(shell);
  const content = shell.querySelector("#broker-content");
  const actionDialog = shell.querySelector("#broker-action-dialog");
  const menus = {
    Comptes: [
      ["summary", "Summary"],
      ["holdings", "Holdings"],
      ["quickcharts", "Quotes & Charts"],
      ["allocation", "Asset Allocation"],
      ["performance", "Performance"],
    ],
    Marchés: [
      ["markets", "Overview"],
      ["quote", "Quote"],
      ["etf", "ETF Center"],
      ["watchlists", "Watchlists"],
      ["technical", "Trading Central"],
      ["strategy", "OptionsPlay®"],
      ["bonds", "Fixed Income"],
    ],
    Activités: [["activity", "Orders & transactions"]],
    Documents: [["documents", "Statements & documents"]],
    Recherche: [
      ["research", "Research centre"],
      ["technical", "Technical Insight™"],
      ["fundamental", "Fundamental Insight™"],
    ],
  };
  const titles = {
    summary: "Summary",
    holdings: "Holdings",
    quickcharts: "Quotes & Charts",
    allocation: "Asset Allocation",
    performance: "Performance",
    markets: "Overview",
    quote: "Quote",
    watchlists: "Watchlists",
    etf: "ETF Center",
    activity: "Activities",
    documents: "Documents",
    research: "Research",
    technical: "Trading Central",
    fundamental: "Trading Central",
    strategy: "OptionsPlay®",
    bonds: "Fixed Income",
    profile: "My profile",
  };
  const nav = shell.querySelector(".bank-nav");
  Object.keys(menus).forEach((label) => {
    const b = document.createElement("button");
    b.textContent =
      {
        Comptes: "Accounts",
        Marchés: "Markets",
        Activités: "Activities",
        Documents: "Documents",
        Recherche: "Research",
      }[label] + "⌄";
    b.dataset.menu = label;
    b.setAttribute("aria-expanded", "false");
    b.setAttribute("aria-controls", "bank-navigation-dropdown");
    nav.append(b);
  });
  const profileSelect = shell.querySelector("#broker-profile");
  Object.entries(data.profiles).forEach(([key, p]) => {
    const o = document.createElement("option");
    o.value = key;
    o.textContent = p.name;
    profileSelect.append(o);
  });
  function asset() {
    return securities.find((a) => a.ticker === ticker);
  }
  const number = (v) =>
    Number(v).toLocaleString("en-CA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  function fixture(a) {
    if (a.ticker === "FTS.TO")
      return {
        price: 52.17,
        change: -2.05,
        absolute: -1.09,
        date: "Apr 10, 2024, 1:24:32 PM",
        volume: 559620,
        open: 52.93,
        high: 52.94,
        low: 51.94,
        previous: 53.26,
      };
    if (a.reference) {
      const q = referenceQuickQuotes.find((row) => row[0] === a.ticker);
      if (q) {
        const delta = q[3].match(/(-?[\d.]+) \((-?[\d.]+)%\)/);
        const index = referenceQuickQuotes.indexOf(q);
        return {price: Number(q[2]), absolute: Number(delta[1]),
          change: Number(delta[2]), bid: q[4], ask: q[5], volume: q[6],
          averageVolume: q[7], bidSize: ["400","100","1.1K","7.7K","1.9K","100"][index],
          askSize: ["600","200","1.3K","13K","18.2K","300"][index],
          twoDayRange: q[8] + " - " + q[9], dayRange: "—",
          date: "Apr 10, 2024, 1:34:38 PM · Supplied walkthrough"};
      }
      const r = a.observation;
      return {price: Number(r[2]), absolute: r[3] ? Number(r[3]) : null,
        change: r[4] ? Number(r[4].replace("%", "")) : null,
        volume: r[7] || null, bid: r[5] || "—", ask: r[6] || "—",
        ...(referenceListDepth[a.ticker] || {}),
        dayRange: r[8] || "—", date: "Apr 10, 2024, 1:29:26 PM · Supplied walkthrough"};
    }
    const snapshot = QUOTE_SNAPSHOTS[a.ticker];
    return snapshot
      ? { ...snapshot, absolute: snapshot.price - snapshot.previous }
      : null;
  }
  function chart(color = "#1477b8", tall = false) {
    const points =
      (typeof QUOTE_HISTORY !== "undefined" && QUOTE_HISTORY[ticker]) || [];
    if (!points.length)
      return '<p class="missing-data">Historical prices are not present in the supplied pack.</p>';
    const days =
      { "1D": 2, "5D": 5, "1M": 22, "3M": 66, "6M": 130, "1Y": 260, "5Y": 260 }[
        range
      ] || 260;
    const visible = points.slice(-days),
      values = visible.map((p) => p.close),
      low = Math.min(...values),
      high = Math.max(...values),
      span = high - low || 1;
    const coords = values
      .map(
        (v, i) =>
          `${50 + (i / Math.max(1, values.length - 1)) * 700},${150 - ((v - low) / span) * 120}`,
      )
      .join(" ");
    return `<svg class="bank-chart ${tall ? "tall" : ""}" viewBox="0 0 800 180" role="img" aria-label="Daily closing prices from the official pack, ${visible[0].date} to ${visible[visible.length - 1].date}"><path class="chart-grid" d="M50 30H750M50 90H750M50 150H750"/><polyline stroke="${color}" class="chart-line" points="${coords}" fill="none"/><text x="5" y="35" font-size="12" fill="#657785">${high.toFixed(2)}</text><text x="5" y="152" font-size="12" fill="#657785">${low.toFixed(2)}</text><text x="50" y="174" font-size="11" fill="#657785">${visible[0].date}</text><text x="680" y="174" font-size="11" fill="#657785">${visible[visible.length - 1].date}</text></svg>`;
  }
  function subnav(items) {
    return `<div class="bank-subnav">${items.map(([v, l]) => `<button data-view="${v}" aria-pressed="${currentView === v}">${l}</button>`).join("")}</div>`;
  }
  function quoteLink(t) {
    return `<button class="ticker-link" data-ticker="${brokerEscape(t)}">${brokerEscape(t)}</button>`;
  }
  function holdingsTable() {
    return `<div class="table-scroll"><table><thead><tr>${["Symbol / Description", "Quantity", "Market price", "Market value", "Book value", "Unrealized gain/loss", ""].map((t) => `<th>${t}</th>`).join("")}</tr></thead><tbody id="broker-holdings">${referenceHoldings
      .map(
        ([t, n, v]) =>
          `<tr><td><button data-reference-ticker="${t}">${t} ›</button><small>${n}</small></td><td>—</td><td>${v}</td><td>—</td><td>—</td><td>—</td><td><button data-reference-trade="${t}">Buy</button></td></tr>`,
      )
      .join(
        "",
      )}</tbody></table></div><small>Only values visible in the reference are reproduced; account quantities are not supplied.</small>`;
  }
  function accountView() {
    if (currentView === "holdings")
      return `<section class="bank-card"><h2>CAD Margin</h2>${holdingsTable()}</section>`;
    return `<div class="bank-card total-card reference-total"><div><span>Total assets</span><strong>494.22</strong></div><div><span>Day's change <span class="info-icon">i</span></span><p class="negative">-4.82 (-0.967%)↓</p></div><button data-action="summary-details">See more</button></div>
      <section class="bank-card reference-accounts"><div class="account-details"><div><h2>EQUIPE DDA BNCD</h2><span>66Q7KH</span></div><div><span>Buying power</span><b>363.85 CAD</b><button data-action="buying-power" class="text-link">See details</button></div><div><span>Margin</span><b>387.70</b><small>As of last business day</small></div><div><span>Transactions <span class="info-icon">i</span></span><b>4 in April</b><small>22 Last 3 months</small></div><select aria-label="Account currency"><option>All currencies</option><option>CAD</option><option>USD</option></select></div>
      <div class="table-scroll"><table class="reference-account-table"><colgroup><col><col><col><col><col><col><col></colgroup><thead><tr><th>Accounts ▴</th><th>Cash</th><th>Investments</th><th>Total cash & investments</th><th>Day's change <span class="info-icon">i</span></th><th>Book value</th><th>Unrealized gain/loss</th></tr></thead><tbody id="broker-holdings">${[
        [
          "USD Securities Lending",
          "0.00",
          "0.00",
          "0.00",
          "0.00",
          "0.00",
          "0.00 &nbsp; (0.00%)",
        ],
        [
          "CAD Margin",
          "132.93",
          "359.86",
          "492.79",
          "-4.83↓",
          "353.02",
          "6.83 &nbsp; (1.93%)↑",
        ],
        [
          "USD Margin",
          "1.05",
          "0.00",
          "1.05",
          "0.00",
          "0.00",
          "0.00 &nbsp; (0.00%)",
        ],
        [
          "CAD Securities Lending",
          "0.00",
          "0.00",
          "0.00",
          "0.00",
          "0.00",
          "0.00 &nbsp; (0.00%)",
        ],
      ]
        .map(
          (r) =>
            `<tr><td><button data-view="holdings" class="account-link">${r[0]} <em>›</em></button></td>${r
              .slice(1)
              .map(
                (v, i) =>
                  `<td class="${i === 3 && v.startsWith("-") ? "negative" : i === 5 && r[0] === "CAD Margin" ? "positive" : ""}">${v}</td>`,
              )
              .join("")}</tr>`,
        )
        .join(
          "",
        )}</tbody><tfoot><tr><td>Total CAD <span class="info-plus">⊕</span></td><td>134.37</td><td>359.86</td><td>494.22</td><td class="negative">-4.83↓</td><td>353.02</td><td class="positive">6.83 &nbsp; (1.93%)↑</td></tr></tfoot></table></div><div class="reference-rate"><span>Rate:</span> USD / CAD = &nbsp;1.3687</div><div class="card-footer"><button id="broker-inspect" data-view="quote">${integration ? "Understand an investment →" : "FTS · Get a quote →"}</button><button data-action="export-summary">♧ &nbsp; Export</button></div></section>`;
  }
  function quoteView() {
    const a = asset(),
      f = fixture(a),
      isFTS = a.ticker === "FTS.TO";
    const facts = isFTS
      ? [
          [
            ["Bid", "52.17"],
            ["Ask", "52.19"],
            ["Open", "52.93"],
          ],
          [
            ["Size", "600"],
            ["Size", "1.1K"],
            ["Previous close", "53.26"],
          ],
          [
            ["Day’s range", "51.94 - 52.94"],
            ["52 wks. range", "49.82 - 62.00"],
            ["Date low/high", "Oct 02 - May 11"],
          ],
          [
            ["Avg. volume 30 days", "1.25M"],
            ["Outstanding shares", "493.01M"],
            ["Market cap", "26.26B"],
          ],
          [
            ["Revenues", "11.52B"],
            ["P/E (12 mos.)", "17.21"],
            ["EPS (12 mos.)", "3.10"],
          ],
          [
            ["Beta", "0.17"],
            ["Volume", "559.62K"],
          ],
        ]
      : f
        ? [
            [
              ["Bid", f.bid || "—"],
              ["Ask", f.ask || "—"],
              ["Open", Number.isFinite(f.open) ? number(f.open) : "—"],
            ],
            [
              ["Size", f.bidSize || "—"],
              ["Size", f.askSize || "—"],
              ["Previous close", Number.isFinite(f.previous) ? number(f.previous) : "—"],
            ],
            [
              [f.twoDayRange ? "Low-High (2D)" : "Day’s range", f.twoDayRange || f.dayRange || `${number(f.low)} - ${number(f.high)}`],
              ["52 wks. range", "—"],
              ["Date low/high", "—"],
            ],
            [
              ["Volume", f.volume === null ? "—" : f.volume.toLocaleString("en-CA")],
              ["Avg. volume 30 days", f.averageVolume || "—"],
              ["Market cap", "—"],
              ["P/E", "—"],
            ],
          ]
        : [];
    return `<section class="bank-card reference-quote"><div class="quote-heading"><div class="quote-main"><h2 id="broker-title">${isFTS ? "FTS Fortis Inc. (TOR)" : brokerEscape(a.ticker + " " + a.name + " (" + a.market + ")")} <span class="country-flag">${a.currency === "CAD" ? '<img src="/assets/canada.svg" alt="Canada">' : "US"}</span></h2><div class="quote-summary"><div><span>Last price</span><strong>${f ? number(f.price) : "—"}</strong></div><div><span>Day's change</span><strong class="${f && f.change < 0 ? "negative" : "positive"}">${f && f.absolute !== null ? (f.absolute > 0 ? "+" : "") + number(f.absolute) + "(" + f.change.toFixed(2) + "%)" + (f.change < 0 ? "↓" : "↑") : "—"}</strong></div><div><span>Vol.</span><strong>${isFTS ? "559.62K" : a.reference ? f.volume || "—" : f ? (f.volume / 1000000).toFixed(2) + "M" : "—"}</strong></div><div class="quote-rating"><span>National Bank Financial ›</span><b>${isFTS ? "Sector Perform" : "—"}</b></div><div class="quote-rating"><span>Morningstar ›</span><b class="blue-text">${isFTS ? "★★★★<em class='muted-star'>★</em>" : "—"}</b></div><div class="quote-rating"><span>Analysts’<br>recommendations ›</span><b>${isFTS ? "Hold" : "—"}</b><small>${isFTS ? "(15 Analysts)" : "Not in supplied data"}</small></div><div class="quote-rating technical-rating"><span>Technical events summary ›</span>${isFTS ? "<b><i>8</i> <i>12</i></b>" : "—"}</div></div><small class="quote-source-time">${f ? brokerEscape(f.date) : "No observation available"}${isFTS || a.reference ? "" : " · Official datathon pack · Historical close"}</small></div><div class="quote-actions"><div><button data-action="buy" class="blue">Buy</button><button data-action="sell" class="sell">Sell</button></div><button data-action="watch">Add to watchlist ▯</button><button data-action="compare">Compare ⚖</button><button data-action="alert">Create Alerts ♧</button></div></div>
      <div class="quote-facts reference-facts"><div><h3>Key quote info</h3><div class="quote-fact-columns">${facts.map((col) => `<dl>${col.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>`).join("")}</div></div><div class="dividend-facts"><h3>Dividends</h3><div class="quote-fact-columns">${(isFTS
        ? [
            [
              ["Dividend indicated", "0.59"],
              ["Ex-dividend date", "May 16, 2024"],
              ["Annual yield", "4.34%"],
            ],
            [
              ["Pay date", "Jun 1, 2024"],
              ["Industry average", "3.30%"],
              ["Dividend frequency", "Quarterly,<br>constant rate"],
            ],
          ]
        : [
            [
              ["Dividend indicated", "—"],
              ["Ex-dividend date", "—"],
              ["Annual yield", "—"],
            ],
            [
              ["Pay date", "—"],
              ["Industry average", "—"],
              ["Dividend frequency", "—"],
            ],
          ]
      )
        .map(
          (col) =>
            `<dl>${col.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>`,
        )
        .join("")}</div></div></div>
      ${integration && !assets.some((x) => x.ticker === ticker) ? `<p class="missing-data">Verity analysis is unavailable: this security is not in the supplied 31-asset pack.</p>` : ""}
      ${integration && assets.some((x) => x.ticker === ticker) ? `<div class="lens-entry"><span class="lens-icon"></span><div><h3>Understand before you invest.</h3><p id="broker-intent-summary">${brokerEscape(data.profiles[profileKey].name)} · ${brokerEscape(ticker)}</p></div><label class="integration-ticker">Investment<select id="broker-ticker">${assets.map((x) => `<option value="${brokerEscape(x.ticker)}" ${x.ticker === ticker ? "selected" : ""}>${brokerEscape(x.ticker)}</option>`).join("")}</select></label><button id="broker-launch">Comprendre le risque →</button></div>` : ""}
      <div class="bank-subnav quote-tabs">${["Overview", "Analysis", "Technical Insight™", "Fundamental Insight™", "OptionsPlay®", "Options", "Financial"].map((t) => `<button data-quote-tab="${t}" aria-pressed="${t === quoteTab}">${t}</button>`).join("")}</div><div id="quote-tab-content">${quoteTabContent()}</div></section>`;
  }
  function quoteTabContent() {
    // Licensed Fortis reports must never be attributed to another security.
    if (ticker !== "FTS.TO" && quoteTab !== "Overview")
      return `<div class="reference-research"><h3>${brokerEscape(quoteTab)} · ${brokerEscape(asset().name)}</h3><p>Reports and observations for this security were not included in the supplied reference.</p></div>`;
    if (quoteTab === "Overview")
      return `<div class="chart-toolbar"><div class="chart-range">${["1D", "5D", "1M", "3M", "6M", "1Y", "5Y"].map((r) => `<button data-range="${r}" aria-pressed="${range === r}">${r}</button>`).join("")}</div><span>Chart &nbsp; | &nbsp; Data</span></div>${chart()}<div class="chart-labels"><span>Historical snapshot · Apr 10, 2024</span><span>Prices shown in CAD</span></div>`;
    if (quoteTab === "Analysis")
      return `<div class="reference-analysis"><article><h3><img src="/assets/nbdb-reference-logo.png" alt="National Bank Financial" width="110"></h3><a href="#" data-action="report">Analyst Report &nbsp; | &nbsp; Company Report</a><hr><span>Sector Perform</span><dl><dt>Target price</dt><dd>$61.00</dd><dt>Last report</dt><dd>Feb 16, 2024</dd></dl><button data-action="report">See more reports ›</button></article><article><h3><span class="morningstar">Ⓜ</span> Morningstar</h3><a href="#" data-action="report">Analyst Report &nbsp; | &nbsp; Data Tear Sheet</a><hr><b class="blue-text">★★★★</b><dl><dt>Last report</dt><dd>Feb 15, 2024</dd><dt>Fair value</dt><dd>—</dd><dt>Economic moat</dt><dd>Narrow</dd></dl></article><article><h3>Trading Central highlights</h3><div class="rating-bar"><span></span>Financial stability</div><div class="rating-bar"><span></span>Dividend stability</div><h4>Support & Resistance</h4><p>Support &nbsp; <b>$51.50</b> &nbsp; Resistance &nbsp; <b>$53.44</b></p><h4>Value and Price Stability</h4><p>Fair value <b>$81.94</b> &nbsp; Margin of safety <b>$4.40</b></p></article><article><h3>Analysts’ recommendations</h3><p>Hold · 15 analysts</p></article><article><h3>Sector Reports</h3><button data-action="report">See more reports ›</button></article></div>`;
    if (quoteTab === "Technical Insight™")
      return `<div class="reference-research"><h3>Technical Insight™</h3><p>FTS · Fortis Inc. &nbsp; CANADA</p>${chart()}<div class="signal-grid"><div>Short term<br><b>Neutral</b></div><div>Intermediate term<br><b>Bearish</b></div><div>Long term<br><b>Bullish</b></div></div></div>`;
    if (quoteTab === "Fundamental Insight™")
      return `<div class="reference-research"><h3>Fundamental Insight™</h3><p>FTS · Fortis Inc. &nbsp; Utilities</p><div class="signal-grid">${["Value", "Growth", "Quality", "Income", "Momentum"].map((v, i) => `<article><h4>${v}</h4><strong>—</strong></article>`).join("")}</div><small>Historical interface reproduction; scores shown only where observed. Full licensed report unavailable.</small></div>`;
    if (quoteTab === "OptionsPlay®") return optionsSurface();
    if (quoteTab === "Options")
      return `<h3>Options chain · FTS</h3><label>Expiration <select><option>May 17, 2024</option><option>Jun 21, 2024</option></select></label><table><thead><tr><th>Calls</th><th>Bid</th><th>Ask</th><th>Strike</th><th>Bid</th><th>Ask</th><th>Puts</th></tr></thead><tbody>${[48, 50, 52, 54, 56].map((v) => `<tr><td>—</td><td>—</td><td>—</td><td>${v}.00</td><td>—</td><td>—</td><td>—</td></tr>`).join("")}</tbody></table>`;
    return `<h3>Financial information · Fortis Inc.</h3><div class="signal-grid"><article>Revenue (12 mos.)<strong>11.52B</strong></article><article>EPS (12 mos.)<strong>3.10</strong></article><article>Market cap<strong>26.26B</strong></article></div><small>As displayed in the supplied walkthrough, Apr 10, 2024.</small>`;
  }
  function marketsView() {
    const indices = [
      ["S&P/TSX", "22,127.16", "-234.62", "-1.05%"],
      ["S&P/TSX 60", "1,325.31", "-14.97", "-1.12%"],
      ["TSX-V", "585.03", "-3.14", "-0.53%"],
      ["DJIA", "38,320.34", "-563.33", "-1.45%"],
      ["SPX", "5,140.63", "-69.28", "-1.33%"],
      ["NASDAQ", "16,106.33", "-200.31", "-1.23%"],
      ["Crude oil", "84.96", "-0.27", "-0.32%"],
      ["Gold", "2,335.00", "-8.50", "-0.36%"],
      ["Silver", "27.99", "+0.09", "+0.34%"],
    ];
    return `<div class="bank-subnav"><button aria-pressed="true">Overview</button><button data-action="screener">Mutual fund screener</button></div><section class="bank-card reference-markets"><h2>Trends in indices</h2><div class="market-filters">${["Canada", "United States", "Commodities", "Currencies", "Others"].map((v, i) => `<label><input type="checkbox" ${i < 3 ? "checked" : ""} data-market-group="${i}">${v}</label>`).join("")}</div><div class="market-grid">${indices.map(([n, v, c, percent], i) => `<article data-index="${i}"><span>${n} ›</span><strong>${v}</strong><span class="market-percent ${c.startsWith("+") ? "positive" : "negative"}">${percent}</span><div class="index-bottom"><b class="${c.startsWith("+") ? "positive" : "negative"}">${c}</b>${sparkline(i, c.startsWith("+"), true)}</div></article>`).join("")}</div><div class="top-movers-heading"><h2>Top movers</h2><button data-action="mover-stocks">Stocks</button><button data-action="mover-etfs">ETFs</button></div>${assetTable(assets.slice(0, 8))}</section>`;
  }
  function sparkline(seed = 0, positive = false, reference = false) {
    if (reference) {
      const shape = REFERENCE_INDEX_PATHS[seed],
        points = shape.points;
      const baseline = seed < 6 ? 12 : 40;
      return `<svg viewBox="0 0 ${shape.width} ${shape.height}" class="sparkline" role="img" aria-label="Historical index chart traced from the supplied walkthrough"><path d="M0 ${baseline}H${shape.width}" stroke="#b8b8b8" stroke-dasharray="5 4"/><polygon points="0,${baseline} ${points.map((p) => p[0] + "," + p[1]).join(" ")} ${shape.width},${baseline}" fill="${positive ? "#359477" : "#d95b33"}" opacity=".08"/>${points
        .slice(1)
        .map(
          (p, i) =>
            `<path d="M${points[i][0]} ${points[i][1]}L${p[0]} ${p[1]}" stroke="${p[2]}" stroke-width="1.8" fill="none"/>`,
        )
        .join("")}</svg>`;
    }
    const shape = REFERENCE_QUOTE_PATHS[seed % REFERENCE_QUOTE_PATHS.length],
      points = shape.points;
    return `<svg viewBox="0 0 ${shape.width} ${shape.height}" class="sparkline" role="img" aria-label="Historical quote chart traced from supplied walkthrough">${points
      .slice(1)
      .map(
        (p, i) =>
          `<path d="M${points[i][0]} ${points[i][1]}L${p[0]} ${p[1]}" stroke="${p[2]}" stroke-width="1.5" fill="none"/>`,
      )
      .join("")}</svg>`;
  }
  function assetTable(rows) {
    return `<div class="table-scroll"><table><thead><tr><th>Symbol</th><th>Description</th><th>Exchange</th><th>Historical close</th><th>Change</th><th></th></tr></thead><tbody>${rows
      .map((a) => {
        const f = fixture(a);
        return `<tr><td>${quoteLink(a.ticker)}</td><td>${brokerEscape(a.name)}</td><td>${brokerEscape(a.market)}</td><td>${brokerMoney(f.price)}</td><td class="${f.change >= 0 ? "positive" : "negative"}">${f.change >= 0 ? "+" : ""}${f.change.toFixed(2)} %</td><td><button data-trade="${brokerEscape(a.ticker)}">Acheter</button></td></tr>`;
      })
      .join("")}</tbody></table></div>`;
  }
  function watchView() {
    const list = selectedList();
    if (!list) return `<section class="bank-card reference-lists"><h2>Your lists <small>${listCount}/10</small></h2><button data-action="new-list" class="blue">Add a watchlist</button><p>No locally available watchlist. The other reference lists were not supplied.</p></section>`;
    const observed = list.observed;
    const count = observed.length + list.added.length + list.unseen;
    const selector = lists.length > 1 ? `<label class="watchlist-selector">Watchlist <select aria-label="Watchlist">${lists.map((item) => `<option value="${item.id}" ${item.id === list.id ? "selected" : ""}>${brokerEscape(item.name)}</option>`).join("")}</select></label>` : "";
    return `<section class="bank-card reference-lists"><h2>Your lists <small>${listCount}/10</small></h2><button data-action="new-list" class="blue">Add a watchlist</button></section><section class="bank-card reference-watchlist"><div class="card-title"><h2><button data-action="collapse-list" aria-label="Toggle watchlist" aria-expanded="${!list.collapsed}" aria-controls="watchlist-body"><span></span></button>${brokerEscape(list.name)} <small>${count}/10</small></h2><div><button data-action="rename-list">♢ Rename</button><button data-action="favorite" aria-pressed="${list.favorite}">♥ ${list.favorite ? "Favorited" : "Favorite"}</button><button data-action="delete-list">♧ Delete</button></div></div>${selector}<div id="watchlist-body" ${list.collapsed ? "hidden" : ""}><div class="table-scroll"><table><colgroup>${[58,340,50,95,94,137,135,136,175,200,70].map((width) => `<col class="watch-col-${width}">`).join("")}</colgroup><thead><tr>${["", "Symbol/Description", "Last", "Change ($)", "Change (%)", "Bid(Qty)", "Ask(Qty)", "Volume", "Day range", "", ""].map((v) => `<th>${v}</th>`).join("")}</tr></thead><tbody>${observed
      .map(
        (r, i) =>
          `<tr><td>✥</td><td><button data-reference-ticker="${r[0]}"><svg xmlns="http://www.w3.org/2000/svg" class="inline-country-flag" role="img" aria-label="Canada" viewBox="0 0 64 32"><path fill="#fff" d="M0 0h64v32H0z"/><path fill="#d80621" d="M0 0h16v32H0zM48 0h16v32H48zM31 27l.5-6-8 1 1.5-3-6-4 3-1-1-4 5 1 1-3 3 5-1-8 3 2 2-5 2 5 3-2-1 8 3-5 1 3 5-1-1 4 3 1-6 4 1.5 3-8-1 .5 6Z"/></svg> ${r[0]} ›</button><small>${r[1]}</small></td>${r
            .slice(2)
            .map(
              (v, j) =>
                `<td class="${j === 1 || j === 2 ? (String(r[3]).startsWith("-") ? "negative" : "positive") : ""}">${v}${[3, 4, 5].includes(j) ? `<small>${brokerEscape(referenceListDepth[r[0]][{3: "bidSize", 4: "askSize", 5: "secondaryVolume"}[j]])}</small>` : ""}</td>`,
            )
            .join(
              "",
            )}<td><button data-reference-trade="${r[0]}" class="tiny-buy">Buy</button> <button data-reference-trade="${r[0]}" data-side="sell" class="sell tiny-buy">Sell</button></td><td><button data-remove-reference="${i}" aria-label="Remove ${r[0]}">♧</button></td></tr>`,
      )
      .join("")}${list.added
      .map((t) => {
        const a = securities.find((item) => item.ticker === t), f = fixture(a);
        const change = f?.absolute, percent = f?.change;
        return `<tr><td>✥</td><td>${quoteLink(t)}<small>${brokerEscape(a.name)}</small><small>${brokerEscape(f?.date || "No observation available")}${a.reference || t === "FTS.TO" ? "" : " · Historical close"}</small></td><td>${f ? number(f.price) : "—"}</td><td class="${change < 0 ? "negative" : "positive"}">${change == null ? "—" : number(change)}</td><td class="${percent < 0 ? "negative" : "positive"}">${percent == null ? "—" : percent.toFixed(2) + "%"}</td><td>${a.reference ? brokerEscape(f.bid) : "—"}</td><td>${a.reference ? brokerEscape(f.ask) : "—"}</td><td>${f?.volume == null ? "—" : brokerEscape(String(f.volume))}</td><td>${a.reference ? brokerEscape(f.dayRange) : "—"}</td><td><button data-trade="${brokerEscape(t)}" class="tiny-buy">Buy</button></td><td><button data-remove="${brokerEscape(t)}" aria-label="Remove ${brokerEscape(t)}">♧</button></td></tr>`;
      })
      .join(
        "",
      )}</tbody></table></div><button data-action="search">+ Add a symbol</button></div></section>`;
  }
  function etfView() {
    const tabs = ["ETF screener", "ETF Research", "ETF Compare", "ETF - Top 25 Performing"];
    const tabbar = `<div class="bank-subnav etf-tabs">${tabs.map((label, i) => `<button data-etf-tab="${i}" aria-pressed="${etfTab === i}">${label}</button>`).join("")}</div>`;
    if (etfTab !== 0) return tabbar + `<section class="bank-card etf-surface"><h2>${tabs[etfTab]}</h2><p>The supplied walkthrough does not show this tab’s contents. No licensed research or ranking has been reconstructed from invented data.</p><button data-etf-tab="0">Return to ETF screener</button></section>`;
    return tabbar + `<section class="bank-card etf-surface"><h2>ETF Screener</h2>
      <div class="etf-region"><span>Choose ETF Region:</span><div>${[["Canada", "Canadian ETFs"], ["US", "United States ETFs"]].map(([key, label]) => `<button data-etf-region="${key}" aria-pressed="${etfRegion === key}">${label}</button>`).join("")}</div></div>
      <div class="etf-criteria-heading"><h3>Screener Criteria</h3><button data-action="etf-collapse" aria-expanded="${!etfCollapsed}" aria-controls="etf-criteria">${etfCollapsed ? "+ View more" : "− View less"}</button></div>
      <div id="etf-criteria" ${etfCollapsed ? "hidden" : ""}><p>Select A Criteria Group To Create Screen</p><div class="etf-groups">${["General Information", "Fund Data", "Market Data"].map((label) => `<label><select aria-label="${label}"><option>${label}</option></select></label>`).join("")}<button data-action="etf-reset">Reset This Screen</button></div>
      <div class="etf-criteria-columns"><span>Criteria</span><span>Results</span><span>Delete</span></div><div class="etf-type"><h4>ETF Type</h4><div><label><input type="checkbox" name="etf-type" value="active">Active</label><label><input type="checkbox" name="etf-type" value="passive">Passive</label></div><span>0</span><button data-action="etf-remove" aria-label="Remove ETF Type">♧</button></div></div>
      <p class="etf-source-note">Historical walkthrough snapshot · Apr 10, 2024 · Screener options and results not supplied; no live screening.</p></section>`;
  }
  function activityView() {
    return `<section class="bank-card"><div class="card-title"><h2>Ordres et opérations</h2><button data-action="buy" class="blue">Préparer un ordre fictif</button></div><div class="fixture-note">Bac à sable local. Aucun ordre ne peut être transmis à un marché.</div><div class="table-scroll"><table><thead><tr><th>Référence</th><th>Titre</th><th>Sens</th><th>Quantité</th><th>Statut</th><th></th></tr></thead><tbody>${orders.length ? orders.map((o, i) => `<tr><td>SIM-${i + 1}</td><td>${brokerEscape(o.ticker)}</td><td>${o.side}</td><td>${o.quantity}</td><td>${o.cancelled ? "Annulé" : "Brouillon simulé"}</td><td>${o.cancelled ? "" : `<button data-cancel-order="${i}">Annuler</button>`}</td></tr>`).join("") : '<tr><td colspan="6" class="empty-cell">Aucun ordre simulé. Votre historique commence ici.</td></tr>'}</tbody></table></div></section>`;
  }
  function documentsView() {
    return `<section class="bank-card"><div class="card-title"><h2>Relevés et confirmations</h2><select aria-label="Année des relevés"><option>2026</option></select></div><p class="fixture-note">Documents d’exemple créés localement, sans données personnelles.</p>${["Relevé de compte · Octobre 2026", "Sommaire fiscal · Exemple", "Confirmation d’opération · Exemple"].map((n) => `<div class="document-row"><span class="document-icon">+</span><div><b>${n}</b><small>Document fictif · TXT</small></div><button data-document="${n}">Télécharger ↓</button></div>`).join("")}</section>`;
  }
  function researchView() {
    const groups = [
      [
        "Technical Analysis",
        [
          "Technical Analysis: Highlights junior Gold Miners",
          "Technical Analysis: Gold stocks play catchup",
          "Technical Analysis: WTI and yields breakout",
          "Technical Analysis: Silver moves on back of strength in gold",
          "Technical Analysis: Gold breaks out",
        ],
      ],
      [
        "Stocks Calendar Events",
        [
          "Daily Bulletin - April 9 (ACS, CS, CXI, ERF, EQB, HPS.A, MRU, RGLD, RUS, STC, Asset Management, Industrial Products)",
          "Asset Management",
          "Industrial Products",
          "Metro Inc.",
          "Hammond Power Solutions Inc.",
        ],
      ],
      [
        "Industry Reports (as of 2024-04-10)",
        [
          "Weekly Energy Infrastructure Review",
          "Weekly Forestry Review",
          "Monthly Canadian Financial Services",
          "Weekly Base Metals Review",
          "Monthly Canadian Freight Update",
        ],
      ],
      [
        "Weekly economic and Market Outlook (as of 2024-04-10)",
        ["Weekly economic and Market Outlook"],
      ],
    ];
    return `<section class="bank-card reference-reports">${groups.map(([heading, items]) => `<section><h2>⊖ &nbsp; ${heading}</h2><div class="report-list">${items.map((t, i) => `<div><span class="report-pdf">▤</span><button data-report="${brokerEscape(t)}">${brokerEscape(t)}</button><small>Apr 10, 2024</small></div>`).join("")}</div><div class="report-pages">◀ &nbsp; 1 &nbsp; 2 &nbsp; 3 &nbsp; ▶</div></section>`).join("")}</section>`;
  }
  // Historical screen observations, not pack prices or a live market feed.
  const recentlyViewed = [
    ["T.SU", "TSX", "Suncor Energy Inc", "Oil & Gas", "53.02", "+1.75%", "15,121 79,105 144,25 208,74 272,69", "53.02", 13],
    ["T.BCE", "TSX", "BCE Inc", "Telecommunication Services", "44.60", "-0.13%", "20,93 84,32 148,73 212,128 276,18", "44.60", 94],
    ["MRK", "NYSE", "Merck & Co Inc", "Drug Manufacturers", "126.23", "-2.83%", "20,19 84,78 148,69 212,107 276,104", "126.23", 104],
    ["AAPL", "NASDAQ", "Apple Inc", "Hardware", "168.41", null, "20,20 84,85 148,26 212,115 276,23", "168.41", 103],
  ];
  function tradingTabs() {
    return `<div class="bank-subnav trading-tabs">${["Technical Insight™", "Fundamental Insight™", "Strategy Builder™", "Featured Ideas™", "Morning Brief™"].map((t, i) => `<button data-trading-tab="${i}" aria-pressed="${i === (currentView === "technical" ? 0 : 1)}">${t}</button>`).join("")}</div>`;
  }
  function recentTechnicalView() {
    const icon = (path) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2">${path}</svg>`;
    return `${tradingTabs()}<section class="bank-card trading-surface technical-recent">
      <div class="tool-utility"><button data-action="filters" aria-label="Technical Insight menu">☰</button><span></span><button data-action="search" aria-label="Search">${icon('<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>')}</button><button data-action="help" aria-label="Learning">${icon('<path d="m1 8 11-5 11 5-11 5Zm5 3v7l6 3 6-3v-7M22 9v9"/>')}</button><button data-action="help" aria-label="Help">${icon('<circle cx="12" cy="12" r="10"/><path d="M9 8a3 3 0 1 1 4 3c-1 1-1 2-1 3m0 2v2"/>')}</button></div>
      <div class="recently-viewed"><h2>My Recently Viewed <span class="info-icon">i</span></h2>
      <div class="recent-carousel"><button class="recent-previous" data-recent-direction="previous" aria-label="Previous recently viewed securities">‹</button><button class="recent-next" data-recent-direction="next" aria-label="Next recently viewed securities">›</button><div class="recent-cards" tabindex="0" role="region" aria-label="Recently viewed historical securities">${recentlyViewed.map(([symbol, market, name, industry, price, change, points, label, markerY]) => `<button class="recent-card" data-recent-symbol="${symbol}" aria-label="${name}, historical observation"><span class="recent-symbol">${symbol} : ${market}</span><strong>${name}</strong><span class="recent-industry">${industry}</span><span class="recent-values"><span>${price}</span><span class="${change?.startsWith("+") ? "positive" : "negative"}">${change || "—"}</span></span><small>In the last 5 days</small><svg class="recent-chart" viewBox="0 0 350 165" aria-label="Historical screen trace, not a numerical price series"><path d="M${points.replaceAll(" ", " L")} L276,132 L20,132 Z" fill="#edf2fe"/><polyline points="${points}" fill="none" stroke="#2377bc" stroke-width="1"/><text x="135" y="155">Apr 5</text><text x="255" y="155">Apr 9</text><rect x="272" y="${markerY}" width="70" height="19" fill="#2878bd"/><text x="277" y="${markerY + 14}" fill="white">${label}</text></svg></button>`).join("")}</div></div>
      <p class="recent-source">Walkthrough · Apr 10, 2024 · 350s. Historical screen observations. No live feed. Apple’s complete change is not visible in the source.</p></div></section>`;
  }
  // Baxter scores are observations of the supplied 390s frame, not computed ratings.
  let fundamentalDetail = false;
  let explorerMode = "bubbles";
  // Native380s, pixel observations only: symbol,x,y,radius,outline.
  // Coordinates relative to the visible chart origin(535,517); no rating inference.
  const fundamentalBubbles = [
    ["VANI",447,9,30,"purple"],["XFOR",564,20,31,"green"],
    ["INBS",655,27,31,"red"],["SGMO",729,40,30,"red"],
    ["EXEL",315,61,30,"green"],["VTYX",394,68,33,"purple"],
    ["DHR",502,65,31,"red"],["ATRA",604,87,32,"darkred"],
    ["CNC",682,102,31,"green"],["IRWD",763,113,34,"red"],
    ["CATX",843,112,31,"red"],["TNXP",918,94,30,"red"],
    ["ZTS",204,128,30,"green"],["RPRX",282,131,31,"darkgreen"],
    ["ARQT",363,147,36,"red"],["ARDX",451,133,38,"green"],
    ["TDOC",540,137,34,"purple"],["ABT",617,174,36,"green"],
    ["ALT",709,186,41,"purple"],["ABBV",802,188,37,"purple"],
    ["FOLD",886,177,32,"green"],["ALLO",963,157,31,"purple"],
    ["HUM",144,176,30,"red"],["ENVB",240,198,32,"red"],
    ["JNJ",321,228,38,"green"],["WBA",427,235,52,"purple"],
    ["IOVA",538,230,43,"purple"],["BMY",642,278,54,"green"],
    ["OPK",759,278,47,"purple"],["ME",860,258,38,"red"],
    ["BIOL",944,235,33,"darkred"],["CTLT",1019,210,31,"red"],
    ["ACAD",1081,255,30,"green"],["EXA",1143,301,30,"red"],
    ["CYH",177,244,31,"red"],["ELAN",250,280,34,"green"],
    ["DXCM",107,282,31,"green"],["GRTS",39,318,30,"red"],
    ["OTRK",178,326,35,"darkred"],["OCGN",262,368,39,"purple"],
    ["CVS",352,321,45,"green"],["PFE",504,392,105,"red"],
    ["JAGX",708,416,82,"red"],["VTRS",836,356,43,"green"],
    ["MCRB",924,320,34,"darkred"],["XRAY",1001,293,32,"green"],
    ["EBS",1071,331,31,"purple"],["CAH",1134,377,31,"purple"],
    ["ONCO",987,371,31,"red"],["ADIL",1062,409,31,"red"],
    ["ATXI",994,452,33,"darkred"],["VKTX",910,415,36,"green"],
    ["CLOV",841,473,42,"red"],["MRVI",1068,486,31,"red"],
    ["ZOM",924,506,32,"green"],["GERN",341,427,43,"purple"],
    ["AGL",244,458,36,"purple"],["MNPR",173,409,33,"purple"],
    ["RSLS",104,366,33,"darkred"],["FATE",34,406,31,"green"],
    ["SANA",102,447,32,"purple"],["OSCR",168,491,32,"purple"]
  ];
  function fundamentalExplorer() {
    const colors = {red:"#ff2028",darkred:"#bc0000",green:"#00cf00",
      darkgreen:"#008000",purple:"#7546ff"};
    const filters = [["countries","Countries","USA"],
      ["sectors","Sectors & Industries","7 selected"],
      ["size","Bubble Size","Trading Volume 90-D…"]];
    const chart = explorerMode === "bubbles"
      ? `<div class="fundamental-chart-scroll" tabindex="0" aria-label="Historical bubble chart; scroll horizontally on narrow screens"><svg class="fundamental-bubble-chart" viewBox="0 0 1150 520" aria-label="Observed historical symbols; geometry traced from380s, no numerical ratings">${fundamentalBubbles.map(([symbol,x,y,r,color])=>`<g role="button" tabindex="0" data-explorer-symbol="${symbol}" aria-label="${symbol} · historical bubble"><circle cx="${x}" cy="${y}" r="${r}" fill="white" stroke="${colors[color]}" stroke-width="${r>70?5: r>40?3:2.5}"/><text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="${r>70?26:r>40?18:12}" font-weight="600">${symbol}</text></g>`).join("")}</svg></div>`
      : `<div class="explorer-table-wrap"><p>Observed symbols only. The source does not supply the proprietary table or numerical ratings.</p><table class="explorer-observed-table"><thead><tr><th>Symbol</th><th>Quantamental Rating</th><th>Source</th></tr></thead><tbody>${fundamentalBubbles.map(([symbol])=>`<tr><td><button data-explorer-symbol="${symbol}">${symbol}</button></td><td>Not supplied</td><td>Walkthrough380s</td></tr>`).join("")}</tbody></table></div>`;
    return `<div class="fundamental-explorer"><aside class="explorer-controls"><div class="explorer-mode">${["table","bubbles"].map(mode=>`<button data-explorer-mode="${mode}" aria-pressed="${explorerMode===mode}"><span aria-hidden="true">${mode==="table"?"≡":"●"}</span> ${mode==="table"?"Table":"Bubbles"}</button>`).join("")}</div>${filters.map(([key,label,value])=>`<button class="explorer-filter" data-explorer-filter="${key}"><small>${label}</small><span>${value}</span><i aria-hidden="true"></i></button>`).join("")}<div class="explorer-rating"><p>Quantamental Rating</p><div><span>0</span><span>100</span></div><div class="explorer-spectrum" aria-hidden="true"></div><div><span>Weakest</span><span>Strongest</span></div></div></aside>${chart}</div>`;
  }
  const fundamentalFactors = [["Growth", 55, "rocket"], ["Value", 60, "diamond"],
    ["Income", 64, "coins"], ["Quality", 68, "shield"], ["Momentum", 74, "trend"]];
  function fundamentalIcon(kind) {
    const paths = {
      rocket: '<path d="M8 16c-2-6 3-12 11-13 0 8-5 14-11 13Zm-2-5-3 1v5l5-1m5 2-1 4H7l1-6m-4 3-2 3m5-3-1 4"/><circle cx="14" cy="9" r="2"/>',
      diamond: '<path d="m3 8 4-5h10l4 5-9 13Zm0 0h18M8 3l4 18 4-18"/>',
      coins: '<ellipse cx="12" cy="5" rx="9" ry="4"/><path d="M3 5v5c0 5 18 5 18 0V5M3 10v5c0 5 18 5 18 0v-5M3 15v4c0 5 18 5 18 0v-4"/>',
      shield: '<path d="m12 2 9 4v6c0 5-5 9-9 10-4-1-9-5-9-10V6Z"/><path d="M12 2v20M3 12h18"/>',
      trend: '<path d="m2 17 6-6 5 4 9-11"/>',
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2">${paths[kind]}</svg>`;
  }
  function fundamentalView() {
    return `${tradingTabs()}<section class="bank-card fundamental-surface ${fundamentalDetail ? "" : "explorer-surface"}">
      <form id="fundamental-search" class="fundamental-search"><input name="fundamental-query" aria-label="Search Fundamental Insight" placeholder="Enter Symbol or Name" maxlength="100" required><button type="submit" aria-label="Search Fundamental Insight symbol"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg></button></form>
      ${fundamentalDetail ? `<div class="fundamental-company"><button data-fundamental-back="true" aria-label="Back to Fundamental Insight explorer">←</button><h2>Baxter International Inc</h2><span>BAX</span></div>
      <div class="fundamental-grid"><div><article class="fundamental-panel rating-panel"><h3>Quantamental Rating <button data-factor-info="Quantamental Rating" aria-label="About Quantamental Rating"><span class="info-icon">i</span></button></h3><div class="quantamental-gauge"><svg viewBox="0 0 240 145" aria-label="Quantamental Rating: 63 out of 100"><path d="M16 125 A104 104 0 0 1 224 125" pathLength="100" class="gauge-track"/><path d="M16 125 A104 104 0 0 1 224 125" pathLength="100" class="gauge-value" stroke-dasharray="63 100"/><circle cx="161" cy="30" r="8"/></svg><span class="quantamental-value">63<small> / 100</small></span></div></article>
      <article class="fundamental-panel rating-history"><h3>Quantamental Rating History <button data-factor-info="History" aria-label="About rating history"><span class="info-icon">i</span></button></h3><svg viewBox="0 0 660 180" role="img" aria-label="Visible portion of the historical rating chart, traced from the walkthrough; not a numerical time series"><g stroke="#ddd">${[35,57,79,101,123,145,167].map(y=>`<path d="M45 ${y}H645"/>`).join("")}</g><g fill="#555" font-size="14">${[100,90,80,70,60,50,40].map((n,i)=>`<text x="10" y="${40+i*22}">${n}</text>`).join("")}</g><path d="M45 135L54 145L64 140L76 141L83 138L94 144L105 145L111 151L123 151L129 156L144 154L151 160L160 160L169 155L182 156L190 164L208 166L217 158L232 158L244 160L250 150L265 149L276 135L289 131L304 134L311 126L329 126L340 116L354 114L366 117L380 123L389 120L401 122L408 149L421 151L435 146L448 144L462 145L471 164L482 166L491 150L507 151L518 156L526 151L535 160L544 152L561 150L569 164L579 162L587 166L596 150L607 142L615 135L627 133L636 120L645 117" fill="none" stroke="#2377bc" stroke-width="3"/><path d="M276 135L289 131L304 134L311 126L329 126L340 116L354 114L366 117L380 123L389 120L401 122M596 150L607 142L615 135L627 133L636 120L645 117" fill="none" stroke="green" stroke-width="3"/><path d="M190 164L208 166L217 158M471 164L482 166L491 150M569 164L579 162L587 166L596 150" fill="none" stroke="#c00" stroke-width="3"/><path d="M45 136H645M45 158H645" stroke="#222" stroke-dasharray="5 5"/></svg></article></div>
      <article class="fundamental-panel factor-panel"><h3>Factor Scores <button data-factor-info="Factor Scores" aria-label="About Factor Scores"><span class="info-icon">i</span></button></h3><div class="fundamental-factors">${fundamentalFactors.map(([label, score, icon])=>`<button data-factor-info="${label}" aria-label="${label}: ${score} out of 100"><span class="factor-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="factor-track" cx="60" cy="60" r="45"/><circle class="factor-value" cx="60" cy="60" r="45" pathLength="100" stroke-dasharray="${score} 100"/></svg><b>${score}</b><span class="factor-symbol">${fundamentalIcon(icon)}</span></span><span>${label}</span></button>`).join("")}</div></article></div>
      ` : fundamentalExplorer()}<p class="fundamental-source">Walkthrough · Apr 10, 2024 · 380s explorer / 390–395s Baxter. Historical screen observations; no live ratings. Only the visible chart shape is reproduced; no numerical rating history or full licensed report is supplied.</p></section>`;
  }
  function researchTool() {
    if (currentView === "technical") return recentTechnicalView();
    if (currentView === "fundamental") return fundamentalView();
    if (currentView === "bonds") return bondsSurface();
    if (currentView === "strategy") return optionsSurface();
    return `<div class="bank-subnav trading-tabs">${["Technical Insight™", "Fundamental Insight™", "Strategy Builder™", "Featured Ideas™", "Morning Brief™"].map((t, i) => `<button data-trading-tab="${i}" aria-pressed="${i === (currentView === "technical" ? 0 : 1)}">${t}</button>`).join("")}</div><section class="bank-card trading-surface"><div class="tool-utility"><button data-action="filters">☰</button><span></span><button data-action="search">⌕</button><button data-action="help">◇</button><button data-action="help">?</button></div><div class="tool-tabs"><button aria-pressed="true" data-tool-category="stocks">Stocks & ETFs</button><button data-tool-category="index">Index</button><button data-tool-category="forex">Forex</button><button data-tool-category="watchlists">★ Watchlists</button></div><div class="tool-filters">${[
      ["Exchange", ["Canada", "United States"]],
      ["List", ["None", "My watchlists"]],
      ["Industry", ["All", "Utilities", "Financials", "Energy"]],
      ["Opportunity Type", ["All", "Bullish", "Bearish"]],
    ]
      .map(
        ([label, opts]) =>
          `<label>${label}<select>${opts.map((v) => `<option>${v}</option>`).join("")}</select></label>`,
      )
      .join(
        "",
      )}</div><div class="screen-results-bar"><span>▼ &nbsp; Top 100 matches <span class='info-icon'>i</span></span><span><button data-action="subscribe">✉ Subscribe</button><button data-action="grid-view">▦</button></span></div><div class="screen-results"><aside><h4>Filters <button data-action="clear-filters">×</button></h4>${["Stocks", "ETFs", "Bullish", "Bearish", "Short term", "Intermediate term", "Long term"].map((t) => `<label><input type="checkbox" data-screen-filter="${t}"> ${t}</label>`).join("")}</aside><div class="screen-table"><div class="screen-table-head"><span>Company Name</span><span>Technical Event</span><span>Close at Event</span></div>${[
      ["TELR:TSX", "Apr 09, 2024", "Daily"],
      ["FTS:TSX", "Apr 10, 2024", "Daily"],
      ["ENB:TSX", "Apr 10, 2024", "Daily"],
    ]
      .map(
        ([n, d, t]) =>
          `<button data-screen-result="${n}"><span>${n}</span><span>${d} &nbsp; ${t}</span><span>—</span></button>`,
      )
      .join("")}</div></div></section>`;
  }
  function candleChart() {
    const rows = REFERENCE_CANDLES,
      low = Math.min(...rows.map((v) => v.low)),
      high = Math.max(...rows.map((v) => v.high)),
      scale = high - low || 1;
    const y = (v) => 230 - ((v - low) / scale) * 205;
    return `<svg viewBox="0 0 650 270" class="reference-candles" role="img" aria-label="XIU actual historical daily OHLC, January to April 2024"><path d="M10 25H610M10 90H610M10 160H610M10 230H610M10 25V230M210 25V230M410 25V230M610 25V230" stroke="#e0e0e0" fill="none"/>${rows
      .map((r, i) => {
        const x = 15 + (i / (rows.length - 1)) * 585,
          color = r.close >= r.open ? "#fff" : "#222";
        return `<path d="M${x} ${y(r.high)}V${y(r.low)}" stroke="#333"/><rect x="${x - 2.5}" y="${Math.min(y(r.open), y(r.close))}" width="5" height="${Math.max(1, Math.abs(y(r.open) - y(r.close)))}" fill="${color}" stroke="#333"/>`;
      })
      .join(
        "",
      )}<text x="615" y="30" font-size="13" fill="#888">${high.toFixed(2)}</text><text x="615" y="230" font-size="13" fill="#888">${low.toFixed(2)}</text><text x="30" y="260" font-size="14" fill="#888">Jan</text><text x="210" y="260" font-size="14" fill="#888">Feb</text><text x="410" y="260" font-size="14" fill="#888">Mar</text><text x="580" y="260" font-size="14" fill="#888">Apr</text></svg>`;
  }
  shell.addEventListener("input", (event) => {
    const input = event.target;
    if (input.dataset.optionUnavailable) {
      if (input.type === "radio") shell.querySelector('[name="op-direction"]').checked = true;
      if (input.type === "range") input.value = "100";
      modal(input.dataset.optionUnavailable, "<p>XIU · Alternate licensed results are not supplied. The historical bullish snapshot is retained; no order or recalculation is performed.</p>");
      return;
    }
    const key = input.dataset.optionInput || input.dataset.optionRange;
    if (!key && !input.hasAttribute("data-option-date")) return;
    if (key) {
      shell.querySelector(`[data-option-input="${key}"]`).value = input.value;
      shell.querySelector(`[data-option-range="${key}"]`).value = input.value;
    }
    shell.querySelectorAll("[data-option-result]").forEach((node) => { node.textContent = "—"; });
    shell.querySelector("#options-snapshot-status").textContent = "Inputs changed. Historical profit, return and scores are not recalculated: licensed pricing is not supplied. Restore the historical snapshot to see observed values.";
  });
  function optionsSurface() {
    const payoff = (kind) =>
      `<svg viewBox="0 0 180 100" role="img" aria-label="${kind} payoff"><path d="M15 52H170M88 5V95" stroke="#a3b0ba"/><path d="${kind === "stock" ? "M15 85L165 10" : "M15 75H70L125 20H165"}" stroke="#263d50" stroke-width="1.6" fill="none"/><path d="M90 50L160 18V50Z" fill="#b4d4c3" opacity=".7"/></svg>`;
    return `<section class="bank-card optionsplay"><div class="optionsplay-header"><div><small>Provided By</small><strong>OptionsPlay<span>®</span></strong></div><p>SPDR S&P 500 $512.90<br><span class="negative">-$6.42 (1.24%)</span></p><p>Market Closes In &nbsp; 02:26:48<br><span class="market-delay">Market Data Delayed 20 Minutes</span></p><button data-action="tools">☰</button></div><div class="options-workspace"><div class="options-chart-side"><div class="option-symbol"><button data-action="search">⌕ &nbsp; XIU &nbsp; BlackRock Asset M…</button><img src="/assets/canada.svg" alt="Canada" width="24"><span>CAD</span><b>$33.65 <em class="negative">-$0.30 (0.88%)</em></b></div><div class="option-metrics"><span>52W &nbsp; $28.48 - $33.99</span><span>Volume &nbsp; 2.27M</span><span>1M &nbsp; <b>Bullish</b></span><span>6M &nbsp; <b>Bullish</b></span><span>Div / Yield &nbsp; $1.01 / 2.97%</span><span>EPS &nbsp; $0.00</span><span>P/E &nbsp; 17.61</span><span>Earnings &nbsp; N/A</span></div><h4>Charts</h4><div class="options-chart-toolbar">⋮ <span>1D &nbsp; 3M &nbsp; ▥ &nbsp; ƒx &nbsp; ⚙ &nbsp; ⛶</span></div><div class="option-price-chart">${candleChart()}<span class="option-chart-value">33.61000</span></div><div class="option-indicator-grid">${Array.from({ length: 70 }, (_, i) => `<i class="${i % 9 === 0 ? "red" : ""}"></i>`).join("")}</div><div class="rsi-chart"><svg viewBox="0 0 500 70"><path d="M0 35H500" stroke="#ccc"/><polyline points="0,15 20,58 45,24 80,28 100,55 120,14 140,35 170,20 200,30 240,35 280,26 310,30 350,26 390,35 420,25 450,29 470,27 500,30" stroke="#444" fill="none"/></svg></div><div class="options-support">Support &nbsp; $33.58 (-0.21%)<br>$32.93 (-2.14%) &nbsp; <span class="negative">$33.99 (1.01%) Resistance</span></div><p>Strength: 7 (Strong)</p><p>Dividends: Quarterly $0.25</p><p>Price Action: BlackRock Asset Management Canada Ltd - BlackRock iShares S&P/TSX 60 Index ETF is experiencing a 0.88% move down today</p></div><div class="options-trade-side"><div class="tool-tabs"><button aria-pressed="true">Trade</button><button data-option-unavailable="Income">Income</button><strong>OptionsPlay.com</strong></div><div class="option-direction"><label><input type="radio" name="op-direction" checked> Bullish</label><label><input type="radio" name="op-direction" data-option-unavailable="Bearish"> Bearish</label><label><input type="radio" name="op-direction" data-option-unavailable="High Implied Volatility"> High Implied Volatility</label></div><div class="option-strategies">${[
      ["Buy 100 Shares", "stock", "$3,365.00", "$197.00", "5.85%", "126"],
      [
        "Buy 1 Jun 21, 2024 33.5 Call",
        "call",
        "$91.00",
        "$121.00",
        "132.97%",
        "88",
      ],
    ]
      .map(
        ([title, kind, cost, profit, ret, score]) =>
          `<article><div>${title} &nbsp; ♢</div>${payoff(kind)}<dl><div><dt>Strategy</dt><dd class="positive">Bullish</dd></div><div><dt>Trade Cost</dt><dd>${cost}</dd></div><div><dt>Profit</dt><dd class="positive" data-option-result data-observed="${profit}">${profit}</dd></div><div><dt>Return</dt><dd class="positive" data-option-result data-observed="${ret}">${ret}</dd></div></dl><span>OptionsPlay Score</span><b class="option-score" data-option-result data-observed="${score}">${score}</b><div class="option-buttons"><button data-option-unavailable="XIU historical strategy" class="blue">Trade</button><button data-option-unavailable="XIU historical strategy">Modify</button></div></article>`,
      )
      .join(
        "",
      )}<article><div>No Optimal Long Call Vertical</div><p>There are no optimal Long Call Vertical on BlackRock Asset Management Canada Ltd - BlackRock iShares S&P/TSX 60 Index ETF for trading a bullish view at this time. <button data-option-unavailable="XIU historical strategy">Click here</button> to construct a custom strategy.</p></article></div><div class="tool-tabs simulator-tabs"><button aria-pressed="true">P&L Simulator</button><button data-option-unavailable="Risk And Investment Calculator">Risk And Investment Calculator</button></div><p class="simulator-note">This is your profit (or loss) for each strategy if the stock</p><div class="options-sim-inputs"><label>Goes to this price<input data-option-input="price" aria-label="Simulated stock price value" type="number" min="30.74" max="37.41" value="35.62" step=".01"></label><input data-option-range="price" type="range" min="30.74" max="37.41" value="35.62" step=".01" aria-label="Simulated stock price"><label>By this date<input data-option-date type="date" value="2024-06-21"></label><input data-option-unavailable="Time to expiry" type="range" min="0" max="100" value="100" aria-label="Time to expiry"><label>And Implied volatility is<input data-option-input="volatility" aria-label="Implied volatility value" type="number" min="5.49" max="16.46" value="10.97" step=".01"></label><input data-option-range="volatility" type="range" min="5.49" max="16.46" value="10.97" step=".01" aria-label="Implied volatility"></div><p id="options-snapshot-status" role="status">Historical simulator snapshot. Values are not live.</p><button data-option-reset>Restore historical snapshot</button><p class="options-provenance">Walkthrough · Apr 10, 2024 · 430s. Historical screen observations, not Verity calculations. Licensed pricing and execution are not supplied.</p></div></div></section>`;
  }
  function bondsSurface() {
    const rows = [
      [
        "MERCIER BEO 4.55% 27JN28",
        "4.616%",
        "4.564%",
        "2028-06-27 (4yr, 2mo)",
        "99.94050",
        "357,675",
      ],
      [
        "STE-JULIEN BEO4.75%21JL28",
        "4.599%",
        "4.547%",
        "2028-07-21 (4yr, 3mo)",
        "100.77066",
        "8,155",
      ],
      [
        "LA MALBAIE BEO 4.7%20JL28",
        "4.599%",
        "4.547%",
        "2028-07-20 (4yr, 3mo)",
        "100.57952",
        "74,549",
      ],
      [
        "ST-MATHI-R BEO 3.9%23MR28",
        "4.579%",
        "4.528%",
        "2028-03-23 (3yr, 11mo)",
        "97.74984",
        "20,000",
      ],
      [
        "MATANE BEO 4.55% 23FB28",
        "4.577%",
        "4.526%",
        "2028-02-23 (3yr, 10mo)",
        "100.07683",
        "9,000",
      ],
      [
        "STE-CLAIRE BEO4.15%30JA28",
        "4.570%",
        "4.519%",
        "2028-01-30 (3yr, 9mo)",
        "98.71624",
        "5,117",
      ],
      [
        "PTE-CLAIRE BEO 3% 31JA28",
        "4.564%",
        "4.513%",
        "2028-01-31 (3yr, 9mo)",
        "94.76140",
        "12,865",
      ],
      [
        "ST-JEROME BEO 5.15% 3OC27",
        "4.550%",
        "4.500%",
        "2027-10-03 (3yr, 6mo)",
        "102.06809",
        "5,000",
      ],
      [
        "MONT-BLANC BEO 4.3% 7OC27",
        "4.547%",
        "4.496%",
        "2027-10-07 (3yr, 6mo)",
        "99.37185",
        "12,228",
      ],
      [
        "ST-POLYCAR BEO4.95%18SP27",
        "4.545%",
        "4.495%",
        "2027-09-18 (3yr, 5mo)",
        "101.42761",
        "6,000",
      ],
      [
        "STE-ADELE BEO 4.4%29SP27",
        "4.545%",
        "4.495%",
        "2027-09-29 (3yr, 5mo)",
        "99.69676",
        "15,000",
      ],
      [
        "QUEBEC BEO 4.45% 13SP27",
        "4.196%",
        "4.153%",
        "2027-09-13 (3yr, 5mo)",
        "100.93243",
        "2,483,260",
      ],
      [
        "LAVAL BEO 4.85% 24OC27",
        "4.191%",
        "4.148%",
        "2027-10-24 (3yr, 6mo)",
        "102.28211",
        "3,000,000",
      ],
      [
        "LAVAL BEO 3% 21MR28",
        "4.075%",
        "4.034%",
        "2028-03-21 (3yr, 11mo)",
        "96.26395",
        "6,399",
      ],
      [
        "NEW TECUMSETH 4.9% 23MR28",
        "3.883%",
        "3.846%",
        "2028-03-23 (3yr, 11mo)",
        "103.18992",
        "172,000",
      ],
    ];
    return `<section class="bank-card reference-bonds"><div class="card-title"><div><h2>Municipal Bonds</h2><p>Early redemption date / Maturity : 4 Years &nbsp;&nbsp; Amount to invest : 5,000</p></div><select aria-label="Bond type"><option>All</option><option>Available</option></select></div><div class="table-scroll"><table><thead><tr>${["Description", "Annual<br>Yield", "Semi-Annual<br>Yield", "Early redemption date <span class='info-icon'>i</span>", "Maturity date <span class='info-icon'>i</span>", "Price", "Available nominal<br>quantity", ""].map((t) => `<th>${t}</th>`).join("")}</tr></thead><tbody>${rows.map((r, i) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[3]}</td><td>${r[4]}</td><td>${r[5]}</td><td>${i === 14 ? '<span class="negative">Market closed</span>' : '<button data-action="bond">Buy</button>'}</td></tr>`).join("")}</tbody></table></div><small>Historical inventory reproduced from the walkthrough, Apr 10, 2024. No bond is available to trade here.</small></section>`;
  }
  // Video500s: account allocations are a later snapshot than Summary.
  // Preserve the displayed figures, including source rounding differences.
  function allocationView() {
    const rows = [
      ["NATIONAL BANK OF C…", "109.96", "113.34", "22.92%", "3.38"],
      ["BMO LOW VOL CDN E…", "43.71", "42.87", "8.67%", "-0.84"],
      ["WHITECAP RES INC", "10.13", "10.43", "2.11%", "0.30"],
      ["NFI GROUP INC", "18.06", "23.66", "4.78%", "5.60"],
      ["TELUS CORP", "47.15", "43.90", "8.88%", "-3.25"],
      ["ENBRIDGE INC", "49.14", "47.06", "9.51%", "-2.08"],
      ["BOMBARDIER INC-B S…", "57.50", "59.87", "12.10%", "2.37"],
      ["LION ELECTRIC COMPA…", "2.42", "1.76", "0.36%", "-0.66"],
      ["KINROSS GOLD CORP", "14.95", "17.36", "3.51%", "2.41"],
    ];
    const toggle = (id, label) => `<button data-allocation-toggle="${id}" aria-expanded="false" aria-controls="${id}" aria-label="${label}"><span></span></button>`;
    return `<section class="bank-card reference-allocation">
      <div class="allocation-table"><div class="allocation-columns allocation-labels"><span>Asset class</span><span>Currency</span><span>Actual<br>allocation</span><span>Market value</span><span></span></div>
      <div class="allocation-columns allocation-category"><strong><i class="cash-key"></i>Cash and equivalents</strong><span></span><span>27.17%</span><span>134.37</span>${toggle("allocation-cash", "Cash and equivalents")}</div>
      <div id="allocation-cash" class="allocation-columns allocation-subcategory" hidden><span>Canadian dollars</span><span>CAD</span><span>27.17%</span><span>134.37</span><span></span></div>
      <div class="allocation-columns allocation-category"><strong><i class="equity-key"></i>Equities and equity funds</strong><span></span><span>72.83%</span><span>360.25</span>${toggle("allocation-equities", "Equities and equity funds")}</div>
      <div id="allocation-equities" hidden><div class="allocation-columns allocation-subcategory"><span>Canadian equities</span><span>CAD</span><span>72.83%</span><span>360.25</span>${toggle("allocation-positions", "Canadian equities")}</div>
      <div id="allocation-positions" class="table-scroll" hidden><table><thead><tr>${["Description","Book value","Market value","Percentage","Unrealized G/L"].map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((x,i)=>`<td${i===0?' class="allocation-description"':''}>${x}</td>`).join("")}</tr>`).join("")}</tbody></table></div></div>
      <div class="allocation-columns allocation-total"><strong>Total</strong><span>CAD</span><strong>100.00%</strong><strong>494.62</strong><span></span></div></div>
      <svg class="allocation-pie" viewBox="0 0 444 444" role="img" aria-label="Cash and equivalents27.17%; Equities and equity funds72.83%"><title>Cash and equivalents27.17%; Equities and equity funds72.83%</title><circle cx="222" cy="222" r="221" fill="#0078b9"/><path d="M222 222L222 1A221 221 0 0 1 440.95 252.04Z" fill="#b2e8cf" stroke="white" stroke-width="1"/></svg>
      </section>`;
  }
  function performanceView() {
    if (currentView === "quickcharts") {
      const rows = referenceQuickQuotes;
      return `<section class="bank-card reference-quickcharts"><div class="card-title"><h2>CAD Margin</h2><div class="quick-totals">${[
        ["Total value", "493.18"],
        ["Cash", "132.93"],
        ["Buying power", "363.85"],
        ["Margin", "387.70"],
      ]
        .map(([a, b]) => `<div><span>${a}</span><strong>${b}</strong></div>`)
        .join(
          "",
        )}</div></div><div class="table-scroll"><table><thead><tr>${["Symbol / Description", "Market price / Day's change $ (%)", "Bid(Qty)", "Ask(Qty)", "Volume/30-day avg", "2D ⌄", "Low-High (2D)", ""].map((t) => `<th>${t}</th>`).join("")}</tr></thead><tbody>${rows.map((r, i) => `<tr><td><button data-reference-ticker="${r[0]}">${r[0]} ›</button><small>${r[1]}</small></td><td>${r[2]}<small class="negative">${r[3]}↓</small></td><td>${r[4]}<small>${["400", "100", "1.1K", "7.7K", "1.9K", "100"][i]}</small></td><td>${r[5]}<small>${["600", "200", "1.3K", "13K", "18.2K", "300"][i]}</small></td><td>${r[6]}<small>${r[7]}</small></td><td>${sparkline(i)}</td><td><div class="low-high-line"><i></i></div>${r[8]} &nbsp;&nbsp;&nbsp; ${r[9]}</td><td><button data-reference-trade="${r[0]}">Buy</button> <button data-reference-trade="${r[0]}" data-side="sell" class="sell">Sell</button></td></tr>`).join("")}</tbody></table></div></section>`;
    }
    return `<section class="bank-card reference-performance"><div class="performance-tabs"><button data-performance-tab="Return">Return</button><button data-performance-tab="Net change" aria-pressed="true">Net change</button></div><div class="performance-title"><div><h2 id="performance-metric">Change in market value ($)</h2><small>as of 2024/04/05</small></div><button data-action="return-details"><span class='info-icon'>i</span> Details of return calculation</button><div><button data-performance-period="single" aria-pressed="true">Single period</button><button data-performance-period="compound">Compound period</button></div></div><div class="performance-empty"><svg viewBox="0 0 120 45" role="img" aria-label="Historical account cash and investment values"><path d="M0 35H120" stroke="#d6e0e5"/><path d="M0 30L30 28L60 28L90 25L120 26" fill="none" stroke="#1677b8"/></svg><small>The source walkthrough shows this panel loading. No return series is supplied for this account.</small></div></section>`;
  }
  let builderMode = "discover";
  let builderCategory = 0;
  let builderBulk = false;
  const builderCriteria = ["TC Quantamental Rating®", "Stock Price", "Share Type",
    "Market Capitalization", "Debt to Equity Ratio", "Dividend Yield"];
  const builderSelected = new Set(builderCriteria.slice(0, 3));
  const builderThemes = ["5G", "AI", "Autonomous Vehicles", "Cannabis Stocks"];
  const builderPresets = ["Top Performers", "Abnormal Volume", "Top Rated", "Worst Rated"];
  function builderScreening() {
    return `<div class="builder-screening"><header><h2>Filter the market to discover stocks</h2><button data-builder-limit="Save">Save</button></header>
      <div class="builder-result-links"><button data-builder-limit="Matches">0 Matches</button><button data-builder-limit="Historical Performance">Historical Performance</button></div>
      <section class="builder-filter-card"><div class="builder-filter-actions"><button data-builder-clear="true">Clear All</button><button data-builder-bulk="true" role="switch" aria-checked="${builderBulk}">Bulk Edit <span class="builder-switch" aria-hidden="true"></span></button></div>
      <div class="builder-selects">${[["Preset Screen", "Top Rated"], ["Exchange", "USA/Canada"], ["Themes", "None"]].map(([label,value])=>`<label>${label}<select aria-label="${label}"><option>${value}</option></select></label>`).join("")}</div>
      <div class="builder-criteria" tabindex="0" aria-label="Screening criteria">${builderCriteria.map(label=>`<button data-builder-criterion="${label}" aria-pressed="${builderSelected.has(label)}">${builderSelected.has(label) ? "✓ " : ""}${label}</button>`).join("")}</div>
      <button class="builder-more" data-builder-limit="More Criteria">+ More Criteria</button></section>
      <p class="builder-results-note">Historical screen observation · 410s. The source shows 0 Matches while loading; no result dataset or historical performance is supplied. Criteria changes are local only.</p></div>`;
  }
  function strategyBuilderSurface() {
    const categories = ["Themes", "Preset Screens", "Community Screens", "Expert Strategies"];
    const tiles = builderCategory === 0 ? builderThemes : builderPresets;
    return `<div class="bank-subnav trading-tabs">${["Technical Insight™", "Fundamental Insight™", "Strategy Builder™", "Featured Ideas™", "Morning Brief™"].map((t, i) => `<button data-trading-tab="${i}" aria-pressed="${i === 2}">${t}</button>`).join("")}</div><section class="bank-card strategy-builder">
      <div class="builder-tabs"><button data-builder-mode="discover" aria-pressed="${builderMode === "discover"}">Discover</button><button data-builder-mode="screening" aria-pressed="${builderMode === "screening"}">Screening</button><span></span><button data-builder-limit="Discover guide" aria-label="Discover guide">⊙</button><button data-builder-limit="Saved screens" aria-label="Saved screens">☆</button><button data-builder-limit="Help" aria-label="Strategy Builder help">?</button></div>
      ${builderMode === "screening" ? builderScreening() : `<div class="builder-categories">${categories.map((t, i) => `<button data-builder-category="${i}" aria-pressed="${i === builderCategory}">${t}</button>`).join("")}</div>
      ${builderCategory < 2 ? `<div class="builder-tiles">${tiles.map((t,i)=>`<button ${builderCategory === 0 ? `data-builder-theme="${i}"` : `data-builder-screen="${i}"`}>
        ${builderCategory === 0 ? `<img src="/assets/reference-theme-${i}.jpg" alt="">` : `<div class="building-lines building-${i}"></div>`}<span>${t}</span></button>`).join("")}</div>` : `<p class="builder-unavailable">${categories[builderCategory]}: the full historical content is not supplied in the walkthrough.</p>`}`}
      <p class="builder-source">Walkthrough · Apr 10, 2024 · 400–410s. Historical reproduction; no live screener or licensed strategy results.</p></section>`;
  }
  function profileView() {
    return `<div class="bank-subnav profile-tabs">${["Profile", "Preferences", "Notifications", "Agreements", "Securities lending"].map((t) => `<button data-profile-tab="${t}" aria-pressed="${t === "Preferences"}">${t}</button>`).join("")}</div><section class="bank-card reference-profile"><div id="profile-panel">${profilePanel("Preferences")}</div></section>`;
  }
  function profilePanel(tab) {
    if (tab === "Securities lending")
      return `<div class="profile-intro"><img class="profile-reference-icon" src="/assets/reference-lending.png" alt=""><div><h2>Fully-Paid Securities Lending Program</h2><p>Lend your fully-paid securities to benefit from extra income, effortlessly.</p></div></div><h4>You’re enrolled in the Program</h4><p>You may now benefit from an enhanced portfolio performance with no extra effort. <b>No further action is required on your part.</b></p><p>To exclude your securities or exit the Program, write to us through the secure messaging centre by clicking the envelope icon at the top right of the screen.</p><p>To access your daily and monthly lending reports, go the Documents section, then select <i>Securities Lending</i>.</p>`;
    if (tab === "Preferences")
      return `<div class="profile-intro"><img class="profile-reference-icon" src="/assets/reference-preferences.png" alt=""><div><h2>Preferences</h2><p>Customize the different options in your account to personalize your experience.</p></div></div><div class="preference-rows">${["Manage my personal view", "Manage my accounts", "Manage my documents and statements"].map((t, i) => `<details><summary>${t}<span>＋</span></summary><div><label>${i === 0 ? "Default view" : i === 1 ? "Account display" : "Document delivery"}<select><option>${i === 0 ? "Summary" : i === 1 ? "All accounts" : "Electronic documents"}</option><option>${i === 0 ? "Holdings" : i === 1 ? "CAD accounts" : "Paper documents"}</option></select></label><button data-action="save-preferences">Save</button></div></details>`).join("")}</div>`;
    if (tab === "Notifications")
      return `<div class="profile-intro"><span class="profile-line-icon">♧</span><div><h2>Notifications</h2><p>Manage how you receive information about your accounts.</p></div></div><div class="preference-rows">${["Email notifications", "Account activity", "Market alerts"].map((t) => `<details><summary>${t}<span>＋</span></summary><label><input type="checkbox"> Receive notifications in this simulation</label></details>`).join("")}</div>`;
    if (tab === "Agreements")
      return `<div class="profile-intro"><span class="profile-line-icon">▤</span><div><h2>Agreements</h2><p>Consult your account agreements and documents.</p></div></div><div class="document-row">Account agreement <button data-document="Account agreement">View</button></div>`;
    return `<div class="profile-intro"><span class="profile-line-icon">♙</span><div><h2>My profile</h2><p>Usage Interne Seulement</p></div></div><details><summary>Personal information</summary><p>Reference demonstration account. No personal data collected.</p></details><details><summary>Contact information</summary><p>Not connected to a bank account.</p></details>`;
  }
  function show(view) {
    currentView = view;
    activeMenu = "";
    shell.querySelector(".bank-dropdown").hidden = true;
    nav.querySelectorAll("button").forEach((b) => {
      b.setAttribute("aria-expanded", "false");
      b.classList.toggle(
        "active",
        (menus[b.dataset.menu].some(([v]) => v === view) ||
          (b.dataset.menu === "Marchés" && view === "fundamental")) &&
          !(b.dataset.menu === "Recherche" && ["technical", "fundamental"].includes(view)),
      );
    });
    shell.querySelector("#broker-page-title").textContent = titles[view];
    shell.dataset.view = view;
    shell.querySelector("#quote-timestamp").innerHTML =
      view === "quote"
        ? "Apr 10, 2024, 1:24:39 PM<small>Real-time data</small>"
        : 'Apr 10, 2024, 1:22:35 PM <span class="info-icon">i</span><small>Quotes are delayed by 15 min</small>';
    shell.querySelector(".account-selector").hidden = ![
      "summary",
      "holdings",
      "quickcharts",
      "allocation",
    ].includes(view);
    shell.querySelector(".reference-time").hidden = [
      "profile",
      "documents",
      "research",
      "technical",
      "fundamental",
      "strategy",
      "bonds",
    ].includes(view);
    shell.querySelector(".view-selector").hidden = view !== "summary";
    window.scrollTo(0, 0);
    const quote = view === "quote" ? fixture(asset()) : null;
    const referenceTimes = {summary: "1:22:35 PM", quickcharts: "1:34:38 PM", allocation: "1:34:52 PM", watchlists: "1:29:26 PM", etf: "1:24:39 PM"};
    const timestamp = shell.querySelector("#quote-timestamp");
    timestamp.textContent = view === "quote"
      ? quote ? quote.date + (ticker === "FTS.TO" || asset().reference
        ? "" : " · Official datathon pack · Historical close") : "No observation available"
      : "Apr 10, 2024, " + (referenceTimes[view] || "1:22:35 PM");
    const delay = document.createElement("small");
    delay.textContent = view === "quote" && ticker !== "FTS.TO" && !asset().reference
      ? "Historical data · No live quote feed" : view === "watchlists"
        ? "Walkthrough snapshot · No live quote feed" : "Quotes are delayed by 15 min";
    timestamp.append(delay);
    content.innerHTML = ["summary", "holdings"].includes(view)
      ? accountView()
      : view === "allocation"
        ? allocationView()
        : view === "quote"
        ? quoteView()
        : view === "markets"
          ? marketsView()
          : view === "watchlists"
            ? watchView()
            : view === "etf"
              ? etfView()
            : view === "activity"
              ? activityView()
              : view === "documents"
                ? documentsView()
                : view === "research"
                  ? researchView()
                  : ["technical", "fundamental", "strategy", "bonds"].includes(
                        view,
                      )
                    ? researchTool()
                    : ["performance", "quickcharts"].includes(view)
                      ? performanceView()
                      : profileView();
  }
  function toast(text) {
    const el = shell.querySelector(".broker-toast");
    el.textContent = text;
    el.hidden = false;
    setTimeout(() => (el.hidden = true), 3500);
  }
  function modal(title, body) {
    shell.querySelector("#broker-action-title").textContent = title;
    shell.querySelector("#broker-action-body").innerHTML = body;
    actionDialog.classList.remove("reference-alerts");
    actionDialog.showModal();
  }
  function alertForm() {
    const f = fixture(asset());
    return `<div class="alert-security"><button data-action="search"><img src="/assets/canada.svg" alt="Canada">${brokerEscape(ticker === "FTS.TO" ? "FTS" : ticker)} <small>${brokerEscape(asset().name.toUpperCase())}</small><span>⌕</span></button><div><small>Last price</small><span>${f ? f.price.toFixed(2) : "—"}</span></div><div><small>Day’s change</small><span class="negative">${f && f.absolute !== null ? f.absolute.toFixed(2) + "(" + f.change.toFixed(2) + "%)" + (f.change < 0 ? "↓" : "↑") : "—"}</span></div></div><div class="alert-asset-kind"><label><input type="radio" name="alert-kind" checked> Stocks</label><label><input type="radio" name="alert-kind"> ETFs</label></div><form id="alert-form"><div class="alert-trigger-row"><span>Target price (USD or CAD)</span><input aria-label="Target price at or above" name="price" type="number" min=".01" step=".01" placeholder="↑ At or above"><small>And/Or</small><input aria-label="Target price at or below" name="below" type="number" min=".01" step=".01" placeholder="↓ At or below"></div><div class="alert-trigger-row"><span>Day’s change in percentage</span><input aria-label="Day change at or above" name="change-above" type="number" step=".01" placeholder="↑ At or above"><small>And/Or</small><input aria-label="Day change at or below" name="change-below" type="number" step=".01" placeholder="↓ At or below"></div><div class="alert-trigger-row"><span>Percentage change from 52 week range <span class="info-icon">i</span></span><input aria-label="52 week change at or above" type="number" name="week-above" step=".01" placeholder="↑ At or above"><small>And/Or</small><input aria-label="52 week change at or below" name="week-below" type="number" step=".01" placeholder="↓ At or below"></div><div class="alert-email-row"><label for="alert-email">Send email notifications to</label><input id="alert-email" name="email" type="email" value="courtage.direct@bnc.ca"></div><div class="alert-submit"><small>Local simulation · No email is sent</small><button type="submit" class="blue">Create</button></div></form>`;
  }
  function action(name) {
    if (name === "collapse-list") {
      const list = selectedList();
      list.collapsed = !list.collapsed;
      const button = shell.querySelector('[data-action="collapse-list"]');
      button.setAttribute("aria-expanded", String(!list.collapsed));
      shell.querySelector("#watchlist-body").hidden = list.collapsed;
      return;
    }
    if (name === "etf-collapse") {
      etfCollapsed = !etfCollapsed;
      content.innerHTML = etfView();
      shell.querySelector('[data-action="etf-collapse"]').focus();
      return;
    }
    if (name === "etf-reset") {
      etfRegion = "Canada"; etfCollapsed = false;
      content.innerHTML = etfView(); return;
    }
    if (name === "etf-remove") {
      shell.querySelector(".etf-type").hidden = true; return;
    }
    if (name === "logout") {
      modal(
        "Simulation only",
        '<p>This independent mockup is not connected to National Bank. No login or logout credentials are collected.</p><button data-action="close">Close</button>',
      );
      return;
    }
    if (["summary-details", "buying-power"].includes(name)) {
      modal(
        name === "buying-power" ? "Buying power" : "Account summary",
        "<h3>EQUIPE DDA BNCD · 66Q7KH</h3><dl><dt>Cash (CAD)</dt><dd>134.37</dd><dt>Investments</dt><dd>359.86</dd><dt>Total assets</dt><dd>494.22</dd><dt>Buying power</dt><dd>363.85 CAD</dd><dt>Margin</dt><dd>387.70</dd></dl><small>Historical walkthrough snapshot · Apr 10, 2024</small>",
      );
      return;
    }
    if (name === "save-preferences") {
      toast("Preferences saved locally");
      return;
    }
    if (name === "favorite") {
      const list = selectedList();
      if (!list || currentView !== "watchlists") {
        toast("Saved locally"); return;
      }
      list.favorite = !list.favorite;
      show("watchlists");
      toast(list.favorite ? "Watchlist added to favorites" : "Watchlist removed from favorites");
      return;
    }
    if (name === "delete-list") {
      const list = selectedList();
      if (!list) return;
      modal("Delete watchlist", `<p>Delete ${brokerEscape(list.name)} from this local simulation?</p><button data-action="close">Cancel</button> <button data-action="confirm-delete-list" class="sell">Delete watchlist</button>`);
      return;
    }
    if (name === "confirm-delete-list") {
      const index = lists.findIndex((list) => list.id === selectedListId);
      if (index >= 0) { lists.splice(index, 1); listCount--; }
      selectedListId = lists[0]?.id;
      actionDialog.close(); show("watchlists"); return;
    }
    if (name === "export-summary") {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(
        new Blob(
          [
            "Reference snapshot 2024-04-10\nAccount,Cash,Investments,Total\nEQUIPE DDA BNCD,134.37,359.86,494.22",
          ],
          { type: "text/csv" },
        ),
      );
      a.download = "NBDB_reference_summary_2024-04-10.csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      return;
    }
    if (name === "close") {
      actionDialog.close();
      return;
    }
    if (name === "search") {
      modal(
        "Obtenir une cote",
        `<label for="quote-search">Nom ou symbole</label><input id="quote-search" placeholder="Rechercher un titre…" autocomplete="off"><div id="search-results">${securities
          .slice(0, 8)
          .map(
            (a) =>
              `<button data-search-ticker="${brokerEscape(a.ticker)}"><b>${brokerEscape(a.ticker)}</b> ${brokerEscape(a.name)}</button>`,
          )
          .join("")}</div>`,
      );
      return;
    }
    if (name === "buy" || name === "sell") {
      modal(
        `${name === "buy" ? "Acheter" : "Vendre"} · ordre fictif`,
        `<p class="fixture-note">Bac à sable. Aucun ordre ne sera transmis.</p><form id="order-form"><label>Titre<input name="ticker" value="${brokerEscape(ticker)}" readonly></label><label>Compte<select name="account"><option>Compte CAD fictif</option></select></label><label>Quantité<input name="quantity" type="number" min="1" max="10000" step="1" value="10" required></label><label>Type d’ordre<select name="type"><option>À cours limité</option><option>Au marché (simulation)</option></select></label><label>Prix limite fictif<input name="limit" type="number" min="0.01" step="0.01" value="${fixture(asset()).price.toFixed(2)}" required></label><input name="side" type="hidden" value="${name === "buy" ? "Achat" : "Vente"}"><button class="blue" type="submit">Enregistrer le brouillon simulé</button></form>`,
      );
      return;
    }
    if (name === "report") {
      modal(
        "Reference report",
        "<p>The supplied walkthrough shows the report summary. The licensed full report was not supplied. No report content is fabricated.</p>",
      );
      return;
    }
    if (name === "watch") {
      const list = ensureList();
      if (list.observed.some((row) => row[0] === ticker) || list.added.includes(ticker)) {
        toast(`${ticker} is already in ${list.name}`); return;
      }
      if (list.observed.length + list.added.length + list.unseen >= 10) {
        toast("This watchlist already contains 10 symbols"); return;
      }
      list.added.push(ticker);
      toast(`${ticker} added to ${list.name}`);
      return;
    }
    if (name === "new-list" || name === "rename-list") {
      if (name === "new-list" && listCount >= 10) {
        toast("You can create up to 10 watchlists"); return;
      }
      modal(
        name === "new-list" ? "Add a watchlist" : "Rename watchlist",
        `<form id="list-form"><input type="hidden" name="mode" value="${name}"><label>Watchlist name<input name="name" maxlength="60" required value="${name === "rename-list" ? brokerEscape(selectedList().name) : ""}"></label><button class="blue">Save</button></form>`,
      );
      return;
    }
    if (name === "alert") {
      modal(
        "Alerts",
        `<div class="bank-subnav alert-tabs"><button data-alert-tab="create" aria-pressed="true">Create Alerts</button><button data-alert-tab="view">View my Alerts</button><button data-alert-tab="history">History</button></div><div id="alert-panel">${alertForm()}</div>`,
      );
      actionDialog.classList.add("reference-alerts");
      return;
    }
    if (name === "transfer") {
      modal(
        "Virement fictif",
        `<form id="transfer-form"><p class="fixture-note">Aucun compte connecté. Simulation locale seulement.</p><label>Du compte<select><option>Compte CAD fictif</option></select></label><label>Au compte<select><option>Compte épargne fictif</option></select></label><label>Montant CAD<input name="amount" type="number" min="1" max="12500" value="100" required></label><button class="blue">Simuler le virement</button></form>`,
      );
      return;
    }
    if (name === "tools") {
      modal(
        "Boîte à outils",
        `${brokerButton("watchlists", "Mes listes")}${brokerButton("research", "Recherche")}${brokerButton("performance", "Performance")}<button data-action="alert">Mes alertes</button>`,
      );
      return;
    }
    if (name === "messages") {
      modal(
        "Messages",
        `<h3>Bienvenue dans votre espace fictif</h3><p>Vous pouvez explorer chaque surface sans compte bancaire ni identifiant.</p>`,
      );
      return;
    }
    if (name === "help") {
      modal(
        "À propos du mockup",
        `<p>Reconstitution autonome des surfaces du walkthrough fourni : comptes, marchés, activités, documents, recherche et profil.</p><p>Navigation et opérations simulées en mémoire. Recharger réinitialise tout. Aucune affiliation bancaire.</p>`,
      );
      return;
    }
    modal(
      name === "bond" ? "Obligation fictive" : "Stratégie illustrative",
      `<p>Cette surface illustre le parcours de consultation. Aucun instrument n’est offert à la négociation.</p><button data-action="close">Revenir à la recherche</button>`,
    );
  }
  shell.addEventListener("click", (event) => {
    const b = event.target.closest("button, a[data-action], [data-explorer-symbol]");
    if (b?.tagName === "A") event.preventDefault();
    if (!b) return;
    if (b.dataset.allocationToggle) {
      const expanded = b.getAttribute("aria-expanded") === "true";
      b.setAttribute("aria-expanded", String(!expanded));
      shell.querySelector("#" + b.dataset.allocationToggle).hidden = expanded;
      return;
    }
    if (b.hasAttribute("data-etf-tab")) {
      etfTab = Number(b.dataset.etfTab); show("etf"); return;
    }
    if (b.dataset.etfRegion) {
      etfRegion = b.dataset.etfRegion; content.innerHTML = etfView(); return;
    }
    if (b.dataset.alertTab) {
      shell
        .querySelectorAll("[data-alert-tab]")
        .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      shell.querySelector("#alert-panel").innerHTML =
        b.dataset.alertTab === "create"
          ? alertForm()
          : `<table><thead><tr><th>Symbol</th><th>Condition</th><th>Price</th><th>Status</th></tr></thead><tbody>${alerts.map((a) => `<tr><td>${brokerEscape(a.ticker)}</td><td>At or above</td><td>${a.price}</td><td>Local only</td></tr>`).join("") || '<tr><td colspan="4">No alerts</td></tr>'}</tbody></table>`;
      return;
    }
    if (b.dataset.report) {
      modal(
        b.dataset.report,
        "<p>The source walkthrough supplies this report title, but not the full licensed report. No financial report is fabricated here.</p>",
      );
      return;
    }
    if (b.hasAttribute("data-builder-theme") || b.hasAttribute("data-builder-screen")) {
      const label = b.hasAttribute("data-builder-theme") ? builderThemes[Number(b.dataset.builderTheme)] : builderPresets[Number(b.dataset.builderScreen)];
      modal(label, "<p>The historical strategy constituents and licensed results are not supplied. This local reproduction preserves the observed category only; it does not attribute Baxter ratings to these securities.</p>");
      return;
    }
    if (b.hasAttribute("data-builder-category")) {
      builderCategory = Number(b.dataset.builderCategory);
      content.innerHTML = strategyBuilderSurface(); return;
    }
    if (b.dataset.builderMode) {
      builderMode = b.dataset.builderMode;
      content.innerHTML = strategyBuilderSurface(); return;
    }
    if (b.hasAttribute("data-builder-criterion")) {
      const label = b.dataset.builderCriterion;
      if (builderSelected.has(label)) builderSelected.delete(label); else builderSelected.add(label);
      content.innerHTML = strategyBuilderSurface();
      [...content.querySelectorAll("[data-builder-criterion]")].find(x=>x.dataset.builderCriterion === label)?.focus();
      return;
    }
    if (b.hasAttribute("data-builder-clear")) {
      builderSelected.clear(); content.innerHTML = strategyBuilderSurface();
      content.querySelector("[data-builder-clear]").focus(); return;
    }
    if (b.hasAttribute("data-builder-bulk")) {
      builderBulk = !builderBulk; content.innerHTML = strategyBuilderSurface();
      content.querySelector("[data-builder-bulk]").focus(); return;
    }
    if (b.dataset.builderLimit) {
      modal(b.dataset.builderLimit, "<p>This local reproduction has no licensed screener connection. Full results, saved screens, performance and additional criteria are not supplied. No financial strategy or account change is submitted.</p>");
      return;
    }
    if (b.dataset.explorerMode) {
      explorerMode = b.dataset.explorerMode;
      content.innerHTML = fundamentalView();
      content.querySelector(`[data-explorer-mode="${explorerMode}"]`).focus({preventScroll:true});
      return;
    }
    if (b.dataset.explorerSymbol) {
      modal(b.dataset.explorerSymbol, `<p>${brokerEscape(b.dataset.explorerSymbol)} · Walkthrough, Apr 10, 2024,380s. Historical bubble outline and relative size only.</p><p>Numerical ratings, company detail and licensed report are not supplied. No Baxter scores or live prices are substituted.</p>`);
      return;
    }
    if (b.dataset.explorerFilter) {
      const observed = {countries:"Countries: USA",sectors:"Sectors & Industries:7 selected",size:"Bubble Size: Trading Volume90-D…"};
      modal("Historical explorer filter", `<p>${observed[b.dataset.explorerFilter]}</p><p>Other options, selected sector names and the full numerical dataset are not supplied. This historical view is preserved; no proprietary screening results are generated.</p>`);
      return;
    }
    if (b.hasAttribute("data-fundamental-back")) {
      fundamentalDetail = false; show("fundamental");
      content.querySelector(`[data-explorer-mode="${explorerMode}"]`).focus({preventScroll:true});
      return;
    }
    if (b.dataset.factorInfo) {
      const factor = fundamentalFactors.find(([label]) => label === b.dataset.factorInfo);
      modal(b.dataset.factorInfo, `<p>Baxter International Inc · BAX · Walkthrough, Apr 10, 2024,390s.</p><p>${factor ? `Observed score: ${factor[1]} / 100.` : "Observed Quantamental Rating:63 / 100. Chart shape only; no numerical history supplied."} Full licensed report and methodology are not supplied. These are historical screen observations, not Verity calculations or current ratings.</p>`);
      return;
    }
    if (b.dataset.recentDirection) {
      const cards = shell.querySelector(".recent-cards");
      cards.scrollBy({left: b.dataset.recentDirection === "next" ? 376 : -376, behavior: "instant"});
      return;
    }
    if (b.dataset.recentSymbol) {
      const row = recentlyViewed.find(([symbol]) => symbol === b.dataset.recentSymbol);
      if (row) modal(row[2], `<p>${row[0]} : ${row[1]} · ${row[4]}</p><p>Walkthrough, Apr 10, 2024, 350s. Historical screen observation; no live feed.</p><p>The full licensed Technical Insight report is not supplied. ${row[5] ? "Observed five-day change: " + row[5] : "The complete five-day change is not visible in the source."}</p>`);
      return;
    }
    if (b.hasAttribute("data-option-reset")) {
      content.querySelector(".optionsplay").outerHTML = optionsSurface();
      content.querySelector("[data-option-reset]").focus({preventScroll:true});
      return;
    }
    if (b.dataset.optionUnavailable) {
      modal(b.dataset.optionUnavailable, "<p>XIU · Historical OptionsPlay snapshot, Apr 10, 2024,430s.</p><p>Licensed pricing, alternate strategies and execution are not supplied. No order is submitted and no new profit or score is calculated.</p>");
      return;
    }
    if (b.dataset.tradingTab) {
      if (b.dataset.tradingTab === "2") {
        show("technical");
        content.innerHTML = strategyBuilderSurface();
        return;
      }
      if (b.dataset.tradingTab === "0" || b.dataset.tradingTab === "1") {
        show(b.dataset.tradingTab === "0" ? "technical" : "fundamental");
        return;
      }
      toast("Historical third-party report not supplied in the walkthrough");
      return;
    }
    if (b.dataset.performanceTab) {
      shell.querySelector("#performance-metric").textContent =
        b.dataset.performanceTab === "Return"
          ? "Return (%)"
          : "Change in market value ($)";
      shell
        .querySelectorAll("[data-performance-tab]")
        .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      return;
    }
    if (b.dataset.performancePeriod) {
      shell
        .querySelectorAll("[data-performance-period]")
        .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      return;
    }
    if (b.dataset.toolCategory) {
      shell
        .querySelectorAll("[data-tool-category]")
        .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      return;
    }
    if (b.dataset.screenResult) {
      modal(
        b.dataset.screenResult,
        "<p>Historical reference result. The licensed detail report was not included in the source.</p>",
      );
      return;
    }
    if (b.hasAttribute("data-remove-reference")) {
      selectedList().observed.splice(Number(b.dataset.removeReference), 1);
      show("watchlists");
      return;
    }
    if (b.dataset.referenceTicker) {
      ticker = b.dataset.referenceTicker;
      quoteTab = "Overview";
      syncIntegration();
      show("quote");
      return;
    }
    if (b.dataset.menu) {
      const label = b.dataset.menu;
      activeMenu = activeMenu === label ? "" : label;
      const drop = shell.querySelector(".bank-dropdown");
      drop.dataset.navigation = label;
      drop.hidden = !activeMenu;
      drop.innerHTML = activeMenu
        ? menus[label].map(([v, l]) => brokerButton(v, l).replace(
            ">", v === currentView ? ' aria-current="page">' : ">",
          )).join("")
        : "";
      nav
        .querySelectorAll("button")
        .forEach((x) =>
          x.setAttribute("aria-expanded", String(x === b && !!activeMenu)),
        );
      return;
    }
    if (b.dataset.view) {
      if (actionDialog.open) actionDialog.close();
      show(b.dataset.view);
      return;
    }
    if (b.dataset.ticker || b.dataset.searchTicker) {
      ticker = b.dataset.ticker || b.dataset.searchTicker;
      quoteTab = "Overview";
      if (actionDialog.open) actionDialog.close();
      syncIntegration();
      show("quote");
      return;
    }
    if (b.dataset.referenceTrade) {
      ticker = b.dataset.referenceTrade;
      syncIntegration();
      action(b.dataset.side || "buy");
      return;
    }
    if (b.dataset.trade) {
      ticker = b.dataset.trade;
      syncIntegration();
      action("buy");
      return;
    }
    if (b.dataset.action) {
      action(b.dataset.action);
      return;
    }
    if (b.dataset.quoteTab) {
      quoteTab = b.dataset.quoteTab;
      show("quote");
      return;
    }
    if (b.dataset.range) {
      range = b.dataset.range;
      show("quote");
      return;
    }
    if (b.dataset.remove) {
      const list = selectedList();
      list.added = list.added.filter((t) => t !== b.dataset.remove);
      show("watchlists");
      return;
    }
    if (b.dataset.cancelOrder) {
      orders[Number(b.dataset.cancelOrder)].cancelled = true;
      show("activity");
      return;
    }
    if (b.dataset.document) {
      const blob = new Blob(
        [
          `DOCUMENT FICTIF\n${b.dataset.document}\nMockup sans compte connecté. Aucune valeur légale.`,
        ],
        { type: "text/plain" },
      );
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "mockup_document_fictif.txt";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      return;
    }
    if (b.dataset.profileTab) {
      shell
        .querySelectorAll("[data-profile-tab]")
        .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      shell.querySelector("#profile-panel").innerHTML = profilePanel(
        b.dataset.profileTab,
      );
    }
  });
  shell.addEventListener("keydown", (e) => {
    const target = e.target.closest('g[data-explorer-symbol]');
    if (target && ["Enter", " "].includes(e.key)) {
      e.preventDefault(); target.dispatchEvent(new MouseEvent("click", {bubbles:true}));
    }
  });
  shell.addEventListener("change", (e) => {
    if (e.target.dataset.marketGroup) {
      const checked = [
        ...shell.querySelectorAll("[data-market-group]:checked"),
      ].map((e) => Number(e.dataset.marketGroup));
      shell
        .querySelectorAll("[data-index]")
        .forEach(
          (e) =>
            (e.hidden = !checked.includes(
              Math.floor(Number(e.dataset.index) / 3),
            )),
        );
      return;
    }
    if (e.target.id === "broker-ticker") {
      ticker = e.target.value;
      syncIntegration();
      show("quote");
    }
  });
  shell.addEventListener("input", (e) => {
    if (e.target.id === "quote-search") {
      const q = e.target.value.toLowerCase();
      shell.querySelector("#search-results").innerHTML =
        securities
          .filter((a) => (a.ticker + " " + a.name).toLowerCase().includes(q))
          .map(
            (a) =>
              `<button data-search-ticker="${brokerEscape(a.ticker)}"><b>${brokerEscape(a.ticker)}</b> ${brokerEscape(a.name)}</button>`,
          )
          .join("") || "<p>Aucun titre trouvé.</p>";
    }
    if (e.target.id === "research-filter") {
      const q = e.target.value.toLowerCase();
      content
        .querySelectorAll("tbody tr")
        .forEach(
          (row) => (row.hidden = !row.textContent.toLowerCase().includes(q)),
        );
    }
  });
  shell.addEventListener("change", (e) => {
    if (e.target.matches('[aria-label="Watchlist"]')) {
      selectedListId = Number(e.target.value);
      show("watchlists");
    }
  });
  shell.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    if (e.target.id === "fundamental-search") {
      const query = String(f.get("fundamental-query") || "").trim().toLowerCase();
      if (query === "bax" || query === "baxter" || query === "baxter international inc") {
        fundamentalDetail = true; show("fundamental");
        shell.querySelector(".fundamental-company button").focus({preventScroll: true});
      } else modal("Historical rating unavailable", "<p>The requested security's Fundamental Insight ratings are not supplied in the walkthrough. Baxter scores remain attached to BAX only; no substitute rating is generated.</p>");
      return;
    }
    if (e.target.id === "order-form") {
      orders.push({
        ticker,
        side: f.get("side"),
        quantity: Number(f.get("quantity")),
        cancelled: false,
      });
      actionDialog.close();
      show("activity");
      toast("Brouillon enregistré localement. Aucun ordre transmis.");
    }
    if (e.target.id === "list-form") {
      const name = String(f.get("name")).trim();
      if (!name) {
        const input = e.target.querySelector('[name="name"]');
        input.setCustomValidity("Enter a watchlist name"); input.reportValidity();
        input.addEventListener("input", () => input.setCustomValidity(""), {once: true});
        return;
      }
      if (f.get("mode") === "new-list") {
        const list = {id: nextListId++, name, favorite: false, observed: [], added: [], unseen: 0};
        lists.push(list); selectedListId = list.id; listCount++;
      } else selectedList().name = name;
      actionDialog.close();
      show("watchlists");
    }
    if (e.target.id === "alert-form") {
      const target = Number(f.get("price") || f.get("below"));
      if (!target || target <= 0) {
        toast("Enter a target price to create a local alert");
        return;
      }
      alerts.push({ ticker, price: target });
      actionDialog.close();
      toast("Alerte fictive créée");
    }
    if (e.target.id === "transfer-form") {
      actionDialog.close();
      toast("Virement simulé. Aucun fonds déplacé.");
    }
  });
  function syncIntegration() {
    if (!integration || !assets.some((a) => a.ticker === ticker)) return;
    document.getElementById("ticker").value = ticker;
    integration.markDirty();
  }
  function closeNavigation(restoreFocus = false) {
    const trigger = nav.querySelector('[aria-expanded="true"]');
    activeMenu = "";
    shell.querySelector(".bank-dropdown").hidden = true;
    nav.querySelectorAll("button").forEach((button) =>
      button.setAttribute("aria-expanded", "false"));
    if (restoreFocus) trigger?.focus();
  }
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".bank-nav, .bank-dropdown")) closeNavigation();
  });
  shell.addEventListener("keydown", (event) => {
    const cards = event.target.closest(".recent-cards");
    if (cards && event.target === cards && ["Home", "End", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      const left = event.key === "Home" ? 0 : event.key === "End"
        ? cards.scrollWidth : cards.scrollLeft + (event.key === "ArrowRight" ? 376 : -376);
      cards.scrollTo({left, behavior: "instant"});
      return;
    }
    const trigger = event.target.closest("[data-menu]");
    const dropdown = shell.querySelector(".bank-dropdown");
    if (event.key === "Escape" && activeMenu) {
      event.preventDefault(); closeNavigation(true); return;
    }
    if (trigger?.matches(".bank-nav button") &&
        ["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      if (activeMenu !== trigger.dataset.menu) trigger.click();
      const entries = dropdown.querySelectorAll("button");
      entries[event.key === "ArrowDown" ? 0 : entries.length - 1]?.focus();
      return;
    }
    if (dropdown.contains(event.target) &&
        ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const entries = [...dropdown.querySelectorAll("button")];
      let index = entries.indexOf(event.target);
      if (event.key === "Home") index = 0;
      else if (event.key === "End") index = entries.length - 1;
      else index = (index + (event.key === "ArrowDown" ? 1 : -1) + entries.length) % entries.length;
      entries[index]?.focus();
    }
  });
  profileSelect.addEventListener("change", () => {
    profileKey = profileSelect.value;
    shell.querySelector("#broker-user").textContent =
      data.profiles[profileKey].name;

    if (integration) {
      integration.selectProfile(profileKey);
      ticker = document.getElementById("ticker").value;
    }
    show(currentView);
  });
  if (integration) {
    const dialog = document.createElement("dialog");
    dialog.id = "broker-analysis";
    dialog.setAttribute("aria-labelledby", "broker-dialog-title");
    dialog.innerHTML =
      '<div class="broker-dialog-bar"><h2 id="broker-dialog-title">Verity · Avant de décider</h2><button id="broker-close" type="button" aria-label="Fermer l’analyse">Fermer ×</button></div>';
    document.body.append(dialog);
    dialog.append(laboratory);
    shell.addEventListener("click", (e) => {
      if (e.target.closest("#broker-launch")) dialog.showModal();
    });
    dialog
      .querySelector("#broker-close")
      .addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => {
      profileKey = document.querySelector("[data-persona].selected").dataset
        .persona;
      profileSelect.value = profileKey;
      ticker = document.getElementById("ticker").value;
      show("quote");
      shell.querySelector("#broker-launch").focus();
    });
  }
  new MutationObserver(() => decorateBrokerIcons(shell)).observe(shell, {
    childList: true,
    subtree: true,
  });
  show("summary");
}
if (document.getElementById("mockup-root")) mountBrokerage(MOCKUP_DATA);
