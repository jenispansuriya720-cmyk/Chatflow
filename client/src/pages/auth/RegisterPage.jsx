import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, User, Mail, Phone, Lock, Eye, EyeOff, ArrowRight, Camera, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import Avatar from '../../components/common/Avatar';

const RegisterPage = () => {
  const { register, isAuthenticated, user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    profilePicture: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCreated, setIsCreated] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !isCreated && user?.isOnboarded) {
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, isCreated, user, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGenerateAvatar = () => {
    const seed = formData.username || formData.fullName || Date.now();
    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}`;
    setFormData({ ...formData, profilePicture: avatar });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await register(formData);
      if (res.success) {
        addToast('Account created successfully! Welcome to ChatFlow.', 'success');
        setIsCreated(true);
      } else {
        setError(res.message || 'Registration failed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 via-indigo-50/50 to-slate-200 dark:from-dark-base dark:via-dark-surface dark:to-dark-base select-none">
      <div className="w-full max-w-lg bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-3xl p-8 shadow-2xl space-y-6 my-8">
        {isCreated ? (
          <div className="space-y-6 text-center py-6 animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center justify-center space-x-2">
                <span>Account Created Successfully</span>
                <span className="text-emerald-500 font-black">✓</span>
              </h2>
              <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">
                Welcome to ChatFlow!
              </p>
              <p className="text-xs text-slate-500 dark:text-dark-muted max-w-xs mx-auto mt-1 leading-relaxed">
                Your account is ready. Let's complete your profile details and help you discover friends and communities.
              </p>
            </div>

            <button
              onClick={() => navigate('/onboarding')}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-sm font-bold shadow-xl shadow-brand-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center space-x-2"
            >
              <span>Complete Your Profile</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            {/* Brand Header */}
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
                <Sparkles className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Create your Account
              </h1>
              <p className="text-xs text-slate-500 dark:text-dark-muted">
                Join ChatFlow and connect with colleagues and communities
              </p>
            </div>

            {/* Error alert */}
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs rounded-xl font-medium">
                {error}
              </div>
            )}

            {/* Avatar preview */}
            <div className="flex items-center justify-center space-x-4">
              <Avatar
                src={
                  formData.profilePicture ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${formData.username || 'user'}`
                }
                name={formData.fullName || formData.username || 'User'}
                size="xl"
                className="ring-2 ring-brand-500/30 flex-shrink-0"
              />
              <button
                type="button"
                onClick={handleGenerateAvatar}
                className="px-3 py-1.5 bg-slate-100 dark:bg-dark-surface hover:bg-slate-200 dark:hover:bg-dark-hover text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <Camera className="w-3.5 h-3.5 text-brand-500" />
                <span>Generate New Avatar</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="Jane Doe"
                      required
                      className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Username *
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="janedoe"
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="name@example.com"
                      required
                      className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+1 (555) 000-0000"
                      className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                      className="w-full pl-10 pr-9 py-2 bg-slate-50 dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Confirm Password *
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-brand-500/25 flex items-center justify-center space-x-2 transition-all active:scale-[0.99] disabled:opacity-50 mt-2"
              >
                <span>{loading ? 'Creating Account...' : 'Sign Up'}</span>
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            {/* Footer */}
            <div className="text-center pt-2 border-t border-slate-100 dark:border-dark-border text-xs text-slate-500 dark:text-dark-muted">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-brand-600 dark:text-brand-400 hover:underline"
              >
                Sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RegisterPage;
