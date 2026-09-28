import { beforeEach, expect, it, vi } from "vitest";
const sdk = vi.hoisted(() => ({
  init: vi.fn(() => ({ name: "rfl-advisor" })),
  appCheck: vi.fn(),
  getAI: vi.fn(() => ({})),
  getModel: vi.fn(),
  generate: vi.fn(),
}));
vi.mock("firebase/app", () => ({ getApps: () => [], initializeApp: sdk.init }));
vi.mock("firebase/app-check", () => ({
  initializeAppCheck: sdk.appCheck,
  ReCaptchaEnterpriseProvider: class {
    constructor(public siteKey: string) {}
  },
}));
vi.mock("firebase/ai", () => ({
  getAI: sdk.getAI,
  GoogleAIBackend: class {},
  getGenerativeModel: sdk.getModel,
}));
import { createFirebaseAdvisor } from "../src/features/advisor/firebaseAi";
const config = {
  enabled: true,
  model: "gemini-3.1-flash-lite",
  firebase: {
    projectId: "rfl-agent",
    apiKey: "public-firebase-config",
    appId: "1:1078810053990:web:test",
  },
  recaptchaSiteKey: "public-site-key",
};
beforeEach(() => {
  vi.clearAllMocks();
  sdk.getModel.mockReturnValue({ generateContent: sdk.generate });
  sdk.generate.mockResolvedValue({
    response: {
      candidates: [
        {
          finishReason: "STOP",
          content: { parts: [{ text: "Evidence-based answer" }] },
        },
      ],
    },
  });
});
it("uses the Firebase Google backend with App Check and the same bounded league evidence", async () => {
  const advisor = createFirebaseAdvisor(config);
  const controller = new AbortController();
  expect(
    await advisor(
      "Question",
      { leagueId: "league-a", week: 3 },
      {
        signal: controller.signal,
        history: [{ role: "user", text: "Prior question", fetchedAt: 1 }],
      },
    ),
  ).toBe("Evidence-based answer");
  expect(sdk.appCheck).toHaveBeenCalledOnce();
  expect(sdk.appCheck.mock.invocationCallOrder[0]).toBeLessThan(
    sdk.getAI.mock.invocationCallOrder[0],
  );
  expect(sdk.getModel).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      model: "gemini-3.1-flash-lite",
      systemInstruction: expect.anything(),
    }),
    { timeout: 60000 },
  );
  const [body, options] = sdk.generate.mock.calls[0];
  expect(body.contents).toHaveLength(2);
  expect(JSON.parse(body.contents[1].parts[0].text).evidence.leagueId).toBe(
    "league-a",
  );
  expect(options.signal).toBe(controller.signal);
  await advisor("Follow up", {});
  expect(sdk.init).toHaveBeenCalledOnce();
});
it("fails closed if site configuration is incomplete or a different model is selected", async () => {
  for (const value of [
    { ...config, enabled: false },
    { ...config, recaptchaSiteKey: "" },
    { ...config, model: "paid-model" },
  ]) {
    await expect(
      createFirebaseAdvisor(value)("Question", {}),
    ).rejects.toThrow();
  }
  expect(sdk.init).not.toHaveBeenCalled();
  expect(sdk.generate).not.toHaveBeenCalled();
});
it("does not fall back to another provider when the free quota is exhausted", async () => {
  sdk.generate.mockRejectedValue({
    code: "AI/fetch-error",
    customErrorData: { status: 429 },
    message: "private provider details",
  });
  await expect(createFirebaseAdvisor(config)("Question", {})).rejects.toThrow(
    "quota",
  );
  expect(sdk.generate).toHaveBeenCalledOnce();
});
it("rejects incomplete answers and canceled requests", async () => {
  sdk.generate.mockResolvedValue({
    response: {
      candidates: [
        {
          finishReason: "MAX_TOKENS",
          content: { parts: [{ text: "partial" }] },
        },
      ],
    },
  });
  await expect(createFirebaseAdvisor(config)("Question", {})).rejects.toThrow(
    "complete",
  );
  const signal = AbortSignal.abort();
  await expect(
    createFirebaseAdvisor(config)("Question", {}, { signal }),
  ).rejects.toThrow();
});
