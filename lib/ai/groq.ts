import { createGroq } from "@ai-sdk/groq";

const groqClient = createGroq({
  apiKey: process.env.GROQ_API_KEY!,
});

export const llm = groqClient("llama-3.3-70b-versatile");

// Legacy aliases — remove once all call sites are updated
export const geminiFlash = llm;
export { groqClient as groq };
