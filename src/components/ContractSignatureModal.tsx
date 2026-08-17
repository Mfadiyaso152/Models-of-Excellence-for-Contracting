import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  FileText, 
  CheckCircle2, 
  ShieldCheck, 
  Download, 
  PenTool, 
  Loader2, 
  Calendar, 
  FileCheck,
  RotateCcw,
  Check,
  Building2,
  Lock,
  Stamp
} from 'lucide-react';
import { Project, ProjectContract, User } from '../types';
import { ProjectService } from '../services/dbService';

interface Props {
  project: Project;
  currentUser: User;
  isSupervisor?: boolean;
  onClose: () => void;
  onSigned: (updatedProject: Project) => void;
  onRequestToast: (msg: string) => void;
}

export function ContractSignatureModal({
  project,
  currentUser,
  isSupervisor = false,
  onClose,
  onSigned,
  onRequestToast
}: Props) {
  const contract = project.contracts?.[0];
  const isSupervisorUser = isSupervisor || currentUser.role === 'admin' || currentUser.email?.trim().toLowerCase() === 'mfb.15.f@gmail.com';

  const [signerName, setSignerName] = useState(currentUser.name || '');
  const [nationalId, setNationalId] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [signatureMode, setSignatureMode] = useState<'draw' | 'type'>('draw');
  const [typedSignature, setTypedSignature] = useState(currentUser.name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lock body scroll
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Supervisor custom contract fields (if not finalized)
  const [contractValue, setContractValue] = useState(contract?.totalValue || project.installments?.reduce((sum, i) => sum + (i.amountNumber || 0), 0)?.toLocaleString('ar-SA') + ' ر.س' || 'حسب المواصفات الهندسية');
  const [contractTerms, setContractTerms] = useState<string[]>(
    contract?.termsSummary && contract.termsSummary.length > 0
      ? contract.termsSummary
      : [
          'الالتزام التام بكود البناء السعودي الصادر عن وزارة الشؤون البلدية والقروية والإسكان والمخططات المعتمدة.',
          'ضمان هيكل إنشائي لمدة 10 سنوات وضمان عوازل مائية وحرارية لمدة 10 سنوات من تاريخ التسليم.',
          'إشراف هندسي ميداني موثق ومتابعة دورية مع تقارير واختبارات الخرسانة وحديد التسليح.',
          'سداد الدفعات المالية المعتمدة وفق نسب الإنجاز الموثقة بنظام المنصة الإلكترونية.'
        ]
  );

  const hasSupervisorSigned = Boolean(contract?.supervisorSignature || (contract?.status !== 'مسودة' && contract?.status !== 'بانتظار توقيع المشرف' && contract?.signDate && contract.signDate !== 'بانتظار توقيع المشرف أولاً'));
  const hasClientSigned = Boolean(contract?.clientSignature || (contract?.status === 'ساري وموثق' && hasSupervisorSigned));
  const isFullyCertified = project.isCertified || contract?.status === 'ساري وموثق';

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#1C3022';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [signatureMode]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const getSignatureDataUrl = (): string => {
    if (signatureMode === 'draw' && canvasRef.current && hasDrawn) {
      return canvasRef.current.toDataURL('image/png');
    }
    return typedSignature.trim() || signerName.trim();
  };

  const handleSignContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signerName.trim()) {
      onRequestToast('يرجى كتابة الاسم الثلاثي المعتمد');
      return;
    }
    if (!agreeToTerms) {
      onRequestToast('يرجى الإقرار والموافقة على بنود العقد');
      return;
    }
    if (signatureMode === 'draw' && !hasDrawn) {
      onRequestToast('يرجى رسم توقيعك على اللوحة المخصصة أو استخدام التوقيع النصي');
      return;
    }

    setIsSubmitting(true);
    const dateStr = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
    const signatureValue = getSignatureDataUrl();

    let updatedContracts: ProjectContract[];
    let newProjectStatus = project.status;
    let isCertifiedNow = false;

    if (isSupervisorUser) {
      // 1. SUPERVISOR SIGNS FIRST
      const existingContract: ProjectContract = contract || {
        id: `CNT-${Date.now().toString().slice(-4)}`,
        contractNumber: `CNT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
        title: `عقد تنفيذ وإنشاء ${project.title}`,
        signDate: dateStr,
        totalValue: contractValue,
        status: 'بانتظار توقيع العميل',
        termsSummary: contractTerms
      };

      const updatedContract: ProjectContract = {
        ...existingContract,
        totalValue: contractValue,
        termsSummary: contractTerms,
        supervisorSignature: signatureValue,
        supervisorSignedDate: dateStr,
        supervisorSignerName: signerName.trim(),
        status: existingContract.clientSignature ? 'ساري وموثق' : 'بانتظار توقيع العميل'
      };

      updatedContracts = [updatedContract, ...(project.contracts?.slice(1) || [])];
      newProjectStatus = updatedContract.clientSignature ? 'قيد التنفيذ' : 'بانتظار توقيع العميل';
      isCertifiedNow = Boolean(updatedContract.clientSignature);
    } else {
      // 2. CLIENT SIGNS
      const existingContract: ProjectContract = contract || {
        id: `CNT-${Date.now().toString().slice(-4)}`,
        contractNumber: `CNT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
        title: `عقد تنفيذ وإنشاء ${project.title}`,
        signDate: dateStr,
        totalValue: contractValue,
        status: 'ساري وموثق',
        termsSummary: contractTerms
      };

      const updatedContract: ProjectContract = {
        ...existingContract,
        clientSignature: signatureValue,
        clientSignedDate: dateStr,
        clientSignerName: signerName.trim(),
        clientNationalId: nationalId.trim() || undefined,
        status: 'ساري وموثق',
        signDate: dateStr,
        isCertified: true,
        certifiedAt: new Date().toISOString()
      };

      updatedContracts = [updatedContract, ...(project.contracts?.slice(1) || [])];
      newProjectStatus = 'قيد التنفيذ'; // Transitions to ACTIVE!
      isCertifiedNow = true;
    }

    const updatedProject: Project = {
      ...project,
      status: newProjectStatus,
      isCertified: isCertifiedNow || project.isCertified,
      contracts: updatedContracts
    };

    try {
      await ProjectService.saveProject(updatedProject);
      onSigned(updatedProject);
      if (isSupervisorUser) {
        onRequestToast('تم توقيع العقد من المشرف بنجاح! تم إشعار العميل للتوقيع الإلكتروني.');
      } else {
        onRequestToast('تهانينا! تم توقيع العقد وتدشين المشروع رسمياً (حالة المشروع الآن: جاري التنفيذ).');
      }
      onClose();
    } catch (err) {
      console.error('Contract signing error:', err);
      onRequestToast('حدث خطأ أثناء حفظ التوقيع الإلكتروني.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md overflow-y-auto" dir="rtl">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        className="bg-white w-full max-w-2xl rounded-[2.5rem] p-6 sm:p-8 shadow-2xl border border-[#E8E2D8] text-[#1C3022] space-y-5 max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex justify-between items-center pb-3.5 border-b border-[#F0EBE1]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1C3022] text-[#C5B198] flex items-center justify-center font-black shadow-md">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-[#1C3022]">العقد الإلكتروني والمصادقة الرقمية</h3>
                {isFullyCertified && (
                  <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-700" />
                    <span>موثق ومعتمد 🔒</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-bold">{project.title} - رقم العقد: {contract?.contractNumber || 'CNT-2026-001'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contract Summary Box */}
        <div className="p-5 bg-[#FAF7F2] rounded-3xl border border-[#E8E2D8] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-black text-[#C5B198] block">قيمة العقد المعتمدة</span>
              <span className="text-lg font-black text-[#1C3022]">{contract?.totalValue || contractValue}</span>
            </div>
            <div className="text-left">
              <span className="text-[10px] font-black text-slate-400 block">حالة العقد</span>
              <span className={`text-xs font-black px-3 py-1 rounded-xl inline-block ${
                isFullyCertified ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' :
                hasSupervisorSigned ? 'bg-blue-100 text-blue-900 border border-blue-200' :
                'bg-amber-100 text-amber-900 border border-amber-200'
              }`}>
                {isFullyCertified ? 'ساري وموثق بالكامل ✓' :
                 hasSupervisorSigned ? 'موقّع من المشرف - بانتظار توقيع العميل' :
                 'مسودة - بانتظار توقيع المشرف أولاً'}
              </span>
            </div>
          </div>

          {/* Terms */}
          <div className="pt-3 border-t border-[#E8E2D8] space-y-2">
            <span className="text-xs font-black text-[#1C3022] block">بنود وشروط التعاقد والضمان:</span>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {contractTerms.map((term, i) => (
                <li key={i} className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-white text-[#1C3022] flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <span className="leading-relaxed">{term}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Dual Signatures Preview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#E8E2D8]">
            {/* 1. Supervisor Seal Card */}
            <div className={`p-4 rounded-2xl border ${hasSupervisorSigned ? 'bg-white border-emerald-200 shadow-sm' : 'bg-amber-50/50 border-amber-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black text-[#1C3022]">الطرف الأول (المشرف الهندسي)</span>
                {hasSupervisorSigned ? (
                  <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" /> تم التوقيع
                  </span>
                ) : (
                  <span className="text-[9px] font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md">
                    قيد الانتظار
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-slate-700">
                {contract?.supervisorSignerName || 'م. فهد بن عبدالله المقرن'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {contract?.supervisorSignedDate ? `التاريخ: ${contract.supervisorSignedDate}` : 'مؤسسة نماذج التميز للمقاولات'}
              </p>
              {contract?.supervisorSignature && (
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2">
                  <Stamp className="w-4 h-4 text-emerald-700" />
                  <span className="text-[10px] font-black text-emerald-900">مصادقة إلكترونية معتمدة</span>
                </div>
              )}
            </div>

            {/* 2. Client Seal Card */}
            <div className={`p-4 rounded-2xl border ${hasClientSigned ? 'bg-white border-emerald-200 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black text-[#1C3022]">الطرف الثاني (العميل صاحب المشروع)</span>
                {hasClientSigned ? (
                  <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" /> تم التوقيع
                  </span>
                ) : (
                  <span className="text-[9px] font-black bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
                    {hasSupervisorSigned ? 'بانتظار توقيعك' : 'بانتظار اعتماد المشرف'}
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-slate-700">
                {contract?.clientSignerName || (isSupervisorUser ? 'اسم العميل' : currentUser.name)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {contract?.clientSignedDate ? `التاريخ: ${contract.clientSignedDate}` : 'المصادقة بالهوية الوطنية'}
              </p>
              {contract?.clientSignature && (
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span className="text-[10px] font-black text-emerald-900">توقيع رقمي موثق ومطابق</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ALREADY FULLY SIGNED */}
        {isFullyCertified ? (
          <div className="p-5 bg-emerald-50 rounded-3xl border border-emerald-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-black text-emerald-950">هذا العقد موثق ومعتمد رسمياً من الطرفين</h4>
            <p className="text-xs text-emerald-800 font-bold max-w-md mx-auto leading-relaxed">
              المشروع الآن في حالة (قيد التنفيذ). تم قفل التعديل المباشر على بنود ومبالغ العقد حفاظاً على الحقوق التعاقدية للطرفين.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="bg-emerald-800 text-[#1C3022] px-6 py-2.5 rounded-xl text-xs font-black hover:bg-emerald-900 shadow-md"
            >
              إغلاق
            </button>
          </div>
        ) : (
          /* SIGNATURE FORM */
          <form onSubmit={handleSignContract} className="space-y-4">
            <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E8E2D8] flex items-center justify-between">
              <span className="text-xs font-black text-[#1C3022]">
                {isSupervisorUser ? 'توقيع المشرف العام المعتمد' : 'توقيع العميل الإلكتروني'}
              </span>
              <div className="flex gap-1.5 bg-white p-1 rounded-xl border border-[#E8E2D8]">
                <button
                  type="button"
                  onClick={() => setSignatureMode('draw')}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                    signatureMode === 'draw' ? 'bg-[#1C3022] text-white' : 'text-slate-500'
                  }`}
                >
                  رسم باليد
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureMode('type')}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                    signatureMode === 'type' ? 'bg-[#1C3022] text-white' : 'text-slate-500'
                  }`}
                >
                  كتابة الاسم
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-[#1C3022] mb-1">الاسم الكامل لصاحب التوقيع *</label>
                <input
                  type="text"
                  required
                  value={signerName}
                  onChange={e => setSignerName(e.target.value)}
                  placeholder="الاسم الثلاثي أو الرباعي"
                  className="w-full bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1C3022] outline-none focus:ring-2 focus:ring-[#C5B198]"
                />
              </div>

              {!isSupervisorUser && (
                <div>
                  <label className="block text-xs font-black text-[#1C3022] mb-1">رقم الهوية الوطنية / السجل (اختياري)</label>
                  <input
                    type="text"
                    value={nationalId}
                    onChange={e => setNationalId(e.target.value)}
                    placeholder="10xxxxxxxx"
                    className="w-full bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1C3022] outline-none focus:ring-2 focus:ring-[#C5B198]"
                    dir="ltr"
                  />
                </div>
              )}
            </div>

            {/* Drawing Canvas or Text Input */}
            {signatureMode === 'draw' ? (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-black text-[#1C3022]">ارسم توقيعك في المساحة أدناه *</label>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-[11px] font-black text-red-600 flex items-center gap-1 hover:underline"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>مسح وإعادة الرسم</span>
                  </button>
                </div>
                <div className="border-2 border-dashed border-[#C5B198] rounded-2xl bg-white p-1 overflow-hidden shadow-inner">
                  <canvas
                    ref={canvasRef}
                    width={560}
                    height={140}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-28 bg-[#FCFBF9] cursor-crosshair rounded-xl touch-none"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-black text-[#1C3022] mb-1">التوقيع النصي المعتمد *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={typedSignature}
                    onChange={e => setTypedSignature(e.target.value)}
                    placeholder="اكتب اسمك كتوقيع إلكتروني معتمد"
                    className="w-full bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl px-3.5 py-2.5 text-sm font-black text-[#1C3022] italic outline-none focus:ring-2 focus:ring-[#C5B198]"
                  />
                  <PenTool className="w-4 h-4 text-[#C5B198] absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>
            )}

            <label className="flex items-start gap-2.5 cursor-pointer p-3.5 bg-[#FAF7F2] rounded-2xl border border-[#E8E2D8] text-xs font-bold text-[#1C3022]">
              <input
                type="checkbox"
                required
                checked={agreeToTerms}
                onChange={e => setAgreeToTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-[#1C3022] focus:ring-[#1C3022]"
              />
              <span className="leading-relaxed">
                {isSupervisorUser
                  ? 'أقر بصفتي المشرف العام باعتماد هذا العقد الإنشائي ومواصفاته وجدول الدفعات وتوقيعه إلكترونياً.'
                  : 'أقر وأوافق على كافة بنود ومواصفات العقد الإلكتروني وجدول الدفعات، وأعتبر هذا التوقيع ملزماً نظامياً.'}
              </span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#1C3022] text-white py-4 rounded-2xl font-black text-xs hover:bg-[#122116] flex items-center justify-center gap-2 shadow-xl transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#C5B198]" />
                  <span>جاري توثيق التوقيع الإلكتروني...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4 text-[#C5B198]" />
                  <span>
                    {isSupervisorUser
                      ? 'توقيع العقد من المشرف وإرساله للعميل'
                      : 'توقيع العقد إلكترونياً وتدشين المشروع (جاري)'}
                  </span>
                </>
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

