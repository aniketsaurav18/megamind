import dotenv from "dotenv";
dotenv.config();
import { Request, Response } from "express";
import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { QdrantClient } from "@qdrant/js-client-rest";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "../utils/logger";
import { fetchDocuments } from "../utils/helper";

const apiKey = process.env.GEMINI_API_KEY || "sdkfjskdf";
const collectionName = process.env.VECTORDB_COLLECTION_NAME || "megamind";

const genai = new GoogleGenerativeAI(apiKey);
const embeddingModel = genai.getGenerativeModel({
  model: "text-embedding-004",
});

process.env.GOOGLE_APPLICATION_CREDENTIALS = "labelanalyzer-8467c8b95bcd.json";

export const submitController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Extract the messages from the request body
    // useChat hook sends messages array in the format required by AI SDK
    const { messages } = req.body;

    // If there's no messages array or it's empty, check for the query property
    // This is for backward compatibility with your current implementation
    let query = "";

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      // Fallback to the old format
      query = req.body.query;
      logger.info(`Received query (old format): ${query}`);

      if (!query) {
        logger.error("No valid input found in request body");
        res.status(400).json({ message: "No valid input found" });
        return;
      }
    } else {
      // Get the latest user message
      const latestUserMessage = messages
        .filter((msg) => msg.role === "user")
        .pop();

      if (latestUserMessage) {
        query = latestUserMessage.content;
        logger.info(`Received query (new format): ${query}`);
      } else {
        logger.error("No user message found in messages array");
        res.status(400).json({ message: "No user message found" });
        return;
      }
    }

    // Fetch relevant documents for the query
    const systemquery = await fetchDocuments(query, embeddingModel);
    // console.log("Extracted text", systemquery);

    // Set correct headers for streaming
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    // Stream the response using AI SDK
    const textStream = await streamText({
      model: google("gemini-1.5-flash"),
      prompt: systemquery,
    });

    textStream.pipeTextStreamToResponse(res);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
