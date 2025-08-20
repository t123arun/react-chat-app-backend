import { GoogleGenerativeAI } from "@google/generative-ai";
import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";

dotenv.config();

//load env vars
const GEMINI_API_KEY = process.env.GEMINI_API_KEY as string;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY as string;
const PINECONE_INDEX = process.env.PINECONE_INDEX as string;
const PINECONE_HOST = process.env.PINECONE_HOST as string;

// 🧠 Init clients
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const pc = new Pinecone({ apiKey: PINECONE_API_KEY });
const index = pc.index(PINECONE_INDEX, PINECONE_HOST);

// 🔹 1. Create Embeddings
export async function createEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: "embedding-001" });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

// 🔹 2. Store Embedding in Pinecone
export async function saveToPinecone(id: string, text: string) {
  const embedding = await createEmbedding(text);
  await index.upsert([
    {
      id,
      values: embedding,
      metadata: { text },
    },
  ]);
  console.log(`✅ Saved to Pinecone with ID: ${id}`);
}

// 🔹 3. Query Pinecone
export async function searchInPinecone(query: string) {
  const embedding = await createEmbedding(query);
  const result = await index.query({
    vector: embedding,
    topK: 3,
    includeMetadata: true,
  });
  return result.matches?.map((m) => m.metadata?.text) || [];
}

// 🔹 4. RAG Chat
export async function ragChat(userQuery: string): Promise<string> {
  // Step 1: Retrieve context
  const contextDocs = await searchInPinecone(userQuery);

  // Step 2: Construct prompt
  const context = contextDocs.join("\n---\n");
  const prompt = `You are a helpful AI assistant. 
Use the following context to answer the user's question:

Context:
${context}

Question:
${userQuery}

Answer in a clear and concise way.`;
  // Step 3: Call Gemini chat model
  const chatModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await chatModel.generateContent(prompt);

  return result.response.text();
}
