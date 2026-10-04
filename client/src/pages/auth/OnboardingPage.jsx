import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Camera,
  User,
  Check,
  ArrowRight,
  ArrowLeft,
  Users,
  Compass,
  Heart,
  Tag,
  Loader2,
  UserPlus,
} from 'lucide-react';
import Avatar from '../../components/common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import api from '../../services/api';

const INTERESTS_LIST = [
  'Technology',
  'Gaming',
  'Music',
  'Travel',
  'Photography',
  'Sports',
  'Movies',
  'Education',
  'Business',
  'Fashion',
  'Food',
  'Fitness',
];

const OnboardingPage = () => {
  const { user, updateUser } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Profile Details
  const [profileData, setProfileData] = useState({
    fullName: user?.fullName || '',
    username: user?.username || '',
    bio: user?.bio || 'Hey there! I am using ChatFlow.',
    profilePicture: user?.profilePicture || '',
  });

  // Step 2: Selected Interests
  const [selectedInterests, setSelectedInterests] = useState(user?.interests || ['Technology', 'Music']);

  // Step 3: Suggested People
  const [suggestedPeople, setSuggestedPeople] = useState([]);
  const [loadingPeople, setLoadingPeople] = useState(false);

  useEffect(() => {
    if (step === 3) {
      loadSuggestedPeople();
    }
  }, [step]);

  const loadSuggestedPeople = async () => {
    try {
      setLoadingPeople(true);
      const res = await api.get('/users?limit=8');
      if (res.data?.users) {
        setSuggestedPeople(res.data.users);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPeople(false);
    }
  };

  const handleToggleInterest = (interest) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const handleFollowToggle = async (targetUserId) => {
    try {
      const res = await api.post(`/follow/${targetUserId}`);
      if (res.data.success) {
        addToast(res.data.message, 'success');
        setSuggestedPeople((prev) =>
          prev.map((p) =>
            p._id === targetUserId
              ? {
                  ...p,
                  isFollowing: res.data.isFollowing,
                  isPending: res.data.isPending,
                }
              : p
          )
        );
      }
    } catch (err) {
      addToast('Failed to update follow status', 'error');
    }
  };

  const handleConnectToggle = async (targetUserId) => {
    try {
      const res = await api.post(`/connections/${targetUserId}`);
      if (res.data.success) {
        addToast(res.data.message, 'success');
        setSuggestedPeople((prev) =>
          prev.map((p) =>
            p._id === targetUserId
              ? {
                  ...p,
                  connectionStatus: res.data.status,
                }
              : p
          )
        );
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update connection', 'error');
    }
  };

  const handleRandomizeAvatar = () => {
    const seed = Date.now();
    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
    setProfileData((prev) => ({ ...prev, profilePicture: avatar }));
  };

  const handleCompleteOnboarding = async () => {
    try {
      setLoading(true);
      const payload = {
        fullName: profileData.fullName,
        username: profileData.username,
        bio: profileData.bio,
        profilePicture: profileData.profilePicture,
        interests: selectedInterests,
      };

      const res = await api.post('/users/onboarding', payload);
      if (res.data.success) {
        updateUser(res.data.user);
        addToast('Profile completed! Welcome to ChatFlow 🎉', 'success');
        navigate('/home');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to finish onboarding', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-dvh w-full max-w-full flex flex-col items-center justify-center p-3 sm:p-6 bg-gradient-to-br from-slate-100 via-indigo-50/50 to-slate-200 dark:from-dark-base dark:via-dark-surface dark:to-dark-base select-none">
      <div className="w-full max-w-xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-3xl p-4 sm:p-8 shadow-2xl space-y-6">
        {/* Progress Bar Indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>STEP {step} OF 4</span>
            <span>
              {step === 1 && 'Profile Details'}
              {step === 2 && 'Your Interests'}
              {step === 3 && 'Find People'}
              {step === 4 && 'Complete'}
            </span>
          </div>

          <div className="w-full h-1.5 bg-slate-100 dark:bg-dark-hover rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-600 to-indigo-600 transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* STEP 1: Profile Setup */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Set up your profile
              </h2>
              <p className="text-xs text-slate-500 dark:text-dark-muted">
                Choose an avatar and tell others who you are
              </p>
            </div>

            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-3">
              <div className="relative p-1 bg-gradient-to-tr from-brand-500 to-indigo-500 rounded-full shadow-md flex-shrink-0">
                <Avatar
                  src={profileData.profilePicture || user?.profilePicture}
                  name={profileData.fullName || user?.username}
                  size="2xl"
                  priority={true}
                />
              </div>

              <button
                type="button"
                onClick={handleRandomizeAvatar}
                className="px-3.5 py-1.5 bg-slate-100 dark:bg-dark-surface hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors"
              >
                <Camera className="w-3.5 h-3.5 text-brand-500" />
                <span>Randomize Avatar</span>
              </button>
            </div>

            {/* Fields */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileData.fullName}
                  onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                  placeholder="e.g. Rahul Patel"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-brand-600 dark:text-brand-400">
                    @
                  </span>
                  <input
                    type="text"
                    value={profileData.username}
                    onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                    placeholder="username"
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Bio
                </label>
                <textarea
                  rows={2}
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  placeholder="Tell people about your passions and work..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>
            </div>

            <button
              onClick={() => {
                if (!profileData.fullName.trim() || !profileData.username.trim()) {
                  addToast('Please enter your name and username', 'error');
                  return;
                }
                setStep(2);
              }}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-2 shadow-sm transition-all"
            >
              <span>Continue to Interests</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: Interests Selection */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-in">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                What are you interested in?
              </h2>
              <p className="text-xs text-slate-500 dark:text-dark-muted">
                Select topics to personalize your feed, discovery, and connections
              </p>
            </div>

            {/* Interest Chips Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
              {INTERESTS_LIST.map((interest) => {
                const isSelected = selectedInterests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => handleToggleInterest(interest)}
                    className={`p-3 rounded-2xl border text-xs font-semibold transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400 shadow-xs'
                        : 'border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-surface text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <span>{interest}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-brand-500" />}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-3 px-4 rounded-xl border border-slate-200 dark:border-dark-border text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
              >
                Back
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-2 shadow-sm transition-all"
              >
                <span>Find People You May Know</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Find People */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                People You May Know
              </h2>
              <p className="text-xs text-slate-500 dark:text-dark-muted">
                Follow creators and connections to build your personal network
              </p>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
              {loadingPeople ? (
                <div className="py-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-500 mx-auto" />
                </div>
              ) : (
                suggestedPeople.map((person) => (
                  <div
                    key={person._id}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-dark-surface border border-slate-100 dark:border-dark-border"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <Avatar
                        src={person.profilePicture}
                        name={person.fullName}
                        size="md"
                        status={person.isOnline ? 'online' : 'offline'}
                        className="flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {person.fullName}
                        </p>
                        <p className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold truncate">
                          @{person.username}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleFollowToggle(person._id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          person.isFollowing
                            ? 'bg-slate-200 dark:bg-dark-hover text-slate-700 dark:text-slate-200'
                            : person.isPending
                            ? 'bg-amber-500/15 text-amber-600'
                            : 'bg-brand-600 hover:bg-brand-700 text-white shadow-xs'
                        }`}
                      >
                        {person.isFollowing ? 'Following' : person.isPending ? 'Requested' : 'Follow'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleConnectToggle(person._id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                          person.connectionStatus === 'connected'
                            ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                            : person.connectionStatus === 'pending_sent'
                            ? 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30'
                            : 'border-slate-200 dark:border-dark-border text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-hover'
                        }`}
                      >
                        {person.connectionStatus === 'connected'
                          ? 'Connected'
                          : person.connectionStatus === 'pending_sent'
                          ? 'Requested'
                          : 'Connect'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="py-3 px-4 rounded-xl border border-slate-200 dark:border-dark-border text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50"
              >
                Back
              </button>

              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-2 shadow-sm transition-all"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Ready */}
        {step === 4 && (
          <div className="space-y-6 text-center py-4 animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto shadow-lg">
              <Sparkles className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                You're ready! 🎉
              </h2>
              <p className="text-xs text-slate-500 dark:text-dark-muted max-w-sm mx-auto leading-relaxed">
                Your profile is set up, interests are saved, and you are connected to the community.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-surface border border-slate-100 dark:border-dark-border max-w-sm mx-auto flex items-center space-x-3 text-left">
              <Avatar
                src={profileData.profilePicture || user?.profilePicture}
                name={profileData.fullName}
                size="lg"
                className="flex-shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {profileData.fullName}
                </p>
                <p className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold truncate">
                  @{profileData.username}
                </p>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                  {selectedInterests.slice(0, 3).join(' • ')}
                </p>
              </div>
            </div>

            <button
              onClick={handleCompleteOnboarding}
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-brand-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Explore ChatFlow</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingPage;
