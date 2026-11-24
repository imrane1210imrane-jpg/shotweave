import {SAMPLE, readBeats, makeReport} from "./core.mjs";
import {generate} from "./inference.mjs?v=5";

const byId = id => document.getElementById(id);
const beats = byId("beats");
const consent = byId("consent");
const status = byId("status");
const checks = byId("checks");
const route = byId("source");
const download = byId("export");
const local = byId("local");
const hybrid = byId("hybrid");
const cloud = byId("cloud");
let current;
let running = false;

function refreshButtons() {
  local.disabled = running;
  cloud.disabled = hybrid.disabled = running || !consent.checked;
}
function reset() {
  current = undefined;
  checks.replaceChildren();
  route.hidden = download.hidden = true;
}
function loadSample() {
  beats.value = SAMPLE.join("\n");
  reset();
  status.textContent = "Fictional scene loaded.";
}
function render(result) {
  const label = result.source === "ON_DEVICE" ? "On device" : "Cloud · fictional scene";
  route.textContent = label;
  route.hidden = false;
  for (const check of result.checks) {
    const row = document.createElement("li");
    const heading = document.createElement("strong");
    const instruction = document.createElement("p");
    const quote = document.createElement("small");
    heading.textContent = `Beat ${check.beat} · ${check.department}`;
    instruction.textContent = check.check;
    quote.textContent = result.beats[check.beat - 1];
    row.append(heading, instruction, quote);
    checks.append(row);
  }
  status.textContent = "Review each suggestion against the scene before using it.";
  current = result;
  download.hidden = false;
}
async function review(allowCloud, cloudOnly = false) {
  if (running || (allowCloud && !consent.checked)) return;
  running = true;
  beats.disabled = byId("sample").disabled = consent.disabled = true;
  refreshButtons();
  reset();
  status.textContent = allowCloud ? "Reviewing the fictional scene…" : "Opening the local model. The first download can take several minutes.";
  try {
    render(await generate({beats: allowCloud ? SAMPLE : readBeats(beats.value), allowCloud, cloudOnly}));
  } catch (error) {
    status.textContent = error.message || "Inference failed. Try again.";
  } finally {
    running = false;
    beats.disabled = byId("sample").disabled = consent.disabled = false;
    refreshButtons();
  }
}
byId("sample").addEventListener("click", loadSample);
beats.addEventListener("input", () => { reset(); status.textContent = "Review the updated beats."; });
consent.addEventListener("change", refreshButtons);
local.addEventListener("click", () => review(false));
hybrid.addEventListener("click", () => review(true));
cloud.addEventListener("click", () => review(true, true));
download.addEventListener("click", () => {
  if (!current) return;
  const url = URL.createObjectURL(new Blob([makeReport(current.beats, current.checks, current.source)], {type: "text/markdown"}));
  const link = document.createElement("a");
  link.href = url;
  link.download = "shotweave-checklist.md";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
loadSample();
