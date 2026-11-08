import React, { useState, useEffect } from 'react';
import { Navbar } from './components/common/Navbar';
import { POSTerminal } from './components/pos/POSTerminal';
import { InventoryManager } from './components/inventory/InventoryManager';
import { CashDrawerManager } from './components/cash/CashDrawerManager';
import { ReportsDashboard } from './components/reports/ReportsDashboard';
import { DatabaseArchitectView } from './components/db-architect/DatabaseArchitectView';
import { Language } from './i18n/translations';
import { AuthService, CashRegisterService, DatabaseCoordinator } from './services/microservices';
import { User, CashRegisterSession } from './types/database';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'pos' | 'inventory' | 'cash' | 'reports' | 'database'>('pos');
  const [lang, setLang] = useState<Language>('es');
  const [, setDbVersion] = useState<number>(0);

  // Subscribe to reactive database changes
  useEffect(() => {
    const unsubscribe = DatabaseCoordinator.subscribe(() => {
      setDbVersion((v) => v + 1);
    });
    return () => unsubscribe();
  }, []);

  const currentUser: User = AuthService.getCurrentUser();
  const allUsers: User[] = AuthService.getUsers();
  const activeSession: CashRegisterSession | undefined = CashRegisterService.getActiveSession();

  const handleToggleLang = () => {
    setLang((prev) => (prev === 'es' ? 'en' : 'es'));
  };

  const handleSwitchUser = (userId: string) => {
    AuthService.switchUser(userId);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top 3-Zone Header */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        lang={lang}
        onToggleLang={handleToggleLang}
        currentUser={currentUser}
        users={allUsers}
        onSwitchUser={handleSwitchUser}
        activeSession={activeSession}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 flex flex-col overflow-x-hidden">
        {currentTab === 'pos' && (
          <POSTerminal
            currentUser={currentUser}
            activeSession={activeSession}
            lang={lang}
          />
        )}

        {currentTab === 'inventory' && (
          <InventoryManager
            currentUser={currentUser}
            lang={lang}
          />
        )}

        {currentTab === 'cash' && (
          <CashDrawerManager
            currentUser={currentUser}
            activeSession={activeSession}
            lang={lang}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsDashboard
            lang={lang}
          />
        )}

        {currentTab === 'database' && (
          <DatabaseArchitectView
            lang={lang}
          />
        )}
      </main>
    </div>
  );
}
