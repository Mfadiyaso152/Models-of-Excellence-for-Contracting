import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  HardHat,
  Wallet,
  Plus,
  Search,
  Building2,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sliders,
  ChevronLeft,
  Mail,
  Phone,
  Calendar,
  FileText,
  Percent,
  Check,
  Smartphone,
  ExternalLink,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  CreditCard,
  BellRing,
  Send,
  AlertTriangle,
  Upload,
  FileUp,
  Download,
  X,
  FileCheck,
  Loader2,
  Trash2,
  Eye,
  UserX
} from 'lucide-react';
import { User, Project, QuoteRequest, ProjectStatus, Installment, getInstallmentOverdueStatus } from '../types';
import { ProjectService } from '../services/dbService';
import { DeleteClientByAdminModal } from './DeleteClientByAdminModal';
import { DeleteProjectByAdminModal } from './DeleteProjectByAdminModal';
import { downloadFile } from '../utils/fileDownloader';
import { DigitalContractSigningModal } from './DigitalContractSigningModal';
import { storeFile } from '../utils/fileCache';

// -------------------------------------------------------------
// 1. SUPERVISOR HOME VIEW: "العملاء" (Clients & Overview)
// -------------------------------------------------------------
interface SupervisorClientsViewProps {
  user: User;
  clients: User[];
  projects: Project[];
  quotes: QuoteRequest[];
  onSelectClientForProjects: (clientId: string) => void;
  onCreateProjectForClient: (clientId: string) => void;
  onRefreshQuotes: () => void;
  onDeleteClient?: (clientId: string, reason: string) => Promise<void>;
  onRequestToast: (msg: string) => void;
}

