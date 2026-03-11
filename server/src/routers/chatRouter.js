import express from 'express';
import { handleChatGenerate, handleChatStreamGenerate, getConversations, getConversationHistory, deleteConversation } from "../controllers/chatController.js";

const router = express.Router();

// Create new chat or continue existing conversation (non-stream)
router.post('/', handleChatGenerate);

// Stream chat responses
router.post('/stream', handleChatStreamGenerate);

// Get all conversations for the current requester scope
router.get('/conversations', getConversations);

// Get a specific conversation with its messages
router.get('/conversations/:conversationId', getConversationHistory);

// Delete a conversation for the current requester scope
router.delete('/conversations/:conversationId', deleteConversation);

export default router;
