import Anthropic from '@anthropic-ai/sdk';

export async function generateWithAnthropic(
  apiKey: string,
  model: string,
  prompt: string
): Promise<string> {
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = response.content[0];
  if (block.type === 'text') {
    return block.text;
  }

  throw new Error('Unexpected response format from Anthropic');
}
