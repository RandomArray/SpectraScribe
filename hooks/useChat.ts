import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { ChatMessage } from '../types';

// In production, this should be an env var. For docker compose local, it's proxied or direct.
// Since we used nginx proxy /socket.io -> backend:3001, we can connect to window.location.origin
// BUT only if running via docker compose on port 3000.
// If running dev server on 3000, backend is on 3001.
const SERVER_URL = import.meta.env.PROD ? '/' : 'http://localhost:3001';

export const useChat = (username: string, room: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!username || !room) return;

    const socket = io(SERVER_URL);
    socketRef.current = socket;

    socket.emit('join_room', { room, username });

    socket.on('room_history', (history: ChatMessage[]) => {
      setMessages(history);
    });

    socket.on('receive_message', (message: ChatMessage) => {
      setMessages((prev) => {
        // If message.id exists, update it (for pending transcriptions becoming final)
        const index = prev.findIndex(m => m.id === message.id);

        if (index !== -1) {
            const newMessages = [...prev];
            newMessages[index] = message;
            return newMessages;
        }

        return [...prev, message];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [username, room]);

  const sendMessage = useCallback((text: string, isFinal: boolean = true, source: 'user' | 'transcription' = 'user', id?: string | number) => {
    if (socketRef.current) {
      socketRef.current.emit('send_message', {
         room,
         text,
         username,
         source,
         isFinal,
         timestamp: Date.now(),
         id
      });
    }
  }, [room, username]);

  return { messages, sendMessage };
};
