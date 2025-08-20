import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { saveToPinecone, searchInPinecone } from "./ragService";

dotenv.config();

interface ChatRequestBody {
  message: string;
}

interface ChatResponse {
  reply: string;
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

console.log(
  "🔑 GEMINI API Key loaded:",
  process.env.GEMINI_API_KEY ? "Yes" : "No"
);

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

app.get("/", (req: Request, res: Response) => {
  res.send("🚀 AI Chat API is running. Use POST /api/chat to talk to me!");
});

// 🔹 Add new document into Pinecone
app.post("/api/add-doc", async (req: Request, res: Response) => {
  const { id, text } = req.body;

  if (!id || !text) {
    return res.status(400).json({ message: "⚠️ Provide both id and text" });
  }

  try {
    await saveToPinecone(id, text);
    res.json({ message: "✅ Document added to Pinecone!" });
  } catch (err) {
    console.error("Pinecone Error:", err);
    res.status(500).json({ message: "⚠️ Failed to save document" });
  }
});

// 🔹 Chat endpoint with RAG
app.post("/api/chat", async (req: Request, res: Response<ChatResponse>) => {
  const { message } = req.body as ChatRequestBody;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ reply: "⚠️ Invalid message format" });
  }

  try {
    // Optional: Save user message automatically
    await saveToPinecone(`msg-${Date.now()}`, message);

    // Retrieve similar documents from Pinecone
    const docs = await searchInPinecone(message);
    const context =
      docs.length > 0 ? docs.join("\n\n") : "No context available.";

    // Build improved RAG prompt
    const prompt = `
You are a helpful AI assistant.
Use the following context to answer the user's question concisely and clearly.

Context:
${context}

User Question:
${message}

Answer:
`;

    // Call Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);

    res.json({ reply: result.response.text() });
  } catch (error: any) {
    console.error("RAG Chat Error:", error);
    res.status(500).json({
      reply: "⚠️ Error connecting to Gemini/Pinecone. Check API key & config.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
