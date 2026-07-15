import { CategoryType } from '/core/ui/options/model-options.js';
import { CategoryData } from '/core/ui/options/options-helpers.js';

CategoryType["Mods"] = "mods";
CategoryData[CategoryType.Mods] ??= {
  title: "LOC_UI_CONTENT_MGR_SUBTITLE",
  description: "LOC_UI_CONTENT_MGR_SUBTITLE_DESCRIPTION",
};

const MOD_OPTIONS_STYLE = document.createElement("style");
MOD_OPTIONS_STYLE.textContent = `
.option-frame .tab-bar__items fxs-tab-item {
  flex: 1 0 auto;
  min-width: 0rem;
  margin-left: 0.4444444444rem;
  margin-right: 0.4444444444rem;
}
`;
document.head.appendChild(MOD_OPTIONS_STYLE);

const KEY = "modOptions";

export function loadModOption(modID, optionID) {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const store = JSON.parse(raw);
    return store?.[modID]?.[optionID] ?? null;
  } catch { return null; }
}

export function saveModOption(modID, optionID, value) {
  try {
    const raw = localStorage.getItem(KEY);
    const store = raw ? JSON.parse(raw) : {};
    if (!store[modID]) store[modID] = {};
    store[modID][optionID] = value;
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch (e) {
    console.error(`[ModOptions] could not persist ${modID}.${optionID}`, e);
  }
}
