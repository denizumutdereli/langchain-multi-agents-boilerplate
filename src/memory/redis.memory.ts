import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { ChatHistory, Message } from '../types';

export class RedisCache {
    private client: Redis;
    private readonly prefix = 'chat:';
    private readonly ttl = 60 * 60 * 24 * 7; // 1 week

    constructor() {
        this.client = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
        });
    }

    private getKey(conversationId: string): string {
        return `${this.prefix}${conversationId}`;
    }

    async createConversation(title: string): Promise<string> {
        const id = uuidv4();
        const conversation: ChatHistory = {
            id,
            title,
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await this.client.setex(
            this.getKey(id),
            this.ttl,
            JSON.stringify(conversation)
        );

        return id;
    }

    async getHistory(conversationId?: string): Promise<Message[]> {
        if (!conversationId) return [];

        const data = await this.client.get(this.getKey(conversationId));
        if (!data) return [];

        const conversation: ChatHistory = JSON.parse(data);
        return conversation.messages;
    }

    async addMessage(message: Message, conversationId?: string): Promise<void> {
        if (!conversationId) return;

        const data = await this.client.get(this.getKey(conversationId));
        if (!data) return;

        const conversation: ChatHistory = JSON.parse(data);
        conversation.messages.push(message);
        conversation.updatedAt = new Date();

        await this.client.setex(
            this.getKey(conversationId),
            this.ttl,
            JSON.stringify(conversation)
        );
    }

    async getConversation(conversationId: string): Promise<ChatHistory | null> {
        const data = await this.client.get(this.getKey(conversationId));
        if (!data) return null;

        return JSON.parse(data);
    }

    async deleteConversation(conversationId: string): Promise<void> {
        await this.client.del(this.getKey(conversationId));
    }
} 