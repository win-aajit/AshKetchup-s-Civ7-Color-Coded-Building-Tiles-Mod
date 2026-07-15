import '/core/ui/options/screen-options.js';
import { Options, OptionType, CategoryType } from '/core/ui/options/model-options.js';
import { CategoryData } from '/core/ui/options/options-helpers.js';

console.warn("[acb] options module loaded");

if (!CategoryType.Mods) {
  CategoryType["Mods"] = "mods";
}
CategoryData[CategoryType.Mods] ??= {
  title: "LOC_UI_CONTENT_MGR_SUBTITLE",
  description: "LOC_UI_CONTENT_MGR_SUBTITLE_DESCRIPTION",
};

Options.addInitCallback = function (callback) {
  if (this.optionsReInitCallbacks.length && !this.optionsInitCallbacks.length) {
    throw new Error("Options already initialised, cannot add init callback");
  }
  this.optionsInitCallbacks.push(callback);
  this.optionsReInitCallbacks.push(callback);
};

const MOD_ID = "acb";
const KEY = "acbOpt";
const defaults = { opacity: 20, renderMode: 1 };
let data = {};

function loadVal(id) {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults[id];
    const store = JSON.parse(raw);
    return store?.[id] != null ? Number(store[id]) : defaults[id];
  } catch { return defaults[id]; }
}

function saveVal(id) {
  try {
    const raw = localStorage.getItem(KEY);
    const store = raw ? JSON.parse(raw) : {};
    store[id] = data[id];
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch (e) {
    console.error(`[acb] could not persist ${id}`, e);
  }
}

const renderModeItems = [
  { label: "LOC_ACB_RENDER_BOTH", setting: 0 },
  { label: "LOC_ACB_RENDER_FILL", setting: 1 },
  { label: "LOC_ACB_RENDER_EDGE", setting: 2 },
];

Options.addInitCallback(() => {
  data.opacity = loadVal("opacity");
  data.renderMode = loadVal("renderMode");

  Options.addOption({
    category: CategoryType.Mods,
    group: "acb",
    type: OptionType.Slider,
    id: "acb-opacity",
    initListener: (info) => {
      info.currentValue = data.opacity;
      info.formattedValue = `${data.opacity}%`;
    },
    updateListener: (info, value) => {
      data.opacity = Number(value);
      info.formattedValue = `${data.opacity}%`;
      saveVal("opacity");
      window.dispatchEvent(new CustomEvent("acb-option-changed", {
        detail: { name: "opacity", value: data.opacity }
      }));
    },
    label: "LOC_ACB_OPACITY_LABEL",
    description: "LOC_ACB_OPACITY_DESCRIPTION",
    min: 0,
    max: 50,
    steps: 10,
  });

  Options.addOption({
    category: CategoryType.Mods,
    group: "acb",
    type: OptionType.Dropdown,
    id: "acb-render-mode",
    initListener: (info) => {
      info.selectedItemIndex = data.renderMode;
    },
    updateListener: (_info, value) => {
      data.renderMode = Number(value);
      saveVal("renderMode");
      window.dispatchEvent(new CustomEvent("acb-option-changed", {
        detail: { name: "renderMode", value: data.renderMode }
      }));
    },
    label: "LOC_ACB_RENDER_MODE_LABEL",
    description: "LOC_ACB_RENDER_MODE_DESCRIPTION",
    dropdownItems: renderModeItems,
  });
});
