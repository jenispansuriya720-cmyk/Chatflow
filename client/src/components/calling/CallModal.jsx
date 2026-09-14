import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Maximize2,
  Minimize2,
  RefreshCw,
  Volume2,
  VolumeX,
  ShieldAlert,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useCall } from '../../context/CallContext';
import Avatar from '../common/Avatar';

const CallModal = () => {
  const {
    callStatus,
    callType,
    activeCall,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    callDuration,
    connectionQuality,
    acceptCall,
    declineCall,
    cancelCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchCamera,
  } = useCall();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const containerRef = useRef(null);

  // Attach local stream to video
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callStatus]);

  // Attach remote stream to video/audio
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream && callType === 'video') {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callType, callStatus]);

  // Auto-hide controls during connected video call
  useEffect(() => {
    if (callStatus === 'connected' && callType === 'video') {
      const resetControlsTimeout = () => {
        setControlsVisible(true);
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = setTimeout(() => {
          setControlsVisible(false);
        }, 4000);
      };

      window.addEventListener('mousemove', resetControlsTimeout);
      window.addEventListener('touchstart', resetControlsTimeout);
      resetControlsTimeout();

      return () => {
        window.removeEventListener('mousemove', resetControlsTimeout);
        window.removeEventListener('touchstart', resetControlsTimeout);
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
        }
      };
    } else {
      setControlsVisible(true);
    }
  }, [callStatus, callType]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (callStatus === 'idle') return null;

  const otherUser = activeCall?.otherUser || {};
  const isIncoming = callStatus === 'incoming';
  const isOutgoing = callStatus === 'calling' || callStatus === 'ringing';
  const isConnected = callStatus === 'connected' || callStatus === 'reconnecting';

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-0 sm:p-4 select-none animate-fade-in"
    >
      {/* Hidden audio element for remote voice */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Main Call Window */}
      <div className="relative w-full h-full sm:max-w-2xl sm:h-[620px] bg-slate-900 sm:rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col justify-between">
        {/* Top Status Header */}
        <div
          className={`absolute top-0 left-0 right-0 p-4 sm:p-6 z-30 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent transition-opacity duration-300 ${
            controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md text-white">
              {callType === 'video' ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white leading-tight">
                {otherUser.fullName || otherUser.username || 'ChatFlow Call'}
              </h2>
              <div className="flex items-center space-x-2 text-xs">
                {isConnected ? (
                  <>
                    <span className="text-emerald-400 font-mono font-bold">
                      {formatDuration(callDuration)}
                    </span>
                    <span className="text-white/40">•</span>
                    <span className="flex items-center space-x-1 text-slate-300">
                      {connectionQuality === 'good' ? (
                        <>
                          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Connected</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-amber-400">Reconnecting...</span>
                        </>
                      )}
                    </span>
                  </>
                ) : isIncoming ? (
                  <span className="text-brand-400 font-semibold animate-pulse">
                    Incoming {callType === 'video' ? 'Video' : 'Voice'} Call...
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium animate-pulse">
                    {callStatus === 'ringing' ? 'Ringing...' : 'Calling...'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {callType === 'video' && isConnected && (
              <button
                onClick={toggleFullscreen}
                className="p-2.5 rounded-xl bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors"
                title="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Center Content Area */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-slate-950">
          {callType === 'video' && isConnected ? (
            /* Video Screen */
            <div className="w-full h-full relative flex items-center justify-center">
              {/* Remote Video (Fullscreen / Major) */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

               {!remoteStream && (
                <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 bg-slate-900/90">
                  <div className="call-avatar-wrapper">
                    <div className="call-avatar-halo" />
                    <div className="call-avatar-ring">
                      <Avatar
                        src={otherUser.profilePicture}
                        name={otherUser.fullName || otherUser.username}
                        size="2xl"
                        priority={true}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 animate-pulse">Connecting video stream...</p>
                </div>
              )}

              {/* Local Video PIP (Corner Picture-in-Picture) */}
              <div className="absolute top-20 right-4 w-28 h-40 sm:w-36 sm:h-48 rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-black z-20 transition-all">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
                />
                {isVideoOff && (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-2 text-center">
                    <VideoOff className="w-5 h-5 mb-1" />
                    <span className="text-[10px]">Camera Off</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Audio Screen OR Pre-Connect Video Screen */
            <div className="flex flex-col items-center justify-center p-8 space-y-6 z-10 text-center">
              {/* Perfectly Centered Call Screen Avatar with Separate Outer Ring */}
              <div className="call-avatar-wrapper">
                <div
                  className={`call-avatar-halo ${
                    isIncoming || isOutgoing ? 'animate-ping duration-1000' : 'animate-pulse'
                  }`}
                />
                <div className="call-avatar-ring">
                  <Avatar
                    src={otherUser.profilePicture}
                    name={otherUser.fullName || otherUser.username}
                    size="call"
                    priority={true}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  {otherUser.fullName || otherUser.username}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400">
                  {isIncoming
                    ? `Incoming ${callType === 'video' ? 'video' : 'voice'} call`
                    : isOutgoing
                    ? callStatus === 'ringing'
                      ? 'Ringing...'
                      : 'Calling...'
                    : 'Call in progress'}
                </p>
              </div>

              {/* Waveform Animation for active voice calls */}
              {isConnected && (
                <div className="flex items-center space-x-1 h-8 pt-2">
                  {[40, 80, 50, 100, 60, 90, 45, 85, 30, 95, 70, 55, 80, 40].map((h, i) => (
                    <div
                      key={i}
                      style={{ height: `${h}%` }}
                      className="w-1 rounded-full bg-brand-500 animate-pulse"
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Call Controls Toolbar */}
        <div
          className={`p-6 z-30 flex items-center justify-center space-x-4 sm:space-x-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-300 ${
            controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {isIncoming ? (
            /* Incoming Call Actions: Decline (Red) & Accept (Green) */
            <div className="flex items-center space-x-8 sm:space-x-12">
              <div className="flex flex-col items-center space-y-1.5">
                <button
                  onClick={() => declineCall('declined')}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 active:scale-95 transition-transform"
                  title="Decline Call"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
                <span className="text-xs text-slate-300 font-medium">Decline</span>
              </div>

              <div className="flex flex-col items-center space-y-1.5">
                <button
                  onClick={acceptCall}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 active:scale-95 transition-transform animate-bounce"
                  title="Accept Call"
                >
                  <Phone className="w-6 h-6" />
                </button>
                <span className="text-xs text-slate-300 font-medium">Accept</span>
              </div>
            </div>
          ) : (
            /* Outgoing / Active Call Controls */
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* Mute Mic */}
              <button
                onClick={toggleMute}
                className={`p-3.5 sm:p-4 rounded-2xl backdrop-blur-md transition-all active:scale-95 ${
                  isMuted ? 'bg-rose-600 text-white' : 'bg-white/15 hover:bg-white/25 text-white'
                }`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Video Camera Toggle (if video call) */}
              {callType === 'video' && (
                <>
                  <button
                    onClick={toggleVideo}
                    className={`p-3.5 sm:p-4 rounded-2xl backdrop-blur-md transition-all active:scale-95 ${
                      isVideoOff ? 'bg-rose-600 text-white' : 'bg-white/15 hover:bg-white/25 text-white'
                    }`}
                    title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
                  >
                    {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                  </button>

                  <button
                    onClick={switchCamera}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white/15 hover:bg-white/25 text-white backdrop-blur-md transition-all active:scale-95"
                    title="Flip camera"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* End Call / Cancel Button */}
              <button
                onClick={isOutgoing ? cancelCall : endCall}
                className="px-6 py-3.5 sm:px-8 sm:py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center space-x-2 shadow-lg shadow-rose-600/40 active:scale-95 transition-transform"
                title="End Call"
              >
                <PhoneOff className="w-5 h-5" />
                <span className="text-xs sm:text-sm font-semibold">
                  {isOutgoing ? 'Cancel' : 'End Call'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallModal;
