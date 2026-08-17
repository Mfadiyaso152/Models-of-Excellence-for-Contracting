import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, MessageSquare, Headphones, ShieldCheck, Mail, Loader2, User as UserIcon, ChevronRight } from 'lucide-react';
import { User, SupportMessage } from '../types';
import { db, collection, addDoc, query, where, onSnapshot, orderBy, doc, setDoc } from '../firebase';

interface Props {
  user: User;
  onClose?: () => void;
  onRequestToast: (msg: string) => void;
  isFullScreen?: boolean;
  onLogout?: () => void;
}

const SUPPORT_EMAIL = 'mfb.15.srt@gmail.com';

export function CustomerSupportModal({ user, onClose, onRequestToast, isFullScreen, onLogout }: Props) {
  const isSupportAgent = user.email?.trim().toLowerCase() === SUPPORT_EMAIL.toLowerCase() || 
                         user.email?.trim().toLowerCase() === 'mfb.15.f@gmail.com' ||
                         user.role === 'admin' || 
                         user.role === 'supervisor';
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [allClientsMap, setAllClientsMap] = useState<Map<string, { name: string; email: string }>>(new Map());
  const [presenceMap, setPresenceMap] = useState<Map<string, string>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Lock body scroll
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Track online/presence status for clients
  useEffect(() => {
    if (!isSupportAgent && user?.id) {
      const docRef = doc(db, 'user_presence', user.id);
      setDoc(docRef, {
        userId: user.id,
        status: 'online',
        name: user.name,
        lastActive: new Date().toISOString()
      }).catch(err => console.error('Error setting online status:', err));

      return () => {
        setDoc(docRef, {
          userId: user.id,
          status: 'offline',
          name: user.name,
          lastActive: new Date().toISOString()
        }).catch(err => console.error('Error setting offline status:', err));
      };
    }
  }, [isSupportAgent, user]);

  // Listen to presence of all users for support agent
  useEffect(() => {
    if (isSupportAgent) {
      const q = query(collection(db, 'user_presence'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const pMap = new Map<string, string>();
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.userId) {
            pMap.set(data.userId, data.status);
          }
        });
        setPresenceMap(pMap);
      });
      return () => unsubscribe();
    }
  }, [isSupportAgent]);

  // Listen to support messages in real-time
  useEffect(() => {
    const q = query(collection(db, 'support_messages'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: SupportMessage[] = [];
      const clientMap = new Map<string, { name: string; email: string }>();

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as SupportMessage;
        msgs.push({ ...data, id: docSnap.id });
        if (data.clientId && data.clientName) {
          clientMap.set(data.clientId, { name: data.clientName, email: data.clientEmail || '' });
        }
      });

      // Sort by timestamp asc
      msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setMessages(msgs);
      setAllClientsMap(clientMap);
    });

    return () => unsubscribe();
  }, [isSupportAgent]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedClientId]);

  const activeClientId = isSupportAgent ? (selectedClientId || '') : user.id;
  const filteredMessages = messages.filter(m => m.clientId === activeClientId);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    if (isSupportAgent && !selectedClientId) {
      alert('يرجى اختيار العميل أولاً للرد عليه.');
      return;
    }

    setIsSending(true);
    const msgPayload: SupportMessage = {
      id: `SUP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      clientId: activeClientId,
      clientName: isSupportAgent ? (allClientsMap.get(activeClientId)?.name || 'العميل') : user.name,
      clientEmail: isSupportAgent ? (allClientsMap.get(activeClientId)?.email || '') : user.email,
      senderRole: isSupportAgent ? 'support' : 'client',
      senderName: isSupportAgent ? 'خدمة عملاء نماذج التميز' : user.name,
      message: newMessage.trim(),
      timestamp: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'support_messages'), msgPayload);
      setNewMessage('');
    } catch (err) {
      console.error('Error sending support message:', err);
      onRequestToast('حدث خطأ أثناء إرسال الرسالة');
    } finally {
      setIsSending(false);
    }
  };

  const content = (
    <div
      className={
        isFullScreen
          ? "bg-white w-full h-[calc(100vh-110px)] rounded-[2.5rem] shadow-xl border border-[#E8E2D8] overflow-hidden flex flex-col text-[#1C3022]"
          : "bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-[#E8E2D8] overflow-hidden flex flex-col h-[82vh] text-[#1C3022]"
      }
      dir="rtl"
    >
      {/* Header */}
      <div className={`p-4 px-6 flex items-center justify-between shrink-0 border-b ${!isSupportAgent ? 'bg-[#1C3022] text-white border-[#2A3A2F]' : 'bg-[#FAF7F2] text-[#1C3022] border-[#E8E2D8]'}`}>
        <div className="flex items-center gap-3">
          {isSupportAgent && selectedClientId && (
            <button
              onClick={() => setSelectedClientId(null)}
              className="px-3 py-1.5 rounded-xl bg-[#1C3022] text-white text-xs font-black flex items-center gap-1.5 hover:bg-[#122116] transition-all shrink-0 shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
              <span>قائمة العملاء</span>
            </button>
          )}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${!isSupportAgent ? 'bg-white/10 text-[#C5B198]' : 'bg-white border border-[#E8E2D8] text-[#C5B198]'}`}>
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black flex items-center gap-2">
              <span>{isSupportAgent && selectedClientId ? (allClientsMap.get(selectedClientId)?.name || 'محادثة عميل') : 'خدمة عملاء نماذج التميز'}</span>
              <span className={`w-2.5 h-2.5 rounded-full ${(!isSupportAgent || (selectedClientId && presenceMap.get(selectedClientId) === 'online')) ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
              {isSupportAgent && selectedClientId && (
                <span className="text-[10px] font-bold text-slate-400">
                  {presenceMap.get(selectedClientId) === 'online' ? 'متصل' : 'غير متصل'}
                </span>
              )}
            </h3>
            {!isSupportAgent && (
              <p className="text-[10px] text-[#C5B198] font-bold mt-0.5">
                نحن هنا لخدمتكم والإجابة على كافة استفساراتكم الهندسية
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onLogout && (
            <button
              onClick={onLogout}
              className="px-3 py-1.5 rounded-xl bg-red-900/40 border border-red-500/30 hover:bg-red-900/60 text-red-300 text-xs font-black transition-all flex items-center gap-1.5"
            >
              <span>تسجيل خروج</span>
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${!isSupportAgent ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white border border-[#E8E2D8] text-slate-600 hover:text-[#1C3022]'}`}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Body Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Support Agent View: Conversations List */}
        {isSupportAgent && !selectedClientId ? (
          <div className="w-full bg-white overflow-y-auto p-4 space-y-3">
            <h4 className="text-xs font-black text-[#C5B198] mb-4 px-2">العملاء النشطون ({allClientsMap.size})</h4>
            {allClientsMap.size === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                <div className="w-14 h-14 rounded-full bg-[#FAF7F2] border border-[#E8E2D8] flex items-center justify-center text-[#C5B198]/50">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black text-slate-500 mt-2">لا توجد محادثات نشطة بعد</h4>
              </div>
            ) : (
              <div className="grid gap-2">
                {Array.from(allClientsMap.entries()).map(([cId, info]) => {
                  const isOnline = presenceMap.get(cId) === 'online';
                  return (
                    <button
                      key={cId}
                      onClick={() => setSelectedClientId(cId)}
                      className="w-full text-right p-4 rounded-[1.5rem] transition-all flex items-center gap-4 bg-[#FAF7F2] border border-[#E8E2D8] hover:bg-[#EFE7DC] group"
                    >
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-black shrink-0 bg-white text-[#C5B198] border border-[#E8E2D8] group-hover:scale-105 transition-transform relative">
                        <UserIcon className="w-5 h-5" />
                        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                      </div>
                      <div className="flex-1 truncate">
                        <h5 className="text-sm font-black text-[#1C3022] truncate">{info.name}</h5>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#C5B198] opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="w-4 h-4 rotate-180" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col bg-[#FAF7F2] overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {filteredMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
                  <h4 className="text-sm font-black text-[#1C3022]">ابدأ المحادثة الفورية</h4>
                  <p className="text-[11px] max-w-xs text-slate-400 leading-relaxed">
                    جميع المحادثات محفوظة سحابياً ويتم الرد عليها من قبل فريق الدعم الفني بشكل فوري.
                  </p>
                </div>
              ) : (
                filteredMessages.map((msg) => {
                  const isMe = msg.senderRole === (isSupportAgent ? 'support' : 'client');
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5 px-2">
                        <span className="text-[10px] font-bold text-slate-400">{msg.senderName}</span>
                        <span className="text-[9px] text-[#1C3022]/30">
                          {new Date(msg.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div
                        className={`max-w-[85%] p-4 rounded-[1.5rem] text-[13px] font-medium shadow-sm leading-relaxed ${
                          isMe
                            ? 'bg-[#D0A97E] text-[#1C3022] rounded-tl-sm'
                            : 'bg-white border border-[#E8E2D8] text-[#1C3022] rounded-tr-sm'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-[#E8E2D8] flex items-center gap-3">
              <input
                type="text"
                placeholder="اكتب رسالتك هنا..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                className="flex-1 bg-[#FAF7F2] border border-[#E8E2D8] rounded-full px-5 py-3.5 text-[13px] font-bold text-[#1C3022] outline-none focus:border-[#D0A97E]/50 transition-all placeholder-slate-400"
              />
              <button
                type="submit"
                disabled={isSending || !newMessage.trim()}
                className="bg-[#1C3022] text-white hover:bg-[#122116] w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 disabled:opacity-50 shrink-0"
              >
                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 -ml-1" />}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );

  if (isFullScreen) {
    return (
      <div className="w-full h-full p-4 flex flex-col items-center justify-center bg-[#FAF7F2]">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl h-[82vh]"
      >
        {content}
      </motion.div>
    </div>
  );
}
