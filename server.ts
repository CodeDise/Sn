import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import type {
  BotState,
  ChatMessage,
  ConversationThread,
  InlineButton,
  OrderRecord,
} from './src/types.ts';

dotenv.config();

const app = express();
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'bot_store.json');

// Rate limiter memory store: userId -> array of epoch timestamps (ms)
const rateLimitTracker: Record<string, number[]> = {};

function getInitialState(): BotState {
  return {
    sections: [
      {
        id: 'sec_sales',
        label: 'Sales Support',
        handle: '@AetherSales_Support',
        apiId: '28491024',
        apiHash: 'a9f8d7e6c5b4a3f2e1d0c9b8a7f6e5d4',
        phoneOrSession: '+1 (415) 890-4311 · session_sales_v2.session',
        enabled: true,
        aiAutoReply: true,
        activeChatsCount: 2,
      },
      {
        id: 'sec_tech',
        label: 'Technical Support',
        handle: '@AetherTech_Desk',
        apiId: '28491088',
        apiHash: 'c3b2a1d4e5f6a7b8c9d0e1f2a3b4c5d6',
        phoneOrSession: '+1 (415) 890-4312 · session_tech_v2.session',
        enabled: true,
        aiAutoReply: true,
        activeChatsCount: 1,
      },
      {
        id: 'sec_billing',
        label: 'Billing & Orders',
        handle: '@AetherBilling_Care',
        apiId: '28491109',
        apiHash: 'f1e2d3c4b5a69788695a4b3c2d1e0f9a',
        phoneOrSession: '+1 (415) 890-4319 · session_billing_v2.session',
        enabled: true,
        aiAutoReply: true,
        activeChatsCount: 1,
      },
    ],
    knowledgeBase: {
      businessName: 'Aether Cloud & Hardware Studio',
      description:
        'Enterprise workstation hardware, edge AI nodes, and managed cloud licensing for engineering teams worldwide.',
      workingHours: 'Monday – Saturday, 09:00 AM to 08:00 PM IST / 03:30 AM to 02:30 PM UTC',
      contactDetails: 'support@aetherstudio.io · Escalation Desk: @AetherHumanLead · +1 (415) 890-4300',
      refundPolicy:
        'Full 14-day refund guarantee on unopened hardware and unused license keys. Hardware defects qualify for instant replacement within 30 days. Custom enterprise node builds carry a 10% restocking fee once assembled.',
      shippingPolicy:
        'Digital licenses and cloud activations are delivered instantly via Telegram and email upon OxaPay or FanPay webhook confirmation. Physical hardware ships within 24 hours via DHL Express (3–5 business days globally) with live tracking.',
      paymentMethodsInfo:
        'We accept instant crypto & global checkout via OxaPay Merchant Gateway (USDT, BTC, ETH, TRX) and FanPay Instant Checkout (UPI, Cards, NetBanking, Global Wallets). We never ask for card numbers or sensitive banking PINs inside chat.',
      defaultGateway: 'UserChoice',
      rateLimitMaxMessages: 6,
      rateLimitWindowSeconds: 20,
      welcomeMessage:
        'Welcome to **Aether Cloud & Hardware Concierge**.\n\nOur multilingual AI support desk and automated checkout are active 24/7. Ask a question in **English, Hindi, Hinglish, or any language**, inspect an existing order, or browse our catalog below.',
      faqs: [
        {
          id: 'faq_1',
          question: 'How fast is order activation after paying via OxaPay or FanPay?',
          answer:
            'As soon as OxaPay or FanPay sends the payment webhook callback, our bot automatically updates your order status to Paid and sends your confirmation and license/tracking details immediately in Telegram.',
        },
        {
          id: 'faq_2',
          question: 'Can I speak to a human support specialist?',
          answer:
            'Yes. At any time you can tap "Talk to Human Agent" or ask for a human. Complex queries, refund requests, and payment disputes are automatically escalated to our human team.',
        },
        {
          id: 'faq_3',
          question: 'Do you support Hindi and Hinglish support queries?',
          answer:
            'Haan bilkul! Aap Hindi, Hinglish, ya English mein apna sawal pooch sakte hain. Bot automatically aapki language detect karke usi language mein jawab dega.',
        },
      ],
    },
    products: [
      {
        id: 'prod_node_x1',
        name: 'Aether Edge Node X1 (64GB Unified)',
        description:
          'Silent anodized aluminum desktop neural workstation with dual 10GbE networking and preloaded Ubuntu AI stack.',
        price: 1290,
        variants: ['64GB RAM / 2TB NVMe', '128GB RAM / 4TB NVMe'],
        stockStatus: 'In Stock',
        category: 'Hardware',
      },
      {
        id: 'prod_cloud_pro',
        name: 'Aether Dedicated GPU Cluster Pass (Monthly)',
        description:
          'Unmetered H100/A100 container workspace with persistent NVMe volume, SSH root access, and priority support.',
        price: 199,
        variants: ['Single Node (80GB VRAM)', 'Dual Node Cluster (160GB VRAM)'],
        stockStatus: 'In Stock',
        category: 'Cloud License',
      },
      {
        id: 'prod_sec_key',
        name: 'Aether Titan FIDO2 Hardware Security Key Pair',
        description:
          'Dual USB-C + NFC cryptographic hardware authentication keys with tamper-resistant secure element.',
        price: 89,
        variants: ['USB-C + NFC Pair', 'USB-A + USB-C Pair'],
        stockStatus: 'Low Stock',
        category: 'Security',
      },
    ],
    orders: [
      {
        orderId: 'ORD-84920',
        userId: 'usr_arjun',
        userName: 'Arjun Mehta',
        userHandle: '@arjun_dev',
        productId: 'prod_cloud_pro',
        productName: 'Aether Dedicated GPU Cluster Pass (Monthly)',
        variant: 'Single Node (80GB VRAM)',
        quantity: 1,
        amount: 199,
        currency: 'USD',
        shippingDetails: 'arjun.mehta@devops.in · Mumbai, IN (Digital Delivery)',
        gateway: 'FanPay',
        paymentUrl: 'https://pay.fanpay.io/checkout/ORD-84920?merchant=aether_live',
        status: 'Paid',
        createdAt: '2026-11-06T09:15:00Z',
        updatedAt: '2026-11-06T09:18:22Z',
      },
      {
        orderId: 'ORD-84955',
        userId: 'usr_elena',
        userName: 'Elena Rostova',
        userHandle: '@elena_r',
        productId: 'prod_node_x1',
        productName: 'Aether Edge Node X1 (64GB Unified)',
        variant: '64GB RAM / 2TB NVMe',
        quantity: 1,
        amount: 1290,
        currency: 'USD',
        shippingDetails: 'Elena Rostova · Friedrichstraße 112, 10117 Berlin, Germany',
        gateway: 'OxaPay',
        paymentUrl: 'https://pay.oxapay.com/invoice/ORD-84955?merchant=aether_oxa',
        status: 'Pending',
        createdAt: '2026-11-06T12:40:00Z',
        updatedAt: '2026-11-06T12:40:00Z',
      },
      {
        orderId: 'ORD-84810',
        userId: 'usr_kabir',
        userName: 'Kabir Sharma',
        userHandle: '@kabir_sharma',
        productId: 'prod_sec_key',
        productName: 'Aether Titan FIDO2 Hardware Security Key Pair',
        variant: 'USB-C + NFC Pair',
        quantity: 2,
        amount: 178,
        currency: 'USD',
        shippingDetails: 'Kabir Sharma · Sector 62, Noida, UP 201309, India',
        gateway: 'FanPay',
        paymentUrl: 'https://pay.fanpay.io/checkout/ORD-84810?merchant=aether_live',
        status: 'Disputed',
        createdAt: '2026-11-05T16:10:00Z',
        updatedAt: '2026-11-06T11:05:00Z',
      },
    ],
    conversations: [
      {
        userId: 'usr_arjun',
        userName: 'Arjun Mehta',
        userHandle: '@arjun_dev',
        preferredLanguage: 'Hinglish',
        activeSectionId: 'sec_sales',
        handoverToHuman: false,
        unreadEscalation: false,
        checkoutDraft: null,
        lastMessageAt: '2026-11-06T14:20:10Z',
        messages: [
          {
            id: 'msg_1',
            sender: 'bot',
            text: 'Welcome to **Aether Cloud & Hardware Concierge**.\n\nOur multilingual AI support desk and automated checkout are active 24/7. Ask a question in **English, Hindi, Hinglish, or any language**, inspect an existing order, or browse our catalog below.',
            timestamp: '2026-11-06T14:18:00Z',
            sectionLabel: 'Sales Support',
            isBanner: true,
            inlineButtons: [
              [
                { label: '🛒 Browse Product Catalog', action: 'catalog' },
                { label: '📦 Check Order Status', action: 'orders' },
              ],
              [
                { label: '💳 Payment & Refund Policy', action: 'policies' },
                { label: '👤 Talk to Human Agent', action: 'handover' },
              ],
            ],
          },
          {
            id: 'msg_2',
            sender: 'user',
            text: 'Bhai mera order ORD-84920 ka status kya hai? Aur Aether Edge Node X1 India mein kitne din mein deliver hota hai?',
            timestamp: '2026-11-06T14:19:45Z',
          },
          {
            id: 'msg_3',
            sender: 'bot',
            text: 'Namaste Arjun! Aapka order **ORD-84920** (*Aether Dedicated GPU Cluster Pass - Single Node*) **Paid** aur active hai (Amount: $199 USD via FanPay).\n\nJahan tak **Aether Edge Node X1** ki baat hai, physical hardware hum payment confirm hone ke 24 hours ke andar **DHL Express** se ship karte hain, jo India (Mumbai/Delhi/etc.) mein **3–5 business days** mein live tracking ke saath deliver ho jata hai.\n\nKya aap Edge Node X1 order karna chahenge?',
            timestamp: '2026-11-06T14:20:10Z',
            detectedLanguage: 'Hinglish',
            queryType: 'Order Status & Shipping',
            sectionLabel: 'Sales Support',
            inlineButtons: [
              [
                { label: '🛒 Buy Edge Node X1 ($1,290)', action: 'buy_product', payload: 'prod_node_x1' },
                { label: '📦 View All Products', action: 'catalog' },
              ],
            ],
          },
        ],
      },
      {
        userId: 'usr_kabir',
        userName: 'Kabir Sharma',
        userHandle: '@kabir_sharma',
        preferredLanguage: 'Hindi',
        activeSectionId: 'sec_billing',
        handoverToHuman: true,
        escalationReason: 'Payment dispute / double debit reported on Order ORD-84810',
        unreadEscalation: true,
        checkoutDraft: null,
        lastMessageAt: '2026-11-06T14:25:00Z',
        messages: [
          {
            id: 'msg_k1',
            sender: 'user',
            text: 'मेरे ऑर्डर ORD-84810 के लिए मेरे बैंक से दो बार पैसे कट गए हैं, मुझे तुरंत रिफंड या किसी सीनियर अधिकारी से बात करनी है।',
            timestamp: '2026-11-06T14:24:30Z',
          },
          {
            id: 'msg_k2',
            sender: 'bot',
            text: 'नमस्ते कबीर जी, हमें इस असुविधा के लिए खेद है। चूंकि यह आपके ऑर्डर **ORD-84810** ($178 USD) के भुगतान विवाद (double debit/refund) से जुड़ा संवेदनशील मामला है, मैंने आपकी चैट को तुरंत हमारे **Human Billing Specialist** को सौंप दिया है। हमारी टीम अभी आपके ट्रांज़ैक्शन की जांच करके यहाँ आपको जवाब देगी। (Auto-reply paused for human review)',
            timestamp: '2026-11-06T14:25:00Z',
            detectedLanguage: 'Hindi',
            queryType: 'Escalation / Dispute',
            sectionLabel: 'Billing & Orders',
          },
        ],
      },
      {
        userId: 'usr_elena',
        userName: 'Elena Rostova',
        userHandle: '@elena_r',
        preferredLanguage: 'English',
        activeSectionId: 'sec_tech',
        handoverToHuman: false,
        unreadEscalation: false,
        checkoutDraft: null,
        lastMessageAt: '2026-11-06T12:41:00Z',
        messages: [
          {
            id: 'msg_e1',
            sender: 'user',
            text: 'Hi! I just created order ORD-84955 for the Edge Node X1. Can I pay with USDT via OxaPay?',
            timestamp: '2026-11-06T12:40:30Z',
          },
          {
            id: 'msg_e2',
            sender: 'bot',
            text: 'Hello Elena! Yes, your order **ORD-84955** for **Aether Edge Node X1 (64GB RAM / 2TB NVMe)** ($1,290.00 USD) is currently **Pending** payment.\n\nYou can complete payment in USDT, BTC, ETH, or TRX using your generated **OxaPay Merchant Invoice** below. As soon as OxaPay confirms the transaction webhook, our bot will automatically mark your order as **Paid** and dispatch your DHL Express tracking number.',
            timestamp: '2026-11-06T12:41:00Z',
            detectedLanguage: 'English',
            queryType: 'Payment / Billing',
            sectionLabel: 'Technical Support',
            inlineButtons: [
              [
                {
                  label: '⚡ Simulate OxaPay Webhook (Mark ORD-84955 Paid)',
                  action: 'simulate_webhook',
                  payload: 'ORD-84955',
                },
              ],
            ],
          },
        ],
      },
    ],
    logs: [
      {
        id: 'log_101',
        timestamp: '2026-11-06T12:41:00Z',
        userId: 'usr_elena',
        userHandle: '@elena_r',
        sectionLabel: 'Technical Support',
        language: 'English',
        queryType: 'Payment / Billing',
        userQuery: 'Hi! I just created order ORD-84955 for the Edge Node X1. Can I pay with USDT via OxaPay?',
        botResponse: 'Guided user to OxaPay invoice link for ORD-84955 ($1,290 USD).',
        escalated: false,
      },
      {
        id: 'log_102',
        timestamp: '2026-11-06T14:20:10Z',
        userId: 'usr_arjun',
        userHandle: '@arjun_dev',
        sectionLabel: 'Sales Support',
        language: 'Hinglish',
        queryType: 'Order Status & Shipping',
        userQuery: 'Bhai mera order ORD-84920 ka status kya hai? Aur Aether Edge Node X1 India mein kitne din mein deliver hota hai?',
        botResponse: 'Confirmed ORD-84920 is Paid ($199) and explained 3-5 day DHL Express shipping to India in Hinglish.',
        escalated: false,
      },
      {
        id: 'log_103',
        timestamp: '2026-11-06T14:25:00Z',
        userId: 'usr_kabir',
        userHandle: '@kabir_sharma',
        sectionLabel: 'Billing & Orders',
        language: 'Hindi',
        queryType: 'Escalation / Dispute',
        userQuery: 'मेरे ऑर्डर ORD-84810 के लिए मेरे बैंक से दो बार पैसे कट गए हैं...',
        botResponse: 'Flagged for Human Handover due to double-debit dispute on ORD-84810. Auto-reply paused.',
        escalated: true,
      },
    ],
  };
}

