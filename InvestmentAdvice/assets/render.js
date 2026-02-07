const HISTORY_LIMIT = 5;

function formatDate(isoString) {
  if (!isoString) {
    return "Unknown";
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatNumber(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  const formatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2
  });
  return formatter.format(value);
}

function sanitizeHtml(html) {
  const allowedTags = new Set([
    "p",
    "strong",
    "em",
    "a",
    "ul",
    "ol",
    "li",
    "code",
    "pre",
    "blockquote",
    "br",
    "hr",
    "h1",
    "h2",
    "h3",
    "h4"
  ]);

  const allowedAttrs = {
    a: ["href", "title", "target", "rel"],
    code: ["class"],
    pre: ["class"]
  };

  const template = document.createElement("template");
  template.innerHTML = html;

  const cleanNode = (node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();
      if (!allowedTags.has(tagName)) {
        const fragment = document.createDocumentFragment();
        while (node.firstChild) {
          fragment.appendChild(node.firstChild);
        }
        node.replaceWith(fragment);
        return;
      }
      Array.from(node.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        const value = attr.value || "";
        if (name.startsWith("on")) {
          node.removeAttribute(attr.name);
          return;
        }
        if ((name === "href" || name === "src") && /(javascript:|data:)/i.test(value.trim())) {
          node.removeAttribute(attr.name);
          return;
        }
        const allowed = allowedAttrs[tagName] || [];
        if (!allowed.includes(name)) {
          node.removeAttribute(attr.name);
        }
      });
    }
    Array.from(node.childNodes).forEach(cleanNode);
  };

  Array.from(template.content.childNodes).forEach(cleanNode);

  return template.innerHTML;
}

function renderMarkdown(markdown) {
  if (!markdown) {
    return "";
  }
  if (typeof marked !== "undefined") {
    marked.setOptions({ mangle: false, headerIds: false });
    const raw = marked.parse(markdown);
    return sanitizeHtml(raw);
  }
  return sanitizeHtml(markdown);
}

function createMetric(label, value) {
  const item = document.createElement("div");
  const labelEl = document.createElement("span");
  labelEl.textContent = label;
  const valueEl = document.createElement("div");
  valueEl.textContent = value;
  item.append(labelEl, valueEl);
  return item;
}

function createLevelList(levels) {
  const list = document.createElement("ul");
  if (!levels || levels.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "None";
    list.appendChild(empty);
    return list;
  }
  levels.forEach((level) => {
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = level.label;
    const value = document.createElement("span");
    value.textContent = formatNumber(level.value);
    li.append(label, value);
    list.appendChild(li);
  });
  return list;
}

function createTagRow(tags) {
  const row = document.createElement("div");
  row.className = "tag-row";
  if (!tags || tags.length === 0) {
    const empty = document.createElement("span");
    empty.className = "tag";
    empty.textContent = "no tags";
    row.appendChild(empty);
    return row;
  }
  tags.forEach((tag) => {
    const chip = document.createElement("span");
    chip.className = "tag";
    chip.textContent = tag;
    row.appendChild(chip);
  });
  return row;
}

function createHistory(revisions) {
  const wrapper = document.createElement("div");
  wrapper.className = "history";
  if (!revisions || revisions.length === 0) {
    const empty = document.createElement("div");
    empty.className = "history-item";
    empty.textContent = "No revisions yet.";
    wrapper.appendChild(empty);
    return wrapper;
  }
  revisions.slice(0, HISTORY_LIMIT).forEach((revision) => {
    const item = document.createElement("div");
    item.className = "history-item";
    const title = document.createElement("strong");
    title.textContent = `${formatDate(revision.updatedAt)} - ${revision.direction}`;
    const stance = document.createElement("div");
    stance.textContent = revision.stance;
    const note = document.createElement("div");
    note.innerHTML = renderMarkdown(revision.narrativeMarkdown || "");
    item.append(title, stance, note);
    wrapper.appendChild(item);
  });
  return wrapper;
}

function createOutlook(outlook) {
  const wrapper = document.createElement("div");
  wrapper.className = "outlook-grid";

  const makeBlock = (label, text) => {
    const block = document.createElement("div");
    const title = document.createElement("div");
    title.className = "section-title";
    title.textContent = label;
    const body = document.createElement("div");
    body.className = "outlook";
    body.innerHTML = renderMarkdown(text || "");
    block.append(title, body);
    return block;
  };

  wrapper.append(
    makeBlock("Base Case", outlook.baseCase),
    makeBlock("Bull Case", outlook.bullCase),
    makeBlock("Bear Case", outlook.bearCase)
  );
  return wrapper;
}

function createListSection(title, items) {
  const wrapper = document.createElement("div");
  const heading = document.createElement("div");
  heading.className = "section-title";
  heading.textContent = title;
  const list = document.createElement("ul");
  list.style.margin = "0";
  list.style.paddingLeft = "18px";
  if (!items || items.length === 0) {
    const li = document.createElement("li");
    li.textContent = "None";
    list.appendChild(li);
  } else {
    items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });
  }
  wrapper.append(heading, list);
  return wrapper;
}

