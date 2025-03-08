// qdrant-client-store.js

import { QdrantClient } from "@qdrant/js-client-rest"
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config();


/**
 * Stores an embedding with its metadata in Qdrant cloud database
 * @param {number[]} embedding - The vector embedding to store
 * @param {Object} metadata - Associated metadata for the embedding
 * @param {string} [collectionName='embeddings'] - Name of the Qdrant collection
 * @returns {Promise<Object>} - Response from Qdrant with operation status
 * @throws {Error} - If required parameters are missing or connection fails
 */
async function storeEmbedding(embedding, metadata, collectionName = 'megamind') {
    try {
        // Validate inputs
        if (!Array.isArray(embedding) || embedding.length === 0) {
            throw new Error('Embedding must be a non-empty array');
        }
        if (!metadata || typeof metadata !== 'object') {
            throw new Error('Metadata must be a valid object');
        }

        // Qdrant cloud configuration
        const client = new QdrantClient({
            url: process.env.QDRANT_URL || 'https://1c18a80d-9fdb-4acc-b003-5dce167d93aa.eu-west-2-0.aws.cloud.qdrant.io', // Replace with your Qdrant cloud URL
            apiKey: process.env.QDRANT_API_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.Ky1TFX6IMwU0OIYYdjdX0Gma36H2BO3g6k-jbiHB4Qs" // Store API key in environment variables
        });

        // Check if collection exists, create if it doesn't
        const collections = await client.getCollections();
        const collectionExists = collections.collections.some(
            col => col.name === collectionName
        );

        console.log(collections);
        console.log(collectionExists)

        if (!collectionExists) {
            await client.createCollection("megamind", {
                vectors: {
                    size: embedding.length, // Dimension of the embedding vector
                    distance: 'Cosine' // Can be changed to 'Euclidean' or 'Dot' based on your needs
                }
            });
        }

        // Generate a unique ID for the point (could also use metadata.id if provided)
        const pointId = uuidv4();

        // Prepare the point to be stored
        const point = {
            id: pointId,
            vector: embedding,
            payload: metadata
        };

        // Upsert the point into Qdrant
        const response = await client.upsert(collectionName, {
            points: [point]
        });

        return {
            success: true,
            pointId,
            qdrantResponse: response
        };

    } catch (error) {
        console.error('Error storing embedding in Qdrant:', error);
        throw new Error(`Failed to store embedding: ${error.message}`);
    }
}

// Example usage:

// async function example() {
//     try {
//         const embedding = [0.1, 0.2, 0.3, 0.4]; // Example embedding vector
//         const metadata = {
//             documentId: 'doc123',
//             title: 'Sample Document',
//             timestamp: new Date().toISOString()
//         };

//         const result = await storeEmbedding(embedding, metadata);
//         console.log('Embedding stored successfully:', result);
//     } catch (error) {
//         console.error('Error in example:', error);
//     }
// }

// example();


// Export the function
module.exports = { storeEmbedding };