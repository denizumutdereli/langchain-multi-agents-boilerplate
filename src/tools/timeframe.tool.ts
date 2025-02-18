import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../utils/logger';

export class TimeframeTool extends StructuredTool {
  name = 'timeframe';
  description = 'Convert and validate football season timeframes';
  schema = z.object({
    timeframe: z.string().describe('Timeframe to process (e.g., "2023/24 season", "last 5 matches")')
  });

  constructor() {
    super();
  }

  private parseSeasonFormat(season: string): { start: Date; end: Date } {
    // Handle format like "2023/24"
    const match = season.match(/^(\d{4})\/(\d{2})$/);
    if (match) {
      const startYear = parseInt(match[1]);
      const endYear = parseInt(`20${match[2]}`);
      return {
        start: new Date(startYear, 7, 1), // August 1st of start year
        end: new Date(endYear, 4, 31), // May 31st of end year
      };
    }
    throw new Error('Invalid season format');
  }

  private parseLastNMatches(timeframe: string): { count: number } {
    const match = timeframe.match(/^last\s+(\d+)\s+matches$/i);
    if (match) {
      return { count: parseInt(match[1]) };
    }
    throw new Error('Invalid last N matches format');
  }

  async _call({ timeframe }: z.infer<typeof this.schema>): Promise<string> {
    try {
      if (timeframe.includes('season')) {
        const season = timeframe.replace(/\s+season$/, '');
        const { start, end } = this.parseSeasonFormat(season);
        return JSON.stringify({ type: 'season', start, end });
      }
      
      if (timeframe.toLowerCase().includes('last')) {
        const { count } = this.parseLastNMatches(timeframe);
        return JSON.stringify({ type: 'last_n_matches', count });
      }

      throw new Error('Unsupported timeframe format');
    } catch (error) {
      logger.error('Timeframe processing failed:', error);
      throw error;
    }
  }
} 