// import { createContext, useContext, useEffect, useRef, useState } from 'react';
// import { io } from 'socket.io-client';
// import { useAuth } from './AuthContext';

// const SocketContext = createContext(null);

// export const SocketProvider = ({ children }) => {
//   const { user } = useAuth();
//   const socketRef = useRef(null);
//   const [connected, setConnected] = useState(false);
//   const [onlineUserIds, setOnlineUserIds] = useState(new Set());
//   const [isInternetOnline, setIsInternetOnline] = useState(navigator.onLine);

//   // Track browser-level connectivity (drives the "Offline Mode / SMS Fallback" banner)
//   useEffect(() => {
//     const goOnline = () => setIsInternetOnline(true);
//     const goOffline = () => setIsInternetOnline(false);
//     window.addEventListener('online', goOnline);
//     window.addEventListener('offline', goOffline);
//     return () => {
//       window.removeEventListener('online', goOnline);
//       window.removeEventListener('offline', goOffline);
//     };
//   }, []);

//   useEffect(() => {
//     if (!user) {
//       if (socketRef.current) {
//         socketRef.current.disconnect();
//         socketRef.current = null;
//       }
//       setConnected(false);
//       return;
//     }

//     const token = localStorage.getItem('pb_access_token');
//     const socket = io('/', {
//       auth: { token },
//       transports: ['websocket', 'polling'],
//     });

//     socket.on('connect', () => setConnected(true));
//     socket.on('disconnect', () => setConnected(false));

//     socket.on('presence:update', ({ userId, isOnline }) => {
//       setOnlineUserIds((prev) => {
//         const next = new Set(prev);
//         if (isOnline) next.add(userId);
//         else next.delete(userId);
//         return next;
//       });
//     });

//     socketRef.current = socket;

//     return () => {
//       socket.disconnect();
//       socketRef.current = null;
//     };
//   }, [user]);

//   const connectionStatus = !isInternetOnline ? 'sms_fallback' : connected ? 'online' : 'offline';

//   return (
//     <SocketContext.Provider
//       value={{
//         socket: socketRef.current,
//         connected,
//         onlineUserIds,
//         isInternetOnline,
//         connectionStatus, // 'online' | 'offline' | 'sms_fallback'
//       }}
//     >
//       {children}
//     </SocketContext.Provider>
//   );
// };

// export const useSocket = () => useContext(SocketContext);

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [isInternetOnline, setIsInternetOnline] = useState(navigator.onLine);

  // Track browser-level connectivity (drives the "Offline Mode / SMS Fallback" banner)
  useEffect(() => {
    const goOnline = () => setIsInternetOnline(true);
    const goOffline = () => setIsInternetOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnected(false);
      return;
    }

    const token = localStorage.getItem('pb_access_token');
    // VITE_API_URL is the REST API base (e.g. ".../api") — strip that
    // suffix to get the bare backend origin socket.io needs to connect to.
    // Using '/' here only works when Vite's local dev proxy is forwarding
    // /socket.io — once deployed (Vercel), '/' means the frontend's own
    // origin, which has no socket.io server and fails to connect.
    const socketUrl = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '') || '/';
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('presence:update', ({ userId, isOnline }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (isOnline) next.add(userId);
        else next.delete(userId);
        return next;
      });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  const connectionStatus = !isInternetOnline ? 'sms_fallback' : connected ? 'online' : 'offline';

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        connected,
        onlineUserIds,
        isInternetOnline,
        connectionStatus, // 'online' | 'offline' | 'sms_fallback'
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
