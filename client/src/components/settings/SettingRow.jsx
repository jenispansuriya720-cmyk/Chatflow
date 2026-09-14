import React from 'react';

export const SettingToggle = ({
  checked,
  onChange,
  disabled = false,
  label = '',
  id,
}) => {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
        checked ? 'bg-brand-600' : 'bg-slate-300 dark:bg-dark-card'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
};

export const SettingSelect = ({
  value,
  onChange,
  options = [],
  disabled = false,
  id,
}) => {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="px-3 py-1.5 bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-500 transition-colors cursor-pointer disabled:opacity-50"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};

export const SettingRow = ({
  title,
  description,
  explanation,
  control,
  badge,
  danger = false,
}) => {
  return (
    <div className="flex items-start justify-between py-3.5 first:pt-0 last:pb-0 gap-4">
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center space-x-2">
          <p
            className={`text-xs font-bold leading-tight ${
              danger
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-slate-800 dark:text-slate-200'
            }`}
          >
            {title}
          </p>
          {badge && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-[11px] text-slate-500 dark:text-dark-muted mt-0.5 leading-relaxed">
            {description}
          </p>
        )}
        {explanation && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 italic leading-relaxed">
            {explanation}
          </p>
        )}
      </div>
      <div className="flex-shrink-0 pt-0.5">{control}</div>
    </div>
  );
};

export const SettingCard = ({
  title,
  description,
  icon: Icon,
  iconColor = 'text-brand-500',
  children,
  action,
  className = '',
}) => {
  return (
    <div
      className={`bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-3xl p-5 md:p-6 shadow-xs space-y-4 transition-all ${className}`}
    >
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-dark-border pb-3.5">
        <div className="flex items-start space-x-3">
          {Icon && (
            <div
              className={`p-2 rounded-2xl bg-slate-100 dark:bg-dark-card border border-slate-200/60 dark:border-dark-border ${iconColor}`}
            >
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-slate-500 dark:text-dark-muted mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>

      <div className="divide-y divide-slate-100 dark:divide-dark-border">
        {children}
      </div>
    </div>
  );
};
