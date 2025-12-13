import OpenAI from 'openai';
import { Product } from '@prisma/client';
import { env } from '../config/env';
import { getQdrantClient } from '../lib/qdrant';

const openai = env.openaiApiKey ? new OpenAI({ apiKey: env.openaiApiKey }) : null;

export interface EnrichmentResult {
  title: string;
  description: string;
  keywords: string[];
  qAndA: Array<{ q: string; a: string }>;
  suggestedCategory: string;
}

export async function enrichProduct(product: Product): Promise<EnrichmentResult> {
  if (!openai) throw new Error('OpenAI not configured');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a product content specialist for e-commerce.
Output valid JSON with enhanced title/description/keywords/Q&A and category for ChatGPT shopping.`,
      },
      {
        role: 'user',
        content: buildPrompt(product),
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 1200,
  });

  const parsed = JSON.parse(completion.choices[0].message.content || '{}');
  return {
    title: parsed.enhanced_title || product.wooTitle,
    description: parsed.enhanced_description || product.wooDescription || '',
    keywords: parsed.keywords || [],
    qAndA: parsed.q_and_a || [],
    suggestedCategory: parsed.suggested_category || '',
  };
}

export async function storeEmbeddingInQdrant(productId: string, content: string) {
  const client = getQdrantClient();
  if (!client || !openai) return;
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: content,
  });
  const vector = embedding.data[0]?.embedding;
  if (!vector) return;
  await client.upsert('productsynch-products', {
    points: [
      {
        id: productId,
        vector,
        payload: { productId, content },
      },
    ],
  });
}

function buildPrompt(product: Product) {
  return `Enhance this product listing for ChatGPT shopping discovery:

ORIGINAL PRODUCT DATA:
- Title: ${product.wooTitle}
- Description: ${product.wooDescription || 'No description'}
- Price: ${product.wooPrice ?? 'N/A'}
- SKU: ${product.wooSku || 'None'}
- Categories: ${JSON.stringify(product.wooCategories)}
- Attributes: ${JSON.stringify(product.wooAttributes)}

Provide enhanced content in this JSON format:
{
  "enhanced_title": "Clear, descriptive title under 150 characters",
  "enhanced_description": "Compelling description under 5000 characters",
  "keywords": ["keyword1", "keyword2", "...up to 10"],
  "q_and_a": [
    {"q": "Customer question 1?", "a": "Helpful answer 1"},
    {"q": "Customer question 2?", "a": "Helpful answer 2"},
    {"q": "Customer question 3?", "a": "Helpful answer 3"}
  ],
  "suggested_category": "Main Category > Subcategory"
}`;
}
