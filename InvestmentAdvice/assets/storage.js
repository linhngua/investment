const STORAGE_KEY = "assetViews:v1";
const DEFAULT_URL = "./data/default_views.json";

const DIRECTIONS = ["Bullish", "Bearish", "Neutral"];
const HORIZONS = ["1W", "1M", "3M", "6M"];

function cloneData(data) {
  if (typeof structuredClone === "function") {
    return structuredClone(data);
  }
  return JSON.parse(JSON.stringify(data));
}

async function loadDefaultData() {
  const response = await fetch(DEFAULT_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load default data");
  }
  return response.json();
}

function loadLocalData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function saveAssetViews(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data, null, 2));
}

function clearLocalData() {
  localStorage.removeItem(STORAGE_KEY);
}

function validateAssetViews(data) {
  const errors = [];

  if (!data || typeof data !== "object") {
    return { ok: false, errors: ["Data must be an object."] };
  }

  if (data.schemaVersion !== 1) {
    errors.push("schemaVersion must be 1.");
  }

  if (!Array.isArray(data.assets) || data.assets.length === 0) {
    errors.push("assets must be a non-empty array.");
    return { ok: false, errors };
  }

  data.assets.forEach((asset, index) => {
    const prefix = `assets[${index}]`;
    if (!asset.id || typeof asset.id !== "string") {
      errors.push(`${prefix}.id must be a string.`);
    }
    if (!asset.name || typeof asset.name !== "string") {
      errors.push(`${prefix}.name must be a string.`);
    }
    if (!asset.ticker || typeof asset.ticker !== "string") {
      errors.push(`${prefix}.ticker must be a string.`);
    }
    if (!asset.updatedAt || typeof asset.updatedAt !== "string") {
      errors.push(`${prefix}.updatedAt must be a string.`);
    }
    if (typeof asset.stance !== "string") {
      errors.push(`${prefix}.stance must be a string.`);
    }
    if (!DIRECTIONS.includes(asset.direction)) {
      errors.push(`${prefix}.direction must be ${DIRECTIONS.join("/")}.`);
    }
    if (typeof asset.confidence !== "number" || asset.confidence < 0 || asset.confidence > 100) {
      errors.push(`${prefix}.confidence must be 0-100.`);
    }
    if (!HORIZONS.includes(asset.horizon)) {
      errors.push(`${prefix}.horizon must be ${HORIZONS.join("/")}.`);
    }
    if (!asset.keyLevels || typeof asset.keyLevels !== "object") {
      errors.push(`${prefix}.keyLevels must be an object.`);
    } else {
      ["support", "resistance"].forEach((side) => {
        const levels = asset.keyLevels[side];
        if (!Array.isArray(levels)) {
          errors.push(`${prefix}.keyLevels.${side} must be an array.`);
        } else {
          levels.forEach((level, levelIndex) => {
            if (!level || typeof level.label !== "string") {
              errors.push(`${prefix}.keyLevels.${side}[${levelIndex}].label must be a string.`);
            }
            if (typeof level.value !== "number" || Number.isNaN(level.value)) {
              errors.push(`${prefix}.keyLevels.${side}[${levelIndex}].value must be a number.`);
            }
          });
        }
      });
    }
    if (typeof asset.narrativeMarkdown !== "string") {
      errors.push(`${prefix}.narrativeMarkdown must be a string.`);
    }
    if (!asset.priceOutlook || typeof asset.priceOutlook !== "object") {
      errors.push(`${prefix}.priceOutlook must be an object.`);
    } else {
      ["baseCase", "bullCase", "bearCase"].forEach((field) => {
        if (typeof asset.priceOutlook[field] !== "string") {
          errors.push(`${prefix}.priceOutlook.${field} must be a string.`);
        }
      });
    }
    if (!Array.isArray(asset.catalysts)) {
      errors.push(`${prefix}.catalysts must be an array.`);
    }
    if (!Array.isArray(asset.risks)) {
      errors.push(`${prefix}.risks must be an array.`);
    }
    if (!Array.isArray(asset.tags)) {
      errors.push(`${prefix}.tags must be an array.`);
    }
    if (!asset.chart || typeof asset.chart !== "object") {
      errors.push(`${prefix}.chart must be an object.`);
    } else {
      if (typeof asset.chart.seriesName !== "string") {
        errors.push(`${prefix}.chart.seriesName must be a string.`);
      }
      if (typeof asset.chart.unit !== "string") {
        errors.push(`${prefix}.chart.unit must be a string.`);
      }
      if (!Array.isArray(asset.chart.points)) {
        errors.push(`${prefix}.chart.points must be an array.`);
      } else {
        asset.chart.points.forEach((point, pointIndex) => {
          if (!point || typeof point.time !== "string") {
            errors.push(`${prefix}.chart.points[${pointIndex}].time must be a string.`);
          }
          if (typeof point.value !== "number" || Number.isNaN(point.value)) {
            errors.push(`${prefix}.chart.points[${pointIndex}].value must be a number.`);
          }
        });
      }
    }
    if (asset.revisions && Array.isArray(asset.revisions)) {
      asset.revisions.forEach((revision, revisionIndex) => {
        if (!revision || typeof revision.updatedAt !== "string") {
          errors.push(`${prefix}.revisions[${revisionIndex}].updatedAt must be a string.`);
        }
        if (!DIRECTIONS.includes(revision.direction)) {
          errors.push(`${prefix}.revisions[${revisionIndex}].direction must be ${DIRECTIONS.join("/")}.`);
        }
        if (typeof revision.stance !== "string") {
          errors.push(`${prefix}.revisions[${revisionIndex}].stance must be a string.`);
        }
        if (typeof revision.narrativeMarkdown !== "string") {
          errors.push(`${prefix}.revisions[${revisionIndex}].narrativeMarkdown must be a string.`);
        }
      });
    }
  });

  return { ok: errors.length === 0, errors };
}

async function loadAssetViews() {
  const defaults = await loadDefaultData();
  const local = loadLocalData();
  if (local) {
    const validation = validateAssetViews(local);
    if (validation.ok) {
      return local;
    }
  }
  return defaults;
}

export {
  STORAGE_KEY,
  DIRECTIONS,
  HORIZONS,
  cloneData,
  loadDefaultData,
  loadAssetViews,
  loadLocalData,
  saveAssetViews,
  clearLocalData,
  validateAssetViews
};
