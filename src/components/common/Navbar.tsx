import React from 'react';
import {
  Store,
  ShoppingCart,
  Boxes,
  Landmark,
  BarChart3,
  Database,
  Globe,
  UserCheck,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { Language, translations } from '../../i18n/translations';
import { User, CashRegisterSession } from '../../types/database';
import { CatalogInventoryService } from '../../services/microservices';

interface NavbarProps {
  currentTab: 'pos' | 'inventory' | 'cash' | 'reports' | 'database';
  onSelectTab: (tab: 'pos' | 'inventory' | 'cash' | 'reports' | 'database') => void;
  lang: Language;
  onToggleLang: () => void;
  currentUser: User;
  users: User[];
  onSwitchUser: (userId: string) => void;
  activeSession?: CashRegisterSession;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  lang,
  onToggleLang,
  currentUser,
  users,
  onSwitchUser,
  activeSession,
}) => {
  const t = translations[lang];
  const [userDropdownOpen, setUserDropdownOpen] = React.useState(false);

  const unreadStockAlerts = CatalogInventoryService.getUnreadStockNotificationsCount();

  const navItems = [
    { id: 'pos' as const, label: t.navPos, icon: ShoppingCart },
    { id: 'inventory' as const, label: t.navInventory, icon: Boxes, badge: unreadStockAlerts },
    { id: 'cash' as const, label: t.navCash, icon: Landmark },
    { id: 'reports' as const, label: t.navReports, icon: BarChart3 },
    { id: 'database' as const, label: t.navDatabase, icon: Database },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40 select-none">
      {/* Strict 3-Zone Top Bar Contract */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single text wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm">
            <Store className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
              {t.appName}
            </span>
            <span className="text-[10px] text-slate-400 font-mono tracking-wider -mt-1 hidden sm:block">
              ENGINE v3.2 · ACID RELATIONAL
            </span>
          </div>
        </div>

        {/* Zone 2: 4-5 single-line clean navigation links */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 relative ${
                  isActive
                    ? 'bg-slate-800 text-emerald-400 font-semibold shadow-inner'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-full bg-amber-500 text-slate-950 ml-0.5">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action cluster (User switcher, Register state, Language) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Active register session indicator */}
          <div
            onClick={() => onSelectTab('cash')}
            className="cursor-pointer hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs"
            title={activeSession?.estado === 'abierta' ? 'Caja en operación' : 'Caja cerrada'}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                activeSession?.estado === 'abierta' ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
            <span className="text-[11px] font-mono text-slate-300">
              {activeSession?.estado === 'abierta' ? t.currentShift : t.shiftClosed}
            </span>
          </div>

          {/* User selector dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 transition-colors text-xs text-slate-200"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-medium max-w-[110px] truncate">{currentUser.nombre}</span>
              <span className="text-[10px] uppercase font-mono px-1 py-0.5 rounded bg-slate-700 text-slate-300">
                {currentUser.rol}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {userDropdownOpen && (
              <div
                className="absolute right-0 mt-1 w-56 rounded-lg bg-slate-800 border border-slate-700 shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-1"
                onClick={() => setUserDropdownOpen(false)}
              >
                <div className="px-3 py-1.5 border-b border-slate-700/70 text-[11px] text-slate-400 font-medium">
                  {t.logout}
                </div>
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => onSwitchUser(u.id)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-700/60 transition-colors ${
                      u.id === currentUser.id ? 'bg-slate-700/40 text-emerald-400 font-semibold' : 'text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <UserCheck className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{u.nombre}</span>
                    </div>
                    <span className="text-[10px] uppercase font-mono text-slate-400 ml-2 shrink-0">
                      {u.rol}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Language toggle */}
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700/60 transition-colors text-xs font-mono text-slate-300 font-bold"
            title="Cambiar Idioma / Switch Language"
          >
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>{lang.toUpperCase()}</span>
          </button>
        </div>
      </div>

      {/* Mobile navigation row for phone viewports */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800 px-2 py-1.5 bg-slate-900/95 overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded text-[10px] font-medium transition-colors shrink-0 ${
                isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
