const express = require('express');
const { authUser } = require("../middlewares/auth.middleware"); // Fixed import
const chatController = require("../controllers/chat.controller");

const router = express.Router();

/* POST /api/chat/ */
router.post('/', authUser, chatController.createChat);

/* GET /api/chat/ */
router.get('/', authUser, chatController.getChats);

/* GET /api/chat/messages/:id */
router.get('/messages/:id', authUser, chatController.getMessages);

module.exports = router;