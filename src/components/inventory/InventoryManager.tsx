import React, { useState } from 'react';
import {
  Boxes,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  FileText,
  Search,
  AlertTriangle,
  Edit,
  Tag,
  Scale,
  Bell,
} from 'lucide-react';
import { Product, Category, User, KardexMovement } from '../../types/database';
import { Language, translations } from '../../i18n/translations';
import { CatalogInventoryService } from '../../services/microservices';
import { ProductModal } from './ProductModal';
import { StockMovementModal } from './StockMovementModal';
import { KardexViewer } from './KardexViewer';
import { InventoryAlertsNotificationPanel } from './InventoryAlertsNotificationPanel';

interface InventoryManagerProps {
  currentUser: User;
  lang: Language;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({ currentUser, lang }) => {
  const t = translations[lang];

  const [search, setSearch] = useState<string>('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [filterAlertOnly, setFilterAlertOnly] = useState<boolean>(false);

  // Notifications state
  const [showAlertsPanel, setShowAlertsPanel] = useState<boolean>(false);
  const [preselectedRestockProductId, setPreselectedRestockProductId] = useState<string | undefined>(undefined);
  const [preselectedRestockQty, setPreselectedRestockQty] = useState<number | undefined>(undefined);

  // Modals state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [movementMode, setMovementMode] = useState<'ENTRY' | 'EXIT' | null>(null);
  const [isKardexOpen, setIsKardexOpen] = useState<boolean>(false);

  const products: Product[] = CatalogInventoryService.getProducts();
  const categories: Category[] = CatalogInventoryService.getCategories();
  const kardex: KardexMovement[] = CatalogInventoryService.getKardex();
  const notifications = CatalogInventoryService.getStockNotifications();
  const unreadAlertsCount = CatalogInventoryService.getUnreadStockNotificationsCount();

  const filteredProducts = products.filter((p) => {
    if (selectedCat !== 'all' && p.categoria_id !== selectedCat) return false;
    if (filterAlertOnly && p.stock_actual > p.stock_minimo) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.nombre.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.codigo_barras.includes(q)
      );
    }
    return true;
  });

  const lowStockCount = products.filter((p) => p.stock_actual <= p.stock_minimo).length;

