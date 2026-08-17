import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { storeFile } from '../utils/fileCache';
import {
  FileCheck,
  X,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Paperclip,
  UploadCloud,
  ArrowLeft
} from 'lucide-react';
import { Project, QuoteRequest, User, ProjectDocument } from '../types';
import { downloadFile } from '../utils/fileDownloader';

interface DigitalContractSigningModalProps {
  project?: Project | null;
  quote?: QuoteRequest | null;
  user: User;
  isSupervisor?: boolean;
  onClose: () => void;
  onSigned: (signatureData: {
    contractNumber: string;
    signDate: string;
    signerName: string;
    contractDocument?: ProjectDocument;
  }) => Promise<void>;
}

export function DigitalContractSigningModal({
  project,
  quote,
  user,
  isSupervisor = false,
  onClose,
  onSigned
}: DigitalContractSigningModalProps) {
  // Lock body scroll when modal is active
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const [signerName, setSignerName] = useState(user.name || '');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Contract attachment state
  const [contractDoc, setContractDoc] = useState<ProjectDocument | null>(() => {
    if (project?.documents && project.documents.length > 0) {
      const existing = project.documents.find(d => d.category === 'عقد معتمد');
      if (existing) return existing;
    }
    return null;
  });

  const contractNumber = `CNT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
  const signDate = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  const projectTitle = project?.title || quote?.projectName || 'مشروع إنشائي جديد';
  const totalValue = quote?.quoteAmount || quote?.amount || (project?.installments?.reduce((sum, i) => sum + (i.amountNumber || 0), 0) ? `${project.installments.reduce((sum, i) => sum + (i.amountNumber || 0), 0).toLocaleString('ar-SA')} ر.س` : 'حسب جدول الدفعات');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeFormatted = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        try {
          const fileKey = `contract-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
          const cachedUrl = await storeFile(fileKey, event.target.result as string);
          setContractDoc({
            id: `DOC-CNT-${Date.now().toString().slice(-4)}`,
            name: file.name,
            category: 'عقد معتمد',
            fileUrl: cachedUrl,
            fileName: file.name,
            fileSize: sizeFormatted,
            uploadedAt: new Date().toISOString().split('T')[0],
            uploadedBy: isSupervisor ? 'المشرف العام' : user.name
          });
        } catch (err) {
          console.error('Error caching uploaded contract:', err);
          alert('حدث خطأ أثناء معالجة وحفظ الملف.');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractDoc) {
      alert('يرجى إرفاق ملف العقد أولاً.');
      return;
    }
    if (!agreedToTerms) {
      alert('يرجى الموافقة على بنود العقد والمصادقة على صحة البيانات.');
      return;
    }
    if (!signerName.trim()) {
      alert('يرجى كتابة الاسم الكامل.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSigned({
        contractNumber,
        signDate,
        signerName: signerName.trim(),
        contractDocument: contractDoc || undefined
      });
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء إعداد العقد.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto" dir="rtl">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-[#E8E2D8] overflow-hidden flex flex-col max-h-[90vh] text-[#1C3022]"
      >
        {/* Header */}
        <div className="bg-[#1C3022] text-white p-5 flex items-center justify-between shrink-0 shadow-sm border-b border-[#284430]">
          <div className="flex items-center gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors flex items-center gap-1 text-xs font-black"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>رجوع</span>
            </button>
            <div className="w-10 h-10 rounded-2xl bg-[#C5B198] text-[#1C3022] flex items-center justify-center font-black">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black">تجهيز وإرسال عقد المقاولة</h3>
              <p className="text-[10px] text-[#C5B198] font-bold">رقم العقد المقترح: {contractNumber}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Summary Box */}
          <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E8E2D8] space-y-3 text-xs leading-relaxed">
            <h4 className="font-black text-[#1C3022] border-b border-[#E8E2D8] pb-1.5 mb-2 text-xs">تفاصيل العقد المقترح للمشروع</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block">الطرف الأول (المقاول):</span>
                <span className="font-black text-[#1C3022]">شركة نماذج التميز للمقاولات</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block">الطرف الثاني (العميل):</span>
                <span className="font-black text-[#1C3022]">{quote?.clientName || user.name}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] font-bold text-slate-400 block">المشروع المستهدف:</span>
                <span className="font-black text-[#1C3022] block truncate">{projectTitle}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block">إجمالي قيمة التعاقد:</span>
                <span className="font-black text-emerald-800">{totalValue}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block">تاريخ الإعداد:</span>
                <span className="font-black text-[#1C3022]">{signDate}</span>
              </div>
            </div>
          </div>

          {/* Upload Contract File Section */}
          <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E8E2D8] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#1C3022] flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-[#C5B198]" />
                <span>ملف العقد ومسودة البنود المعتمدة</span>
              </span>
              {contractDoc && (
                <button
                  type="button"
                  onClick={() => downloadFile(contractDoc.fileUrl, contractDoc.fileName || 'مسودة_العقد.pdf')}
                  className="text-[10px] font-black text-[#1C3022] bg-white px-2.5 py-1.5 rounded-lg border border-[#E8E2D8] hover:bg-slate-50 flex items-center gap-1 transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-[#C5B198]" />
                  <span>تحميل العقد</span>
                </button>
              )}
            </div>

            {contractDoc ? (
              <div className="p-3 bg-white rounded-xl border border-[#E8E2D8] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-[#C5B198] shrink-0" />
                  <span className="font-bold text-[#1C3022] truncate">{contractDoc.fileName || contractDoc.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-1 rounded-md">جاهز ومرفق</span>
                  <button
                    type="button"
                    onClick={() => setContractDoc(null)}
                    className="text-[10px] text-red-600 hover:text-red-800 font-bold px-2 py-1 bg-red-50 rounded-md transition-colors"
                  >
                    حذف وإعادة إرفاق
                  </button>
                </div>
              </div>
            ) : (
              <label className="border-2 border-dashed border-[#C5B198] bg-white p-5 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50/50 transition-all text-center">
                <UploadCloud className="w-8 h-8 text-[#C5B198] mb-2" />
                <span className="text-xs font-black text-[#1C3022]">إرفاق مستند العقد من جهازك (PDF) *</span>
                <span className="text-[10px] text-slate-400 mt-1">انقر هنا لاختيار الملف من الهاتف أو الكمبيوتر</span>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            )}
          </div>

          {/* Signer Information */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-black text-[#1C3022] block mb-1.5">اسم المصرح والمعتمد من طرف المقاول *</label>
              <input
                type="text"
                required
                placeholder="أدخل اسم المهندس أو المشرف المسؤول..."
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl px-3 py-2.5 text-xs font-bold text-[#1C3022] outline-none focus:border-[#C5B198] transition-all"
              />
            </div>
          </div>

          {/* Terms Agreement Checkbox */}
          <label className="flex items-start gap-2.5 cursor-pointer select-none bg-[#FAF7F2] p-3 rounded-2xl border border-[#E8E2D8] transition-colors hover:bg-[#FAF7F2]/80">
            <input
              type="checkbox"
              required
              checked={agreedToTerms}
              onChange={e => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-[#1C3022] accent-[#1C3022] shrink-0"
            />
            <span className="text-xs font-bold text-slate-700 leading-relaxed">
              أصادق على مراجعة بنود العقد وإرفاق مسودة العقد المعتمدة لنقل المشروع لخطوة توقيع العميل.
            </span>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-[#FAF7F2] border-t border-[#E8E2D8] flex gap-2 shrink-0">
          <button
            type="button"
            onClick={handleConfirmSign}
            disabled={isSubmitting || !agreedToTerms || !contractDoc}
            className="flex-1 bg-[#1C3022] text-white hover:bg-[#122116] py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#C5B198]" />
                <span>جاري إرسال العقد...</span>
              </>
            ) : (
              <>
                <FileCheck className="w-4 h-4 text-[#C5B198]" />
                <span>إرسال العقد للعميل للتوقيع والاعتماد</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="bg-white border border-[#E8E2D8] text-slate-700 hover:bg-slate-50 py-3 px-5 rounded-xl text-xs font-bold transition-all"
          >
            إلغاء
          </button>
        </div>
      </motion.div>
    </div>
  );
}
