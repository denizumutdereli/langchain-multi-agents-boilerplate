import { RedisVectorStore } from "@langchain/community/vectorstores/redis";
import { Document } from "@langchain/core/documents";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Redis } from "ioredis";

export class RedisVectorStoreService {
    private vectorStore: RedisVectorStore;
    private embeddings: OpenAIEmbeddings;
    private client: Redis;
    private readonly indexName = "football_knowledge";

    constructor() {
        this.client = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
        });

        this.embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: "text-embedding-3-small",
        });

        this.vectorStore = new RedisVectorStore(this.embeddings, {
            redisClient: this.client,
            indexName: this.indexName,
            keyPrefix: "football:",
        });
    }

    async addDocuments(documents: Document[]): Promise<void> {
        try {
            await this.vectorStore.addDocuments(documents);
        } catch (error) {
            console.error('Failed to add documents to vector store:', error);
            throw error;
        }
    }

    async similaritySearch(
        query: string,
        k: number = 4,
        filter?: Record<string, any>
    ): Promise<Document[]> {
        try {
            return await this.vectorStore.similaritySearch(query, k, filter);
        } catch (error) {
            console.error('Failed to perform similarity search:', error);
            throw error;
        }
    }

    async similaritySearchWithScore(
        query: string,
        k: number = 4,
        filter?: Record<string, any>
    ): Promise<[Document, number][]> {
        try {
            return await this.vectorStore.similaritySearchWithScore(query, k, filter);
        } catch (error) {
            console.error('Failed to perform similarity search with score:', error);
            throw error;
        }
    }

    async deleteDocuments(ids: string[]): Promise<void> {
        try {
            await this.vectorStore.delete({ ids });
        } catch (error) {
            console.error('Failed to delete documents:', error);
            throw error;
        }
    }

    async clearVectorStore(): Promise<void> {
        try {
            // Delete all keys with the football: prefix
            const keys = await this.client.keys('football:*');
            if (keys.length > 0) {
                await this.client.del(...keys);
            }
            // Drop the index
            await this.client.call('FT.DROPINDEX', this.indexName);
        } catch (error) {
            console.error('Failed to clear vector store:', error);
            throw error;
        }
    }
} 