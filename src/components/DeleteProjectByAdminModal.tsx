import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';
import { Project } from '../types';

interface Props {
  project: Project;
  onClose: () => void;
  onConfirmDelete: (projectId: string, reason: string) => Promise<void>;
  onRequestToast: (msg: string) => void;
}

export function DeleteProjectByAdminModal({ project, onClose, onConfirmDelete, onRequestToast }: Props) {
  const [reason, setReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!reason.trim()) {
      onRequestToast('يرجى كتابة سبب الحذف لتوضيحه للعميل');
      return;
    }
    setIsDeleting(true);
    try {
      await onConfirmDelete(project.id, reason);
    } catch (err) {
      console.error(err);
      onRequestToast('حدث خطأ أثناء الحذف');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white border border-[#E8E2D8] w-full max-w-sm rounded-[2rem] p-6 shadow-2xl space-y-5"
      >
        <div className="flex items-start justify-between">
          <div className="w-14 h-14 bg-red-50 border border-red-200 text-red-600 rounded-full flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <button onClick={onClose} className="p-2 bg-[#FAF7F2] text-slate-500 hover:text-slate-700 hover:bg-[#EFE7DC] rounded-full transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <h3 className="text-lg font-black text-[#1C3022] mb-1">حذف المشروع نهائياً</h3>
          <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
            سيتم حذف المشروع ({project.title}) وإبلاغ العميل بالسبب. لا يمكن التراجع عن هذا الإجراء.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 block px-1">سبب الحذف (سيظهر للعميل) *</label>
          <textarea
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="اكتب سبب الحذف هنا..."
            className="w-full bg-[#FAF7F2] border border-[#E8E2D8] text-[#1C3022] rounded-xl p-3 text-xs font-bold outline-none focus:border-red-300 resize-none"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-3 rounded-xl bg-[#FAF7F2] border border-[#E8E2D8] text-[#1C3022] text-xs font-black hover:bg-[#EFE7DC] transition-all"
          >
            إلغاء
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting || !reason.trim()}
            className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 border border-red-500/40 text-white text-xs font-black transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            <span>حذف المشروع</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
