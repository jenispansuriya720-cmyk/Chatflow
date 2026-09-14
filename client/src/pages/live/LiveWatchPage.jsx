import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users,
  Send,
  Heart,
  ArrowLeft,
  Volume2,
  VolumeX,
  Share2,
  UserPlus,
  Check,
  Flame,
  Loader2,
  Maximize2,
  Minimize2,
  Radio,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../components/common/Toast';
import Avatar from '../../components/common/Avatar';
import api from '../../services/api';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

const EMOJI_REACTIONS = ['❤️', '👍', '😂', '🔥', '👏'];

const LiveWatchPage = () => {
  const { id: streamId } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [stream, setStream] = useState(null);
  const [viewerCount, setViewerCount] = useState(1);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [guestInvite, setGuestInvite] = useState(null);

  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);

  useEffect(() => {
    loadStreamDetails();

    // Join live stream via API
    api.post(`/live/${streamId}/join`).then((res) => {
      if (res.data.success) {
        setViewerCount(res.data.viewerCount);
      }
    }).catch(() => {});

    // Join live socket room
    if (socket && user) {
      socket.emit('joinLiveRoom', { streamId, user });
    }

    return () => {
      api.post(`/live/${streamId}/leave`).catch(() => {});
      if (socket && user) {
        socket.emit('leaveLiveRoom', { streamId, user });
      }
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    };
  }, [streamId, socket, user?._id]);

  const loadStreamDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/live/${streamId}`);
      if (res.data.success) {
        setStream(res.data.stream);
        setViewerCount(res.data.stream.viewerCount || 1);
      }
    } catch (e) {
      console.error(e);
      addToast('Live stream not found or ended', 'error');
      navigate('/live');
    } finally {
      setLoading(false);
    }
  };

  // Socket listeners for WebRTC stream, comments, reactions, and stream end
  useEffect(() => {
    if (!socket) return;

    // 1. WebRTC Host Broadcast Offer
    const handleLiveOffer = async ({ offer, hostSocketId }) => {
      try {
        if (pcRef.current) {
          pcRef.current.close();
        }

        const pc = new RTCPeerConnection(RTC_CONFIG);

        pc.ontrack = (event) => {
          if (event.streams && event.streams[0] && remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
            setHasRemoteVideo(true);
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate && socket) {
            socket.emit('liveIceCandidate', {
              candidate: event.candidate,
              targetSocketId: hostSocketId,
            });
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        pcRef.current = pc;

        socket.emit('liveAnswer', {
          streamId,
          answer,
          toHostSocketId: hostSocketId,
        });
      } catch (err) {
        console.error('Error accepting live broadcast offer:', err);
      }
    };

    // 2. ICE Candidate from host
    const handleLiveIceCandidate = async ({ candidate }) => {
      try {
        if (pcRef.current && candidate) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error('Error adding live ICE candidate:', err);
      }
    };

    // 3. Comments & Reactions
    const handleLiveComment = (cmt) => {
      setComments((prev) => [...prev, cmt]);
    };

    const handleLiveReaction = ({ emoji, id }) => {
      setFloatingReactions((prev) => [...prev, { emoji, id }]);
      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
      }, 2000);
    };

    const handleLiveViewerJoined = () => {
      setViewerCount((prev) => prev + 1);
    };

    const handleLiveViewerLeft = () => {
      setViewerCount((prev) => Math.max(1, prev - 1));
    };

    const handleLiveEnded = () => {
      addToast('The host has ended this live broadcast.', 'info');
      navigate('/live');
    };

    // 4. Guest Invitation from host
    const handleGuestInvite = ({ hostId }) => {
      setGuestInvite({ hostId });
    };

    socket.on('liveOffer', handleLiveOffer);
    socket.on('liveIceCandidate', handleLiveIceCandidate);
    socket.on('liveComment', handleLiveComment);
    socket.on('live:comment', handleLiveComment);
    socket.on('liveReaction', handleLiveReaction);
    socket.on('live:reaction', handleLiveReaction);
    socket.on('liveViewerJoined', handleLiveViewerJoined);
    socket.on('live:viewer-joined', handleLiveViewerJoined);
    socket.on('liveViewerLeft', handleLiveViewerLeft);
    socket.on('live:viewer-left', handleLiveViewerLeft);
    socket.on('liveEnded', handleLiveEnded);
    socket.on('live:ended', handleLiveEnded);
    socket.on('live:guest-invite', handleGuestInvite);

    return () => {
      socket.off('liveOffer', handleLiveOffer);
      socket.off('liveIceCandidate', handleLiveIceCandidate);
      socket.off('liveComment', handleLiveComment);
      socket.off('live:comment', handleLiveComment);
      socket.off('liveReaction', handleLiveReaction);
      socket.off('live:reaction', handleLiveReaction);
      socket.off('liveViewerJoined', handleLiveViewerJoined);
      socket.off('live:viewer-joined', handleLiveViewerJoined);
      socket.off('liveViewerLeft', handleLiveViewerLeft);
      socket.off('live:viewer-left', handleLiveViewerLeft);
      socket.off('liveEnded', handleLiveEnded);
      socket.off('live:ended', handleLiveEnded);
      socket.off('live:guest-invite', handleGuestInvite);
    };
  }, [socket, streamId, navigate]);

  const handleSendComment = (e) => {
    e.preventDefault();
    if (!commentInput.trim() || !socket) return;

    const commentPayload = {
      _id: `v_cmt_${Date.now()}`,
      author: user,
      text: commentInput.trim(),
      isHost: false,
      time: new Date().toISOString(),
    };

    socket.emit('liveComment', {
      streamId,
      comment: commentPayload,
    });

    setCommentInput('');
  };

  const handleSendReaction = (emoji = '❤️') => {
    if (!socket) return;
    socket.emit('liveReaction', {
      streamId,
      emoji,
      user,
    });
  };

  const handleToggleFollow = async () => {
    if (!stream?.host) return;
    try {
      const res = await api.post(`/follow/${stream.host._id}`);
      if (res.data.success) {
        setIsFollowing(res.data.isFollowing);
        addToast(res.data.isFollowing ? `Following ${stream.host.fullName}` : `Unfollowed`, 'info');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col select-none relative overflow-hidden">
      {/* Top Floating Control Bar */}
      <header className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-30 bg-gradient-to-b from-black/85 to-transparent">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/live')}
            className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2.5">
            <Avatar
              src={stream?.host?.profilePicture}
              name={stream?.host?.fullName}
              size="md"
              className="flex-shrink-0"
            />
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate max-w-[150px]">
                {stream?.host?.fullName || 'Host'}
              </span>
              <span className="text-[10px] text-slate-300 block truncate max-w-[150px]">
                {stream?.title}
              </span>
            </div>
          </div>

          {stream?.host?._id !== user?._id && (
            <button
              onClick={handleToggleFollow}
              className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                isFollowing
                  ? 'bg-white/20 border-white/40 text-white'
                  : 'bg-white text-slate-900 border-white hover:bg-white/90'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>

        {/* Live Badge & Viewer Counter */}
        <div className="flex items-center space-x-2">
          <div className="px-2.5 py-1 rounded-full bg-red-600 text-white text-[10px] font-extrabold tracking-wider shadow-md animate-pulse flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            <span>LIVE</span>
          </div>

          <div className="px-2.5 py-1 rounded-full bg-black/50 text-white text-xs font-bold flex items-center space-x-1">
            <Users className="w-3.5 h-3.5 text-slate-300" />
            <span>{viewerCount}</span>
          </div>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Broadcast Video Area */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        {loading ? (
          <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
        ) : (
          /* Real WebRTC Remote Video Stream from Broadcaster */
          <div className="w-full h-full relative flex items-center justify-center">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              muted={isMuted}
              className={`w-full h-full object-cover ${!hasRemoteVideo ? 'opacity-0' : 'opacity-100 transition-opacity duration-500'}`}
            />

            {/* Poster / Connecting overlay while negotiating WebRTC */}
            {!hasRemoteVideo && (
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 bg-slate-900/95">
                <div className="relative">
                  <div className="absolute -inset-4 rounded-full bg-red-500/20 blur-xl animate-pulse" />
                  <Avatar
                    src={stream?.host?.profilePicture}
                    name={stream?.host?.fullName}
                    size="2xl"
                    priority={true}
                  />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold text-white">{stream?.title}</h3>
                  <p className="text-xs text-slate-400 flex items-center justify-center space-x-1.5">
                    <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                    <span>Connecting live stream broadcast...</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Floating Heart Burst Animations */}
        <div className="absolute right-6 bottom-24 pointer-events-none z-30 flex flex-col items-end space-y-2">
          {floatingReactions.map((r) => (
            <div
              key={r.id}
              className="text-2xl animate-bounce duration-500 opacity-95 select-none"
            >
              {r.emoji}
            </div>
          ))}
        </div>
      </div>

      {/* Guest Invitation Modal */}
      {guestInvite && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 p-4 bg-slate-900 border border-brand-500 rounded-2xl shadow-2xl flex items-center space-x-4 animate-slide-up">
          <Sparkles className="w-6 h-6 text-amber-400" />
          <div className="text-xs">
            <p className="font-bold text-white">Guest Invitation!</p>
            <p className="text-slate-300">The creator invited you to co-host this live stream.</p>
          </div>
          <button
            onClick={() => {
              socket.emit('live:guest-accept', { streamId, hostId: guestInvite.hostId });
              setGuestInvite(null);
              addToast('Accepted invitation to join live!', 'success');
            }}
            className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl"
          >
            Accept
          </button>
          <button
            onClick={() => setGuestInvite(null)}
            className="px-2 py-1 text-slate-400 hover:text-white text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Bottom Live Comments & Reaction Actions */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/85 to-transparent z-30 space-y-3">
        {/* Floating comments feed */}
        <div className="max-h-44 overflow-y-auto space-y-2 text-xs pr-1">
          {comments.slice(-8).map((cmt, idx) => (
            <div
              key={idx}
              className="bg-black/50 backdrop-blur-xs p-2 rounded-xl max-w-sm flex items-start space-x-2"
            >
              <Avatar
                src={cmt.author?.profilePicture}
                name={cmt.author?.fullName}
                size="xs"
                className="flex-shrink-0"
              />
              <div className="leading-snug">
                <span className={`font-bold mr-1.5 ${cmt.isHost ? 'text-red-400' : 'text-brand-300'}`}>
                  {cmt.author?.username || cmt.author?.fullName}:
                </span>
                <span className="text-white">{cmt.text}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Comment input & quick reactions */}
        <div className="flex items-center space-x-2">
          <form onSubmit={handleSendComment} className="flex-1 flex items-center space-x-2">
            <input
              type="text"
              placeholder="Send a live comment..."
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              className="flex-1 px-4 py-2 bg-white/20 focus:bg-white/30 border border-white/20 rounded-full text-xs text-white placeholder-white/60 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!commentInput.trim()}
              className="p-2 rounded-full bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-40 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Quick reactions burst buttons (Requirement #26: ❤️ 👍 😂 🔥 👏) */}
          <div className="flex items-center space-x-1">
            {EMOJI_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSendReaction(emoji)}
                className="p-1.5 rounded-full bg-white/15 hover:bg-white/30 text-base transition-transform active:scale-125"
                title={`React ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveWatchPage;
