import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, AlertTriangle, Phone, Mail, LogOut, Building2 } from 'lucide-react';
import { User } from '../types';
import { Logo } from './Logo';

interface Props {
  user: User;
  onLogout: () => void;
  onReRegister?: () => void;
}

export function DeletedAccountScreen({ user, onLogout, onReRegister }: Props) {
  return (
    <div className="min-h-screen bg-[#1C3022] flex flex-col justify-between p-6 max-w-md mx-auto relative overflow-hidden font-sans" dir="rtl">
      {/* Background Ambience */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-red-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#284430] rounded-full blur-2xl pointer-events-none"></div>

      {/* Top Branding */}
      <div className="pt-10 pb-4 text-center relative z-10">
        <div className="w-18 h-18 bg-[#C5B198] rounded-3xl mx-auto flex items-center justify-center p-3 shadow-2xl mb-3 border border-[#EFE7DC]/40">
          <Logo size="md" showText={false} />
        </div>
        <h1 className="text-xl font-black text-[#1C3022]">نماذج التميز للمقاولات</h1>
        <p className="text-xs text-[#C5B198] font-bold mt-0.5">بوابة إدارة المشاريع والعملاء</p>
      </div>

      {/* Main Notification Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2.5rem] p-7 shadow-2xl border border-red-200 relative z-10 my-auto text-[#1C3022] space-y-4"
      >
        <div className="w-16 h-16 bg-red-100 rounded-3xl flex items-center justify-center mx-auto text-red-600 shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-lg font-black text-red-950">تم حذف حسابك</h2>
          <p className="text-xs text-slate-500 font-bold">
            تم إيقاف وحذف هذا الحساب من قِبل إدارة نماذج التميز
          </p>
        </div>

        {/* Reason Box */}
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl space-y-2">
          <span className="text-[10px] font-black text-red-800 block">سبب الحذف:</span>
          <p className="text-xs font-black text-red-950 leading-relaxed">
            {user.deletedReason || 'تم حذف الحساب بناءً على مراجعة الإدارة المختصة.'}
          </p>
          {user.deletedAt && (
            <span className="text-[10px] text-red-700 font-bold block pt-1 border-t border-red-200" dir="ltr">
              تاريخ الإجراء: {new Date(user.deletedAt).toLocaleDateString('ar-SA')}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          {onReRegister && (
            <button
              onClick={onReRegister}
              className="w-full bg-[#1C3022] text-white py-3.5 rounded-2xl font-black text-xs hover:bg-[#122116] transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.98]"
            >
              <span>إنشاء حساب جديد والتسجيل مجدداً</span>
            </button>
          )}

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="w-full bg-white border border-[#E8E2D8] text-slate-700 py-3 rounded-2xl font-black text-xs hover:bg-[#FAF7F2] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <LogOut className="w-4 h-4 text-slate-500" />
            <span>تسجيل الخروج والعودة</span>
          </button>
        </div>
      </motion.div>

      {/* Footer */}
      <div className="text-center text-[10px] text-slate-500 pb-2 relative z-10">
        مؤسسة نماذج التميز للمقاولات العامة والتطوير الإنشائي
      </div>
    </div>
  );
}
