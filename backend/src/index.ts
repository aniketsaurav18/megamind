import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { QdrantClient } from "@qdrant/js-client-rest";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { fetchDocuments } from "./utils/helper";
import morgan from "morgan";
import winston from "winston";
import multer from "multer";
import { submitController } from "./controller/submit-controller";
import { logger } from "./utils/logger";
import bodyParser from "body-parser";

// Load environment variables
dotenv.config();
const apiKey = process.env.GEMINI_API_KEY;
const collectionName = process.env.VECTORDB_COLLECTION_NAME;
const DBUri = process.env.VECTORDB_URL;
const DBkey = process.env.VECTORDB_API_KEY;

if (!apiKey || !collectionName) {
  console.error("Environment variables missing");
  process.exit(1);
}

// Set up Winston logger

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use((req, res, next) => {
  res.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

// Use morgan to log HTTP requests
app.use(
  morgan("combined", {
    stream: { write: (message: any) => logger.info(message.trim()) },
  })
);

// Health check route
app.get("/health-check", (req: Request, res: Response) => {
  res.status(200).json({ status: "API is working" });
});

// Root route
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "hello world" });
});

app.post("/submit", submitController);

const PORT = process.env.PORT || 3001;

(async () => {
  try {
    app.listen(PORT, () => {
      console.log(`Server is listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Application startup failed:", error);
    process.exit(1);
  }
})();
