import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../types';
import { Mic, Send, MessageSquare, Paperclip } from 'lucide-react';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, isFinal?: boolean, source?: 'user' | 'transcription', id?: string | number, type?: 'text' | 'image', mediaUrl?: string) => void;
  currentUser: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, currentUser }) => {
  const endRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inputText, setInputText] = useState('');
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Scroll to bottom if near bottom or if message is from self
  useEffect(() => {
    if (shouldAutoScroll) {
       endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, shouldAutoScroll]);

  // Handle Scroll to detect if user scrolled up
  const handleScroll = () => {
      if (!containerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      // If client is within 100px of bottom, auto-scroll is ON
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShouldAutoScroll(isNearBottom);
  };

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
    setShouldAutoScroll(true); // Force scroll on send
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('image', file);

      try {
          // Use relative path - nginx will proxy /upload to backend
          const response = await fetch('/upload', {
              method: 'POST',
              body: formData,
          });
          const data = await response.json();
          if (data.url) {
              // Send as an image message
              onSendMessage('', true, 'user', undefined, 'image', data.url);
              setShouldAutoScroll(true);
          }
      } catch (err) {
          console.error("Upload failed", err);
          alert("Failed to upload image");
      } finally {
          // Reset input
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-2 bg-slate-900">
        <MessageSquare className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-semibold text-slate-200">Live Conversation</h3>
      </div>
      
      {/* Messages Area */}
      <div 
         ref={containerRef}
         onScroll={handleScroll}
         className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide"
      >
        {messages.length === 0 && (
            <div className="text-slate-500 text-sm italic text-center mt-10">
                Start the conversation...
            </div>
        )}
        
        {messages.map((msg, idx) => {
            const isSystem = msg.source === 'system';
            const isMe = msg.username === currentUser;
            
            if (isSystem) {
                return (
                    <div key={idx} className="flex justify-center my-2">
                        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-full">{msg.text}</span>
                    </div>
                )
            }

            return (
              <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                 <div className="flex items-baseline gap-2 mb-1">
                    <span 
                      className="text-xs font-bold"
                      style={{ color: msg.color || '#fff' }}
                    >
                        {msg.username}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                 </div>
                 <div 
                   className={`max-w-[85%] p-3 rounded-lg text-sm leading-relaxed break-words shadow-sm
                     ${isMe 
                       ? 'bg-cyan-900/40 text-cyan-100 rounded-tr-none border border-cyan-800/50' 
                       : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                     }
                     ${!msg.isFinal ? 'opacity-70 italic border-dashed' : ''}
                   `}
                 >
                    {msg.type === 'image' && msg.mediaUrl ? (
                        <div className="rounded overflow-hidden mb-1">
                             <img 
                                src={msg.mediaUrl} 
                                alt="Shared image" 
                                className="max-w-full h-auto max-h-[200px] object-cover hover:scale-105 transition-transform cursor-pointer"
                                onClick={() => window.open(msg.mediaUrl, '_blank')}
                             />
                        </div>
                    ) : (
                        msg.text
                    )}
                 </div>
              </div>
            );
        })}
        <div ref={endRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-800 bg-slate-950">
          <form onSubmit={handleSend} className="relative flex gap-2">
              <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload}
              />
              <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 bg-slate-800 text-slate-400 rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
                  title="Upload Image"
              >
                  <Paperclip className="w-5 h-5" />
              </button>

              <div className="relative flex-1">
                <input 
                    type="text" 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg py-3 px-5 pr-12 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder:text-slate-600"
                />
                <button 
                    type="submit" 
                    disabled={!inputText.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-500 disabled:opacity-50 disabled:hover:bg-cyan-600 transition-colors"
                >
                    <Send className="w-4 h-4" />
                </button>
              </div>
          </form>
      </div>
    </div>
  );
};

export default ChatInterface;
