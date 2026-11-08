import React, { useState } from 'react';
import { Copy, Check, Download, FileCode, Server, Terminal } from 'lucide-react';
import type { BotState } from '../types.ts';
import {
  generatePythonBotCode,
  generateRequirementsTxt,
  generateEnvExample,
} from '../utils/pythonGenerator.ts';

interface PythonDeployViewProps {
  state: BotState;
}

export const PythonDeployView: React.FC<PythonDeployViewProps> = ({ state }) => {
  const [activeFile, setActiveFile] = useState<'bot.py' | 'requirements.txt' | '.env.example' | 'deploy_guide'>('bot.py');
  const [copied, setCopied] = useState(false);

  const pythonCode = generatePythonBotCode(state);
  const requirementsTxt = generateRequirementsTxt();
  const envExample = generateEnvExample();

  const currentContent =
    activeFile === 'bot.py'
      ? pythonCode
      : activeFile === 'requirements.txt'
      ? requirementsTxt
      : envExample;

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-3xl">
          <h2 className="text-lg font-semibold text-slate-900">
            Production Python Source Code & Render / Railway Deployment Guide
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            This complete Python codebase (<code className="font-mono">bot.py</code>, <code className="font-mono">requirements.txt</code>, and <code className="font-mono">.env.example</code>) is dynamically generated with your live Knowledge Base, connected Support Sections, and Product Catalog. It includes clear placeholder fields for <code className="font-mono text-slate-800">OXAPAY_MERCHANT_API_KEY</code>, <code className="font-mono text-slate-800">FANPAY_API_KEY</code>, <code className="font-mono text-slate-800">GEMINI_API_KEY</code>, and <code className="font-mono text-slate-800">TELEGRAM_BOT_TOKEN</code>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => handleDownloadFile('bot.py', pythonCode)}
            className="px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download bot.py</span>
          </button>
          <button
            type="button"
            onClick={() => handleDownloadFile('requirements.txt', requirementsTxt)}
            className="px-3.5 py-2 text-xs font-medium bg-slate-100 text-slate-800 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>requirements.txt</span>
          </button>
        </div>
      </div>

      {/* File Selector Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveFile('bot.py')}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeFile === 'bot.py'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>bot.py (Full Working Code)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFile('requirements.txt')}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap ${
                activeFile === 'requirements.txt'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              requirements.txt
            </button>
            <button
              type="button"
              onClick={() => setActiveFile('.env.example')}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap ${
                activeFile === '.env.example'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              .env.example (API Keys)
            </button>
            <button
              type="button"
              onClick={() => setActiveFile('deploy_guide')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeFile === 'deploy_guide'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Render & Railway Setup Guide</span>
            </button>
          </div>

          {activeFile !== 'deploy_guide' && (
            <button
              type="button"
              onClick={() => handleCopy(currentContent)}
              className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy {activeFile}</span>
                </>
              )}
            </button>
          )}
        </div>

        {activeFile !== 'deploy_guide' ? (
          <pre className="p-5 bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed max-h-[680px]">
            <code>{currentContent}</code>
          </pre>
        ) : (
          <div className="p-6 space-y-8 text-xs leading-relaxed text-slate-700">
            {/* Step 1: API Keys & Placeholders */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-slate-900">
                01. Where to Insert Your API Keys & Merchant Credentials
              </h3>
              <p>
                In <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">bot.py</code> (lines 48–64), all credentials are loaded via environment variables so your keys stay secure when pushing to GitHub for Render or Railway:
              </p>
              <div className="bg-slate-950 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto">
{`# 1. Telegram Bot Token (Get from @BotFather on Telegram)
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "YOUR_TELEGRAM_BOT_TOKEN_HERE")

# 2. Your Personal Telegram User ID (Get from @userinfobot — gives you access to /admin and /reply)
OWNER_TELEGRAM_ID = int(os.getenv("OWNER_TELEGRAM_ID", "123456789"))

# 3. Google Gemini API Key (Get from https://aistudio.google.com/apikey)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY_HERE")

# 4. OxaPay & FanPay Merchant Credentials
OXAPAY_MERCHANT_API_KEY = os.getenv("OXAPAY_MERCHANT_API_KEY", "OXAPAY_MERCHANT_API_KEY_PLACEHOLDER")
FANPAY_API_KEY = os.getenv("FANPAY_API_KEY", "FANPAY_API_KEY_PLACEHOLDER")
FANPAY_MERCHANT_ID = os.getenv("FANPAY_MERCHANT_ID", "FANPAY_MERCHANT_ID_PLACEHOLDER")`}
              </div>
            </div>

            {/* Step 2: Deploying on Render */}
            <div className="space-y-3 pt-6 border-t border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">
                02. Step-by-Step Deployment on Render.com
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-slate-700">
                <li>
                  Create a new GitHub repository containing <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">bot.py</code> and <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">requirements.txt</code>.
                </li>
                <li>
                  Log in to <strong>Render.com</strong>, click <strong>New +</strong> &rarr; <strong>Web Service</strong>, and connect your GitHub repository.
                </li>
                <li>
                  Set the <strong>Runtime</strong> to <code className="font-mono">Python 3</code>, <strong>Build Command</strong> to <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">pip install -r requirements.txt</code>, and <strong>Start Command</strong> to <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">python bot.py</code>.
                </li>
                <li>
                  Open the <strong>Environment</strong> tab in Render and add the following variables:
                  <ul className="list-disc list-inside ml-5 mt-1.5 space-y-1 font-mono text-[11px] text-slate-800">
                    <li>TELEGRAM_BOT_TOKEN = your_botfather_token</li>
                    <li>OWNER_TELEGRAM_ID = your_numeric_telegram_user_id</li>
                    <li>GEMINI_API_KEY = your_google_ai_studio_api_key</li>
                    <li>OXAPAY_MERCHANT_API_KEY = your_oxapay_merchant_key</li>
                    <li>FANPAY_API_KEY = your_fanpay_api_key</li>
                    <li>FANPAY_MERCHANT_ID = your_fanpay_merchant_id</li>
                    <li>PUBLIC_WEBHOOK_BASE_URL = https://your-app-name.onrender.com</li>
                  </ul>
                </li>
                <li>
                  Click <strong>Create Web Service</strong>. Your bot will start polling Telegram messages immediately while simultaneously listening on <code className="font-mono">/webhooks/oxapay</code> and <code className="font-mono">/webhooks/fanpay</code> for instant payment confirmation callbacks.
                </li>
              </ol>
            </div>

            {/* Step 3: Deploying on Railway */}
            <div className="space-y-3 pt-6 border-t border-slate-200">
              <h3 className="text-base font-semibold text-slate-900">
                03. Step-by-Step Deployment on Railway.app
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-slate-700">
                <li>
                  Log in to <strong>Railway.app</strong>, click <strong>New Project</strong> &rarr; <strong>Deploy from GitHub repo</strong>, and select your repository.
                </li>
                <li>
                  Go to the <strong>Variables</strong> tab of your service and paste your <code className="font-mono">.env</code> variables (<code className="font-mono">TELEGRAM_BOT_TOKEN</code>, <code className="font-mono">OWNER_TELEGRAM_ID</code>, <code className="font-mono">GEMINI_API_KEY</code>, <code className="font-mono">OXAPAY_MERCHANT_API_KEY</code>, <code className="font-mono">FANPAY_API_KEY</code>, <code className="font-mono">PUBLIC_WEBHOOK_BASE_URL</code>).
                </li>
                <li>
                  Under <strong>Settings &rarr; Networking</strong>, click <strong>Generate Domain</strong> so OxaPay and FanPay can reach your webhook endpoints (<code className="font-mono">https://your-service.up.railway.app/webhooks/oxapay</code> and <code className="font-mono">/webhooks/fanpay</code>).
                </li>
                <li>
                  Under <strong>Settings &rarr; Deploy</strong>, set the Custom Start Command to <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">python bot.py</code>. Railway will automatically install <code className="font-mono">requirements.txt</code> and launch your bot.
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
