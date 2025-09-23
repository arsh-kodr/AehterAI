const { Server } = require("socket.io");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const { generateResponse, generateVectors } = require("../service/ai.service");
const messageModel = require("../models/message.model");
const { createMemory, querryMemory } = require("../service/vector.service");

function initSocketServer(httpServer) {
  const io = new Server(httpServer);

  io.use(async (socket, next) => {
    const cookies = cookie.parse(socket.handshake.headers?.cookie || "");

    if (!cookies.token) {
      return next(new Error("Authentication Error :  No token provided"));
    }

    try {
      const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET);

      const user = await userModel.findById(decoded.id);

      socket.user = user;

      next();
    } catch (error) {
      next(new Error("Authentication Error :  Invalid Token"));
      return error;
    }
  });

  io.on("connection", (socket) => {
    console.log("New Socket Connection : ", socket.id);

    socket.on("ai-message", async (messagePayload) => {
      const [message, vectors] = await Promise.all([
        messageModel.create({
          chat: messagePayload.chat,
          user: socket.user._id,
          content: messagePayload.content,
          role: "user",
        }),

        generateVectors(messagePayload.content),
      ]);

      await createMemory({
        vectors,
        messageId: message._id,
        metadata: {
          user: socket.user._id,
          chat: messagePayload.chat,
          text: messagePayload.content,
        },
      });

      const [memory, chatHistory] = await Promise.all([
        querryMemory({
          queryVector: vectors,
          limit: 3,
          metadata: {
            user: socket.user._id,
          },
        }),

        messageModel
          .find({
            chat: messagePayload.chat,
          })
          .sort({ createdAt: 1 })
          .limit(20)
          .lean()
          .then((messages) =>
            messages.map(({ role, content }) => ({ role, content }))
          ),
      ]);

      const stm = chatHistory.map((item) => {
        return {
          role: item.role,
          parts: [{ text: item.content }],
        };
      });

      const ltm = [
        {
          role: "user",
          parts: [
            {
              text: `
            these are some previous messsages from the chat , use them to generate a better response
            ${memory.map((item) => item.metadata.text).join("\n")}
            `,
            },
          ],
        },
      ];

      console.log(ltm[0]);
      console.log(stm);

      const response = await generateResponse([...ltm, ...stm]);

      socket.emit("ai-response", {
        content: response,
        chat: messagePayload.chat,
      });

      const [responseMessage, responseVectors] = await Promise.all([
        messageModel.create({
          chat: messagePayload.chat,
          user: socket.user._id,
          content: response,
          role: "model",
        }),
        generateVectors(response),
      ]);

      await createMemory({
        vectors: responseVectors,
        messageId: responseMessage._id,
        metadata: {
          user: socket.user._id,
          chat: messagePayload.chat,
          text: response,
        },
      });
    });
  });
}

module.exports = initSocketServer;
