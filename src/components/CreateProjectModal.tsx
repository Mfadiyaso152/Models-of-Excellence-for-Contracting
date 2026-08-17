import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Building2, Plus, Trash2, Loader2, Wallet, Percent, HardHat } from 'lucide-react';
import { User as UserType, Project, Installment, ConstructionPhase } from '../types';
import { ProjectService } from '../services/dbService';

interface Props {
  clients: UserType[];
  selectedClientId?: string;
  onClose: () => void;
  onProjectCreated: (project: Project) => void;
  onRequestToast: (msg: string) => void;
}

interface CustomInstallmentInput {
  id: string;
  title: string;
  amount: string;
  dueDate: string;
}

export function CreateProjectModal({
  clients,
  selectedClientId,
  onClose,
  onProjectCreated,
  onRequestToast
}: Props) {
  // Prevent background scrolling
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const eligibleClients = clients.filter(c => c.email?.toLowerCase() !== 'mfb.15.f@gmail.com' && c.role !== 'supervisor');
  const [clientId, setClientId] = useState(selectedClientId || (eligibleClients[0]?.id || ''));
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [licenseNumber] = useState(`BL-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`);
  const [totalCost, setTotalCost] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manual Phases State
  const [phases, setPhases] = useState<ConstructionPhase[]>([]);
  const [newPhaseTitle, setNewPhaseTitle] = useState('');

  // Installments Mode: 'percentage' or 'manual'
  const [installmentMode, setInstallmentMode] = useState<'percentage' | 'manual'>('percentage');
  const [installmentCount, setInstallmentCount] = useState<number>(4);
  const [percentages, setPercentages] = useState<number[]>([25, 25, 25, 25]);

  // Manual Installments
  const [manualInstallments, setManualInstallments] = useState<CustomInstallmentInput[]>([
    {
      id: `INST-1`,
      title: '',
      amount: '',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
  ]);

  const handleUpdatePercentageCount = (count: number) => {
    const valid = Math.max(1, Math.min(8, count));
    setInstallmentCount(valid);
    const equalVal = Math.floor(100 / valid);
    const rem = 100 - equalVal * valid;
    const newVals = Array.from({ length: valid }, (_, i) => (i === valid - 1 ? equalVal + rem : equalVal));
    setPercentages(newVals);
  };

  const handleAddPhase = () => {
    if (!newPhaseTitle.trim()) return;
    setPhases([
      ...phases,
      {
        id: `PH-${Date.now().toString().slice(-4)}`,
        title: newPhaseTitle.trim(),
        progress: 0,
        status: 'قيد الانتظار'
      }
    ]);
    setNewPhaseTitle('');
  };

  const handleDeletePhase = (index: number) => {
    setPhases(phases.filter((_, i) => i !== index));
  };

  const handleAddManualInstallmentRow = () => {
    setManualInstallments([
      ...manualInstallments,
      {
        id: `INST-${Date.now().toString().slice(-4)}`,
        title: '',
        amount: '',
        dueDate: new Date(Date.now() + (manualInstallments.length * 30 + 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
    ]);
  };

  const handleDeleteManualInstallmentRow = (index: number) => {
    if (manualInstallments.length <= 1) return;
    setManualInstallments(manualInstallments.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !location.trim() || !clientId) {
      onRequestToast('يرجى تعبئة كافة الحقول الأساسية');
      return;
    }

    if (!totalCost.trim()) {
      onRequestToast('يرجى إدخال إجمالي قيمة المشروع');
      return;
    }

    const costNum = parseFloat(totalCost.replace(/[^0-9.]/g, '')) || 0;
    if (costNum <= 0) {
      onRequestToast('يرجى إدخال مبلغ صحيح');
      return;
    }

    let finalInstallments: Installment[] = [];

    if (installmentMode === 'percentage') {
      const sumPct = percentages.slice(0, installmentCount).reduce((a, b) => a + (b || 0), 0);
      if (sumPct !== 100) {
        onRequestToast(`مجموع النسب (${sumPct}%) يجب أن يساوي 100%`);
        return;
      }

      finalInstallments = percentages.slice(0, installmentCount).map((pct, idx) => {
        const amt = Math.round((costNum * pct) / 100);
        return {
          id: `INST-${idx + 1}`,
          title: `الدفعة ${idx + 1} (${pct}%)`,
          amount: `${amt.toLocaleString('ar-SA')} ر.س`,
          amountNumber: amt,
          dueDate: new Date(Date.now() + (idx + 1) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'pending',
          clientApprovalStatus: 'pending'
        };
      });
    } else {
      const hasEmpty = manualInstallments.some(i => !i.title.trim() || !i.amount.trim());
      if (hasEmpty) {
        onRequestToast('يرجى تعبئة مسمى ومبلغ كافة الدفعات');
        return;
      }

      finalInstallments = manualInstallments.map((inst, index) => {
        const num = parseFloat(inst.amount.replace(/[^0-9.]/g, '')) || 0;
        return {
          id: inst.id || `INST-${index + 1}`,
          title: inst.title.trim(),
          amount: `${num.toLocaleString('ar-SA')} ر.س`,
          amountNumber: num,
          dueDate: inst.dueDate || new Date(Date.now() + (index * 30 + 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'pending',
          clientApprovalStatus: 'pending'
        };
      });
    }

    setIsSubmitting(true);

    const newProjectData: any = {
      clientId,
      title: title.trim(),
      location: location.trim(),
      landArea: '',
      builtUpArea: '',
      licenseNumber: licenseNumber.trim(),
      progress: 0,
      status: 'قيد التنفيذ',
      startDate: new Date().toISOString().split('T')[0],
      estimatedEndDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      supervisingEngineer: {
        name: 'المشرف المعتمد',
        phone: '0500000000',
        title: 'إدارة المشاريع'
      },
      phases: phases,
      contracts: [
        {
          id: `CNT-${Date.now().toString().slice(-4)}`,
          title: 'عقد تنفيذ وإنشاء الهيكل الإنشائي والتشطيب',
          contractNumber: `DOC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          signDate: new Date().toLocaleDateString('ar-SA'),
          totalValue: `${costNum.toLocaleString('ar-SA')} ر.س`,
          status: 'ساري وموثق',
          termsSummary: [
            'الالتزام بكود البناء السعودي.',
            'ضمان هيكل إنشائي وعوازل لمدة 10 سنوات.'
          ]
        }
      ],
      documents: [],
      engineerRequests: [],
      images: {
        before: [],
        progress50: [],
        after: [],
        plans: [],
        officialPapers: []
      },
      installments: finalInstallments
    };

    try {
      const created = await ProjectService.createNewProject(newProjectData);
      onProjectCreated(created);
      onRequestToast('تم إنشاء المشروع بنجاح');
      onClose();
    } catch (err) {
      console.error(err);
      onRequestToast('حدث خطأ أثناء إنشاء المشروع');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm overflow-y-auto" dir="rtl">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-3xl bg-white rounded-[2rem] p-6 sm:p-8 shadow-2xl border border-[#E8E2D8] text-[#1C3022] space-y-5 my-auto max-h-[92vh] flex flex-col"
      >
        <div className="flex justify-between items-center pb-4 border-b border-[#F0EBE1] shrink-0">
          <div className="flex items-center gap-2.5">
            <button onClick={onClose} className="p-2 bg-[#FAF7F2] text-[#1C3022] hover:bg-[#EFE7DC] rounded-xl border border-[#E8E2D8] transition-colors flex items-center gap-1 text-xs font-black">
              <span>← رجوع</span>
            </button>
            <div className="w-9 h-9 rounded-xl bg-[#1C3022] text-[#C5B198] flex items-center justify-center font-black">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#1C3022]">إضافة وتخصيص مشروع جديد</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 flex-1 overflow-y-auto pr-1">
            {/* 1. Client Select */}
            <div>
              <label className="block text-xs font-black text-[#1C3022] mb-1">العميل</label>
              <select
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                required
                className="w-full bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl px-3 py-2 text-xs font-bold text-[#1C3022] outline-none"
              >
                {eligibleClients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email || c.phone || c.id.slice(0, 8)})
                  </option>
                ))}
              </select>
            </div>

          {/* 2. Project Title & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-black text-[#1C3022] mb-1">اسم المشروع</label>
              <input
                type="text"
                placeholder="اسم المشروع..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                className="w-full bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl px-3 py-2 text-xs font-bold text-[#1C3022] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-[#1C3022] mb-1">المدينة / الحي</label>
              <input
                type="text"
                placeholder="الموقع..."
                value={location}
                onChange={e => setLocation(e.target.value)}
                required
                className="w-full bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl px-3 py-2 text-xs font-bold text-[#1C3022] outline-none"
              />
            </div>
          </div>

          {/* 3. Total Cost */}
          <div>
            <label className="block text-xs font-black text-[#1C3022] mb-1">إجمالي قيمة المشروع (ر.س)</label>
            <input
              type="text"
              placeholder="مثال: 500000"
              value={totalCost}
              onChange={e => setTotalCost(e.target.value)}
              required
              className="w-full bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl px-3 py-2 text-xs font-black text-[#1C3022] outline-none"
              dir="ltr"
            />
          </div>

          {/* 4. Manual Construction Phases */}
          <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E8E2D8] space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-[#1C3022] flex items-center gap-1">
                <HardHat className="w-3.5 h-3.5 text-[#A99379]" />
                <span>المراحل الإنشائية ({phases.length})</span>
              </span>
            </div>

            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="أضف مرحلة إنشائية (يدوياً)..."
                value={newPhaseTitle}
                onChange={e => setNewPhaseTitle(e.target.value)}
                className="flex-1 bg-white border border-[#E8E2D8] rounded-xl px-3 py-2 text-xs font-bold text-[#1C3022] outline-none focus:border-[#D0A97E]"
              />
              <button
                type="button"
                onClick={handleAddPhase}
                className="bg-[#D0A97E] text-[#1C3022] px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1 transition-colors hover:bg-[#C29B70]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة</span>
              </button>
            </div>

            {phases.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {phases.map((p, idx) => (
                  <div key={p.id || idx} className="bg-white p-3 rounded-xl border border-[#E8E2D8] flex items-center justify-between text-xs">
                    <span className="font-bold text-[#1C3022]">{idx + 1}. {p.title}</span>
                    <button
                      type="button"
                      onClick={() => handleDeletePhase(idx)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5. Installments: Percentage-based strictly */}
          <div className="bg-[#FAF7F2] p-4 rounded-[2rem] border border-[#E8E2D8] space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-[#1C3022] flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[#C5B198]" />
                <span>جدول الدفعات المالية (بالنسبة المئوية %)</span>
              </span>
            </div>

            <div className="space-y-2.5">
              <div>
                <span className="text-[11px] font-bold text-[#C5B198] block mb-2">حدد عدد الدفعات:</span>
                <div className="flex gap-1">
                  {[2, 3, 4, 5, 6].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleUpdatePercentageCount(num)}
                      className={`flex-1 py-1 rounded-lg text-xs font-black transition-all ${
                        installmentCount === num
                          ? 'bg-[#D0A97E] text-[#1C3022]'
                          : 'bg-white border border-[#E8E2D8] text-[#1C3022]'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Array.from({ length: installmentCount }).map((_, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-xl border border-[#E8E2D8] text-center">
                    <span className="text-[11px] font-black text-[#1C3022] block mb-2">الدفعة {idx + 1}</span>
                    <div className="flex items-center justify-center gap-1">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={percentages[idx] || 0}
                        onChange={e => {
                          const val = parseInt(e.target.value) || 0;
                          const updated = [...percentages];
                          updated[idx] = val;
                          setPercentages(updated);
                        }}
                        className="w-12 bg-[#FAF7F2] border border-[#E8E2D8] rounded-lg text-center font-black text-[#1C3022] text-xs py-1 focus:border-[#D0A97E]"
                      />
                      <span className="text-xs font-bold text-[#C5B198]">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#D0A97E] text-[#1C3022] py-4 rounded-[2rem] text-sm font-black flex items-center justify-center gap-2 hover:bg-[#C29B70] shadow-md transition-all disabled:opacity-50 mt-6"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#1C3022]" />
                <span>جاري إنشاء المشروع...</span>
              </>
            ) : (
              <span>إنشاء المشروع وتثبيت الجدول</span>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
