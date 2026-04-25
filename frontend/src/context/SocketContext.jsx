import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!user) return;

    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  const joinRoom = (roomId) => {
    if (!socket) return;
    socket.emit('join-room', { roomId, userId: user.id, userName: user.name });
    
    socket.on('presence-update', (users) => {
      setOnlineUsers(users);
    });
    
    socket.on('user-joined', ({ userId, userName }) => {
      console.log(`${userName} joined`);
    });
    
    socket.on('user-left', ({ userId }) => {
      console.log('User left');
    });
  };

  const leaveRoom = () => {
    if (!socket) return;
    socket.emit('leave-room');
    socket.off('presence-update');
    socket.off('user-joined');
    socket.off('user-left');
    setOnlineUsers([]);
  };

  const onNewSnippet = (callback) => {
    if (!socket) return;
    socket.on('snippet-added', callback);
    return () => socket.off('snippet-added', callback);
  };

  const onSnippetUpdated = (callback) => {
    if (!socket) return;
    socket.on('snippet-updated', callback);
    return () => socket.off('snippet-updated', callback);
  };

  const emitNewSnippet = (snippetData) => {
    if (!socket) return;
    socket.emit('new-snippet', snippetData);
  };

  const emitUpdateSnippet = (snippetId, title, code, language) => {
    if (!socket) return;
    socket.emit('update-snippet', { snippetId, title, code, language });
  };
  
  const onSnippetDeleted = (callback) => {
  if (!socket) return;
  socket.on('snippet-deleted', callback);
  return () => socket.off('snippet-deleted', callback);
};

    const emitDeleteSnippet = (snippetId) => {
  if (!socket) return;
  socket.emit('delete-snippet', { snippetId });
};

  return (
    <SocketContext.Provider value={{
      socket,
      onlineUsers,
      joinRoom,
      leaveRoom,
      onNewSnippet,
      onSnippetUpdated,
      onSnippetDeleted,
      emitNewSnippet,
      emitUpdateSnippet,
      emitDeleteSnippet
    }}>
      {children}
    </SocketContext.Provider>
  );
};