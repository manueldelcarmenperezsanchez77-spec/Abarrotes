import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Barcode,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Scale,
  Sparkles,
  ShoppingBag,
  Package,
} from 'lucide-react';
import { Product, Category, Sale, User, CashRegisterSession } from '../../types/database';
import { Language, translations } from '../../i18n/translations';
import { CatalogInventoryService } from '../../services/microservices';
import { BulkWeightModal } from './BulkWeightModal';
import { PaymentModal } from './PaymentModal';
import { ReceiptModal } from './ReceiptModal';
import { sound } from '../../utils/soundEffects';

interface CartLineItem {
  product: Product;
  quantity: number;
}

interface POSTerminalProps {
  currentUser: User;
  activeSession?: CashRegisterSession;
  lang: Language;
}

export const POSTerminal: React.FC<POSTerminalProps> = ({
  currentUser,
  activeSession,
  lang,
}) => {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);
  const [cart, setCart] = useState<CartLineItem[]>([]);
  const [weightModalProduct, setWeightModalProduct] = useState<Product | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const products: Product[] = CatalogInventoryService.getProducts();
  const categories: Category[] = CatalogInventoryService.getCategories();

  // Focus barcode input on mount and after sale
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Filter products by category, favorites and search query
  const filteredProducts = products.filter((p) => {
    if (!p.activo) return false;
    if (showFavoritesOnly && !p.es_favorito) return false;
    if (selectedCategory !== 'all' && p.categoria_id !== selectedCategory) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return (
        p.nombre.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        p.codigo_barras.includes(term)
      );
    }
    return true;
  });

  // Handle barcode scanned or submitted in input
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    const matchedProduct = CatalogInventoryService.getProductByBarcode(searchTerm);
    if (matchedProduct) {
      sound.playBarcodeBeep();
      addProductToCart(matchedProduct);
      setSearchTerm('');
    } else {
      sound.playErrorBuzzer();
    }
  };

  const addProductToCart = (prod: Product, customQty?: number) => {
    if (prod.permite_fraccion && !customQty) {
      setWeightModalProduct(prod);
      return;
    }

    const qtyToAdd = customQty ?? 1;

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === prod.id);
      if (existingIndex !== -1) {
        const existing = prev[existingIndex];
        const newQty = Math.min(
          prod.stock_actual,
          Math.round((existing.quantity + qtyToAdd) * 100) / 100
        );
        const updated = [...prev];
        updated[existingIndex] = { ...existing, quantity: newQty };
        return updated;
      } else {
        const initialQty = Math.min(prod.stock_actual, qtyToAdd);
        return [...prev, { product: prod, quantity: initialQty }];
      }
    });

    sound.playBarcodeBeep();
  };

  const updateCartItemQty = (prodId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === prodId) {
            const step = item.product.permite_fraccion ? 0.25 : 1;
            const newQty = Math.max(
              0,
              Math.min(
                item.product.stock_actual,
                Math.round((item.quantity + delta * step) * 100) / 100
              )
            );
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeCartItem = (prodId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== prodId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Calculations
  const totalAmount = Math.round(
    cart.reduce((acc, item) => acc + item.quantity * item.product.precio_venta, 0) * 100
  ) / 100;
  const baseSubtotal = Math.round((totalAmount / 1.16) * 100) / 100;
  const ivaAmount = Math.round((totalAmount - baseSubtotal) * 100) / 100;
  const totalItemsCount = Math.round(cart.reduce((acc, i) => acc + i.quantity, 0) * 10) / 10;

  const handleOpenPayment = () => {
    if (cart.length === 0 || !activeSession || activeSession.estado !== 'abierta') {
      sound.playErrorBuzzer();
      return;
    }
    setIsPaymentOpen(true);
  };

  const handleSaleSuccess = (sale: Sale) => {
    setIsPaymentOpen(false);
    setCart([]);
    setCompletedSale(sale);
  };

  const handleCloseReceiptAndReset = () => {
    setCompletedSale(null);
    barcodeInputRef.current?.focus();
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col lg:flex-row gap-4 h-[calc(100vh-4.2rem)] min-h-[600px] overflow-hidden">
      {/* LEFT COLUMN: Product Catalog & Touch Barcode Grid */}
      <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {/* Top search & barcode toolbar */}
        <div className="p-3.5 border-b border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row gap-2.5">
          <form onSubmit={handleBarcodeSubmit} className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              ref={barcodeInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t.scanOrSearchPlaceholder}
              className="w-full pl-9 pr-12 py-2 text-xs bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
            />
            <button
              type="submit"
              className="absolute right-2 top-2 p-1 text-slate-400 hover:text-emerald-400"
              title="Escanear"
            >
              <Barcode className="w-4 h-4" />
            </button>
          </form>

          {/* Quick toggle favorites */}
          <button
            type="button"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors shrink-0 ${
              showFavoritesOnly
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.favorites}</span>
          </button>
        </div>

        {/* Categories scrollable pill selector */}
        <div className="px-3.5 py-2 border-b border-slate-800 bg-slate-950/60 overflow-x-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-emerald-600 text-white font-semibold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {t.allCategories}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {cat.nombre}
            </button>
          ))}
        </div>

        {/* Product Grid (Touch POS optimized) */}
        <div className="flex-1 p-3.5 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 auto-rows-max">
          {filteredProducts.map((prod) => {
            const isOutOfStock = prod.stock_actual <= 0;
            const isLowStock = prod.stock_actual <= prod.stock_minimo;

            return (
              <div
                key={prod.id}
                onClick={() => !isOutOfStock && addProductToCart(prod)}
                className={`relative flex flex-col justify-between p-3 rounded-xl border text-left transition-all select-none cursor-pointer ${
                  isOutOfStock
                    ? 'opacity-40 bg-slate-900 border-slate-800 pointer-events-none'
                    : 'bg-slate-800/90 hover:bg-slate-800 border-slate-700/80 hover:border-emerald-500/60 active:scale-[0.98]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <span className="text-[10px] font-mono font-medium text-slate-400 truncate">
                      {prod.sku}
                    </span>
                    {prod.permite_fraccion && (
                      <span className="text-[10px] text-amber-400 font-mono flex items-center gap-0.5">
                        <Scale className="w-3 h-3" /> Granel
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-semibold text-slate-100 line-clamp-2 leading-tight">
                    {prod.nombre}
                  </h4>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-700/60 flex items-end justify-between">
                  <div>
                    <span className="text-base font-extrabold font-mono text-emerald-400">
                      ${prod.precio_venta.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-0.5">/{prod.unidad_medida}</span>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                      isOutOfStock
                        ? 'bg-rose-950 text-rose-300'
                        : isLowStock
                        ? 'bg-amber-950 text-amber-300'
                        : 'bg-slate-700/60 text-slate-300'
                    }`}
                  >
                    {prod.stock_actual} {prod.unidad_medida}
                  </span>
                </div>
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-500">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No se encontraron productos coincidentes</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Cart / Ticket Terminal */}
      <div className="w-full lg:w-[380px] bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-md">
        {/* Cart Header */}
        <div className="p-3.5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">{t.activeCart}</h3>
            <span className="text-[11px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">
              {cart.length} {t.itemsCount}
            </span>
          </div>

          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-xs text-rose-400 hover:text-rose-300 p-1 flex items-center gap-1"
              title={t.clearCart}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 p-3 overflow-y-auto space-y-2">
          {cart.map((item) => (
            <div
              key={item.product.id}
              className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between gap-2"
            >
              <div className="flex-1 min-w-0">
                <h5 className="text-xs font-semibold text-slate-200 truncate">
                  {item.product.nombre}
                </h5>
                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 mt-0.5">
                  <span>${item.product.precio_venta.toFixed(2)} c/u</span>
                  <span>·</span>
                  <span className="text-emerald-400 font-bold">
                    ${(item.quantity * item.product.precio_venta).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Quantity controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => updateCartItemQty(item.product.id, -1)}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center font-mono font-bold text-xs text-white">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => updateCartItemQty(item.product.id, 1)}
                  disabled={item.quantity >= item.product.stock_actual}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-200 flex items-center justify-center transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeCartItem(item.product.id)}
                  className="w-7 h-7 rounded-lg text-slate-500 hover:text-rose-400 flex items-center justify-center transition-colors ml-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center py-16 text-slate-500">
              <ShoppingBag className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-xs font-medium text-slate-400">{t.emptyCart}</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">{t.emptyCartHint}</p>
            </div>
          )}
        </div>

        {/* Cart Totals & Settlement Action */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/95 space-y-2.5">
          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span>{t.subtotal}:</span>
              <span>${baseSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>{t.tax}:</span>
              <span>${ivaAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-white pt-1 border-t border-slate-800">
              <span>{t.total}:</span>
              <span className="text-xl text-emerald-400">${totalAmount.toFixed(2)} MXN</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenPayment}
            disabled={cart.length === 0 || !activeSession || activeSession.estado !== 'abierta'}
            className="w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg disabled:opacity-40 disabled:pointer-events-none"
          >
            <CreditCard className="w-4 h-4" />
            <span>
              {activeSession?.estado === 'abierta'
                ? `${t.chargeButton} (${totalItemsCount} Uds)`
                : 'Caja cerrada - Abrir turno en menú Caja'}
            </span>
          </button>
        </div>
      </div>

      {/* Bulk Weight Modal */}
      {weightModalProduct && (
        <BulkWeightModal
          product={weightModalProduct}
          lang={lang}
          onConfirm={(weightKg) => {
            addProductToCart(weightModalProduct, weightKg);
            setWeightModalProduct(null);
          }}
          onClose={() => setWeightModalProduct(null)}
        />
      )}

      {/* Payment Settlement Modal */}
      {isPaymentOpen && activeSession && (
        <PaymentModal
          total={totalAmount}
          items={cart.map((i) => ({
            producto_id: i.product.id,
            cantidad: i.quantity,
          }))}
          cajaSesionId={activeSession.id}
          cajeroId={currentUser.id}
          lang={lang}
          onSuccess={handleSaleSuccess}
          onClose={() => setIsPaymentOpen(false)}
        />
      )}

      {/* Thermal Ticket Modal */}
      {completedSale && (
        <ReceiptModal
          sale={completedSale}
          lang={lang}
          onNewSale={handleCloseReceiptAndReset}
          onClose={handleCloseReceiptAndReset}
        />
      )}
    </div>
  );
};
