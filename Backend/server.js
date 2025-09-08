require("dotenv").config();

const app = require("./src/app");
const connectToDB = require("./src/db/db");
const initSocketServer = require("./src/sockets/socket.server");
const httpServer = require("http").createServer(app);

connectToDB()
  .then(() => {
    initSocketServer(httpServer);

    httpServer.listen(3000, () => {
      console.log("Server is running on PORT 3000");
    });
  })
  .catch((err) => {
    console.log("Error in connecting to DB : ", err);
    process.exit(1);
  });
