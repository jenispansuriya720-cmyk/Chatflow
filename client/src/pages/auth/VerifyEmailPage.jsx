import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Sparkles, CheckCircle2, AlertCircle, Loader2, ArrowRight, Mail } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [loading, setLoading] = useState(Boolean(token));
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState(token ? '' : 'Verification token is missing from the link.');
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    const verifyToken = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`);
        if (isMounted) {
          if (res.data.success) {
            setVerified(true);
            if (user) {
              updateUser({ ...user, emailVerified: true });
            }
          } else {
            setError(res.data.message || 'Verification failed.');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.message || 'Verification token is invalid or has expired.'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    verifyToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    try {
      setResendLoading(true);
      const res = await api.post('/auth/resend-verification', { email: resendEmail.trim() });
      setResendMessage(
        res.data.message || 'If an account exists, a new verification email has been sent.'
      );
    } catch (err) {
      setResendMessage('Unable to send verification email. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 via-indigo-50/50 to-slate-200 dark:from-dark-base dark:via-dark-surface dark:to-dark-base select-none">
      <div className="w-full max-w-md bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-3xl p-8 shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Email Verification
          </h1>
          <p className="text-xs text-slate-500 dark:text-dark-muted max-w-xs">
            Confirming your email address for account security
          </p>
        </div>

        {loading ? (
          /* Loading State */
          <div className="py-8 flex flex-col items-center justify-center space-y-3 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600 dark:text-brand-400" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Verifying your email address with ChatFlow...
            </p>
          </div>
        ) : verified ? (
          /* Verified Success State */
          <div className="space-y-5 text-center py-2">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Email verified successfully!
              </h3>
              <p className="text-xs text-slate-500 dark:text-dark-muted">
                Your ChatFlow account is now verified. You can explore all messaging and community features.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate(user ? '/home' : '/login')}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center space-x-1.5"
            >
              <span>{user ? 'Go to ChatFlow' : 'Sign In Now'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          /* Error / Resend State */
          <div className="space-y-5">
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs rounded-2xl font-medium flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error || 'Verification token is invalid or has expired.'}</span>
            </div>

            <div className="border-t border-slate-100 dark:border-dark-border pt-4">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                Resend verification email
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-dark-muted mb-3">
                Enter your email address to receive a fresh verification link.
              </p>

              {resendMessage ? (
                <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl font-medium mb-3">
                  {resendMessage}
                </div>
              ) : (
                <form onSubmit={handleResend} className="space-y-2.5">
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={resendLoading}
                    className="w-full py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center space-x-1"
                  >
                    {resendLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Resend Verification Link</span>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-2 border-t border-slate-100 dark:border-dark-border text-xs text-slate-500 dark:text-dark-muted">
          <Link
            to="/login"
            className="font-semibold text-brand-600 dark:text-brand-400 hover:underline"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
