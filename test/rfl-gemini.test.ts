import { expect, it, vi } from "vitest";
import { requestGeminiAnswer } from "../src/features/rfl/gemini";

it("requests Gemini with the user's browser key", async () => {
  const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(init?.body as string);
    expect(init?.headers).toMatchObject({ "x-goog-api-key": "browser-key" });
    expect(body.contents[0].parts[0].text).toContain("Who should I start?");
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: { parts: [{ text: "Start the eligible player." }] },
            finishReason: "STOP",
          },
        ],
      }),
    );
  });

  await expect(
    requestGeminiAnswer("browser-key", "Who should I start?", {}, { fetcher }),
  ).resolves.toBe("Start the eligible player.");
});

it("maps provider failures without exposing provider response text", async () => {
  for (const status of [400, 404, 429, 503]) {
    const fetcher = vi.fn(
      async () => new Response("secret provider details", { status }),
    );
    await expect(
      requestGeminiAnswer("browser-key", "Question", {}, { fetcher }),
    ).rejects.toThrow(
      status === 429
        ? "quota"
        : status === 404
          ? "model"
          : status === 400
            ? "key"
            : "unavailable",
    );
  }
});
it("checks Google model access without generating text or exposing the key in the URL", async () => {
  const { checkGeminiConnection } = await import("../src/features/rfl/gemini");
  const fetcher = vi.fn(async (url: string, init?: RequestInit) => {
    expect(url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview",
    );
    expect(url).not.toContain("private-key");
    expect(init?.headers).toMatchObject({ "x-goog-api-key": "private-key" });
    expect(init?.body).toBeUndefined();
    return new Response(
      JSON.stringify({ supportedGenerationMethods: ["generateContent"] }),
    );
  });
  await expect(
    checkGeminiConnection("private-key", { fetcher }),
  ).resolves.toBeUndefined();
  expect(fetcher).toHaveBeenCalledOnce();
});
it("rejects missing credentials before sending and reports network failures clearly", async () => {
  const { checkGeminiConnection } = await import("../src/features/rfl/gemini");
  const fetcher = vi.fn(async () => {
    throw new TypeError("Failed to fetch");
  });
  await expect(checkGeminiConnection(" ", { fetcher })).rejects.toThrow("key");
  expect(fetcher).not.toHaveBeenCalled();
  await expect(checkGeminiConnection("key", { fetcher })).rejects.toThrow(
    "reach Google",
  );
});
it("does not mark an inaccessible or nongenerating model as verified", async () => {
  const { checkGeminiConnection } = await import("../src/features/rfl/gemini");
  for (const response of [
    new Response("{}", { status: 403 }),
    new Response(
      JSON.stringify({ supportedGenerationMethods: ["embedContent"] }),
    ),
  ]) {
    await expect(
      checkGeminiConnection("key", { fetcher: vi.fn(async () => response) }),
    ).rejects.toThrow();
  }
});
