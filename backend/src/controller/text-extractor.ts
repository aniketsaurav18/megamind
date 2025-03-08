import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("AIzaSyDHSKH0D0rMM-2z5YKwY4c_YnpVlC9g2nU");

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const prompt = "Explain how AI works";

import { extractTestFromImage } from "../ai/prompts";

export async function textExtractor(image: string, mimeType: string) {
  const result = await model.generateContent([
    {
      inlineData: {
        data: image,
        mimeType: mimeType,
      },
    },
    extractTestFromImage,
  ]);
  return result.response.text();
}
