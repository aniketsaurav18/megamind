import { QdrantClient } from '@qdrant/js-client-rest';
import axios from 'axios';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
dotenv.config();

const qdrantClient = new QdrantClient({
    url: process.env.QDRANT_URL || 'https://your-qdrant-cloud-url',
    apiKey: process.env.QDRANT_API_KEY
});

// 🔹 Limit max chunks to prevent overload
const MAX_CHUNKS = 500;

export async function storeChunkedTextEmbeddings(input, metadata = {}, collectionName = 'megamind') {
    try {
        let text = typeof input === 'string' ? input : input.text;
        if (!text || typeof text !== 'string') throw new Error('Invalid input');

        const googleApiKey = process.env.GOOGLE_API_KEY;
        if (!googleApiKey) throw new Error('Google API key missing');

        // 🔹 Use Langchain for chunking
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 500,
            chunkOverlap: 200,
        });

        console.log(`Splitting text into chunks...`);
        const chunks = await splitter.splitText(text);
        console.log(`Text split into ${chunks.length} chunks.`);

        if (chunks.length > MAX_CHUNKS) {
            console.warn(`Warning: Text was split into ${chunks.length} chunks, exceeding MAX_CHUNKS (${MAX_CHUNKS}).  Only the first ${MAX_CHUNKS} chunks will be processed.`);
            chunks.length = MAX_CHUNKS; // Truncate to MAX_CHUNKS
        }

        // 🔹 Adaptive batch size
        const batchSize = Math.max(1, Math.min(3, Math.floor(200 / chunks.length))); // Adjust batch size dynamically
        console.log(`Using batch size: ${batchSize}`);

        let storedCount = 0;
        for (let i = 0; i < chunks.length; i += batchSize) {
            const batch = chunks.slice(i, i + batchSize);

            // 🔹 Sequential Processing: Avoids Promise.all() memory overflow
            const embeddings = [];
            console.log(`Fetching embeddings for batch starting at chunk index: ${i}`);
            for (const chunk of batch) {
                embeddings.push(await getGoogleEmbedding(chunk));
            }
            console.log(`Embeddings fetched for batch.`);

            const points = embeddings.map((embedding, index) => ({
                id: uuidv4(),
                vector: embedding,
                payload: { ...metadata, chunkIndex: i + index, textChunk: batch[index] }
            }));

            // 🔹 Store embeddings in Qdrant
            console.log(`Storing ${points.length} points in Qdrant...`);
            await qdrantClient.upsert(collectionName, { points });
            console.log(`Points stored in Qdrant.`);

            // 🔹 Explicitly release memory
            storedCount += batch.length;
            batch.length = 0;
            embeddings.length = 0;
            global.gc && global.gc(); // Force garbage collection (if enabled)
            console.log(`Batch processed. Memory released.`);
        }

        console.log(`Successfully stored ${storedCount} chunks.`);
        return { success: true, chunkCount: storedCount };
    } catch (error) {
        console.error('Error:', error);
        throw new Error(`Failed: ${error.message}`);
    }
}

async function getGoogleEmbedding(text) {
    try {
        console.log(`Fetching Google embedding for text: ${text.substring(0, 50)}...`); // Log first 50 characters of text
        const response = await axios.post(
            'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent',
            { content: { parts: [{ text }] } },
            { headers: { 'Content-Type': 'application/json' }, params: { key: process.env.GOOGLE_API_KEY } }
        );
        console.log(`Google embedding fetched successfully.`);
        return response.data.embedding.values;
    } catch (error) {
        console.error(`Embedding API error: ${error.response?.data?.error?.message || error.message}`);
        throw new Error(`Embedding API error: ${error.response?.data?.error?.message || error.message}`);
    }
}

// async function runTests() {
//     const testCases = [
//         { input: "Hello, this is a short test.", metadata: { source: "test1" } },
//         { 
//             input: "The quick brown fox jumps over the lazy dog. This is a longer sentence to demonstrate chunking. This is another sentence. And yet another sentence. Let's add a lot more text to see how Langchain handles chunking with overlaps. This part should be overlapped with the next chunk. The next chunk will contain the ending part of the previous chunk to provide overlap.", 
//             metadata: { source: "test2" } 
//         },
//         { 
//             input: { text: "Structured input in an object. This input is designed to be longer so that it definitely triggers chunking. More text to reach over the chunk size limit. And more and more and more. Still more. Getting close now, almost at the chunk size. OK, now it should be chunked." }, 
//             metadata: { source: "test3" } 
//         },
//         { 
//             input: "This is an extremely long test case to simulate a very large input. ".repeat(100) + 
//                    "We are ensuring that chunking mechanisms in Langchain or other text-processing systems can efficiently process and segment this data while maintaining meaningful overlap. ".repeat(50) + 
//                    "The text here continues to grow, adding more sentences and paragraphs to see how the system behaves when encountering exceptionally large inputs.".repeat(30),
//             metadata: { source: "long_test" } 
//         }
//     ];
    



//                 // // 🔹 Create collection if it doesn't exist
//                 // await qdrantClient.createCollection("megamind", {
//                 //     vectors: {
//                 //         size: 768, // Assuming the embedding size is 768
//                 //         distance: 'Cosine'
//                 //     }
//                 // });



//     for (const testCase of testCases) {
//         try {
//             console.log(`\n🔹 Running test: ${JSON.stringify(testCase.input).slice(0, 50)}...`);
//             const result = await storeChunkedTextEmbeddings(testCase.input, testCase.metadata);
//             console.log("✅ Success:", result);
//         } catch (error) {
//             console.error("❌ Failed:", error.message);
//         }
//     }
// }

// runTests();


