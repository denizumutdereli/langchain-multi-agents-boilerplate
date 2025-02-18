# Football Analysis AI Platform

A comprehensive AI-powered platform for football statistics analysis and real-time insights using LangChain v3, multiple LLM models, and advanced agent orchestration.

## 🌟 Key Features

### 1. Multi-Model LLM Integration
- **OpenAI GPT-4 Turbo**: Primary model for complex analysis and reasoning
- **Groq Mixtral-8x7b**: Used for real-time processing and initial query routing
- **Model Selection Logic**: Automatic selection based on task complexity and requirements


### 📹 Demo GIF

![Demo](https://github.com/denizumutdereli/langchain-multi-agents-boilerplate/blob/main/multiAgent.gif)


### 2. Advanced Agent Architecture

#### Supervisor Agent
- Orchestrates the entire query processing pipeline
- Manages agent delegation and task routing
- Handles fallback scenarios and error recovery
- Maintains processing state and debugging information

#### Specialized Agents
- **Analysis Agent**: Historical data analysis and statistical comparisons
- **Realtime Agent**: Live scores and current match statistics
- **Enhancement Agent**: Query refinement and context enrichment
- **Security Agent**: Query validation and scope verification

### 3. RAG (Retrieval Augmented Generation)
- Vector store integration for semantic search
- Redis-based document storage
- Dynamic context retrieval based on query relevance
- Automatic document embedding and indexing
- Support for multiple document types (team stats, player stats, tournament data)

### 4. Memory Management
- **Redis-based Chat History**: Persistent conversation storage
- **Vector Store Memory**: Efficient similarity search
- **Context Window Management**: Handles long-running conversations
- **Session Management**: User-specific conversation tracking

### 5. Tool Integration
- **Football Data Tool**: Historical statistics and records
- **Live Scores Tool**: Real-time match data
- **Stats Calculator Tool**: Advanced statistical analysis
- **Timeframe Tool**: Temporal data processing
- **Dynamic Tool Loading**: Automatic tool discovery and registration

### 6. Multiple Interfaces

#### CLI Interface
- Interactive command-line interface
- Real-time processing feedback
- Step-by-step execution visibility
- Debug information display
- Color-coded output for better readability

#### REST API
- Express-based HTTP server
- JSON request/response format
- Health check endpoints
- Error handling middleware
- Rate limiting and security features

### 7. Advanced Features

#### Query Processing Pipeline
1. Security Validation
2. Context Retrieval
3. Query Enhancement
4. Agent Selection
5. Data Processing
6. Response Generation

#### Structured Output
- JSON-formatted responses
- Confidence scoring
- Source attribution
- Processing metadata
- Error tracing

#### Error Handling
- Graceful degradation
- Fallback mechanisms
- Detailed error reporting
- Recovery strategies

## 🛠 Technical Architecture

### Core Components

#### 1. Agent System
```
src/agents/
├── base.agent.ts         # Base agent implementation
├── supervisor.agent.ts   # Main orchestration agent
├── internal/            # Internal processing agents
└── user/               # User-facing agents
```

#### 2. Tools System
```
src/tools/
├── index.ts            # Tool registry
├── football.tool.ts    # Football data tool
├── live.tool.ts        # Real-time data tools
└── stats.tool.ts       # Statistical analysis tools
```

#### 3. Services
```
src/services/
├── rag.service.ts      # RAG implementation
├── redis.service.ts    # Memory management
└── cache.service.ts    # Response caching
```

### Data Flow
1. Query Input (CLI/API)
2. Security Validation
3. Context Retrieval (RAG)
4. Query Enhancement
5. Agent Selection
6. Tool Execution
7. Response Generation
8. Memory Update

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- Redis server
- OpenAI API key
- Groq API key

### Environment Setup
```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your API keys

# Start Redis
docker-compose up -d

# Run the application
npm run start
```

### Usage Examples

#### CLI Interface
```bash
# Start the CLI
npm run cli

# Example queries:
- "How did Manchester United perform in 2023?"
- "Who was Liverpool's top scorer last season?"
- "Compare Arsenal and Chelsea's recent performance"
```

#### API Endpoints
```bash
# Query endpoint
POST /query
{
  "query": "Tell me about Manchester United's performance"
}

# Health check
GET /health
```

## 🔧 Configuration

### Environment Variables
- `OPENAI_API_KEY`: OpenAI API key
- `GROQ_API_KEY`: Groq API key
- `REDIS_URL`: Redis connection string
- `PORT`: API server port

### Model Configuration
- Adjust temperature and other parameters in `config/config.ts`
- Configure model selection logic in `supervisor.agent.ts`

## 📚 Documentation

### Agent Documentation
- Each agent has specific responsibilities and capabilities
- Agents can be extended or modified for custom use cases
- New agents can be added by implementing the base agent interface

### Tool Documentation
- Tools provide specific functionalities
- New tools can be added by implementing the tool interface
- Tools are automatically discovered and registered

### API Documentation
- RESTful endpoints for query processing
- JSON request/response format
- Error codes and handling

## 🤝 Contributing
- Fork the repository
- Create a feature branch
- Submit a pull request

## 📝 License
MIT License

## 🙏 Acknowledgments
- LangChain team for the excellent framework
- OpenAI and Groq for their LLM APIs
- Redis for memory management capabilities
