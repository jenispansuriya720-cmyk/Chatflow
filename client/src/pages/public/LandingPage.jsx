import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  MessageSquare,
  Radio,
  Film,
  Shield,
  Users,
  Lock,
  Compass,
  CheckCircle2,
  Heart,
  Eye,
  Sliders,
  Share2,
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-screen bg-slate-950 text-white flex flex-col selection:bg-brand-500 selection:text-white relative overflow-x-hidden">
      {/* Glow Orbs Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-brand-600/25 via-indigo-600/15 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -left-48 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-2/3 -right-48 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Navigation Bar */}
      <nav className="w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-between z-20">
        <div
          onClick={() => navigate('/')}
          className="flex items-center space-x-2.5 cursor-pointer"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-xl font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-brand-300 bg-clip-text text-transparent">
            ChatFlow
          </span>
        </div>

        {/* Center Nav Links */}
        <div className="hidden md:flex items-center space-x-6 text-xs font-semibold text-slate-300">
          <Link to="/features" className="hover:text-white transition-colors">
            Features
          </Link>
          <Link to="/about" className="hover:text-white transition-colors">
            About
          </Link>
          <Link to="/safety" className="hover:text-white transition-colors">
            Safety & Privacy
          </Link>
          <Link to="/community-guidelines" className="hover:text-white transition-colors">
            Guidelines
          </Link>
          <Link to="/help" className="hover:text-white transition-colors">
            Help Center
          </Link>
        </div>

        {/* Right CTA */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/register')}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-brand-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Create Free Account
          </button>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section className="w-full max-w-5xl mx-auto px-6 pt-16 pb-12 flex flex-col items-center text-center z-10 space-y-6">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-brand-300">
          <Sparkles className="w-3.5 h-3.5 text-brand-400" />
          <span>Modern Social Communication Network</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight max-w-3xl">
          Connect with people.
          <br />
          <span className="bg-gradient-to-r from-brand-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
            Share your moments.
          </span>
          <br />
          Stay in the flow.
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-xl font-normal leading-relaxed">
          A modern space for conversations, communities and creativity. Built for real people with privacy by default and safety by design.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 pt-4 w-full sm:w-auto">
          <button
            onClick={() => navigate('/register')}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-sm font-bold shadow-xl shadow-brand-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-2"
          >
            <span>Create Free Account</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-bold transition-all"
          >
            Sign In to Account
          </button>
        </div>

        {/* Product Showcase Card */}
        <div className="w-full max-w-4xl pt-10">
          <div className="relative rounded-3xl p-2 bg-gradient-to-b from-white/15 to-white/5 shadow-2xl border border-white/10 overflow-hidden">
            <div className="bg-slate-900/90 rounded-2xl p-6 sm:p-8 backdrop-blur-md grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              {/* Showcase Column 1: Messaging */}
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 space-y-3">
                <div className="flex items-center space-x-2 text-brand-400">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Direct Chat</span>
                </div>
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-brand-600 text-white text-xs max-w-[85%] ml-auto">
                    Hey team! Just saw your new live broadcast design 🔥
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-700 text-slate-200 text-xs max-w-[85%]">
                    Thanks! Ready to test with real-time Socket synchronization!
                  </div>
                </div>
                <span className="text-[10px] text-emerald-400 font-semibold block">
                  ✓✓ Delivered in real-time
                </span>
              </div>

              {/* Showcase Column 2: Stories & Reels */}
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 space-y-3">
                <div className="flex items-center space-x-2 text-purple-400">
                  <Film className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Stories & Reels</span>
                </div>
                <div className="aspect-[9/12] rounded-xl bg-gradient-to-tr from-purple-900 via-indigo-950 to-slate-900 p-3 flex flex-col justify-between border border-purple-500/20">
                  <div className="flex items-center space-x-1">
                    <div className="h-1 flex-1 bg-white rounded-full" />
                    <div className="h-1 flex-1 bg-white/40 rounded-full" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">#creator #ux</p>
                    <p className="text-[11px] text-slate-300">24-hour expiring moments</p>
                  </div>
                </div>
              </div>

              {/* Showcase Column 3: Trust & Safety */}
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 space-y-3">
                <div className="flex items-center space-x-2 text-emerald-400">
                  <Shield className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Safety & Privacy</span>
                </div>
                <ul className="text-xs text-slate-300 space-y-2">
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>Privacy by Default</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>No algorithmic addiction</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>Download My Data export</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>Transparent recommendation controls</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Why ChatFlow? (Section 5) */}
      <section className="w-full max-w-6xl mx-auto px-6 py-16 z-10">
        <div className="text-center space-y-2 mb-12">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Why ChatFlow?
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Everything you need to communicate, create and build communities without surveillance capitalism.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: MessageSquare,
              color: 'text-brand-400',
              bg: 'bg-brand-500/10',
              title: 'Real-time Conversations',
              desc: 'High-speed encrypted direct and group chats with receipts, reactions, voice notes, and typing presence.',
            },
            {
              icon: Users,
              color: 'text-indigo-400',
              bg: 'bg-indigo-500/10',
              title: 'Meaningful Connections',
              desc: 'Distinguish between public following and mutual 2-way friendship connections with verified boundaries.',
            },
            {
              icon: Film,
              color: 'text-purple-400',
              bg: 'bg-purple-500/10',
              title: 'Stories & Vertical Reels',
              desc: 'Express yourself with rich multimedia posts, 24-hour expiring stories, and immersive creator reels.',
            },
            {
              icon: Radio,
              color: 'text-red-400',
              bg: 'bg-red-500/10',
              title: 'Live Communities',
              desc: 'Broadcast directly to your followers with low-latency chat, reactions bursts, and moderator controls.',
            },
            {
              icon: Sliders,
              color: 'text-amber-400',
              bg: 'bg-amber-500/10',
              title: 'Responsible Privacy Controls',
              desc: 'Choose who messages you, who views your stories, and inspect exactly why recommendations appear.',
            },
            {
              icon: Shield,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10',
              title: 'Secure & Accountable',
              desc: 'Multi-device session isolation, granular content reporting, custom word filters, and instant account export.',
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors space-y-3"
              >
                <div className={`w-10 h-10 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">{item.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. How It Works (Section 5) */}
      <section className="w-full max-w-5xl mx-auto px-6 py-16 z-10 border-t border-white/10">
        <div className="text-center space-y-2 mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-brand-400">
            Simple Onboarding
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            How It Works
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { step: '01', title: 'Create your account', desc: 'Sign up in seconds with zero invasive trackers.' },
            { step: '02', title: 'Find your people', desc: 'Select your creative interests and discover communities.' },
            { step: '03', title: 'Start connecting', desc: 'Send mutual connection or follow requests on your terms.' },
            { step: '04', title: 'Chat, share & create', desc: 'Jump into messaging, stories, reels, and live stream studio.' },
          ].map((s) => (
            <div key={s.step} className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <span className="text-2xl font-black text-brand-400">{s.step}</span>
              <h4 className="text-sm font-bold text-white">{s.title}</h4>
              <p className="text-xs text-slate-400">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Safety & Trust (Section 5) */}
      <section className="w-full max-w-5xl mx-auto px-6 py-16 z-10 border-t border-white/10">
        <div className="bg-gradient-to-r from-brand-950/60 via-slate-900 to-indigo-950/60 rounded-3xl p-8 border border-brand-500/20 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-lg text-left">
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase">
              <Lock className="w-4 h-4" />
              <span>Safety by Design</span>
            </div>
            <h3 className="text-2xl font-black text-white">
              Your boundaries are always protected.
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              We never sell your data, never manipulate your attention with fake notifications or bots, and give you complete control over blocking, reporting, hidden words, and data downloads.
            </p>
          </div>
          <button
            onClick={() => navigate('/safety')}
            className="px-6 py-3 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold transition-all shadow-lg flex-shrink-0"
          >
            Explore Safety Center
          </button>
        </div>
      </section>

      {/* 6. Trust Footer (Section 5 & 39) */}
      <footer className="w-full border-t border-white/10 bg-slate-950 py-12 px-6 z-10 text-xs text-slate-400">
        <div className="w-full max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 pb-8 border-b border-white/10">
          <div className="col-span-2 space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-base font-black text-white">ChatFlow</span>
            </div>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              A safe, modern and human-centered place to connect, chat, share moments and discover people.
            </p>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-white uppercase text-[11px] tracking-wider">Product</h5>
            <ul className="space-y-1.5">
              <li><Link to="/features" className="hover:text-white">Features</Link></li>
              <li><Link to="/reels" className="hover:text-white">Reels</Link></li>
              <li><Link to="/live" className="hover:text-white">Live Broadcast</Link></li>
              <li><Link to="/creator-dashboard" className="hover:text-white">Creator Dashboard</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-white uppercase text-[11px] tracking-wider">Safety & Trust</h5>
            <ul className="space-y-1.5">
              <li><Link to="/safety" className="hover:text-white">Safety Center</Link></li>
              <li><Link to="/privacy" className="hover:text-white">Privacy Policy</Link></li>
              <li><Link to="/community-guidelines" className="hover:text-white">Community Guidelines</Link></li>
              <li><Link to="/terms" className="hover:text-white">Terms of Service</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h5 className="font-bold text-white uppercase text-[11px] tracking-wider">Support</h5>
            <ul className="space-y-1.5">
              <li><Link to="/about" className="hover:text-white">About Us</Link></li>
              <li><Link to="/help" className="hover:text-white">Help Center</Link></li>
              <li><Link to="/contact" className="hover:text-white">Contact Us</Link></li>
            </ul>
          </div>
        </div>

        <div className="w-full max-w-6xl mx-auto pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500">
          <p>&copy; 2026 ChatFlow Technologies Inc. All rights reserved.</p>
          <p className="mt-2 sm:mt-0">Connect. Communicate. Create.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
