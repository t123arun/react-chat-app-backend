import { saveToPinecone, searchInPinecone } from "./ragService";

(async () => {
  await saveToPinecone("doc1", "Hello, this is a test document about AI.");
  const results = await searchInPinecone("What is AI?");
  console.log("🔍 Search results:", results);
})();
