import React, { useState, useRef, useEffect } from 'react';
import {
  Radio,
  ArrowUpRight,
  ArrowDownLeft,
  Activity,
  ShieldCheck,
  Search,
  User as UserIcon,
  LogIn,
  LogOut,
  ChevronDown,
  Layers,
  Sparkles,
  Settings,
  Save,
  X,
} from 'lucide-react';
import { formatShareCode } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  activeTab: 'send' | 'receive' | 'transfers' | 'architecture';
  setActiveTab: (tab: 'send' | 'receive' | 'transfers' | 'architecture') => void;
  onQuickLookup?: (code: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, onQuickLookup }) => {
  const [quickCode, setQuickCode] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [profileForm, setProfileForm] = useState({ username: '', name: '', avatarColor: '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '' });
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { user, userStats, openAuthModal, logout, updateProfile, changePassword, deleteAccount } = useAuth();

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickCode.trim() && onQuickLookup) {
      onQuickLookup(quickCode.trim());
      setQuickCode('');
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-slate-950/85 backdrop-blur-xl transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button
            id="brand-home-btn"
            onClick={() => setActiveTab('send')}
            className="flex items-center gap-2.5 text-left transition-opacity hover:opacity-90"
          >
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-cyan-500 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-slate-950">
                <Radio className="h-4 w-4 text-cyan-400" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-base font-black tracking-wider text-white">DROP CODE</span>
                <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-cyan-400 border border-cyan-500/20">
                  REALTIME
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Universal Real-Time File Sharing</p>
            </div>
          </button>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1 rounded-xl border border-white/[0.08] bg-slate-900/60 p-1">
          <button
            id="nav-tab-send"
            onClick={() => setActiveTab('send')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'send'
                ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>Send File</span>
          </button>

          <button
            id="nav-tab-receive"
            onClick={() => setActiveTab('receive')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'receive'
                ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <ArrowDownLeft className="h-3.5 w-3.5" />
            <span>Receive File</span>
          </button>

          <button
            id="nav-tab-transfers"
            onClick={() => setActiveTab('transfers')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'transfers'
                ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Transfers & Activity</span>
          </button>

          <button
            id="nav-tab-architecture"
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'architecture'
                ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Architecture & DB</span>
          </button>
        </nav>

        {/* Right Section: Quick Lookup + User Profile Controls */}
        <div className="flex items-center gap-2.5">
          {/* Quick Code Lookup */}
          <form onSubmit={handleQuickSubmit} className="relative hidden sm:flex items-center">
            <input
              id="header-quick-code-input"
              type="text"
              placeholder="Code (e.g. 8K4P-72MX)"
              value={quickCode}
              onChange={(e) => setQuickCode(formatShareCode(e.target.value))}
              maxLength={9}
              className="w-36 md:w-44 rounded-xl border border-white/[0.1] bg-slate-900/80 px-2.5 py-1.5 pl-7 font-mono text-xs text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
            <Search className="absolute left-2 h-3.5 w-3.5 text-slate-500" />
            {quickCode && (
              <button
                id="header-quick-submit-btn"
                type="submit"
                className="absolute right-1 rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300 hover:bg-cyan-500/30"
              >
                GO
              </button>
            )}
          </form>

          {/* User Auth Section */}
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                id="user-profile-menu-btn"
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 pl-2 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-slate-200 transition-all hover:bg-slate-800/80"
              >
                <div
                  className={`w-7 h-7 rounded-lg bg-gradient-to-br ${
                    user.avatarColor || 'from-cyan-500 to-blue-600'
                  } flex items-center justify-center text-white font-bold text-xs shadow-sm`}
                >
                  {user.name ? user.name[0].toUpperCase() : user.username[0].toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-slate-200 leading-tight max-w-[90px] truncate">
                    {user.name || user.username}
                  </div>
                  <div className="text-[10px] text-cyan-400 font-mono leading-none">
                    @{user.username}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Dropdown Menu */}
              {userDropdownOpen && (
                <div
                  id="user-profile-dropdown"
                  className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="p-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl bg-gradient-to-br ${
                          user.avatarColor || 'from-cyan-500 to-blue-600'
                        } flex items-center justify-center text-white font-bold text-sm`}
                      >
                        {user.name ? user.name[0].toUpperCase() : user.username[0].toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="text-xs font-bold text-white truncate">{user.name}</h4>
                        <p className="text-[11px] text-cyan-400 font-mono">@{user.username}</p>
                        <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                      </div>
                    </div>

                    {/* Personal Stats */}
                    {userStats && (
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-800/60 text-center">
                        <div className="p-1.5 bg-slate-950/60 rounded-lg border border-slate-800/60">
                          <div className="text-xs font-bold text-cyan-400">{userStats.activeShares}</div>
                          <div className="text-[10px] text-slate-400">Active Shares</div>
                        </div>
                        <div className="p-1.5 bg-slate-950/60 rounded-lg border border-slate-800/60">
                          <div className="text-xs font-bold text-emerald-400">{userStats.totalDownloads}</div>
                          <div className="text-[10px] text-slate-400">Downloads</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="py-1 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        setProfileForm({ username: user.username, name: user.name, avatarColor: user.avatarColor });
                        setPasswordForm({ current: '', next: '' });
                        setSettingsError('');
                        setSettingsSaved(false);
                        setSettingsOpen(true);
                      }}
                      className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Profile settings</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        setActiveTab('transfers');
                      }}
                      className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      <span>My Shared Files</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        setActiveTab('send');
                      }}
                      className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      <span>Create New Transfer</span>
                    </button>
                  </div>

                  <div className="pt-1 mt-1 border-t border-slate-800/80">
                    <button
                      id="logout-btn"
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full px-3 py-2 text-left text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                id="header-login-btn"
                type="button"
                onClick={() => openAuthModal('login')}
                className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5 text-cyan-400" />
                <span>Sign In</span>
              </button>

              <button
                id="header-signup-btn"
                type="button"
                onClick={() => openAuthModal('signup')}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-lg shadow-sm shadow-cyan-500/20 flex items-center gap-1.5 transition-all"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Sign Up</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {settingsOpen && user && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}>
          <form className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl" onSubmit={async (event) => {
            event.preventDefault();
            setSettingsError('');
            setSettingsSaved(false);
            const result = await updateProfile(profileForm);
            if (!result.success) { setSettingsError(result.error || 'Could not save changes'); return; }
            if (passwordForm.current || passwordForm.next) {
              const passwordResult = await changePassword(passwordForm.current, passwordForm.next);
              if (!passwordResult.success) { setSettingsError(passwordResult.error || 'Could not change password'); return; }
              setPasswordForm({ current: '', next: '' });
            }
            setSettingsSaved(true);
          }}>
            <div className="mb-5 flex items-center justify-between">
              <div><h2 className="text-lg font-bold text-white">Profile settings</h2><p className="text-xs text-slate-400">Update how your account appears.</p></div>
              <button type="button" aria-label="Close profile settings" onClick={() => setSettingsOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4">
              <label className="block text-xs text-slate-300">Display name<input value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500" /></label>
              <label className="block text-xs text-slate-300">Username<input value={profileForm.username} onChange={(event) => setProfileForm({ ...profileForm, username: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500" /></label>
              <div><span className="text-xs text-slate-300">Avatar color</span><div className="mt-2 flex flex-wrap gap-2">{['from-cyan-500 to-blue-600','from-emerald-400 to-teal-600','from-purple-500 to-indigo-600','from-rose-500 to-pink-600','from-amber-400 to-orange-500','from-fuchsia-500 to-pink-500'].map((color) => <button key={color} type="button" aria-label={`Select ${color} avatar`} onClick={() => setProfileForm({ ...profileForm, avatarColor: color })} className={`h-8 w-8 rounded-lg bg-gradient-to-br ${color} ${profileForm.avatarColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''}`} />)}</div></div>
              <div className="border-t border-slate-800 pt-4"><p className="mb-2 text-xs font-semibold text-slate-300">Change password</p><div className="grid gap-2 sm:grid-cols-2"><input type="password" placeholder="Current password" value={passwordForm.current} onChange={(event) => setPasswordForm({ ...passwordForm, current: event.target.value })} className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500" /><input type="password" placeholder="New password (8+ chars)" value={passwordForm.next} onChange={(event) => setPasswordForm({ ...passwordForm, next: event.target.value })} className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500" /></div></div>
            </div>
            {settingsError && <p className="mt-4 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{settingsError}</p>}
            {settingsSaved && <p className="mt-4 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">Profile updated successfully.</p>}
            <button type="submit" className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"><Save className="h-4 w-4" />Save changes</button>
            <button type="button" onClick={async () => { if (window.confirm('Delete your account permanently?')) { const result = await deleteAccount(); if (!result.success) setSettingsError(result.error || 'Could not delete account'); else setSettingsOpen(false); } }} className="mt-3 w-full text-xs text-rose-400 hover:text-rose-300">Delete account</button>
          </form>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <div className="flex lg:hidden border-t border-white/[0.06] bg-slate-950/95 px-2 py-1.5 justify-around">
        <button
          onClick={() => setActiveTab('send')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[11px] font-medium ${
            activeTab === 'send' ? 'text-cyan-400' : 'text-slate-400'
          }`}
        >
          <ArrowUpRight className="h-4 w-4" />
          <span>Send</span>
        </button>
        <button
          onClick={() => setActiveTab('receive')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[11px] font-medium ${
            activeTab === 'receive' ? 'text-cyan-400' : 'text-slate-400'
          }`}
        >
          <ArrowDownLeft className="h-4 w-4" />
          <span>Receive</span>
        </button>
        <button
          onClick={() => setActiveTab('transfers')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[11px] font-medium ${
            activeTab === 'transfers' ? 'text-cyan-400' : 'text-slate-400'
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>Activity</span>
        </button>
        <button
          onClick={() => setActiveTab('architecture')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[11px] font-medium ${
            activeTab === 'architecture' ? 'text-cyan-400' : 'text-slate-400'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Specs</span>
        </button>
      </div>
    </header>
  );
};
