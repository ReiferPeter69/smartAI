import { DiscoveryPhase } from './DiscoveryPhase';
import type { LLMConfig } from '../../llm/types';

export async function exampleDiscoveryFlow() {
  const llmConfig: LLMConfig = {
    id: 'example-config',
    provider: 'openai',
    model: 'gpt-4',
    apiKey: process.env.OPENAI_API_KEY || '',
    isDefault: true,
  };

  const discoveryPhase = new DiscoveryPhase({
    userPrompt: 'Build a task management application where users can create, organize, and track their todos',
    appType: 'react',
    llmConfig,
  });

  console.log('Step 1: Generating clarification questions...');
  const questions = await discoveryPhase.generateClarificationQuestions();
  
  console.log('\nClarification Questions:');
  questions.forEach((q, index) => {
    console.log(`${index + 1}. [${q.category}] ${q.question}`);
  });

  console.log('\nStep 2: Simulating user responses...');
  const responses = [
    {
      questionId: questions[0]?.id || 'q1',
      answer: 'Multi-user application with user accounts and authentication',
    },
    {
      questionId: questions[1]?.id || 'q2',
      answer: 'Tasks should have: title, description, due date, priority (low/medium/high), status (todo/in-progress/done), and tags',
    },
    {
      questionId: questions[2]?.id || 'q3',
      answer: 'Tasks organized in projects. Each user can have multiple projects, each project contains multiple tasks',
    },
  ];

  console.log('\nStep 3: Generating architecture specification...');
  const architectureSpec = await discoveryPhase.completeDiscoveryWithResponses(responses);

  console.log('\n=== GENERATED ARCHITECTURE SPECIFICATION ===\n');
  console.log(architectureSpec.fullMarkdown);

  console.log('\n\n=== SECTIONS SUMMARY ===');
  console.log(`Project Overview: ${architectureSpec.projectOverview.length} chars`);
  console.log(`User Stories: ${architectureSpec.userStories.length} chars`);
  console.log(`Domain Model: ${architectureSpec.domainModel.length} chars`);
  console.log(`Data Models: ${architectureSpec.dataModels.length} chars`);
  console.log(`API Contracts: ${architectureSpec.apiContracts.length} chars`);
  console.log(`Technical Constraints: ${architectureSpec.technicalConstraints.length} chars`);

  return architectureSpec;
}

export async function exampleStepByStepFlow() {
  const llmConfig: LLMConfig = {
    id: 'example-config',
    provider: 'openai',
    model: 'gpt-4',
    apiKey: process.env.OPENAI_API_KEY || '',
    isDefault: true,
  };

  const discoveryPhase = new DiscoveryPhase({
    userPrompt: 'Create an e-commerce website',
    appType: 'nextjs',
    llmConfig,
  });

  const discoveryResult = await discoveryPhase.runFullDiscovery();

  console.log('Questions generated:', discoveryResult.clarificationQuestions.length);

  return discoveryResult;
}
