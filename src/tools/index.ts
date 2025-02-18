import { FootballDataTool } from './football.tool';
import { LeaderboardTool, LiveScoresTool, PlayerStatsTool } from './live.tool';
import { StatsCalculatorTool } from './stats.tool';
import { TimeframeTool } from './timeframe.tool';

// Create and export tool instances
export const tools = [
  new FootballDataTool(),
  new LiveScoresTool(),
  new LeaderboardTool(),
  new PlayerStatsTool(),
  new StatsCalculatorTool(),
  new TimeframeTool()
];
