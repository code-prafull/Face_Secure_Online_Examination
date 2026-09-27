const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generateAISummary = async (events) => {
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash"
    });

    const prompt = `
You are an AI assistant for an online exam proctoring system.

Analyze the following proctoring events and generate a
short, neutral, factual session summary for the invigilator.

Rules:
- Summarize only the events provided.
- Do not assume that an event proves cheating.
- Do not make the final malpractice decision.
- Mention event types, timestamps, and frequency where available.
- If evidence is insufficient, clearly state that.

Proctoring Events:
${JSON.stringify(events, null, 2)}

Generate the summary in clear, professional language.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;

    return response.text();
};

module.exports = {
    generateAISummary
};
