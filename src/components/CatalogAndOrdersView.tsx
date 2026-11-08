import React, { useState } from 'react';
import { Plus, Trash2, CheckCircle2, Zap, PackagePlus, Check } from 'lucide-react';
import type { BotState, OrderRecord, ProductItem } from '../types.ts';

interface CatalogAndOrdersViewProps {
  state: BotState;
  onSaveProducts: (products: ProductItem[]) => Promise<void>;
  onUpsertOrder: (order: OrderRecord) => Promise<void>;
  onTriggerWebhook: (gateway: 'oxapay' | 'fanpay', orderId: string) => Promise<void>;
  onMarkOrderPaid: (orderId: string, status?: string) => Promise<void>;
}

export const CatalogAndOrdersView: React.FC<CatalogAndOrdersViewProps> = ({
  state,
  onSaveProducts,
  onUpsertOrder,
  onTriggerWebhook,
  onMarkOrderPaid,
}) => {
  const [products, setProducts] = useState<ProductItem[]>(state.products);
  const [orderFilter, setOrderFilter] = useState<string>('ALL');
  const [notice, setNotice] = useState<string | null>(null);

  // New Product Form State
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState('149');
  const [prodVariants, setProdVariants] = useState('Standard Edition, Pro Edition');
  const [prodStock, setProdStock] = useState<'In Stock' | 'Low Stock' | 'Out of Stock'>('In Stock');
  const [prodCategory, setProdCategory] = useState('Hardware');

  // Admin Manual Order Record Form State
  const [ordId, setOrdId] = useState('');
  const [ordUserId, setOrdUserId] = useState(state.conversations[0]?.userId || 'usr_arjun');
  const [ordProdId, setOrdProdId] = useState(state.products[0]?.id || 'prod_node_x1');
  const [ordAmount, setOrdAmount] = useState('299');
  const [ordGateway, setOrdGateway] = useState<'OxaPay' | 'FanPay'>('OxaPay');
  const [ordStatus, setOrdStatus] = useState<'Pending' | 'Paid' | 'Fulfilled' | 'Disputed'>('Pending');

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) return;
    const item: ProductItem = {
      id: `prod_${Date.now()}`,
      name: prodName.trim(),
      description: prodDesc.trim() || 'Enterprise hardware/cloud solution.',
      price: parseFloat(prodPrice) || 99,
      variants: prodVariants
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
      stockStatus: prodStock,
      category: prodCategory.trim() || 'General',
    };
    const updated = [...products, item];
    setProducts(updated);
    await onSaveProducts(updated);
    setProdName('');
    setProdDesc('');
    flash(`Added "${item.name}" to Telegram inline catalog`);
  };

  const handleStockChange = async (
    id: string,
    stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock'
  ) => {
    const updated = products.map((p) => (p.id === id ? { ...p, stockStatus } : p));
    setProducts(updated);
    await onSaveProducts(updated);
    flash('Updated product stock status');
  };

  const handleDeleteProduct = async (id: string) => {
    if (products.length <= 1) return;
    const updated = products.filter((p) => p.id !== id);
    setProducts(updated);
    await onSaveProducts(updated);
    flash('Removed product from catalog');
  };

  const handleCreateOrUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const user =
      state.conversations.find((c) => c.userId === ordUserId) || state.conversations[0];
    const prod = products.find((p) => p.id === ordProdId) || products[0];
    const finalOrderId = ordId.trim().toUpperCase() || `ORD-${Math.floor(10000 + Math.random() * 90000)}`;
    const amountNum = parseFloat(ordAmount) || prod.price;

    const record: OrderRecord = {
      orderId: finalOrderId,
      userId: user.userId,
      userName: user.userName,
      userHandle: user.userHandle,
      productId: prod.id,
      productName: prod.name,
      variant: prod.variants[0] || 'Standard',
      quantity: 1,
      amount: amountNum,
      currency: 'USD',
      shippingDetails: `${user.userName} (${user.userHandle}) · Admin Recorded`,
      gateway: ordGateway,
      paymentUrl:
        ordGateway === 'OxaPay'
          ? `https://pay.oxapay.com/invoice/${finalOrderId}?amount=${amountNum}`
          : `https://pay.fanpay.io/checkout/${finalOrderId}?amount=${amountNum}`,
      status: ordStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onUpsertOrder(record);
    setOrdId('');
    flash(`Saved order ${finalOrderId} (${ordStatus}) to database`);
  };

  const filteredOrders = state.orders.filter((o) =>
    orderFilter === 'ALL' ? true : o.status === orderFilter
  );

  return (
    <div className="space-y-8">
      {notice && (
        <div className="px-4 py-3 bg-emerald-950 text-emerald-50 rounded-xl flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{notice}</span>
          </div>
          <span className="font-mono text-[11px] text-emerald-300">
            Live Telegram Bot & SQLite Schema Updated
          </span>
        </div>
      )}

      {/* SECTION 1: Payment & Order Management + Webhook Listener Simulator */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              01. Orders, OxaPay / FanPay Webhooks & Manual Payment Controls
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Manage customer orders referenced by Gemini AI during support queries. Trigger a live OxaPay or FanPay webhook callback or manually mark an order as Paid to send an instant confirmation to the user in Telegram.
            </p>
          </div>

          {/* Interactive Filter Controls (Functional Buttons) */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
            {(['ALL', 'Pending', 'Paid', 'Fulfilled', 'Disputed'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setOrderFilter(status)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  orderFilter === status
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status === 'ALL' ? `All (${state.orders.length})` : status}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-3">Order ID</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Product & Variant</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3">Gateway & Invoice</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Webhook / Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredOrders.map((ord) => (
                <tr key={ord.orderId} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 font-mono font-semibold text-slate-900 tabular-nums">
                    {ord.orderId}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-medium text-slate-900">{ord.userName}</div>
                    <div className="text-[11px] font-mono text-slate-500">{ord.userHandle}</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-medium text-slate-900">{ord.productName}</div>
                    <div className="text-[11px] text-slate-500">
                      {ord.variant} · Qty: {ord.quantity} · {ord.shippingDetails}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                    ${ord.amount.toFixed(2)} {ord.currency}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-medium text-slate-800">{ord.gateway} Merchant API</div>
                    <div className="text-[11px] font-mono text-slate-500 truncate max-w-[200px]">
                      {ord.paymentUrl}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <select
                      aria-label={`Change status for ${ord.orderId}`}
                      value={ord.status}
                      onChange={async (e) => {
                        await onMarkOrderPaid(ord.orderId, e.target.value);
                        flash(`Order ${ord.orderId} updated to ${e.target.value}`);
                      }}
                      className="px-2.5 py-1 text-xs font-medium bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:border-slate-900"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                      <option value="Fulfilled">Fulfilled</option>
                      <option value="Disputed">Disputed</option>
                      <option value="Refunded">Refunded</option>
                    </select>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {ord.status !== 'Paid' && ord.status !== 'Fulfilled' ? (
                        <>
                          <button
                            type="button"
                            onClick={async () => {
                              await onTriggerWebhook(
                                ord.gateway === 'OxaPay' ? 'oxapay' : 'fanpay',
                                ord.orderId
                              );
                              flash(
                                `Fired ${ord.gateway} webhook callback for ${ord.orderId} — User notified in Telegram!`
                              );
                            }}
                            className="px-2.5 py-1.5 text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1 whitespace-nowrap"
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-400" />
                            <span>Fire {ord.gateway} Webhook</span>
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await onMarkOrderPaid(ord.orderId, 'Paid');
                              flash(
                                `Marked ${ord.orderId} as Paid manually and sent confirmation to ${ord.userHandle}`
                              );
                            }}
                            className="px-2.5 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-md transition-colors whitespace-nowrap"
                          >
                            Mark Paid
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-emerald-700 font-medium flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirmed & Notified</span>
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Admin Record / Update Order Form */}
        <form
          onSubmit={handleCreateOrUpdateOrder}
          className="pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-6 gap-3 items-end"
        >
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Order ID (New or Existing)
            </label>
            <input
              type="text"
              placeholder="e.g. ORD-84990"
              value={ordId}
              onChange={(e) => setOrdId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Customer Account
            </label>
            <select
              value={ordUserId}
              onChange={(e) => setOrdUserId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
            >
              {state.conversations.map((c) => (
                <option key={c.userId} value={c.userId}>
                  {c.userName} ({c.userHandle})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Product
            </label>
            <select
              value={ordProdId}
              onChange={(e) => {
                setOrdProdId(e.target.value);
                const found = products.find((p) => p.id === e.target.value);
                if (found) setOrdAmount(String(found.price));
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (${p.price})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Amount (USD)
            </label>
            <input
              type="number"
              step="0.01"
              value={ordAmount}
              onChange={(e) => setOrdAmount(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Gateway
              </label>
              <select
                value={ordGateway}
                onChange={(e) => setOrdGateway(e.target.value as 'OxaPay' | 'FanPay')}
                className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
              >
                <option value="OxaPay">OxaPay</option>
                <option value="FanPay">FanPay</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Status
              </label>
              <select
                value={ordStatus}
                onChange={(e) =>
                  setOrdStatus(e.target.value as 'Pending' | 'Paid' | 'Fulfilled' | 'Disputed')
                }
                className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
              >
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Fulfilled">Fulfilled</option>
                <option value="Disputed">Disputed</option>
              </select>
            </div>
          </div>
          <div>
            <button
              type="submit"
              className="w-full px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record / Update Order</span>
            </button>
          </div>
        </form>
      </section>

      {/* SECTION 2: Interactive Product Catalog Manager */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              02. Telegram Inline Product Catalog Management
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Products below are displayed as interactive inline keyboard buttons when a customer taps "Browse Product Catalog" in Telegram.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 tabular-nums">
            Total Products: {products.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-3">Product Name & Description</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Configurable Variants</th>
                <th className="py-2.5 px-3 text-right">Price (USD)</th>
                <th className="py-2.5 px-3">Stock Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {products.map((prod) => (
                <tr key={prod.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 max-w-md">
                    <div className="font-semibold text-slate-900">{prod.name}</div>
                    <div className="text-slate-500 mt-0.5 leading-relaxed">{prod.description}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-600">{prod.category}</td>
                  <td className="py-3 px-3 text-slate-600">{prod.variants.join(' · ')}</td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                    ${prod.price.toFixed(2)}
                  </td>
                  <td className="py-3 px-3">
                    <select
                      aria-label={`Stock status for ${prod.name}`}
                      value={prod.stockStatus}
                      onChange={(e) =>
                        handleStockChange(
                          prod.id,
                          e.target.value as 'In Stock' | 'Low Stock' | 'Out of Stock'
                        )
                      }
                      className="px-2.5 py-1 text-xs font-medium bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:border-slate-900"
                    >
                      <option value="In Stock">In Stock</option>
                      <option value="Low Stock">Low Stock</option>
                      <option value="Out of Stock">Out of Stock</option>
                    </select>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      disabled={products.length <= 1}
                      onClick={() => handleDeleteProduct(prod.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                      title="Delete Product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form
          onSubmit={handleAddProduct}
          className="pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-6 gap-3 items-end"
        >
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Product Title
            </label>
            <input
              type="text"
              placeholder="e.g. Aether Enterprise Inference API Credits"
              value={prodName}
              onChange={(e) => setProdName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Description
            </label>
            <input
              type="text"
              placeholder="10M tokens low-latency pass"
              value={prodDesc}
              onChange={(e) => setProdDesc(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Variants (comma-separated)
            </label>
            <input
              type="text"
              value={prodVariants}
              onChange={(e) => setProdVariants(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={prodPrice}
                onChange={(e) => setProdPrice(e.target.value)}
                className="w-full px-2.5 py-2 text-xs font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Stock
              </label>
              <select
                value={prodStock}
                onChange={(e) =>
                  setProdStock(e.target.value as 'In Stock' | 'Low Stock' | 'Out of Stock')
                }
                className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
              >
                <option value="In Stock">In Stock</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
            </div>
          </div>
          <div>
            <button
              type="submit"
              className="w-full px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <PackagePlus className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
