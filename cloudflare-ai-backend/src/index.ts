export interface Env {
  AI: any;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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
          model: '@cf/meta/llama-3.1-8b-instruct',
        }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    if (request.method !== 'POST' || url.pathname !== '/api/chat') {
      return new Response(JSON.stringify({ error: 'Endpoint not found. Use POST /api/chat' }), {
        status: 404,
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

      // Format full comprehensive dataset view for LLaMA 3.1
      const contextPrompt = `
You are the Lead Executive Data Scientist & BI Analyst for "DataLens".
Your job is to deeply inspect, analyze, and explain datasets to business leaders, founders, and analysts.
The user expects real analytical intelligence, domain understanding, pattern detection, and crisp explanations.

==================================================
DATASET PROFILE:
==================================================
- Name: "${datasetPayload.name || 'User Dataset'}"
- Total Rows: ${datasetPayload.totalRows.toLocaleString()}
- Total Columns: ${datasetPayload.totalColumns}
- Feed Coverage: ${datasetPayload.isCompleteRowFeed ? 'Full Complete Dataset (All rows provided below)' : 'Representative Multi-Slice Sample & Full Statistical Frequencies'}

==================================================
EXHAUSTIVE COLUMN ARCHITECTURE & STATS:
==================================================
${datasetPayload.columns
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
ACTUAL DATA RECORDS (${datasetPayload.records.length} records provided):
==================================================
${JSON.stringify(datasetPayload.records, null, 2)}

==================================================
USER QUESTION / INQUIRY:
==================================================
"${question}"

==================================================
ANALYSIS GUIDELINES:
==================================================
1. If the user asks "what is this dataset explain", "explain this dataset", or general exploration:
   - **Executive Overview**: Explain what this data actually represents in plain, boardroom-ready language (e.g. B2B SaaS revenue, e-commerce transactions, HR compensation, logistics tracking).
   - **Core Metrics & Scale**: Summarize the primary volume, monetary values, and time period covered.
   - **Key Trends & Concentration**: Point out who or what drives the largest volume or revenue (dominant categories, top performers).
   - **Risks, Anomalies & Bottlenecks**: Identify any concerning patterns (e.g., failure/decline spikes, outliers, missing records, high churn).
   - **Actionable Recommendations**: Provide 2-3 strategic takeaways on what the business should do next.
2. For specific questions (e.g. comparing segments, asking why numbers drop):
   - Directly answer the question using the exact facts and figures from the data above.
   - Provide supporting context and explain *why* the data looks like that.
3. Structure your response using clean Markdown with clear headings and bullet points.
`.trim();

      const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
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
        temperature: 0.2,
      });

      return new Response(
        JSON.stringify({
          answer: aiResponse.response || 'No response generated from AI.',
          source: 'Cloudflare Workers AI (@cf/meta/llama-3.1-8b-instruct)',
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
