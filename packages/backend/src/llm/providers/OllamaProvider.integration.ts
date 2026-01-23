/* eslint-disable no-console */
import { OllamaProvider } from './OllamaProvider';
import type { ChatMessage } from '@obsidian/core';

async function testOllamaProvider() {
  const endpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'llama3';

  console.log(`Testing OllamaProvider with endpoint: ${endpoint}\n`);
  console.log('NOTE: This test requires Ollama to be running locally.');
  console.log('Install and start Ollama from https://ollama.ai\n');

  const provider = new OllamaProvider({
    baseURL: endpoint,
    defaultModel: model,
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
  } catch (error: any) {
    if (error.message?.includes('Cannot connect to Ollama server')) {
      console.log('⚠ Ollama server not running. Skipping manual integration test.');
      console.log('  To run this test, start Ollama with: ollama serve');
      console.log(`  Then run: ollama pull ${model}`);
      process.exit(0);
    }
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
      model: model,
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

testOllamaProvider().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
