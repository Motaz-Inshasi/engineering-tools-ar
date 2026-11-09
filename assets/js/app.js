import { initTheme } from "./theme.js";

initTheme();

if (document.body.dataset.tool) {
  import("./ui.js").then((m) => m.initTool());
}

if (document.getElementById("home-search")) {
  import("./search.js").then((m) => m.initSearch());
}
