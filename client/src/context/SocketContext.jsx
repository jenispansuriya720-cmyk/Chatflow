import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Connect to Socket.IO with token in handshake auth
    const socketEndpoint =
      import.meta.env.VITE_SOCKET_URL ||
      import.meta.env.VITE_API_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '');

    const newSocket = io(socketEndpoint, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    newSocket.on('connect_error', (err) => {
      console.warn('[ChatFlow Socket] Connection notice:', err.message);
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('setupUser', user._id);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('getOnlineUsers', (userIds) => {
      setOnlineUsers(new Set(userIds));
    });

    newSocket.on('userOnline', ({ userId }) => {
      if (userId) {
        setOnlineUsers((prev) => new Set([...prev, userId.toString()]));
      }
    });

    newSocket.on('userOffline', ({ userId }) => {
      if (userId) {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          next.delete(userId.toString());
          return next;
        });
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, user?._id]);

  const isUserOnline = (userId) => {
    if (!userId) return false;
    const id = typeof userId === 'object' ? userId._id : userId;
    return onlineUsers.has(id?.toString());
  };

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, isUserOnline, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
