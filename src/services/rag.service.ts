import { Document } from '@langchain/core/documents';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RedisChatMessageHistory } from '@langchain/redis';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { config } from '../config/config';
import footballStats from '../data/football_stats.json';
import { logger } from '../utils/logger';

export class RAGService {
  private embeddings: OpenAIEmbeddings;
  private vectorStore: MemoryVectorStore | null = null;
  private messageHistories: Map<string, RedisChatMessageHistory> = new Map();

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: config.openai.apiKey,
    });
  }

  async initialize() {
    try {
      // Convert football stats to documents
      const documents = this.convertStatsToDocuments();

      // Initialize memory vector store
      this.vectorStore = await MemoryVectorStore.fromDocuments(
        documents,
        this.embeddings
      );
      logger.info('RAG service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize RAG service:', error);
      throw error;
    }
  }

  async ping(): Promise<boolean> {
    try {
      if (!this.vectorStore) {
        return false;
      }
      // Try a simple similarity search as a health check
      await this.vectorStore.similaritySearch('test', 1);
      return true;
    } catch (error) {
      logger.error('RAG service ping failed:', error);
      return false;
    }
  }

  getMessageHistory(userId: string): RedisChatMessageHistory {
    if (!this.messageHistories.has(userId)) {
      this.messageHistories.set(
        userId,
        new RedisChatMessageHistory({
          sessionId: `football-chat-${userId}`,
          config: {
            socket: {
              host: config.redis.host,
              port: config.redis.port,
            },
            password: config.redis.password,
          },
        })
      );
    }
    return this.messageHistories.get(userId)!;
  }

  private convertStatsToDocuments(): Document[] {
    const documents: Document[] = [];

    // Process team stats
    footballStats.teams.forEach((team) => {
      // Team general stats
      Object.entries(team.stats).forEach(([year, stats]) => {
        documents.push({
          pageContent: `${team.name} ${year} season statistics: ${JSON.stringify(stats)}`,
          metadata: {
            team: team.name,
            year,
            type: 'team_stats',
          },
        });
      });

      // Key players stats
      team.key_players.forEach((player) => {
        documents.push({
          pageContent: `${player.name} (${team.name}) 2023 statistics: ${JSON.stringify(player.stats_2023)}`,
          metadata: {
            team: team.name,
            player: player.name,
            type: 'player_stats',
          },
        });
      });
    });

    // Process tournament stats
    footballStats.tournaments.forEach((tournament) => {
      documents.push({
        pageContent: `${tournament.name} ${tournament.season} results: Winner - ${tournament.winner}, Top Scorer - ${tournament.top_scorer.name} (${tournament.top_scorer.goals} goals), Most Assists - ${tournament.most_assists.name} (${tournament.most_assists.assists} assists)`,
        metadata: {
          tournament: tournament.name,
          season: tournament.season,
          type: 'tournament_stats',
        },
      });
    });

    return documents;
  }

  async findRelevantContext(query: string, maxResults: number = 3): Promise<Document[]> {
    if (!this.vectorStore) {
      logger.warn('Vector store not initialized, returning empty context');
      return [];
    }

    try {
      const results = await this.vectorStore.similaritySearch(query, maxResults);
      return results;
    } catch (error) {
      logger.error('Failed to find relevant context:', error);
      return [];
    }
  }

  async addDocument(content: string, metadata: Record<string, any>): Promise<void> {
    if (!this.vectorStore) {
      throw new Error('Vector store not initialized');
    }

    try {
      await this.vectorStore.addDocuments([
        new Document({
          pageContent: content,
          metadata,
        }),
      ]);
      logger.debug(`Document added with metadata: ${JSON.stringify(metadata)}`);
    } catch (error) {
      logger.error('Failed to add document:', error);
      throw error;
    }
  }

  async clearUserHistory(userId: string): Promise<void> {
    try {
      const history = this.getMessageHistory(userId);
      await history.clear();
      this.messageHistories.delete(userId);
      logger.debug(`Cleared history for user: ${userId}`);
    } catch (error) {
      logger.error(`Failed to clear history for user ${userId}:`, error);
      throw error;
    }
  }

  async close() {
    try {
      // Clear all message histories
      for (const [userId, history] of this.messageHistories) {
        await this.clearUserHistory(userId);
      }
      logger.info('RAG service closed successfully');
    } catch (error) {
      logger.error('Failed to close RAG service:', error);
      throw error;
    }
  }
}

export const ragService = new RAGService(); 