function renderCharts(assets, root) {
  if (typeof LightweightCharts === "undefined") {
    return;
  }

  const observers = [];

  assets.forEach((asset) => {
    const container = root.querySelector(`[data-chart='${asset.id}']`);
    if (!container) {
      return;
    }

    const points = asset.chart?.points || [];
    if (!points.length) {
      const empty = document.createElement("div");
      empty.className = "chart-empty";
      empty.textContent = "No chart data available.";
      container.appendChild(empty);
      return;
    }

    const chart = LightweightCharts.createChart(container, {
      layout: {
        background: { color: "#f9fbfa" },
        textColor: "#425148"
      },
      grid: {
        vertLines: { color: "#e4ebe6" },
        horzLines: { color: "#e4ebe6" }
      },
      rightPriceScale: {
        borderColor: "#e4ebe6"
      },
      timeScale: {
        borderColor: "#e4ebe6"
      },
      height: 220
    });

    const series = chart.addLineSeries({
      color: "#1e7a62",
      lineWidth: 2
    });

    series.setData(points);
    chart.timeScale().fitContent();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver((entries) => {
        entries.forEach((entry) => {
          const { width, height } = entry.contentRect;
          chart.resize(Math.floor(width), Math.floor(height));
        });
      });

      observer.observe(container);
      observers.push(observer);
    }
  });
}

function renderDashboard(container, data) {
  container.innerHTML = "";

  data.assets.forEach((asset, index) => {
    const card = document.createElement("section");
    card.className = "asset-card";
    card.style.setProperty("--delay", `${index * 80}ms`);

    const header = document.createElement("div");
    header.className = "asset-header";

    const titleWrap = document.createElement("div");
    titleWrap.className = "asset-title";
    const title = document.createElement("h2");
    title.textContent = asset.name;
    const subtitle = document.createElement("span");
    subtitle.textContent = `${asset.ticker} | Updated ${formatDate(asset.updatedAt)}`;
    titleWrap.append(title, subtitle);

    const pill = document.createElement("div");
    pill.className = `pill ${asset.direction.toLowerCase()}`;
    pill.textContent = asset.direction;

    header.append(titleWrap, pill);

    const stance = document.createElement("div");
    stance.textContent = asset.stance;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.append(
      createMetric("Confidence", `${asset.confidence}%`),
      createMetric("Horizon", asset.horizon),
      createMetric("Series", `${asset.chart.seriesName} (${asset.chart.unit})`),
      createMetric("Catalysts", `${asset.catalysts.length} items`)
    );

    const levels = document.createElement("div");
    levels.className = "key-levels";
    const support = document.createElement("div");
    support.className = "level-group";
    const supportTitle = document.createElement("div");
    supportTitle.className = "section-title";
    supportTitle.textContent = "Support";
    support.append(supportTitle, createLevelList(asset.keyLevels.support));

    const resistance = document.createElement("div");
    resistance.className = "level-group";
    const resistanceTitle = document.createElement("div");
    resistanceTitle.className = "section-title";
    resistanceTitle.textContent = "Resistance";
    resistance.append(resistanceTitle, createLevelList(asset.keyLevels.resistance));

    levels.append(support, resistance);

    const narrativeBlock = document.createElement("div");
    const narrativeTitle = document.createElement("div");
    narrativeTitle.className = "section-title";
    narrativeTitle.textContent = "Narrative";
    const narrative = document.createElement("div");
    narrative.className = "narrative";
    narrative.innerHTML = renderMarkdown(asset.narrativeMarkdown);
    narrativeBlock.append(narrativeTitle, narrative);

    const outlookBlock = document.createElement("div");
    const outlookTitle = document.createElement("div");
    outlookTitle.className = "section-title";
    outlookTitle.textContent = "Outlook";
    const outlook = createOutlook(asset.priceOutlook);
    outlookBlock.append(outlookTitle, outlook);

    const listRow = document.createElement("div");
    listRow.className = "key-levels";
    listRow.append(
      createListSection("Catalysts", asset.catalysts),
      createListSection("Risks", asset.risks)
    );

    const tagsBlock = document.createElement("div");
    const tagsTitle = document.createElement("div");
    tagsTitle.className = "section-title";
    tagsTitle.textContent = "Tags";
    tagsBlock.append(tagsTitle, createTagRow(asset.tags));

    const chartWrap = document.createElement("div");
    const chartTitle = document.createElement("div");
    chartTitle.className = "section-title";
    chartTitle.textContent = "Chart";
    const chartBox = document.createElement("div");
    chartBox.className = "chart-box";
    const chart = document.createElement("div");
    chart.className = "chart";
    chart.dataset.chart = asset.id;
    chartBox.appendChild(chart);
    chartWrap.append(chartTitle, chartBox);

    const historyBlock = document.createElement("div");
    const historyTitle = document.createElement("div");
    historyTitle.className = "section-title";
    historyTitle.textContent = "History";
    historyBlock.append(historyTitle, createHistory(asset.revisions));

    card.append(
      header,
      stance,
      meta,
      levels,
      narrativeBlock,
      outlookBlock,
      listRow,
      tagsBlock,
      chartWrap,
      historyBlock
    );

    container.appendChild(card);
  });

  renderCharts(data.assets, container);
}

export { renderDashboard, renderMarkdown, formatDate, formatNumber };
