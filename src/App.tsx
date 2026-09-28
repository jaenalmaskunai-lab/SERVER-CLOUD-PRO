import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';

// Views
import { DashboardView } from './views/DashboardView';
import { ResellersView } from './views/ResellersView';
import { CustomersView } from './views/CustomersView';
import { AccountsView } from './views/AccountsView';
import { ServersView } from './views/ServersView';
import { DnsView } from './views/DnsView';
import { PackagesView } from './views/PackagesView';
import { BillingView } from './views/BillingView';
import { SecurityView } from './views/SecurityView';
import { QueueView } from './views/QueueView';
import { WhiteLabelView } from './views/WhiteLabelView';
import { ApiDocsView } from './views/ApiDocsView';

// Global Modals
import { CreateAccountModal } from './components/modals/CreateAccountModal';
import { DepositBalanceModal } from './components/modals/DepositBalanceModal';

function MainApp() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Global modals
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono">Memuat Sistem Cloud PRO...</span>
      </div>
    );
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardView
            onNavigate={(view) => setCurrentView(view)}
            onOpenCreateAccount={() => setIsCreateAccountOpen(true)}
            onOpenDeposit={() => setIsDepositOpen(true)}
          />
        );
      case 'resellers':
        return <ResellersView />;
      case 'customers':
        return <CustomersView />;
      case 'accounts':
        return <AccountsView />;
      case 'servers':
        return <ServersView />;
      case 'dns':
        return <DnsView />;
      case 'packages':
        return <PackagesView />;
      case 'billing':
        return <BillingView />;
      case 'security':
        return <SecurityView />;
      case 'queue':
        return <QueueView />;
      case 'whitelabel':
        return <WhiteLabelView />;
      case 'api-docs':
        return <ApiDocsView />;
      default:
        return (
          <DashboardView
            onNavigate={(view) => setCurrentView(view)}
            onOpenCreateAccount={() => setIsCreateAccountOpen(true)}
            onOpenDeposit={() => setIsDepositOpen(true)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Header */}
        <Header
          currentView={currentView}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenDeposit={() => setIsDepositOpen(true)}
        />

        {/* Content Area */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          {renderCurrentView()}
        </main>
      </div>

      {/* Global Modals */}
      {isCreateAccountOpen && (
        <CreateAccountModal
          isOpen={isCreateAccountOpen}
          onClose={() => setIsCreateAccountOpen(false)}
          onSuccess={() => {
            setCurrentView('accounts');
          }}
        />
      )}

      {isDepositOpen && (
        <DepositBalanceModal
          isOpen={isDepositOpen}
          onClose={() => setIsDepositOpen(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <MainApp />
      </NotificationProvider>
    </AuthProvider>
  );
}
