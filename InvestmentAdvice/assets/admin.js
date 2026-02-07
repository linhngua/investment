import {
  DIRECTIONS,
  HORIZONS,
  cloneData,
  loadAssetViews,
  loadDefaultData,
  saveAssetViews,
  clearLocalData,
  validateAssetViews
} from "./storage.js";

const container = document.querySelector("#admin-assets");
const status = document.querySelector("#status");
const saveButton = document.querySelector("#save");
const exportButton = document.querySelector("#export");
const importInput = document.querySelector("#import");
const resetButton = document.querySelector("#reset");

let currentData = null;

function setStatus(message, isError = false) {
  status.textContent = message;
  status.className = isError ? "notice error" : "notice";
}

function clearStatus() {
  status.textContent = "";
  status.className = "notice";
}

function createField(labelText, inputEl, helpText) {
  const row = document.createElement("div");
  row.className = "form-row";

  const label = document.createElement("label");
  label.textContent = labelText;

  row.append(label, inputEl);

  if (helpText) {
    const help = document.createElement("div");
    help.className = "form-help";
    help.textContent = helpText;
    row.appendChild(help);
  }

  return row;
}

function createTextInput(name, value) {
  const input = document.createElement("input");
  input.type = "text";
  input.name = name;
  input.value = value || "";
  return input;
}

function createNumberInput(name, value) {
  const input = document.createElement("input");
  input.type = "number";
  input.name = name;
  input.min = "0";
  input.max = "100";
  input.step = "1";
  input.value = typeof value === "number" ? String(value) : "";
  return input;
}

function createTextarea(name, value) {
  const textarea = document.createElement("textarea");
  textarea.name = name;
  textarea.value = value || "";
  return textarea;
}

function createSelect(name, options, value) {
  const select = document.createElement("select");
  select.name = name;
  options.forEach((optionValue) => {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = optionValue;
    if (optionValue === value) {
      option.selected = true;
    }
    select.appendChild(option);
  });
  return select;
}

function formatJson(value) {
  return JSON.stringify(value || [], null, 2);
}

function formatList(values) {
  if (!Array.isArray(values)) {
    return "";
  }
  return values.join(", ");
}

function renderAdmin() {
  container.innerHTML = "";

  currentData.assets.forEach((asset) => {
    const card = document.createElement("section");
    card.className = "admin-card";
    card.dataset.assetId = asset.id;

    const header = document.createElement("div");
    const title = document.createElement("h2");
    title.textContent = `${asset.name} (${asset.ticker})`;
    const updated = document.createElement("div");
    updated.className = "form-help";
    updated.textContent = `Last updated: ${asset.updatedAt}`;
    header.append(title, updated);

    const grid = document.createElement("div");
    grid.className = "form-grid";

    grid.append(
      createField("Stance summary", createTextInput("stance", asset.stance)),
      createField("Direction", createSelect("direction", DIRECTIONS, asset.direction)),
      createField("Confidence (0-100)", createNumberInput("confidence", asset.confidence)),
      createField("Horizon", createSelect("horizon", HORIZONS, asset.horizon)),
      createField("Narrative (Markdown)", createTextarea("narrativeMarkdown", asset.narrativeMarkdown)),
      createField(
        "Base case (Markdown)",
        createTextarea("baseCase", asset.priceOutlook?.baseCase || "")
      ),
      createField(
        "Bull case (Markdown)",
        createTextarea("bullCase", asset.priceOutlook?.bullCase || "")
      ),
      createField(
        "Bear case (Markdown)",
        createTextarea("bearCase", asset.priceOutlook?.bearCase || "")
      ),
      createField(
        "Catalysts (comma or new line)",
        createTextarea("catalysts", formatList(asset.catalysts)),
        "Each entry becomes a list item."
      ),
      createField(
        "Risks (comma or new line)",
        createTextarea("risks", formatList(asset.risks)),
        "Each entry becomes a list item."
      ),
      createField(
        "Tags (comma separated)",
        createTextInput("tags", formatList(asset.tags))
      ),
      createField(
        "Support levels (JSON array)",
        createTextarea("support", formatJson(asset.keyLevels?.support)),
        "Example: [{\"label\":\"S1\",\"value\":1980}]"
      ),
      createField(
        "Resistance levels (JSON array)",
        createTextarea("resistance", formatJson(asset.keyLevels?.resistance)),
        "Example: [{\"label\":\"R1\",\"value\":2065}]"
      ),
      createField("Series name", createTextInput("seriesName", asset.chart?.seriesName || "")),
      createField("Series unit", createTextInput("unit", asset.chart?.unit || "")),
      createField(
        "Chart points (JSON array)",
        createTextarea("points", formatJson(asset.chart?.points)),
        "Example: [{\"time\":\"2026-02-01\",\"value\":2036.9}]"
      )
    );

    card.append(header, grid);
    container.appendChild(card);
  });
}

