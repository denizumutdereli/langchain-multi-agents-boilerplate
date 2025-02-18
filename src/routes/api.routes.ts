import express from 'express';
import { z } from 'zod';
import { SupervisorAgentImpl } from '../agents/supervisor.agent';
import { redisService } from '../services/redis.service';

const router = express.Router();

const ChatRequestSchema = z.object({
  message: z.string(),
  chatId: z.string().optional(),
});

const supervisor = new SupervisorAgentImpl();

// Process a new message
router.post('/chat', async (req, res) => {
  try {
    const { message, chatId } = ChatRequestSchema.parse(req.body);

    // Get chat history if chatId is provided
    let chatHistory = [];
    if (chatId) {
      const history = await redisService.getChatHistory(chatId);
      if (history) {
        chatHistory = history.messages;
      }
    }

    // Process the message through the supervisor
    const response = await supervisor.process(message, chatHistory);

    // Generate a title for new conversations
    let title = '';
    if (!chatId) {
      const titleChain = await supervisor.process('Generate a short, descriptive title for this football conversation: ' + message);
      title = titleChain.message;
    }

    // Save the conversation
    const newChatId = await redisService.saveChatHistory([
      ...chatHistory,
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: response.message, timestamp: new Date().toISOString() },
    ], title || 'Football Analysis Conversation');

    res.json({
      success: true,
      chatId: newChatId,
      response: response.message,
      reasoning: response.reasoning,
      sources: response.sources,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get chat history
router.get('/chat/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const history = await redisService.getChatHistory(chatId);

    if (!history) {
      return res.status(404).json({
        success: false,
        error: 'Chat history not found',
      });
    }

    res.json({
      success: true,
      history,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router; 