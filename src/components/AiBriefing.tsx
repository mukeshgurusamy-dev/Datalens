import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  PieChart,
  CornerDownLeft,
  Bot,
  GitBranch,
  Cloud,
  Settings2,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import type { DatasetSchema } from '../types/dataset';
import { generateExecutiveInsights, type ExecutiveInsight } from '../engine/ai-insights';
import { answerNaturalLanguageQuery, type QueryResult } from '../engine/nl-query';
import { diagnoseRootCause } from '../engine/root-cause';
import { queryCloudflareAi, getCloudflareEndpoint, setCloudflareEndpoint } from '../engine/cloudflare-ai';

interface AiBriefingProps {
  schema: DatasetSchema;
}

export const AiBriefing: React.FC<AiBriefingProps> = ({ schema }) => {
  const [question, setQuestion] = useState('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [llmAnswer, setLlmAnswer] = useState<string | null>(null);
  const [llmSource, setLlmSource] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [cfUrl, setCfUrl] = useState(() => getCloudflareEndpoint());
  const [configSaved, setConfigSaved] = useState(false);

  // Derive executive insights reactively whenever active filtered schema changes
  const insights = useMemo(() => {
    return generateExecutiveInsights(schema);
  }, [schema]);

  // Derive causal root-cause diagnosis for anomalies — dynamically detect the best target
  const diagnosis = useMemo(() => {
    const statusCol = schema.columns.find(
      (c) => c.type === 'category' && /status|state|outcome|result/i.test(c.name)
    );
    if (!statusCol || !statusCol.topValues || statusCol.topValues.length === 0) return null;
    const riskValue =
      statusCol.topValues.find((v) => /declined|failed|refunded|rejected|error|cancelled/i.test(v.value)) ||
      statusCol.topValues[statusCol.topValues.length - 1];
    if (!riskValue) return null;
    return diagnoseRootCause(schema, statusCol.name, riskValue.value);
  }, [schema]);

  // Dynamic suggested questions
  const suggestedQuestions = useMemo(() => {
    return [
      'What is this dataset? Explain in detail',
      'What are the key business trends and risks?',
      'Who or what drives the largest volume or revenue?',
    ];
  }, []);

  const handleSaveEndpoint = (e: React.FormEvent) => {
    e.preventDefault();
    setCloudflareEndpoint(cfUrl);
    setConfigSaved(true);
    setTimeout(() => {
      setConfigSaved(false);
      setShowConfig(false);
    }, 1500);
  };

  const handleAsk = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) return;

    setIsAsking(true);
    setQuestion(q);
    setQueryResult(null);
    setLlmAnswer(null);
    setLlmSource(null);
    setErrorMessage(null);

    const activeEndpoint = getCloudflareEndpoint();

    // Check if the user is asking an open-ended explanation, analysis, or qualitative question
    const isQualitativeQuery =
      /explain|what is|understand|why|analyze|summary|summarize|tell me|recommend|insight/i.test(q) ||
      q.split(' ').length > 6;

    if (activeEndpoint && isQualitativeQuery) {
      try {
        const response = await queryCloudflareAi(q, schema, activeEndpoint);
        setLlmAnswer(response.answer);
        setLlmSource(response.source);
        setIsAsking(false);
        return;
      } catch (err: any) {
        console.warn('[Cloudflare AI Error, falling back to local math engine]:', err);
        // Fallback to local engine if network/worker issue, but notify user
        setErrorMessage(
          err.message || 'Could not reach Cloudflare Worker. Displaying local deterministic calculation.'
        );
      }
    }

    // If no Cloudflare endpoint configured or error occurs, run deterministic math calculation
    setTimeout(() => {
      const result = answerNaturalLanguageQuery(q, schema);
      setQueryResult(result);
      setIsAsking(false);
    }, 80);
  };

  const getImpactBadge = (insight: ExecutiveInsight) => {
    switch (insight.impact) {
      case 'high-priority':
        return 'bg-rose-500/10 border-rose-500/20 text-rose-400';
      case 'warning':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
      case 'positive':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      default:
        return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
    }
  };

  const getInsightIcon = (type: ExecutiveInsight['type']) => {
    switch (type) {
      case 'driver':
        return <PieChart className="w-4 h-4 text-blue-400 shrink-0" />;
      case 'distribution':
        return <TrendingUp className="w-4 h-4 text-purple-400 shrink-0" />;
      case 'trend':
        return <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'risk':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
    }
  };

  const isCloudflareConnected = Boolean(getCloudflareEndpoint());

  return (
    <div className="w-full bg-[#121215] border border-zinc-800/80 rounded-2xl p-5 mb-8 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-zinc-850">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 flex items-center justify-center">
            <Bot className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Executive AI Intelligence
              </h2>
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-300 font-mono">
                <Cloud className="w-3 h-3 text-orange-400" />
                {isCloudflareConnected ? 'Cloudflare Workers AI' : 'Local Deterministic Math'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Deep dataset explanation, causal root causes, and business reasoning across {schema.rowCount.toLocaleString()} records.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {diagnosis && (
            <button
              onClick={() => setShowDiagnosis(!showDiagnosis)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                showDiagnosis
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5 text-amber-400" />
              <span>{showDiagnosis ? 'Hide Root Cause' : 'Diagnose Root Cause'}</span>
            </button>
          )}

          <button
            onClick={() => setShowConfig(!showConfig)}
            title="Configure Cloudflare Workers AI Endpoint"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              showConfig || isCloudflareConnected
                ? 'bg-blue-600/10 border-blue-500/30 text-blue-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">
              {isCloudflareConnected ? 'Cloudflare Connected' : 'Connect Cloudflare AI'}
            </span>
          </button>
        </div>
      </div>

      {/* Cloudflare Connection Modal / Panel */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 rounded-xl bg-[#16161d] border border-blue-500/30 overflow-hidden"
          >
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-semibold text-white">
                  Cloudflare Workers AI Connection (Free / No API Key Required)
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">Meta LLaMA 3.1 8B</span>
            </div>

            <p className="text-xs text-zinc-300 mb-3 leading-relaxed">
              Connect your deployed Cloudflare Worker to ask open-ended questions like{' '}
              <strong className="text-white">"What is this dataset? Explain it to me"</strong>. Cloudflare Workers AI gives you 10,000 free neural requests daily with zero billing required!
            </p>

            <form onSubmit={handleSaveEndpoint} className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                placeholder="https://datalens-ai-backend.<your-subdomain>.workers.dev"
                value={cfUrl}
                onChange={(e) => setCfUrl(e.target.value)}
                className="flex-1 bg-[#0f0f13] border border-zinc-750 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
              >
                {configSaved ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <span>Connect Endpoint</span>
                )}
              </button>
            </form>

            <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
              <span>Code located in <code>cloudflare-ai-backend/</code> folder</span>
              <span className="text-zinc-400">Deploy via <code>npx wrangler deploy</code></span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Root-Cause Anomaly Diagnostic Panel */}
      <AnimatePresence>
        {showDiagnosis && diagnosis && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 overflow-hidden"
          >
            <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-amber-500/10">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-white">
                  Causal Attribution Diagnosis ({diagnosis.targetCondition})
                </span>
              </div>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                Entropy Decomposition
              </span>
            </div>

            <p className="text-xs text-zinc-300 mb-3 leading-relaxed">
              {diagnosis.executiveSummary}
            </p>

            {diagnosis.primaryDrivers.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {diagnosis.primaryDrivers.map((driver, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-zinc-400 font-medium">{driver.columnName}:</span>
                        <span className="text-amber-400 font-mono font-semibold">{driver.percentageOfTarget}% Impact</span>
                      </div>
                      <div className="text-xs font-bold text-white mb-1.5 truncate">
                        {driver.value}
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-500 line-clamp-2">
                      {driver.explanation}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4-Bento Insight Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {insights.map((insight, idx) => (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25, delay: idx * 0.05 }}
            className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/70 hover:border-zinc-700/80 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  {getInsightIcon(insight.type)}
                  <span className="text-[11px] font-semibold text-zinc-300 truncate max-w-[140px]">
                    {insight.title}
                  </span>
                </div>
                {insight.metric && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${getImpactBadge(insight)}`}>
                    {insight.metric}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                {insight.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Natural Language & LLM Query Bar */}
      <div className="pt-3 border-t border-zinc-850">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk(question);
          }}
          className="relative flex items-center"
        >
          <Sparkles className="w-4 h-4 text-purple-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder={
              isCloudflareConnected
                ? "Ask the AI anything (e.g. 'What is this dataset? Explain it', 'What are our biggest business risks?')..."
                : "Ask anything about the dataset (e.g. 'What is this dataset? Explain', 'Total amount for Amazon')..."
            }
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full bg-[#18181b] border border-zinc-800 focus:border-purple-500 rounded-xl pl-10 pr-28 py-2.5 text-xs text-zinc-200 placeholder-zinc-500 transition-colors focus:outline-none shadow-inner"
          />
          <button
            type="submit"
            disabled={!question.trim() || isAsking}
            className="absolute right-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-40 text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
          >
            {isAsking ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Thinking...</span>
              </>
            ) : (
              <>
                <span>Ask AI</span>
                <CornerDownLeft className="w-3 h-3" />
              </>
            )}
          </button>
        </form>

        {/* Suggested Chips */}
        {suggestedQuestions.length > 0 && !queryResult && !llmAnswer && (
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
              Try asking:
            </span>
            {suggestedQuestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleAsk(q)}
                className="text-[11px] px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Error message alert */}
        {errorMessage && (
          <div className="mt-2.5 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Real Cloudflare LLM Answer Card */}
        <AnimatePresence>
          {llmAnswer && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-3 p-5 rounded-xl bg-purple-950/20 border border-purple-500/30 text-xs text-zinc-200"
            >
              <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-purple-500/20">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-purple-300" />
                  </div>
                  <span className="font-semibold text-white tracking-tight">
                    Executive AI Deep Analysis
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                    {llmSource || 'Cloudflare Workers AI'}
                  </span>
                </div>
                <button
                  onClick={() => handleAsk(question)}
                  className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Re-analyze</span>
                </button>
              </div>

              <div className="whitespace-pre-line leading-relaxed space-y-2 text-zinc-300 text-xs font-sans">
                {llmAnswer}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Deterministic Local Calculation Card */}
        <AnimatePresence>
          {queryResult && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-3 p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                    Deterministic Calculation
                  </span>
                  <span className="text-xs text-zinc-400 font-medium italic">
                    "{question}"
                  </span>
                </div>
                <p className="text-xs text-zinc-200 font-medium">
                  {queryResult.answer}
                </p>

                {queryResult.supportingData && queryResult.supportingData.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3 mt-2 pt-2 border-t border-blue-500/10">
                    {queryResult.supportingData.map((d, i) => (
                      <span key={i} className="text-[10px] text-zinc-400">
                        {d.label}: <strong className="text-zinc-200 font-mono">{d.value}</strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {queryResult.metricValue && (
                <div className="shrink-0 text-right">
                  <div className="text-[10px] uppercase font-mono text-zinc-400">
                    {queryResult.metricLabel || 'Calculated Metric'}
                  </div>
                  <div className="text-xl font-bold font-mono text-blue-400">
                    {queryResult.metricValue}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
