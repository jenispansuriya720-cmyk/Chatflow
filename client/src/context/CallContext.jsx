import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { useToast } from '../components/common/Toast';

const CallContext = createContext();

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const CallProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { addToast } = useToast();

  const [callStatus, setCallStatus] = useState('idle'); // 'idle', 'calling', 'ringing', 'incoming', 'connected', 'reconnecting', 'ended'
  const [callType, setCallType] = useState('audio'); // 'audio', 'video'
  const [activeCall, setActiveCall] = useState(null); // { callId, otherUser, isCaller, startedAt }
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState('good'); // 'good', 'poor', 'reconnecting'

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const timerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const ringtoneIntervalRef = useRef(null);

  // Keep refs updated
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    remoteStreamRef.current = remoteStream;
  }, [remoteStream]);

  // Duration Timer
  useEffect(() => {
    if (callStatus === 'connected') {
      setCallDuration(0);
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [callStatus]);

  // Web Audio API Ringtone Synthesizer
  const playRingtone = (type = 'incoming') => {
    stopRingtone();
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      if (type === 'incoming') {
        // Melodic chime every 2.5 seconds
        const playChime = () => {
          if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') return;
          const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
          notes.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.15);
            gain.gain.setValueAtTime(0.15, ctx.currentTime + index * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.15 + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + index * 0.15);
            osc.stop(ctx.currentTime + index * 0.15 + 0.35);
          });
        };
        playChime();
        ringtoneIntervalRef.current = setInterval(playChime, 2500);
      } else if (type === 'outgoing') {
        // Dual-tone ringing (440Hz + 480Hz) 1s on, 2s off
        const playRing = () => {
          if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') return;
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          osc1.frequency.setValueAtTime(440, ctx.currentTime);
          osc2.frequency.setValueAtTime(480, ctx.currentTime);
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.setValueAtTime(0.08, ctx.currentTime + 1.2);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.25);
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);
          osc1.start(ctx.currentTime);
          osc2.start(ctx.currentTime);
          osc1.stop(ctx.currentTime + 1.3);
          osc2.stop(ctx.currentTime + 1.3);
        };
        playRing();
        ringtoneIntervalRef.current = setInterval(playRing, 3000);
      }
    } catch (e) {
      console.warn('Web Audio playback error:', e);
    }
  };

  const stopRingtone = () => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (e) {}
      audioCtxRef.current = null;
    }
  };

  // Complete cleanup of streams, peer connection, and audio
  const cleanupCall = useCallback(() => {
    stopRingtone();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
      localStreamRef.current = null;
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((t) => t.stop());
      setRemoteStream(null);
      remoteStreamRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    setCallStatus('idle');
    setActiveCall(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setCallDuration(0);
    setConnectionQuality('good');
  }, []);

  // Initialize or get RTCPeerConnection
  const getOrCreatePeerConnection = (targetUserId, callId) => {
    if (pcRef.current) {
      return pcRef.current;
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('call:ice-candidate', {
          callId,
          targetUserId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        remoteStreamRef.current = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (!pc) return;
      const state = pc.connectionState;
      if (state === 'connected') {
        setCallStatus('connected');
        setConnectionQuality('good');
        stopRingtone();
      } else if (state === 'disconnected') {
        setConnectionQuality('poor');
        setCallStatus('reconnecting');
      } else if (state === 'failed') {
        addToast('Call connection failed. Please try again.', 'error');
        cleanupCall();
      } else if (state === 'closed') {
        cleanupCall();
      }
    };

    // Add local tracks if available
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pcRef.current = pc;
    return pc;
  };

  // 1. OUTGOING: Start a voice or video call
  const startCall = async (targetUser, type = 'audio') => {
    if (!socket || !user || !targetUser) return;
    const targetUserId = targetUser._id || targetUser;

    try {
      cleanupCall();
      setCallType(type);
      setCallStatus('calling');
      setActiveCall({
        callId: null,
        otherUser: targetUser,
        isCaller: true,
        startedAt: Date.now(),
      });

      // Capture local camera & microphone
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === 'video',
        });
        setLocalStream(stream);
        localStreamRef.current = stream;
      } catch (mediaErr) {
        console.warn('getUserMedia warning:', mediaErr.message);
        addToast(
          type === 'video'
            ? 'Camera access unavailable or denied. Check browser permissions.'
            : 'Microphone access denied.',
          'error'
        );
        cleanupCall();
        return;
      }

      playRingtone('outgoing');

      // Request call via socket
      socket.emit('call:request', {
        receiverId: targetUserId,
        type,
        callerInfo: {
          _id: user._id,
          fullName: user.fullName,
          username: user.username,
          profilePicture: user.profilePicture,
        },
      });
    } catch (err) {
      console.error('startCall error:', err);
      addToast('Could not place call: ' + err.message, 'error');
      cleanupCall();
    }
  };

  // 2. INCOMING: Accept call
  const acceptCall = async () => {
    if (!activeCall || !socket) return;
    stopRingtone();

    try {
      // Capture local stream
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === 'video',
        });
        setLocalStream(stream);
        localStreamRef.current = stream;
      } catch (e) {
        console.warn('Audio/video capture fallback:', e.message);
      }

      setCallStatus('connected');

      // Notify caller
      socket.emit('call:accept', {
        callId: activeCall.callId,
        callerId: activeCall.otherUser._id,
      });

      const pc = getOrCreatePeerConnection(activeCall.otherUser._id, activeCall.callId);

      // If pending offer was received before accept, set it now
      if (activeCall.pendingOffer) {
        await pc.setRemoteDescription(new RTCSessionDescription(activeCall.pendingOffer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('call:answer', {
          callId: activeCall.callId,
          targetUserId: activeCall.otherUser._id,
          answer,
        });
      }
    } catch (err) {
      console.error('acceptCall error:', err);
      cleanupCall();
    }
  };

  // 3. Decline call
  const declineCall = (reason = 'declined') => {
    if (!activeCall || !socket) {
      cleanupCall();
      return;
    }
    socket.emit('call:decline', {
      callId: activeCall.callId,
      callerId: activeCall.otherUser._id,
      reason,
    });
    cleanupCall();
  };

  // 4. Cancel outgoing call
  const cancelCall = () => {
    if (!activeCall || !socket) {
      cleanupCall();
      return;
    }
    socket.emit('call:cancel', {
      callId: activeCall.callId,
      receiverId: activeCall.otherUser._id,
    });
    cleanupCall();
  };

  // 5. End active call
  const endCall = () => {
    if (!activeCall) {
      cleanupCall();
      return;
    }

    if (socket && activeCall.otherUser?._id) {
      socket.emit('call:end', {
        callId: activeCall.callId,
        targetUserId: activeCall.otherUser._id,
        duration: callDuration,
      });
    }

    if (activeCall.callId) {
      api.put(`/calls/${activeCall.callId}/end`, {
        status: 'completed',
        duration: callDuration,
        endedReason: 'user_ended',
      }).catch(() => {});
    }

    cleanupCall();
  };

  // Toggle Mic
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Video / Camera
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  // Switch camera if mobile
  const switchCamera = async () => {
    if (!localStreamRef.current || callType !== 'video') return;
    try {
      const currentTrack = localStreamRef.current.getVideoTracks()[0];
      if (currentTrack) {
        currentTrack.stop();
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: true,
      });
      const newVideoTrack = newStream.getVideoTracks()[0];

      if (pcRef.current) {
        const sender = pcRef.current.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(newVideoTrack);
        }
      }

      setLocalStream(newStream);
      localStreamRef.current = newStream;
    } catch (e) {
      console.warn('Switch camera error:', e.message);
    }
  };

  // Socket Event Listeners for Call Signaling
  useEffect(() => {
    if (!socket) return;

    // Call Initiated acknowledgment from server
    const handleCallInitiated = ({ callId }) => {
      setActiveCall((prev) => (prev ? { ...prev, callId } : prev));
    };

    // Receiver phone is ringing
    const handleCallRinging = () => {
      setCallStatus('ringing');
    };

    // Incoming call for this user
    const handleIncomingCall = ({ callId, caller, type }) => {
      // If already in a call, notify caller busy
      if (callStatus !== 'idle') {
        socket.emit('call:decline', {
          callId,
          callerId: caller._id,
          reason: 'busy',
        });
        return;
      }

      setCallType(type || 'audio');
      setCallStatus('incoming');
      setActiveCall({
        callId,
        otherUser: caller,
        isCaller: false,
        startedAt: Date.now(),
      });

      // Acknowledge ringing to caller
      socket.emit('call:ringing', { callId, callerId: caller._id });
      playRingtone('incoming');
    };

    // Call accepted by receiver
    const handleCallAccepted = async ({ callId, receiverId }) => {
      stopRingtone();
      setCallStatus('connected');
      setActiveCall((prev) => (prev ? { ...prev, callId } : prev));

      // Caller initiates WebRTC offer
      try {
        const pc = getOrCreatePeerConnection(receiverId, callId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('call:offer', {
          callId,
          targetUserId: receiverId,
          offer,
        });
      } catch (err) {
        console.error('Error creating WebRTC offer:', err);
      }
    };

    // Call declined by receiver
    const handleCallDeclined = ({ reason }) => {
      stopRingtone();
      addToast(reason === 'busy' ? 'User is busy on another call.' : 'Call declined.', 'info');
      cleanupCall();
    };

    // Call cancelled by caller before answer
    const handleCallCancelled = () => {
      stopRingtone();
      addToast('Call cancelled by caller.', 'info');
      cleanupCall();
    };

    // Call ended by other party
    const handleCallEnded = () => {
      stopRingtone();
      addToast('Call ended.', 'info');
      cleanupCall();
    };

    // User is offline
    const handleCallOffline = ({ message }) => {
      stopRingtone();
      addToast(message || 'User is currently offline.', 'info');
      cleanupCall();
    };

    // Call error (e.g. blocked, permission denied)
    const handleCallError = ({ code, message }) => {
      stopRingtone();
      addToast(message || 'Cannot complete call.', 'error');
      cleanupCall();
    };

    // WebRTC Offer received
    const handleCallOffer = async ({ callId, offer, fromUserId }) => {
      try {
        if (callStatus === 'connected') {
          const pc = getOrCreatePeerConnection(fromUserId, callId);
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit('call:answer', {
            callId,
            targetUserId: fromUserId,
            answer,
          });
        } else {
          // Store pending offer to handle when user taps Accept
          setActiveCall((prev) => (prev ? { ...prev, pendingOffer: offer } : prev));
        }
      } catch (err) {
        console.error('Error handling WebRTC offer:', err);
      }
    };

    // WebRTC Answer received
    const handleCallAnswer = async ({ answer }) => {
      try {
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (err) {
        console.error('Error handling WebRTC answer:', err);
      }
    };

    // WebRTC ICE candidate received
    const handleCallIceCandidate = async ({ candidate }) => {
      try {
        if (pcRef.current && candidate) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    };

    socket.on('call:initiated', handleCallInitiated);
    socket.on('call:ringing', handleCallRinging);
    socket.on('call:incoming', handleIncomingCall);
    socket.on('call:accepted', handleCallAccepted);
    socket.on('call:declined', handleCallDeclined);
    socket.on('call:cancelled', handleCallCancelled);
    socket.on('call:ended', handleCallEnded);
    socket.on('call:offline', handleCallOffline);
    socket.on('call:error', handleCallError);
    socket.on('call:offer', handleCallOffer);
    socket.on('call:answer', handleCallAnswer);
    socket.on('call:ice-candidate', handleCallIceCandidate);

    return () => {
      socket.off('call:initiated', handleCallInitiated);
      socket.off('call:ringing', handleCallRinging);
      socket.off('call:incoming', handleIncomingCall);
      socket.off('call:accepted', handleCallAccepted);
      socket.off('call:declined', handleCallDeclined);
      socket.off('call:cancelled', handleCallCancelled);
      socket.off('call:ended', handleCallEnded);
      socket.off('call:offline', handleCallOffline);
      socket.off('call:error', handleCallError);
      socket.off('call:offer', handleCallOffer);
      socket.off('call:answer', handleCallAnswer);
      socket.off('call:ice-candidate', handleCallIceCandidate);
    };
  }, [socket, callStatus, activeCall?.callId]);

  return (
    <CallContext.Provider
      value={{
        callStatus,
        callType,
        activeCall,
        localStream,
        remoteStream,
        isMuted,
        isVideoOff,
        callDuration,
        connectionQuality,
        startCall,
        acceptCall,
        declineCall,
        cancelCall,
        endCall,
        toggleMute,
        toggleVideo,
        switchCamera,
        cleanupCall,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => useContext(CallContext);
