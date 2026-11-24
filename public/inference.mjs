import {firebaseConfig, recaptchaSiteKey} from "./firebase-config.mjs";
import {SAMPLE, makePrompt, parseChecks} from "./core.mjs";

let client;
async function connect() {
  if (!firebaseConfig?.projectId || !firebaseConfig?.apiKey || !firebaseConfig?.appId || !recaptchaSiteKey) {
    throw Error("The Firebase Spark project and App Check site key need to be configured.");
  }
  if (!client) {
    const base = "https://www.gstatic.com/firebasejs/12.19.0/";
    const [appModule, checkModule, aiModule] = await Promise.all(
      ["firebase-app.js", "firebase-app-check.js", "firebase-ai.js"].map(name => import(base + name)),
    );
    const app = appModule.initializeApp(firebaseConfig);
    checkModule.initializeAppCheck(app, {
      provider: new checkModule.ReCaptchaEnterpriseProvider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
    client = {
      ...aiModule,
      ai: aiModule.getAI(app, {backend: new aiModule.GoogleAIBackend()}),
    };
  }
  return client;
}

export async function generate({beats, allowCloud, cloudOnly = false}) {
  if (!allowCloud && !globalThis.LanguageModel) {
    throw Error("Gemini Nano is unavailable in this browser. No draft text was sent.");
  }
  const selectedBeats = allowCloud ? SAMPLE : beats;
  const sdk = await connect();
  const model = sdk.getGenerativeModel(sdk.ai, {
    mode: allowCloud ? (cloudOnly ? "only_in_cloud" : "prefer_on_device") : "only_on_device",
    inCloudParams: {
      model: "gemini-3.5-flash-lite",
      generationConfig: {temperature: 0.2, maxOutputTokens: 1024},
    },
  });
  if (!allowCloud) {
    await model.initializeDeviceModel();
  } else if (!cloudOnly) {
    void model.initializeDeviceModel().catch(() => {});
  }
  const {response} = await model.generateContent(makePrompt(selectedBeats));
  const source = response.inferenceSource?.toUpperCase();
  if (!["ON_DEVICE", "IN_CLOUD"].includes(source) || (!allowCloud && source !== "ON_DEVICE")) {
    throw Error("The inference route could not be verified.");
  }
  return {
    source,
    beats: selectedBeats,
    checks: parseChecks(response.text(), selectedBeats.length),
  };
}
