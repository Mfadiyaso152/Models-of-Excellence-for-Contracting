import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  FileText, 
  Percent, 
  Image as ImageIcon, 
  Building2, 
  CheckCircle2, 
  Download, 
  Maximize2,
  ShieldCheck, 
  FileCheck,
  Ban,
  Calendar,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { Project, ProjectContract, ProjectDocument } from '../types';
import { downloadFile } from '../utils/fileDownloader';

interface Props {
  project: Project;
  onClose: () => void;
  onUpdateProject: (updated: Project) => void;
  onRequestToast: (msg: string) => void;
}

type TabType = 'progress' | 'contracts' | 'gallery' | 'details';

export function ProjectCustomizationModal({ project, onClose, onUpdateProject, onRequestToast }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('progress');
  
  // Gallery stage selector
  const [galleryStage, setGalleryStage] = useState<'before' | 'progress50' | 'after' | 'plans' | 'officialPapers'>('progress50');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Contract viewer modal
  const [selectedContract, setSelectedContract] = useState<ProjectContract | null>(null);

  const stageLabels = {
    before: 'قبل البدء',
    progress50: 'مرحلة 50%',
    after: 'بعد الإنجاز',
    plans: 'المخططات الهندسية',
    officialPapers: 'الأوراق الرسمية'
  };

  const handleRequestCancellation = () => {
    const reason = prompt('يرجى كتابة سبب طلب إلغاء المشروع:');
    if (!reason) return;
    const updated: Project = {
      ...project,
      cancellationRequest: {
        id: `CANC-${Date.now()}`,
        requestedBy: 'client',
        reason,
        requestDate: new Date().toISOString().split('T')[0],
        status: 'pending'
      }
    };
    onUpdateProject(updated);
    onRequestToast('تم إرسال طلب إلغاء المشروع للمشرف للموافقة');
  };

  const handleApproveCancellation = () => {
    const updated: Project = {
      ...project,
      status: 'ملغي',
      cancellationRequest: project.cancellationRequest ? { ...project.cancellationRequest, status: 'approved' } : undefined
    };
    onUpdateProject(updated);
    onRequestToast('تمت الموافقة على إلغاء المشروع');
  };

  const handleRejectCancellation = () => {
    const updated: Project = {
      ...project,
      cancellationRequest: project.cancellationRequest ? { ...project.cancellationRequest, status: 'rejected' } : undefined
    };
    onUpdateProject(updated);
    onRequestToast('تم رفض طلب إلغاء المشروع');
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-[#E8E2D8] text-[#192A1D] space-y-6 my-4" dir="rtl">
      <div className="flex items-center justify-between pb-4 border-b border-[#F0EBE1] shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 bg-[#FAF7F2] text-[#1C3022] hover:bg-[#EFE7DC] rounded-xl border border-[#E8E2D8] transition-colors flex items-center gap-1 text-xs font-black">
            <span>← رجوع</span>
          </button>
          <div className="w-10 h-10 rounded-2xl bg-[#EFE7DC] border border-[#C5B198]/40 flex items-center justify-center text-[#1C3022]">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black text-[#C5B198] block">لوحة متابعة المشروع</span>
            <h3 className="text-base sm:text-lg font-black text-[#1C3022]">{project.title}</h3>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E8E2D8] flex items-center justify-center text-slate-500 hover:text-[#1C3022] hover:bg-[#EFE7DC] transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

        {/* Feature Navigation Tabs */}
        <div className="flex gap-1.5 p-1.5 bg-[#FAF7F2] rounded-2xl border border-[#E8E2D8] my-3 overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'progress', label: 'نسبة الإنجاز (%)', icon: Percent },
            { id: 'contracts', label: 'العقود والوثائق', icon: FileText },
            { id: 'gallery', label: 'صور المشروع', icon: ImageIcon },
            { id: 'details', label: 'بيانات المشروع', icon: Building2 },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all flex-1 justify-center ${
                  isActive 
                    ? 'bg-[#1C3022] text-white shadow-sm' 
                    : 'text-slate-500 hover:text-[#1C3022] hover:bg-[#EFE7DC]/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#1C3022]' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs font-medium">

          {/* 1. PROGRESS PERCENTAGE TAB */}
          {activeTab === 'progress' && (
            <div className="space-y-4">
              {/* Overall Progress Banner */}
              <div className="bg-[#1C3022] text-white p-5 rounded-3xl border border-[#284430] flex items-center justify-between relative overflow-hidden">
                <div className="relative z-10">
                  <span className="text-[11px] font-black text-[#1C3022]">مستوى الإنجاز التراكمي الإجمالي</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black">{project.progress}%</span>
                    <span className="text-xs text-[#EFE7DC]/80 font-bold">من كامل بنود العقد</span>
                  </div>
                  <span className="inline-block mt-2 px-3 py-0.5 rounded-full bg-[#C5B198]/20 text-[#1C3022] text-[10px] font-black border border-[#C5B198]/30">
                    الحالة: {project.status}
                  </span>
                </div>
                
                {/* Circular indicator */}
                <div className="w-16 h-16 relative flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="32" cy="32" r="26" stroke="#2A4532" strokeWidth="6" fill="transparent" />
                    <circle 
                      cx="32" 
                      cy="32" 
                      r="26" 
                      stroke="#C5B198" 
                      strokeWidth="6" 
                      fill="transparent" 
                      strokeDasharray={163.3} 
                      strokeDashoffset={163.3 - (163.3 * project.progress) / 100} 
                      strokeLinecap="round" 
                    />
                  </svg>
                  <Percent className="w-5 h-5 text-[#1C3022] absolute" />
                </div>
              </div>

              {/* Phases Breakdown List */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-black text-[#1C3022] px-1 flex items-center justify-between">
                  <span>تفاصيل نسب الإنجاز حسب المراحل الإنشائية</span>
                  <span className="text-[10px] text-slate-400 font-bold">{project.phases?.length || 0} مراحل</span>
                </h4>

                {(project.phases || []).length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-[#FAF7F2] rounded-2xl border border-dashed border-[#E8E2D8]">
                    جاري إعداد وتحديث جدول المراحل الإنشائية من قبل المشرف
                  </div>
                ) : (
                  project.phases.map((phase, idx) => (
                    <div 
                      key={phase.id || idx} 
                      className="p-3.5 bg-[#FAF7F2] rounded-2xl border border-[#E8E2D8] hover:border-[#C5B198] transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#EFE7DC] text-[#1C3022] text-[10px] font-black flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <h5 className="text-xs font-black text-[#1C3022]">{phase.title}</h5>
                        </div>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${
                          phase.status === 'مكتمل' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : phase.status === 'جاري العمل' 
                            ? 'bg-amber-100 text-amber-900' 
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {phase.status} ({phase.progress}%)
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2 bg-[#E8E2D8] rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            phase.progress === 100 
                              ? 'bg-emerald-600' 
                              : 'bg-gradient-to-l from-[#C5B198] to-[#1C3022]'
                          }`}
                          style={{ width: `${phase.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 2. CONTRACTS & OFFICIAL DOCUMENTS TAB */}
          {activeTab === 'contracts' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-[#FAF7F2] rounded-2xl border border-[#E8E2D8] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#C5B198]" />
                  <div>
                    <h4 className="text-xs font-black text-[#1C3022]">العقود والمستندات والسندات المعتمدة</h4>
                    <p className="text-[10px] text-slate-500">يمكنك معاينة وتحميل كافة العقود والسندات المرفقة</p>
                  </div>
                </div>
              </div>

              {/* Uploaded Documents List */}
              {(project.documents && project.documents.length > 0) && (
                <div className="space-y-2.5">
                  <h5 className="text-[11px] font-black text-[#1C3022]">المستندات والسندات المرفقة:</h5>
                  {project.documents.map(doc => (
                    <div
                      key={doc.id}
                      className="p-3.5 bg-white rounded-2xl border border-[#E8E2D8] flex items-center justify-between gap-2 shadow-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#FAF7F2] border border-[#E8E2D8] flex items-center justify-center text-[#1C3022] shrink-0">
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

                      <button
                        type="button"
                        onClick={() => downloadFile(doc.fileUrl, doc.fileName || `${doc.name}.pdf`)}
                        className="bg-[#1C3022] hover:bg-[#122116] text-[#1C3022] px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 shadow-xs shrink-0"
                      >
                        <Download className="w-3.5 h-3.5 text-[#1C3022]" />
                        <span>تحميل</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Contracts List */}
              {project.contracts && project.contracts.length > 0 ? (
                <div className="space-y-3">
                  {project.contracts.map(contract => (
                    <div 
                      key={contract.id}
                      className="p-4 bg-white rounded-2xl border border-[#E8E2D8] hover:border-[#C5B198] shadow-sm transition-all space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold text-[#C5B198] block">رقم العقد: {contract.contractNumber}</span>
                          <h4 className="text-xs font-black text-[#1C3022] mt-0.5">{contract.title}</h4>
                        </div>
                        <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                          {contract.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#FAF7F2] p-2.5 rounded-xl border border-[#F0EBE1]">
                        <div>
                          <span className="text-slate-400 font-bold block text-[10px]">تاريخ التوقيع</span>
                          <span className="font-black text-[#1C3022]">{contract.signDate}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block text-[10px]">القيمة الإجمالية</span>
                          <span className="font-black text-[#1C3022]">{contract.totalValue}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#F5EFE6] flex gap-2">
                        <button 
                          onClick={() => setSelectedContract(contract)}
                          className="flex-1 bg-[#1C3022] text-white py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 hover:bg-[#122116] transition-all"
                        >
                          <FileCheck className="w-3.5 h-3.5 text-[#1C3022]" />
                          <span>معاينة العقد الرقمي</span>
                        </button>
                        <button 
                          onClick={() => downloadFile(contract.pdfUrl || '', `${contract.title}.pdf`)}
                          className="px-3 py-2 bg-[#EFE7DC] text-[#1C3022] rounded-xl text-xs font-black flex items-center gap-1 hover:bg-[#e4dacb] transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>تحميل</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (!project.documents || project.documents.length === 0) ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-[#FAF7F2] rounded-2xl border border-dashed border-[#E8E2D8]">
                  لا توجد عقود أو وثائق مرفقة حالياً
                </div>
              ) : null}
            </div>
          )}

          {/* 3. GALLERY TAB */}
          {activeTab === 'gallery' && (
            <div className="space-y-3.5">
              {/* Category selector */}
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {(Object.keys(stageLabels) as Array<keyof typeof stageLabels>).map(key => {
                  const isActive = galleryStage === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setGalleryStage(key)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                        isActive 
                          ? 'bg-[#1C3022] text-white' 
                          : 'bg-[#FAF7F2] text-slate-500 border border-[#E8E2D8] hover:bg-[#EFE7DC]'
                      }`}
                    >
                      {stageLabels[key]}
                    </button>
                  );
                })}
              </div>

              {/* Images Grid */}
              <div className="grid grid-cols-2 gap-3">
                {project.images && project.images[galleryStage] && project.images[galleryStage].length > 0 ? (
                  project.images[galleryStage].map((url, i) => (
                    <div 
                      key={i} 
                      onClick={() => setPreviewImage(url)}
                      className="h-36 rounded-2xl overflow-hidden border border-[#E8E2D8] relative group cursor-pointer shadow-sm bg-slate-100"
                    >
                      <img 
                        src={url} 
                        alt={`${project.title} - ${stageLabels[galleryStage]}`} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Maximize2 className="w-5 h-5" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 py-10 text-center bg-[#FAF7F2] rounded-2xl border border-dashed border-[#E8E2D8] text-slate-400 text-xs font-bold">
                    لا توجد صور لهذه المرحلة حالياً
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. DETAILS & CANCEL TAB */}
          {activeTab === 'details' && (
            <div className="space-y-3.5">
              <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E8E2D8] space-y-2.5">
                <div className="flex justify-between items-center pb-2 border-b border-[#E8E2D8]">
                  <span className="text-slate-500 font-bold">اسم المشروع</span>
                  <span className="font-black text-[#1C3022]">{project.title}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-[#E8E2D8]">
                  <span className="text-slate-500 font-bold">الموقع والمدينة</span>
                  <span className="font-black text-[#1C3022]">{project.location}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-[#E8E2D8]">
                  <span className="text-slate-500 font-bold">رقم الترخيص</span>
                  <span className="font-black text-[#1C3022]">{project.licenseNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold">حالة المشروع</span>
                  <span className="font-black text-[#1C3022] px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-900">{project.status}</span>
                </div>
              </div>

              {/* Cancel Project Section with Mutual Approval */}
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-3">
                <h5 className="text-xs font-black text-red-950 flex items-center gap-1.5">
                  <Ban className="w-4 h-4 text-red-600" />
                  <span>طلب إلغاء المشروع</span>
                </h5>
                <p className="text-[10px] text-red-700 leading-relaxed">
                  حسب سياسة النظام، لا يمكن إلغاء المشروع نهائياً إلا بموافقة متبادلة بين العميل والمشرف العام.
                </p>

                {project.cancellationRequest && project.cancellationRequest.status === 'pending' ? (
                  <div className="p-3 bg-white rounded-xl border border-red-200 space-y-2">
                    <span className="text-[10px] font-black text-red-800 block">
                      {project.cancellationRequest.requestedBy === 'supervisor' 
                        ? 'طلب المشرف إلغاء هذا المشروع:' 
                        : 'تم تقديم طلب إلغاء من قبلك وبانتظار موافقة المشرف العام:'}
                    </span>
                    <p className="text-[10px] text-slate-600 italic">"{project.cancellationRequest.reason}"</p>
                    
                    {project.cancellationRequest.requestedBy === 'supervisor' && (
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleApproveCancellation}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl text-xs font-black"
                        >
                          الموافقة على الإلغاء
                        </button>
                        <button
                          type="button"
                          onClick={handleRejectCancellation}
                          className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 py-2 rounded-xl text-xs font-bold"
                        >
                          رفض الطلب
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestCancellation}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-xs"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>تقديم طلب إلغاء المشروع</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-[#F0EBE1] shrink-0">
          <button 
            onClick={onClose}
            className="w-full py-2.5 bg-[#FAF7F2] text-slate-700 border border-[#E8E2D8] rounded-2xl text-xs font-black hover:bg-[#EFE7DC] transition-all"
          >
            إغلاق
          </button>
        </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img 
              src={previewImage} 
              alt="معاينة" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl" 
              referrerPolicy="no-referrer"
            />
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 bg-black/60 text-white p-2 rounded-full hover:bg-black"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
