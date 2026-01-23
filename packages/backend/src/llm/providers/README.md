# LLM Providers

This directory contains implementations of LLM provider integrations.

## OpenAIProvider

Implementation of the OpenAI API integration with streaming support, error handling, and retry logic.

### Features

- **Chat API**: Send messages and receive responses
- **Streaming**: Real-time streaming of responses
- **Error Handling**: Comprehensive error mapping for different API errors
- **Retry Logic**: Automatic retry with exponential backoff for transient errors
- **Rate Limiting**: Respects rate limit headers and implements backoff

### Manual Integration Testing

Due to CommonJS/ESM compatibility issues with the OpenAI SDK in the Vitest environment, unit tests with mocked API calls are provided in `OpenAIProvider.test.skip.ts`. For verification, use the manual integration test:

```bash
# Set your OpenAI API key
export OPENAI_API_KEY=sk-...

# Run the integration test
npx tsx src/llm/providers/OpenAIProvider.integration.ts
```

The integration test will:
1. Test basic chat request
2. Test streaming response
3. Test custom model and options

### Usage Example

```typescript
import { OpenAIProvider } from './providers/OpenAIProvider';

const provider = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY!,
  maxRetries: 3,
  timeout: 60000,
});

// Chat request
const response = await provider.chat([
  { role: 'user', content: 'Hello!' },
]);
console.log(response.content);

// Streaming request
for await (const chunk of provider.stream([
  { role: 'user', content: 'Tell me a story' },
])) {
  process.stdout.write(chunk);
}
```

### Error Handling

The provider maps OpenAI API errors to specific error types:

- **401**: `AuthenticationError` - Invalid API key
- **400**: `InvalidRequestError` - Malformed request
- **404**: `ModelNotFoundError` - Model not available
- **429**: `RateLimitError` - Rate limit exceeded (with retry)
- **503**: `ServiceUnavailableError` - Service temporarily unavailable (with retry)
- **Timeout**: `TimeoutError` - Request timeout

Non-retryable errors (401, 400, 404) fail immediately. Retryable errors (429, 503, timeouts) retry up to `maxRetries` times with exponential backoff.
