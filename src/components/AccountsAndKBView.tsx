import React, { useState } from 'react';
import { Plus, Trash2, Save, Check } from 'lucide-react';
import type { BotState, KnowledgeBase, SupportAccountSection } from '../types.ts';

interface AccountsAndKBViewProps {
  state: BotState;
  onSaveSections: (sections: SupportAccountSection[]) => Promise<void>;
  onSaveKnowledgeBase: (kb: KnowledgeBase) => Promise<void>;
}

export const AccountsAndKBView: React.FC<AccountsAndKBViewProps> = ({
  state,
  onSaveSections,
  onSaveKnowledgeBase,
}) => {
  const [sections, setSections] = useState<SupportAccountSection[]>(state.sections);
  const [kb, setKb] = useState<KnowledgeBase>(state.knowledgeBase);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const [newSecLabel, setNewSecLabel] = useState('');
  const [newSecHandle, setNewSecHandle] = useState('');
  const [newSecApiId, setNewSecApiId] = useState('');
  const [newSecApiHash, setNewSecApiHash] = useState('');
  const [newSecPhone, setNewSecPhone] = useState('');

  const [newFaqQ, setNewFaqQ] = useState('');
  const [newFaqA, setNewFaqA] = useState('');

  const flashNotice = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 2500);
  };

  const handleToggleSectionField = async (
    id: string,
    field: 'enabled' | 'aiAutoReply'
  ) => {
    const updated = sections.map((s) =>
      s.id === id ? { ...s, [field]: !s[field] } : s
    );
    setSections(updated);
    await onSaveSections(updated);
    flashNotice('Support section configuration updated');
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSecLabel.trim() || !newSecApiId.trim()) return;
    const added: SupportAccountSection = {
      id: `sec_${Date.now()}`,
      label: newSecLabel.trim(),
      handle: newSecHandle.trim().startsWith('@')
        ? newSecHandle.trim()
        : `@${newSecHandle.trim() || 'SupportDesk'}`,
      apiId: newSecApiId.trim(),
      apiHash: newSecApiHash.trim() || 'e4b1c9a0d8f7e6b5c4a3d2f1a0b9c8d7',
      phoneOrSession: newSecPhone.trim() || '+1 (415) 000-0000 · custom_session.session',
      enabled: true,
      aiAutoReply: true,
      activeChatsCount: 0,
    };
    const updated = [...sections, added];
    setSections(updated);
    await onSaveSections(updated);
    setNewSecLabel('');
    setNewSecHandle('');
    setNewSecApiId('');
    setNewSecApiHash('');
    setNewSecPhone('');
    flashNotice(`Connected "${added.label}" Telegram account section`);
  };

  const handleRemoveSection = async (id: string) => {
    if (sections.length <= 1) return;
    const updated = sections.filter((s) => s.id !== id);
    setSections(updated);
    await onSaveSections(updated);
    flashNotice('Removed support section');
  };

  const handleSaveKB = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveKnowledgeBase(kb);
    flashNotice('Business Knowledge Base & Grounding Policies saved');
  };

  const handleAddFaq = async () => {
    if (!newFaqQ.trim() || !newFaqA.trim()) return;
    const updatedKb: KnowledgeBase = {
      ...kb,
      faqs: [
        ...kb.faqs,
        { id: `faq_${Date.now()}`, question: newFaqQ.trim(), answer: newFaqA.trim() },
      ],
    };
    setKb(updatedKb);
    await onSaveKnowledgeBase(updatedKb);
    setNewFaqQ('');
    setNewFaqA('');
    flashNotice('Added FAQ to grounding store');
  };

  const handleRemoveFaq = async (id: string) => {
    const updatedKb: KnowledgeBase = {
      ...kb,
      faqs: kb.faqs.filter((f) => f.id !== id),
    };
    setKb(updatedKb);
    await onSaveKnowledgeBase(updatedKb);
    flashNotice('Removed FAQ item');
  };

  return (
    <div className="space-y-8">
      {savedNotice && (
        <div className="px-4 py-3 bg-emerald-950 text-emerald-50 rounded-xl flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{savedNotice}</span>
          </div>
          <span className="font-mono text-[11px] text-emerald-300">Synced with Gemini & Python Exporter</span>
        </div>
      )}

      {/* SECTION 1: Account Connection (Owner/Admin Side) */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              01. Connected Telegram Support Accounts & Sections
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Connect multiple Telegram support accounts or channels via Pyrogram MTProto API ID, API Hash, and session/phone login. Each department can be individually enabled or have AI auto-replies toggled.
            </p>
          </div>
          <div className="text-xs text-slate-500 font-mono tabular-nums shrink-0">
            Active Sections: {sections.filter((s) => s.enabled).length} / {sections.length}
          </div>
        </div>

        {/* Connected Sections Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-3">Section Label & Handle</th>
                <th className="py-2.5 px-3">Telegram API ID</th>
                <th className="py-2.5 px-3">API Hash (MTProto)</th>
                <th className="py-2.5 px-3">Phone / Session String</th>
                <th className="py-2.5 px-3">Section Status</th>
                <th className="py-2.5 px-3">AI Auto-Reply</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {sections.map((sec) => (
                <tr key={sec.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900">{sec.label}</div>
                    <div className="text-[11px] font-mono text-slate-500">{sec.handle}</div>
                  </td>
                  <td className="py-3 px-3 font-mono tabular-nums text-slate-700">
                    {sec.apiId}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600">
                    {sec.apiHash.slice(0, 10)}...{sec.apiHash.slice(-4)}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600">{sec.phoneOrSession}</td>
                  <td className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => handleToggleSectionField(sec.id, 'enabled')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                        sec.enabled
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {sec.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </td>
                  <td className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => handleToggleSectionField(sec.id, 'aiAutoReply')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                        sec.aiAutoReply
                          ? 'bg-slate-900 text-white'
                          : 'bg-amber-50 text-amber-900 border border-amber-200'
                      }`}
                    >
                      {sec.aiAutoReply ? 'AI Active' : 'Manual Only'}
                    </button>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      disabled={sections.length <= 1}
                      onClick={() => handleRemoveSection(sec.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                      title="Remove Section"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add New Support Section Form */}
        <form
          onSubmit={handleAddSection}
          className="pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-6 gap-3 items-end"
        >
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Custom Section Label
            </label>
            <input
              type="text"
              placeholder="e.g. VIP Enterprise Desk"
              value={newSecLabel}
              onChange={(e) => setNewSecLabel(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Channel / Account Handle
            </label>
            <input
              type="text"
              placeholder="@AetherVIP_Support"
              value={newSecHandle}
              onChange={(e) => setNewSecHandle(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Telegram API ID
            </label>
            <input
              type="text"
              placeholder="28491205"
              value={newSecApiId}
              onChange={(e) => setNewSecApiId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Telegram API Hash
            </label>
            <input
              type="text"
              placeholder="a1b2c3d4e5f6..."
              value={newSecApiHash}
              onChange={(e) => setNewSecApiHash(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Phone / Pyrogram Session
            </label>
            <input
              type="text"
              placeholder="+1 415 890 4400"
              value={newSecPhone}
              onChange={(e) => setNewSecPhone(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
            />
          </div>
          <div>
            <button
              type="submit"
              className="w-full px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect Section</span>
            </button>
          </div>
        </form>
      </section>

      {/* SECTION 2: Business Information & Grounded Knowledge Base */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              02. Business Information & Grounded Knowledge Base
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Gemini grounds every customer reply strictly in the details below. If a customer asks about information not listed here, the bot politely states it is unsure and offers human escalation.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveKB}
            className="px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Knowledge Base</span>
          </button>
        </div>

        <form onSubmit={handleSaveKB} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Business Name
            </label>
            <input
              type="text"
              value={kb.businessName}
              onChange={(e) => setKb({ ...kb, businessName: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Working Hours & Timezone
            </label>
            <input
              type="text"
              value={kb.workingHours}
              onChange={(e) => setKb({ ...kb, workingHours: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Business Description & Core Offerings
            </label>
            <textarea
              rows={2}
              value={kb.description}
              onChange={(e) => setKb({ ...kb, description: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Refund & Return Policy
            </label>
            <textarea
              rows={3}
              value={kb.refundPolicy}
              onChange={(e) => setKb({ ...kb, refundPolicy: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Shipping & Fulfillment Policy
            </label>
            <textarea
              rows={3}
              value={kb.shippingPolicy}
              onChange={(e) => setKb({ ...kb, shippingPolicy: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Accepted Payment Methods & Safety Guidance
            </label>
            <textarea
              rows={3}
              value={kb.paymentMethodsInfo}
              onChange={(e) => setKb({ ...kb, paymentMethodsInfo: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Custom /start Welcome Message
            </label>
            <textarea
              rows={3}
              value={kb.welcomeMessage}
              onChange={(e) => setKb({ ...kb, welcomeMessage: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Escalation Contact Details
            </label>
            <input
              type="text"
              value={kb.contactDetails}
              onChange={(e) => setKb({ ...kb, contactDetails: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Default Gateway
              </label>
              <select
                value={kb.defaultGateway}
                onChange={(e) =>
                  setKb({
                    ...kb,
                    defaultGateway: e.target.value as 'OxaPay' | 'FanPay' | 'UserChoice',
                  })
                }
                className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
              >
                <option value="UserChoice">Let User Choose</option>
                <option value="OxaPay">OxaPay Default</option>
                <option value="FanPay">FanPay Default</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Rate Limit (Msgs)
              </label>
              <input
                type="number"
                min={2}
                max={50}
                value={kb.rateLimitMaxMessages}
                onChange={(e) =>
                  setKb({ ...kb, rateLimitMaxMessages: parseInt(e.target.value, 10) || 6 })
                }
                className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Window (Seconds)
              </label>
              <input
                type="number"
                min={5}
                max={300}
                value={kb.rateLimitWindowSeconds}
                onChange={(e) =>
                  setKb({ ...kb, rateLimitWindowSeconds: parseInt(e.target.value, 10) || 20 })
                }
                className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>
        </form>

        {/* Structured FAQs Section */}
        <div className="pt-6 border-t border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Structured Frequently Asked Questions ({kb.faqs.length})
            </h3>
            <span className="text-xs text-slate-500">
              Injected into Gemini system prompt for grounded Q&A
            </span>
          </div>

          <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
            {kb.faqs.map((faq) => (
              <div key={faq.id} className="p-3.5 flex items-start justify-between gap-4">
                <div className="space-y-1 text-xs">
                  <div className="font-semibold text-slate-900">Q: {faq.question}</div>
                  <div className="text-slate-600 leading-relaxed">A: {faq.answer}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveFaq(faq.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 transition-colors shrink-0"
                  title="Delete FAQ"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end pt-2">
            <div className="md:col-span-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                New FAQ Question
              </label>
              <input
                type="text"
                placeholder="e.g. Do you provide GST invoices for business orders?"
                value={newFaqQ}
                onChange={(e) => setNewFaqQ(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>
            <div className="md:col-span-6">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Official Grounded Answer
              </label>
              <input
                type="text"
                placeholder="e.g. Yes, all orders include an automated tax invoice upon payment confirmation."
                value={newFaqA}
                onChange={(e) => setNewFaqA(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={handleAddFaq}
                className="w-full px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add FAQ</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
