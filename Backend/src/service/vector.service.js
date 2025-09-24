// Import the Pinecone library
const { Pinecone } = require('@pinecone-database/pinecone');

// Initialize a Pinecone client with your API key
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

const cohortChatGptIndex = pc.Index('cohort-chat-gpt');

async function createMemory({vectors, metadata, messageId}) {
    try {
        console.log("Creating memory for message:", messageId);
        console.log("Vectors length:", vectors.length);
        console.log("Metadata:", metadata);
        
        await cohortChatGptIndex.upsert([{
            id: messageId.toString(), // Ensure string
            values: vectors,
            metadata
        }]);
        
        console.log("Memory created successfully");
    } catch (error) {
        console.error("Error creating memory:", error);
        throw error;
    }
}

async function querryMemory({queryVector, limit = 5 , metadata}) {
 
    const data = await cohortChatGptIndex.query({
        vector : queryVector,
        topK : limit,
        filter : metadata ? metadata :  undefined,
        includeMetadata : true
    })
 
    return data.matches;
}

module.exports = {createMemory , querryMemory}