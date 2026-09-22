import { createAdvisorHandler } from "./_lib/rflAdvisor.ts";
export default createAdvisorHandler({
  apiKey: process.env.GEMINI_API_KEY,
  accessToken: process.env.RFL_ADVISOR_TOKEN,
  model: process.env.GEMINI_MODEL,
});
