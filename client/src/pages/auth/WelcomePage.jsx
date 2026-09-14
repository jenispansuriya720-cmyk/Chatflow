import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, MessageSquare, Radio, Film, Shield, Users } from 'lucide-react';

const WelcomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-between p-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white relative overflow-hidden select-none">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Bar */}
      <header className="w-full max-w-4xl flex items-center justify-between z-10">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-xl font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-brand-300 bg-clip-text text-transparent">
            ChatFlow
          </span>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 backdrop-blur-md transition-colors border border-white/10"
        >
          Sign In
        </button>
      </header>

      {/* Center Hero Card */}
      <main className="w-full max-w-md my-auto flex flex-col items-center text-center z-10 py-12">
        {/* Large Logo Emblem */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-2xl shadow-brand-500/40 mb-6 animate-pulse-slow">
          <Sparkles className="w-10 h-10" />
        </div>

        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white uppercase">
          ChatFlow
        </h1>

        <p className="text-base sm:text-lg text-slate-300 font-medium tracking-wide mt-2">
          Connect. Chat. Share.
        </p>

        <p className="text-xs text-slate-400 max-w-xs mt-3 leading-relaxed">
          The unified real-time social messaging platform. Share posts, vertical reels, 24-hour stories, live video, and encrypted chats.
        </p>

        {/* Feature Pills */}
        <div className="flex items-center justify-center flex-wrap gap-2 mt-6 max-w-sm">
          <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-300 flex items-center space-x-1">
            <MessageSquare className="w-3 h-3 text-brand-400" />
            <span>Encrypted Chats</span>
          </span>
          <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-300 flex items-center space-x-1">
            <Film className="w-3 h-3 text-purple-400" />
            <span>Vertical Reels</span>
          </span>
          <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-300 flex items-center space-x-1">
            <Radio className="w-3 h-3 text-red-400" />
            <span>Live Streaming</span>
          </span>
          <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-300 flex items-center space-x-1">
            <Users className="w-3 h-3 text-emerald-400" />
            <span>Multi-User Network</span>
          </span>
        </div>

        {/* Actions Section matching Section 81 */}
        <div className="w-full space-y-3.5 mt-8">
          <button
            onClick={() => navigate('/register')}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-sm font-bold shadow-xl shadow-brand-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-2"
          >
            <span>Create Account</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="pt-2">
            <p className="text-xs text-slate-400">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-brand-400 hover:text-brand-300 font-semibold underline underline-offset-4 ml-1"
              >
                Login
              </button>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl text-center py-4 border-t border-white/10 z-10">
        <p className="text-[11px] text-slate-400">
          ChatFlow &bull; Complete Multi-User Real-Time Network &bull; 2026
        </p>
      </footer>
    </div>
  );
};

export default WelcomePage;
