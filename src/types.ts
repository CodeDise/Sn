export interface SupportAccountSection {
  id: string;
  label: string; // e.g., "Sales Support", "Technical Support", "Billing"
  handle: string;
  apiId: string;
  apiHash: string;
  phoneOrSession: string;
  enabled: boolean;
  aiAutoReply: boolean;
  activeChatsCount: number;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface KnowledgeBase {
  businessName: string;
  description: string;
  workingHours: string;
  contactDetails: string;
  refundPolicy: string;
  shippingPolicy: string;
  paymentMethodsInfo: string;
  defaultGateway: 'OxaPay' | 'FanPay' | 'UserChoice';
  rateLimitMaxMessages: number;
  rateLimitWindowSeconds: number;
  welcomeMessage: string;
  faqs: FAQItem[];
}

export interface ProductItem {
  id: string;
  name: string;
  description: string;
  price: number;
  variants: string[];
  stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock';
  category: string;
}

export interface OrderRecord {
  orderId: string;
  userId: string;
  userName: string;
  userHandle: string;
  productId: string;
  productName: string;
  variant: string;
  quantity: number;
  amount: number;
  currency: string;
  shippingDetails: string;
  gateway: 'OxaPay' | 'FanPay';
  paymentUrl: string;
  status: 'Pending' | 'Paid' | 'Fulfilled' | 'Disputed' | 'Refunded';
  createdAt: string;
  updatedAt: string;
}

export interface InlineButton {
  label: string;
  action: string;
  payload?: string;
  url?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'owner' | 'system';
  text: string;
  timestamp: string;
  detectedLanguage?: string;
  queryType?: string;
  sectionLabel?: string;
  inlineButtons?: InlineButton[][];
  isBanner?: boolean;
}

export interface CheckoutDraft {
  step: 'variant_quantity' | 'shipping' | 'gateway';
  productId: string;
  productName: string;
  unitPrice: number;
  variant?: string;
  quantity?: number;
  shippingDetails?: string;
}

export interface ConversationThread {
  userId: string;
  userName: string;
  userHandle: string;
  preferredLanguage: string;
  activeSectionId: string;
  handoverToHuman: boolean;
  escalationReason?: string;
  unreadEscalation: boolean;
  checkoutDraft?: CheckoutDraft | null;
  messages: ChatMessage[];
  lastMessageAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userHandle: string;
  sectionLabel: string;
  language: string;
  queryType: string;
  userQuery: string;
  botResponse: string;
  escalated: boolean;
}

export interface BotState {
  sections: SupportAccountSection[];
  knowledgeBase: KnowledgeBase;
  products: ProductItem[];
  orders: OrderRecord[];
  conversations: ConversationThread[];
  logs: AuditLogEntry[];
}
