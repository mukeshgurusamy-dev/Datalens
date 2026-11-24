export interface Env {
  AI: any;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Cloudflare active models in order of capability and speed
const ACTIVE_MODELS = [
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/meta/llama-3.1-70b-instruct',
  '@cf/meta/llama-3.2-1b-instruct',
];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'DataLens Cloudflare Workers AI Engine',
          activeModel: ACTIVE_MODELS[0],
        }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    try {
      const body = (await request.json()) as {
        question: string;
        datasetPayload: {
          name: string;
          totalRows: number;
          totalColumns: number;
          isCompleteRowFeed: boolean;
          columns: Array<{
            name: string;
            type: string;
            uniqueCount: number;
            missingCount: number;
            min?: number;
            max?: number;
            mean?: number;
            sum?: number;
            topFrequencies: Array<{ value: string; count: number }>;
          }>;
          records: Record<string, any>[];
        };
      };

      const { question, datasetPayload } = body;

      if (!question) {
        return new Response(JSON.stringify({ error: 'Missing question' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      const contextPrompt = `
You are the Lead Executive Data Scientist & BI Analyst for "DataLens".
Your job is to deeply inspect, analyze, and explain datasets to business leaders, founders, and analysts.

==================================================
DATASET PROFILE:
==================================================
- Name: "${datasetPayload.name || 'User Dataset'}"
- Total Rows: ${datasetPayload.totalRows || 'N/A'}
- Total Columns: ${datasetPayload.totalColumns || 'N/A'}

==================================================
COLUMN ARCHITECTURE & STATS:
==================================================
${(datasetPayload.columns || [])
  .map((col) => {
    let stat = `• Column: "${col.name}" [Type: ${col.type}, Unique: ${col.uniqueCount}, Missing: ${col.missingCount}]`;
    if (col.mean !== undefined) {
      stat += `\n  - Math Stats: Mean = ${col.mean.toFixed(2)}, Min = ${col.min}, Max = ${col.max}${col.sum !== undefined ? `, Sum = ${col.sum.toLocaleString()}` : ''}`;
    }
    if (col.topFrequencies && col.topFrequencies.length > 0) {
      stat += `\n  - Category Frequency: ${col.topFrequencies.map((f) => `"${f.value}": ${f.count} rows`).join(' | ')}`;
    }
    return stat;
  })
  .join('\n\n')}

==================================================
ACTUAL DATA RECORDS SAMPLE:
==================================================
${JSON.stringify((datasetPayload.records || []).slice(0, 30), null, 2)}

==================================================
USER QUESTION:
==================================================
"${question}"

==================================================
ANALYSIS GUIDELINES:
==================================================
1. If the user asks "what is this dataset explain", "explain this dataset", or general exploration:
   - **Executive Overview**: Explain what this data actually represents in plain, boardroom-ready language (e.g. B2B SaaS revenue, e-commerce transactions, HR compensation).
   - **Core Metrics & Scale**: Summarize the primary volume, monetary values, and time period covered.
   - **Key Trends & Concentration**: Point out who or what drives the largest volume or revenue (dominant categories, top performers).
   - **Risks, Anomalies & Bottlenecks**: Identify any concerning patterns (e.g., failure/decline spikes, outliers, missing records, high churn).
   - **Actionable Recommendations**: Provide 2-3 strategic takeaways on what the business should do next.
2. For specific questions (e.g. comparing segments, asking why numbers drop):
   - Directly answer the question using the exact facts and figures from the data above.
   - Explain why the data behaves that way.
3. Structure your response using clean Markdown with clear headings and bullet points.
`.trim();

      let lastError: any = null;
      let aiResponse: any = null;
      let usedModel = ACTIVE_MODELS[0];

      // Try active models in order
      for (const model of ACTIVE_MODELS) {
        try {
          aiResponse = await env.AI.run(model, {
            messages: [
              {
                role: 'system',
                content:
                  'You are a senior executive data scientist. Give deep, insightful, articulate, high-value explanations of datasets without fluff.',
              },
              {
                role: 'user',
                content: contextPrompt,
              },
            ],
            max_tokens: 1500,
          });
          usedModel = model;
          break;
        } catch (err: any) {
          lastError = err;
          console.warn(`Model ${model} failed, trying fallback:`, err.message);
        }
      }

      if (!aiResponse) {
        throw lastError || new Error('All AI models failed to respond.');
      }

      return new Response(
        JSON.stringify({
          answer: aiResponse.response || 'No response generated from AI.',
          source: `Cloudflare Workers AI (${usedModel})`,
          timestamp: Date.now(),
        }),
        {
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (err: any) {
      return new Response(
        JSON.stringify({
          error: err.message || 'Error executing AI model on Cloudflare',
        }),
        {
          status: 500,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json',
          },
        }
      );
    }
  },
};
