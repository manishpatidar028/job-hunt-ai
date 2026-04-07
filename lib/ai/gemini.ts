import { createGroq } from "@ai-sdk/groq";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY!,
});

// Primary model — fast, free, capable enough for CV extraction
export const geminiFlash = groq("llama-3.3-70b-versatile");
export const geminiPro = groq("llama-3.3-70b-versatile");

export { groq };
