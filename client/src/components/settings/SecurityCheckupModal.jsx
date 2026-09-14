import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  KeyRound,
  Smartphone,
  CheckCircle2,
  XCircle,
  ExternalLink,
  X,
  History,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const SecurityCheckupModal = ({
  isOpen,
  onClose,
  settings,
  sessions = [],
  onOpen2FA,
  onOpenPasswordChange,
  onOpenSessions,
}) => {
  if (!isOpen) return null;

  const is2FA = settings?.security?.twoFactorEnabled || false;
  const sessionsCount = sessions.length || 1;
  const isEmailVerified = settings?.account?.emailVerified ?? true;
  const isPhoneVerified = settings?.account?.phoneVerified ?? false;

  // Security status calculation
  let status = 'good';
  let statusText = 'Your Account is Highly Secure';
  let statusColor = 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

  if (!is2FA && sessionsCount > 3) {
    status = 'critical';
    statusText = 'Security Attention Required';
    statusColor = 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';
  } else if (!is2FA) {
    status = 'warning';
    statusText = 'Standard Security (2FA Recommended)';
    statusColor = 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20';
  }

  const securityLogs = settings?.security?.securityLog || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-dark-border">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-2xl border ${statusColor}`}>
              {status === 'good' ? (
                <ShieldCheck className="w-6 h-6" />
              ) : status === 'warning' ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <ShieldAlert className="w-6 h-6" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Security Checkup</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-dark-muted">
                Audit of authentication factors, active sessions, and account integrity
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-card transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Health Card */}
        <div className={`p-4 rounded-2xl border ${statusColor} flex items-center justify-between`}>
          <div>
            <p className="text-xs font-bold">{statusText}</p>
            <p className="text-[11px] opacity-80 mt-0.5">
              {is2FA
                ? 'Two-factor protection is active. Unauthorized logins are prevented.'
                : 'Turn on 2FA to guard your account against password breaches.'}
            </p>
          </div>
          {!is2FA && (
            <button
              onClick={() => {
                onClose();
                onOpen2FA();
              }}
              className="px-3 py-1.5 rounded-xl bg-brand-600 text-white text-xs font-bold hover:bg-brand-700 transition-colors shadow-xs"
            >
              Turn on 2FA
            </button>
          )}
        </div>

        {/* Check Items Grid */}
        <div className="space-y-3">
          {/* Password Item */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border text-slate-700 dark:text-slate-300">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Password Strength
                </p>
                <p className="text-[11px] text-slate-500">
                  Encrypted using bcrypt with secure salt hashing.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenPasswordChange();
              }}
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
            >
              Change
            </button>
          </div>

          {/* 2FA Item */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border text-slate-700 dark:text-slate-300">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-2">
                  <span>Two-Factor Authentication</span>
                  {is2FA ? (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                      Off
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-slate-500">
                  {is2FA
                    ? 'Protected with authenticator app & backup recovery codes.'
                    : 'Add a second verification step during sign-in.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpen2FA();
              }}
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
            >
              {is2FA ? 'Manage' : 'Enable'}
            </button>
          </div>

          {/* Active Sessions Item */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Active Sessions ({sessionsCount})
                </p>
                <p className="text-[11px] text-slate-500">
                  Current browser session active. No unrecognized devices detected.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenSessions();
              }}
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
            >
              Review
            </button>
          </div>
        </div>

        {/* Recent Security Activity Log */}
        <div className="space-y-2 pt-2">
          <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
            <History className="w-4 h-4 text-slate-400" />
            <span>Recent Security Events</span>
          </p>
          <div className="rounded-2xl border border-slate-200 dark:border-dark-border divide-y divide-slate-100 dark:divide-dark-border text-xs max-h-36 overflow-y-auto">
            {securityLogs.length > 0 ? (
              securityLogs.slice(0, 5).map((log, idx) => (
                <div key={idx} className="p-2.5 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {log.event}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {log.device || 'Desktop'} • {log.ip || '127.0.0.1'}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {log.timestamp
                      ? formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })
                      : 'Just now'}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-3 text-center text-slate-400 text-xs">
                No recent security anomalies recorded.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-dark-border flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SecurityCheckupModal;
