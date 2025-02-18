import chalk from 'chalk';
import { createInterface } from 'readline';
import type { SupervisorAgent as SupervisorAgentType } from './agents/supervisor.agent';
import type { DocumentSource } from './interfaces/agent.interfaces';
import type { ServiceManager } from './services/service.manager';

console.log('Starting CLI initialization...');
console.log('Imports loaded successfully');

// Import supervisor agent
let SupervisorAgent: typeof SupervisorAgentType;
try {
  const { SupervisorAgent: SA } = require('./agents/supervisor.agent');
  SupervisorAgent = SA;
} catch (error) {
  console.error('Error importing SupervisorAgent:', error);
  process.exit(1);
}

// Import service manager
let serviceManager: ServiceManager;
try {
  const { serviceManager: sm } = require('./services/service.manager');
  serviceManager = sm;
} catch (error) {
  console.error('Error importing ServiceManager:', error);
  process.exit(1);
}

try {
  // Disable LangChain verbose logging
  process.env.LANGCHAIN_VERBOSE = 'false';
  
  // Create supervisor agent
  const supervisor = new SupervisorAgent();
  
  // Create readline interface
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  async function initializeServices() {
    try {
      console.log(chalk.cyan('Initializing services...'));
      await serviceManager.initialize();
      console.log(chalk.green('✓ Services initialized successfully'));
      
      // Check health of services
      const health = await serviceManager.healthCheck();
      console.log('\nService Health:');
      console.log(chalk.cyan('Redis:'), health.redis ? chalk.green('✓ Connected') : chalk.red('✗ Not Connected'));
      console.log(chalk.cyan('RAG:'), health.rag ? chalk.green('✓ Ready') : chalk.yellow('⚠ Limited Functionality'));
      
    } catch (error) {
      console.error(chalk.red('\n✗ Failed to initialize services:'), error);
      process.exit(1);
    }
  }

  async function processInput(input: string) {
    if (input.toLowerCase() === 'exit') {
      await shutdown();
      return;
    }

    try {
      // Clear previous output
      console.clear();
      console.log(chalk.cyan('\n🔄 Processing query...'));
      console.log(chalk.gray(`Original query: "${input}"`));

      // Create a progress indicator
      let currentStep = '';
      let stepCount = 0;

      // Process with real-time step updates
      const result = await supervisor.process(input, undefined, {
        onStep: (step: string, context?: any) => {
          stepCount++;
          currentStep = step;
          
          // Print step with number and description
          console.log(chalk.yellow(`\nStep ${stepCount}:`), chalk.gray(step));
          
          // If there's debug context, show it
          if (context) {
            console.log(chalk.blue('Debug Context:'));
            if (context.agent) {
              console.log(chalk.gray(`  Agent: ${context.agent}`));
            }
            if (context.model) {
              console.log(chalk.gray(`  Model: ${context.model}`));
            }
            if (context.reasoning) {
              console.log(chalk.gray(`  Reasoning: ${context.reasoning}`));
            }
            if (context.tools) {
              console.log(chalk.gray(`  Tools: ${context.tools.join(', ')}`));
            }
          }
        }
      });
      
      // Show the enhanced query
      console.log('\n' + chalk.cyan('Enhanced Query:'));
      console.log(chalk.white(`"${result.query}"`));

      // Show data sources if available
      if (result.context.sources.length > 0) {
        console.log('\n' + chalk.blue('📚 Data Sources:'));
        result.context.sources.forEach((source: DocumentSource) => {
          const type = chalk.cyan(`[${source.type}]`);
          const entity = source.team || source.tournament || '';
          const period = source.year || source.season || '';
          console.log(chalk.gray(`  ${type} ${entity} ${period ? `(${period})` : ''}`));
        });
      }

      // Show tools used
      if (result.analysis.tools_used.length > 0) {
        console.log('\n' + chalk.magenta('��️  Tools Used:'));
        result.analysis.tools_used.forEach((tool: string) => {
          console.log(chalk.gray(`  - ${tool}`));
        });
      }

      // Show final result
      console.log('\n' + chalk.green('📊 Final Analysis:'));
      console.log(chalk.white(result.analysis.result));
      
      // Show confidence
      const confidence = result.analysis.confidence * 100;
      const confidenceColor = confidence > 85 
        ? chalk.green 
        : confidence > 70 
          ? chalk.yellow 
          : chalk.red;
      console.log(confidenceColor(`\nConfidence: ${confidence.toFixed(1)}%`));

    } catch (error) {
      console.error('\n' + chalk.red('❌ Error:'), 
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  async function shutdown() {
    console.log(chalk.yellow('\nShutting down...'));
    try {
      await serviceManager.shutdown();
      console.log(chalk.green('✓ Services shut down successfully'));
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  }

  function prompt() {
    rl.question(chalk.cyan('\nEnter your football question (or "exit" to quit): '), async (input) => {
      if (input.trim()) {
        await processInput(input);
      }
      if (input.toLowerCase() !== 'exit') {
        prompt();
      }
    });
  }

  // Handle interrupts
  process.on('SIGINT', async () => {
    console.log(chalk.yellow('\nReceived SIGINT. Shutting down...'));
    await shutdown();
  });

  process.on('SIGTERM', async () => {
    console.log(chalk.yellow('\nReceived SIGTERM. Shutting down...'));
    await shutdown();
  });

  // Initialize services and start CLI
  (async () => {
    try {
      await initializeServices();
      
      console.log(chalk.cyan('\n🏟️  Football Analysis CLI'));
      console.log(chalk.white('Ask questions about football statistics and analysis'));
      console.log(chalk.gray('Examples:'));
      console.log(chalk.gray('  - "How did Manchester United perform in 2023?"'));
      console.log(chalk.gray('  - "Compare Liverpool and Manchester United\'s performance trends"'));
      console.log(chalk.gray('  - "Who were the most effective strikers in 2023?"'));
      console.log(chalk.gray('\nType "exit" to quit\n'));
      
      prompt();
    } catch (error) {
      console.error(chalk.red('Failed to start CLI:'), error);
      process.exit(1);
    }
  })();

} catch (error) {
  console.error('Error initializing CLI:', error);
  process.exit(1);
}