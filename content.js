(() => {
  const API_URL = "https://cursor.com/api/dashboard/list-invoices";
  const PANEL_ID = "cis-invoice-summary-panel";
  const DEBOUNCE_MS = 200;

  // -------- utils --------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function formatMoneyUsd(n) {
    return n.toFixed(2);
  }

  function parseInvoiceMonth(inv) {
    const dt = new Date(Number(inv.date));
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }

  function moneyFromCents(cents) {
    return Number(cents) / 100;
  }

  function computeAverages(latestFirstTotals) {
    const avgN = (n) => {
      const slice = latestFirstTotals.slice(0, n);
      if (!slice.length) return 0;
      return slice.reduce((a, b) => a + b, 0) / slice.length;
    };
    return { avg3: avgN(3), avg6: avgN(6), avg12: avgN(12) };
  }

  // -------- DOM finding --------
  function findInvoicesCard() {
    // Find the card that has the title "Invoices" inside
    const cards = Array.from(document.querySelectorAll("div.bg-brand-dashboard-card"));
    return cards.find((card) => {
      const title = card.querySelector("p.text-md.font-medium");
      return title && title.textContent.trim() === "Invoices";
    }) || null;
  }

  function findCardsContainer() {
    // The top-level list of cards in Billing page: <div class="flex flex-col gap-4">...</div>
    // We find the parent that contains Invoices card and has the flex-col/gap-4 signature.
    const invCard = findInvoicesCard();
    if (!invCard) return null;

    let cur = invCard.parentElement;
    while (cur) {
      if (cur.classList?.contains("flex") && cur.classList?.contains("flex-col") && cur.classList?.contains("gap-4")) {
        return cur;
      }
      cur = cur.parentElement;
    }
    return null;
  }

  function removeExistingPanel() {
    const existing = document.getElementById(PANEL_ID);
    if (existing) existing.remove();
  }

  // -------- chart (no libs) --------
  function renderBarChart(container, labelsOldestFirst, valuesOldestFirst) {
    // Only show last 12 months, reversed to show newest first
    const last12Labels = labelsOldestFirst.slice(-12).reverse();
    const last12Values = valuesOldestFirst.slice(-12).reverse();

    const max = Math.max(...last12Values, 0);

    const chart = document.createElement("div");
    chart.className = "cis-chart";

    last12Labels.forEach((label, i) => {
      const v = last12Values[i];
      const pct = max > 0 ? (v / max) * 100 : 0;

      const barWrap = document.createElement("div");
      barWrap.className = "cis-barWrap";

      const bar = document.createElement("div");
      bar.className = "cis-bar";
      bar.style.height = `${pct}%`;
      bar.title = `${label}: $${formatMoneyUsd(v)}`;

      // Add amount label above bar
      const amountLabel = document.createElement("div");
      amountLabel.className = "cis-amountLabel";
      amountLabel.textContent = `$${formatMoneyUsd(v)}`;

      const xlab = document.createElement("div");
      xlab.className = "cis-xLabel";
      xlab.textContent = label;

      barWrap.appendChild(amountLabel);
      barWrap.appendChild(bar);
      barWrap.appendChild(xlab);
      chart.appendChild(barWrap);
    });

    container.appendChild(chart);
  }

  // -------- UI --------
  function buildCard({ monthsOldestFirst, totalsOldestFirst, avgs, currency }) {
    const card = document.createElement("div");
    card.id = PANEL_ID;

    // Match other cards
    card.className = "rounded-lg flex flex-col gap-4 border-0 bg-brand-dashboard-card p-6 dark:bg-brand-dashboard-card";
    card.style.background = "var(--color-theme-bg-card)";
    card.style.border = "1px solid var(--color-theme-border-quaternary)";

    const header = document.createElement("div");
    header.className = "flex flex-col gap-2";

    const headerRow = document.createElement("div");
    headerRow.className = "flex flex-row items-center justify-between gap-1";

    const title = document.createElement("p");
    title.className = "[&_b]:md:font-semibold [&_strong]:md:font-semibold text-md font-medium";
    title.textContent = "Billing Summary";

    const subtitle = document.createElement("p");
    subtitle.className = "[&_b]:md:font-semibold [&_strong]:md:font-semibold tracking-tight text-base text-theme-text-secondary";
    subtitle.textContent = `Totals by month (${currency.toUpperCase()})`;

    headerRow.appendChild(title);
    header.appendChild(headerRow);
    header.appendChild(subtitle);

    const avgRow = document.createElement("div");
    avgRow.className = "cis-avgRow";
    avgRow.innerHTML = `
      <div class="cis-avgItem"><div class="cis-avgLabel">Avg (3 mo)</div><div class="cis-avgValue">$${formatMoneyUsd(avgs.avg3)}</div></div>
      <div class="cis-avgItem"><div class="cis-avgLabel">Avg (6 mo)</div><div class="cis-avgValue">$${formatMoneyUsd(avgs.avg6)}</div></div>
      <div class="cis-avgItem"><div class="cis-avgLabel">Avg (12 mo)</div><div class="cis-avgValue">$${formatMoneyUsd(avgs.avg12)}</div></div>
    `;

    const chartWrap = document.createElement("div");
    chartWrap.className = "cis-chartWrap";
    renderBarChart(chartWrap, monthsOldestFirst, totalsOldestFirst);

    const tableWrap = document.createElement("div");
    tableWrap.className = "overflow-x-auto";

    const table = document.createElement("table");
    table.className = "w-full border-collapse text-base";

    const thead = document.createElement("thead");
    thead.className = "text-base text-brand-gray-600 dark:text-brand-gray-400";
    thead.innerHTML = `
      <tr class="border-b border-brand-borders text-left">
        <th scope="col" class="px-3 py-2 font-semibold">Month</th>
        <th scope="col" class="px-3 py-2 text-right font-semibold">Total</th>
      </tr>
    `;

    const tbody = document.createElement("tbody");
    // Show last 12 months, newest first
    const last12Months = monthsOldestFirst.slice(-12);
    const last12Totals = totalsOldestFirst.slice(-12);

    for (let i = last12Months.length - 1; i >= 0; i--) {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-brand-borders/10 border-b border-brand-borders";

      const tdM = document.createElement("td");
      tdM.className = "p-2";
      tdM.textContent = last12Months[i];

      const tdT = document.createElement("td");
      tdT.className = "p-2 text-right";
      tdT.textContent = `$${formatMoneyUsd(last12Totals[i])}`;

      tr.appendChild(tdM);
      tr.appendChild(tdT);
      tbody.appendChild(tr);
    }

    table.appendChild(thead);
    table.appendChild(tbody);
    tableWrap.appendChild(table);

    card.appendChild(header);
    card.appendChild(avgRow);
    card.appendChild(chartWrap);
    card.appendChild(tableWrap);

    return card;
  }

  // -------- data --------
  async function fetchInvoices() {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({})
    });

    if (!res.ok) throw new Error(`list-invoices failed: ${res.status}`);
    return res.json();
  }

  function aggregateMonthlyTotals(invoices) {
    const paid = invoices.filter((x) => (x.status || "").toLowerCase() === "paid");

    const totals = new Map();
    let currency = "usd";

    for (const inv of paid) {
      currency = inv.currency || currency;
      const key = parseInvoiceMonth(inv);
      const amt = moneyFromCents(inv.amountCents);
      totals.set(key, (totals.get(key) || 0) + amt);
    }

    // Oldest -> newest
    const monthsOldestFirst = Array.from(totals.keys()).sort();
    const totalsOldestFirst = monthsOldestFirst.map((m) => totals.get(m) || 0);

    // Averages use newest -> oldest
    const totalsLatestFirst = totalsOldestFirst.slice().reverse();
    const avgs = computeAverages(totalsLatestFirst);

    return { monthsOldestFirst, totalsOldestFirst, avgs, currency };
  }

  // -------- mount (debounced + single instance) --------
  let mountTimer = null;
  let mounting = false;

  async function mount() {
    if (mounting) return;
    mounting = true;

    try {
      // Wait for Invoices card to appear (SPA render)
      for (let i = 0; i < 40; i++) {
        if (findInvoicesCard()) break;
        await sleep(200);
      }

      const invCard = findInvoicesCard();
      const container = findCardsContainer();
      if (!invCard || !container) return;

      // Ensure only one panel exists
      removeExistingPanel();

      const payload = await fetchInvoices();
      const data = aggregateMonthlyTotals(payload.invoices || []);
      const summaryCard = buildCard(data);

      // Insert as sibling after Invoices card (not inside it)
      container.insertBefore(summaryCard, invCard.nextSibling);
    } catch (e) {
      // Avoid spamming errors; render once
      removeExistingPanel();
      const invCard = findInvoicesCard();
      const container = findCardsContainer();
      if (invCard && container) {
        const err = document.createElement("div");
        err.id = PANEL_ID;
        err.className = "rounded-lg flex flex-col gap-2 border-0 bg-brand-dashboard-card p-6 dark:bg-brand-dashboard-card";
        err.style.background = "var(--color-theme-bg-card)";
        err.style.border = "1px solid var(--color-theme-border-quaternary)";
        err.innerHTML = `<p class="text-md font-medium">Billing Summary</p><p class="text-base text-theme-text-secondary">Failed to load invoices: ${String(e.message || e)}</p>`;
        container.insertBefore(err, invCard.nextSibling);
      }
    } finally {
      mounting = false;
    }
  }

  function scheduleMount() {
    clearTimeout(mountTimer);
    mountTimer = setTimeout(mount, DEBOUNCE_MS);
  }

  // Initial mount
  scheduleMount();

  // SPA mutations: remount if invoices card appears or page re-renders
  const obs = new MutationObserver(() => {
    const invCard = findInvoicesCard();
    if (!invCard) return;

    // If invoices card is present, ensure our sibling panel exists right after it.
    const panel = document.getElementById(PANEL_ID);
    if (!panel) {
      scheduleMount();
      return;
    }

    // If panel ended up elsewhere, fix positioning.
    const container = findCardsContainer();
    if (container && panel.parentElement === container) {
      const expected = invCard.nextSibling;
      if (expected !== panel) {
        container.insertBefore(panel, invCard.nextSibling);
      }
    }
  });

  obs.observe(document.documentElement, { childList: true, subtree: true });
})();
