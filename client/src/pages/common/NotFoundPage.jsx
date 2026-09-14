import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareDashed, ArrowLeft } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-dark-base text-slate-900 dark:text-slate-100 select-none">
      <div className="max-w-md text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto shadow-sm">
          <MessageSquareDashed className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight">404</h1>
        <h2 className="text-lg font-bold">Page Not Found</h2>
        <p className="text-xs text-slate-500 dark:text-dark-muted">
          The conversation or page you are looking for does not exist or has been moved.
        </p>
        <Link
          to="/chats"
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Chats</span>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
