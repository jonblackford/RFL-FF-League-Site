import type { FirebaseOptions } from "firebase/app";
import type { GenerativeModel } from "firebase/ai";
import type { AdvisorMessage } from "./conversation";
import { advisorSystemInstruction, buildAdvisorContents } from "../rfl/gemini";
import config from "@/config/firebase-ai.json";
export type FirebaseAdvisorConfig = {
  enabled: boolean;
  model: string;
  firebase: FirebaseOptions;
  recaptchaSiteKey: string;
};
export const firebaseAiEnabled = config.enabled;
export const FIREBASE_FREE_MODEL = "gemini-3.1-flash-lite";
export function createFirebaseAdvisor(settings: FirebaseAdvisorConfig) {
  let modelPromise: Promise<GenerativeModel> | undefined;
  async function model() {
    if (
      !settings.enabled ||
      !settings.firebase.projectId ||
      !settings.firebase.appId ||
      !settings.firebase.apiKey ||
      !settings.recaptchaSiteKey
    )
      throw new Error(
        "The site AI connection is not fully configured. Please try again after setup is complete.",
      );
    if (settings.model !== FIREBASE_FREE_MODEL)
      throw new Error(
        "This model is not enabled for the site’s free-tier setup.",
      );
    modelPromise ??= (async () => {
      const [appSDK, checkSDK, aiSDK] = await Promise.all([
        import("firebase/app"),
        import("firebase/app-check"),
        import("firebase/ai"),
      ]);
      const app =
        appSDK.getApps().find((a) => a.name === "rfl-advisor") ||
        appSDK.initializeApp(settings.firebase, "rfl-advisor");
      checkSDK.initializeAppCheck(app, {
        provider: new checkSDK.ReCaptchaEnterpriseProvider(
          settings.recaptchaSiteKey,
        ),
        isTokenAutoRefreshEnabled: true,
      });
      const ai = aiSDK.getAI(app, { backend: new aiSDK.GoogleAIBackend() });
      return aiSDK.getGenerativeModel(
        ai,
        {
          model: settings.model,
          systemInstruction: advisorSystemInstruction,
          generationConfig: { maxOutputTokens: 2048, temperature: 0.3 },
        },
        { timeout: 60000 },
      );
    })().catch((e) => {
      modelPromise = undefined;
      throw e;
    });
    return modelPromise;
  }
  return async (
    question: string,
    evidence: unknown,
    options: { history?: AdvisorMessage[]; signal?: AbortSignal } = {},
  ) => {
    options.signal?.throwIfAborted();
    try {
      const instance = await model();
      options.signal?.throwIfAborted();
      const result = await instance.generateContent(
        { contents: buildAdvisorContents(question, evidence, options.history) },
        { signal: options.signal },
      );
      options.signal?.throwIfAborted();
      const candidate = result.response.candidates?.[0];
      const text = candidate?.content?.parts
        .flatMap((p) =>
          "text" in p &&
          typeof p.text === "string" &&
          !("thought" in p && p.thought)
            ? [p.text]
            : [],
        )
        .join("\n")
        .trim();
      if (!text || candidate?.finishReason !== "STOP")
        throw new Error(
          "Google did not return a complete answer. Please retry.",
        );
      return text;
    } catch (error) {
      if (options.signal?.aborted) throw error;
      const e = error as {
        code?: string;
        customErrorData?: { status?: number };
        message?: string;
      };
      const status = e.customErrorData?.status;
      if (
        status === 429 ||
        /quota|resource.exhausted|429/i.test(e.message || "")
      )
        throw new Error(
          "The site’s free AI quota is temporarily exhausted. Try again later; your league tools still work.",
        );
      if (
        status === 403 ||
        /app.?check|recaptcha|403/i.test(e.code + " " + e.message)
      )
        throw new Error(
          "Google could not verify this site’s AI access. Reload and check that browser privacy tools allow Firebase and reCAPTCHA.",
        );
      if (e.code)
        throw new Error(
          "The Google AI connection is unavailable. Please retry shortly.",
        );
      throw error;
    }
  };
}
export const requestFirebaseAnswer = createFirebaseAdvisor(config);
