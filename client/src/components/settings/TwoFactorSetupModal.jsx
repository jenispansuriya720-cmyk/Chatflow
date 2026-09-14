import React, { useState } from 'react';
import {
  Smartphone,
  ShieldCheck,
  KeyRound,
  Copy,
  Check,
  Download,
  AlertTriangle,
  X,
  QrCode,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../common/Toast';

const TwoFactorSetupModal = ({
  isOpen,
  onClose,
  is2FAEnabled,
  on2FAUpdated,
}) => {
  const { addToast } = useToast();
  const [step, setStep] = useState(is2FAEnabled ? 'manage' : 'password'); // 'password' | 'setup' | 'manage'
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  if (!isOpen) return null;

  const secretKey = 'CF-AUTH-9428-SEC-7291';

  const handleEnable = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      addToast('Please enter your password to enable 2FA', 'warning');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/settings/security/2fa', {
        enabled: true,
        method: 'authenticator',
        password,
      });

      if (res.data.success) {
        setRecoveryCodes(res.data.recoveryCodes || []);
        setStep('setup');
        on2FAUpdated(true, res.data.recoveryCodes || []);
        addToast('Two-Factor Authentication is now enabled!', 'success');
      }
    } catch (err) {
      addToast(
        err.response?.data?.message || 'Failed to enable 2FA. Verify your password.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      addToast('Please enter your password to disable 2FA', 'warning');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post('/settings/security/2fa', {
        enabled: false,
        password,
      });

      if (res.data.success) {
        on2FAUpdated(false, []);
        addToast('Two-Factor Authentication has been disabled', 'info');
        onClose();
      }
    } catch (err) {
      addToast(
        err.response?.data?.message || 'Failed to disable 2FA. Verify your password.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    setCopiedCodes(true);
    addToast('Recovery codes copied to clipboard', 'info');
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleDownloadCodes = () => {
    const element = document.createElement('a');
    const file = new Blob([recoveryCodes.join('\n')], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'chatflow-recovery-codes.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    addToast('Recovery codes downloaded', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-dark-border">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {is2FAEnabled ? 'Manage Two-Factor (2FA)' : 'Enable Two-Factor Auth'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-dark-muted">
                Authenticator App (Google Authenticator, Authy, 1Password)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-card transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step 1: Enable Password Confirmation */}
        {!is2FAEnabled && step === 'password' && (
          <form onSubmit={handleEnable} className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              When 2FA is active, signing in will require a one-time verification code from
              your authenticator app in addition to your password.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                <span>Confirm Current Password</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your account password"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-dark-border text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-card transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Set Up Authenticator'}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Show QR, Key, and Recovery Codes */}
        {!is2FAEnabled && step === 'setup' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center space-x-3">
              <ShieldCheck className="w-5 h-5 flex-shrink-0" />
              <p className="text-xs font-semibold">
                2FA is successfully enabled! Save your recovery codes below.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border text-center space-y-3">
              <div className="w-32 h-32 mx-auto bg-white rounded-xl border border-slate-300 p-2 flex items-center justify-center shadow-xs">
                <QrCode className="w-24 h-24 text-slate-900" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Manual Setup Secret Key:</p>
                <div className="flex items-center justify-center space-x-2 mt-1">
                  <code className="text-xs font-mono font-bold bg-white dark:bg-dark-surface px-2.5 py-1 rounded-lg border border-slate-200 dark:border-dark-border">
                    {secretKey}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(secretKey);
                      setCopiedKey(true);
                      setTimeout(() => setCopiedKey(false), 2000);
                    }}
                    className="p-1 text-slate-400 hover:text-brand-500"
                    title="Copy Secret"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Backup Recovery Codes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Backup Recovery Codes (8)
                </p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopyCodes}
                    className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center space-x-1"
                  >
                    {copiedCodes ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCodes ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={handleDownloadCodes}
                    className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center space-x-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl font-mono text-[11px] text-slate-700 dark:text-slate-300 text-center">
                {recoveryCodes.map((c, i) => (
                  <span key={i} className="py-0.5 bg-white dark:bg-dark-surface rounded border border-slate-200/50 dark:border-dark-border">
                    {c}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-slate-400">
                Keep these codes safe. Each code can be used once if you lose access to your device.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-opacity shadow-xs"
              >
                I Have Saved My Codes
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Manage / Disable Existing 2FA */}
        {is2FAEnabled && (
          <form onSubmit={handleDisable} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed">
                Disabling Two-Factor Authentication removes the extra security layer from your account.
                Enter your password to confirm.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                <span>Confirm Password</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your account password"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-dark-border text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-card transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
              >
                {loading ? 'Disabling...' : 'Turn Off 2FA'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default TwoFactorSetupModal;
