import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../utils/logger';

export class StatsCalculatorTool extends StructuredTool {
  name = 'stats_calculator';
  description = 'Perform statistical calculations on football data';
  schema = z.object({
    operation: z.string().describe('Statistical operation to perform'),
    data: z.array(z.number()).describe('Array of numbers to perform calculation on')
  });

  constructor() {
    super();
  }

  async _call({ operation, data }: z.infer<typeof this.schema>): Promise<string> {
    try {
      switch (operation.toLowerCase()) {
        case 'average':
          return String(data.reduce((a, b) => a + b, 0) / data.length);
        case 'sum':
          return String(data.reduce((a, b) => a + b, 0));
        case 'max':
          return String(Math.max(...data));
        case 'min':
          return String(Math.min(...data));
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
    } catch (error) {
      logger.error('Stats calculation failed:', error);
      throw error;
    }
  }
} 