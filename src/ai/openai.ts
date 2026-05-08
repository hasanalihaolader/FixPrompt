import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export async function enhancePrompt(prompt: string) {
    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system",
                content: `
You are an expert prompt engineer for software developers.

Your job:
- convert messy prompts into structured AI-ready prompts
- add missing technical details
- infer backend/frontend/system design context
- ensure clarity and production readiness

Output format:
- Role
- Goal
- Requirements
- Constraints
- Expected Output
        `
            },
            {
                role: "user",
                content: prompt
            }
        ]
    });

    return response.choices[0].message.content || "";
}