/* eslint-disable no-console */
import { OpenAIProvider } from './OpenAIProvider';
import type { ChatMessage } from '@obsidian/core';

async function testOpenAIProvider() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('OPENAI_API_KEY environment variable not set. Skipping manual integration test.');
    process.exit(0);
  }

  console.log('Testing OpenAIProvider with real API calls...\n');

  const provider = new OpenAIProvider({
    apiKey,
    maxRetries: 2,
  });

  const messages: ChatMessage[] = [
    { role: 'user', content: 'Say "Hello, World!" and nothing else.' },
  ];

  console.log('Test 1: Basic chat request');
  try {
    const response = await provider.chat(messages);
    console.log('✓ Chat response:', response.content);
    console.log('  Usage:', response.usage);
    console.log('  Finish reason:', response.finishReason);
  } catch (error) {
    console.error('✗ Chat request failed:', error);
    process.exit(1);
  }

  console.log('\nTest 2: Streaming response');
  try {
    const chunks: string[] = [];
    for await (const chunk of provider.stream(messages)) {
      chunks.push(chunk);
      process.stdout.write(chunk);
    }
    console.log('\n✓ Streaming completed, received', chunks.length, 'chunks');
  } catch (error) {
    console.error('✗ Streaming failed:', error);
    process.exit(1);
  }

  console.log('\nTest 3: Custom model and options');
  try {
    const response = await provider.chat(messages, {
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 50,
    });
    console.log('✓ Custom options response:', response.content);
  } catch (error) {
    console.error('✗ Custom options request failed:', error);
    process.exit(1);
  }

  console.log('\n✓ All manual integration tests passed!');
}

testOpenAIProvider().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
