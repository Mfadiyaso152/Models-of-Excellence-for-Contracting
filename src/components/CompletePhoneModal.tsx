import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Phone, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { User } from '../types';
import { UserService } from '../services/dbService';

interface Props {
  user: User;
  onSavePhone: (updatedUser: User) => void;
}

export function CompletePhoneModal({ user, onSavePhone }: Props) {
  const [phone, setPhone] = useState(user.phone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Lock scroll
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim().replace(/[\s-]/g, '');

    // Validate Saudi mobile number format: 05XXXXXXXX
    if (!/^05\d{8}$/.test(cleanPhone)) {
      setError('يرجى إدخال رقم جوال سعودي صحيح يبدأ بـ 05 ويتكون من 10 أرقام (مثال: 0512345678)');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const updatedUser: User = {
        ...user,
        phone: cleanPhone
      };
      await UserService.saveUser(updatedUser);
      onSavePhone(updatedUser);
    } catch (err) {
      console.error('Error saving phone number:', err);
      setError('حدث خطأ أثناء حفظ رقم الجوال. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-[#E8E2D8] text-[#1C3022] space-y-6 my-4" dir="rtl">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-[#1C3022] text-[#C5B198] rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <Phone className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-black text-[#1C3022]">إكمال بيانات التواصل</h3>
          <p className="text-xs text-slate-500 font-bold leading-relaxed max-w-md mx-auto">
            مرحباً بك! يرجى إدخال رقم الجوال الخاص بك لربط مشاريعك وتلقي إشعارات وسندات الدفعات
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-[#1C3022] mb-1">رقم الجوال *</label>
            <div className="relative">
              <input
                type="tel"
                placeholder="05XXXXXXXX"
                value={phone}
                onChange={e => {
                  setPhone(e.target.value);
                  if (error) setError('');
                }}
                required
                maxLength={10}
                className="w-full bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl px-3.5 py-3 text-sm font-black text-[#1C3022] tracking-wider outline-none focus:ring-2 focus:ring-[#C5B198] text-center"
                dir="ltr"
              />
            </div>
            <span className="text-[10px] text-slate-400 font-bold block mt-1 text-center">
              مثال: 0512345678
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-emerald-800 font-bold bg-emerald-50 py-2 px-3 rounded-xl border border-emerald-200/60">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>بياناتك محفوظة بأعلى درجات الخصوصية والأمان</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#1C3022] text-white py-3.5 rounded-2xl text-xs font-black flex items-center justify-center gap-2 hover:bg-[#122116] shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#1C3022]" />
                <span>جاري الحفظ والمتابعة...</span>
              </>
            ) : (
              <>
                <span>حفظ ومتابعة إلى التطبيق</span>
                <ArrowRight className="w-4 h-4 rotate-180 text-[#1C3022]" />
              </>
            )}
          </button>
        </form>
    </div>
  );
}
