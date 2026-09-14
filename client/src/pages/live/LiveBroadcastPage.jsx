import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Radio,
  Video,
  Mic,
  MicOff,
  VideoOff,
  Users,
  Send,
  Square,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Trash2,
  UserPlus,
  Shield,
  Clock,
  Heart,
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

const LiveBroadcastPage = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('everyone');
  const [isLive, setIsLive] = useState(false);
  const [streamData, setStreamData] = useState(null);
  const [viewerCount, setViewerCount] = useState(1);
  const [peakViewers, setPeakViewers] = useState(1);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [reactionsCount, setReactionsCount] = useState(0);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showEndModal, setShowEndModal] = useState(false);
  const [streamStartTime, setStreamStartTime] = useState(null);
  const [elapsedDuration, setElapsedDuration] = useState(0);

  // Guest co-host state
  const [guestStream, setGuestStream] = useState(null);
  const [activeGuest, setActiveGuest] = useState(null);

  const localVideoRef = useRef(null);
  const guestVideoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const viewerPCsRef = useRef(new Map()); // viewerSocketId -> RTCPeerConnection
  const guestPCRef = useRef(null);
  const durationIntervalRef = useRef(null);

  // Initialize camera preview on mount
  useEffect(() => {
    startCameraPreview();
    return () => {
      stopCameraPreview();
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      // Close all viewer peer connections
      viewerPCsRef.current.forEach((pc) => pc.close());
      viewerPCsRef.current.clear();
      if (guestPCRef.current) guestPCRef.current.close();
    };
  }, []);

  // Duration timer
  useEffect(() => {
    if (isLive) {
      durationIntervalRef.current = setInterval(() => {
        setElapsedDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    }
    return () => {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    };
  }, [isLive]);

  const startCameraPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      mediaStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn('Camera / Microphone not accessible:', err.message);
      addToast('Camera/Microphone preview unavailable: ' + err.message, 'info');
    }
  };

  const stopCameraPreview = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const toggleVideo = () => {
    if (mediaStreamRef.current) {
      const videoTrack = mediaStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const handleStartStream = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      addToast('Please enter a title for your live broadcast', 'error');
      return;
    }

    try {
      const res = await api.post('/live', {
        title: title.trim(),
        description: description.trim(),
        visibility,
      });

      if (res.data.success) {
        const stream = res.data.stream;
        setStreamData(stream);
        setIsLive(true);
        setStreamStartTime(Date.now());
        setElapsedDuration(0);
        addToast('You are now LIVE!', 'success');

        // Join socket room as host
        if (socket) {
          socket.emit('joinLiveRoom', { streamId: stream._id, user });
        }
      }
    } catch (err) {
      addToast('Failed to start stream: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  // WebRTC Broadcaster to Viewers: Handle viewers joining
  const handleConnectViewer = async (viewerSocketId) => {
    if (!mediaStreamRef.current || !socket || !streamData || !viewerSocketId) return;

    try {
      // Close previous connection if existed
      if (viewerPCsRef.current.has(viewerSocketId)) {
        viewerPCsRef.current.get(viewerSocketId).close();
      }

      const pc = new RTCPeerConnection(RTC_CONFIG);

      // Add all live tracks to the peer connection
      mediaStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, mediaStreamRef.current);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('liveIceCandidate', {
            candidate: event.candidate,
            targetSocketId: viewerSocketId,
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      viewerPCsRef.current.set(viewerSocketId, pc);

      socket.emit('liveOffer', {
        streamId: streamData._id,
        offer,
        toViewerSocketId: viewerSocketId,
      });
    } catch (err) {
      console.error('Failed to create WebRTC offer for viewer:', err);
    }
  };

  // Socket listeners for comments, reactions, viewer joins, and WebRTC
  useEffect(() => {
    if (!socket || !streamData) return;

    const handleComment = (cmt) => {
      setComments((prev) => [...prev, cmt]);
    };

    const handleReaction = () => {
      setReactionsCount((prev) => prev + 1);
    };

    const handleViewerJoined = ({ user: vUser, socketId }) => {
      setViewerCount((prev) => {
        const next = prev + 1;
        setPeakViewers((peak) => Math.max(peak, next));
        return next;
      });

      if (vUser) {
        setComments((prev) => [
          ...prev,
          {
            system: true,
            text: `${vUser.fullName || vUser.username} joined the stream`,
          },
        ]);
      }

      // Establish real WebRTC video connection to this viewer
      if (socketId) {
        handleConnectViewer(socketId);
      }
    };

    const handleViewerLeft = ({ socketId }) => {
      setViewerCount((prev) => Math.max(1, prev - 1));
      if (socketId && viewerPCsRef.current.has(socketId)) {
        viewerPCsRef.current.get(socketId).close();
        viewerPCsRef.current.delete(socketId);
      }
    };

    // Viewer answered WebRTC offer
    const handleLiveAnswer = async ({ answer, viewerSocketId }) => {
      try {
        const pc = viewerPCsRef.current.get(viewerSocketId);
        if (pc && answer) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (err) {
        console.error('Error setting remote answer for viewer:', err);
      }
    };

    // Viewer sent ICE candidate
    const handleLiveIceCandidate = async ({ candidate, fromSocketId }) => {
      try {
        const pc = viewerPCsRef.current.get(fromSocketId);
        if (pc && candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error('Error adding ICE candidate from viewer:', err);
      }
    };

    socket.on('liveComment', handleComment);
    socket.on('live:comment', handleComment);
    socket.on('liveReaction', handleReaction);
    socket.on('live:reaction', handleReaction);
    socket.on('liveViewerJoined', handleViewerJoined);
    socket.on('live:viewer-joined', handleViewerJoined);
    socket.on('liveViewerLeft', handleViewerLeft);
    socket.on('live:viewer-left', handleViewerLeft);
    socket.on('liveAnswer', handleLiveAnswer);
    socket.on('liveIceCandidate', handleLiveIceCandidate);

    return () => {
      socket.off('liveComment', handleComment);
      socket.off('live:comment', handleComment);
      socket.off('liveReaction', handleReaction);
      socket.off('live:reaction', handleReaction);
      socket.off('liveViewerJoined', handleViewerJoined);
      socket.off('live:viewer-joined', handleViewerJoined);
      socket.off('liveViewerLeft', handleViewerLeft);
      socket.off('live:viewer-left', handleViewerLeft);
      socket.off('liveAnswer', handleLiveAnswer);
      socket.off('liveIceCandidate', handleLiveIceCandidate);
    };
  }, [socket, streamData]);

  const handleSendHostComment = (e) => {
    e.preventDefault();
    if (!commentInput.trim() || !socket || !streamData) return;

    const commentPayload = {
      _id: `host_cmt_${Date.now()}`,
      author: user,
      text: commentInput.trim(),
      isHost: true,
      time: new Date().toISOString(),
    };

    socket.emit('liveComment', {
      streamId: streamData._id,
      comment: commentPayload,
    });

    setCommentInput('');
  };

  // Moderate comment
  const handleDeleteComment = (idx) => {
    setComments((prev) => prev.filter((_, i) => i !== idx));
    addToast('Comment removed from broadcast', 'info');
  };

  const handleEndStream = async () => {
    if (!streamData) return;
    try {
      await api.post(`/live/${streamData._id}/end`);
      if (socket) {
        socket.emit('liveEnded', { streamId: streamData._id });
      }
      setIsLive(false);
      setShowEndModal(true);
    } catch (e) {
      console.error(e);
      setShowEndModal(true);
    }
  };

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col select-none relative">
      {/* Top Header */}
      <header className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md z-20">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/live')}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2">
            <Radio className="w-5 h-5 text-red-500 animate-pulse" />
            <h1 className="text-sm font-bold tracking-tight">
              {isLive ? `Live Broadcast: ${title}` : 'Live Studio Setup'}
            </h1>
          </div>
        </div>

        {isLive && (
          <div className="flex items-center space-x-3">
            <div className="px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span>LIVE</span>
            </div>

            <div className="px-3 py-1 rounded-full bg-slate-800 text-white text-xs font-bold flex items-center space-x-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>{viewerCount}</span>
            </div>

            <div className="px-3 py-1 rounded-full bg-slate-800 text-rose-400 text-xs font-bold flex items-center space-x-1.5">
              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
              <span>{reactionsCount}</span>
            </div>

            <button
              onClick={handleEndStream}
              className="px-3 py-1 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors"
            >
              End Stream
            </button>
          </div>
        )}
      </header>

      {/* Main Broadcast Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Video Camera Monitor */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${!videoEnabled ? 'hidden' : ''}`}
          />

          {!videoEnabled && (
            <div className="flex flex-col items-center justify-center p-8 space-y-3">
              <Avatar src={user?.profilePicture} name={user?.fullName} size="2xl" priority={true} />
              <p className="text-xs text-slate-400">Camera is turned off</p>
            </div>
          )}

          {/* Camera controls toolbar */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-3 p-2 rounded-2xl bg-black/60 backdrop-blur-md border border-white/15">
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-xl transition-colors ${
                videoEnabled ? 'bg-white/15 hover:bg-white/25 text-white' : 'bg-red-600 text-white'
              }`}
              title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleAudio}
              className={`p-3 rounded-xl transition-colors ${
                audioEnabled ? 'bg-white/15 hover:bg-white/25 text-white' : 'bg-red-600 text-white'
              }`}
              title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
            >
              {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Right Sidebar: Setup Form OR Live Chat & Comments Feed */}
        <div className="w-full md:w-80 lg:w-96 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col">
          {!isLive ? (
            /* Setup Form before going live */
            <div className="p-6 space-y-5 overflow-y-auto">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Broadcast Details</h3>
                <p className="text-xs text-slate-400">
                  Configure your stream title and notify your followers
                </p>
              </div>

              <form onSubmit={handleStartStream} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Stream Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Q&A and Full-Stack Project Demo"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-red-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Description (Optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell your viewers what you'll be streaming today..."
                    rows={3}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-red-500 resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Audience & Privacy
                  </label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="everyone">Everyone (Public Broadcast)</option>
                    <option value="followers">Followers Only</option>
                    <option value="connections">Connections Only</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-red-500/25 flex items-center justify-center space-x-2 transition-all active:scale-[0.99] disabled:opacity-40 mt-4"
                >
                  <Radio className="w-4 h-4" />
                  <span>Start Live Broadcast</span>
                </button>
              </form>
            </div>
          ) : (
            /* Live Chat & Comments Stream while live */
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-200">Live Chat & Moderation</h3>
                <span className="text-[10px] text-slate-400">{comments.length} messages</span>
              </div>

              {/* Comments stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
                {comments.map((c, i) => (
                  <div key={i} className="flex items-start justify-between group leading-relaxed">
                    <div className="flex items-start space-x-2">
                      {c.system ? (
                        <span className="text-[11px] text-brand-400 italic">
                          {c.text}
                        </span>
                      ) : (
                        <>
                          <Avatar
                            src={c.author?.profilePicture}
                            name={c.author?.fullName}
                            size="xs"
                            className="flex-shrink-0"
                          />
                          <div>
                            <span className={`font-bold mr-1.5 ${c.isHost ? 'text-red-400' : 'text-slate-300'}`}>
                              {c.author?.username || c.author?.fullName}:
                            </span>
                            <span className="text-slate-200">{c.text}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {!c.system && (
                      <button
                        onClick={() => handleDeleteComment(i)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                        title="Delete Comment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Host comment input */}
              <form
                onSubmit={handleSendHostComment}
                className="p-3 border-t border-slate-800 flex items-center space-x-2 bg-slate-950"
              >
                <input
                  type="text"
                  placeholder="Say something to your viewers..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-red-500"
                />
                <button
                  type="submit"
                  disabled={!commentInput.trim()}
                  className="p-2 rounded-xl bg-red-600 hover:bg-red-700 text-white disabled:opacity-40"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Stream Ended Summary Modal (Requirement #29) */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-base font-bold text-white">Broadcast Ended</h3>
            <p className="text-xs text-slate-400">
              Live broadcast closed. Real statistics collected:
            </p>

            <div className="p-4 bg-slate-800/80 rounded-2xl grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Peak Viewers</span>
                <span className="text-base font-bold text-white">{peakViewers}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Duration</span>
                <span className="text-base font-bold text-white">
                  {formatDuration(elapsedDuration)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Chat Comments</span>
                <span className="text-base font-bold text-white">{comments.length}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Reactions</span>
                <span className="text-base font-bold text-white">{reactionsCount}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/live')}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl transition-colors"
            >
              Back to Live Hub
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveBroadcastPage;
