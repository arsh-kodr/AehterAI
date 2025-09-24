const { Server } = require("socket.io");
const cookie = require("cookie")
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const aiService = require("../service/ai.service")
const messageModel = require("../models/message.model");
const { createMemory, querryMemory } = require("../service/vector.service")

function initSocketServer(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: "http://localhost:5173",
            credentials: true
        }
    })

    io.use(async (socket, next) => {
        try {
            const cookies = cookie.parse(socket.handshake.headers?.cookie || "");
            
            if (!cookies.token) {
                return next(new Error("Authentication error: No token provided"));
            }

            const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET);
            const user = await userModel.findById(decoded.id);

            if (!user) {
                return next(new Error("Authentication error: User not found"));
            }

            socket.user = user;
            next();

        } catch (err) {
            console.log("Socket auth error:", err);
            next(new Error("Authentication error: Invalid token"));
        }
    })

    io.on("connection", (socket) => {
        console.log("User connected:", socket.user.email);

        socket.on("ai-message", async (messagePayload) => {
            try {
                console.log("Received AI message:", messagePayload);
                
                // 1. Save user message and generate vectors
                const [message, vectors] = await Promise.all([
                    messageModel.create({
                        chat: messagePayload.chat,
                        user: socket.user._id,
                        content: messagePayload.content,
                        role: "user"
                    }),
                    aiService.generateVectors(messagePayload.content),
                ])

                // 2. Create memory for user message
                await createMemory({
                    vectors,
                    messageId: message._id.toString(),
                    metadata: {
                        chat: messagePayload.chat,
                        user: socket.user._id.toString(),
                        text: messagePayload.content
                    }
                })

                // 3. Query memory and get chat history
                const [memory, chatHistory] = await Promise.all([
                    querryMemory({
                        queryVector: vectors,
                        limit: 3,
                        metadata: {
                            user: socket.user._id.toString()
                        }
                    }),
                    messageModel.find({
                        chat: messagePayload.chat
                    }).sort({ createdAt: -1 }).limit(20).lean().then(messages => messages.reverse())
                ])

                // 4. Prepare context for AI
                const stm = chatHistory.map(item => ({
                    role: item.role,
                    parts: [{ text: item.content }]
                }))

                const ltm = [{
                    role: "user",
                    parts: [{
                        text: `These are some previous messages from the chat, use them to generate a response:
                        ${memory.map(item => item.metadata?.text || '').join("\n")}`
                    }]
                }]

                // 5. Generate AI response
                const response = await aiService.generateResponse([...ltm, ...stm])
                console.log("AI response generated:", response.substring(0, 100) + "...");

                // 6. Send response to client immediately
                socket.emit('ai-response', {
                    content: response,
                    chat: messagePayload.chat
                })

                // 7. Save AI response to database (wrap in try-catch to not affect user experience)
                try {
                    const [responseMessage, responseVectors] = await Promise.all([
                        messageModel.create({
                            chat: messagePayload.chat,
                            user: socket.user._id,
                            content: response,
                            role: "model"
                        }),
                        aiService.generateVectors(response)
                    ])

                    await createMemory({
                        vectors: responseVectors,
                        messageId: responseMessage._id.toString(),
                        metadata: {
                            chat: messagePayload.chat,
                            user: socket.user._id.toString(),
                            text: response
                        }
                    })
                    
                    console.log("AI response saved to database");
                } catch (saveError) {
                    console.error("Error saving AI response to database:", saveError);
                    // Don't send error to client since they already got the response
                }

            } catch (error) {
                console.error("Error processing AI message:", error);
                socket.emit('ai-response-error', {
                    error: "Failed to process message"
                });
            }
        })

        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.user.email);
        });
    })
}

module.exports = initSocketServer;