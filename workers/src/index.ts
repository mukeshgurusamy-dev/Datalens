/**
 * DataLens Cloudflare Workers Backend
 * Features:
 * 1. Cloudflare Workers AI (@cf/meta/llama-3.1-8b-instruct)
 * 2. Cloudflare D1 SQLite Dashboard Permalinks (/api/dashboards)
 * 3. CORS-bypassing Proxy for Google Sheets / External CSVs (/api/proxy)
 */

export interface Env {
  AI: any;
  DB?: any; // Cloudflare D1 binding (optional)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // 1. CORS-bypassing External Data Proxy (for Google Sheets and raw CSVs)
    if (url.pathname === '/api/proxy' && request.method === 'GET') {
      const targetUrl = url.searchParams.get('url');
      if (!targetUrl) {
        return new Response(JSON.stringify({ error: 'Missing ?url= parameter' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        const upstream = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'DataLens-Engine/1.0',
          },
        });

        if (!upstream.ok) {
          return new Response(JSON.stringify({ error: `Upstream error ${upstream.status}` }), {
            status: upstream.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const data = await upstream.text();
        return new Response(data, {
          headers: {
            ...corsHeaders,
            'Content-Type': upstream.headers.get('Content-Type') || 'text/plain',
          },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message || 'Proxy fetch failed' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 2. Cloudflare D1 Dashboard Permalinks Storage
    if (url.pathname === '/api/dashboards') {
      if (request.method === 'POST') {
        try {
          const body: any = await request.json();
          const { slug, name, rowCount, columnCount, payload } = body;

          const id = crypto.randomUUID();
          const cleanSlug = slug || `dash-${id.slice(0, 8)}`;
          const now = Date.now();

          if (env.DB) {
            await env.DB.prepare(
              `INSERT INTO dashboards (id, slug, name, row_count, column_count, payload_json, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)`
            )
              .bind(id, cleanSlug, name, rowCount, columnCount, JSON.stringify(payload), now)
              .run();
          }

          return new Response(JSON.stringify({ success: true, id, slug: cleanSlug }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message || 'Failed to save dashboard' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // 3. Fetch Dashboard by Slug (/api/dashboards/:slug)
    if (url.pathname.startsWith('/api/dashboards/') && request.method === 'GET') {
      const slug = url.pathname.replace('/api/dashboards/', '');
      if (env.DB) {
        const record = await env.DB.prepare(
          'SELECT * FROM dashboards WHERE slug = ? OR id = ? LIMIT 1'
        )
          .bind(slug, slug)
          .first();

        if (record) {
          return new Response(JSON.stringify(JSON.parse(record.payload_json)), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      return new Response(JSON.stringify({ error: 'Dashboard not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Cloudflare Workers AI Executive Insights
    if (url.pathname === '/api/insights' && request.method === 'POST') {
      try {
        const body: any = await request.json();
        const { summary, question } = body;

        if (!summary) {
          return new Response(JSON.stringify({ error: 'Missing summary metadata' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const prompt = question
          ? `You are an elite Chief Data Officer. Answer this question concisely using only the following dataset statistics:\nStatistics:\n${JSON.stringify(summary, null, 2)}\n\nQuestion: ${question}\nConcise Business Answer:`
          : `You are an elite Chief Data Officer. Write 3 bullet executive takeaways from the following dataset statistics:\n${JSON.stringify(summary, null, 2)}\n\nExecutive Briefing:`;

        const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          prompt,
          max_tokens: 256,
          temperature: 0.2,
        });

        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message || 'Worker AI inference failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(
      JSON.stringify({
        status: 'online',
        service: 'DataLens Cloudflare Free Tier Edge Hub',
        routes: ['/api/insights', '/api/proxy', '/api/dashboards'],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  },
};
