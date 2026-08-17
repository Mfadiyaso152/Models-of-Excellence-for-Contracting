export type ProjectStatus = 'قيد الانتظار' | 'بانتظار العقد' | 'بانتظار توقيع العميل' | 'بانتظار السداد' | 'قيد التنفيذ' | 'مكتمل' | 'ملغي';
export type QuoteStatus = 'طلب جديد' | 'تم إرسال العرض' | 'مقبول' | 'مرفوض' | 'بانتظار مراجعة التعديل' | 'تم اعتماد المشروع' | 'تم توقيع العقد';

export interface Installment {
  id: string;
  title: string;
  amount: string;
  amountNumber: number;
  percentage?: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'under_review';
  clientApprovalStatus?: 'approved' | 'rejected' | 'pending';
  clientApprovalDate?: string;
  paymentDate?: string;
  transactionRef?: string;
  paymentMethod?: 'تحويل بنكي';
  lastReminderSentDate?: string;
  reminderCount?: number;
  transferReceiptUrl?: string;
  transferSenderName?: string;
  transferBankName?: string;
  transferDate?: string;
  transferRef?: string;
  transferNote?: string;
  supervisorPaymentConfirmed?: boolean;
  supervisorRejectionReason?: string;
}

export function getInstallmentOverdueStatus(installment: Installment): {
  isOverdue: boolean;
  isOverdue7Days: boolean;
  daysOverdue: number;
  daysLeft: number;
} {
  if (installment.status === 'paid' || !installment.dueDate) {
    return { isOverdue: false, isOverdue7Days: false, daysOverdue: 0, daysLeft: 999 };
  }

  const due = new Date(installment.dueDate);
  if (isNaN(due.getTime())) {
    return { isOverdue: false, isOverdue7Days: false, daysOverdue: 0, daysLeft: 999 };
  }

  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return {
      isOverdue: true,
      isOverdue7Days: diffDays >= 7,
      daysOverdue: diffDays,
      daysLeft: 0
    };
  } else {
    return {
      isOverdue: false,
      isOverdue7Days: false,
      daysOverdue: 0,
      daysLeft: Math.abs(diffDays)
    };
  }
}

export interface ConstructionPhase {
  id: string;
  title: string;
  progress: number;
  status: 'مكتمل' | 'جاري العمل' | 'قيد الانتظار';
  startDate?: string;
  endDate?: string;
}

export interface EngineerRequest {
  id: string;
  type: 'طلب معاينة موقعية' | 'طلب تعديل مادة/تشطيب' | 'استفسار فني هندسي' | 'طلب فحص صب الخرسانة' | 'أخرى';
  details: string;
  date: string;
  status: 'تم الاستلام' | 'قيد المراجعة الفنية' | 'تمت الموافقة والرد' | 'مرفوض';
  engineerReply?: string;
  engineerName: string;
}

export interface ProjectDocument {
  id: string;
  name: string;
  category: 'عقد معتمد' | 'سند قبض' | 'رخصة بناء' | 'مخطط معتمد' | 'مستند رسمي' | 'أوراق رسمية' | 'أخرى';
  fileUrl: string;
  fileName: string;
  fileSize?: string;
  uploadedAt: string;
  uploadedBy: string;
  requiresSignature?: boolean;
  clientSigned?: boolean;
  clientSignature?: string;
  clientSignDate?: string;
  supervisorSigned?: boolean;
  supervisorSignature?: string;
  supervisorSignDate?: string;
}

export interface ProjectContract {
  id: string;
  title: string;
  contractNumber: string;
  signDate: string;
  totalValue: string;
  status: 'مسودة' | 'بانتظار توقيع المشرف' | 'بانتظار توقيع العميل' | 'ساري وموثق' | 'ملغي' | 'مرفوض';
  pdfUrl?: string;
  termsSummary: string[];
  supervisorSignature?: string;
  supervisorSignedDate?: string;
  supervisorSignerName?: string;
  clientSignature?: string;
  clientSignedDate?: string;
  clientSignerName?: string;
  clientNationalId?: string;
  isCertified?: boolean;
  certifiedAt?: string;
}

export interface ProjectCancellationRequest {
  id: string;
  requestedBy: 'supervisor' | 'client';
  requestedByName?: string;
  reason: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected';
  responseDate?: string;
  responseNote?: string;
  decisionDate?: string;
}

export interface Project {
  id: string;
  clientId: string;
  title: string;
  location: string;
  progress: number;
  status: ProjectStatus;
  licenseNumber: string;
  landArea?: string;
  builtUpArea?: string;
  supervisingEngineer?: {
    name: string;
    phone: string;
    title: string;
  };
  phases: ConstructionPhase[];
  contracts: ProjectContract[];
  documents?: ProjectDocument[];
  engineerRequests: EngineerRequest[];
  images: {
    before: string[];
    progress50: string[];
    after: string[];
    plans: string[];
    officialPapers: string[];
  };
  startDate: string;
  estimatedEndDate: string;
  installments: Installment[];
  contractUrl?: string;
  quoteUrl?: string;
  quoteRequestId?: string;
  isCertified?: boolean;
  cancellationRequest?: ProjectCancellationRequest;
  isDeleted?: boolean;
  deletedReason?: string;
  deletedAt?: string;
  deletedBy?: string;
  feedback?: {
    rating: number;
    comment: string;
  };
}

export interface SupportMessage {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  senderRole: 'client' | 'support';
  senderName: string;
  message: string;
  timestamp: string;
}

export interface QuoteRequest {
  id: string;
  clientId: string;
  clientName: string;
  projectName: string;
  description: string;
  status: QuoteStatus;
  amount?: string;
  quoteAmount?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  documents?: ProjectDocument[];
  validUntil?: string;
  clientDecision?: 'accepted' | 'rejected' | 'accepted_with_modifications' | 'pending';
  clientModificationNote?: string;
  clientRejectionReason?: string;
  clientDecisionDate?: string;
  date: string;
  adminNote?: string;
  installments?: Installment[];
  contractUrl?: string;
  contractSigned?: boolean;
  contractSignDate?: string;
  contractSignerName?: string;
  contractSignature?: string;
  supervisorSignature?: string;
  supervisorSignedDate?: string;
  supervisorSignerName?: string;
  projectId?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  phone?: string;
  birthDate?: string;
  termsAccepted?: boolean;
  role: 'admin' | 'client' | 'supervisor';
  company?: string;
  createdAt?: string;
  isDeleted?: boolean;
  deletedReason?: string;
  deletedAt?: string;
  deletedBy?: string;
}
