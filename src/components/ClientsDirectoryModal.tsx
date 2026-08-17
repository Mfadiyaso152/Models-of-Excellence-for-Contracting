import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Users, 
  Phone, 
  Mail, 
  Copy, 
  Check, 
  MessageCircle
} from 'lucide-react';
import { User } from '../types';

interface ClientsDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: User[];
}

export const ClientsDirectoryModal: React.FC<ClientsDirectoryModalProps> = ({
  isOpen,
  onClose,
  clients
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Prevent background scrolling when modal is open on desktop & mobile
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter out supervisor email if any, or include all real client accounts
  const nonSupervisorClients = clients.filter(
    (c) => c.email?.toLowerCase() !== 'mfb.15.f@gmail.com' && !c.isDeleted
  );

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const getCleanPhone = (phone?: string) => {
    if (!phone) return '';
    let cleaned = phone.replace(/[^0-9+]/g, '');
    if (cleaned.startsWith('05')) {
      cleaned = '966' + cleaned.substring(1);
    } else if (cleaned.startsWith('5')) {
      cleaned = '966' + cleaned;
    }
    return cleaned;
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm touch-none" 
        dir="rtl"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="bg-[#FAF7F2] w-full max-w-lg max-h-[85vh] rounded-3xl border border-[#E8E2D8] shadow-2xl flex flex-col overflow-hidden touch-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="bg-[#1C3022] px-5 py-4 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#C5B198] text-[#1C3022] flex items-center justify-center font-black shadow-md">
                <Users className="w-4 h-4 text-[#1C3022]" />
              </div>
              <h2 className="text-sm font-black tracking-wide text-white">دليل بيانات العملاء</h2>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-95"
              title="إغلاق"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Clients List */}
          <div className="p-4 overflow-y-auto overscroll-contain space-y-3 max-h-[65vh]">
            {nonSupervisorClients.length === 0 ? (
              <div className="py-10 text-center space-y-2 bg-white rounded-2xl border border-dashed border-[#E8E2D8]">
                <div className="w-10 h-10 bg-[#FAF7F2] rounded-full mx-auto flex items-center justify-center text-slate-400">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-black text-[#1C3022]">لا يوجد عملاء مسجلين حالياً</h3>
              </div>
            ) : (
              nonSupervisorClients.map((client) => {
                const cleanPhone = getCleanPhone(client.phone);

                return (
                  <motion.div
                    key={client.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-3.5 border border-[#E8E2D8] hover:border-[#C5B198] shadow-sm transition-all space-y-2.5"
                  >
                    {/* Top Row: User Avatar & Name */}
                    <div className="flex items-center gap-2.5 pb-2 border-b border-[#F0EBE1]">
                      <div className="w-9 h-9 rounded-xl bg-[#EFE7DC] border border-[#C5B198]/40 flex items-center justify-center text-[#1C3022] font-black overflow-hidden shrink-0">
                        {client.photoURL ? (
                          <img
                            src={client.photoURL}
                            alt={client.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-xs">{client.name?.charAt(0) || 'ع'}</span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-[#1C3022]">{client.name}</h3>
                      </div>
                    </div>

                    {/* Contact Information Grid: Phone & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {/* Phone Number Field */}
                      <div className="bg-[#FAF7F2] p-2 rounded-xl border border-[#E8E2D8] flex items-center justify-between">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <div className="w-6 h-6 rounded-lg bg-emerald-100/60 text-emerald-800 flex items-center justify-center shrink-0">
                            <Phone className="w-3 h-3" />
                          </div>
                          <div className="overflow-hidden">
                            <div className="text-[9px] text-slate-400 font-black">الجوال</div>
                            <div className="text-[11px] font-black text-[#1C3022] truncate" dir="ltr">
                              {client.phone || <span className="text-slate-400 text-[10px] italic">غير مسجل</span>}
                            </div>
                          </div>
                        </div>

                        {/* Phone Quick Actions */}
                        {client.phone && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCopy(client.phone!, `phone-${client.id}`)}
                              className="w-5 h-5 rounded-md bg-white hover:bg-[#EFE7DC] text-slate-600 border border-[#E8E2D8] flex items-center justify-center transition-all"
                              title="نسخ الرقم"
                            >
                              {copiedField === `phone-${client.id}` ? (
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-2.5 h-2.5" />
                              )}
                            </button>

                            <a
                              href={`tel:${client.phone}`}
                              className="w-5 h-5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center transition-all"
                              title="اتصال هاتفي مباشر"
                            >
                              <Phone className="w-2.5 h-2.5" />
                            </a>

                            {cleanPhone && (
                              <a
                                href={`https://wa.me/${cleanPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="w-5 h-5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-all shadow-sm"
                                title="واتساب"
                              >
                                <MessageCircle className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Email Address Field */}
                      <div className="bg-[#FAF7F2] p-2 rounded-xl border border-[#E8E2D8] flex items-center justify-between">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <div className="w-6 h-6 rounded-lg bg-blue-100/60 text-blue-800 flex items-center justify-center shrink-0">
                            <Mail className="w-3 h-3" />
                          </div>
                          <div className="overflow-hidden">
                            <div className="text-[9px] text-slate-400 font-black">البريد</div>
                            <div className="text-[11px] font-black text-[#1C3022] truncate" dir="ltr" title={client.email}>
                              {client.email || <span className="text-slate-400 text-[10px] italic">غير مسجل</span>}
                            </div>
                          </div>
                        </div>

                        {/* Email Quick Actions */}
                        {client.email && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCopy(client.email, `email-${client.id}`)}
                              className="w-5 h-5 rounded-md bg-white hover:bg-[#EFE7DC] text-slate-600 border border-[#E8E2D8] flex items-center justify-center transition-all"
                              title="نسخ البريد"
                            >
                              {copiedField === `email-${client.id}` ? (
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-2.5 h-2.5" />
                              )}
                            </button>

                            <a
                              href={`mailto:${client.email}`}
                              className="w-5 h-5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center transition-all"
                              title="إرسال بريد"
                            >
                              <Mail className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-3 bg-white border-t border-[#E8E2D8] flex justify-end items-center shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="bg-[#1C3022] text-white hover:bg-[#122116] px-5 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95"
            >
              إغلاق
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