function parseList(text) {
  if (!text) {
    return [];
  }
  return text
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseJsonArray(text, fieldName, errors) {
  if (!text || !text.trim()) {
    return [];
  }
  try {
    const value = JSON.parse(text);
    if (!Array.isArray(value)) {
      errors.push(`${fieldName} must be a JSON array.`);
      return [];
    }
    return value;
  } catch (error) {
    errors.push(`${fieldName} must be valid JSON.`);
    return [];
  }
}

function normalizeLevels(levels, fieldName, errors) {
  return levels.map((level, index) => {
    const label = typeof level.label === "string" ? level.label.trim() : "";
    const value = Number(level.value);
    if (!label) {
      errors.push(`${fieldName}[${index}].label is required.`);
    }
    if (!Number.isFinite(value)) {
      errors.push(`${fieldName}[${index}].value must be a number.`);
    }
    return { label, value };
  });
}

function normalizePoints(points, fieldName, errors) {
  return points.map((point, index) => {
    const time = typeof point.time === "string" ? point.time.trim() : "";
    const value = Number(point.value);
    if (!time) {
      errors.push(`${fieldName}[${index}].time is required.`);
    }
    if (!Number.isFinite(value)) {
      errors.push(`${fieldName}[${index}].value must be a number.`);
    }
    return { time, value };
  });
}

function readAssetFromForm(card, baseAsset) {
  const errors = [];
  const stance = card.querySelector("[name='stance']").value.trim();
  const direction = card.querySelector("[name='direction']").value;
  const confidenceRaw = card.querySelector("[name='confidence']").value;
  const horizon = card.querySelector("[name='horizon']").value;
  const narrativeMarkdown = card.querySelector("[name='narrativeMarkdown']").value.trim();
  const baseCase = card.querySelector("[name='baseCase']").value.trim();
  const bullCase = card.querySelector("[name='bullCase']").value.trim();
  const bearCase = card.querySelector("[name='bearCase']").value.trim();
  const catalysts = parseList(card.querySelector("[name='catalysts']").value);
  const risks = parseList(card.querySelector("[name='risks']").value);
  const tags = parseList(card.querySelector("[name='tags']").value);

  const supportRaw = card.querySelector("[name='support']").value;
  const resistanceRaw = card.querySelector("[name='resistance']").value;
  const pointsRaw = card.querySelector("[name='points']").value;

  const supportParsed = parseJsonArray(supportRaw, "Support levels", errors);
  const resistanceParsed = parseJsonArray(resistanceRaw, "Resistance levels", errors);
  const pointsParsed = parseJsonArray(pointsRaw, "Chart points", errors);

  if (!DIRECTIONS.includes(direction)) {
    errors.push("Direction must be Bullish, Bearish, or Neutral.");
  }
  if (!HORIZONS.includes(horizon)) {
    errors.push("Horizon must be 1W, 1M, 3M, or 6M.");
  }

  const confidence = Number(confidenceRaw);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 100) {
    errors.push("Confidence must be a number between 0 and 100.");
  }

  const support = normalizeLevels(supportParsed, "Support levels", errors);
  const resistance = normalizeLevels(resistanceParsed, "Resistance levels", errors);
  const points = normalizePoints(pointsParsed, "Chart points", errors);

  const seriesName = card.querySelector("[name='seriesName']").value.trim() || baseAsset.chart.seriesName;
  const unit = card.querySelector("[name='unit']").value.trim() || baseAsset.chart.unit;

  const updatedAsset = {
    ...baseAsset,
    stance,
    direction,
    confidence,
    horizon,
    narrativeMarkdown,
    priceOutlook: {
      baseCase,
      bullCase,
      bearCase
    },
    catalysts,
    risks,
    tags,
    keyLevels: {
      support,
      resistance
    },
    chart: {
      seriesName,
      unit,
      points
    }
  };

  return { asset: updatedAsset, errors };
}

function addRevision(revisions, previousAsset) {
  const prior = {
    updatedAt: previousAsset.updatedAt,
    direction: previousAsset.direction,
    stance: previousAsset.stance,
    narrativeMarkdown: previousAsset.narrativeMarkdown
  };

  const next = [prior, ...(Array.isArray(revisions) ? revisions : [])];
  return next.slice(0, 10);
}

function handleSave() {
  clearStatus();
  const now = new Date().toISOString();
  const nextData = cloneData(currentData);
  const errors = [];

  nextData.assets = nextData.assets.map((asset) => {
    const card = container.querySelector(`[data-asset-id='${asset.id}']`);
    const baseAsset = currentData.assets.find((item) => item.id === asset.id);
    const { asset: updatedAsset, errors: assetErrors } = readAssetFromForm(card, baseAsset);

    if (assetErrors.length) {
      assetErrors.forEach((error) => errors.push(`${asset.name}: ${error}`));
    }

    updatedAsset.updatedAt = now;
    updatedAsset.revisions = addRevision(baseAsset.revisions, baseAsset);

    return updatedAsset;
  });

  if (errors.length) {
    setStatus(errors.join(" "), true);
    return;
  }

  const validation = validateAssetViews(nextData);
  if (!validation.ok) {
    setStatus(validation.errors.join(" "), true);
    return;
  }

  saveAssetViews(nextData);
  currentData = nextData;
  renderAdmin();
  setStatus("Saved to localStorage and revisions updated.");
}

function handleExport() {
  clearStatus();
  const data = currentData || { schemaVersion: 1, assets: [] };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "asset_views.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatus("Exported JSON file.");
}

async function handleImport(event) {
  clearStatus();
  const file = event.target.files[0];
  if (!file) {
    return;
  }
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const validation = validateAssetViews(parsed);
    if (!validation.ok) {
      setStatus(validation.errors.join(" "), true);
      return;
    }
    saveAssetViews(parsed);
    currentData = parsed;
    renderAdmin();
    setStatus("Imported data into localStorage.");
  } catch (error) {
    setStatus("Import failed. Check the JSON file.", true);
  } finally {
    importInput.value = "";
  }
}

async function handleReset() {
  clearStatus();
  clearLocalData();
  currentData = await loadDefaultData();
  renderAdmin();
  setStatus("Reset to default data.");
}

async function init() {
  try {
    currentData = await loadAssetViews();
    renderAdmin();
    setStatus("Ready.");
  } catch (error) {
    setStatus("Failed to load data.", true);
  }
}

saveButton.addEventListener("click", handleSave);
exportButton.addEventListener("click", handleExport);
importInput.addEventListener("change", handleImport);
resetButton.addEventListener("click", handleReset);

init();
