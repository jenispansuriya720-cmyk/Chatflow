import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowLeft,
  Shield,
  Lock,
  Heart,
  FileText,
  HelpCircle,
  Mail,
  CheckCircle2,
  Send,
  MessageSquare,
  Film,
  Radio,
  Users,
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';

const PublicInfoPage = ({ defaultSection }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();

  const currentPath = defaultSection || location.pathname.replace('/', '') || 'about';

  // Contact form state
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [contactSent, setContactSent] = useState(false);

  // Help search
  const [helpSearch, setHelpSearch] = useState('');

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setContactSent(true);
    addToast('Message sent to ChatFlow Support team', 'success');
  };

  const navLinks = [
    { id: 'about', label: 'About ChatFlow', icon: Sparkles },
    { id: 'features', label: 'Platform Features', icon: Film },
    { id: 'community-guidelines', label: 'Community Guidelines', icon: Heart },
    { id: 'terms', label: 'Terms of Service', icon: FileText },
    { id: 'help', label: 'Help Center & FAQs', icon: HelpCircle },
    { id: 'contact', label: 'Contact Support', icon: Mail },
  ];

  return (
    <div className="min-h-screen w-full max-w-full bg-slate-950 text-white flex flex-col selection:bg-brand-500 selection:text-white select-none">
      {/* Top Header */}
      <header className="w-full border-b border-white/10 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div
            onClick={() => navigate('/')}
            className="flex items-center space-x-2.5 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-base font-black tracking-tight text-white">ChatFlow</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/login')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/register')}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white text-xs font-bold shadow-md shadow-brand-500/20"
          >
            Join ChatFlow
          </button>
        </div>
      </header>

      {/* Main Layout: Sidebar & Content */}
      <div className="flex-1 w-full max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row gap-8">
        {/* Sub-nav Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0 space-y-1">
          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Trust & Information
          </p>
          {navLinks.map((item) => {
            const Icon = item.icon;
            const active = currentPath === item.id;
            return (
              <Link
                key={item.id}
                to={`/${item.id}`}
                className={`flex items-center space-x-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-colors ${
                  active
                    ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0 bg-slate-900/40 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 text-slate-300 text-xs sm:text-sm leading-relaxed">
          {/* ABOUT SECTION */}
          {currentPath === 'about' && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-white/10 pb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-brand-400">
                  Our Mission
                </span>
                <h1 className="text-2xl font-black text-white mt-1">About ChatFlow</h1>
                <p className="text-xs text-slate-400 mt-1">
                  A safe, modern and human-centered place to connect, chat, share moments and discover people.
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-base font-bold text-white">Our 10 Core Principles</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { num: '01', title: 'People First', desc: 'Design for human well-being rather than maximum addictiveness.' },
                    { num: '02', title: 'Privacy by Default', desc: 'Private accounts by default with zero surveillance capitalism.' },
                    { num: '03', title: 'Safety by Design', desc: 'Robust controls for blocking, muting, and hidden word filters.' },
                    { num: '04', title: 'Simple Communication', desc: 'Clear, clean messaging with zero confusing clutter.' },
                    { num: '05', title: 'Meaningful Engagement', desc: 'True two-way connections alongside public creator follows.' },
                    { num: '06', title: 'Responsible Content', desc: 'Strict community standards against harassment and harm.' },
                    { num: '07', title: 'Accessibility', desc: 'Full semantic markup, high contrast, and reduced motion support.' },
                    { num: '08', title: 'Performance', desc: 'Sub-second real-time Socket.IO synchronization and instant loads.' },
                    { num: '09', title: 'Transparency', desc: 'Always explain why content appears in your feed.' },
                    { num: '10', title: 'User Control', desc: 'Complete ownership with "Download My Data" and instant deletion.' },
                  ].map((p) => (
                    <div key={p.num} className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                      <span className="text-brand-400 font-black text-xs">{p.num}</span>
                      <h4 className="font-bold text-white text-xs">{p.title}</h4>
                      <p className="text-[11px] text-slate-400">{p.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* FEATURES SECTION */}
          {currentPath === 'features' && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-white/10 pb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-brand-400">
                  Platform Capabilities
                </span>
                <h1 className="text-2xl font-black text-white mt-1">Platform Features</h1>
                <p className="text-xs text-slate-400 mt-1">
                  Unified communication and content ecosystem built on real-time sockets.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    icon: MessageSquare,
                    title: 'Real-Time Direct & Group Messaging',
                    desc: 'Socket.IO powered instant messaging with delivery receipts (✓ / ✓✓), typing indicators, voice notes, emoji reactions, quoted replies, and file attachments.',
                  },
                  {
                    icon: Film,
                    title: 'Stories & 9:16 Vertical Creator Reels',
                    desc: '24-hour expiring stories with interactive viewers sheet, tap progression, and immersive vertical video reels with rotating audio discs.',
                  },
                  {
                    icon: Radio,
                    title: 'Live Streaming Studio & Low-Latency Chat',
                    desc: 'One-click live video broadcasting, real-time viewer counters, floating emoji reactions bursts, and broadcaster moderation tools.',
                  },
                  {
                    icon: Users,
                    title: 'Dual Relationship Engine (Follow & Connection)',
                    desc: 'Distinguish between following public creators and mutual 2-way friendship connections with Accept/Reject workflows.',
                  },
                  {
                    icon: Shield,
                    title: 'Safety Center & Responsible Controls',
                    desc: 'Transparent "Why am I seeing this?" recommendation explanations, post hiding, creator muting, and dedicated safety reporting.',
                  },
                ].map((f, i) => {
                  const Icon = f.icon;
                  return (
                    <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-start space-x-4">
                      <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-white text-sm">{f.title}</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* COMMUNITY GUIDELINES SECTION */}
          {currentPath === 'community-guidelines' && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-white/10 pb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                  Shared Standards
                </span>
                <h1 className="text-2xl font-black text-white mt-1">Community Guidelines</h1>
                <p className="text-xs text-slate-400 mt-1">
                  How we keep ChatFlow welcoming, positive, and safe for everyone.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white/5 space-y-2">
                  <h4 className="font-bold text-white text-sm">1. Zero Tolerance for Harassment & Hate Speech</h4>
                  <p className="text-xs text-slate-400">
                    Targeted abuse, bullying, threats of violence, or attacks against protected personal traits will lead to immediate account suspension.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 space-y-2">
                  <h4 className="font-bold text-white text-sm">2. No Deceptive Content or Scams</h4>
                  <p className="text-xs text-slate-400">
                    Spam, phishing, fake popularity engagement bait, or misleading financial scams are strictly forbidden.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 space-y-2">
                  <h4 className="font-bold text-white text-sm">3. Respect Privacy & Consent</h4>
                  <p className="text-xs text-slate-400">
                    Never share non-consensual media or private personal documents. Respect private accounts and blocked boundaries.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TERMS OF SERVICE SECTION */}
          {currentPath === 'terms' && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-white/10 pb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                  Legal & Fair
                </span>
                <h1 className="text-2xl font-black text-white mt-1">Terms of Service</h1>
                <p className="text-xs text-slate-400 mt-1">Last updated: September 2026</p>
              </div>

              <div className="space-y-4 text-slate-400 text-xs leading-relaxed">
                <p>
                  By accessing or using ChatFlow, you agree to be bound by these Terms of Service. You retain full ownership of the text, photos, and video you share on ChatFlow.
                </p>
                <h4 className="font-bold text-white text-sm">Account Responsibilities</h4>
                <p>
                  You are responsible for keeping your password secure and for any activity under your account. You agree not to use the service for any unlawful activities.
                </p>
                <h4 className="font-bold text-white text-sm">Data Ownership & Portability</h4>
                <p>
                  You can export your complete personal data at any time via the "Download My Data" button in your Safety & Privacy Center, or permanently delete your account with complete cascade data cleanup.
                </p>
              </div>
            </div>
          )}

          {/* HELP CENTER SECTION */}
          {currentPath === 'help' && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-white/10 pb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-brand-400">
                  Support & Answers
                </span>
                <h1 className="text-2xl font-black text-white mt-1">Help Center</h1>
                <p className="text-xs text-slate-400 mt-1">
                  Find answers to common questions about accounts, privacy, and social features.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { q: 'How do Connection requests differ from Following?', a: 'Following allows you to see public posts and reels in your feed. A Connection is a mutual 2-way friendship request with Accept/Reject verification designed for closer interaction.' },
                  { q: 'How do 24-hour stories work?', a: 'Stories are lightweight multimedia moments that automatically expire after 24 hours. Creators can see who viewed their stories via the viewers drawer.' },
                  { q: 'Can I export or delete my data?', a: 'Yes! Visit Safety Center > Security & Data > "Download Your Data" to receive a complete JSON package of your profile, posts, reels, and conversations.' },
                  { q: 'What happens when I block someone?', a: 'Blocked accounts can never message you, follow you, see your online status, or view your posts and stories.' },
                ].map((faq, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1.5">
                    <h4 className="font-bold text-white text-xs sm:text-sm">{faq.q}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CONTACT SECTION */}
          {currentPath === 'contact' && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-white/10 pb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-brand-400">
                  Get in Touch
                </span>
                <h1 className="text-2xl font-black text-white mt-1">Contact Support</h1>
                <p className="text-xs text-slate-400 mt-1">
                  Have a question or feedback? Our team is here to assist.
                </p>
              </div>

              {contactSent ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-white">Message Received!</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Thank you for reaching out. We will review your inquiry and respond to your email.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4 max-w-lg">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Your Name</label>
                      <input
                        type="text"
                        required
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-brand-500"
                        placeholder="Jane Doe"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">Your Email</label>
                      <input
                        type="email"
                        required
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-brand-500"
                        placeholder="name@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Subject</label>
                    <input
                      type="text"
                      required
                      value={contactForm.subject}
                      onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-brand-500"
                      placeholder="Question about ChatFlow"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400">Message</label>
                    <textarea
                      rows={4}
                      required
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-brand-500 resize-none"
                      placeholder="How can we assist you?"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all flex items-center space-x-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Message</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default PublicInfoPage;
