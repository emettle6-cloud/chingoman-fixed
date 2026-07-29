import { useState, useEffect, type ReactNode } from 'react';
import { X, Eye, EyeOff, MailCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';
}

export function AuthModal({ open, onClose, defaultMode = 'signin' }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [userType, setUserType] = useState('buyer');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationPending, setConfirmationPending] = useState(false);

  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);

  useEffect(() => {
    if (open) {
      setError(null);
      setPassword('');
      setShowPassword(false);
      setConfirmationPending(false);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (mode === 'signin') {
      const { error } = await signIn(email, password);
      if (error) setError(error);
      else onClose();
    } else {
      const { error, needsEmailConfirmation } = await signUp(email, password, name, userType);
      if (error) setError(error);
      else if (needsEmailConfirmation) setConfirmationPending(true);
      else onClose();
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">
            {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {confirmationPending ? (
          <div className="text-center py-4">
            <MailCheck className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
            <p className="font-semibold text-slate-900">Confirm your email to finish signing up</p>
            <p className="text-sm text-slate-500 mt-2">
              We've sent a confirmation link to <span className="font-medium text-slate-700">{email}</span>.
              Open it to activate your account, then come back and sign in.
            </p>
            <button
              onClick={() => { setConfirmationPending(false); setMode('signin'); }}
              className="mt-5 text-sm text-green-600 font-semibold hover:underline"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <Field label="Full Name">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                  placeholder="Kwame Mensah"
                />
              </Field>
              <Field label="I am a...">
                <select
                  value={userType}
                  onChange={(e) => setUserType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all bg-white"
                >
                  <option value="buyer">Direct Buyer — I want to buy a car</option>
                  <option value="marketer">Marketer — I list cars for buyers in China</option>
                </select>
              </Field>
            </>
          )}
          <Field label="Email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
              placeholder="you@example.com"
            />
          </Field>
          <Field label="Password">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 pr-11 rounded-lg border border-slate-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        )}

        {!confirmationPending && (
        <p className="text-center text-sm text-slate-500 mt-6">
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-green-600 font-semibold hover:underline"
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