function loadState(): BotState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw) as BotState;
    }
  } catch (err) {
    console.error('Error loading bot store, falling back to default:', err);
  }
  const initial = getInitialState();
  saveState(initial);
  return initial;
}

function saveState(state: BotState): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving bot store:', err);
  }
}

let botState: BotState = loadState();

function buildCatalogInlineButtons(state: BotState): InlineButton[][] {
  return state.products.map((p) => [
    {
      label: `🛒 ${p.name} — $${p.price} (${p.stockStatus})`,
      action: 'buy_product',
      payload: p.id,
    },
  ]);
}

function buildMainMenuButtons(): InlineButton[][] {
  return [
    [
      { label: '🛒 Browse Product Catalog', action: 'catalog' },
      { label: '📦 Check Order Status', action: 'orders' },
    ],
    [
      { label: '💳 Payment & Refund Policy', action: 'policies' },
      { label: '👤 Talk to Human Agent', action: 'handover' },
    ],
  ];
}

// Get complete bot state
app.get('/api/state', (_req, res) => {
  res.json(botState);
});

// Reset demo state if needed
app.post('/api/state/reset', (_req, res) => {
  botState = getInitialState();
  saveState(botState);
  res.json(botState);
});

// Update Support Account / Section settings
app.put('/api/sections', (req, res) => {
  const { sections } = req.body;
  if (Array.isArray(sections)) {
    botState.sections = sections;
    saveState(botState);
  }
  res.json(botState);
});

