import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { storeFile } from '../utils/fileCache';
import {
  X,
  Sliders,
  CheckCircle2,
  Percent,
  Wallet,
  HardHat,
  Calendar,
  Image as ImageIcon,
  Save,
  Plus,
  Trash2,
  Check,
  Clock,
  Building2,
  MapPin,
  FileText,
  User,
  Phone,
  MessageSquare,
  ShieldCheck,
  Send,
  Loader2,
  AlertTriangle,
  Upload,
  Download,
  FileCheck,
  Ban,
  FileUp
} from 'lucide-react';
import { Project, ConstructionPhase, Installment, EngineerRequest, ProjectStatus, ProjectDocument, getInstallmentOverdueStatus } from '../types';
import { downloadFile } from '../utils/fileDownloader';
import { ProjectService } from '../services/dbService';

interface Props {
  project: Project;
  clientName?: string;
  onClose: () => void;
  onSave: (updatedProject: Project) => Promise<void>;
  onRequestToast: (msg: string) => void;
}

type TabType = 'progress' | 'phases' | 'installments' | 'documents' | 'images' | 'requests' | 'info';

export function AdminProjectManagerModal({
  project,
  clientName,
  onClose,
  onSave,
  onRequestToast
}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('progress');
  const [isSaving, setIsSaving] = useState(false);

  // Prevent background scrolling
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Editable Project State
  const [title, setTitle] = useState(project.title);
  const [location, setLocation] = useState(project.location);
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [progress, setProgress] = useState<number>(project.progress);
  const [phases, setPhases] = useState<ConstructionPhase[]>(project.phases || []);
  const [installments, setInstallments] = useState<Installment[]>(project.installments || []);
  const [documents, setDocuments] = useState<ProjectDocument[]>(project.documents || []);
  const [engineerRequests, setEngineerRequests] = useState<EngineerRequest[]>(project.engineerRequests || []);
  const [images, setImages] = useState(project.images || { before: [], progress50: [], after: [], plans: [] });

  // Phase Input
  const [newPhaseTitle, setNewPhaseTitle] = useState('');

  // Percentage Generator State for Installments
  const [totalProjectValue, setTotalProjectValue] = useState<string>(() => {
    const sum = (project.installments || []).reduce((s, i) => s + (i.amountNumber || 0), 0);
    return sum > 0 ? sum.toString() : '500000';
  });
  const [showPercentageBuilder, setShowPercentageBuilder] = useState(false);
  const [percentageCount, setPercentageCount] = useState<number>(4);
  const [percentageValues, setPercentageValues] = useState<number[]>([25, 25, 25, 25]);

  // Manual Single Installment
  const [newInstallmentTitle, setNewInstallmentTitle] = useState('');
  const [newInstallmentPercentage, setNewInstallmentPercentage] = useState('');
  const [newInstallmentDueDate, setNewInstallmentDueDate] = useState('');

  // Image Upload Category
  const [imageCategory, setImageCategory] = useState<'before' | 'progress50' | 'after' | 'plans'>('progress50');

  // Document Upload Form
  const [newDocName, setNewDocName] = useState('');
  const [newDocCategory, setNewDocCategory] = useState<ProjectDocument['category']>('عقد معتمد');
  const [newDocFileUrl, setNewDocFileUrl] = useState('');
  const [newDocFileName, setNewDocFileName] = useState('');
  const [newDocFileSize, setNewDocFileSize] = useState('');

  // Engineer Reply
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Calculate Payment Stats
  const totalAmountNumber = installments.reduce((sum, inst) => sum + (inst.amountNumber || 0), 0);
  const paidAmountNumber = installments.filter(i => i.status === 'paid').reduce((sum, inst) => sum + (inst.amountNumber || 0), 0);
  const paidCount = installments.filter(i => i.status === 'paid').length;
  const paymentPercentage = installments.length > 0 ? Math.round((paidCount / installments.length) * 100) : 0;

  // Percentage builder helper
  const handleGeneratePercentageInstallments = () => {
    const totalVal = parseFloat(totalProjectValue.replace(/[^0-9.]/g, '')) || 0;
    if (totalVal <= 0) {
      onRequestToast('يرجى تحديد إجمالي قيمة المشروع أولاً');
      return;
    }

    const sumPercentages = percentageValues.slice(0, percentageCount).reduce((a, b) => a + (b || 0), 0);
    if (sumPercentages !== 100) {
      onRequestToast(`مجموع النسب الحالية (${sumPercentages}%) يجب أن يساوي 100%`);
      return;
    }

    const generated: Installment[] = percentageValues.slice(0, percentageCount).map((pct, idx) => {
      const amountNum = Math.round((totalVal * pct) / 100);
      return {
        id: `INST-${Date.now().toString().slice(-4)}-${idx + 1}`,
        title: `الدفعة ${idx + 1} (${pct}%)`,
        amount: `${amountNum.toLocaleString('ar-SA')} ر.س`,
        amountNumber: amountNum,
        dueDate: new Date(Date.now() + (idx + 1) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending',
        clientApprovalStatus: 'pending'
      };
    });

    setInstallments(generated);
    setShowPercentageBuilder(false);
    onRequestToast(`تم توليد ${generated.length} دفعات بناءً على النسب المئوية بنجاح`);
  };

  const handleUpdatePercentageCount = (count: number) => {
    const validCount = Math.max(1, Math.min(10, count));
    setPercentageCount(validCount);
    const equalVal = Math.floor(100 / validCount);
    const remainder = 100 - equalVal * validCount;
    const newVals = Array.from({ length: validCount }, (_, i) => (i === validCount - 1 ? equalVal + remainder : equalVal));
    setPercentageValues(newVals);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    const updated: Project = {
      ...project,
      title,
      location,
      status,
      progress,
      phases,
      installments,
      documents,
      engineerRequests,
      images
    };

    try {
      await onSave(updated);
      onRequestToast('تم حفظ التعديلات بنجاح');
      onClose();
    } catch (err) {
      console.error('Error saving project:', err);
      onRequestToast('حدث خطأ أثناء حفظ التعديلات');
    } finally {
      setIsSaving(false);
    }
  };

  // Phase Actions
  const handleAddPhase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhaseTitle.trim()) return;
    const newPhase: ConstructionPhase = {
      id: `PH-${Date.now().toString().slice(-4)}`,
      title: newPhaseTitle.trim(),
      progress: 0,
      status: 'قيد الانتظار'
    };
    setPhases([...phases, newPhase]);
    setNewPhaseTitle('');
  };

  const handleUpdatePhase = (index: number, updatedFields: Partial<ConstructionPhase>) => {
    const updatedPhases = [...phases];
    updatedPhases[index] = { ...updatedPhases[index], ...updatedFields };
    if (updatedFields.progress !== undefined) {
      if (updatedFields.progress === 100) {
        updatedPhases[index].status = 'مكتمل';
      } else if (updatedFields.progress > 0) {
        updatedPhases[index].status = 'جاري العمل';
      }
    }
    setPhases(updatedPhases);
  };

  const handleDeletePhase = (index: number) => {
    setPhases(phases.filter((_, i) => i !== index));
  };

  // Installment Actions
  const handleToggleInstallmentStatus = (index: number) => {
    const updated = [...installments];
    const current = updated[index];
    if (current.status === 'paid') {
      current.status = 'pending';
      current.paymentDate = undefined;
      current.transactionRef = undefined;
    } else {
      current.status = 'paid';
      current.paymentDate = new Date().toISOString().split('T')[0];
      current.transactionRef = `TXN-${Date.now().toString().slice(-6)}`;
      current.paymentMethod = 'سداد إلكتروني معتمد';
    }
    setInstallments(updated);
  };

  const handleAddInstallment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstallmentTitle.trim() || !newInstallmentPercentage.trim()) return;
    const pct = parseFloat(newInstallmentPercentage.replace(/[^0-9.]/g, '')) || 0;
    const totalVal = parseFloat(totalProjectValue) || 500000;
    const num = Math.round((pct / 100) * totalVal);
    const newInst: Installment = {
      id: `INST-${Date.now().toString().slice(-4)}`,
      title: newInstallmentTitle.trim(),
      amount: `${Number(num).toLocaleString('ar-SA')} ر.س (${pct}%)`,
      amountNumber: num,
      dueDate: newInstallmentDueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'pending',
      clientApprovalStatus: 'pending'
    };
    setInstallments([...installments, newInst]);
    setNewInstallmentTitle('');
    setNewInstallmentPercentage('');
    setNewInstallmentDueDate('');
  };

  const handleDeleteInstallment = (index: number) => {
    setInstallments(installments.filter((_, i) => i !== index));
  };

  // Image Upload from Device (FileReader -> Base64 Data URL)
  const handleImageDeviceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      if (!file.type.startsWith('image/')) {
        onRequestToast('يرجى اختيار ملف صورة صالح');
        return;
      }
      const reader = new FileReader();
      reader.onload = async (uploadEvent) => {
        const resultUrl = uploadEvent.target?.result as string;
        if (resultUrl) {
          try {
            const imgKey = `img-${Date.now()}-${Math.random().toString(36).slice(-4)}`;
            const cachedUrl = await storeFile(imgKey, resultUrl);
            setImages(prev => ({
              ...prev,
              [imageCategory]: [...(prev[imageCategory] || []), cachedUrl]
            }));
            onRequestToast('تم رفع الصورة بنجاح');
          } catch (err) {
            console.error('Error caching image upload:', err);
            onRequestToast('حدث خطأ أثناء معالجة الصورة');
          }
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleDeleteImage = (category: keyof typeof images, imgIndex: number) => {
    setImages({
      ...images,
      [category]: images[category].filter((_, idx) => idx !== imgIndex)
    });
  };

  // Document Upload from Device
  const handleDocDeviceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeKB = (file.size / 1024).toFixed(1);
    const sizeStr = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${sizeKB} KB`;

    const reader = new FileReader();
    reader.onload = async (uploadEvent) => {
      const resultUrl = uploadEvent.target?.result as string;
      if (resultUrl) {
        try {
          const docKey = `doc-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
          const cachedUrl = await storeFile(docKey, resultUrl);
          setNewDocFileUrl(cachedUrl);
          setNewDocFileName(file.name);
          setNewDocFileSize(sizeStr);
          if (!newDocName.trim()) {
            setNewDocName(file.name.replace(/\.[^/.]+$/, ''));
          }
        } catch (err) {
          console.error('Error caching doc upload:', err);
          onRequestToast('حدث خطأ أثناء معالجة المستند');
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim() || !newDocFileUrl) {
      onRequestToast('يرجى كتابة اسم المستند واختيار الملف من جهازك');
      return;
    }

    const doc: ProjectDocument = {
      id: `DOC-${Date.now().toString().slice(-6)}`,
      name: newDocName.trim(),
      category: newDocCategory,
      fileUrl: newDocFileUrl,
      fileName: newDocFileName || `${newDocName.trim()}.pdf`,
      fileSize: newDocFileSize || '1.2 MB',
      uploadedAt: new Date().toLocaleDateString('ar-SA'),
      uploadedBy: 'المشرف العام'
    };

    setDocuments([doc, ...documents]);
    setNewDocName('');
    setNewDocFileUrl('');
    setNewDocFileName('');
    setNewDocFileSize('');
    onRequestToast('تمت إضافة المستند بنجاح');
  };

  const handleDeleteDocument = (docId: string) => {
    setDocuments(documents.filter(d => d.id !== docId));
  };

  // Cancel Project
  const handleCancelProject = async () => {
    if (window.confirm('هل أنت متأكد من رغبتك في إلغاء هذا المشروع؟')) {
      setIsSaving(true);
      const updated: Project = {
        ...project,
        title,
        location,
        status: 'ملغي',
        progress,
        phases,
        installments,
        documents,
        engineerRequests,
        images
      };
      try {
        await onSave(updated);
        onRequestToast('تم إلغاء المشروع وتحديث حالته بنجاح');
        onClose();
      } catch (err) {
        console.error('Error cancelling project:', err);
        onRequestToast('حدث خطأ أثناء إلغاء المشروع');
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Delete Project
  const handleDeleteProject = async () => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذا المشروع نهائياً من النظام؟ سيتم حذفه من عندك ومن عند العميل ولا يمكن التراجع عن هذا الإجراء.')) {
      setIsSaving(true);
      try {
        await ProjectService.deleteProject(project.id);
        onRequestToast('تم حذف المشروع نهائياً بنجاح');
        onClose();
      } catch (err) {
        console.error('Error deleting project:', err);
        onRequestToast('حدث خطأ أثناء حذف المشروع');
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm overflow-y-auto" dir="rtl">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-4xl bg-white rounded-[2rem] p-6 sm:p-8 shadow-2xl border border-[#E8E2D8] text-[#192A1D] space-y-5 my-auto max-h-[92vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#F0EBE1] shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 bg-[#FAF7F2] text-[#1C3022] hover:bg-[#EFE7DC] rounded-xl border border-[#E8E2D8] transition-colors flex items-center gap-1 text-xs font-black">
              <span>← رجوع</span>
            </button>
            <div className="w-10 h-10 rounded-2xl bg-[#1C3022] text-[#C5B198] flex items-center justify-center font-black shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                {clientName && (
                  <span className="text-[10px] font-bold text-slate-500">
                    العميل: {clientName}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="اسم المشروع..."
                  className="text-base font-black text-[#1C3022] bg-[#FAF7F2] hover:bg-white focus:bg-white border border-[#E8E2D8] rounded-xl px-2.5 py-1 outline-none focus:ring-2 focus:ring-[#C5B198] w-full max-w-sm"
                  title="انقر لتعديل اسم المشروع وتصحيح أي أخطاء إملائية"
                />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E8E2D8] flex items-center justify-center text-slate-500 hover:text-[#1C3022] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-1 p-1 bg-[#FAF7F2] rounded-2xl border border-[#E8E2D8] my-3 overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'progress', label: 'نسبة الإنجاز', icon: Percent },
            { id: 'phases', label: 'المراحل الإنشائية', icon: HardHat },
            { id: 'installments', label: 'الدفعات المالية', icon: Wallet },
            { id: 'documents', label: 'العقود والوثائق', icon: FileText },
            { id: 'images', label: 'صور الموقع', icon: ImageIcon },
            
            { id: 'info', label: 'بيانات المشروع', icon: Building2 },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all flex-1 justify-center ${
                  isActive
                    ? 'bg-[#1C3022] text-white shadow-sm'
                    : 'text-slate-500 hover:text-[#1C3022] hover:bg-white/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#C5B198]' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Tab Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs font-medium">

          {/* 1. OVERALL PROGRESS & STATUS TAB */}
          {activeTab === 'progress' && (
            <div className="space-y-4">
              <div className="bg-[#1C3022] text-white p-5 rounded-3xl border border-[#284430] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-black text-[#C5B198]">نسبة إنجاز المشروع الإجمالية</span>
                    <h4 className="text-2xl font-black">{progress}%</h4>
                  </div>
                  <div className="px-3 py-1 bg-[#C5B198]/20 border border-[#C5B198]/30 rounded-xl text-[#C5B198] text-xs font-black">
                    {status}
                  </div>
                </div>

                                <div>
                  <div className="flex justify-between text-[11px] text-slate-500 font-bold mb-2">
                    <span>تحديث النسبة الإجمالية:</span>
                    <span className="text-[#1C3022]">{progress}%</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {[0, 25, 50, 75, 100].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setProgress(val)}
                        className={`py-2 rounded-xl text-xs font-black transition-all ${
                          progress === val
                            ? 'bg-[#1C3022] text-white shadow-sm'
                            : 'bg-white text-slate-500 border border-[#E8E2D8] hover:bg-[#FAF7F2]'
                        }`}
                      >
                        {val}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  {[0, 25, 50, 75, 100].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setProgress(val)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${
                        progress === val
                          ? 'bg-[#C5B198] text-[#1C3022]'
                          : 'bg-[#284430] text-[#EFE7DC] hover:bg-[#34573e]'
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Selector */}
              <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E8E2D8] space-y-2">
                <label className="block text-xs font-black text-[#1C3022]">حالة المشروع الحالية</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(['قيد الانتظار', 'بانتظار العقد', 'بانتظار السداد', 'قيد التنفيذ', 'مكتمل', 'ملغي'] as ProjectStatus[]).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(st)}
                      className={`p-2.5 rounded-xl text-xs font-black border transition-all text-center ${
                        status === st
                          ? 'bg-[#1C3022] text-white border-[#1C3022] shadow-sm'
                          : 'bg-white text-[#C5B198] border-[#E8E2D8] hover:bg-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. CONSTRUCTION PHASES TAB (MANUAL FROM SCRATCH) */}
          {activeTab === 'phases' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-[#1C3022]">مراحل البناء والتشييد ({phases.length})</h4>
                </div>
                {phases.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('هل تريد مسح جميع المراحل والبدء يدويًا من الصفر؟')) {
                        setPhases([]);
                      }
                    }}
                    className="text-[10px] font-black text-red-600 hover:text-red-800 flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg border border-red-200"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>مسح كل المراحل</span>
                  </button>
                )}
              </div>

              {/* Add New Phase Form */}
              <form onSubmit={handleAddPhase} className="flex gap-2">
                <input
                  type="text"
                  placeholder="عنوان المرحلة الجديدة..."
                  value={newPhaseTitle}
                  onChange={e => setNewPhaseTitle(e.target.value)}
                  className="flex-1 bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl px-3 py-2 text-xs font-bold text-[#1C3022] outline-none"
                />
                <button
                  type="submit"
                  className="bg-[#1C3022] text-white px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1 hover:bg-[#122116]"
                >
                  <Plus className="w-3.5 h-3.5 text-[#C5B198]" />
                  <span>إضافة مرحلة</span>
                </button>
              </form>

              {/* Phases List */}
              {phases.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-[#FAF7F2] rounded-2xl border border-dashed border-[#E8E2D8] space-y-1">
                  <HardHat className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                  <p className="font-bold">لا توجد مراحل مضافة حالياً</p>
                  <p className="text-[10px]">استخدم الحقل أعلاه لإضافة مراحل البناء المخصصة لمشروعك يدوياً</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {phases.map((phase, idx) => (
                    <div
                      key={phase.id || idx}
                      className="p-3.5 bg-[#FAF7F2] rounded-2xl border border-[#E8E2D8] space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#1C3022] text-[#C5B198] text-[10px] font-black flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={phase.title}
                            onChange={e => handleUpdatePhase(idx, { title: e.target.value })}
                            className="bg-transparent text-xs font-black text-[#1C3022] outline-none border-b border-transparent focus:border-[#C5B198]"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={phase.status}
                            onChange={e => handleUpdatePhase(idx, { status: e.target.value as any })}
                            className="bg-white border border-[#E8E2D8] rounded-lg px-2 py-1 text-[10px] font-black text-[#1C3022] outline-none"
                          >
                            <option value="قيد الانتظار">قيد الانتظار</option>
                            <option value="جاري العمل">جاري العمل</option>
                            <option value="مكتمل">مكتمل</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleDeletePhase(idx)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="حذف المرحلة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Phase Progress Buttons */}
                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-2">
                          <span>نسبة إنجاز المرحلة:</span>
                          <span className="text-[#1C3022] font-black">{phase.progress}%</span>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[0, 25, 50, 75, 100].map(val => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => handleUpdatePhase(idx, { progress: val })}
                              className={`py-1.5 rounded-lg text-[10px] font-black transition-all ${
                                phase.progress === val
                                  ? 'bg-[#1C3022] text-white'
                                  : 'bg-white text-slate-500 border border-[#E8E2D8] hover:bg-[#FAF7F2]'
                              }`}
                            >
                              {val}%
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. INSTALLMENTS & PAYMENTS TAB (PERCENTAGE & MANUAL) */}
          {activeTab === 'installments' && (
            <div className="space-y-4">
              {/* Payment Summary Box */}
              <div className="bg-[#1C3022] text-white p-4 rounded-2xl border border-[#284430] flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-[#C5B198] block">نسبة سداد الدفعات</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl font-black">{paymentPercentage}%</span>
                    <span className="text-[10px] text-[#EFE7DC]/80 font-bold">({paidCount} من {installments.length} دفعات)</span>
                  </div>
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-slate-300 font-bold block">المسدد / الإجمالي:</span>
                  <span className="text-xs font-black text-[#C5B198]">
                    {paidAmountNumber.toLocaleString('ar-SA')} / {totalAmountNumber.toLocaleString('ar-SA')} ر.س
                  </span>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowPercentageBuilder(!showPercentageBuilder)}
                  className="bg-[#C5B198] text-[#1C3022] px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 hover:bg-[#b8a287] shadow-sm transition-all"
                >
                  <Percent className="w-3.5 h-3.5" />
                  <span>توليد الدفعات بالنسبة المئوية (%)</span>
                </button>

                {installments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('هل تريد مسح جميع الدفعات الحالية؟')) {
                        setInstallments([]);
                      }
                    }}
                    className="text-[10px] font-black text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-xl border border-red-200 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>مسح كل الدفعات</span>
                  </button>
                )}
              </div>

              {/* Percentage Builder Section */}
              {showPercentageBuilder && (
                <div className="p-4 bg-[#FAF7F2] rounded-2xl border-2 border-[#C5B198] space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-black text-[#1C3022] flex items-center gap-1">
                      <Percent className="w-4 h-4 text-[#C5B198]" />
                      <span>تحديد عدد الدفعات والنسبة المئوية (%)</span>
                    </h5>
                    <button
                      type="button"
                      onClick={() => setShowPercentageBuilder(false)}
                      className="text-slate-400 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">إجمالي قيمة المشروع (ر.س):</span>
                      <input
                        type="text"
                        value={totalProjectValue}
                        onChange={e => setTotalProjectValue(e.target.value)}
                        className="w-full bg-white border border-[#E8E2D8] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[#1C3022] outline-none"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">عدد الدفعات:</span>
                      <div className="flex items-center gap-1">
                        {[2, 3, 4, 5, 6].map(num => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => handleUpdatePercentageCount(num)}
                            className={`flex-1 py-1 rounded-lg text-xs font-black transition-all ${
                              percentageCount === num
                                ? 'bg-[#1C3022] text-white'
                                : 'bg-white border border-[#E8E2D8] text-[#C5B198]'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Percentage inputs per installment */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-600 block">نسبة كل دفعة بالمئة (%):</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Array.from({ length: percentageCount }).map((_, idx) => (
                        <div key={idx} className="bg-white p-2 rounded-xl border border-[#E8E2D8] text-center">
                          <span className="text-[10px] font-black text-[#1C3022] block mb-1">الدفعة {idx + 1}</span>
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={percentageValues[idx] || 0}
                              onChange={e => {
                                const val = parseInt(e.target.value) || 0;
                                const updated = [...percentageValues];
                                updated[idx] = val;
                                setPercentageValues(updated);
                              }}
                              className="w-14 bg-[#FAF7F2] border border-[#E8E2D8] rounded-lg text-center font-black text-xs py-1"
                            />
                            <span className="text-xs font-black text-slate-500">%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGeneratePercentageInstallments}
                    className="w-full bg-[#1C3022] text-white py-2 rounded-xl text-xs font-black hover:bg-[#122116] transition-all"
                  >
                    تطبيق وتوليد جدول الدفعات
                  </button>
                </div>
              )}

              {/* Add New Installment Form */}
              <form onSubmit={handleAddInstallment} className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E8E2D8] space-y-2.5">
                <h5 className="text-xs font-black text-[#1C3022] flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5 text-[#C5B198]" />
                  <span>إضافة دفعة مالية يدوياً</span>
                </h5>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="مسمى الدفعة..."
                    value={newInstallmentTitle}
                    onChange={e => setNewInstallmentTitle(e.target.value)}
                    className="col-span-2 bg-white border border-[#E8E2D8] rounded-xl px-3 py-2 text-xs font-bold text-[#1C3022] outline-none"
                  />
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="النسبة من المشروع..."
                      value={newInstallmentPercentage}
                      onChange={e => setNewInstallmentPercentage(e.target.value)}
                      className="w-full bg-white border border-[#E8E2D8] rounded-xl px-3 py-2 pl-8 text-xs font-bold text-[#1C3022] outline-none"
                      dir="ltr"
                    />
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">%</span>
                  </div>
                  <input
                    type="date"
                    value={newInstallmentDueDate}
                    onChange={e => setNewInstallmentDueDate(e.target.value)}
                    className="bg-white border border-[#E8E2D8] rounded-xl px-3 py-2 text-xs font-bold text-[#1C3022] outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#1C3022] text-white py-2 rounded-xl text-xs font-black hover:bg-[#122116]"
                >
                  إضافة الدفعة لجدول المشروع
                </button>
              </form>

              {/* Installments List */}
              <div className="space-y-2.5">
                {installments.map((inst, idx) => {
                  const overdue = getInstallmentOverdueStatus(inst);
                  return (
                    <div
                      key={inst.id || idx}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        inst.status === 'paid'
                          ? 'bg-emerald-50/70 border-emerald-200'
                          : overdue.isOverdue7Days
                          ? 'bg-red-50/70 border-red-300 ring-1 ring-red-100'
                          : 'bg-white border-[#E8E2D8]'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h5 className="text-xs font-black text-[#1C3022]">{inst.title}</h5>
                            {overdue.isOverdue7Days && (
                              <span className="text-[9px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-black flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5 text-red-600" />
                                <span>تأخر +7 أيام</span>
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-bold block mt-0.5">
                            تاريخ الاستحقاق: {inst.dueDate}
                          </span>
                          {inst.transactionRef && (
                            <span className="text-[9px] font-mono text-emerald-800 font-bold block">
                              سند: {inst.transactionRef}
                            </span>
                          )}
                        </div>
                        <div className="text-left">
                          <span className="text-xs font-black text-[#1C3022] block">{inst.amount}</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full inline-block mt-1 ${
                            inst.status === 'paid'
                              ? 'bg-emerald-200 text-emerald-900'
                              : overdue.isOverdue7Days
                              ? 'bg-red-100 text-red-900 border border-red-200'
                              : 'bg-amber-100 text-amber-900'
                          }`}>
                            {inst.status === 'paid' ? 'تم السداد' : overdue.isOverdue7Days ? `متأخرة (${overdue.daysOverdue} يوم)` : 'مستحقة'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 mt-2 border-t border-slate-200/60 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleToggleInstallmentStatus(idx)}
                          className={`px-3 py-1 rounded-xl text-[11px] font-black flex items-center gap-1.5 transition-all ${
                            inst.status === 'paid'
                              ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                              : 'bg-emerald-700 text-white hover:bg-emerald-800'
                          }`}
                        >
                          {inst.status === 'paid' ? (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>تغيير إلى بانتظار السداد</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3 h-3" />
                              <span>تسجيل كدفعة مسددة</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteInstallment(idx)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="حذف الدفعة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. DEDICATED CONTRACTS, RECEIPTS & DOCUMENTS TAB */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-black text-[#1C3022]">العقود والسندات والوثائق الرسمية ({documents.length})</h4>
                <p className="text-[10px] text-slate-500">أرفق العقود والسندات والمخططات المعتمدة ليطلع عليها العميل ويحملها</p>
              </div>

              {/* Upload Document Form */}
              <form onSubmit={handleAddDocument} className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#E8E2D8] space-y-3">
                <h5 className="text-xs font-black text-[#1C3022] flex items-center gap-1.5">
                  <FileUp className="w-4 h-4 text-[#C5B198]" />
                  <span>إرفاق مستند أو عقد جديد من الجهاز</span>
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block mb-1">اسم ووصف المستند *</span>
                    <input
                      type="text"
                      placeholder="مثال: عقد البناء الموحد..."
                      value={newDocName}
                      onChange={e => setNewDocName(e.target.value)}
                      className="w-full bg-white border border-[#E8E2D8] rounded-xl px-3 py-2 text-xs font-bold text-[#1C3022] outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block mb-1">تصنيف المستند</span>
                    <select
                      value={newDocCategory}
                      onChange={e => setNewDocCategory(e.target.value as any)}
                      className="w-full bg-white border border-[#E8E2D8] rounded-xl px-3 py-2 text-xs font-bold text-[#1C3022] outline-none"
                    >
                      <option value="عقد معتمد">عقد معتمد</option>
                      <option value="سند قبض">سند قبض</option>
                      <option value="رخصة بناء">رخصة بناء</option>
                      <option value="مخطط معتمد">مخطط معتمد</option>
                      <option value="مستند رسمي">مستند رسمي</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>
                </div>

                {/* File picker */}
                <div className="border-2 border-dashed border-[#C5B198] bg-white rounded-2xl p-3 text-center relative cursor-pointer hover:bg-slate-50 transition-all">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    onChange={handleDocDeviceUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center gap-1 pointer-events-none">
                    <Upload className="w-5 h-5 text-[#C5B198]" />
                    <p className="text-xs font-black text-[#1C3022]">انقر لاختيار الملف من جهازك (PDF / Word / صورة)</p>
                  </div>
                </div>

                {newDocFileName && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-black text-emerald-900">
                    <span className="truncate max-w-[220px]">{newDocFileName} ({newDocFileSize})</span>
                    <button
                      type="button"
                      onClick={() => {
                        setNewDocFileUrl('');
                        setNewDocFileName('');
                        setNewDocFileSize('');
                      }}
                      className="text-red-600 text-[10px]"
                    >
                      إلغاء
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!newDocFileUrl || !newDocName.trim()}
                  className="w-full bg-[#1C3022] text-white py-2.5 rounded-xl text-xs font-black hover:bg-[#122116] disabled:opacity-50 transition-all"
                >
                  حفظ وإرفاق المستند للمشروع
                </button>
              </form>

              {/* Documents List */}
              {documents.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-[#FAF7F2] rounded-2xl border border-dashed border-[#E8E2D8]">
                  لا توجد مستندات أو عقود مرفقة حالياً
                </div>
              ) : (
                <div className="space-y-2.5">
                  {documents.map(doc => (
                    <div
                      key={doc.id}
                      className="p-3.5 bg-[#FAF7F2] rounded-2xl border border-[#E8E2D8] flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-white border border-[#E8E2D8] flex items-center justify-center text-[#1C3022] shrink-0">
                          <FileText className="w-4 h-4 text-[#C5B198]" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[9px] font-black text-[#C5B198] block">{doc.category}</span>
                          <h5 className="text-xs font-black text-[#1C3022] truncate">{doc.name}</h5>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {doc.uploadedAt} {doc.fileSize ? `| ${doc.fileSize}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => downloadFile(doc.fileUrl, doc.fileName || `${doc.name}.pdf`)}
                          className="bg-white hover:bg-slate-100 text-[#1C3022] border border-[#E8E2D8] px-2.5 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 shadow-xs"
                          title="تحميل المستند"
                        >
                          <Download className="w-3.5 h-3.5 text-[#C5B198]" />
                          <span>تحميل</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-1.5 text-red-500 hover:text-red-700"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. IMAGES TAB (DEVICE UPLOAD ONLY) */}
          {activeTab === 'images' && (
            <div className="space-y-4">
              {/* Category Selector */}
              <div className="flex gap-1.5 p-1 bg-[#FAF7F2] rounded-xl border border-[#E8E2D8]">
                {[
                  { id: 'before', label: 'قبل البدء' },
                  { id: 'progress50', label: 'مرحلة 50%' },
                  { id: 'after', label: 'بعد الإنجاز' },
                  { id: 'plans', label: 'المخططات' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setImageCategory(cat.id as any)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${
                      imageCategory === cat.id
                        ? 'bg-[#1C3022] text-white'
                        : 'text-slate-500 hover:text-[#1C3022]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Upload Image from Device */}
              <div className="border-2 border-dashed border-[#C5B198] bg-[#FAF7F2] hover:bg-[#FAF7F2]/80 rounded-2xl p-4 text-center relative cursor-pointer transition-all">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageDeviceUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center gap-1.5 pointer-events-none">
                  <div className="w-10 h-10 rounded-2xl bg-white text-[#1C3022] flex items-center justify-center">
                    <Upload className="w-5 h-5 text-[#C5B198]" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#1C3022]">انقر لاختيار صور من جهازك لقسم ({
                      imageCategory === 'before' ? 'قبل البدء' :
                      imageCategory === 'progress50' ? 'مرحلة 50%' :
                      imageCategory === 'after' ? 'بعد الإنجاز' : 'المخططات'
                    })</p>
                    <p className="text-[10px] text-slate-400">يمكنك اختيار أكثر من صورة معاً</p>
                  </div>
                </div>
              </div>

              {/* Images Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {images[imageCategory]?.length > 0 ? (
                  images[imageCategory].map((url, idx) => (
                    <div key={idx} className="h-32 rounded-2xl overflow-hidden border border-[#E8E2D8] relative group bg-slate-100">
                      <img src={url} alt="موقع المشروع" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(imageCategory, idx)}
                        className="absolute top-2 left-2 bg-red-600/90 text-white p-1.5 rounded-xl hover:bg-red-700 shadow-md"
                        title="حذف الصورة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 py-8 text-center text-xs text-slate-400 font-bold bg-[#FAF7F2] rounded-2xl border border-dashed border-[#E8E2D8]">
                    لا توجد صور مضافة لهذا القسم بعد
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 6. ENGINEER REQUESTS & REPLIES TAB */}
          {activeTab === 'requests' && (
            <div className="space-y-3">
              <h4 className="text-xs font-black text-[#1C3022]">طلبات المعاينة والاستفسارات من العميل ({engineerRequests.length})</h4>

              {engineerRequests.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-[#FAF7F2] rounded-2xl border border-[#E8E2D8]">
                  لا توجد طلبات واردة من العميل لهذا المشروع
                </div>
              ) : (
                engineerRequests.map(req => (
                  <div key={req.id} className="p-3.5 bg-[#FAF7F2] rounded-2xl border border-[#E8E2D8] space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-black text-[#C5B198]">{req.type}</span>
                        <p className="text-xs font-bold text-[#1C3022] mt-0.5">{req.details}</p>
                        <span className="text-[10px] text-slate-400 font-bold block mt-1">بتاريخ: {req.date}</span>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
                        req.status === 'تمت الموافقة والرد' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    {req.engineerReply && (
                      <div className="p-2.5 bg-white rounded-xl border border-emerald-200 text-[11px] text-[#C5B198]">
                        <span className="font-black text-emerald-800 block text-[10px]">رد المهندس المشرف:</span>
                        {req.engineerReply}
                      </div>
                    )}

                    {activeReplyId === req.id ? (
                      <div className="space-y-2 pt-1">
                        <textarea
                          rows={2}
                          placeholder="اكتب ردك المعتمد..."
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          className="w-full bg-white border border-[#E8E2D8] rounded-xl p-2 text-xs font-bold text-[#1C3022] outline-none"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (!replyText.trim()) return;
                              setEngineerRequests(engineerRequests.map(r => r.id === req.id ? { ...r, status: 'تمت الموافقة والرد', engineerReply: replyText.trim() } : r));
                              setActiveReplyId(null);
                              setReplyText('');
                              onRequestToast('تم تسجيل الرد بنجاح');
                            }}
                            className="bg-[#1C3022] text-white px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1"
                          >
                            <Send className="w-3 h-3 text-[#C5B198]" />
                            <span>إرسال الرد</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveReplyId(null)}
                            className="bg-slate-200 text-[#C5B198] px-3 py-1.5 rounded-xl text-[11px] font-bold"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setActiveReplyId(req.id); setReplyText(req.engineerReply || ''); }}
                        className="text-[11px] font-black text-[#C5B198] hover:underline block pt-1"
                      >
                        {req.engineerReply ? 'تعديل الرد' : '+ كتابة رد المهندس المشرف'}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* 7. GENERAL INFO & CANCEL PROJECT TAB */}
          {activeTab === 'info' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-black text-[#C5B198] mb-1">اسم المشروع</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl p-2.5 text-xs font-bold text-[#1C3022] outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-[#C5B198] mb-1">الموقع والمدينة</label>
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl p-2.5 text-xs font-bold text-[#1C3022] outline-none"
                />
              </div>

              {/* Cancel Project Button Section */}
              <div className="pt-3 border-t border-red-200">
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl space-y-2">
                  <span className="text-xs font-black text-red-900 block">إلغاء المشروع</span>
                  <button
                    type="button"
                    onClick={handleCancelProject}
                    disabled={isSaving}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>إلغاء هذا المشروع</span>
                  </button>
                </div>
              </div>

              {/* Delete Project Button Section (Only shown if cancelled) */}
              {(status === 'ملغي' || project.status === 'ملغي') && (
                <div className="pt-3 border-t border-red-200">
                  <div className="p-3.5 bg-red-100/50 border border-red-300 rounded-2xl space-y-2">
                    <span className="text-xs font-black text-red-950 block flex items-center gap-1">
                      <Trash2 className="w-4 h-4 text-red-600" />
                      <span>حذف المشروع نهائياً</span>
                    </span>
                    <p className="text-[10px] text-red-700 font-bold leading-relaxed">
                      بما أن المشروع ملغي، يمكنك حذفه نهائياً من قاعدة البيانات ليختفي تماماً من شاشتك ومن شاشة العميل.
                    </p>
                    <button
                      type="button"
                      onClick={handleDeleteProject}
                      disabled={isSaving}
                      className="w-full bg-red-700 hover:bg-red-800 text-white py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف المشروع والبيانات بالكامل</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions: Save to Cloud */}
        <div className="pt-3 border-t border-[#F0EBE1] flex gap-2 shrink-0">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveAll}
            className="flex-1 bg-[#1C3022] text-white py-3 px-4 rounded-2xl text-xs font-black flex items-center justify-center gap-2 hover:bg-[#122116] shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#C5B198]" />
                <span>جاري الحفظ في السحابة...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-[#C5B198]" />
                <span>حفظ التعديلات واعتمادها فوراً</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 bg-[#FAF7F2] text-slate-700 border border-[#E8E2D8] rounded-2xl text-xs font-black hover:bg-white transition-all"
          >
            إغلاق
          </button>
        </div>
      </motion.div>
    </div>
  );
}
