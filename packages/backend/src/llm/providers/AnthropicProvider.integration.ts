/* eslint-disable no-console */
import { AnthropicProvider } from './AnthropicProvider';
import type { ChatMessage } from '@obsidian/core';

async function testAnthropicProvider() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY environment variable not set. Skipping manual integration test.');
    process.exit(0);
  }

  console.log('Testing AnthropicProvider with real API calls...\n');

  const provider = new AnthropicProvider({
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

  console.log('\nTest 2: Chat request with system message');
  try {
    const messagesWithSystem: ChatMessage[] = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Say "Hello, World!" and nothing else.' },
    ];
    const response = await provider.chat(messagesWithSystem);
    console.log('✓ Chat with system message response:', response.content);
    console.log('  Usage:', response.usage);
  } catch (error) {
    console.error('✗ Chat with system message failed:', error);
    process.exit(1);
  }

  console.log('\nTest 3: Streaming response');
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

  console.log('\nTest 4: Custom model and options');
  try {
    const response = await provider.chat(messages, {
      model: 'claude-3-haiku-20240307',
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

testAnthropicProvider().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
