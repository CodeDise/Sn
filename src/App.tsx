import React, { useEffect, useState } from 'react';
import type {
  BotState,
  KnowledgeBase,
  OrderRecord,
  ProductItem,
  SupportAccountSection,
} from './types.ts';
import { SimulatorView } from './components/SimulatorView.tsx';
import { AccountsAndKBView } from './components/AccountsAndKBView.tsx';
import { CatalogAndOrdersView } from './components/CatalogAndOrdersView.tsx';
import { AuditLogsView } from './components/AuditLogsView.tsx';
import { PythonDeployView } from './components/PythonDeployView.tsx';
import { generatePythonBotCode } from './utils/pythonGenerator.ts';

type ActiveTab = 'simulator' | 'accounts_kb' | 'catalog_orders' | 'logs' | 'python_deploy';

export default function App() {
  const [state, setState] = useState<BotState | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('simulator');
  const [selectedUserId, setSelectedUserId] = useState<string>('usr_arjun');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/state')
      .then((r) => r.json())
      .then((data: BotState) => {
        setState(data);
        if (data.conversations.length > 0) {
          setSelectedUserId(data.conversations[0].userId);
        }
      })
      .catch((err) => {
        console.error('Failed to load initial state:', err);
        setErrorBanner('Could not reach backend server. Please refresh.');
      });
  }, []);

  const handleSendMessage = async (userId: string, text: string) => {
    setIsSending(true);
    setErrorBanner(null);
    try {
      const resp = await fetch('/api/telegram/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, text }),
      });
      const data = await resp.json();
      if (data.state) {
        setState(data.state);
      }
      if (data.aiError) {
        setErrorBanner(`Gemini API note: ${data.aiError}`);
      }
    } catch (err: any) {
      setErrorBanner(err?.message || 'Network error while sending message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleTriggerAction = async (userId: string, action: string, payload?: string) => {
    setIsSending(true);
    try {
      const resp = await fetch('/api/telegram/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, payload }),
      });
      const updated = await resp.json();
      setState(updated);
    } finally {
      setIsSending(false);
    }
  };

  const handleOwnerReply = async (userId: string, text: string) => {
    const resp = await fetch('/api/conversations/owner-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, text }),
    });
    const updated = await resp.json();
    setState(updated);
  };

  const handleToggleHandover = async (
    userId: string,
    handoverToHuman: boolean,
    reason?: string
  ) => {
    const resp = await fetch('/api/conversations/handover-toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, handoverToHuman, reason }),
    });
    const updated = await resp.json();
    setState(updated);
  };

  const handleSwitchSection = async (userId: string, sectionId: string) => {
    const resp = await fetch('/api/conversations/section', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, sectionId }),
    });
    const updated = await resp.json();
    setState(updated);
  };

  const handleCreateUser = async (
    userName: string,
    userHandle: string,
    preferredLanguage: string,
    sectionId: string
  ) => {
    const resp = await fetch('/api/conversations/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName, userHandle, preferredLanguage, sectionId }),
    });
    const data = await resp.json();
    if (data.state) {
      setState(data.state);
      if (data.createdUserId) {
        setSelectedUserId(data.createdUserId);
      }
    }
  };

  const handleSaveSections = async (sections: SupportAccountSection[]) => {
    const resp = await fetch('/api/sections', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections }),
    });
    const updated = await resp.json();
    setState(updated);
  };

  const handleToggleSectionAI = async (sectionId: string) => {
    if (!state) return;
    const updatedSections = state.sections.map((s) =>
      s.id === sectionId ? { ...s, aiAutoReply: !s.aiAutoReply } : s
    );
    await handleSaveSections(updatedSections);
  };

  const handleSaveKnowledgeBase = async (knowledgeBase: KnowledgeBase) => {
    const resp = await fetch('/api/knowledge-base', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ knowledgeBase }),
    });
    const updated = await resp.json();
    setState(updated);
  };

  const handleSaveProducts = async (products: ProductItem[]) => {
    const resp = await fetch('/api/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products }),
    });
    const updated = await resp.json();
    setState(updated);
  };

  const handleUpsertOrder = async (order: OrderRecord) => {
    const resp = await fetch('/api/orders/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order }),
    });
    const updated = await resp.json();
    setState(updated);
  };

  const handleTriggerWebhook = async (gateway: 'oxapay' | 'fanpay', orderId: string) => {
    const resp = await fetch(`/api/webhooks/${gateway}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });
    const data = await resp.json();
    if (data.state) {
      setState(data.state);
    }
  };

  const handleMarkOrderPaid = async (orderId: string, status?: string) => {
    const resp = await fetch('/api/orders/mark-paid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status: status || 'Paid' }),
    });
    const updated = await resp.json();
    setState(updated);
  };

  const handleDownloadPythonBundle = () => {
    if (!state) return;
    const code = generatePythonBotCode(state);
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bot.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setActiveTab('python_deploy');
  };

  if (!state) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
          <div className="h-3 w-64 bg-slate-100 rounded animate-pulse" />
          <div className="h-24 w-full bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const escalatedCount = state.conversations.filter((c) => c.handoverToHuman).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 bg-white border-b border-slate-200 sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#simulator"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('simulator');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          TeleConcierge
        </a>

        {/* Zone 2: 5 clean single-line text navigation links */}
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'simulator'
                ? 'text-slate-900 underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Live Simulator
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('accounts_kb')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'accounts_kb'
                ? 'text-slate-900 underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Accounts & KB
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('catalog_orders')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'catalog_orders'
                ? 'text-slate-900 underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Catalog & Orders
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'logs'
                ? 'text-slate-900 underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Audit Logs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('python_deploy')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'python_deploy'
                ? 'text-slate-900 underline underline-offset-8 decoration-2'
                : ''
            }`}
          >
            Python Code & Deploy
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleDownloadPythonBundle}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            Export Python Bundle
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-6 space-y-6">
        {/* Contextual Workspace Header & Unboxed Metadata Summary */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 text-balance">
              {state.knowledgeBase.businessName} — AI Customer Support Telegram Bot
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1.5 font-mono tabular-nums">
              <span>Connected Sections: {state.sections.filter((s) => s.enabled).length}</span>
              <span aria-hidden="true">·</span>
              <span>Active Threads: {state.conversations.length}</span>
              <span aria-hidden="true">·</span>
              <span>Escalated for Human Review: {escalatedCount}</span>
              <span aria-hidden="true">·</span>
              <span>Orders Tracked: {state.orders.length} (OxaPay & FanPay)</span>
              <span aria-hidden="true">·</span>
              <span>Languages: English / Hindi / Hinglish Auto-Detect</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('python_deploy')}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              View Full bot.py & Setup Guide
            </button>
          </div>
        </div>

        {errorBanner && (
          <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
            <span>{errorBanner}</span>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="text-xs font-semibold underline ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {activeTab === 'simulator' && (
          <SimulatorView
            state={state}
            selectedUserId={selectedUserId}
            onSelectUser={setSelectedUserId}
            onSendMessage={handleSendMessage}
            onTriggerAction={handleTriggerAction}
            onOwnerReply={handleOwnerReply}
            onToggleHandover={handleToggleHandover}
            onSwitchSection={handleSwitchSection}
            onCreateUser={handleCreateUser}
            onMarkOrderPaid={handleMarkOrderPaid}
            onToggleSectionAI={handleToggleSectionAI}
            isSending={isSending}
          />
        )}

        {activeTab === 'accounts_kb' && (
          <AccountsAndKBView
            state={state}
            onSaveSections={handleSaveSections}
            onSaveKnowledgeBase={handleSaveKnowledgeBase}
          />
        )}

        {activeTab === 'catalog_orders' && (
          <CatalogAndOrdersView
            state={state}
            onSaveProducts={handleSaveProducts}
            onUpsertOrder={handleUpsertOrder}
            onTriggerWebhook={handleTriggerWebhook}
            onMarkOrderPaid={handleMarkOrderPaid}
          />
        )}

        {activeTab === 'logs' && <AuditLogsView state={state} />}

        {activeTab === 'python_deploy' && <PythonDeployView state={state} />}
      </main>
    </div>
  );
}
