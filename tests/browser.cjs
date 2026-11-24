const {chromium} = require(process.env.SHOTWEAVE_PLAYWRIGHT || "playwright");
const assert = require("node:assert/strict");
const {readFile} = require("node:fs/promises");
(async () => {
  const browser = await chromium.launch({executablePath: process.env.SHOTWEAVE_CHROMIUM});
  try {
    const page = await browser.newPage({viewport: {width: 1280, height: 850}});
    const failed = [];
    page.on("pageerror", error => failed.push(error.message));
    await page.goto("http://127.0.0.1:8764");
    const hybrid = page.getByRole("button", {name: "Review fictional scene"});
    assert(await hybrid.isDisabled());
    await page.getByRole("textbox").fill("One beat");
    await page.getByRole("button", {name: "Review on this device"}).click();
    await page.getByRole("status").getByText("Enter 2–8 beats", {exact: false}).waitFor();
    await page.getByRole("button", {name: "Load fictional scene"}).click();
    await page.getByRole("button", {name: "Review on this device"}).click();
    await page.getByRole("status").getByText(/need to be configured|No draft text was sent/).waitFor();
    await page.getByRole("checkbox").check();
    await hybrid.click();
    await page.getByRole("status").getByText("need to be configured", {exact: false}).waitFor();
    await page.getByRole("checkbox").uncheck();
    await page.getByRole("button", {name: "Load fictional scene"}).click();
    await page.setViewportSize({width: 390, height: 844});
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    assert.deepEqual(failed, []);

    // Intercept the model adapter only in this test. The shipped app has no simulated inference.
    await page.route("**/inference.mjs*", route => route.fulfill({contentType: "text/javascript", body: `
      import {SAMPLE} from "./core.mjs";
      export async function generate({beats, allowCloud}) {
        if (allowCloud && beats.join("|") !== SAMPLE.join("|")) throw Error("Private data leaked");
        return {source: allowCloud ? "IN_CLOUD" : "ON_DEVICE", beats,
          checks: [{beat: 1, department: "Props", check: "Check the first prop."}]};
      }
    `}));
    await page.reload();
    await page.getByRole("textbox").fill("PRIVATE-1\nPRIVATE-2");
    await page.getByRole("button", {name: "Review on this device"}).click();
    await page.getByText("On device", {exact: true}).waitFor();
    await page.getByText("PRIVATE-1", {exact: true}).waitFor();
    await page.getByRole("checkbox").check();
    await hybrid.click();
    await page.getByText("Cloud · fictional scene", {exact: true}).waitFor();
    assert.equal(await page.getByText("PRIVATE-1", {exact: true}).count(), 0);
    const pendingDownload = page.waitForEvent("download");
    await page.getByRole("button", {name: "Download Markdown"}).click();
    const download = await pendingDownload;
    const markdown = await readFile(await download.path(), "utf8");
    assert(markdown.includes("IN_CLOUD") && markdown.includes("unlit lantern") && !markdown.includes("PRIVATE-1"));
    assert.deepEqual(failed, []);
    console.log("Chromium: input, consent, errors, narrow viewport, simulated response rendering and Markdown export passed.");
    console.log("Prompt API availability:", await page.evaluate(async () => typeof LanguageModel === "undefined" ? "API unavailable" : LanguageModel.availability()));
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error);process.exitCode=1});