// Update Business Info & Knowledge Base
app.put('/api/knowledge-base', (req, res) => {
  const { knowledgeBase } = req.body;
  if (knowledgeBase) {
    botState.knowledgeBase = knowledgeBase;
    saveState(botState);
  }
  res.json(botState);
});

// Update Product Catalog
app.put('/api/products', (req, res) => {
  const { products } = req.body;
  if (Array.isArray(products)) {
    botState.products = products;
    saveState(botState);
  }
  res.json(botState);
});

// Create or update Order from Admin Panel
app.post('/api/orders/upsert', (req, res) => {
  const order: OrderRecord = req.body.order;
  if (!order || !order.orderId) {
    res.status(400).json({ error: 'Invalid order payload' });
    return;
  }
  const idx = botState.orders.findIndex((o) => o.orderId === order.orderId);
  if (idx >= 0) {
    botState.orders[idx] = { ...botState.orders[idx], ...order, updatedAt: new Date().toISOString() };
  } else {
    botState.orders.unshift({
      ...order,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  saveState(botState);
  res.json(botState);
});

// Webhook / Payment Confirmation Handler (Works for both OxaPay & FanPay callbacks + Admin Manual Mark Paid)
function confirmOrderPayment(orderId: string, source: 'OxaPay Webhook' | 'FanPay Webhook' | 'Admin Manual Override'): {
  updated: boolean;
  order?: OrderRecord;
} {
  const order = botState.orders.find((o) => o.orderId.toUpperCase() === orderId.toUpperCase());
  if (!order) return { updated: false };

  order.status = 'Paid';
  order.updatedAt = new Date().toISOString();

  // Find user's conversation and automatically send payment confirmation message
  const thread = botState.conversations.find((c) => c.userId === order.userId);
  const confirmationText = `✅ **Payment Confirmed (${source})**\n\nThank you, **${order.userName}**! Your payment for order **${order.orderId}** has been verified.\n\n• **Product:** ${order.productName} (${order.variant})\n• **Quantity:** ${order.quantity}\n• **Total Paid:** $${order.amount.toFixed(2)} ${order.currency} via ${order.gateway}\n• **Delivery Details:** ${order.shippingDetails}\n\nYour order status is now **Paid** and queued for immediate fulfillment.`;

  if (thread) {
    const msg: ChatMessage = {
      id: `msg_${Date.now()}_pay`,
      sender: 'bot',
      text: confirmationText,
      timestamp: new Date().toISOString(),
      detectedLanguage: thread.preferredLanguage || 'English',
      queryType: 'Payment Webhook Confirmation',
      sectionLabel: 'Billing & Orders',
      inlineButtons: [[{ label: '📦 View My Orders', action: 'orders' }]],
    };
    thread.messages.push(msg);
    thread.lastMessageAt = msg.timestamp;
  }

  botState.logs.unshift({
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: order.userId,
    userHandle: order.userHandle,
    sectionLabel: 'Billing & Orders',
    language: 'System',
    queryType: 'Webhook Confirmation',
    userQuery: `[${source}] Order ${order.orderId} payment callback received`,
    botResponse: `Updated ${order.orderId} status to Paid and sent automated confirmation to ${order.userHandle}.`,
    escalated: false,
  });

  saveState(botState);
  return { updated: true, order };
}

app.post('/api/webhooks/oxapay', (req, res) => {
  const { orderId } = req.body;
  const result = confirmOrderPayment(orderId, 'OxaPay Webhook');
  if (!result.updated) {
    res.status(404).json({ error: `Order ${orderId} not found` });
    return;
  }
  res.json({ status: 'ok', order: result.order, state: botState });
});

app.post('/api/webhooks/fanpay', (req, res) => {
  const { orderId } = req.body;
  const result = confirmOrderPayment(orderId, 'FanPay Webhook');
  if (!result.updated) {
    res.status(404).json({ error: `Order ${orderId} not found` });
    return;
  }
  res.json({ status: 'ok', order: result.order, state: botState });
});

app.post('/api/orders/mark-paid', (req, res) => {
  const { orderId, status } = req.body;
  if (status && status !== 'Paid') {
    const order = botState.orders.find((o) => o.orderId === orderId);
    if (order) {
      order.status = status;
      order.updatedAt = new Date().toISOString();
      const thread = botState.conversations.find((c) => c.userId === order.userId);
      if (thread) {
        thread.messages.push({
          id: `msg_${Date.now()}_status`,
          sender: 'bot',
          text: `📦 **Order Update (${order.orderId})**\nYour order for **${order.productName}** has been updated to status: **${status}**.`,
          timestamp: new Date().toISOString(),
          sectionLabel: 'Billing & Orders',
        });
      }
      saveState(botState);
    }
    res.json(botState);
    return;
  }
  confirmOrderPayment(orderId, 'Admin Manual Override');
  res.json(botState);
});

// Human Handover Controls: Owner sends manual reply (auto-pauses AI) or toggles AI handover state
app.post('/api/conversations/owner-reply', (req, res) => {
  const { userId, text } = req.body;
  const thread = botState.conversations.find((c) => c.userId === userId);
  if (!thread || !text?.trim()) {
    res.status(400).json({ error: 'Conversation or message text missing' });
    return;
  }

  // Jumping into a conversation automatically pauses AI auto-replies for that user
  thread.handoverToHuman = true;
  thread.unreadEscalation = false;

  const ownerMsg: ChatMessage = {
    id: `msg_${Date.now()}_owner`,
    sender: 'owner',
    text: text.trim(),
    timestamp: new Date().toISOString(),
    sectionLabel: 'Human Support Lead',
  };
  thread.messages.push(ownerMsg);
  thread.lastMessageAt = ownerMsg.timestamp;

  botState.logs.unshift({
    id: `log_${Date.now()}`,
    timestamp: ownerMsg.timestamp,
    userId: thread.userId,
    userHandle: thread.userHandle,
    sectionLabel: 'Human Support Lead',
    language: thread.preferredLanguage,
    queryType: 'Human Operator Reply',
    userQuery: '[Owner Manual Intervention]',
    botResponse: text.trim(),
    escalated: true,
  });

  saveState(botState);
  res.json(botState);
});

app.post('/api/conversations/handover-toggle', (req, res) => {
  const { userId, handoverToHuman, reason } = req.body;
  const thread = botState.conversations.find((c) => c.userId === userId);
  if (!thread) {
    res.status(404).json({ error: 'Thread not found' });
    return;
  }

  thread.handoverToHuman = Boolean(handoverToHuman);
  thread.unreadEscalation = Boolean(handoverToHuman);
  thread.escalationReason = handoverToHuman
    ? reason || 'Manual human operator takeover active'
    : undefined;

  const sysMsg: ChatMessage = {
    id: `msg_${Date.now()}_sys`,
    sender: 'system',
    text: thread.handoverToHuman
      ? '⏸️ **Human Handover Active:** AI auto-replies are paused for this user. Owner/Admin is handling this thread.'
      : '🤖 **Handed Back to AI:** Gemini auto-reply has resumed for this conversation.',
    timestamp: new Date().toISOString(),
  };
  thread.messages.push(sysMsg);
  thread.lastMessageAt = sysMsg.timestamp;

  saveState(botState);
  res.json(botState);
});

// Switch active support section for a user conversation
app.post('/api/conversations/section', (req, res) => {
  const { userId, sectionId } = req.body;
  const thread = botState.conversations.find((c) => c.userId === userId);
  if (thread) {
    thread.activeSectionId = sectionId;
    saveState(botState);
  }
  res.json(botState);
});

// Create a new simulated user thread
app.post('/api/conversations/create', (req, res) => {
  const { userName, userHandle, preferredLanguage, sectionId } = req.body;
  const newUserId = `usr_${Date.now()}`;
  const section = botState.sections.find((s) => s.id === sectionId) || botState.sections[0];
  const newThread: ConversationThread = {
    userId: newUserId,
    userName: userName || 'New Telegram User',
    userHandle: userHandle?.startsWith('@') ? userHandle : `@${userHandle || 'telegram_user'}`,
    preferredLanguage: preferredLanguage || 'English',
    activeSectionId: section.id,
    handoverToHuman: false,
    unreadEscalation: false,
    checkoutDraft: null,
    lastMessageAt: new Date().toISOString(),
    messages: [
      {
        id: `msg_${Date.now()}_start`,
        sender: 'bot',
        text: botState.knowledgeBase.welcomeMessage,
        timestamp: new Date().toISOString(),
        sectionLabel: section.label,
        isBanner: true,
        inlineButtons: buildMainMenuButtons(),
      },
    ],
  };
  botState.conversations.unshift(newThread);
  saveState(botState);
  res.json({ state: botState, createdUserId: newUserId });
});

// Handle Telegram Bot inline button callbacks or step-by-step Buying Flow
app.post('/api/telegram/action', (req, res) => {
  const { userId, action, payload } = req.body;
  const thread = botState.conversations.find((c) => c.userId === userId);
  if (!thread) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  const section =
    botState.sections.find((s) => s.id === thread.activeSectionId) || botState.sections[0];
  const now = new Date().toISOString();

  if (action === 'start') {
    thread.checkoutDraft = null;
    thread.messages.push({
      id: `msg_${Date.now()}_start`,
      sender: 'bot',
      text: botState.knowledgeBase.welcomeMessage,
      timestamp: now,
      sectionLabel: section.label,
      isBanner: true,
      inlineButtons: buildMainMenuButtons(),
    });
  } else if (action === 'catalog') {
    thread.checkoutDraft = null;
    const lines = botState.products.map(
      (p, i) =>
        `**${i + 1}. ${p.name}**\n${p.description}\n• **Price:** $${p.price.toFixed(2)} USD · **Status:** ${p.stockStatus}\n• **Variants:** ${p.variants.join(' | ')}`
    );
    thread.messages.push({
      id: `msg_${Date.now()}_cat`,
      sender: 'bot',
      text: `🛍️ **${botState.knowledgeBase.businessName} — Product Catalog**\n\nSelect any item below to start our step-by-step instant checkout:\n\n${lines.join('\n\n')}`,
      timestamp: now,
      sectionLabel: section.label,
      queryType: 'Catalog Browse',
      inlineButtons: buildCatalogInlineButtons(botState),
    });
  } else if (action === 'orders') {
    const userOrders = botState.orders.filter((o) => o.userId === thread.userId);
    if (userOrders.length === 0) {
      thread.messages.push({
        id: `msg_${Date.now()}_ord`,
        sender: 'bot',
        text: `📦 **Your Orders**\n\nWe could not find any existing orders under **${thread.userHandle}**. Tap below to browse our catalog or type an Order ID (e.g. \`ORD-84920\`) to look it up.`,
        timestamp: now,
        sectionLabel: section.label,
        inlineButtons: [[{ label: '🛒 Browse Product Catalog', action: 'catalog' }]],
      });
    } else {
      const summary = userOrders
        .map(
          (o) =>
            `• **${o.orderId}** — ${o.productName} (${o.variant}) × ${o.quantity}\n  **Amount:** $${o.amount.toFixed(2)} USD · **Gateway:** ${o.gateway} · **Status:** **${o.status}**`
        )
        .join('\n\n');
      const pendingOrder = userOrders.find((o) => o.status === 'Pending');
      const buttons: InlineButton[][] = [
        [{ label: '🛒 Browse Product Catalog', action: 'catalog' }],
      ];
      if (pendingOrder) {
        buttons.unshift([
          {
            label: `⚡ Simulate ${pendingOrder.gateway} Webhook (Mark ${pendingOrder.orderId} Paid)`,
            action: 'simulate_webhook',
            payload: pendingOrder.orderId,
          },
        ]);
      }
      thread.messages.push({
        id: `msg_${Date.now()}_ord`,
        sender: 'bot',
        text: `📦 **Order History for ${thread.userName} (${thread.userHandle})**\n\n${summary}`,
        timestamp: now,
        sectionLabel: section.label,
        queryType: 'Order Lookup',
        inlineButtons: buttons,
      });
    }
  } else if (action === 'policies') {
    const kb = botState.knowledgeBase;
    thread.messages.push({
      id: `msg_${Date.now()}_pol`,
      sender: 'bot',
      text: `📋 **${kb.businessName} — Official Policies & Payment Guide**\n\n**💳 Accepted Payment Gateways**\n${kb.paymentMethodsInfo}\n\n**🚚 Shipping & Delivery**\n${kb.shippingPolicy}\n\n**🔄 Refund & Return Policy**\n${kb.refundPolicy}\n\n**🕒 Working Hours & Contact**\n${kb.workingHours}\n${kb.contactDetails}`,
      timestamp: now,
      sectionLabel: section.label,
      queryType: 'Policy Info',
      inlineButtons: buildMainMenuButtons(),
    });
  } else if (action === 'handover') {
    thread.handoverToHuman = true;
    thread.unreadEscalation = true;
    thread.escalationReason = 'User clicked "Talk to Human Agent" button';
    thread.messages.push({
      id: `msg_${Date.now()}_esc`,
      sender: 'bot',
      text: `👤 **Human Support Escalation Confirmed**\n\nI have flagged your conversation for our human support team and paused automated AI replies so an operator can assist you directly. An agent will reply in this chat shortly.`,
      timestamp: now,
      sectionLabel: section.label,
      queryType: 'Human Handover',
    });
  } else if (action === 'buy_product') {
    const product = botState.products.find((p) => p.id === payload);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    if (product.stockStatus === 'Out of Stock') {
      thread.messages.push({
        id: `msg_${Date.now()}_oos`,
        sender: 'bot',
        text: `⚠️ **${product.name}** is currently **Out of Stock**. Would you like to browse other available items or notify a human sales specialist?`,
        timestamp: now,
        sectionLabel: section.label,
        inlineButtons: [
          [
            { label: '🛒 Browse Catalog', action: 'catalog' },
            { label: '👤 Ask Sales Specialist', action: 'handover' },
          ],
        ],
      });
    } else {
      thread.checkoutDraft = {
        step: 'variant_quantity',
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
      };
      const variantButtons: InlineButton[][] = product.variants.map((v) => [
        {
          label: `✅ ${v} · Qty: 1 ($${product.price})`,
          action: 'select_variant',
          payload: `${v}__1`,
        },
        {
          label: `✅ ${v} · Qty: 2 ($${product.price * 2})`,
          action: 'select_variant',
          payload: `${v}__2`,
        },
      ]);
      variantButtons.push([{ label: '❌ Cancel Order Flow', action: 'cancel_checkout' }]);

      thread.messages.push({
        id: `msg_${Date.now()}_step1`,
        sender: 'bot',
        text: `🛍️ **Step 1 of 3: Confirm Variant & Quantity**\n\n• **Product:** ${product.name}\n• **Unit Price:** $${product.price.toFixed(2)} USD\n\nPlease select your preferred configuration and quantity below:`,
        timestamp: now,
        sectionLabel: section.label,
        queryType: 'Order Checkout Step 1',
        inlineButtons: variantButtons,
      });
    }
  } else if (action === 'select_variant') {
    if (!thread.checkoutDraft) {
      res.json(botState);
      return;
    }
    const [variant, qtyStr] = (payload || '').split('__');
    const quantity = parseInt(qtyStr || '1', 10) || 1;
    thread.checkoutDraft.variant = variant;
    thread.checkoutDraft.quantity = quantity;
    thread.checkoutDraft.step = 'shipping';

    thread.messages.push({
      id: `msg_${Date.now()}_step2`,
      sender: 'bot',
      text: `📍 **Step 2 of 3: Delivery & Contact Information**\n\n• **Selected:** ${thread.checkoutDraft.productName} (${variant}) × ${quantity}\n• **Subtotal:** $${(thread.checkoutDraft.unitPrice * quantity).toFixed(2)} USD\n\nPlease type your **shipping address, email, and phone number** in the chat box below (or tap Quick Fill to use your saved profile address):`,
      timestamp: now,
      sectionLabel: section.label,
      queryType: 'Order Checkout Step 2',
      inlineButtons: [
        [
          {
            label: `⚡ Quick Fill: ${thread.userName} · Express Delivery Profile`,
            action: 'supply_shipping',
            payload: `${thread.userName} (${thread.userHandle}) · Priority Verified Address`,
          },
        ],
        [{ label: '❌ Cancel Order Flow', action: 'cancel_checkout' }],
      ],
    });
  } else if (action === 'supply_shipping') {
    if (!thread.checkoutDraft) {
      res.json(botState);
      return;
    }
    thread.checkoutDraft.shippingDetails = payload || `${thread.userName} Verified Delivery`;
    thread.checkoutDraft.step = 'gateway';

    const defGw = botState.knowledgeBase.defaultGateway;
    const gwButtons: InlineButton[][] =
      defGw === 'OxaPay'
        ? [[{ label: '💎 Generate OxaPay Crypto Invoice (Default)', action: 'finalize_order', payload: 'OxaPay' }]]
        : defGw === 'FanPay'
        ? [[{ label: '💳 Generate FanPay Checkout Link (Default)', action: 'finalize_order', payload: 'FanPay' }]]
        : [
            [
              { label: '💎 Pay with OxaPay (USDT / BTC / ETH)', action: 'finalize_order', payload: 'OxaPay' },
              { label: '💳 Pay with FanPay (UPI / Cards / Wallet)', action: 'finalize_order', payload: 'FanPay' },
            ],
          ];
    gwButtons.push([{ label: '❌ Cancel Order Flow', action: 'cancel_checkout' }]);

    thread.messages.push({
      id: `msg_${Date.now()}_step3`,
      sender: 'bot',
      text: `💳 **Step 3 of 3: Select Payment Gateway**\n\n• **Product:** ${thread.checkoutDraft.productName} (${thread.checkoutDraft.variant}) × ${thread.checkoutDraft.quantity}\n• **Total Amount:** $${(thread.checkoutDraft.unitPrice * (thread.checkoutDraft.quantity || 1)).toFixed(2)} USD\n• **Shipping / Delivery:** ${thread.checkoutDraft.shippingDetails}\n\nSelect your payment method to generate an instant merchant invoice link:`,
      timestamp: now,
      sectionLabel: section.label,
      queryType: 'Order Checkout Step 3',
      inlineButtons: gwButtons,
    });
  } else if (action === 'finalize_order') {
    if (!thread.checkoutDraft) {
      res.json(botState);
      return;
    }
    const gateway: 'OxaPay' | 'FanPay' = payload === 'OxaPay' ? 'OxaPay' : 'FanPay';
    const orderId = `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
    const qty = thread.checkoutDraft.quantity || 1;
    const totalAmount = thread.checkoutDraft.unitPrice * qty;
    const paymentUrl =
      gateway === 'OxaPay'
        ? `https://pay.oxapay.com/invoice/${orderId}?merchant=OXAPAY_MERCHANT_API_KEY&amount=${totalAmount}`
        : `https://pay.fanpay.io/checkout/${orderId}?merchant=FANPAY_API_KEY&amount=${totalAmount}`;

    const newOrder: OrderRecord = {
      orderId,
      userId: thread.userId,
      userName: thread.userName,
      userHandle: thread.userHandle,
      productId: thread.checkoutDraft.productId,
      productName: thread.checkoutDraft.productName,
      variant: thread.checkoutDraft.variant || 'Standard',
      quantity: qty,
      amount: totalAmount,
      currency: 'USD',
      shippingDetails: thread.checkoutDraft.shippingDetails || 'Digital / Standard',
      gateway,
      paymentUrl,
      status: 'Pending',
      createdAt: now,
      updatedAt: now,
    };

    botState.orders.unshift(newOrder);
    thread.checkoutDraft = null;

    thread.messages.push({
      id: `msg_${Date.now()}_inv`,
      sender: 'bot',
      text: `🧾 **Order Created & Payment Link Generated!**\n\n• **Order ID:** \`${newOrder.orderId}\`\n• **Item:** ${newOrder.productName} (${newOrder.variant}) × ${newOrder.quantity}\n• **Total Due:** **$${newOrder.amount.toFixed(2)} USD**\n• **Delivery Info:** ${newOrder.shippingDetails}\n• **Gateway:** ${newOrder.gateway} Merchant API\n• **Payment Link:** \`${newOrder.paymentUrl}\`\n\n🔒 *For your security, our bot never collects raw card details or sensitive PINs in chat. Complete checkout via the official ${newOrder.gateway} invoice link above. Once paid, our webhook listener will automatically confirm your order.*`,
      timestamp: now,
      sectionLabel: section.label,
      queryType: 'Order Created',
      inlineButtons: [
        [
          {
            label: `⚡ Simulate ${newOrder.gateway} Webhook Callback (Mark ${newOrder.orderId} Paid)`,
            action: 'simulate_webhook',
            payload: newOrder.orderId,
          },
        ],
        [{ label: '📦 Check My Orders', action: 'orders' }],
      ],
    });

    botState.logs.unshift({
      id: `log_${Date.now()}`,
      timestamp: now,
      userId: thread.userId,
      userHandle: thread.userHandle,
      sectionLabel: section.label,
      language: thread.preferredLanguage,
      queryType: 'Order Created',
      userQuery: `Completed checkout flow for ${newOrder.productName}`,
      botResponse: `Generated ${newOrder.gateway} invoice link for Order ${newOrder.orderId} ($${newOrder.amount}).`,
      escalated: false,
    });
  } else if (action === 'cancel_checkout') {
    thread.checkoutDraft = null;
    thread.messages.push({
      id: `msg_${Date.now()}_cancel`,
      sender: 'bot',
      text: 'Checkout flow cancelled. Let me know if you have any questions or would like to browse our catalog later.',
      timestamp: now,
      sectionLabel: section.label,
      inlineButtons: buildMainMenuButtons(),
    });
  } else if (action === 'simulate_webhook') {
    if (payload) {
      const ord = botState.orders.find((o) => o.orderId === payload);
      const src = ord?.gateway === 'OxaPay' ? 'OxaPay Webhook' : 'FanPay Webhook';
      confirmOrderPayment(payload, src);
    }
  }

  thread.lastMessageAt = now;
  saveState(botState);
  res.json(botState);
});

// Main AI Customer Support Message Handler (Gemini 3.8 Flash + Rate Limiting + Per-User Context + Language Detection)
app.post('/api/telegram/message', async (req, res) => {
  const { userId, text } = req.body;
  const thread = botState.conversations.find((c) => c.userId === userId);
  if (!thread || !text?.trim()) {
    res.status(400).json({ error: 'Invalid userId or empty message' });
    return;
  }

  const userText = text.trim();
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const kb = botState.knowledgeBase;

  // 1. Check Rate Limit / Flood Protection
  const windowMs = (kb.rateLimitWindowSeconds || 20) * 1000;
  const maxMsgs = kb.rateLimitMaxMessages || 6;
  const userTimestamps = (rateLimitTracker[userId] || []).filter((t) => nowMs - t < windowMs);
  if (userTimestamps.length >= maxMsgs) {
    const rateMsg: ChatMessage = {
      id: `msg_${nowMs}_rl`,
      sender: 'system',
      text: `⏳ **Rate Limit Active (Flood Protection):** Please wait a few seconds before sending more messages (limit: ${maxMsgs} messages per ${kb.rateLimitWindowSeconds}s).`,
      timestamp: nowIso,
    };
    thread.messages.push(rateMsg);
    saveState(botState);
    res.json({ state: botState, rateLimited: true });
    return;
  }
  userTimestamps.push(nowMs);
  rateLimitTracker[userId] = userTimestamps;

  // Append incoming user message
  const userMsg: ChatMessage = {
    id: `msg_${nowMs}_usr`,
    sender: 'user',
    text: userText,
    timestamp: nowIso,
  };
  thread.messages.push(userMsg);
  thread.lastMessageAt = nowIso;

  const section =
    botState.sections.find((s) => s.id === thread.activeSectionId) || botState.sections[0];

  // 2. If user is mid-checkout Step 2 (entering shipping address via text), advance checkout!
  if (thread.checkoutDraft && thread.checkoutDraft.step === 'shipping') {
    thread.checkoutDraft.shippingDetails = userText;
    thread.checkoutDraft.step = 'gateway';

    const defGw = kb.defaultGateway;
    const gwButtons: InlineButton[][] =
      defGw === 'OxaPay'
        ? [[{ label: '💎 Generate OxaPay Crypto Invoice (Default)', action: 'finalize_order', payload: 'OxaPay' }]]
        : defGw === 'FanPay'
        ? [[{ label: '💳 Generate FanPay Checkout Link (Default)', action: 'finalize_order', payload: 'FanPay' }]]
        : [
            [
              { label: '💎 Pay with OxaPay (USDT / BTC / ETH)', action: 'finalize_order', payload: 'OxaPay' },
              { label: '💳 Pay with FanPay (UPI / Cards / Wallet)', action: 'finalize_order', payload: 'FanPay' },
            ],
          ];
    gwButtons.push([{ label: '❌ Cancel Order Flow', action: 'cancel_checkout' }]);

    thread.messages.push({
      id: `msg_${Date.now()}_step3`,
      sender: 'bot',
      text: `💳 **Step 3 of 3: Select Payment Gateway**\n\n• **Product:** ${thread.checkoutDraft.productName} (${thread.checkoutDraft.variant}) × ${thread.checkoutDraft.quantity}\n• **Total Amount:** $${(thread.checkoutDraft.unitPrice * (thread.checkoutDraft.quantity || 1)).toFixed(2)} USD\n• **Delivery Details:** ${thread.checkoutDraft.shippingDetails}\n\nSelect your preferred payment gateway below to generate your order ID and payment link:`,
      timestamp: new Date().toISOString(),
      sectionLabel: section.label,
      queryType: 'Order Checkout Step 3',
      inlineButtons: gwButtons,
    });
    saveState(botState);
    res.json({ state: botState });
    return;
  }

  // 3. Check if Section is Disabled or Section Auto-Reply is Off or Conversation is in Human Handover
  if (!section.enabled) {
    thread.messages.push({
      id: `msg_${Date.now()}_sec_off`,
      sender: 'system',
      text: `🔕The **${section.label}** channel (${section.handle}) is currently disabled by the administrator. Your message has been logged for review.`,
      timestamp: new Date().toISOString(),
    });
    saveState(botState);
    res.json({ state: botState });
    return;
  }

  if (thread.handoverToHuman || !section.aiAutoReply) {
    thread.unreadEscalation = true;
    saveState(botState);
    res.json({
      state: botState,
      pausedForHuman: true,
    });
    return;
  }

  // 4. Build context for Gemini API (Knowledge Base, Catalog, All Orders + User's specific Orders, Per-user conversation history)
  const userOrders = botState.orders.filter((o) => o.userId === thread.userId);
  const allOrdersSummary = botState.orders.map(
    (o) =>
      `Order ID: ${o.orderId} | Customer: ${o.userName} (${o.userHandle}) | Product: ${o.productName} (${o.variant}) x${o.quantity} | Amount: $${o.amount} ${o.currency} | Gateway: ${o.gateway} | Status: ${o.status} | Payment Link: ${o.paymentUrl} | Updated: ${o.updatedAt}`
  );

  const historyText = thread.messages
    .slice(-10)
    .map((m) => `${m.sender.toUpperCase()}: ${m.text}`)
    .join('\n');

  const systemInstruction = `You are the official AI Customer Support & Sales Concierge Telegram Bot for "${kb.businessName}", operating on the "${section.label}" channel (${section.handle}).

CRITICAL OPERATING RULES:
1. AUTOMATIC LANGUAGE MATCHING: Detect the exact language/script/style of the user's latest message (e.g., English, Hindi in Devanagari, Hinglish in Latin script, Spanish, etc.) and write your entire "replyText" in that EXACT SAME language. If the user writes in Hinglish (e.g. "Mera order kab aayega?"), reply naturally in polite Hinglish! If they write in Hindi (देवनागरी), reply in Hindi. If English, reply in English.
2. STRICT KNOWLEDGE BASE GROUNDING: Base all answers strictly on the Business Information, FAQs, Product Catalog, and Order Database provided below. NEVER invent products, prices, policies, or order statuses that are not in the data. If the user asks something not covered in the knowledge base, politely state that you do not have that exact information and offer to connect them with a human support specialist (and set shouldEscalateToHuman = true).
3. PAYMENT & FINANCIAL SAFETY: NEVER process direct payments or ask for credit card numbers, CVV, bank passwords, or seed phrases. Only provide order status, pricing, refund/shipping policy, or guide the user to the official OxaPay / FanPay checkout flow.
4. HUMAN HANDOVER ESCALATION: Set "shouldEscalateToHuman": true if:
   - The user reports a payment dispute, double charge, failed transaction after paying, or requests a refund.
   - The user explicitly asks to speak to a human, manager, or live agent.
   - The query is complex/sensitive or cannot be answered from the provided Knowledge Base.
5. FORMATTING: Use clean Telegram Markdown (**bold** headers, bullet points, clear spacing) so the reply feels executive, helpful, and polished.

--- BUSINESS KNOWLEDGE BASE ---
Business Name: ${kb.businessName}
Description: ${kb.description}
Working Hours: ${kb.workingHours}
Contact Details: ${kb.contactDetails}
Payment Methods: ${kb.paymentMethodsInfo}
Shipping Policy: ${kb.shippingPolicy}
Refund Policy: ${kb.refundPolicy}
FAQs:
${kb.faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}

--- PRODUCT CATALOG ---
${botState.products
  .map(
    (p) =>
      `- ID: ${p.id} | Name: ${p.name} | Price: $${p.price} USD | Stock: ${p.stockStatus} | Variants: ${p.variants.join(', ')} | Description: ${p.description}`
  )
  .join('\n')}

--- ORDER DATABASE (Reference when user asks about an Order ID or their orders) ---
Current User: ${thread.userName} (${thread.userHandle})
Current User's Orders: ${userOrders.length > 0 ? userOrders.map((o) => o.orderId).join(', ') : 'None yet'}
All Recorded Orders:
${allOrdersSummary.join('\n')}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Recent Conversation History with ${thread.userName} (${thread.userHandle}):\n${historyText}\n\nLatest User Message:\n"${userText}"`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            replyText: {
              type: Type.STRING,
              description:
                'Polite, helpful Telegram markdown reply in the exact same language as the user message (English, Hindi, Hinglish, etc.).',
            },
            detectedLanguage: {
              type: Type.STRING,
              description: 'Detected language name, e.g. English, Hindi, Hinglish, Spanish.',
            },
            queryCategory: {
              type: Type.STRING,
              description:
                'Short category: Product Inquiry, Order Status, Payment / Billing, Policy / FAQ, or Escalation / Dispute.',
            },
            shouldEscalateToHuman: {
              type: Type.BOOLEAN,
              description:
                'True if query involves a payment dispute, refund claim, unknown info outside KB, or user requested a human.',
            },
            escalationReason: {
              type: Type.STRING,
              description: 'Concise reason if shouldEscalateToHuman is true, else empty string.',
            },
            recommendedProductId: {
              type: Type.STRING,
              description:
                'If the user wants to buy a specific catalog product, its product ID (e.g. prod_node_x1), else empty string.',
            },
          },
          required: [
            'replyText',
            'detectedLanguage',
            'queryCategory',
            'shouldEscalateToHuman',
            'escalationReason',
            'recommendedProductId',
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    const replyText =
      parsed.replyText ||
      'Thank you for reaching out. Let me connect you with a support specialist right away.';
    const detectedLanguage = parsed.detectedLanguage || 'English';
    const queryCategory = parsed.queryCategory || 'General Support';
    const shouldEscalate = Boolean(parsed.shouldEscalateToHuman);
    const escalationReason = parsed.escalationReason || '';
    const recommendedProductId = parsed.recommendedProductId || '';

    thread.preferredLanguage = detectedLanguage;

    const inlineButtons: InlineButton[][] = [];
    if (recommendedProductId) {
      const prod = botState.products.find((p) => p.id === recommendedProductId);
      if (prod && prod.stockStatus !== 'Out of Stock') {
        inlineButtons.push([
          {
            label: `🛒 Buy ${prod.name} ($${prod.price})`,
            action: 'buy_product',
            payload: prod.id,
          },
        ]);
      }
    }

    if (shouldEscalate) {
      thread.handoverToHuman = true;
      thread.unreadEscalation = true;
      thread.escalationReason =
        escalationReason || 'Flagged by Gemini AI for human operator review';
    } else {
      inlineButtons.push([
        { label: '🛒 Browse Catalog', action: 'catalog' },
        { label: '📦 My Orders', action: 'orders' },
        { label: '👤 Human Agent', action: 'handover' },
      ]);
    }

    const botMsg: ChatMessage = {
      id: `msg_${Date.now()}_bot`,
      sender: 'bot',
      text: shouldEscalate
        ? `${replyText}\n\n🔔 *Conversation flagged for Human Review (${thread.escalationReason}). Auto-replies paused until resolved.*`
        : replyText,
      timestamp: new Date().toISOString(),
      detectedLanguage,
      queryType: queryCategory,
      sectionLabel: section.label,
      inlineButtons: inlineButtons.length > 0 ? inlineButtons : undefined,
    };

    thread.messages.push(botMsg);
    thread.lastMessageAt = botMsg.timestamp;

    botState.logs.unshift({
      id: `log_${Date.now()}`,
      timestamp: botMsg.timestamp,
      userId: thread.userId,
      userHandle: thread.userHandle,
      sectionLabel: section.label,
      language: detectedLanguage,
      queryType: queryCategory,
      userQuery: userText,
      botResponse: replyText.slice(0, 180) + (replyText.length > 180 ? '...' : ''),
      escalated: shouldEscalate,
    });

    saveState(botState);
    res.json({ state: botState });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    // Graceful error handling as required by Feature 9 (Safety & Reliability)
    const fallbackMsg: ChatMessage = {
      id: `msg_${Date.now()}_err`,
      sender: 'bot',
      text: `⚠️ **Temporary AI Service Delay**\n\nWe received your message, but our AI response engine experienced a brief timeout. I have automatically notified a human support specialist on **${section.label}** so you are taken care of promptly.\n\nYou can also use the quick actions below:`,
      timestamp: new Date().toISOString(),
      sectionLabel: section.label,
      queryType: 'Fallback / Error Handled',
      inlineButtons: buildMainMenuButtons(),
    };
    thread.messages.push(fallbackMsg);
    thread.unreadEscalation = true;
    thread.escalationReason = 'AI API timeout / error fallback triggered';

    botState.logs.unshift({
      id: `log_${Date.now()}`,
      timestamp: fallbackMsg.timestamp,
      userId: thread.userId,
      userHandle: thread.userHandle,
      sectionLabel: section.label,
      language: thread.preferredLanguage,
      queryType: 'API Error Fallback',
      userQuery: userText,
      botResponse: `Graceful fallback sent (${error?.message || 'Service Error'})`,
      escalated: true,
    });

    saveState(botState);
    res.status(200).json({
      state: botState,
      aiError: error?.message || 'Gemini API call failed; graceful fallback triggered.',
    });
  }
});

async function startServer() {
  const PORT = 3000;
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TeleConcierge Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
