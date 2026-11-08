import React, { useState } from 'react';
import { Search, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { BotState } from '../types.ts';

interface AuditLogsViewProps {
  state: BotState;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ state }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [langFilter, setLangFilter] = useState('ALL');

  const uniqueLanguages = Array.from(
    new Set(state.logs.map((l) => l.language).filter(Boolean))
  );

  const filteredLogs = state.logs.filter((log) => {
    const matchesLang = langFilter === 'ALL' || log.language === langFilter;
    const matchesSearch =
      !searchTerm.trim() ||
      log.userQuery.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.botResponse.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userHandle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.queryType.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesLang && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Safety & Reliability Summary Row */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900">
            Safety, Flood Protection & Structured Audit Logs
          </h2>
          <p className="text-xs text-slate-500">
            Every incoming customer query, detected language, section route, and Gemini response is logged with timestamps for compliance and operator review.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600 shrink-0">
          <div>
            <div className="text-slate-400">Flood Limiter</div>
            <div className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
              {state.knowledgeBase.rateLimitMaxMessages} msgs / {state.knowledgeBase.rateLimitWindowSeconds}s per user
            </div>
          </div>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <div>
            <div className="text-slate-400">Recorded Interactions</div>
            <div className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
              {state.logs.length} entries
            </div>
          </div>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <div>
            <div className="text-slate-400">Escalated Events</div>
            <div className="font-mono font-semibold text-amber-800 tabular-nums mt-0.5">
              {state.logs.filter((l) => l.escalated).length} flagged
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search logs by user handle, query text, language, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            <button
              type="button"
              onClick={() => setLangFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                langFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Languages
            </button>
            {uniqueLanguages.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLangFilter(lang)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  langFilter === lang
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-3">Timestamp (UTC)</th>
                <th className="py-2.5 px-3">User & Section</th>
                <th className="py-2.5 px-3">Detected Language</th>
                <th className="py-2.5 px-3">Query Category</th>
                <th className="py-2.5 px-3">Incoming Query</th>
                <th className="py-2.5 px-3">Bot / Operator Response</th>
                <th className="py-2.5 px-3">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString([], {
                      month: 'short',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="font-mono font-semibold text-slate-900">{log.userHandle}</div>
                    <div className="text-[11px] text-slate-500">{log.sectionLabel}</div>
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-800 whitespace-nowrap">
                    {log.language}
                  </td>
                  <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                    {log.queryType}
                  </td>
                  <td className="py-3 px-3 text-slate-800 max-w-xs leading-relaxed">
                    {log.userQuery}
                  </td>
                  <td className="py-3 px-3 text-slate-600 max-w-sm leading-relaxed">
                    {log.botResponse}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    {log.escalated ? (
                      <span className="text-amber-800 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                        <span>Escalated</span>
                      </span>
                    ) : (
                      <span className="text-emerald-800 font-medium flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Auto-Resolved</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                    No audit log entries match your current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
