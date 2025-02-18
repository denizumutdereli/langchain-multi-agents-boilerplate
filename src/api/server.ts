import bodyParser from 'body-parser';
import express from 'express';
import { logger } from '../utils/logger';

// Import SupervisorAgent from dynamically loaded module
// We use require since the agents are dynamically loaded
const { SupervisorAgent } = require('../agents/supervisor.agent');

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(bodyParser.json());

// Create an instance of SupervisorAgent
const supervisor = new SupervisorAgent();

// POST endpoint to process queries
app.post('/query', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Missing query field in request body.' });
    }

    // Process the query with SupervisorAgent
    const result = await supervisor.process(query);
    return res.json(result);

  } catch (error) {
    logger.error('Error processing query:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.listen(port, () => {
  console.log(`Express API server listening on port ${port}`);
}); 