  const handleSaveProduct = (prodData: Partial<Product> & { nombre: string; precio_venta: number }) => {
    CatalogInventoryService.saveProduct(prodData);
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  const handleRestockFromAlert = (productId: string, suggestedQty: number) => {
    setPreselectedRestockProductId(productId);
    setPreselectedRestockQty(suggestedQty);
    setMovementMode('ENTRY');
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5 overflow-y-auto">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Boxes className="w-5 h-5 text-emerald-400" />
            <span>{t.inventoryTitle}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">{t.inventorySubtitle}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Stock Alerts Notification Toggle Button */}
          <button
            type="button"
            onClick={() => setShowAlertsPanel(!showAlertsPanel)}
            className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              showAlertsPanel
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 ring-1 ring-amber-500/40 shadow-xs'
                : unreadAlertsCount > 0
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/40 hover:bg-amber-500/20'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title={t.stockAlertsTitle}
          >
            <Bell className={`w-4 h-4 ${unreadAlertsCount > 0 ? 'text-amber-400 animate-bounce' : 'text-slate-400'}`} />
            <span>{t.stockAlertsTitle}</span>
            {unreadAlertsCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-slate-950 rounded-full font-mono">
                {unreadAlertsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setPreselectedRestockProductId(undefined);
              setPreselectedRestockQty(undefined);
              setMovementMode('ENTRY');
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-600/30 transition-colors"
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>{t.stockEntry}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPreselectedRestockProductId(undefined);
              setPreselectedRestockQty(undefined);
              setMovementMode('EXIT');
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-600/20 text-rose-400 border border-rose-500/40 hover:bg-rose-600/30 transition-colors"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>{t.stockExit}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsKardexOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-colors"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>{t.kardexAudit}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingProduct(null);
              setIsProductModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm ml-auto sm:ml-0"
          >
            <Plus className="w-4 h-4" />
            <span>{t.newProduct}</span>
          </button>
        </div>
      </div>

      {/* Stock Threshold Alerts Notification Center */}
      {showAlertsPanel && (
        <InventoryAlertsNotificationPanel
          notifications={notifications}
          lang={lang}
          onRestock={handleRestockFromAlert}
          onClose={() => setShowAlertsPanel(false)}
        />
      )}

      {/* Filter and stats row */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchProduct}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
          />
        </div>

        {/* Category selector */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Todas las Categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>

          {/* Low Stock Alert Toggle */}
          <button
            type="button"
            onClick={() => setFilterAlertOnly(!filterAlertOnly)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
              filterAlertOnly
                ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Bajo Stock ({lowStockCount})</span>
          </button>
        </div>
      </div>

      {/* Products Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider bg-slate-950/40">
                <th className="py-3 px-4">SKU / Barras</th>
                <th className="py-3 px-4">Descripción del Producto</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4 text-right">Costo</th>
                <th className="py-3 px-4 text-right">Precio Venta</th>
                <th className="py-3 px-4 text-right">Margen</th>
                <th className="py-3 px-4 text-right">Stock Actual</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredProducts.map((p) => {
                const cat = categories.find((c) => c.id === p.categoria_id)?.nombre || 'General';
                const isCritical = p.stock_actual <= p.stock_minimo * 0.3;
                const isLow = p.stock_actual <= p.stock_minimo;

                return (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      <div className="font-bold text-slate-300">{p.sku}</div>
                      <div className="text-[10px] text-slate-500">{p.codigo_barras}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-100 max-w-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{p.nombre}</span>
                        {p.permite_fraccion && (
                          <span title="Granel / Báscula">
                            <Scale className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          </span>
                        )}
                        {p.es_favorito && (
                          <span title="Producto Frecuente / Favorito">
                            <Tag className="w-3 h-3 text-emerald-400 shrink-0" />
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        Ubicación: {p.ubicacion_pasillo}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">{cat}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-400">
                      ${p.precio_costo.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-400">
                      ${p.precio_venta.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">
                      {p.margen_pct}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-extrabold whitespace-nowrap">
                      <span className={isCritical ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-slate-100'}>
                        {p.stock_actual}
                      </span>{' '}
                      <span className="text-[10px] font-normal text-slate-400 font-sans">
                        {p.unidad_medida}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {isCritical ? (
                        <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded">
                          CRÍTICO
                        </span>
                      ) : isLow ? (
                        <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded">
                          BAJO STOCK
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-medium text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded">
                          ÓPTIMO
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                      {isLow && (
                        <button
                          type="button"
                          onClick={() =>
                            handleRestockFromAlert(
                              p.id,
                              Math.max(1, Math.round(p.stock_minimo * 2 - p.stock_actual))
                            )
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 rounded-lg transition-colors"
                          title={`${t.restockAction} (${t.reorderSuggestion}: ${Math.max(1, Math.round(p.stock_minimo * 2 - p.stock_actual))} ${p.unidad_medida})`}
                        >
                          <ArrowDownRight className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{t.restockAction}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProduct(p);
                          setIsProductModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition-colors inline-flex items-center"
                        title={t.edit}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="py-16 text-center text-slate-500 text-xs">
            No se encontraron productos que coincidan con la búsqueda.
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && (
        <ProductModal
          product={editingProduct}
          categories={categories}
          lang={lang}
          onSave={handleSaveProduct}
          onClose={() => {
            setIsProductModalOpen(false);
            setEditingProduct(null);
          }}
        />
      )}

      {/* Stock Entry / Exit Modal */}
      {movementMode && (
        <StockMovementModal
          mode={movementMode}
          products={products}
          currentUser={currentUser}
          lang={lang}
          initialProductId={preselectedRestockProductId}
          initialQuantity={preselectedRestockQty}
          onSuccess={() => {
            setMovementMode(null);
            setPreselectedRestockProductId(undefined);
            setPreselectedRestockQty(undefined);
          }}
          onClose={() => {
            setMovementMode(null);
            setPreselectedRestockProductId(undefined);
            setPreselectedRestockQty(undefined);
          }}
        />
      )}

      {/* Kardex Audit Modal */}
      {isKardexOpen && (
        <KardexViewer
          kardex={kardex}
          lang={lang}
          onClose={() => setIsKardexOpen(false)}
        />
      )}
    </div>
  );
};
