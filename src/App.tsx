import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SendView } from './components/SendView';
import { ReceiveView } from './components/ReceiveView';
import { TransfersView } from './components/TransfersView';
import { ArchitectureView } from './components/ArchitectureView';
import { AuthModal } from './components/AuthModal';
import { CreatedShareResult } from './types';
import { Radio, Shield, Zap, Lock, Terminal } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'send' | 'receive' | 'transfers' | 'architecture'>('send');
  const [selectedCodeForReceive, setSelectedCodeForReceive] = useState<string | undefined>(undefined);

  // Parse URL query parameter ?code=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      setSelectedCodeForReceive(code);
      setActiveTab('receive');
    }
  }, []);

  const handleQuickLookup = (code: string) => {
    setSelectedCodeForReceive(code);
    setActiveTab('receive');
  };

  const handleShareCreated = (share: CreatedShareResult) => {
    // Keep user on send view so they can see their modal and live receiver progress
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#080B11] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-gradient-to-b from-cyan-500/10 via-indigo-500/5 to-transparent blur-3xl" />
        <div className="absolute top-1/3 -right-40 h-[400px] w-[400px] rounded-full bg-purple-500/5 blur-3xl" />
      </div>

      {/* Main Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'receive') {
            setSelectedCodeForReceive(undefined);
          }
        }}
        onQuickLookup={handleQuickLookup}
      />

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 pb-16">
        {activeTab === 'send' && (
          <SendView
            onGoToTransfers={() => setActiveTab('transfers')}
            onShareCreatedGlobal={handleShareCreated}
          />
        )}

        {activeTab === 'receive' && (
          <ReceiveView initialCode={selectedCodeForReceive} />
        )}

        {activeTab === 'transfers' && (
          <TransfersView
            onSelectShareCode={(code) => {
              setSelectedCodeForReceive(code);
              setActiveTab('receive');
            }}
          />
        )}

        {activeTab === 'architecture' && <ArchitectureView />}
      </main>

      {/* Minimal Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] bg-slate-950/60 py-6 text-center text-xs text-slate-500 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between px-4 sm:px-6 gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-slate-400">DROP CODE</span>
            <span>— Universal Realtime File Sharing Platform</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              <span>Storage Provider: Local Disk (Live)</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Lock className="h-3 w-3 text-cyan-400" />
              <span>Atomic Download Protocol</span>
            </span>
          </div>
        </div>
      </footer>

      {/* Authentication Modal */}
      <AuthModal />
    </div>
  );
}
