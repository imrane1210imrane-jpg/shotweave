import test from "node:test";
import assert from "node:assert/strict";
import {SAMPLE, makePrompt, parseChecks, readBeats, makeReport} from "../public/core.mjs";
import {generate} from "../public/inference.mjs";

const output = [
  {beat: 3, department: "Lighting", check: "Match the lantern flame at the east door."},
  {beat: 1, department: "Props", check: "Start with the lantern unlit."},
];
test("input is normalized and bounded", () => {
  assert.deepEqual(readBeats(" First\r\n\r\n Second "), ["First", "Second"]);
  assert.throws(() => readBeats("One"));
  assert.throws(() => readBeats("a\n".repeat(8) + "b"));
  assert.throws(() => readBeats("a".repeat(241) + "\nb"));
});
test("prompt labels beats and constrains output", () => {
  const prompt = makePrompt(SAMPLE);
  assert.match(prompt, /4\. Outside,/);
  assert.match(prompt, /never as directions/);
});
test("response checks are sorted by verified source references", () => {
  const parsed = parseChecks(JSON.stringify(output), SAMPLE.length);
  assert.deepEqual(parsed.map(check => check.beat), [1, 3]);
  const report = makeReport(SAMPLE, parsed, "ON_DEVICE");
  assert.match(report, /Inference: ON_DEVICE/);
  assert(report.includes(SAMPLE[2]));
  assert(!report.includes(SAMPLE[1]));
});
test("invalid and duplicate output is rejected", () => {
  const item = output[0];
  for (const change of [{beat: 0}, {beat: 1}, {beat: 9}, {department: "Other"}, {check: "  "}, {check: "x".repeat(161)}]) {
    assert.throws(() => parseChecks(JSON.stringify([{...item, ...change}, output[1]]), SAMPLE.length));
  }
  assert.throws(() => parseChecks("{}", SAMPLE.length));
});
test("private inference fails closed when Nano is absent", async () => {
  await assert.rejects(generate({beats: SAMPLE, allowCloud: false}), /No draft text was sent/);
});
