import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, authModalTab, closeAuthModal, login, signup } = useAuth();
  const [tab, setTab] = useState<'login' | 'signup'>(authModalTab);

  // Form states
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & Validation
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Real-time username check state
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
  }>({
    checking: false,
    available: null,
    message: '',
  });

  // Sync tab with context when modal opens
  useEffect(() => {
    if (isAuthModalOpen) {
      setTab(authModalTab);
      setFormError(null);
      setFormSuccess(null);
    }
  }, [isAuthModalOpen, authModalTab]);

  // Real-time username check debouncer
  useEffect(() => {
    if (tab !== 'signup' || !username.trim() || username.trim().length < 3) {
      setUsernameStatus({ checking: false, available: null, message: '' });
      return;
    }

    const timer = setTimeout(async () => {
      setUsernameStatus({ checking: true, available: null, message: 'Checking availability...' });
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username.trim())}`);
        const data = await res.json();
        setUsernameStatus({
          checking: false,
          available: data.available,
          message: data.message,
        });
      } catch {
        setUsernameStatus({ checking: false, available: null, message: 'Could not verify username' });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [username, tab]);

  // Password strength calculator
  const calculatePasswordStrength = (pass: string) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pass) || /[A-Z]/.test(pass)) score += 1;
    return score;
  };

  const passwordScore = calculatePasswordStrength(password);
  const passwordsMatch = tab === 'signup' && confirmPassword.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setIsSubmitting(true);

    try {
      if (tab === 'login') {
        const identifier = email.trim(); // can be email or username
        if (!identifier || !password) {
          setFormError('Please fill in your email/username and password');
          setIsSubmitting(false);
          return;
        }

        const res = await login(identifier, password);
        if (!res.success) {
          setFormError(res.error || 'Invalid credentials');
          setIsSubmitting(false);
        } else {
          setFormSuccess('Successfully signed in!');
        }
      } else {
        // Signup
        if (!email.trim() || !username.trim() || !password) {
          setFormError('Please fill in all required fields');
          setIsSubmitting(false);
          return;
        }

        if (password.length < 6) {
          setFormError('Password must be at least 6 characters');
          setIsSubmitting(false);
          return;
        }

        if (password !== confirmPassword) {
          setFormError('Passwords do not match');
          setIsSubmitting(false);
          return;
        }

        if (usernameStatus.available === false) {
          setFormError('Please choose an available username');
          setIsSubmitting(false);
          return;
        }

        const res = await signup(email.trim(), username.trim(), password, name.trim() || undefined);
        if (!res.success) {
          setFormError(res.error || 'Registration failed');
          setIsSubmitting(false);
        } else {
          setFormSuccess('Account created! Welcome to Drop Code.');
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred');
      setIsSubmitting(false);
    }
  };

  const handleFillDemo = () => {
    setTab('login');
    setEmail('alex@dropcode.io');
    setPassword('password123');
    setFormError(null);
  };

  if (!isAuthModalOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="auth-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeAuthModal();
        }}
      >
        <motion.div
          id="auth-modal-container"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Decorative ambient gradient */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />

          {/* Close button */}
          <button
            id="auth-modal-close-btn"
            type="button"
            onClick={closeAuthModal}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header & Tabs */}
          <div className="p-6 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Drop Code Account</h2>
            </div>
            <p className="text-xs text-slate-400">
              Manage your transfers, own your links, track real-time downloads, and access your personal files anytime.
            </p>

            {/* Tab switch buttons */}
            <div className="grid grid-cols-2 p-1 mt-5 bg-slate-950/70 border border-slate-800/80 rounded-xl">
              <button
                id="auth-tab-login-btn"
                type="button"
                onClick={() => {
                  setTab('login');
                  setFormError(null);
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  tab === 'login'
                    ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700/60'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                id="auth-tab-signup-btn"
                type="button"
                onClick={() => {
                  setTab('signup');
                  setFormError(null);
                }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  tab === 'signup'
                    ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700/60'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Create Account
              </button>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
            {formError && (
              <div
                id="auth-form-error-banner"
                className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-xs text-rose-300"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div
                id="auth-form-success-banner"
                className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300"
              >
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                <span>{formSuccess}</span>
              </div>
            )}

            {/* SIGNUP SPECIFIC: Full Name */}
            {tab === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Display Name <span className="text-slate-500">(optional)</span>
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    id="signup-name-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Email / Username field */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                {tab === 'login' ? 'Email or Username' : 'Email Address'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  id="auth-email-input"
                  type={tab === 'signup' ? 'email' : 'text'}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={tab === 'login' ? 'alex@dropcode.io or alex_dev' : 'you@example.com'}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-colors"
                />
              </div>
            </div>

            {/* SIGNUP SPECIFIC: Username with Realtime Availability Checker */}
            {tab === 'signup' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">Choose Username</label>
                  {usernameStatus.checking && (
                    <span className="text-[11px] text-cyan-400 animate-pulse">Checking...</span>
                  )}
                  {!usernameStatus.checking && usernameStatus.available === true && (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Available
                    </span>
                  )}
                  {!usernameStatus.checking && usernameStatus.available === false && (
                    <span className="text-[11px] text-rose-400">Unavailable</span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs text-slate-500 font-mono">@</span>
                  <input
                    id="signup-username-input"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    placeholder="unique_username"
                    className={`w-full pl-8 pr-10 py-2.5 bg-slate-950/60 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors ${
                      usernameStatus.available === true
                        ? 'border-emerald-500/50 focus:border-emerald-500'
                        : usernameStatus.available === false
                        ? 'border-rose-500/50 focus:border-rose-500'
                        : 'border-slate-800 focus:border-cyan-500/60'
                    }`}
                  />
                  <div className="absolute right-3 top-3">
                    {usernameStatus.available === true && <Check className="w-4 h-4 text-emerald-400" />}
                    {usernameStatus.available === false && <AlertCircle className="w-4 h-4 text-rose-400" />}
                  </div>
                </div>
                {usernameStatus.message && (
                  <p
                    className={`text-[10px] mt-1 ${
                      usernameStatus.available === true ? 'text-emerald-400/80' : 'text-rose-400/80'
                    }`}
                  >
                    {usernameStatus.message}
                  </p>
                )}
              </div>
            )}

            {/* Password input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-300">Password</label>
                {tab === 'signup' && password && (
                  <span className="text-[11px] font-medium text-slate-400">
                    {passwordScore <= 1 && <span className="text-rose-400">Weak</span>}
                    {passwordScore === 2 && <span className="text-amber-400">Fair</span>}
                    {passwordScore === 3 && <span className="text-cyan-400">Good</span>}
                    {passwordScore >= 4 && <span className="text-emerald-400">Strong</span>}
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  id="auth-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/40 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength meter bar */}
              {tab === 'signup' && password.length > 0 && (
                <div className="grid grid-cols-4 gap-1 mt-1.5">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`h-1 rounded-full transition-all ${
                        passwordScore >= step
                          ? step === 1
                            ? 'bg-rose-500'
                            : step === 2
                            ? 'bg-amber-500'
                            : step === 3
                            ? 'bg-cyan-500'
                            : 'bg-emerald-500'
                          : 'bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* SIGNUP SPECIFIC: Confirm Password */}
            {tab === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    id="signup-confirm-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className={`w-full pl-10 pr-10 py-2.5 bg-slate-950/60 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors ${
                      confirmPassword && !passwordsMatch
                        ? 'border-rose-500/50'
                        : confirmPassword && passwordsMatch
                        ? 'border-emerald-500/50'
                        : 'border-slate-800 focus:border-cyan-500/60'
                    }`}
                  />
                  <div className="absolute right-3 top-3">
                    {confirmPassword && passwordsMatch && <Check className="w-4 h-4 text-emerald-400" />}
                    {confirmPassword && !passwordsMatch && <AlertCircle className="w-4 h-4 text-rose-400" />}
                  </div>
                </div>
              </div>
            )}

            {/* Submit button */}
            <button
              id="auth-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{tab === 'login' ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Quick 1-Click Demo Fill */}
            <div className="pt-2 border-t border-slate-800/80">
              <button
                id="auth-fill-demo-btn"
                type="button"
                onClick={handleFillDemo}
                className="w-full py-2 px-3 bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 text-xs font-medium rounded-lg border border-slate-700/60 flex items-center justify-center gap-2 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Quick Test: Fill Demo Account (alex@dropcode.io)</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
