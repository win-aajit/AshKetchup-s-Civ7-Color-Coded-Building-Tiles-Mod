import LensManager from '/core/ui/lenses/lens-manager.js';
import '/base-standard/ui/lenses/lens/default-lens.js';
import { LensPanel } from '/base-standard/ui/mini-map/panel-mini-map.js';
function hexToFloat4(hex, alpha) {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  return { x: r / 255, y: g / 255, z: b / 255, w: alpha };
}

const TAG_COLORS = {
  FOOD:        hexToFloat4(0x50a050, 1),
  SCIENCE:     hexToFloat4(0x3399ff, 1),
  PRODUCTION:  hexToFloat4(0x999999, 1),
  CULTURE:     hexToFloat4(0x9955cc, 1),
  GOLD:        hexToFloat4(0xffcc00, 1),
  HAPPINESS:   hexToFloat4(0xff8833, 1),
};
const DEFAULT_COLOR = hexToFloat4(0x808080, 1);
const TAG_PRIORITY = ["SCIENCE","CULTURE","GOLD","FOOD","PRODUCTION","HAPPINESS"];

const YIELD_TAG_MAP = {
  YIELD_SCIENCE: "SCIENCE",
  YIELD_CULTURE: "CULTURE",
  YIELD_FOOD: "FOOD",
  YIELD_GOLD: "GOLD",
  YIELD_PRODUCTION: "PRODUCTION",
  YIELD_HAPPINESS: "HAPPINESS"
};

function buildColorCache() {
  const cache = new Map();
  const agg = new Map();
  GameInfo.Constructible_YieldChanges.forEach((yc) => {
    const tag = YIELD_TAG_MAP[yc.YieldType];
    if (!tag) return;
    let m = agg.get(yc.ConstructibleType);
    if (!m) { m = new Map(); agg.set(yc.ConstructibleType, m); }
    m.set(yc.YieldType, (m.get(yc.YieldType) || 0) + yc.YieldChange);
  });
  GameInfo.Constructibles.forEach((row) => {
    if (row.ConstructibleClass !== "BUILDING") return;
    const m = agg.get(row.ConstructibleType);
    let bestTag = null;
    let bestAmount = 0;
    if (m) {
      for (const [yt, amount] of m) {
        if (amount > bestAmount) {
          bestAmount = amount;
          bestTag = YIELD_TAG_MAP[yt];
        }
      }
    }
    cache.set(row.ConstructibleType, {
      color: bestTag ? TAG_COLORS[bestTag] : DEFAULT_COLOR,
      tag: bestTag
    });
  });
  return cache;
}

let buildingColorCache = null;

function loadOpt(key, fallback) {
  try {
    const raw = localStorage.getItem("acbOpt");
    if (!raw) return fallback;
    const store = JSON.parse(raw);
    const val = store?.[key];
    return val != null ? Number(val) : fallback;
  } catch { return fallback; }
}

let currentOpacity = loadOpt("opacity", 20) / 100;
let renderMode = loadOpt("renderMode", 1);

class CdxBuildingsLayer {
  overlayGroup = WorldUI.createOverlayGroup("CdxBuildingsOverlay", 1);
  overlay = this.overlayGroup.addPlotOverlay();
  visible = false;

  initLayer() {
    if (!buildingColorCache) buildingColorCache = buildColorCache();
    engine.on("ConstructibleAddedToMap", () => { if (this.visible) this.updateMap(); });
    engine.on("ConstructibleRemovedFromMap", () => { if (this.visible) this.updateMap(); });
    this.overlayGroup.setVisible(false);
  }

  applyLayer() {
    this.visible = true;
    this.updateMap();
    this.overlayGroup.setVisible(true);
  }

  removeLayer() {
    this.visible = false;
    this.overlayGroup.setVisible(false);
    this.overlay.clear();
  }

  getOptionName() {
    return "ShowMapBuildings";
  }

  tileColor(loc) {
    const cons = MapConstructibles.getConstructibles(loc.x, loc.y);
    if (!cons) return null;
    let bestTag = null;
    let bestColor = null;
    for (const con of cons) {
      const item = Constructibles.getByComponentID(con);
      if (!item) continue;
      const info = GameInfo.Constructibles.lookup(item.type);
      if (!info || info.ConstructibleClass !== "BUILDING") continue;
      const entry = buildingColorCache.get(info.ConstructibleType);
      if (!entry) continue;
      if (!bestTag || (entry.tag && TAG_PRIORITY.indexOf(entry.tag) < TAG_PRIORITY.indexOf(bestTag))) {
        bestTag = entry.tag;
        bestColor = entry.color;
      }
    }
    if (!bestColor) return null;
    return { x: bestColor.x, y: bestColor.y, z: bestColor.z, w: currentOpacity };
  }

  updateMap() {
    this.overlay.clear();
    const w = GameplayMap.getGridWidth();
    const h = GameplayMap.getGridHeight();
    const groups = new Map();
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        const c = this.tileColor({ x, y });
        if (!c) continue;
        const key = `${c.x},${c.y},${c.z},${c.w}`;
        let arr = groups.get(key);
        if (!arr) { arr = []; groups.set(key, arr); arr.color = c; }
        arr.push({ x, y });
      }
    }
    let count = 0;
    for (const [, plots] of groups) {
      const c = plots.color;
      if (renderMode === 1) {
        this.overlay.addPlots(plots, { fillColor: c, edgeColor: { x: c.x, y: c.y, z: c.z, w: 0 } });
      } else if (renderMode === 2) {
        const edge = { x: c.x * 0.6, y: c.y * 0.6, z: c.z * 0.6, w: currentOpacity > 0 ? 1 : 0 };
        this.overlay.addPlots(plots, { fillColor: { x: c.x, y: c.y, z: c.z, w: 0 }, edgeColor: edge });
      } else {
        const edge = { x: c.x * 0.6, y: c.y * 0.6, z: c.z * 0.6, w: 1 };
        this.overlay.addPlots(plots, { fillColor: c, edgeColor: edge });
      }
      count += plots.length;
    }
  }
}

const instance = new CdxBuildingsLayer();

const defaultLens = LensManager.lenses.get("fxs-default-lens");
if (defaultLens) {
  defaultLens.allowedLayers.add("acb-layer");
}

LensManager.registerLensLayer("acb-layer", instance);

const optName = instance.getOptionName();
const optVal = UI.getOption("user", "GamePlay", optName);
if (optVal == null) {
  UI.setOption("user", "GamePlay", optName, 1);
  LensManager.toggleLayer("acb-layer", { force: true, serialize: false });
}

if (LensPanel?.prototype) {
  const origOnInit = LensPanel.prototype.onInitialize;
  LensPanel.prototype.onInitialize = function () {
    origOnInit?.call(this);
    this.createLayerCheckbox?.("LOC_ACB_LAYER_NAME", "acb-layer");
  };
}

window.addEventListener("acb-option-changed", (e) => {
  if (e.detail.name === "opacity") {
    currentOpacity = Math.max(0, Math.min(1, Number(e.detail.value) / 100));
    if (instance.visible) instance.updateMap();
  } else if (e.detail.name === "renderMode") {
    renderMode = Number(e.detail.value);
    if (instance.visible) instance.updateMap();
  }
});
