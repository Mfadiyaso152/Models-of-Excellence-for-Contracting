import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Building2, 
  Copy, 
  Check, 
  Upload, 
  Send,
  Receipt,
  FileCheck
} from 'lucide-react';
import { Project, Installment } from '../types';

interface Props {
  project: Project;
  installment: Installment;
  onClose: () => void;
  onSuccess: (updatedProject: Project, receiptRef: string, method: 'تحويل بنكي') => void;
}

// Enterprise Official Banking Info
const INSTITUTION_BANK_INFO = {
  accountName: 'مؤسسة نماذج التميز للمقاولات العامة',
  bankName: 'الأهلي السعودي',
  iban: 'SA4410000001400028475203',
  accountNumber: '1000001400028475203',
  branch: 'الفرع الرئيسي'
};

export function PaymentGatewayModal({ project, installment, onClose, onSuccess }: Props) {
  // Lock body scroll when modal is active
  React.useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const [receiptFileUrl, setReceiptFileUrl] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');

  // Copy to clipboard helper
  const handleCopy = (text: string, fieldKey: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => {
      setCopiedField(null);
    }, 2500);
  };

  // Handle receipt upload
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('حجم الملف كبير جداً. الحد الأقصى المسموح 10 ميجابايت.');
      return;
    }

    setReceiptFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setReceiptFileUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit Bank Transfer Receipt
  const handleReceiptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptFileUrl) {
      alert('يرجى إرفاق صورة إيصال أو إشعار التحويل البنكي.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const generatedRef = `TRF-${Math.floor(100000 + Math.random() * 900000)}`;
      const nowStr = new Date().toISOString().split('T')[0];

      const updatedInstallments = (project.installments || []).map(i => {
        if (i.id === installment.id) {
          return {
            ...i,
            status: 'under_review' as const,
            paymentMethod: 'تحويل بنكي' as const,
            transferRef: generatedRef,
            transferReceiptUrl: receiptFileUrl,
            transferDate: nowStr,
            supervisorPaymentConfirmed: false
          };
        }
        return i;
      });

      const updatedProject: Project = {
        ...project,
        installments: updatedInstallments
      };

      setTransactionRef(generatedRef);
      setIsSubmitting(false);
      setIsSubmitted(true);
      onSuccess(updatedProject, generatedRef, 'تحويل بنكي');
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto" dir="rtl">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-2xl border border-[#E8E2D8] text-[#192A1D] space-y-6 my-4 max-h-[90vh] overflow-y-auto"
      >
        {!isSubmitted ? (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#F0EBE1]">
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="p-2 bg-[#FAF7F2] text-[#1C3022] hover:bg-[#EFE7DC] rounded-xl border border-[#E8E2D8] transition-colors flex items-center gap-1 text-xs font-black">
                <span>← رجوع</span>
              </button>
              <div className="w-10 h-10 rounded-2xl bg-[#EFE7DC] flex items-center justify-center text-[#1C3022]">
                <Building2 className="w-5 h-5 text-[#1C3022]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-[#1C3022]">سداد الدفعة عبر التحويل البنكي</h3>
                <p className="text-xs text-slate-400 font-bold">مؤسسة نماذج التميز للمقاولات العامة</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Bill Summary Card */}
          <div className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#E8E2D8] space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold">المشروع الإنشائي:</span>
              <span className="font-black text-[#1C3022] truncate max-w-[220px]">{project.title}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold">الدفعة المستحقة:</span>
              <span className="font-black text-[#1C3022]">{installment.title}</span>
            </div>
            <div className="pt-2 border-t border-[#E8E2D8] flex justify-between items-center">
              <span className="text-xs font-black text-slate-700">المبلغ المطلوب تحويله:</span>
              <span className="text-lg font-black text-[#1C3022]">{installment.amount}</span>
            </div>
          </div>

          {/* Official Institution Bank Account Card */}
          <div className="bg-[#1C3022] text-white p-5 rounded-2xl border border-[#284430] space-y-3.5 shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#C5B198] text-[#1C3022] flex items-center justify-center font-black">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-[#C5B198] font-bold block">الحساب البنكي الرسمي للمؤسسة</span>
                  <h4 className="text-xs font-black">{INSTITUTION_BANK_INFO.bankName}</h4>
                </div>
              </div>
              <span className="text-[10px] bg-[#C5B198]/20 text-[#C5B198] border border-[#C5B198]/30 px-2.5 py-1 rounded-lg font-bold">
                حساب رسمي معتمد
              </span>
            </div>

            <div className="space-y-2 pt-1">
              {/* Beneficiary Name */}
              <div className="bg-black/25 p-3 rounded-xl text-xs space-y-0.5">
                <span className="text-[10px] text-[#EFE7DC]/70 block font-medium">اسم المستفيد / المؤسسة:</span>
                <span className="font-black text-[#FAF7F2] text-xs sm:text-sm block">{INSTITUTION_BANK_INFO.accountName}</span>
              </div>

              {/* IBAN */}
              <div className="bg-black/25 p-3 rounded-xl flex items-center justify-between gap-2">
                <div className="overflow-hidden">
                  <span className="text-[10px] text-[#EFE7DC]/70 block font-medium">رقم الآيبان (IBAN):</span>
                  <span className="font-mono font-black text-xs sm:text-sm text-[#C5B198] block tracking-wider" dir="ltr">
                    {INSTITUTION_BANK_INFO.iban}
                  </span>
                </div>
                <button
                  type="button"
                  title="نسخ الآيبان"
                  onClick={() => handleCopy(INSTITUTION_BANK_INFO.iban, 'iban')}
                  className="bg-[#C5B198] hover:bg-[#BAA386] text-[#1C3022] w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-95 shadow-sm"
                >
                  {copiedField === 'iban' ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Account Number */}
              <div className="bg-black/25 p-3 rounded-xl flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] text-[#EFE7DC]/70 block font-medium">رقم الحساب:</span>
                  <span className="font-mono font-bold text-xs text-[#FAF7F2]" dir="ltr">
                    {INSTITUTION_BANK_INFO.accountNumber}
                  </span>
                </div>
                <button
                  type="button"
                  title="نسخ الحساب"
                  onClick={() => handleCopy(INSTITUTION_BANK_INFO.accountNumber, 'acc')}
                  className="bg-white/10 hover:bg-white/20 text-[#FAF7F2] w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                >
                  {copiedField === 'acc' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#C5B198]" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Upload Receipt Section */}
          <form onSubmit={handleReceiptSubmit} className="space-y-4 pt-1">
            <div className="space-y-2">
              <label className="block text-xs font-black text-[#1C3022]">إرفاق إيصال التحويل البنكي *</label>
              <div className="relative border-2 border-dashed border-[#C5B198] hover:border-[#1C3022] bg-[#FAF7F2] rounded-2xl p-6 text-center transition-all cursor-pointer">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleReceiptUpload}
                  required
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-[#EFE7DC] text-[#1C3022] flex items-center justify-center">
                    <Upload className="w-6 h-6 text-[#1C3022]" />
                  </div>
                  {receiptFileName ? (
                    <div className="space-y-1">
                      <span className="text-xs font-black text-emerald-800 block flex items-center justify-center gap-1">
                        <FileCheck className="w-4 h-4 text-emerald-600" />
                        <span>تم إرفاق الإيصال: {receiptFileName}</span>
                      </span>
                      <span className="text-[10px] text-slate-500 block">انقر للتغيير إذا رغبت</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-xs font-black text-[#1C3022] block">انقر هنا لاختيار صورة أو ملف إيصال التحويل</span>
                      <span className="text-[10px] text-slate-400 block font-bold">يدعم الصور بصيغة JPG, PNG أو ملفات PDF (الحد الأقصى 10 ميجابايت)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !receiptFileUrl}
              className="w-full bg-[#1C3022] disabled:opacity-50 text-white py-4 rounded-2xl font-black text-xs sm:text-sm hover:bg-[#122116] transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Send className="w-4 h-4 text-[#C5B198]" />
                  <span>تأكيد إرسال الإيصال للمراجعة</span>
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        /* Submitted Success View */
        <div className="space-y-5 py-4 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-sm">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>
          <div>
            <h3 className="text-lg font-black text-[#1C3022]">تم إرسال إيصال التحويل بنجاح</h3>
            <p className="text-xs text-slate-500 mt-1">تم توجيه الإشعار والإيصال للمشرف العام لاعتماده وتحديث حالة الدفعة</p>
          </div>

          <div className="p-4 bg-[#FAF7F2] border border-[#E8E2D8] rounded-2xl space-y-2.5 text-xs text-right text-[#192A1D]">
            <div className="flex justify-between items-center pb-2 border-b border-[#E8E2D8]">
              <span className="text-[10px] font-black text-slate-400">الرقم المرجعي للإيصال:</span>
              <span className="font-mono font-black text-[#1C3022]">{transactionRef}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold">المشروع:</span>
              <span className="font-black text-[#1C3022]">{project.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold">الدفعة:</span>
              <span className="font-black text-[#1C3022]">{installment.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold">المبلغ:</span>
              <span className="font-black text-emerald-800">{installment.amount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold">طريقة السداد:</span>
              <span className="font-black text-[#1C3022]">تحويل بنكي (IBAN)</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-[#E8E2D8]">
              <span className="text-slate-500 font-bold">حالة الدفعة:</span>
              <span className="bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-lg font-black text-[10px]">
                قيد مراجعة واعتماد المشرف
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full bg-[#1C3022] text-white py-3.5 rounded-2xl font-black text-xs hover:bg-[#122116] transition-all shadow-md"
          >
            العودة للمشروع
          </button>
        </div>
      )}
      </motion.div>
    </div>
  );
}
