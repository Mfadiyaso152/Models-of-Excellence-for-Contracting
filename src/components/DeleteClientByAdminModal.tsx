import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  Mail,
  HardHat,
  Loader2,
  FileWarning,
  UserX,
  Check
} from 'lucide-react';
import { User, Project } from '../types';

interface Props {
  client: User;
  projects: Project[];
  onClose: () => void;
  onConfirmDelete: (clientId: string, reason: string) => Promise<void>;
  onRequestToast: (msg: string) => void;
}

const PRESET_REASONS = [
  'مخالفة الشروط وسياسة الاستخدام',
  'طلب مباشر من العميل لإلغاء الحساب',
  'إلغاء الاتفاقية المسبقة بين الطرفين',
  'حساب مكرر / تجريبي',
  'عدم التجاوب واستكمال إجراءات التعاقد'
];

export function DeleteClientByAdminModal({
  client,
  projects,
  onClose,
  onConfirmDelete,
  onRequestToast
}: Props) {
  const clientProjects = projects.filter(p => p.clientId === client.id);
  const activeProjects = clientProjects.filter(p => p.status !== 'مكتمل');
  const hasProjects = clientProjects.length > 0;

  const [selectedPreset, setSelectedPreset] = useState<string>('طلب مباشر من العميل لإلغاء الحساب');
  const [customReason, setCustomReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const finalReason = customReason.trim() || selectedPreset || 'حذف الحساب بقرار المشرف العام';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeleting(true);
    try {
      await onConfirmDelete(client.id, finalReason);
      onRequestToast('تم حذف حساب العميل بنجاح.');
      onClose();
    } catch (err) {
      console.error('Error deleting client:', err);
      onRequestToast('حدث خطأ أثناء محاولة حذف الحساب.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto" dir="rtl">
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 shadow-2xl border-t sm:border border-red-200 text-[#1C3022] space-y-4 max-h-[92vh] overflow-y-auto"
      >
        <div className="w-12 h-1.5 bg-[#E8E2D8] rounded-full mx-auto mb-2 sm:hidden"></div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-red-100">
            <div className="flex items-center gap-2 text-red-700">
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                <UserX className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-black">حذف حساب العميل نهائياً</h3>
                <p className="text-[10px] text-slate-400 font-bold">لوحة تحكم المشرف العام</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Client Info Banner */}
          <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-red-200 flex items-center justify-center font-black text-xs text-red-800 shrink-0">
              {client.name.charAt(0)}
            </div>
            <div className="overflow-hidden flex-1">
              <h4 className="text-xs font-black text-red-950 truncate">{client.name}</h4>
              <p className="text-[10px] text-red-800 truncate" dir="ltr">{client.email || client.phone || 'حساب مستخدم'}</p>
            </div>
            <span className="text-[10px] font-bold bg-white px-2 py-1 rounded-lg border border-red-200 text-red-700 shrink-0">
              {clientProjects.length} مشاريع
            </span>
          </div>

          {hasProjects && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-[11px] text-amber-900 font-bold">
              <div className="flex items-center gap-1.5 text-amber-800 font-black">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>تنبيه: هذا العميل مرتبط بـ {clientProjects.length} مشاريع</span>
              </div>
              <p className="text-[10px] text-slate-600 leading-relaxed">
                تأكيد الحذف سيقوم بمسح الحساب والمشاريع وعروض الأسعار التابعة له نهائياً من قاعدة البيانات.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-black text-[#1C3022]">
              سبب الحذف (اختياري / لتسجيل الإجراء)
            </label>
            
            {/* Quick preset selection pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {PRESET_REASONS.map(reason => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => {
                    setSelectedPreset(reason);
                    setCustomReason(reason);
                  }}
                  className={`text-[10px] font-black px-2.5 py-1.5 rounded-xl border transition-all ${
                    (customReason === reason || (!customReason && selectedPreset === reason))
                      ? 'bg-red-600 text-white border-red-600 shadow-sm'
                      : 'bg-[#FAF7F2] text-slate-700 border-[#E8E2D8] hover:border-red-300'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            {/* Custom reason textarea */}
            <textarea
              rows={2}
              value={customReason}
              onChange={e => setCustomReason(e.target.value)}
              placeholder="اكتب ملاحظة أو سبب الحذف..."
              className="w-full mt-1.5 bg-[#FAF7F2] border border-[#E8E2D8] focus:border-red-400 rounded-2xl p-3 text-xs font-bold text-[#1C3022] outline-none resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={isDeleting}
              className="flex-1 bg-red-600 text-white py-3.5 rounded-2xl font-black text-xs hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.98] disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>جاري تنفيذ الحذف...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 text-white" />
                  <span>تأكيد حذف الحساب نهائياً</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="bg-slate-100 text-slate-700 hover:bg-slate-200 py-3.5 px-4 rounded-2xl text-xs font-bold transition-all"
            >
              إلغاء
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
