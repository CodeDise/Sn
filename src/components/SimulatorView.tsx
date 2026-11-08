import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  UserPlus,
  ShieldAlert,
  Bot,
  UserCheck,
  RefreshCw,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import type { BotState, ConversationThread, InlineButton } from '../types.ts';

interface SimulatorViewProps {
  state: BotState;
  selectedUserId: string;
  onSelectUser: (userId: string) => void;
  onSendMessage: (userId: string, text: string) => Promise<void>;
  onTriggerAction: (userId: string, action: string, payload?: string) => Promise<void>;
  onOwnerReply: (userId: string, text: string) => Promise<void>;
  onToggleHandover: (userId: string, handoverToHuman: boolean, reason?: string) => Promise<void>;
  onSwitchSection: (userId: string, sectionId: string) => Promise<void>;
  onCreateUser: (
    userName: string,
    userHandle: string,
    preferredLanguage: string,
    sectionId: string
  ) => Promise<void>;
  onMarkOrderPaid: (orderId: string, status?: string) => Promise<void>;
  onToggleSectionAI: (sectionId: string) => Promise<void>;
  isSending: boolean;
}

const WELCOME_BANNER_PATH = '/src/assets/images/telegram_welcome_banner_1794004745506.jpg';
const OPERATOR_AVATAR_PATH = '/src/assets/images/avatar_support_agent_1794004746320.jpg';

