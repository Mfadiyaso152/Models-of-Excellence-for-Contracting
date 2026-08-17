import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Trash2, 
  AlertTriangle, 
  ShieldAlert, 
  Mail,
  HardHat,
  Loader2
} from 'lucide-react';
import { User, Project } from '../types';

interface Props {
  user: User;
  projects: Project[];
  onClose: () => void;
  onConfirmDelete: () => void;
}

export function DeleteAccountModal({ user, projects, onClose, onConfirmDelete }: Props) {
  const [confirmationWord, setConfirmationWord] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmationWord.trim() === 'حذف' || confirmationWord.trim() === 'delete') {
      setIsDeleting(true);
      setTimeout(() => {
        onConfirmDelete();
      }, 300);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-red-200 text-[#1C3022] space-y-6 my-4" dir="rtl">
        <form onSubmit={handleConfirmDelete} className="space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-red-100">
            <div className="flex items-center gap-3 text-red-700">
              <button type="button" onClick={onClose} className="p-2 bg-[#FAF7F2] text-[#1C3022] hover:bg-[#EFE7DC] rounded-xl border border-[#E8E2D8] transition-colors flex items-center gap-1 text-xs font-black">
                <span>← رجوع</span>
              </button>
              <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-base sm:text-lg font-black">حذف الحساب والبيانات نهائياً</h3>
            </div>
            <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            هل أنت متأكد من رغبتك في حذف حسابك بشكل نهائي؟ سيتم حذف جميع بيانات الحساب والطلبات والمشاريع المسجلة في السحابة:
          </p>

          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-900 font-bold flex items-center gap-2">
            <Mail className="w-4 h-4 text-red-700 shrink-0" />
            <span className="truncate">{user.email || user.name}</span>
          </div>

          {projects.length > 0 && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>سيتم حذف {projects.length} مشاريع مرتبطة بهذا الحساب.</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-black text-slate-700 mb-1.5">
              لتأكيد الحذف النهائي، اكتب كلمة <span className="text-red-600 font-black">"حذف"</span> في الحقل أدناه:
            </label>
            <input
              type="text"
              value={confirmationWord}
              onChange={e => setConfirmationWord(e.target.value)}
              placeholder="اكتب: حذف"
              required
              className="w-full bg-[#FAF7F2] border-2 border-red-300 focus:border-red-600 rounded-xl p-3 text-xs font-bold text-center text-red-700 outline-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isDeleting || (confirmationWord.trim() !== 'حذف' && confirmationWord.trim() !== 'delete')}
              className="flex-1 bg-red-600 text-white py-3.5 rounded-xl font-black text-xs hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span>تأكيد الحذف النهائي</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 bg-slate-100 text-slate-700 rounded-xl font-black text-xs hover:bg-slate-200"
            >
              إلغاء
            </button>
          </div>
        </form>
    </div>
  );
}