export function SupervisorClientsView({
  user,
  clients,
  projects,
  quotes,
  onSelectClientForProjects,
  onCreateProjectForClient,
  onRefreshQuotes,
  onDeleteClient,
  onRequestToast
}: SupervisorClientsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'clients' | 'quotes'>('clients');
  const [selectedQuoteForProposal, setSelectedQuoteForProposal] = useState<QuoteRequest | null>(null);
  const [quoteForContractSigning, setQuoteForContractSigning] = useState<QuoteRequest | null>(null);
  const [clientToDelete, setClientToDelete] = useState<User | null>(null);

  // Filter clients (exclude deleted and exclude supervisor)
  const actualClients = clients.filter(c => !c.isDeleted && c.email?.toLowerCase() !== 'mfb.15.f@gmail.com' && c.role !== 'supervisor');
  const filteredClients = actualClients.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    );
  });

  const handleUpdateQuoteStatus = async (quote: QuoteRequest, newStatus: any) => {
    const updated: QuoteRequest = { ...quote, status: newStatus };
    try {
      await ProjectService.saveQuoteRequest(updated);
      onRefreshQuotes();
      onRequestToast(`تم تحديث حالة طلب دراسة المشروع إلى: ${newStatus}`);
    } catch (err) {
      console.error(err);
      onRequestToast('حدث خطأ أثناء تحديث الطلب');
    }
  };

  const handleSignContractAndCreateProject = async (quote: QuoteRequest, signatureData: {
    contractNumber: string;
    signDate: string;
    signerName: string;
    signatureImgUrl?: string;
    contractDocument?: any;
  }) => {
    const totalNum = parseFloat((quote.quoteAmount || quote.amount || '0').replace(/[^0-9.]/g, '')) || 0;
    const newProj: Project = {
      id: `PROJ-${Date.now().toString().slice(-6)}`,
      clientId: quote.clientId,
      title: quote.projectName,
      status: 'بانتظار توقيع العميل',
      progress: 0,
      location: quote.description?.split('|')?.[0]?.replace('الموقع:', '')?.trim() || 'الرياض',
      licenseNumber: `BLD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      startDate: new Date().toISOString().split('T')[0],
      estimatedEndDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      installments: quote.installments && quote.installments.length > 0 ? quote.installments : [
        {
          id: `INST-1`,
          title: 'الدفعة الأولى',
          amount: `${(totalNum * 0.25).toLocaleString('ar-SA')} ر.س`,
          amountNumber: totalNum * 0.25,
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'pending'
        }
      ],
      contracts: [
        {
          id: `CNT-${Date.now().toString().slice(-4)}`,
          contractNumber: signatureData.contractNumber,
          title: `عقد تنفيذ ${quote.projectName}`,
          signDate: signatureData.signDate,
          totalValue: quote.quoteAmount || quote.amount || 'حسب جدول الدفعات',
          status: 'بانتظار توقيع العميل',
          pdfUrl: signatureData.contractDocument?.fileUrl || undefined,
          supervisorSignerName: signatureData.signerName,
          supervisorSignedDate: new Date().toLocaleDateString('ar-SA'),
          termsSummary: [
            'الالتزام بالمخططات الهندسية المعتمدة وكود البناء السعودي',
            'جدول دفعات حسب الإنجاز المالي والإنشائي'
          ]
        }
      ],
      documents: (() => {
        const docs: any[] = [];
        if (signatureData.contractDocument) {
          docs.push({
            ...signatureData.contractDocument,
            name: `مسودة عقد المقاولة - ${quote.projectName}`,
            category: 'عقد معتمد'
          });
        }
        if (quote.fileUrl) {
          docs.push({
            id: `DOC-QUOTE-${Date.now().toString().slice(-4)}`,
            name: `عرض السعر المعتمد - ${quote.projectName}`,
            category: 'مستند رسمي',
            fileUrl: quote.fileUrl,
            fileName: quote.fileName || 'quote_proposal.pdf',
            fileSize: quote.fileSize || '1.2 MB',
            uploadedAt: new Date().toISOString().split('T')[0],
            uploadedBy: 'المشرف العام'
          });
        }
        return docs;
      })(),
      phases: [],
      images: { before: [], progress50: [], after: [], plans: [], officialPapers: [] },
      engineerRequests: []
    };

    try {
      await ProjectService.saveProject(newProj);
      // Remove quote request so only the project remains
      await ProjectService.deleteQuoteRequest(quote.id);
      setQuoteForContractSigning(null);
      onRefreshQuotes();
      onRequestToast('تم إعداد العقد بنجاح وإرساله لحساب العميل للتوقيع وتحويل الطلب إلى مشروع!');
    } catch (err) {
      console.error(err);
      onRequestToast('حدث خطأ أثناء اعتماد المشروع وتوقيع العقد');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-[#1C3022]">دليل العملاء والطلبات</h3>
        <div className="flex items-center gap-1.5 bg-white border border-[#E8E2D8] px-3.5 py-2 rounded-2xl text-xs font-black text-[#1C3022] shadow-sm">
          <Users className="w-4 h-4 text-[#C5B198]" />
          <span>{clients.length} عملاء</span>
        </div>
      </div>

      {/* View Selector Tabs: Clients vs Quotes */}
      <div className="flex gap-1.5 p-1 bg-white rounded-2xl border border-[#E8E2D8] shadow-sm">
        <button
          onClick={() => setActiveTab('clients')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'clients'
              ? 'bg-[#1C3022] text-white shadow-sm'
              : 'text-slate-500 hover:text-[#1C3022]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>دليل العملاء ({clients.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('quotes')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'quotes'
              ? 'bg-[#1C3022] text-white shadow-sm'
              : 'text-slate-500 hover:text-[#1C3022]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>طلبات العروض والدراسات ({quotes.length})</span>
        </button>
      </div>

      {/* CLIENTS DIRECTORY */}
      {activeTab === 'clients' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
            <input
              type="text"
              placeholder="بحث عن عميل بالاسم أو البريد الإلكتروني..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#E8E2D8] rounded-2xl pr-10 pl-4 py-3 text-xs font-bold text-[#1C3022] outline-none shadow-sm focus:ring-2 focus:ring-[#C5B198]"
            />
          </div>

          {filteredClients.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-[#E8E2D8] space-y-2">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-xs font-black text-[#1C3022]">لم يتم العثور على عملاء</h4>
              <p className="text-[11px] text-slate-400">سيظهر العملاء هنا تلقائياً عند تسجيلهم في التطبيق</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredClients.map(client => {
                const clientProjects = projects.filter(p => p.clientId === client.id);
                const hasOverduePayment = clientProjects.some(p => 
                  p.installments?.some(i => getInstallmentOverdueStatus(i).isOverdue7Days)
                );

                return (
                  <div
                    key={client.id}
                    className={`bg-white rounded-3xl p-4 border shadow-sm hover:shadow-md transition-all space-y-3 ${
                      hasOverduePayment ? 'border-red-300 ring-1 ring-red-100' : 'border-[#E8E2D8]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-white border border-[#C5B198]/40 flex items-center justify-center text-[#1C3022] overflow-hidden shrink-0">
                          {client.photoURL ? (
                            <img src={client.photoURL} alt={client.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="font-black text-sm text-[#1C3022]">{client.name.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black text-[#1C3022]">{client.name}</h4>
                            {client.email?.toLowerCase() === 'mfb.15.f@gmail.com' && (
                              <span className="text-[9px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-black">
                                المشرف العام
                              </span>
                            )}
                            {hasOverduePayment && (
                              <span className="text-[9px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-black flex items-center gap-0.5">
                                <AlertTriangle className="w-2.5 h-2.5 text-red-600" />
                                <span>دفعة متأخرة +7 أيام</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 font-bold" dir="ltr">
                            {client.email || client.phone || 'حساب عميل'}
                          </p>
                        </div>
                      </div>

                      {/* Compact actions without project count badge */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* View projects icon button (icon-only) */}
                        <button
                          type="button"
                          onClick={() => onSelectClientForProjects(client.id)}
                          className="w-8 h-8 rounded-xl bg-[#FAF7F2] hover:bg-white text-[#1C3022] flex items-center justify-center border border-[#E8E2D8] transition-all shadow-sm active:scale-95 hover:border-[#C5B198]"
                          title="استعراض مشاريع العميل"
                        >
                          <Eye className="w-4 h-4 text-[#1C3022]" />
                        </button>

                        {/* Delete client icon button (icon-only) */}
                        {client.email?.toLowerCase() !== 'mfb.15.f@gmail.com' && (
                          <button
                            type="button"
                            onClick={() => setClientToDelete(client)}
                            className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center border border-red-200 transition-all shadow-sm active:scale-95"
                            title="حذف حساب العميل"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* DELETE CLIENT MODAL WITH REASON & PROJECT RESTRICTION */}
      <AnimatePresence>
        {clientToDelete && (
          <DeleteClientByAdminModal
            client={clientToDelete}
            projects={projects}
            onClose={() => setClientToDelete(null)}
            onConfirmDelete={async (clientId, reason) => {
              if (onDeleteClient) {
                await onDeleteClient(clientId, reason);
              }
              setClientToDelete(null);
            }}
            onRequestToast={onRequestToast}
          />
        )}
      </AnimatePresence>

      {/* QUOTE REQUESTS MANAGEMENT */}
      {activeTab === 'quotes' && (
        <div className="space-y-3">
          {quotes.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-[#E8E2D8] space-y-2">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-xs font-black text-[#1C3022]">لا توجد طلبات عروض أسعار جديدة</h4>
              <p className="text-[11px] text-slate-400">أي طلب يقدمه العميل لدراسة مشروع جديد سيظهر هنا للمشرف لإرسال عرض السعر ونظام الدفعات والملف المرفق</p>
            </div>
          ) : (
            quotes.map(quote => {
              const hasProposal = Boolean(quote.quoteAmount || quote.fileUrl || quote.installments?.length);
              const isCounterOffer = quote.clientDecision === 'accepted_with_modifications' || quote.status === 'بانتظار مراجعة التعديل';

              return (
                <div key={quote.id} className="bg-white rounded-3xl p-4 border border-[#E8E2D8] shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-[#C5B198]">طلب رقم: #{quote.id}</span>
                      <h4 className="text-xs font-black text-[#1C3022] mt-0.5">{quote.projectName}</h4>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{quote.description}</p>
                      <span className="text-[10px] text-slate-400 font-bold block mt-1">العميل: {quote.clientName} | تاريخ الطلب: {quote.date}</span>
                    </div>
                    <div className="text-left shrink-0">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl block ${
                        quote.status === 'طلب جديد' ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                        quote.status === 'تم إرسال العرض' ? 'bg-blue-100 text-blue-900 border border-blue-200' :
                        quote.status === 'بانتظار مراجعة التعديل' ? 'bg-orange-100 text-orange-900 border border-orange-200' :
                        quote.status === 'مقبول' || quote.status === 'تم اعتماد المشروع' ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' : 
                        quote.status === 'تم توقيع العقد' ? 'bg-emerald-900 text-[#C5B198]' :
                        quote.status === 'مرفوض' ? 'bg-red-100 text-red-900 border border-red-200' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {quote.status}
                      </span>
                      {quote.quoteAmount && (
                        <span className="text-[11px] font-black text-[#1C3022] block mt-1">
                          {quote.quoteAmount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Proposal Details Banner if sent */}
                  {hasProposal && (
                    <div className="p-3.5 bg-[#FAF7F2] rounded-2xl border border-[#E8E2D8] text-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block">إجمالي العرض المقترح:</span>
                          <span className="font-black text-[#1C3022]">{quote.quoteAmount || 'حسب المواصفات'}</span>
                        </div>
                        {quote.fileUrl && (
                          <button
                            type="button"
                            onClick={() => downloadFile(quote.fileUrl!, quote.fileName || `عرض_سعر_${quote.projectName}.pdf`)}
                            className="text-[11px] text-[#1C3022] font-black hover:underline flex items-center gap-1 bg-white px-2.5 py-1.5 rounded-xl border border-[#E8E2D8] shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5 text-[#C5B198]" />
                            <span>تحميل ({quote.fileName || 'ملف العرض'})</span>
                          </button>
                        )}
                      </div>

                      {/* Installments preview if configured */}
                      {quote.installments && quote.installments.length > 0 && (
                        <div className="pt-2 border-t border-[#E8E2D8] space-y-1">
                          <span className="text-[10px] font-black text-[#1C3022] flex items-center gap-1">
                            <Wallet className="w-3 h-3 text-[#C5B198]" />
                            <span>نظام الدفعات المقترح ({quote.installments.length} دفعات):</span>
                          </span>
                          <div className="grid grid-cols-2 gap-1.5 pt-1">
                            {quote.installments.slice(0, 4).map((inst, i) => (
                              <div key={i} className="bg-white p-2 rounded-xl border border-[#E8E2D8] text-[10px]">
                                <span className="font-black text-[#1C3022] block truncate">{inst.title}</span>
                                <span className="text-emerald-800 font-bold">{inst.amount}</span>
                              </div>
                            ))}
                            {quote.installments.length > 4 && (
                              <div className="bg-white p-2 rounded-xl border border-[#E8E2D8] text-[10px] flex items-center justify-center font-bold text-slate-500">
                                + {quote.installments.length - 4} دفعات أخرى
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {quote.adminNote && (
                        <p className="text-[11px] text-slate-600 font-medium pt-1 border-t border-[#E8E2D8]">
                          <strong>ملاحظات المشرف:</strong> {quote.adminNote}
                        </p>
                      )}
                    </div>
                  )}

                  {/* APPROVED BY CLIENT: CONTRACT SIGNING CALL TO ACTION */}
                  {(quote.clientDecision === 'accepted' || quote.status === 'مقبول') && (
                    <div className="p-3.5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-emerald-950 font-black text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                          <span>تمت موافقة العميل على عرض السعر - بانتظار إعداد العقد</span>
                        </div>
                        <span className="text-[10px] font-black bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                          جاهز للتعاقد
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setQuoteForContractSigning(quote)}
                        className="w-full bg-[#1C3022] text-white hover:bg-[#122116] py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
                      >
                        <FileCheck className="w-4 h-4 text-[#C5B198]" />
                        <span>تجهيز وإرسال مسودة العقد للعميل</span>
                      </button>
                    </div>
                  )}

                  {/* CLIENT COUNTER-OFFER BANNER (قبول مع تعديل بالتسعير) */}
                  {isCounterOffer && (
                    <div className="p-3.5 bg-amber-50 border-2 border-amber-200 rounded-2xl space-y-2.5">
                      <div className="flex items-center gap-2 text-amber-900 font-black text-xs">
                        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>طلب العميل: قبول مع تعديل بالتسعير</span>
                      </div>
                      {quote.clientModificationNote && (
                        <div className="p-2.5 bg-white rounded-xl border border-amber-200 text-xs text-slate-700 font-medium">
                          <strong>ملاحظات واقتراح العميل للتسعير:</strong>
                          <p className="mt-1 text-[#1C3022] font-bold">{quote.clientModificationNote}</p>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setQuoteForContractSigning(quote)}
                          className="bg-emerald-800 hover:bg-emerald-900 text-white px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span>قبول المشروع وتوقيع العقد</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedQuoteForProposal(quote)}
                          className="bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1"
                        >
                          <FileUp className="w-3.5 h-3.5 text-amber-700" />
                          <span>تعديل عرض السعر والدفعات</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuoteStatus(quote, 'مرفوض')}
                          className="bg-white hover:bg-red-50 text-red-700 border border-red-200 px-2.5 py-1.5 rounded-xl text-xs font-bold"
                        >
                          رفض التعديل
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Standard Client Decision Status */}
                  {!isCounterOffer && quote.clientDecision && (
                    <div className="p-2.5 bg-[#FAF7F2] rounded-xl border border-[#E8E2D8] flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-500">قرار العميل:</span>
                      {quote.clientDecision === 'accepted' ? (
                        <span className="font-black text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>تمت موافقة العميل على العرض ({quote.clientDecisionDate || 'معتمد'})</span>
                        </span>
                      ) : quote.clientDecision === 'rejected' ? (
                        <span className="font-black text-red-800 flex items-center gap-1">
                          <X className="w-3.5 h-3.5 text-red-700" />
                          <span>تم رفض العرض من العميل ({quote.clientDecisionDate || 'مؤخراً'})</span>
                        </span>
                      ) : null}
                    </div>
                  )}

                  {/* Action Button: إرسال عرض سعر وملف */}
                  <div className="pt-2 border-t border-[#F0EBE1] flex items-center justify-between gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedQuoteForProposal(quote)}
                      className="bg-[#C5B198] text-[#1C3022] hover:bg-[#b8a287] px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-sm transition-all active:scale-[0.98]"
                    >
                      <FileUp className="w-4 h-4" />
                      <span>{hasProposal ? 'تعديل/إعادة إرسال عرض السعر والدفعات' : 'إرسال عرض سعر وملف'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {(quote.status === 'مرفوض' || quote.clientDecision === 'rejected') && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await ProjectService.deleteQuoteRequest(quote.id);
                              onRefreshQuotes();
                              onRequestToast('تم حذف الطلب المرفوض بنجاح');
                            } catch (err) {
                              console.error(err);
                              onRequestToast('حدث خطأ أثناء حذف الطلب');
                            }
                          }}
                          className="text-xs text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-xl font-black flex items-center gap-1 border border-red-200"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف الطلب المرفوض</span>
                        </button>
                      )}

                      {quote.status !== 'مرفوض' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateQuoteStatus(quote, 'مرفوض')}
                          className="text-xs text-red-600 hover:text-red-800 font-bold px-2 py-1"
                        >
                          رفض الطلب
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SEND QUOTE PROPOSAL MODAL */}
      <AnimatePresence>
        {selectedQuoteForProposal && (
          <SupervisorSendQuoteModal
            quote={selectedQuoteForProposal}
            onClose={() => setSelectedQuoteForProposal(null)}
            onSent={() => {
              setSelectedQuoteForProposal(null);
              onRefreshQuotes();
              onRequestToast('تم إرسال عرض السعر ونظام الدفعات والملف المرفق للعميل بنجاح!');
            }}
          />
        )}
      </AnimatePresence>

      {/* DIGITAL CONTRACT SIGNING MODAL */}
      <AnimatePresence>
        {quoteForContractSigning && (
          <DigitalContractSigningModal
            quote={quoteForContractSigning}
            user={user}
            isSupervisor={true}
            onClose={() => setQuoteForContractSigning(null)}
            onSigned={async (sigData) => {
              await handleSignContractAndCreateProject(quoteForContractSigning, sigData);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// -------------------------------------------------------------
// SEND QUOTE PROPOSAL MODAL WITH INSTALLMENT SYSTEM & FILE ATTACHMENT
// -------------------------------------------------------------
function SupervisorSendQuoteModal({
  quote,
  onClose,
  onSent
}: {
  quote: QuoteRequest;
  onClose: () => void;
  onSent: () => void;
}) {
  const [quoteAmount, setQuoteAmount] = useState(quote.quoteAmount || quote.amount || '0');
  const [adminNote, setAdminNote] = useState(quote.adminNote || 'يسرنا تقديم هذا العرض الهندسي ونظام الدفعات المعتمد من شركة نماذج التميز.');
  const [fileUrl, setFileUrl] = useState<string | null>(quote.fileUrl || null);
  const [fileName, setFileName] = useState<string>(quote.fileName || '');
  const [fileSize, setFileSize] = useState<string>(quote.fileSize || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Installments System State
  const [installments, setInstallments] = useState<Installment[]>(() => {
    if (quote.installments && quote.installments.length > 0) {
      return quote.installments;
    }
    return [];
  });

  const parsedQuoteAmount = parseFloat(quoteAmount.replace(/[^0-9.]/g, '')) || 0;

  // Recalculate installments when quoteAmount changes
  useEffect(() => {
    setInstallments(prev => prev.map(inst => {
      const pct = inst.percentage || 0;
      const calculatedAmount = Math.round((parsedQuoteAmount * pct) / 100);
      return {
        ...inst,
        amountNumber: calculatedAmount,
        amount: `${calculatedAmount.toLocaleString('ar-SA')} ر.س (${pct}%)`
      };
    }));
  }, [quoteAmount, parsedQuoteAmount]);

  // Calculate sum of installments
  const totalInstallmentsSum = installments.reduce((sum, i) => sum + (i.amountNumber || 0), 0);
  const totalPercentagesSum = installments.reduce((sum, i) => sum + (i.percentage || 0), 0);

  const handleAddPresetInstallment = (pct: number) => {
    const calculatedAmount = Math.round((parsedQuoteAmount * pct) / 100);
    const ordinalNames = ['دفعة أولى', 'دفعة ثانية', 'دفعة ثالثة', 'دفعة رابعة', 'دفعة خامسة', 'دفعة سادسة', 'دفعة سابعة', 'دفعة ثامنة'];
    const defaultTitle = ordinalNames[installments.length] || `دفعة رقم ${installments.length + 1}`;

    const newInst: Installment = {
      id: `INST-${Date.now().toString().slice(-4)}`,
      title: defaultTitle,
      amount: `${calculatedAmount.toLocaleString('ar-SA')} ر.س (${pct}%)`,
      amountNumber: calculatedAmount,
      percentage: pct,
      dueDate: new Date(Date.now() + (installments.length + 1) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'pending'
    };
    setInstallments([...installments, newInst]);
  };

  const handleRemoveInstallment = (index: number) => {
    setInstallments(installments.filter((_, i) => i !== index));
  };

  const handleUpdateInstallmentPercentage = (index: number, val: string) => {
    const pct = parseFloat(val) || 0;
    const calculatedAmount = Math.round((parsedQuoteAmount * pct) / 100);
    const updated = [...installments];
    updated[index] = {
      ...updated[index],
      percentage: pct,
      amountNumber: calculatedAmount,
      amount: `${calculatedAmount.toLocaleString('ar-SA')} ر.س (${pct}%)`
    };
    setInstallments(updated);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('حجم الملف كبير جداً. يرجى اختيار ملف بحجم أقل من 15 ميجابايت.');
      return;
    }

    const sizeFormatted = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    setFileName(file.name);
    setFileSize(sizeFormatted);

    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        try {
          const fileKey = `quote-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
          const cachedUrl = await storeFile(fileKey, event.target.result as string);
          setFileUrl(cachedUrl);
        } catch (err) {
          console.error('Error caching quote proposal upload:', err);
          alert('حدث خطأ أثناء معالجة وحفظ الملف.');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteAmount.trim()) {
      alert('يرجى إدخال مبلغ عرض السعر.');
      return;
    }
    if (installments.length === 0) {
      alert('يرجى إضافة دفعة مالية واحدة على الأقل في نظام الدفعات.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedQuote: QuoteRequest = {
        ...quote,
        status: 'تم إرسال العرض',
        quoteAmount: quoteAmount.trim(),
        amount: quoteAmount.trim(),
        adminNote: adminNote.trim(),
        fileUrl: fileUrl || undefined,
        fileName: fileName || undefined,
        fileSize: fileSize || undefined,
        installments: installments,
        clientDecision: 'pending',
        date: new Date().toISOString().split('T')[0]
      };

      await ProjectService.saveQuoteRequest(updatedQuote);
      onSent();
    } catch (err) {
      console.error('Error sending quote:', err);
      alert('حدث خطأ أثناء حفظ وإرسال عرض السعر.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-[#E8E2D8] text-[#1C3022] space-y-6 my-4" dir="rtl">
        {/* Modal Header */}
        <div className="bg-[#1C3022] text-white p-5 rounded-2xl flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors flex items-center gap-1 text-xs font-black">
              <span>← رجوع</span>
            </button>
            <div className="w-10 h-10 rounded-2xl bg-[#C5B198] text-[#1C3022] flex items-center justify-center font-black">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black">إرسال عرض سعر ونظام الدفعات وملف المشروع</h3>
              <p className="text-[10px] text-[#C5B198]">للعميل: {quote.clientName} - {quote.projectName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSend} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Project Summary Box */}
          <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E8E2D8] space-y-1.5">
            <span className="text-[10px] font-black text-[#C5B198]">طلب العميل:</span>
            <h4 className="text-xs font-black text-[#1C3022]">{quote.projectName}</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">{quote.description}</p>
          </div>

          {/* Amount input */}
          <div className="space-y-1">
            <label className="text-xs font-black text-[#1C3022] block">
              إجمالي قيمة العقد وعرض السعر *
            </label>
            <input
              type="text"
              required
              placeholder="مثال: 450,000 ر.س"
              value={quoteAmount}
              onChange={e => setQuoteAmount(e.target.value)}
              className="w-full bg-[#FAF7F2] border border-[#E8E2D8] rounded-2xl px-4 py-3 text-xs font-bold text-[#1C3022] outline-none focus:ring-2 focus:ring-[#C5B198]"
            />
          </div>

          {/* INSTALLMENT SYSTEM BUILDER (نظام الدفعات) */}
          <div className="space-y-3 p-4 bg-[#FAF7F2] rounded-2xl border border-[#E8E2D8]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-[#C5B198]" />
                <h4 className="text-xs font-black text-[#1C3022]">نظام وجدول الدفعات المقترح ({installments.length} دفعات)</h4>
              </div>

            </div>

            {/* Total check bar */}
            <div className="p-2.5 bg-white rounded-xl border border-[#E8E2D8] flex flex-col gap-1 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">مجموع مبالغ الدفعات:</span>
                <span className={`font-black ${
                  Math.abs(totalInstallmentsSum - parsedQuoteAmount) < 100 ? 'text-emerald-800' : 'text-amber-800'
                }`}>
                  {totalInstallmentsSum.toLocaleString('ar-SA')} ر.س / {parsedQuoteAmount.toLocaleString('ar-SA')} ر.س
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-1">
                <span className="text-slate-500 font-bold">إجمالي النسب المئوية:</span>
                <span className={`font-black ${totalPercentagesSum === 100 ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {totalPercentagesSum}% من 100%
                </span>
              </div>
            </div>

            {/* Installments Rows */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {installments.map((inst, idx) => (
                <div
                  key={inst.id || idx}
                  className="p-3 bg-white rounded-xl border border-[#E8E2D8] space-y-2 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="w-5 h-5 rounded-full bg-[#1C3022] text-[#C5B198] text-[10px] font-black flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={inst.title}
                        onChange={e => {
                          const updated = [...installments];
                          updated[idx] = { ...updated[idx], title: e.target.value };
                          setInstallments(updated);
                        }}
                        className="w-full bg-transparent text-xs font-bold text-[#1C3022] outline-none border-b border-transparent focus:border-[#C5B198]"
                        placeholder="عنوان الدفعة..."
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveInstallment(idx)}
                      className="text-red-500 hover:text-red-700 p-1 shrink-0"
                      title="حذف الدفعة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#F0EBE1]">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold block mb-0.5">النسبة المئوية (%):</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={inst.percentage || 0}
                        onChange={e => handleUpdateInstallmentPercentage(idx, e.target.value)}
                        className="w-full bg-[#FAF7F2] border border-[#E8E2D8] rounded-lg px-2 py-1 text-xs font-bold text-[#1C3022] outline-none focus:border-[#C5B198]"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold block mb-0.5">تاريخ الاستحقاق التقريبي:</span>
                      <input
                        type="date"
                        value={inst.dueDate}
                        onChange={e => {
                          const updated = [...installments];
                          updated[idx] = { ...updated[idx], dueDate: e.target.value };
                          setInstallments(updated);
                        }}
                        className="w-full bg-[#FAF7F2] border border-[#E8E2D8] rounded-lg px-2 py-1 text-xs font-bold text-[#1C3022] outline-none focus:border-[#C5B198]"
                      />
                    </div>
                  </div>

                  <div className="pt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                    <span>المبلغ المحتسب:</span>
                    <span className="font-bold text-[#1C3022]">{inst.amount}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Installment Row */}
            <div className="pt-2 border-t border-[#E8E2D8] space-y-2">
              <span className="text-[10px] font-black text-[#1C3022] block">+ اختر النسبة المئوية لإضافة دفعة جديدة (تسمية تلقائية):</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[10, 20, 40, 50].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleAddPresetInstallment(pct)}
                    className="bg-[#FAF7F2] hover:bg-[#1C3022] hover:text-white border border-[#C5B198] text-[#1C3022] py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 shadow-sm group"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#C5B198] group-hover:text-white" />
                    <span>دفعة {pct}%</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* File Picker from Computer */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-[#1C3022] block">
              إرفاق ملف ومستند عرض السعر من الجهاز (PDF / Word / صور) *
            </label>
            
            <div className="border-2 border-dashed border-[#C5B198] bg-[#FAF7F2]/60 hover:bg-[#FAF7F2] rounded-2xl p-4 text-center transition-all relative">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="space-y-1.5 flex flex-col items-center justify-center pointer-events-none">
                <div className="w-10 h-10 rounded-2xl bg-white text-[#1C3022] flex items-center justify-center">
                  <Upload className="w-5 h-5 text-[#C5B198]" />
                </div>
                <div>
                  <p className="text-xs font-black text-[#1C3022]">انقر لاختيار ملف من جهازك أو اسحب الملف هنا</p>
                  <p className="text-[10px] text-slate-400">يدعم ملفات PDF، جداول الكميات، المستندات الرسمية (حتى 15MB)</p>
                </div>
              </div>
            </div>

            {fileName && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-900 text-xs font-black">
                  <FileCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="truncate max-w-[240px]">{fileName}</span>
                  {fileSize && <span className="text-[10px] text-emerald-700">({fileSize})</span>}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFileUrl(null);
                    setFileName('');
                    setFileSize('');
                  }}
                  className="text-red-600 hover:text-red-800 text-[11px] font-black"
                >
                  إلغاء الملف
                </button>
              </div>
            )}
          </div>

          {/* Admin Notes */}
          <div className="space-y-1">
            <label className="text-xs font-black text-[#1C3022] block">
              ملاحظات للمشروع وشروط العرض
            </label>
            <textarea
              rows={2}
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
              placeholder="اكتب أي توضيحات هندسية، مدة صلاحية العرض، أو شروط الدفع..."
              className="w-full bg-[#FAF7F2] border border-[#E8E2D8] rounded-2xl p-3 text-xs font-medium text-[#1C3022] outline-none focus:ring-2 focus:ring-[#C5B198]"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-[#1C3022] text-white hover:bg-[#122116] py-3.5 rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#C5B198]" />
                  <span>جاري الإرسال للعميل...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-[#C5B198]" />
                  <span>إرسال عرض السعر ونظام الدفعات والملف</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-100 text-slate-700 hover:bg-slate-200 py-3.5 px-4 rounded-2xl text-xs font-bold transition-all"
            >
              إلغاء
            </button>
          </div>
        </form>
    </div>
  );
}

// -------------------------------------------------------------
// 2. SUPERVISOR PROJECTS VIEW: "المشاريع" (All Projects & Manage Buttons)
// -------------------------------------------------------------
interface SupervisorProjectsViewProps {
  projects: Project[];
  clients: User[];
  onManageProject: (project: Project) => void;
  onPreviewProject: (project: Project) => void;
  onCreateNewProject: () => void;
  onSignContract?: (project: Project) => void;
  onUpdateProject?: (project: Project) => Promise<void>;
  onRequestToast?: (msg: string) => void;
  selectedClientFilter?: string;
  onClearClientFilter?: () => void;
}

export function SupervisorProjectsView({
  projects,
  clients,
  onManageProject,
  onPreviewProject,
  onCreateNewProject,
  onSignContract,
  onUpdateProject,
  onRequestToast,
  selectedClientFilter,
  onClearClientFilter
}: SupervisorProjectsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [cancellationTargetProject, setCancellationTargetProject] = useState<Project | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isSubmittingCancellation, setIsSubmittingCancellation] = useState(false);

  // Filter projects ONLY by search query and optional client filter (No status filter pills)
  const filteredProjects = projects.filter(p => {
    if (p.isDeleted) return false;
    if (selectedClientFilter && p.clientId !== selectedClientFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const client = clients.find(c => c.id === p.clientId);
      return (
        p.title.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        (client && client.name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const filteredClientObj = selectedClientFilter ? clients.find(c => c.id === selectedClientFilter) : null;

  const handleSupervisorDirectCancelProject = async () => {
    if (!cancellationTargetProject || !cancellationReason.trim() || !onUpdateProject) return;
    setIsSubmittingCancellation(true);
    try {
      const updatedProject: Project = {
        ...cancellationTargetProject,
        status: 'ملغي',
        deletedReason: cancellationReason.trim(),
        deletedAt: new Date().toISOString(),
        cancellationRequest: {
          id: `CAN-${Date.now().toString().slice(-4)}`,
          requestedBy: 'supervisor',
          reason: cancellationReason.trim(),
          requestDate: new Date().toLocaleDateString('ar-SA'),
          status: 'approved',
          decisionDate: new Date().toLocaleDateString('ar-SA')
        }
      };
      await onUpdateProject(updatedProject);
      if (onRequestToast) onRequestToast('تم إلغاء المشروع مباشرة وإرسال إشعار للعميل بسبب الإلغاء.');
      setCancellationTargetProject(null);
      setCancellationReason('');
    } catch (err) {
      console.error(err);
      if (onRequestToast) onRequestToast('حدث خطأ أثناء إلغاء المشروع');
    } finally {
      setIsSubmittingCancellation(false);
    }
  };

  const handleRespondToClientCancellation = async (project: Project, decision: 'accept' | 'reject') => {
    if (!onUpdateProject || !project.cancellationRequest) return;
    try {
      if (decision === 'accept') {
        const updated: Project = {
          ...project,
          status: 'ملغي',
          cancellationRequest: {
            ...project.cancellationRequest,
            status: 'approved',
            decisionDate: new Date().toLocaleDateString('ar-SA')
          }
        };
        await onUpdateProject(updated);
        if (onRequestToast) onRequestToast('تمت الموافقة على طلب إلغاء المشروع وتغيير حالته إلى «ملغي».');
      } else {
        const updated: Project = {
          ...project,
          cancellationRequest: {
            ...project.cancellationRequest,
            status: 'rejected',
            decisionDate: new Date().toLocaleDateString('ar-SA')
          }
        };
        await onUpdateProject(updated);
        if (onRequestToast) onRequestToast('تم رفض طلب إلغاء المشروع من العميل.');
      }
    } catch (err) {
      console.error(err);
      if (onRequestToast) onRequestToast('حدث خطأ أثناء تحديث حالة الإلغاء');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Add Project Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-[#1C3022]">إدارة المشاريع</h3>
        <button
          onClick={onCreateNewProject}
          className="bg-[#1C3022] text-white px-3.5 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 hover:bg-[#122116] shadow-sm active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5 text-[#C5B198]" />
          <span>إضافة مشروع</span>
        </button>
      </div>

      {/* Active Client Filter Banner */}
      {filteredClientObj && (
        <div className="bg-white p-3 rounded-2xl border border-[#C5B198]/50 flex items-center justify-between text-xs font-bold text-[#1C3022]">
          <span>تصفية حسب العميل: {filteredClientObj.name}</span>
          <button
            onClick={onClearClientFilter}
            className="text-[11px] text-red-700 underline font-black"
          >
            عرض كافة المشاريع
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
        <input
          type="text"
          placeholder="بحث باسم المشروع، الموقع أو العميل..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-[#E8E2D8] rounded-2xl pr-10 pl-4 py-3 text-xs font-bold text-[#1C3022] outline-none shadow-sm focus:ring-2 focus:ring-[#C5B198]"
        />
      </div>

      {/* Projects List - Compact Design */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-[#E8E2D8] space-y-3">
          <HardHat className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="font-black text-sm text-[#1C3022]">لا توجد مشاريع مسجلة</h4>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredProjects.map(project => {
            const client = clients.find(c => c.id === project.clientId);

            return (
              <div
                key={project.id}
                className="bg-white rounded-2xl p-3.5 sm:p-4 border border-[#E8E2D8] shadow-sm hover:border-[#C5B198] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#1C3022] text-[#C5B198] flex items-center justify-center shrink-0 font-black">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-[#1C3022] truncate">{project.title}</h4>
                    <span className="text-xs text-slate-500 font-bold block mt-0.5 truncate">
                      العميل: {client?.name || 'عميل مسجل'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => onManageProject(project)}
                    className="bg-[#FAF7F2] hover:bg-[#EFE7DC] text-[#1C3022] border border-[#E8E2D8] px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                  >
                    <Sliders className="w-3.5 h-3.5 text-[#C5B198]" />
                    <span>تعديل المشروع</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onPreviewProject(project)}
                    className="bg-[#1C3022] hover:bg-[#122116] text-white px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#C5B198]" />
                    <span>عرض المشروع</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SUPERVISOR CANCELLATION MODAL */}
      {cancellationTargetProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" dir="rtl">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 border border-red-200 shadow-2xl"
          >
            <div className="flex items-center gap-2 text-red-900 pb-2 border-b border-slate-100 font-black text-sm">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <span>طلب إلغاء المشروع: {cancellationTargetProject.title}</span>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              سيتم إلغاء المشروع نهائياً مع إرسال رسالة توضيحية للعميل بسبب الإلغاء.
            </p>
            <div>
              <label className="block text-[11px] font-black text-[#1C3022] mb-1">سبب إلغاء المشروع *</label>
              <textarea
                rows={3}
                required
                value={cancellationReason}
                onChange={e => setCancellationReason(e.target.value)}
                placeholder="اكتب سبب إلغاء المشروع بالتفصيل..."
                className="w-full bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl p-3 text-xs font-medium outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmittingCancellation || !cancellationReason.trim()}
                onClick={handleSupervisorDirectCancelProject}
                className="flex-1 bg-red-700 hover:bg-red-800 text-white py-2.5 rounded-xl text-xs font-black transition-all disabled:opacity-50 shadow-sm"
              >
                {isSubmittingCancellation ? 'جاري الإلغاء...' : 'تأكيد وإلغاء المشروع'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCancellationTargetProject(null);
                  setCancellationReason('');
                }}
                className="px-4 bg-slate-100 text-slate-700 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
              >
                تراجع
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 3. SUPERVISOR PAYMENTS VIEW: "الدفعات" (Financial Overview, Bank Verification & 7-Day Overdue Reminders)
// -------------------------------------------------------------
interface SupervisorPaymentsViewProps {
  projects: Project[];
  clients: User[];
  onManageProject: (project: Project) => void;
  onUpdateProject?: (project: Project) => Promise<void>;
  onRequestToast: (msg: string) => void;
}

export function SupervisorPaymentsView({
  projects,
  clients,
  onManageProject,
  onUpdateProject,
  onRequestToast
}: SupervisorPaymentsViewProps) {
  const [selectedReminderTarget, setSelectedReminderTarget] = useState<{
    project: Project;
    installment: Installment;
    client?: User;
  } | null>(null);

  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  const allInstallments = projects.flatMap(p => 
    (p.installments || []).map(inst => ({
      project: p,
      installment: inst,
      client: clients.find(c => c.id === p.clientId)
    }))
  );

  const totalFinancial = allInstallments.reduce((sum, item) => sum + (item.installment.amountNumber || 0), 0);
  const paidFinancial = allInstallments.filter(item => item.installment.status === 'paid').reduce((sum, item) => sum + (item.installment.amountNumber || 0), 0);
  const pendingFinancial = totalFinancial - paidFinancial;
  const overdue7DaysList = allInstallments.filter(item => getInstallmentOverdueStatus(item.installment).isOverdue7Days);
  const underReviewList = allInstallments.filter(item => item.installment.status === 'under_review' || (item.installment.paymentMethod === 'تحويل بنكي' && item.installment.status !== 'paid'));

  const handleConfirmPayment = async (project: Project, installment: Installment) => {
    if (!onUpdateProject) return;
    const updatedInstallments = (project.installments || []).map(i => {
      if (i.id === installment.id) {
        return {
          ...i,
          status: 'paid' as const,
          paymentDate: new Date().toISOString().split('T')[0],
          supervisorPaymentConfirmed: true,
          transactionRef: i.transactionRef || i.transferRef || `TXN-IBAN-${Date.now().toString().slice(-6)}`
        };
      }
      return i;
    });

    try {
      await onUpdateProject({ ...project, installments: updatedInstallments });
      onRequestToast(`تم اعتماد سداد دفعة (${installment.title}) وتوثيقها كمسددة بنجاح!`);
    } catch (err) {
      console.error(err);
      onRequestToast('حدث خطأ أثناء اعتماد السداد');
    }
  };

  const handleRejectOrUnmarkPayment = async (project: Project, installment: Installment) => {
    if (!onUpdateProject) return;
    const updatedInstallments = (project.installments || []).map(i => {
      if (i.id === installment.id) {
        return {
          ...i,
          status: 'pending' as const,
          paymentDate: undefined,
          supervisorPaymentConfirmed: false
        };
      }
      return i;
    });

    try {
      await onUpdateProject({ ...project, installments: updatedInstallments });
      onRequestToast(`تم تعيين حالة دفعة (${installment.title}) كـ «لم يتم السداد».`);
    } catch (err) {
      console.error(err);
      onRequestToast('حدث خطأ أثناء تعديل حالة الدفعة');
    }
  };

  const handleSendReminder = (item: { project: Project; installment: Installment; client?: User }) => {
    const overdue = getInstallmentOverdueStatus(item.installment);
    const clientName = item.client?.name || 'العميل الكريم';
    const message = `السلام عليكم ورحمة الله وبركاته، ${clientName}، نود تذكيركم بسداد دفعة (${item.installment.title}) بمبلغ ${item.installment.amount} لمشروع (${item.project.title}) لدى شركة نماذج التميز، المستحقة في ${item.installment.dueDate} (تأخرت منذ ${overdue.daysOverdue} يوم). نرجو التكرم بالسداد عبر التطبيق لتجنب تعليق أعمال التنفيذ. شاكرين تعاونكم.`;

    if (item.client?.phone) {
      const cleanPhone = item.client.phone.replace(/\D/g, '');
      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');
    } else {
      navigator.clipboard?.writeText(message);
    }

    onRequestToast(`تم إرسال تنبيه عدم السداد للعميل (${clientName}) بنجاح!`);
    setSelectedReminderTarget(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-black text-[#1C3022]">الدفعات والتحصيل</h3>
        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-[#1C3022] border border-[#E8E2D8]">
          <Wallet className="w-4 h-4 text-[#C5B198]" />
        </div>
      </div>

      {/* Installments List */}
      <div className="space-y-2.5">
        {allInstallments.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-[#E8E2D8] text-xs text-slate-400 font-bold">
            لا توجد دفعات مسجلة
          </div>
        ) : (
          allInstallments.map((item, idx) => {
            const isPaid = item.installment.status === 'paid';

            return (
              <div
                key={item.installment.id || idx}
                className="bg-white p-4 rounded-2xl border border-[#E8E2D8] shadow-sm flex items-center justify-between gap-3 transition-all hover:border-[#C5B198]"
              >
                {/* Project Info & Amount */}
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-[#1C3022] truncate">
                    {item.project.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                    <span className="text-slate-500 font-bold">{item.installment.title}</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-black text-[#1C3022]">{item.installment.amount}</span>
                  </div>
                </div>

                {/* Actions: Checkmark Toggle + Reminder Alert Icon */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Reminder alert icon button - icon only */}
                  <button
                    type="button"
                    onClick={() => handleSendReminder(item)}
                    className="w-9 h-9 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 flex items-center justify-center transition-all shadow-sm active:scale-95"
                    title="إرسال تنبيه سداد"
                  >
                    <BellRing className="w-4 h-4 text-amber-700" />
                  </button>

                  {/* Paid Toggle Checkmark Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isPaid) {
                        handleRejectOrUnmarkPayment(item.project, item.installment);
                      } else {
                        handleConfirmPayment(item.project, item.installment);
                      }
                    }}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-sm active:scale-95 ${
                      isPaid
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-[#FAF7F2] hover:bg-emerald-50 text-slate-400 hover:text-emerald-700 border border-[#E8E2D8]'
                    }`}
                    title={isPaid ? 'تم سداد الدفعة (انقر للتغيير)' : 'تحديد كـ تم السداد'}
                  >
                    <Check className={`w-5 h-5 ${isPaid ? 'stroke-[2.5]' : 'stroke-2'}`} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {previewReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" dir="rtl">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h4 className="text-xs font-black text-[#1C3022]">صورة إشعار التحويل البنكي المرفق</h4>
              <button onClick={() => setPreviewReceiptUrl(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[65vh] overflow-auto rounded-2xl border border-slate-200 flex items-center justify-center bg-slate-50">
              <img src={previewReceiptUrl} alt="إشعار التحويل" className="max-w-full h-auto object-contain rounded-xl" />
            </div>
            <button
              onClick={() => setPreviewReceiptUrl(null)}
              className="w-full bg-[#1C3022] text-white py-3 rounded-xl text-xs font-black"
            >
              إغلاق المعاينة
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