function renderFormattedText(raw: string) {
  const lines = raw.split('\n');
  return lines.map((line, lIdx) => {
    // Parse **bold** and `code`
    const tokens = line.split(/(\*\*.*?\*\*|`.*?`)/g);
    return (
      <React.Fragment key={lIdx}>
        {tokens.map((tok, tIdx) => {
          if (tok.startsWith('**') && tok.endsWith('**')) {
            return (
              <strong key={tIdx} className="font-semibold text-slate-900">
                {tok.slice(2, -2)}
              </strong>
            );
          }
          if (tok.startsWith('`') && tok.endsWith('`')) {
            return (
              <code
                key={tIdx}
                className="font-mono text-xs bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200 tabular-nums"
              >
                {tok.slice(1, -1)}
              </code>
            );
          }
          return <span key={tIdx}>{tok}</span>;
        })}
        {lIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

export const SimulatorView: React.FC<SimulatorViewProps> = ({
  state,
  selectedUserId,
  onSelectUser,
  onSendMessage,
  onTriggerAction,
  onOwnerReply,
  onToggleHandover,
  onSwitchSection,
  onCreateUser,
  onMarkOrderPaid,
  onToggleSectionAI,
  isSending,
}) => {
  const [messageInput, setMessageInput] = useState('');
  const [ownerInput, setOwnerInput] = useState('');
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserHandle, setNewUserHandle] = useState('');
  const [newUserLang, setNewUserLang] = useState('Hinglish');
  const [bannerError, setBannerError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [adminPreviewTab, setAdminPreviewTab] = useState<'overview' | 'orders' | 'sections'>('overview');

  const chatEndRef = useRef<HTMLDivElement>(null);

  const activeThread: ConversationThread =
    state.conversations.find((c) => c.userId === selectedUserId) || state.conversations[0];

  const activeSection =
    state.sections.find((s) => s.id === activeThread?.activeSectionId) || state.sections[0];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeThread?.messages.length, selectedUserId]);

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || isSending || !activeThread) return;
    const text = messageInput;
    setMessageInput('');
    await onSendMessage(activeThread.userId, text);
  };

  const handleOwnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerInput.trim() || !activeThread) return;
    const text = ownerInput;
    setOwnerInput('');
    await onOwnerReply(activeThread.userId, text);
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    await onCreateUser(
      newUserName.trim(),
      newUserHandle.trim() || newUserName.toLowerCase().replace(/\s+/g, '_'),
      newUserLang,
      state.sections[0]?.id || 'sec_sales'
    );
    setNewUserName('');
    setNewUserHandle('');
    setShowNewUserModal(false);
  };

  const escalatedCount = state.conversations.filter((c) => c.handoverToHuman).length;
  const paidOrdersCount = state.orders.filter((o) => o.status === 'Paid' || o.status === 'Fulfilled').length;
  const pendingOrdersCount = state.orders.filter((o) => o.status === 'Pending').length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* COLUMN 1: Customer Threads & Multilingual Presets (3 cols) */}
      <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Customer Sessions</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Per-user memory · Language auto-detect
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowNewUserModal(!showNewUserModal)}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>New User</span>
          </button>
        </div>

        {showNewUserModal && (
          <form
            onSubmit={handleCreateUserSubmit}
            className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5"
          >
            <div className="text-xs font-semibold text-slate-800">Add Simulated Telegram User</div>
            <input
              type="text"
              placeholder="Full Name (e.g. Priya Verma)"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-slate-900"
              required
            />
            <input
              type="text"
              placeholder="Telegram Handle (e.g. @priya_v)"
              value={newUserHandle}
              onChange={(e) => setNewUserHandle(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-slate-900"
            />
            <select
              value={newUserLang}
              onChange={(e) => setNewUserLang(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-slate-900"
            >
              <option value="Hinglish">Hinglish (Default Test)</option>
              <option value="Hindi">Hindi (देवनागरी)</option>
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
            </select>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowNewUserModal(false)}
                className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800"
              >
                Start Thread
              </button>
            </div>
          </form>
        )}

        <div className="space-y-1.5">
          {state.conversations.map((conv) => {
            const isSelected = conv.userId === activeThread?.userId;
            const sec = state.sections.find((s) => s.id === conv.activeSectionId);
            return (
              <button
                key={conv.userId}
                type="button"
                onClick={() => onSelectUser(conv.userId)}
                className={`w-full text-left p-3 rounded-lg transition-colors border ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold truncate">{conv.userName}</span>
                  <span
                    className={`text-[11px] font-mono tabular-nums ${
                      isSelected ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {conv.userHandle}
                  </span>
                </div>
                <div
                  className={`flex items-center gap-1.5 text-[11px] mt-1.5 ${
                    isSelected ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  <span>{conv.preferredLanguage}</span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{sec?.label || 'Sales Support'}</span>
                  {conv.handoverToHuman && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`font-medium ${
                          isSelected ? 'text-amber-300' : 'text-amber-700'
                        }`}
                      >
                        Human Mode
                      </span>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick Multi-Language & Flow Test Prompts */}
        <div className="pt-3 border-t border-slate-200 space-y-2">
          <div className="text-xs font-semibold text-slate-900">
            1-Click Multilingual & Flow Tests
          </div>
          <p className="text-xs text-slate-500">
            Send realistic queries to verify Gemini language matching, order lookup, and escalation:
          </p>
          <div className="space-y-1.5">
            <button
              type="button"
              disabled={isSending}
              onClick={() =>
                onSendMessage(
                  activeThread.userId,
                  'Bhai mujhe Aether Dedicated GPU Cluster Pass chahiye, iska price aur refund policy kya hai?'
                )
              }
              className="w-full text-left px-3 py-2 text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
            >
              <strong className="text-slate-900">Hinglish Query:</strong> Ask GPU Cluster pricing & refund policy
            </button>
            <button
              type="button"
              disabled={isSending}
              onClick={() =>
                onSendMessage(
                  activeThread.userId,
                  'नमस्ते, मेरे ऑर्डर ORD-84955 का स्टेटस क्या है और यह कब तक डिलीवर होगा?'
                )
              }
              className="w-full text-left px-3 py-2 text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
            >
              <strong className="text-slate-900">Hindi Query:</strong> Check Order ORD-84955 status & shipping
            </button>
            <button
              type="button"
              disabled={isSending}
              onClick={() =>
                onSendMessage(
                  activeThread.userId,
                  'What payment methods do you accept, and what are your working hours?'
                )
              }
              className="w-full text-left px-3 py-2 text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
            >
              <strong className="text-slate-900">English Query:</strong> Ask payment gateways & working hours
            </button>
            <button
              type="button"
              disabled={isSending}
              onClick={() =>
                onSendMessage(
                  activeThread.userId,
                  'I was charged twice for my order and my payment failed! I want an immediate refund and to speak to a human manager.'
                )
              }
              className="w-full text-left px-3 py-2 text-xs text-amber-900 bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200 rounded-lg transition-colors"
            >
              <strong className="text-amber-950">Dispute Escalation Test:</strong> Trigger automatic Human Handover
            </button>
          </div>
        </div>
      </div>

      {/* COLUMN 2: Live Interactive Telegram Bot Simulator (5 cols) */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl flex flex-col h-[740px] overflow-hidden">
        {/* Telegram Chat Header */}
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-700 shrink-0 flex items-center justify-center border border-slate-600">
              {!avatarError ? (
                <img
                  src={OPERATOR_AVATAR_PATH}
                  alt="Telegram Bot Profile Avatar"
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Bot className="w-4 h-4 text-slate-200" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">
                {state.knowledgeBase.businessName}
              </div>
              <div className="text-xs text-slate-300 flex items-center gap-1.5 truncate">
                <span>{activeSection?.label}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{activeSection?.handle}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <select
              aria-label="Active Support Section"
              value={activeThread?.activeSectionId || ''}
              onChange={(e) => onSwitchSection(activeThread.userId, e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-800 text-slate-100 border border-slate-700 rounded-lg focus:outline-none"
            >
              {state.sections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.label} {!sec.enabled ? '(Disabled)' : !sec.aiAutoReply ? '(AI Off)' : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onTriggerAction(activeThread.userId, 'start')}
              className="px-2.5 py-1.5 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
              title="Send /start command"
            >
              /start
            </button>
          </div>
        </div>

        {/* Handover Status Banner inside Simulator if Paused for Human */}
        {activeThread?.handoverToHuman && (
          <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs text-amber-900 min-w-0">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
              <span className="truncate">
                <strong>Human Handover Active:</strong> AI auto-replies paused ({activeThread.escalationReason || 'Operator intervention'})
              </span>
            </div>
            <button
              type="button"
              onClick={() => onToggleHandover(activeThread.userId, false)}
              className="px-2.5 py-1 text-xs font-medium bg-amber-900 text-white rounded-md hover:bg-amber-800 transition-colors whitespace-nowrap shrink-0"
            >
              Hand Back to AI
            </button>
          </div>
        )}

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-100/70">
          {activeThread?.messages.map((msg) => {
            if (msg.sender === 'system') {
              return (
                <div
                  key={msg.id}
                  className="mx-auto max-w-md text-center px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-600"
                >
                  {renderFormattedText(msg.text)}
                </div>
              );
            }

            const isUser = msg.sender === 'user';
            const isOwner = msg.sender === 'owner';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-xl overflow-hidden border ${
                    isUser
                      ? 'bg-slate-900 text-white border-slate-900'
                      : isOwner
                      ? 'bg-emerald-950 text-emerald-50 border-emerald-800'
                      : 'bg-white text-slate-800 border-slate-200'
                  }`}
                >
                  {/* Custom Welcome Banner on /start messages */}
                  {msg.isBanner && (
                    <div className="relative h-36 w-full bg-slate-900 overflow-hidden border-b border-slate-200">
                      {!bannerError ? (
                        <img
                          src={WELCOME_BANNER_PATH}
                          alt="Welcome Concierge Banner"
                          referrerPolicy="no-referrer"
                          onError={() => setBannerError(true)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-300 text-xs font-medium">
                          {state.knowledgeBase.businessName} — Concierge Desk
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end p-3">
                        <div className="text-white">
                          <div className="text-xs font-medium text-slate-200">
                            Official Verified Telegram Support Bot
                          </div>
                          <div className="text-sm font-semibold">
                            {state.knowledgeBase.businessName}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-3.5 text-xs leading-relaxed">
                    {/* Sender metadata line for Bot / Human Owner */}
                    {!isUser && (
                      <div
                        className={`flex items-center gap-1.5 text-[11px] mb-1.5 pb-1.5 border-b ${
                          isOwner
                            ? 'text-emerald-300 border-emerald-800/60'
                            : 'text-slate-500 border-slate-100'
                        }`}
                      >
                        <span className="font-semibold">
                          {isOwner ? 'Human Support Specialist (Owner)' : 'Gemini Support Bot'}
                        </span>
                        {msg.sectionLabel && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{msg.sectionLabel}</span>
                          </>
                        )}
                        {msg.detectedLanguage && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>Lang: {msg.detectedLanguage}</span>
                          </>
                        )}
                      </div>
                    )}

                    <div className={isUser ? 'text-white' : isOwner ? 'text-emerald-50' : 'text-slate-800'}>
                      {renderFormattedText(msg.text)}
                    </div>

                    <div
                      className={`mt-2 text-[10px] font-mono tabular-nums text-right ${
                        isUser
                          ? 'text-slate-300'
                          : isOwner
                          ? 'text-emerald-300'
                          : 'text-slate-400'
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </div>
                  </div>
                </div>

                {/* Telegram Inline Keyboard Buttons */}
                {msg.inlineButtons && msg.inlineButtons.length > 0 && (
                  <div className="mt-1.5 w-full max-w-[88%] space-y-1">
                    {msg.inlineButtons.map((row: InlineButton[], rIdx: number) => (
                      <div key={rIdx} className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {row.map((btn: InlineButton, bIdx: number) => (
                          <button
                            key={bIdx}
                            type="button"
                            disabled={isSending}
                            onClick={() => onTriggerAction(activeThread.userId, btn.action, btn.payload)}
                            className={`px-3 py-2 text-xs font-medium bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-lg transition-colors text-center truncate ${
                              row.length === 1 ? 'sm:col-span-2' : ''
                            }`}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {isSending && (
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-2 w-fit">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-700" />
              <span>Gemini AI is analyzing knowledge base & generating reply...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Telegram Quick Command Bar & Message Input */}
        <div className="p-3 bg-white border-t border-slate-200 space-y-2 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => onTriggerAction(activeThread.userId, 'catalog')}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              🛒 Browse Catalog
            </button>
            <button
              type="button"
              onClick={() => onTriggerAction(activeThread.userId, 'orders')}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              📦 Check Order Status
            </button>
            <button
              type="button"
              onClick={() => onTriggerAction(activeThread.userId, 'policies')}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              📋 Refund & Shipping
            </button>
            <button
              type="button"
              onClick={() => onTriggerAction(activeThread.userId, 'handover')}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              👤 Request Human
            </button>
          </div>

          <form onSubmit={handleUserSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder={
                activeThread?.checkoutDraft?.step === 'shipping'
                  ? 'Type your shipping address, email & phone for Step 2...'
                  : `Message as ${activeThread?.userName} (English, Hindi, Hinglish)...`
              }
              className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white"
            />
            <button
              type="submit"
              disabled={isSending || !messageInput.trim()}
              className="px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>

      {/* COLUMN 3: Human Handover Console & Telegram /admin Inline Bot Preview (4 cols) */}
      <div className="lg:col-span-4 space-y-6">
        {/* Owner Manual Intervention & Handover Box */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Human Handover & Operator Desk
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Replying manually pauses AI auto-replies for {activeThread?.userName}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onToggleHandover(
                  activeThread.userId,
                  !activeThread.handoverToHuman,
                  'Manual operator toggle'
                )
              }
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeThread?.handoverToHuman
                  ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                  : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
              }`}
            >
              {activeThread?.handoverToHuman ? 'Resume Gemini AI' : 'Pause AI & Take Over'}
            </button>
          </div>

          <div className="text-xs text-slate-600 flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2">
              {activeThread?.handoverToHuman ? (
                <UserCheck className="w-4 h-4 text-amber-700 shrink-0" />
              ) : (
                <Bot className="w-4 h-4 text-emerald-700 shrink-0" />
              )}
              <span>
                Mode:{' '}
                <strong className="text-slate-900">
                  {activeThread?.handoverToHuman
                    ? 'Human Operator Active (AI Paused)'
                    : 'Gemini Automated Reply Active'}
                </strong>
              </span>
            </div>
            <span className="font-mono text-[11px] text-slate-500 tabular-nums">
              {activeThread?.userHandle}
            </span>
          </div>

          <form onSubmit={handleOwnerSubmit} className="space-y-2.5">
            <label className="block text-xs font-medium text-slate-700">
              Jump into conversation as Support Owner (auto-pauses AI):
            </label>
            <textarea
              rows={2}
              value={ownerInput}
              onChange={(e) => setOwnerInput(e.target.value)}
              placeholder={`Write a direct human operator reply to ${activeThread?.userName}...`}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500">
                Bot command equivalent: <code className="font-mono">/reply {activeThread?.userId}</code>
              </span>
              <button
                type="submit"
                disabled={!ownerInput.trim()}
                className="px-3.5 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
              >
                Send Manual Operator Reply
              </button>
            </div>
          </form>
        </div>

        {/* Telegram Inline Admin Dashboard (/admin) Simulator */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-700" />
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Telegram <code className="font-mono text-xs">/admin</code> Inline Menu
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Interactive owner dashboard inside Telegram chat
                </p>
              </div>
            </div>
          </div>

          {/* Admin Inline Message Box */}
          <div className="bg-slate-900 text-slate-100 rounded-xl p-4 space-y-3 text-xs">
            <div className="font-semibold text-white pb-2 border-b border-slate-800 flex items-center justify-between">
              <span>🛡️ TeleConcierge Admin Dashboard</span>
              <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                /admin · Live
              </span>
            </div>

            {adminPreviewTab === 'overview' && (
              <div className="space-y-2 text-slate-300">
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 bg-slate-800/90 rounded-lg">
                    <div className="text-[11px] text-slate-400">Total Conversations</div>
                    <div className="text-base font-semibold text-white font-mono tabular-nums mt-0.5">
                      {state.conversations.length}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-800/90 rounded-lg">
                    <div className="text-[11px] text-slate-400">Escalated / Human</div>
                    <div className="text-base font-semibold text-amber-400 font-mono tabular-nums mt-0.5">
                      {escalatedCount}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-800/90 rounded-lg">
                    <div className="text-[11px] text-slate-400">Paid / Fulfilled Orders</div>
                    <div className="text-base font-semibold text-emerald-400 font-mono tabular-nums mt-0.5">
                      {paidOrdersCount}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-800/90 rounded-lg">
                    <div className="text-[11px] text-slate-400">Pending Payment</div>
                    <div className="text-base font-semibold text-white font-mono tabular-nums mt-0.5">
                      {pendingOrdersCount}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {adminPreviewTab === 'orders' && (
              <div className="space-y-2">
                <div className="text-[11px] text-slate-400">
                  Tap any Pending order to simulate webhook / manual Paid confirmation:
                </div>
                {state.orders.slice(0, 4).map((ord) => (
                  <div
                    key={ord.orderId}
                    className="p-2.5 bg-slate-800 rounded-lg flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-mono font-semibold text-white text-xs tabular-nums">
                        {ord.orderId} · ${ord.amount} ({ord.gateway})
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {ord.userName} · Status: <strong className="text-slate-200">{ord.status}</strong>
                      </div>
                    </div>
                    {ord.status !== 'Paid' ? (
                      <button
                        type="button"
                        onClick={() => onMarkOrderPaid(ord.orderId, 'Paid')}
                        className="px-2.5 py-1 text-[11px] font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors whitespace-nowrap shrink-0"
                      >
                        Mark Paid
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-400 font-mono flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Paid
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {adminPreviewTab === 'sections' && (
              <div className="space-y-2">
                <div className="text-[11px] text-slate-400">
                  Toggle Gemini Auto-Reply per connected support section:
                </div>
                {state.sections.map((sec) => (
                  <div
                    key={sec.id}
                    className="p-2.5 bg-slate-800 rounded-lg flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-white truncate">{sec.label}</div>
                      <div className="text-[11px] font-mono text-slate-400 truncate">
                        {sec.handle}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleSectionAI(sec.id)}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                        sec.aiAutoReply
                          ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      AI Reply: {sec.aiAutoReply ? 'ON' : 'OFF'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Simulated Inline Keyboard inside /admin */}
            <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setAdminPreviewTab('overview')}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  adminPreviewTab === 'overview'
                    ? 'bg-white text-slate-900'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                📊 Stats
              </button>
              <button
                type="button"
                onClick={() => setAdminPreviewTab('orders')}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  adminPreviewTab === 'orders'
                    ? 'bg-white text-slate-900'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                📦 Orders ({state.orders.length})
              </button>
              <button
                type="button"
                onClick={() => setAdminPreviewTab('sections')}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                  adminPreviewTab === 'sections'
                    ? 'bg-white text-slate-900'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                🤖 AI Toggles
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
