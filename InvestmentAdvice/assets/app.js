import { loadAssetViews } from "./storage.js";
import { renderDashboard } from "./render.js";

const container = document.querySelector("#assets");
const status = document.querySelector("#status");

async function init() {
  try {
    status.textContent = "Loading data...";
    const data = await loadAssetViews();
    renderDashboard(container, data);
    status.textContent = "";
  } catch (error) {
    status.textContent = "Failed to load data.";
  }
}

init();
