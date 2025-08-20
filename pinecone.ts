// pinecone.ts
import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.PINECONE_API_KEY) {
  throw new Error("⚠️ Missing PINECONE_API_KEY in .env");
}

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export const index = pc.index(process.env.PINECONE_INDEX as string);
