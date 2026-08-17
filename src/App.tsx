/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  HardHat, 
  FileText, 
  User as UserIcon, 
  LogOut, 
  Bell, 
  MapPin, 
  Calendar, 
  ChevronRight, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  X, 
  Download, 
  Check, 
  CreditCard, 
  Wallet, 
  Smartphone, 
  Phone, 
  ShieldCheck, 
  ChevronLeft, 
  Building2, 
  CalendarDays, 
  Sparkles, 
  Info,
  Sliders,
  Send,
  Trash2,
  Lock,
  ArrowRight,
  MessageSquare,
  Loader2,
  RefreshCw,
  Mail,
  AlertTriangle,
  BellRing,
  FileCheck,
  FileUp,
  XCircle,
  Headphones,
  UploadCloud
} from 'lucide-react';

// Types and Components
import { Project, QuoteRequest, User, Installment, getInstallmentOverdueStatus, ProjectDocument } from './types';
import { Logo } from './components/Logo';
import { ProjectCustomizationModal } from './components/ProjectCustomizationModal';
import { PaymentGatewayModal } from './components/PaymentGatewayModal';
import { DeleteAccountModal } from './components/DeleteAccountModal';
import { AdminProjectManagerModal } from './components/AdminProjectManagerModal';
import { CreateProjectModal } from './components/CreateProjectModal';
import { SupervisorClientsView, SupervisorProjectsView, SupervisorPaymentsView } from './components/SupervisorViews';
import { ClientsDirectoryModal } from './components/ClientsDirectoryModal';
import { CustomerSupportModal } from './components/CustomerSupportModal';
import { UserService, ProjectService } from './services/dbService';
import { CompletePhoneModal } from './components/CompletePhoneModal';
import { downloadFile } from './utils/fileDownloader';
import { storeFile } from './utils/fileCache';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  db,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc
} from './firebase';
import { Users } from 'lucide-react';

const SUPERVISOR_EMAIL = 'mfb.15.f@gmail.com';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'projects' | 'payments' | 'profile'>('home');
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  
  // Modals state
  const [customizingProject, setCustomizingProject] = useState<Project | null>(null);
  const [adminManagingProject, setAdminManagingProject] = useState<Project | null>(null);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [createProjectForClientId, setCreateProjectForClientId] = useState<string | undefined>(undefined);
  const [selectedClientFilter, setSelectedClientFilter] = useState<string | undefined>(undefined);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<{ installment: Installment, project: Project } | null>(null);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState<string | null>(null);

  const SUPPORT_EMAIL = 'mfb.15.srt@gmail.com';
  const isSupportAgent = false;
  const isSupervisor = user?.email?.trim().toLowerCase() === SUPERVISOR_EMAIL.toLowerCase() || 
                        user?.email?.trim().toLowerCase() === SUPPORT_EMAIL.toLowerCase() || 
                        user?.role === 'admin';

  const triggerToast = (msg: string) => {
    setShowSuccessToast(msg);
    setTimeout(() => setShowSuccessToast(null), 4000);
  };

  // Listen to Firebase Auth state with fast responsiveness
  useEffect(() => {
    let isMounted = true;

    // Fast safety fallback: Finish auth checking quickly so no endless screen
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        setIsAuthChecking(false);
      }
    }, 800);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;

      if (firebaseUser) {
        try {
          const isSuper = firebaseUser.email?.trim().toLowerCase() === SUPERVISOR_EMAIL.toLowerCase();

          // Fetch user profile from Firestore or initialize
          let existingProfile = await Promise.race([
            UserService.getUserById(firebaseUser.uid),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500))
          ]);

          if (!existingProfile && firebaseUser.email) {
            existingProfile = await Promise.race([
              UserService.getUserByEmail(firebaseUser.email),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000))
            ]);
          }

          if (existingProfile) {
            if (isSuper && existingProfile.role !== 'admin') {
              existingProfile.role = 'admin';
              UserService.saveUser(existingProfile).catch(console.warn);
            }
            if (isMounted) setUser(existingProfile);
          } else {
            const newProfile: User = {
              id: firebaseUser.uid,
              name: isSuper ? (firebaseUser.displayName || 'م. فهد (المشرف العام)') : (firebaseUser.displayName || 'عميل نماذج التميز'),
              email: firebaseUser.email || '',
              termsAccepted: true,
              role: isSuper ? 'admin' : 'client',
              createdAt: new Date().toISOString(),
              ...(firebaseUser.photoURL ? { photoURL: firebaseUser.photoURL } : {}),
              ...(firebaseUser.phoneNumber ? { phone: firebaseUser.phoneNumber } : {})
            };
            UserService.saveUser(newProfile).catch(console.warn);
            if (isMounted) setUser(newProfile);
          }
        } catch (err) {
          console.error('Error fetching/creating user on auth state change:', err);
        }
      } else {
        if (isMounted) setUser(null);
      }

      if (isMounted) {
        clearTimeout(timeoutId);
        setIsAuthChecking(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  // Real-time synchronization across devices (Client & Supervisor)
  useEffect(() => {
    if (!user) {
      setProjects([]);
      setClients([]);
      setQuotes([]);
      setSelectedProject(null);
      return;
    }

    const isSuper = user.email?.trim().toLowerCase() === SUPERVISOR_EMAIL.toLowerCase() || user.role === 'admin';
    const unsubscribers: (() => void)[] = [];

    if (isSuper) {
      // 1. Supervisor Real-Time Projects Listener
      const unSubProjs = onSnapshot(collection(db, 'projects'), (snapshot) => {
        const projs: Project[] = [];
        snapshot.forEach((docSnap) => projs.push(docSnap.data() as Project));
        setProjects(projs);
        // Keep active selection in sync immediately
        setSelectedProject((curr) => curr ? projs.find(p => p.id === curr.id) || null : null);
        setAdminManagingProject((curr) => curr ? projs.find(p => p.id === curr.id) || null : null);
        setIsLoadingProjects(false);
      }, (err) => {
        console.warn('Real-time projects error:', err);
        setIsLoadingProjects(false);
      });
      unsubscribers.push(unSubProjs);

      // 2. Supervisor Real-Time Users/Clients Listener
      const unSubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        const userList: User[] = [];
        snapshot.forEach((docSnap) => userList.push(docSnap.data() as User));
        setClients(userList);
      }, (err) => {
        console.warn('Real-time users error:', err);
      });
      unsubscribers.push(unSubUsers);

      // 3. Supervisor Real-Time Quotes Listener
      const unSubQuotes = onSnapshot(collection(db, 'quotes'), (snapshot) => {
        const quoteList: QuoteRequest[] = [];
        snapshot.forEach((docSnap) => quoteList.push(docSnap.data() as QuoteRequest));
        setQuotes(quoteList);
      }, (err) => {
        console.warn('Real-time quotes error:', err);
      });
      unsubscribers.push(unSubQuotes);

    } else {
      // 1. Client Real-Time Projects Listener (Filtered to user's projects)
      const qProjects = query(collection(db, 'projects'), where('clientId', '==', user.id));
      const unSubProjs = onSnapshot(qProjects, (snapshot) => {
        const projs: Project[] = [];
        snapshot.forEach((docSnap) => projs.push(docSnap.data() as Project));
        setProjects(projs);
        setSelectedProject((curr) => curr ? projs.find(p => p.id === curr.id) || null : null);
        setIsLoadingProjects(false);
      }, (err) => {
        console.warn('Real-time client projects error:', err);
        setIsLoadingProjects(false);
      });
      unsubscribers.push(unSubProjs);

      // 2. Client Real-Time Quotes Listener
      const qQuotes = query(collection(db, 'quotes'), where('clientId', '==', user.id));
      const unSubQuotes = onSnapshot(qQuotes, (snapshot) => {
        const quoteList: QuoteRequest[] = [];
        snapshot.forEach((docSnap) => quoteList.push(docSnap.data() as QuoteRequest));
        setQuotes(quoteList);
      }, (err) => {
        console.warn('Real-time client quotes error:', err);
      });
      unsubscribers.push(unSubQuotes);
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [user?.id, user?.role, user?.email]);

  // Global user presence tracker
  useEffect(() => {
    if (user?.id) {
      const docRef = doc(db, 'user_presence', user.id);
      setDoc(docRef, {
        userId: user.id,
        status: 'online',
        name: user.name,
        lastActive: new Date().toISOString()
      }).catch(err => console.error('Error setting global online status:', err));

      const handleBeforeUnload = () => {
        setDoc(docRef, {
          userId: user.id,
          status: 'offline',
          name: user.name,
          lastActive: new Date().toISOString()
        }).catch(err => console.error('Error setting global offline status on unload:', err));
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        setDoc(docRef, {
          userId: user.id,
          status: 'offline',
          name: user.name,
          lastActive: new Date().toISOString()
        }).catch(err => console.error('Error setting global offline status on cleanup:', err));
      };
    }
  }, [user?.id, user?.name]);

  // Fallback explicit load data helper
  const loadData = async (currentUser: User) => {
    try {
      const isSuper = currentUser.email?.trim().toLowerCase() === SUPERVISOR_EMAIL.toLowerCase() || currentUser.role === 'admin';
      if (isSuper) {
        const [allProjs, allUsers, allQuotes] = await Promise.all([
          ProjectService.getAllProjects(),
          UserService.getAllUsers(),
          ProjectService.getAllQuotes()
        ]);
        setProjects(allProjs);
        setClients(allUsers);
        setQuotes(allQuotes);
      } else {
        const [userProjs, userQuotes] = await Promise.all([
          ProjectService.getProjectsForUser(currentUser.id),
          ProjectService.getQuotesForUser(currentUser.id)
        ]);
        setProjects(userProjs);
        setQuotes(userQuotes);
      }
    } catch (err) {
      console.error('Error fetching data manually:', err);
    }
  };

  const handleLogout = async () => {
    try {
      if (user?.id) {
        await setDoc(doc(db, 'user_presence', user.id), {
          userId: user.id,
          status: 'offline',
          name: user.name,
          lastActive: new Date().toISOString()
        });
      }
      await signOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    }
    setUser(null);
    setSelectedProject(null);
    setCustomizingProject(null);
    setAdminManagingProject(null);
    setProjects([]);
    setClients([]);
    setQuotes([]);
    setActiveTab('home');
    triggerToast('تم تسجيل الخروج بنجاح');
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (isSupervisor) {
      triggerToast('حساب المشرف العام محمي ولا يمكن حذفه.');
      setShowDeleteAccountModal(false);
      return;
    }
    try {
      await UserService.deleteUser(user.id);
      await signOut(auth);
      setUser(null);
      setShowDeleteAccountModal(false);
      setSelectedProject(null);
      setCustomizingProject(null);
      setAdminManagingProject(null);
      setProjects([]);
      triggerToast('تم حذف الحساب والبيانات التابعة له بنجاح من قاعدة البيانات.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteClientBySupervisor = async (clientId: string, reason: string) => {
    try {
      await UserService.deleteUser(clientId);
      // Remove from client state immediately
      setClients(prev => prev.filter(c => c.id !== clientId));
      setProjects(prev => prev.filter(p => p.clientId !== clientId));
      setQuotes(prev => prev.filter(q => q.clientId !== clientId));
      triggerToast('تم حذف حساب العميل وبياناته بنجاح من قاعدة البيانات.');
    } catch (err) {
      console.error('Error deleting client by supervisor:', err);
      triggerToast('حدث خطأ أثناء محاولة حذف العميل.');
      throw err;
    }
  };

  const handleUpdateProject = async (updated: Project) => {
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
    if (selectedProject?.id === updated.id) {
      setSelectedProject(updated);
    }
    if (customizingProject?.id === updated.id) {
      setCustomizingProject(updated);
    }
    if (adminManagingProject?.id === updated.id) {
      setAdminManagingProject(updated);
    }
    // Sync to Firestore
    await ProjectService.saveProject(updated);
  };

  const handlePaymentSuccess = async (updatedProject: Project, receiptRef: string, method: string) => {
    await handleUpdateProject(updatedProject);
    triggerToast(`تم سداد الدفعة بنجاح عبر ${method} (رقم السند: ${receiptRef})`);
  };

  // Loading screen during initial Firebase auth session check
  if (isAuthChecking) {
    return (
      <div className="min-h-screen w-full bg-[#1C3022] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden font-sans" dir="rtl">
        {/* Ambient background glows */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#C5B198]/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#284430] rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center max-w-md mx-auto">
          <div className="w-24 h-24 flex items-center justify-center mb-5 animate-pulse rounded-3xl overflow-hidden shadow-2xl">
            <Logo size="lg" showText={false} />
          </div>
          <h2 className="text-xl font-black text-[#1C3022] mb-2 tracking-wide">نماذج التميز للمقاولات</h2>
          <div className="flex items-center gap-2.5 text-[#C5B198] text-xs font-bold bg-[#284430]/80 px-4 py-2 rounded-xl border border-[#3b6147]/60 mb-6">
            <Loader2 className="w-4 h-4 animate-spin text-[#C5B198]" />
            <span>جاري التحقق من الجلسة والاتصال السحابي الآمن...</span>
          </div>
          <p className="text-[11px] text-[#EFE7DC]/60">نظام إدارة المشاريع الإنشائية المعتمد</p>
        </div>
      </div>
    );
  }

  // If not logged in, show AuthFlow with Google Sign-In & Firestore
  if (!user) {
    return (
      <AuthFlow 
        onAuthenticated={async (authenticatedUser) => {
          await UserService.saveUser(authenticatedUser);
          setUser(authenticatedUser);
          triggerToast(`أهلاً بك، ${authenticatedUser.name.split(' ')[0]}`);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col text-[#1C3022] w-full max-w-4xl mx-auto shadow-2xl relative font-sans" dir="rtl">
      {/* Toast Notification */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div 
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-4 left-4 right-4 max-w-sm mx-auto z-50 bg-[#1C3022] text-white px-4 py-3.5 rounded-2xl shadow-xl border border-[#C5B198]/40 flex items-center gap-3 text-sm font-bold"
          >
            <div className="w-8 h-8 rounded-full bg-[#C5B198] text-[#1C3022] flex items-center justify-center shrink-0">
              <Check className="w-5 h-5 stroke-[3]" />
            </div>
            <span className="flex-1 text-xs leading-relaxed">{showSuccessToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Brand Header - Cylindrical Pill Design (Fixed at Top) */}
      <div className="sticky top-0 z-40 px-3 sm:px-4 pt-2.5 pb-1 bg-gradient-to-b from-[#FAF7F2] via-[#FAF7F2]/90 to-transparent backdrop-blur-[2px] transition-all duration-300">
        <motion.header 
          whileTap={{ scale: 0.98, y: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="bg-[#1C3022] text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-full border border-[#284430] shadow-xl shadow-black/10 backdrop-blur-md cursor-pointer select-none"
        >
          <div className="flex items-center justify-between">
            {/* Institution Corner Logo & Brand Name */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center justify-center cursor-pointer select-none shrink-0"
                title="مؤسسة نماذج التميز"
                onClick={() => {
                  setSelectedProject(null);
                  setActiveTab('home');
                }}
              >
                <Logo size="sm" showText={false} showFrame={false} />
              </motion.div>
              <div
                onClick={() => {
                  setSelectedProject(null);
                  setActiveTab('home');
                }}
              >
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-black tracking-wide text-white">نماذج التميز</h1>
                  <span className="inline-flex items-center justify-center h-5 px-2 bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-black rounded-full leading-none shadow-xs">
                    BETA
                  </span>
                  {isSupervisor && (
                    <span className="inline-flex items-center justify-center h-5 px-2 bg-[#C5B198] text-[#1C3022] text-[10px] font-black rounded-full leading-none shadow-xs">
                      مشرف
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSupportModal(true);
                }}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#C5B198] text-[#1C3022] flex items-center justify-center shadow-sm hover:bg-[#b5a188] active:scale-95 transition-all"
                title="خدمة العملاء"
                aria-label="خدمة العملاء"
              >
                <Headphones className="w-4 h-4 sm:w-5 sm:h-5 text-[#1C3022]" />
              </motion.button>
            </div>
          </div>
        </motion.header>
      </div>

      {/* Main Tab Views */}
      <main className="flex-1 pb-28">
        {isLoadingProjects ? (
          <div className="py-24 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#1C3022] mx-auto" />
            <p className="text-xs font-black text-slate-500">جاري تحميل البيانات من السيرفر...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {selectedProject ? (
              <div key="detail">
                <ProjectDetailView 
                  project={selectedProject} 
                  onBack={() => setSelectedProject(null)} 
                  onOpenCustomization={() => {
                    if (isSupervisor) {
                      setAdminManagingProject(selectedProject);
                    } else {
                      setCustomizingProject(selectedProject);
                    }
                  }}
                  onPayInstallment={(p, i) => setShowPaymentModal({ project: p, installment: i })}
                  onUpdateProject={handleUpdateProject}
                  onRequestToast={triggerToast}
                />
              </div>
            ) : (
              <motion.div
                key={`${activeTab}-${isSupervisor ? 'super' : 'client'}`}
                initial={{ opacity: 0, y: 8, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.995 }}
                transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
                className="p-5 space-y-6"
              >
                {/* 1. HOME TAB (العملاء for Supervisor / الرئيسية for Client) */}
                {activeTab === 'home' && (
                  isSupervisor ? (
                    <SupervisorClientsView
                      user={user}
                      clients={clients}
                      projects={projects}
                      quotes={quotes}
                      onSelectClientForProjects={(clientId) => {
                        setSelectedClientFilter(clientId);
                        setActiveTab('projects');
                      }}
                      onCreateProjectForClient={(clientId) => {
                        setCreateProjectForClientId(clientId);
                        setShowCreateProjectModal(true);
                      }}
                      onRefreshQuotes={() => user && loadData(user)}
                      onDeleteClient={handleDeleteClientBySupervisor}
                      onRequestToast={triggerToast}
                    />
                  ) : (
                    <HomeView 
                      user={user} 
                      projects={projects} 
                      quotes={quotes}
                      onDecisionQuote={async (quote, decision) => {
                        try {
                          const updated: QuoteRequest = {
                            ...quote,
                            status: decision === 'accepted' ? 'مقبول' : 'مرفوض',
                            clientDecision: decision,
                            clientDecisionDate: new Date().toISOString().split('T')[0]
                          };
                          await ProjectService.saveQuoteRequest(updated);

                          if (decision === 'accepted') {
                            // Check if project exists already for this quote or create it automatically
                            const userProjects = await ProjectService.getProjectsForUser(quote.clientId);
                            const existing = userProjects.find(p => p.quoteRequestId === quote.id || p.title === quote.projectName);
                            if (!existing) {
                              const newProj = await ProjectService.createNewProject({
                                clientId: quote.clientId,
                                title: quote.projectName,
                                location: quote.description?.split('|')?.[0]?.replace('الموقع:', '')?.trim() || 'الرياض',
                                status: 'بانتظار العقد',
                                progress: 0,
                                quoteRequestId: quote.id,
                                installments: quote.installments || []
                              });
                              setProjects(prev => [newProj, ...prev]);
                            }
                          }

                          if (user) loadData(user);
                          triggerToast(
                            decision === 'accepted' 
                              ? 'تمت الموافقة على عرض السعر وإضافة المشروع لقائمتك تلقائياً! سيقوم المشرف بإنشاء العقد وتوقيعه إلكترونياً.' 
                              : 'تم تسجيل رفضك لعرض السعر.'
                          );
                        } catch (err) {
                          console.error(err);
                          triggerToast('حدث خطأ أثناء حفظ القرار.');
                        }
                      }}
                      onDeleteQuote={async (quoteId) => {
                        try {
                          await ProjectService.deleteQuoteRequest(quoteId);
                          if (user) loadData(user);
                          triggerToast('تم حذف طلب عرض السعر المرفوض بنجاح');
                        } catch (err) {
                          console.error(err);
                          triggerToast('حدث خطأ أثناء حذف الطلب.');
                        }
                      }}
                      onRequestQuote={() => setShowQuoteForm(true)} 
                      onGoToPayments={() => setActiveTab('payments')}
                    />
                  )
                )}

                {/* 2. PROJECTS TAB (المشاريع with Management for Supervisor / مشاريعي for Client) */}
                {activeTab === 'projects' && (
                  isSupervisor ? (
                    <SupervisorProjectsView
                      projects={projects}
                      clients={clients}
                      onManageProject={(p) => setAdminManagingProject(p)}
                      onPreviewProject={setSelectedProject}
                      onCreateNewProject={() => {
                        setCreateProjectForClientId(undefined);
                        setShowCreateProjectModal(true);
                      }}
                      selectedClientFilter={selectedClientFilter}
                      onClearClientFilter={() => setSelectedClientFilter(undefined)}
                    />
                  ) : (
                    <ProjectsListView 
                      projects={projects.filter(p => p.clientId === user?.id)} 
                      onSelect={setSelectedProject}
                      onCustomize={setCustomizingProject}
                      onRequestQuote={() => setShowQuoteForm(true)}
                      onDeleteProject={async (projectId) => {
                        try {
                          await ProjectService.deleteProject(projectId);
                          triggerToast('تم حذف المشروع الملغي بنجاح من حسابك.');
                          setSelectedProject(null);
                        } catch (err) {
                          console.error(err);
                          triggerToast('حدث خطأ أثناء حذف المشروع.');
                        }
                      }}
                    />
                  )
                )}

                {/* 3. PAYMENTS TAB */}
                {activeTab === 'payments' && (
                  isSupervisor ? (
                    <SupervisorPaymentsView
                      projects={projects}
                      clients={clients}
                      onManageProject={(p) => setAdminManagingProject(p)}
                      onUpdateProject={handleUpdateProject}
                      onRequestToast={triggerToast}
                    />
                  ) : (
                    <PaymentsView 
                      projects={projects} 
                      onPay={(p, i) => setShowPaymentModal({ project: p, installment: i })} 
                      onRequestQuote={() => setShowQuoteForm(true)}
                      onUpdateProject={handleUpdateProject}
                      onRequestToast={triggerToast}
                    />
                  )
                )}

                {/* 4. PROFILE TAB */}
                {activeTab === 'profile' && (
                  <ProfileView 
                    user={user} 
                    projects={projects}
                    clients={clients}
                    isSupervisor={isSupervisor}
                    onLogout={handleLogout} 
                    onRequestDeleteAccount={() => {
                      if (isSupervisor) {
                        triggerToast('حساب المشرف العام محمي ولا يمكن حذفه.');
                      } else {
                        setShowDeleteAccountModal(true);
                      }
                    }}
                    onUpdateUser={async (updated) => {
                      setUser(updated);
                      await UserService.saveUser(updated);
                      triggerToast('تم حفظ التعديلات بنجاح في قاعدة البيانات');
                    }}
                    onSelectClientProjects={(clientId) => {
                      setSelectedClientFilter(clientId);
                      setActiveTab('projects');
                    }}
                    onOpenSupportModal={() => setShowSupportModal(true)}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* CUSTOMER SUPPORT CHAT MODAL */}
      {showSupportModal && user && (
        <CustomerSupportModal
          user={user}
          onClose={() => setShowSupportModal(false)}
          onRequestToast={triggerToast}
        />
      )}

      {/* Bottom Navigation with Smooth Spring Indicator */}
      <nav className="fixed bottom-3 left-3 right-3 max-w-4xl mx-auto bg-[#FAF7F2]/95 backdrop-blur-xl border border-[#E8E2D8] shadow-lg shadow-black/5 rounded-full h-18 flex items-center justify-around px-3 z-40">
        {[
          { id: 'home', label: isSupervisor ? 'العملاء' : 'الرئيسية', icon: isSupervisor ? Users : HardHat },
          { id: 'projects', label: isSupervisor ? 'المشاريع' : 'مشاريعي', icon: HardHat },
          { id: 'payments', label: 'الدفعات', icon: Wallet },
          { id: 'profile', label: 'حسابي', icon: UserIcon },
        ].map((item) => {
          const isActive = activeTab === item.id && !selectedProject;
          const Icon = item.icon;
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.92 }}
              onClick={() => { setActiveTab(item.id as any); setSelectedProject(null); }}
              className={`flex-1 flex flex-col items-center justify-center py-2 px-2 rounded-full relative transition-colors duration-300 ${
                isActive ? 'text-[#1C3022]' : 'text-slate-500 hover:text-[#1C3022]'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-bottom-nav-pill"
                  className="absolute inset-0 bg-[#EFE7DC] rounded-full -z-10 shadow-xs border border-[#E8E2D8]/80"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={`w-5 h-5 mb-0.5 transition-transform duration-300 ${isActive ? 'scale-110 text-[#1C3022]' : 'text-slate-500'}`} />
              <span className={`text-[10px] tracking-tight transition-all duration-300 ${isActive ? 'font-black text-[#1C3022]' : 'font-bold'}`}>
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </nav>

      {/* SUPERVISOR ADMIN PROJECT MANAGER MODAL */}
      {adminManagingProject && (
        <AdminProjectManagerModal
          project={adminManagingProject}
          clientName={clients.find(c => c.id === adminManagingProject.clientId)?.name}
          onClose={() => setAdminManagingProject(null)}
          onSave={handleUpdateProject}
          onRequestToast={triggerToast}
        />
      )}

      {/* SUPERVISOR CREATE PROJECT MODAL */}
      {showCreateProjectModal && (
        <CreateProjectModal
          clients={clients}
          selectedClientId={createProjectForClientId}
          onClose={() => {
            setShowCreateProjectModal(false);
            setCreateProjectForClientId(undefined);
          }}
          onProjectCreated={(newProj) => {
            setProjects(prev => [newProj, ...prev]);
            setShowCreateProjectModal(false);
            triggerToast('تم إنشاء المشروع وإدراجه للعميل بنجاح');
          }}
          onRequestToast={triggerToast}
        />
      )}

      {/* PROJECT CUSTOMIZATION MODAL */}
      {customizingProject && (
        <ProjectCustomizationModal 
          project={customizingProject}
          onClose={() => setCustomizingProject(null)}
          onUpdateProject={handleUpdateProject}
          onRequestToast={triggerToast}
        />
      )}

      {/* PAYMENT GATEWAY MODAL (Apple Pay & Real Card Payment) */}
      {showPaymentModal && (
        <PaymentGatewayModal 
          project={showPaymentModal.project}
          installment={showPaymentModal.installment}
          onClose={() => setShowPaymentModal(null)}
          onSuccess={(updatedProject, receiptRef, method) => {
            handlePaymentSuccess(updatedProject, receiptRef, method);
          }}
        />
      )}

      {/* DELETE ACCOUNT MODAL */}
      {showDeleteAccountModal && (
        <DeleteAccountModal 
          user={user}
          projects={projects}
          onClose={() => setShowDeleteAccountModal(false)}
          onConfirmDelete={handleDeleteAccount}
        />
      )}

      {/* COMPLETE PHONE NUMBER MODAL (Required upon first login) */}
      {user && !user.phone && !isSupervisor && (
        <CompletePhoneModal
          user={user}
          onSavePhone={(updatedUser) => {
            setUser(updatedUser);
            triggerToast('تم حفظ رقم الجوال وتأكيد الحساب بنجاح!');
          }}
        />
      )}

      {/* Quote Request Modal */}
      {showQuoteForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm" dir="rtl">
          <motion.div 
            initial={{ scale: 0.92, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-[#E8E2D8]"
          >
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-[#F0EBE1]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#EFE7DC] flex items-center justify-center text-[#1C3022]">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-[#1C3022]">طلب عرض سعر ودراسة مشروع</h3>
              </div>
              <button onClick={() => setShowQuoteForm(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const projectName = (form.elements.namedItem('projectName') as HTMLInputElement).value;
              const location = (form.elements.namedItem('location') as HTMLInputElement).value;
              const details = (form.elements.namedItem('details') as HTMLTextAreaElement).value;

              const quoteReq: QuoteRequest = {
                id: `QR-${Math.floor(1000 + Math.random() * 9000)}`,
                clientId: user.id,
                clientName: user.name,
                projectName: projectName.trim(),
                description: `الموقع: ${location} | التفاصيل: ${details}`,
                status: 'طلب جديد',
                date: new Date().toISOString().split('T')[0]
              };

              try {
                await ProjectService.saveQuoteRequest(quoteReq);
                setShowQuoteForm(false);
                triggerToast('تم تسجيل طلب عرض السعر بنجاح في قاعدة البيانات! سيقوم المهندس بالتواصل معك.');
              } catch (err) {
                setShowQuoteForm(false);
                triggerToast('تم استلام طلبك بنجاح');
              }
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-[#192A1D] mb-1.5">اكتب اسم ونوع المشروع المطلوب</label>
                <input 
                  name="projectName" 
                  type="text" 
                  placeholder="مثال: بناء فيلا سكنية دورين وملحق / تشطيب وتطوير شقة" 
                  required 
                  className="w-full bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl px-3.5 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-[#C5B198] text-[#1C3022]" 
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#192A1D] mb-1.5">موقع المشروع والمدينة</label>
                <input 
                  name="location"
                  type="text" 
                  placeholder="مثال: الرياض - حي الملقا" 
                  required
                  className="w-full bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl px-3.5 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-[#C5B198]" 
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#192A1D] mb-1.5">مساحة الأرض / تفاصيل الطلب</label>
                <textarea 
                  name="details"
                  rows={3} 
                  required
                  className="w-full bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl px-3.5 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-[#C5B198] resize-none" 
                  placeholder="مثال: أرض مساحة 450م دورين وملحق، أود استلام عرض سعر..."
                ></textarea>
              </div>

              <button 
                type="submit" 
                className="w-full bg-[#1C3022] text-white py-3.5 rounded-xl font-black text-xs hover:bg-[#122116] transition-all shadow-md active:scale-[0.98]"
              >
                إرسال الطلب للمكتب الفني
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// AuthFlow Component: Google Authentication (Full Screen on PC & iPad)
// -------------------------------------------------------------
function AuthFlow({ 
  onAuthenticated 
}: { 
  onAuthenticated: (user: User) => void; 
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showTermsModal, setShowTermsModal] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;

      if (!fbUser) {
        throw new Error('تعذر إتمام تسجيل الدخول باستخدام حساب Google.');
      }

      // Check if user exists in Firestore
      let userProfile = await UserService.getUserById(fbUser.uid);
      if (!userProfile && fbUser.email) {
        userProfile = await UserService.getUserByEmail(fbUser.email);
      }

      if (!userProfile) {
        // Create new user profile in Firestore
        userProfile = {
          id: fbUser.uid,
          name: fbUser.displayName || 'عميل نماذج التميز',
          email: fbUser.email || '',
          termsAccepted: true,
          role: 'client',
          createdAt: new Date().toISOString(),
          ...(fbUser.photoURL ? { photoURL: fbUser.photoURL } : {}),
          ...(fbUser.phoneNumber ? { phone: fbUser.phoneNumber } : {})
        };
        await UserService.saveUser(userProfile);
      }

      onAuthenticated(userProfile);
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      const code = err?.code;
      const errorMsg = err?.message || '';
      
      if (code === 'auth/popup-closed-by-user') {
        setErrorMessage('تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية. يرجى المحاولة مرة أخرى.');
      } else if (code === 'auth/cancelled-popup-request') {
        setErrorMessage('تم إلغاء طلب تسجيل الدخول.');
      } else if (code === 'auth/popup-blocked') {
        setErrorMessage('تم حظر النافذة المنبثقة من قبل المتصفح. يرجى السماح بالنوافذ المنبثقة أو فتح التطبيق في نافذة مستقلة جديدة.');
      } else if (code === 'auth/internal-error' || errorMsg.includes('auth/internal-error') || code === 'auth/network-request-failed') {
        setErrorMessage('خطأ في الاتصال بسحابة جوجل (أو حظر ملفات الارتباط داخل الإطار). يرجى فتح التطبيق في نافذة مستقلة جديدة (New Tab) عبر الرابط المباشر لتسجيل الدخول بأمان وسرعة.');
      } else if (code === 'auth/unauthorized-domain') {
        setErrorMessage('النطاق الحالي غير مصرح به في مشروع Firebase. يرجى التأكد من إضافة النطاق في Authorized Domains بلوحة تحكم Firebase.');
      } else {
        setErrorMessage('حدث خطأ أثناء الاتصال بجوجل. إذا كنت داخل إطار معاينة AI Studio، يرجى فتح التطبيق في نافذة جديدة خارج الإطار لتسجيل الدخول بسلاسة.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. MOBILE VIEW ONLY (hidden on md & lg screens) */}
      {/* ========================================================================= */}
      <div 
        className="md:hidden min-h-screen flex flex-col justify-between p-6 w-full mx-auto relative overflow-hidden font-sans bg-cover bg-center" 
        dir="rtl" 
        style={{ 
          backgroundImage: `linear-gradient(to bottom, rgba(27, 41, 35, 0.88), rgba(15, 26, 21, 0.96)), url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80')` 
        }}
      >
        
        {/* Subtle Luxury Ambient Elements */}
        <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 30%, #C5B198 0%, transparent 65%)' }}></div>
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#C5B198]/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Section */}
        <div className="pt-16 pb-8 text-center relative z-10 flex flex-col items-center">
          <div className="mx-auto flex items-center justify-center mb-4 transition-transform drop-shadow-lg">
            <Logo size="xl" showText={false} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-wide mb-1 drop-shadow-md">نماذج التميز</h1>
          <p className="text-xs text-[#C5B198] font-black tracking-wider">للمقاولات العامة والتطوير الإنشائي</p>
        </div>

        {/* Bottom Section */}
        <div className="relative z-10 w-full max-w-sm mx-auto pb-6 space-y-6">
          {/* Error Alert */}
          {errorMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 bg-red-900/60 border border-red-500/40 text-red-100 text-xs font-bold rounded-2xl flex items-start gap-2.5 mb-4 shadow-lg backdrop-blur-md"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </motion.div>
          )}

          {/* Google Sign-in Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-[#D0A97E] to-[#BE966C] hover:from-[#C29B70] hover:to-[#B0885E] text-[#1C3022] py-4 px-6 rounded-2xl font-black text-[15px] transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed group"
          >
            {isLoading ? (
              <div className="flex items-center gap-2 text-[#1C3022]">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري تسجيل الدخول...</span>
              </div>
            ) : (
              <>
                <span className="text-[#1C3022] font-black">تسجيل الدخول بحساب Google</span>
                <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center shrink-0 p-1.5 shadow-sm ml-1">
                  <svg className="w-full h-full" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                </div>
              </>
            )}
          </button>

          {/* Security and Terms Notes */}
          <div className="text-center space-y-4 pt-2">
            <div className="text-[11px] text-[#EFE7DC]/80 leading-relaxed font-medium">
              <p>بالتسجيل والمتابعة، فإنك توافق على</p>
              <button
                type="button"
                onClick={() => setShowTermsModal(true)}
                className="text-[#C5B198] font-black underline hover:text-[#EFE7DC] mt-0.5 transition-colors"
              >
                شروط الخدمة وسياسة الخصوصية
              </button>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-[11px] text-[#C5B198] font-bold bg-black/30 backdrop-blur-sm py-2 px-3 rounded-xl border border-white/10">
              <ShieldCheck className="w-4 h-4 shrink-0 text-[#C5B198]" />
              <span>توثيق مشفر وسحابي آمن</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. IPAD / TABLET VIEW ONLY (hidden on mobile and large desktop: md:flex lg:hidden) */}
      {/* ========================================================================= */}
      <div 
        className="hidden md:flex lg:hidden min-h-screen w-full text-white flex-col justify-between p-8 relative overflow-hidden font-sans bg-cover bg-center" 
        dir="rtl"
        style={{ 
          backgroundImage: `linear-gradient(to bottom, rgba(27, 41, 35, 0.88), rgba(15, 26, 21, 0.96)), url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1800&q=80')` 
        }}
      >
        {/* iPad Ambient glow rings */}
        <div className="absolute top-0 right-1/4 w-[28rem] h-[28rem] bg-[#C5B198]/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/4 w-[28rem] h-[28rem] bg-[#284430] rounded-full blur-3xl pointer-events-none"></div>

        {/* iPad Top Architectural Header */}
        <header className="flex items-center justify-between pb-6 border-b border-[#284430]/80 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 flex items-center justify-center rounded-2xl overflow-hidden shadow-lg border border-[#C5B198]/40">
              <Logo size="md" showText={false} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-wide text-white drop-shadow-sm">نماذج التميز</h1>
              <p className="text-xs text-[#C5B198] font-bold">بوابة المشاريع الإنشائية المعتمدة</p>
            </div>
          </div>
        </header>

        {/* iPad Centered Executive Slate */}
        <main className="my-auto max-w-2xl w-full mx-auto relative z-10 py-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] p-8 shadow-2xl border-2 border-[#C5B198]/50 text-[#192A1D] space-y-6"
          >
            {/* iPad Card Header */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-[#1C3022] text-[#C5B198] rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-md">
                <Sparkles className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-black text-[#1C3022]">تسجيل الدخول للمنصة</h2>
              <p className="text-slate-600 text-xs font-medium max-w-md mx-auto leading-relaxed">
                مرحباً بك في البوابة الرقمية لمتابعة مشاريع البناء، توثيق العقود، وإدارة الدفعات والتقارير الهندسية
              </p>
            </div>

            {/* Error Alert */}
            {errorMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </motion.div>
            )}

            {/* iPad 3 Quick Capsules Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E8E2D8] text-center space-y-1.5">
                <div className="w-7 h-7 rounded-lg bg-[#EFE7DC] text-[#1C3022] flex items-center justify-center mx-auto">
                  <HardHat className="w-4 h-4" />
                </div>
                <h4 className="text-[11px] font-black text-[#1C3022]">متابعة حية</h4>
                <p className="text-[9px] text-slate-500 font-medium">نسب إنجاز وتقارير</p>
              </div>

              <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E8E2D8] text-center space-y-1.5">
                <div className="w-7 h-7 rounded-lg bg-[#EFE7DC] text-[#1C3022] flex items-center justify-center mx-auto">
                  <Building2 className="w-4 h-4" />
                </div>
                <h4 className="text-[11px] font-black text-[#1C3022]">سداد الدفعات</h4>
                <p className="text-[9px] text-slate-500 font-medium">سندات إلكترونية معتمدة</p>
              </div>

              <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E8E2D8] text-center space-y-1.5">
                <div className="w-7 h-7 rounded-lg bg-[#EFE7DC] text-[#1C3022] flex items-center justify-center mx-auto">
                  <FileCheck className="w-4 h-4" />
                </div>
                <h4 className="text-[11px] font-black text-[#1C3022]">العقود الرقمية</h4>
                <p className="text-[9px] text-slate-500 font-medium">توقيع واعتماد رسمي</p>
              </div>
            </div>

            {/* Google Sign-in Button */}
            <div className="pt-1">
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full bg-[#1C3022] hover:bg-[#122116] text-white py-4 px-6 rounded-2xl font-black text-sm transition-all shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2.5 text-white">
                    <Loader2 className="w-5 h-5 animate-spin text-[#C5B198]" />
                    <span>جاري تسجيل الدخول الآمن...</span>
                  </div>
                ) : (
                  <>
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0 p-1 shadow-sm">
                      <svg className="w-full h-full" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                    </div>
                    <span className="text-white font-black">
                      المتابعة السريعة بحساب Google
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* iPad Footer Notes inside Slate */}
            <div className="text-center space-y-2 pt-1">
              <p className="text-[11px] text-slate-500">
                بالتسجيل والمتابعة فإنك توافق على{' '}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-[#A99379] font-black underline hover:text-[#1C3022]"
                >
                  شروط الخدمة وسياسة الخصوصية
                </button>
              </p>
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-emerald-800 font-bold bg-emerald-50 py-2 px-3 rounded-xl border border-emerald-200/60 max-w-sm mx-auto">
                <Lock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>توثيق مشفر وسحابي آمن</span>
              </div>
            </div>
          </motion.div>
        </main>

        {/* iPad Bottom Footer */}
        <footer className="text-center text-xs text-[#EFE7DC]/70 pt-4 border-t border-[#284430]/80 relative z-10">
          جميع الحقوق محفوظة © {new Date().getFullYear()} مؤسسة نماذج التميز للمقاولات العامة
        </footer>
      </div>

      {/* ========================================================================= */}
      {/* 3. PC / LARGE DESKTOP VIEW (visible on lg+ screens: hidden lg:flex) */}
      {/* ========================================================================= */}
      <div 
        className="hidden lg:flex min-h-screen w-full text-white flex-col justify-between relative overflow-hidden font-sans bg-cover bg-center" 
        dir="rtl"
        style={{ 
          backgroundImage: `linear-gradient(to bottom, rgba(27, 41, 35, 0.90), rgba(15, 26, 21, 0.96)), url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2200&q=80')` 
        }}
      >
        {/* Architectural ambient background glowing shapes */}
        <div className="absolute -top-36 -right-36 w-[32rem] h-[32rem] bg-[#C5B198]/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/2 -left-48 w-[38rem] h-[38rem] bg-[#284430] rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-36 right-1/4 w-[30rem] h-[30rem] bg-[#122116] rounded-full blur-2xl pointer-events-none"></div>

        {/* Top Navigation Bar - Full Width for PC & iPad */}
        <header className="w-full border-b border-[#284430]/80 bg-[#1C3022]/90 backdrop-blur-md px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between relative z-20">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 flex items-center justify-center rounded-2xl overflow-hidden shadow-md border border-[#C5B198]/40">
              <Logo size="sm" showText={false} />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-wide text-white drop-shadow-sm">
                مؤسسة نماذج التميز
              </h1>
              <p className="text-[11px] text-[#C5B198] font-bold">
                للمقاولات العامة والتطوير الإنشائي
              </p>
            </div>
          </div>
        </header>

        {/* Main Body: 2-Column on Desktop & iPad */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 py-8 lg:py-12 flex items-center relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-14 items-center w-full">
            
            {/* Right Column: Architectural & Brand Showcase */}
            <div className="md:col-span-6 lg:col-span-7 space-y-6 lg:space-y-8 text-right">
              
              {/* Top Badge */}
              <div className="inline-flex items-center gap-2 bg-[#284430]/90 border border-[#C5B198]/40 text-[#C5B198] px-4 py-2 rounded-2xl text-xs font-black shadow-sm backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 text-[#C5B198]" />
                <span>المنصة الرقمية المتكاملة لإدارة المشاريع الإنشائية</span>
              </div>

              {/* Main Headline */}
              <div className="space-y-3">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight sm:leading-snug drop-shadow-md">
                  تابع مشروعك الإنشائي لحظة بلحظة وبكل شفافية
                </h2>
                <p className="text-sm sm:text-base text-[#EFE7DC]/90 leading-relaxed font-medium max-w-2xl">
                  من المخططات الهندسية وتوقيع العقود الرقمية وحتى استلام المفتاح، نضع بين يديك تجربة متطورة لمتابعة نسب الإنجاز، سداد الدفعات، والتقارير الميدانية الموثقة.
                </p>
              </div>

              {/* 4 Feature Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 pt-2">
                
                {/* Feature 1 */}
                <div className="bg-[#243d2c]/85 border border-[#3b6147]/80 rounded-2xl p-4.5 space-y-2 backdrop-blur-md hover:border-[#C5B198]/70 transition-colors shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-[#C5B198]/20 text-[#C5B198] flex items-center justify-center">
                    <HardHat className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-white">متابعة حية للإنجاز</h3>
                  <p className="text-xs text-[#EFE7DC]/80 leading-relaxed">
                    نسب إنجاز دقيقة، تقارير المهندس الميداني وصور الموقع المحدثة أسبوعياً لكل مرحلة.
                  </p>
                </div>

                {/* Feature 2 */}
                <div className="bg-[#243d2c]/85 border border-[#3b6147]/80 rounded-2xl p-4.5 space-y-2 backdrop-blur-md hover:border-[#C5B198]/70 transition-colors shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-[#C5B198]/20 text-[#C5B198] flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-white">سداد تحويل بنكي معتمد</h3>
                  <p className="text-xs text-[#EFE7DC]/80 leading-relaxed">
                    تسديد الدفعات عبر الحساب البنكي الرسمي مع إرفاق الإيصال وإصدار سندات قبض فورية.
                  </p>
                </div>

                {/* Feature 3 */}
                <div className="bg-[#243d2c]/85 border border-[#3b6147]/80 rounded-2xl p-4.5 space-y-2 backdrop-blur-md hover:border-[#C5B198]/70 transition-colors shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-[#C5B198]/20 text-[#C5B198] flex items-center justify-center">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-white">العقود والتوقيع الرقمي</h3>
                  <p className="text-xs text-[#EFE7DC]/80 leading-relaxed">
                    توثيق وتوقيع عقود المقاولات واعتماد المخططات الهندسية وسندات الدفعات بأمان.
                  </p>
                </div>

                {/* Feature 4 */}
                <div className="bg-[#243d2c]/85 border border-[#3b6147]/80 rounded-2xl p-4.5 space-y-2 backdrop-blur-md hover:border-[#C5B198]/70 transition-colors shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-[#C5B198]/20 text-[#C5B198] flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-white">مزامنة فورية وتواصل مباشر</h3>
                  <p className="text-xs text-[#EFE7DC]/80 leading-relaxed">
                    ربط لحظي بين العميل والمكتب الفني والمشرف العام لضمان أعلى مستويات الجودة.
                  </p>
                </div>

              </div>

              {/* Trust Tags */}
              <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-bold text-[#C5B198]">
                <span className="flex items-center gap-1.5 bg-[#284430]/80 px-3 py-1.5 rounded-xl border border-[#3b6147]/60 backdrop-blur-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  عقود موثقة وفق اشتراطات الكود السعودي
                </span>
                <span className="flex items-center gap-1.5 bg-[#284430]/80 px-3 py-1.5 rounded-xl border border-[#3b6147]/60 backdrop-blur-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  حماية وسرية تامة لبيانات المشاريع
                </span>
              </div>

            </div>

            {/* Left Column: Authentication Form Card */}
            <div className="md:col-span-6 lg:col-span-5 flex justify-center w-full">
              <motion.div 
                layout
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2.5rem] p-7 sm:p-9 lg:p-10 shadow-2xl border border-[#C5B198]/40 relative z-10 w-full max-w-md lg:max-w-none text-[#192A1D] space-y-6"
              >
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 bg-[#FAF7F2] rounded-2xl flex items-center justify-center mx-auto mb-3 text-[#1C3022] shadow-inner border border-[#E8E2D8]">
                    <ShieldCheck className="w-7 h-7 text-[#1C3022]" />
                  </div>
                  <h3 className="text-xl font-black text-[#1C3022]">تسجيل الدخول إلى حسابك</h3>
                  <p className="text-slate-600 text-xs sm:text-sm font-medium leading-relaxed">
                    سجّل دخولك للوصول المباشر لمشاريعك وعقودك وسندات السداد
                  </p>
                </div>

                {/* Error Alert */}
                {errorMessage && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl flex items-start gap-3"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                    <span className="leading-relaxed">{errorMessage}</span>
                  </motion.div>
                )}

                {/* Sign-in Button */}
                <div className="space-y-3 pt-2">
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full bg-[#1C3022] hover:bg-[#122116] text-white py-4 px-4 rounded-2xl font-black text-sm transition-all shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed group"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2.5 text-white">
                        <Loader2 className="w-5 h-5 animate-spin text-[#C5B198]" />
                        <span>جاري تسجيل الدخول الآمن...</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0 p-1 shadow-sm">
                          <svg className="w-full h-full" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                          </svg>
                        </div>
                        <span className="text-white font-black">
                          تسجيل الدخول والمتابعة السريعة
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {/* Instant Access Features Checklist */}
                <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#E8E2D8] space-y-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2 font-bold">
                    <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>دخول فوري ومباشر دون الحاجة لحفظ كلمات مرور</span>
                  </div>
                  <div className="flex items-center gap-2 font-bold">
                    <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>مزامنة تلقائية وسريعة مع كافة أجهزتك</span>
                  </div>
                  <div className="flex items-center gap-2 font-bold">
                    <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>إشعارات فورية باعتماد المراحل وسندات القبض</span>
                  </div>
                </div>

                {/* Security and Terms Notes */}
                <div className="pt-1 text-center space-y-2.5">
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    بالتسجيل والمتابعة فإنك توافق على{' '}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-[#A99379] font-black underline hover:text-[#1C3022]"
                    >
                      شروط الخدمة وسياسة الخصوصية
                    </button>
                  </p>
                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-emerald-800 font-bold bg-emerald-50 py-2.5 px-3.5 rounded-xl border border-emerald-200/70">
                    <Lock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>توثيق مشفر 256-Bit وحماية تامة للبيانات</span>
                  </div>
                </div>
              </motion.div>
            </div>

          </div>
        </main>

        {/* Full-Width Footer for PC & iPad */}
        <footer className="w-full border-t border-[#284430]/80 bg-[#152419] px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-center text-center text-xs text-[#EFE7DC]/70 relative z-20">
          <div>
            جميع الحقوق محفوظة © {new Date().getFullYear()} مؤسسة نماذج التميز للمقاولات العامة والتطوير الإنشائي
          </div>
        </footer>
      </div>

      {/* Terms & Conditions Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm" dir="rtl">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white max-w-lg w-full rounded-[2.5rem] p-8 shadow-2xl border border-[#E8E2D8] text-[#1C3022] space-y-6"
          >
            <div className="flex justify-between items-center pb-4 border-b border-[#E8E2D8]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FAF7F2] border border-[#E8E2D8] flex items-center justify-center text-[#1C3022]">
                  <FileText className="w-5 h-5 text-[#1C3022]" />
                </div>
                <h3 className="text-base font-black text-[#1C3022]">الشروط والأحكام الرسمية</h3>
              </div>
              <button onClick={() => setShowTermsModal(false)} className="p-2 bg-[#FAF7F2] text-slate-400 hover:text-[#1C3022] hover:bg-[#EFE7DC] rounded-full border border-[#E8E2D8] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-slate-600 space-y-3.5 max-h-80 overflow-y-auto leading-relaxed pr-1 font-bold">
              <p>1. <strong className="text-[#1C3022]">الربط والتوثيق التعاقدي:</strong> يُعد تسجيل الدخول والمتابعة موافقة رسمية على توثيق ومتابعة المشاريع الإنشائية وربط التقارير الهندسية وعروض الأسعار بالملف التعاقدي للعميل.</p>
              <p>2. <strong className="text-[#1C3022]">التحويل البنكي والدفعات المالية:</strong> تتم جميع عمليات سداد الدفعات التعاقدية بموجب تحويل بنكي رسمي إلى الحساب المعتمد لمؤسسة نماذج التميز، مع إرفاق إيصال التحويل لإصدار سند القبض الرسمي المعتمد وتوثيقه بسجل الدفعات.</p>
              <p>3. <strong className="text-[#1C3022]">المطابقة الإنشائية وكود البناء:</strong> تلتزم المؤسسة بتنفيذ الأعمال الإنشائية والتشطيبية وفق المخططات الهندسية المعتمدة وتراخيص البناء واشتراطات كود البناء السعودي مع توثيق مراحل الإنجاز ميدانياً.</p>
              <p>4. <strong className="text-[#1C3022]">سرية المخططات والبيانات الهندسية:</strong> تلتزم مؤسسة نماذج التميز بأعلى معايير الأمان وحماية سرية بيانات العملاء والمخططات الهندسية وجداول الكميات والتقارير الفنية.</p>
              <p>5. <strong className="text-[#1C3022]">التوقيع والمصادقة الرقمية:</strong> يُعتد بالتوقيع الرقمي المعتمد داخل التطبيق في توثيق العقود الإنشائية، محاضر الاستلام والتسليم، وتعديلات بنود التنفيذ.</p>
              <p>6. <strong className="text-[#1C3022]">الإشعارات والتقارير الميدانية:</strong> تعتبر الإشعارات الموجهة عبر التطبيق بخصوص إنجاز المراحل وجداول الدفعات إخطارات رسمية معتمدة بين الطرفين.</p>
            </div>
            <button
              onClick={() => setShowTermsModal(false)}
              className="w-full bg-[#1C3022] text-white py-4 rounded-[1.5rem] font-black text-[15px] hover:bg-[#122116] transition-all shadow-md active:scale-[0.98]"
            >
              موافق وإغلاق
            </button>
          </motion.div>
        </div>
      )}
    </>
  );
}

// -------------------------------------------------------------
// Home View
// -------------------------------------------------------------
function HomeView({ 
  user, 
  projects, 
  quotes = [],
  onDecisionQuote,
  onDeleteQuote,
  onRequestQuote,
  onGoToPayments
}: { 
  user: User; 
  projects: Project[]; 
  quotes?: QuoteRequest[];
  onDecisionQuote?: (quote: QuoteRequest, decision: 'accepted' | 'rejected') => Promise<void>;
  onDeleteQuote?: (quoteId: string) => Promise<void>;
  onRequestQuote: () => void; 
  onGoToPayments: () => void;
}) {
  const [expandedQuotes, setExpandedQuotes] = useState<Record<string, boolean>>({});
  const pendingInstallment = projects.flatMap(p => p.installments.map(i => ({ installment: i, project: p }))).find(item => item.installment.status === 'pending');
  const overdue7DaysItem = projects.flatMap(p => p.installments.map(i => ({ 
    installment: i, 
    project: p,
    overdue: getInstallmentOverdueStatus(i)
  }))).find(item => item.installment.status === 'pending' && item.overdue.isOverdue7Days);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-black text-[#C5B198] tracking-wider">مرحباً بك</span>
          <h2 className="text-xl font-black text-[#1C3022]">{user.name}</h2>
          <p className="text-slate-500 text-xs font-bold flex items-center gap-1 mt-0.5">
            <Mail className="w-3 h-3 text-[#C5B198]" /> {user.email || user.phone}
          </p>
        </div>
        <div className="w-14 h-14 rounded-full bg-white border border-[#E8E2D8] flex items-center justify-center text-[#C5B198] shadow-inner overflow-hidden">
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <UserIcon className="w-6 h-6" />
          )}
        </div>
      </div>

      {/* 7-Day Overdue Payment Alert Banner */}
      {overdue7DaysItem && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-[2rem] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-400 font-black text-xs">
              <div className="w-8 h-8 rounded-full bg-red-950/50 flex items-center justify-center text-red-400 shrink-0 border border-red-500/20">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <span>تنبيه سداد متأخر (+{overdue7DaysItem.overdue.daysOverdue} يوم)</span>
            </div>
            <span className="text-[10px] font-black bg-red-950/50 text-red-400 border border-red-500/30 px-3 py-1 rounded-full">
              عاجل
            </span>
          </div>
          <p className="text-[11px] text-red-300 leading-relaxed font-bold">
            نود تذكيركم بموعد سداد دفعة <strong>({overdue7DaysItem.installment.title})</strong> بقيمة <strong>{overdue7DaysItem.installment.amount}</strong> لمشروع <strong>{overdue7DaysItem.project.title}</strong>. يرجى المبادرة بالسداد عبر التطبيق لتجنب تأخير الأعمال الإنشائية.
          </p>
          <button
            onClick={onGoToPayments}
            className="w-full bg-red-900/60 border border-red-500/40 text-red-100 py-3 rounded-xl font-black text-xs hover:bg-red-900/80 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Smartphone className="w-4 h-4" />
            <span>سداد الدفعة الآن</span>
          </button>
        </div>
      )}

      {/* QUOTES & PROPOSALS SECTION (عروض الأسعار والطلبات) */}
      {quotes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#FAF7F2] border border-[#E8E2D8] flex items-center justify-center text-[#1C3022]">
                <FileText className="w-3.5 h-3.5 text-[#A99379]" />
              </div>
              <h3 className="text-sm font-black text-[#1C3022]">عروض الأسعار ودراسات المشاريع</h3>
            </div>
            <span className="text-[10px] font-black bg-[#EFE7DC] text-[#1C3022] px-2 py-0.5 rounded-full">
              {quotes.length} طلبات
            </span>
          </div>

          <div className="space-y-3">
            {quotes.map(quote => {
              const hasProposal = quote.status === 'تم إرسال العرض' || Boolean(quote.fileUrl);
              const isDecisionPending = !quote.clientDecision || quote.clientDecision === 'pending';

              return (
                <div key={quote.id} className="bg-white rounded-3xl p-5 border border-[#E8E2D8] shadow-sm space-y-3.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-black text-[#A99379]">طلب رقم #{quote.id}</span>
                      <h4 className="text-sm font-black text-[#1C3022] mt-0.5">{quote.projectName}</h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{quote.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl ${
                        quote.status === 'طلب جديد' ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                        quote.status === 'تم إرسال العرض' ? 'bg-blue-100 text-blue-900 border border-blue-200' :
                        quote.status === 'مقبول' ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' :
                        quote.status === 'مرفوض' ? 'bg-red-100 text-red-900 border border-red-200' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {quote.status}
                      </span>
                      {(quote.status === 'مرفوض' || quote.clientDecision === 'rejected') && onDeleteQuote && (
                        <button
                          type="button"
                          onClick={() => onDeleteQuote(quote.id)}
                          className="p-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-all"
                          title="حذف الطلب المرفوض"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* If new request and supervisor hasn't sent quote yet */}
                  {quote.status === 'طلب جديد' && (
                    <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E8E2D8] text-xs flex items-center gap-2 text-slate-600">
                      <Clock className="w-4 h-4 text-[#A99379] shrink-0" />
                      <span>طلبك قيد المراجعة والدراسة الفنية من المهندس المشرف. سيصلك إشعار ومستند عرض السعر هنا قريباً.</span>
                    </div>
                  )}

                  {/* If Supervisor sent a proposal (File + Price) */}
                  {hasProposal && (
                    <div className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#E8E2D8] space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-black text-[#A99379] block">مبلغ عرض السعر المقترح</span>
                          <span className="text-base font-black text-[#1C3022]">
                            {quote.quoteAmount || quote.amount || 'حسب المواصفات الهندسية'}
                          </span>
                        </div>

                        {quote.fileUrl && (
                          <button
                            type="button"
                            onClick={() => downloadFile(quote.fileUrl!, quote.fileName || `عرض_سعر_${quote.projectName}.pdf`)}
                            className="bg-white hover:bg-[#EFE7DC] text-[#1C3022] px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 border border-[#E8E2D8] shadow-sm transition-all"
                          >
                            <Download className="w-3.5 h-3.5 text-[#A99379]" />
                            <span>تحميل مستند العرض ({quote.fileName || 'ملف PDF'})</span>
                          </button>
                        )}
                      </div>

                      {quote.adminNote && (
                        <div className="pt-2 border-t border-[#E8E2D8] text-xs text-slate-600">
                          <strong className="text-[#1C3022]">ملاحظات المشرف: </strong>
                          {quote.adminNote}
                        </div>
                      )}

                      {/* Expandable Installments and Details (زر المزيد) */}
                      <div className="pt-2.5 border-t border-[#E8E2D8]">
                        <button
                          type="button"
                          onClick={() => setExpandedQuotes(prev => ({ ...prev, [quote.id]: !prev[quote.id] }))}
                          className="text-xs font-black text-[#A99379] hover:text-[#1C3022] flex items-center gap-1.5 transition-colors focus:outline-none"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>
                            {expandedQuotes[quote.id] 
                              ? 'إخفاء تفاصيل الدفعات وعرض السعر ↑' 
                              : 'تفاصيل الدفعات وعرض السعر المقترح (المزيد...) ↓'}
                          </span>
                        </button>

                        {expandedQuotes[quote.id] && (
                          <div className="mt-3 bg-white border border-[#E8E2D8] rounded-xl p-3.5 space-y-3 shadow-2xs">
                            <h5 className="text-[11px] font-black text-[#1C3022] border-b border-[#F0EBE1] pb-1.5">
                              جدول الدفعات المالية المقترحة لعرض السعر:
                            </h5>
                            {quote.installments && quote.installments.length > 0 ? (
                              <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
                                {quote.installments.map((inst, index) => (
                                  <div 
                                    key={inst.id || index} 
                                    className="flex items-center justify-between text-xs py-2 border-b border-slate-50 last:border-0"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="w-5 h-5 rounded-full bg-[#1C3022] text-[#C5B198] text-[9px] font-black flex items-center justify-center shrink-0">
                                        {index + 1}
                                      </span>
                                      <span className="font-bold text-[#1C3022]">{inst.title}</span>
                                    </div>
                                    <div className="text-left shrink-0">
                                      <span className="font-black text-[#1C3022] block">{inst.amount}</span>
                                      {inst.dueDate && (
                                        <span className="text-[9px] text-slate-400 block font-bold mt-0.5">
                                          تاريخ التقريبي: {inst.dueDate}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[10px] text-slate-400 font-bold">لم يتم تحديد دفعات مخصصة لعرض السعر هذا.</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Client Decision Actions */}
                      {isDecisionPending && quote.status === 'تم إرسال العرض' && onDecisionQuote && (
                        <div className="pt-2 border-t border-[#E8E2D8] space-y-2">
                          <span className="text-[11px] font-black text-[#1C3022] block">
                            يرجى الاطلاع على ملف العرض وتحديد قراركم:
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => onDecisionQuote(quote, 'accepted')}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.98]"
                            >
                              <Check className="w-4 h-4" />
                              <span>قبول العرض والموافقة</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onDecisionQuote(quote, 'rejected')}
                              className="bg-white hover:bg-red-50 text-red-700 border border-red-200 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                            >
                              <X className="w-4 h-4 text-red-600" />
                              <span>رفض العرض</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Decision Result Status Banner */}
                      {quote.clientDecision === 'accepted' && (
                        <div className="pt-2 border-t border-[#E8E2D8] flex items-center gap-2 text-emerald-800 text-xs font-black">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span>تمت موافقتكم على عرض السعر. يقوم المهندس المشرف الآن بتجهيز العقد وتدشين المشروع في حسابك.</span>
                        </div>
                      )}

                      {quote.clientDecision === 'rejected' && (
                        <div className="pt-2 border-t border-[#E8E2D8] flex items-center gap-2 text-red-800 text-xs font-black">
                          <XCircle className="w-4 h-4 text-red-700 shrink-0" />
                          <span>تم تسجيل رفضكم لعرض السعر. يمكنك التواصل مع المشرف لطلب دراسة معدلة.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hero Quote Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={{ y: -2, transition: { duration: 0.15 } }}
        className="bg-[#1C3022] rounded-[2rem] p-6 text-white relative overflow-hidden shadow-xl border border-[#284430]"
      >
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C5B198]/20 border border-[#C5B198]/30 text-[#C5B198] text-[10px] font-black mb-3">
            <Sparkles className="w-3 h-3 text-[#C5B198]" />
            <span>خدمة هندسية متكاملة</span>
          </div>
          <h3 className="text-lg font-black mb-1.5 text-white">هل لديك مشروع بناء أو تطوير؟</h3>
          <p className="text-[#EFE7DC]/80 text-xs mb-5 leading-relaxed font-medium">
            احصل على دراسة هندسية وعرض سعر دقيق ومعتمد من مهندسي نماذج التميز.
          </p>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRequestQuote} 
            className="bg-[#C5B198] text-[#1C3022] px-5 py-3 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-[#BAA386] transition-all shadow-md"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>طلب عرض سعر جديد</span>
          </motion.button>
        </div>
        
        <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-[#C5B198]/15 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#2A4532]/40 rounded-full blur-xl pointer-events-none"></div>
      </motion.div>

      {/* Urgent Next Payment Alert */}
      {!overdue7DaysItem && pendingInstallment && (
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          whileHover={{ y: -2, transition: { duration: 0.15 } }}
          className="bg-white rounded-3xl p-5 border border-[#E8E2D8] shadow-sm flex items-center justify-between hover:border-[#C5B198] transition-all"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#FAF7F2] border border-[#C5B198]/40 flex items-center justify-center text-[#1C3022] shadow-2xs">
              <Wallet className="w-5 h-5 text-[#A99379]" />
            </div>
            <div>
              <span className="text-[10px] font-black text-[#A99379]">الدفعة القادمة المستحقة</span>
              <h4 className="text-xs font-black text-[#1C3022]">{pendingInstallment.installment.title}</h4>
              <span className="text-[11px] font-black text-[#1C3022] mt-0.5 block">{pendingInstallment.installment.amount}</span>
            </div>
          </div>
          <motion.button 
            whileTap={{ scale: 0.94 }}
            onClick={onGoToPayments}
            className="bg-black text-white px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 hover:bg-neutral-800 transition-all shadow-sm"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>سداد الآن</span>
          </motion.button>
        </motion.div>
      )}

      {!pendingInstallment && (
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          whileHover={{ y: -2, transition: { duration: 0.15 } }}
          className="bg-white rounded-3xl p-5 border border-[#E8E2D8] shadow-sm flex items-center justify-between hover:border-[#C5B198] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FAF7F2] flex items-center justify-center text-[#1C3022] shadow-2xs">
              <HardHat className="w-5 h-5 text-[#A99379]" />
            </div>
            <div>
              <h4 className="text-xs font-black text-[#1C3022]">مشاريعك المعتمدة</h4>
              <span className="text-[10px] text-slate-500 font-bold">
                {projects.length > 0 ? `لديك ${projects.length} مشاريع قيد المتابعة` : 'لا توجد مشاريع نشطة حالياً'}
              </span>
            </div>
          </div>
          {projects.length === 0 && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onRequestQuote}
              className="text-xs font-black text-[#1C3022] bg-[#EFE7DC] hover:bg-[#e4dacb] px-3.5 py-2 rounded-xl transition-all shadow-2xs"
            >
              ابدأ مشروعك
            </motion.button>
          )}
        </motion.div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Projects List View (Client Side - Compact & Fast)
// -------------------------------------------------------------
function ProjectsListView({ 
  projects, 
  onSelect,
  onRequestQuote,
  onDeleteProject
}: { 
  projects: Project[]; 
  onSelect: (p: Project) => void;
  onCustomize?: (p: Project) => void;
  onRequestQuote: () => void;
  onDeleteProject: (projectId: string) => Promise<void>;
}) {
  const activeProjects = projects.filter(p => !p.isDeleted);

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-black text-[#1C3022]">مشاريعي</h3>
        <span className="px-3 py-1 bg-white border border-[#E8E2D8] text-[#1C3022] rounded-full text-xs font-black shadow-2xs">
          {activeProjects.length} مشاريع
        </span>
      </div>

      {activeProjects.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 text-center border border-[#E8E2D8] space-y-4 shadow-sm"
        >
          <HardHat className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="font-black text-sm text-[#1C3022]">لا توجد مشاريع مسجلة حالياً</h4>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRequestQuote}
            className="bg-[#1C3022] text-[#C5B198] hover:bg-[#122116] px-5 py-2.5 rounded-2xl text-xs font-black transition-all shadow-sm"
          >
            طلب عرض سعر جديد
          </motion.button>
        </motion.div>
      ) : (
        <div className="space-y-2.5">
          {activeProjects.map((p, idx) => (
            <motion.div 
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.04 }}
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
              className="bg-white rounded-2xl p-3.5 sm:p-4 border border-[#E8E2D8] shadow-sm flex items-center justify-between gap-3 hover:border-[#C5B198] transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#FAF7F2] border border-[#E8E2D8] flex items-center justify-center text-[#1C3022] shrink-0 font-black">
                  <Building2 className="w-4 h-4 text-[#C5B198]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <h4 className="text-sm font-black text-[#1C3022] truncate">{p.title}</h4>
                    {p.status === 'ملغي' && (
                      <span className="bg-red-50 text-red-700 text-[9px] font-black px-2 py-0.5 rounded-lg border border-red-200">
                        ملغي
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {p.status === 'ملغي' && (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (window.confirm('هل أنت متأكد من رغبتك في حذف هذا المشروع الملغي نهائياً من حسابك؟')) {
                        await onDeleteProject(p.id);
                      }
                    }}
                    className="bg-red-50 text-red-600 hover:bg-red-100 p-2 rounded-xl text-xs font-black transition-all border border-red-200 shrink-0"
                    title="حذف المشروع"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                )}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => onSelect(p)}
                  className="bg-[#1C3022] text-white hover:bg-[#122116] px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm shrink-0"
                >
                  <span>عرض المشروع</span>
                  <ChevronLeft className="w-3.5 h-3.5 text-[#C5B198]" />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Payments View
// -------------------------------------------------------------
function PaymentsView({ 
  projects, 
  onPay,
  onRequestQuote,
  onUpdateProject,
  onRequestToast
}: { 
  projects: Project[]; 
  onPay: (p: Project, i: Installment) => void; 
  onRequestQuote: () => void;
  onUpdateProject?: (p: Project) => void;
  onRequestToast?: (msg: string) => void;
}) {
  const allInstallments = projects.flatMap(p => p.installments.map(i => ({ project: p, installment: i, overdue: getInstallmentOverdueStatus(i) })));
  const anyOverdue7Days = allInstallments.some(item => item.installment.status === 'pending' && item.overdue.isOverdue7Days);

  const handleApproveInstallment = async (p: Project, instId: string) => {
    const updatedInstallments = p.installments.map(inst => {
      if (inst.id === instId) {
        return {
          ...inst,
          clientApprovalStatus: 'approved' as const,
          clientApprovalDate: new Date().toLocaleDateString('ar-SA')
        };
      }
      return inst;
    });

    const updatedProj: Project = {
      ...p,
      installments: updatedInstallments
    };

    if (onUpdateProject) {
      onUpdateProject(updatedProj);
    }
    if (onRequestToast) {
      onRequestToast('تم اعتماد وموافقة العميل على هذه الدفعة بنجاح');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-black text-[#1C3022]">الدفعات</h3>
        <div className="w-8 h-8 rounded-xl bg-white border border-[#E8E2D8] flex items-center justify-center text-[#C5B198] shadow-2xs">
          <Wallet className="w-4 h-4 text-[#C5B198]" />
        </div>
      </div>

      {allInstallments.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 text-center border border-[#E8E2D8] shadow-sm"
        >
          <p className="text-xs text-slate-400 font-bold">لا توجد دفعات حالياً</p>
        </motion.div>
      ) : (
        projects.map(p => (
          <div key={p.id} className="space-y-2.5">
            {p.installments?.map((i, idx) => {
              const isPaid = i.status === 'paid';

              return (
                <motion.div 
                  key={i.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: idx * 0.04 }}
                  whileHover={{ y: -2, transition: { duration: 0.15 } }}
                  className="bg-white p-4 rounded-2xl border border-[#E8E2D8] shadow-sm flex items-center justify-between gap-3 transition-all hover:border-[#C5B198]"
                >
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-[#1C3022] truncate">{p.title}</h4>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                      <span className="text-slate-500 font-bold">{i.title}</span>
                      <span className="text-slate-300">•</span>
                      <span className="font-black text-[#1C3022]">{i.amount}</span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isPaid ? (
                      <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl inline-block shadow-2xs">
                        تم السداد ✓
                      </span>
                    ) : (
                      <motion.button 
                        type="button"
                        whileTap={{ scale: 0.94 }}
                        onClick={() => onPay(p, i)} 
                        className="px-4 py-2 rounded-xl text-xs font-black bg-[#1C3022] hover:bg-[#122116] text-white transition-all shadow-sm"
                      >
                        دفع
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Project Details & Image Stages View
// -------------------------------------------------------------
function ProjectDetailView({ 
  project, 
  onBack,
  onOpenCustomization,
  onPayInstallment,
  onUpdateProject,
  onRequestToast
}: { 
  project: Project; 
  onBack: () => void;
  onOpenCustomization: () => void;
  onPayInstallment: (p: Project, i: Installment) => void;
  onUpdateProject?: (p: Project) => void;
  onRequestToast?: (msg: string) => void;
}) {
  const [activeStage, setActiveStage] = useState<'before' | 'progress50' | 'after' | 'plans'>('progress50');
  const [contractNotes, setContractNotes] = useState('');
  const [isSubmittingContract, setIsSubmittingContract] = useState(false);
  const [clientSignedDoc, setClientSignedDoc] = useState<ProjectDocument | null>(null);

  const contract = project.contracts?.[0];

  const handleContractDecision = async (decision: 'accept' | 'reject') => {
    if (!onUpdateProject || !contract) return;
    if (decision === 'accept' && !clientSignedDoc) {
      if (onRequestToast) onRequestToast('يرجى إرفاق ملف العقد بعد توقيعه يدوياً لإتمام الاعتماد والتحميل');
      return;
    }
    if (decision === 'reject' && !contractNotes.trim()) {
      if (onRequestToast) onRequestToast('يرجى كتابة سبب أو ملاحظات الرفض لتتمكن من إرسالها للمشرف');
      return;
    }

    setIsSubmittingContract(true);
    try {
      const updatedContracts = project.contracts.map((c, idx) => {
        if (idx === 0) {
          return {
            ...c,
            status: decision === 'accept' ? ('ساري وموثق' as const) : ('مرفوض' as const),
            clientSignedDate: new Date().toLocaleDateString('ar-SA'),
            clientSignerName: project.title || 'العميل',
            pdfUrl: decision === 'accept' ? (clientSignedDoc?.fileUrl || c.pdfUrl) : c.pdfUrl
          };
        }
        return c;
      });

      const updatedProject: Project = {
        ...project,
        contracts: updatedContracts,
        status: decision === 'accept' ? 'قيد التنفيذ' : 'بانتظار العقد',
        documents: decision === 'accept' && clientSignedDoc ? [...(project.documents || []), clientSignedDoc] : project.documents,
        isCertified: decision === 'accept' ? true : project.isCertified
      };

      await onUpdateProject(updatedProject);
      if (onRequestToast) {
        onRequestToast(
          decision === 'accept'
            ? 'تم قبول العقد ورفع النسخة الموقعة يدوياً وتنشيط المشروع بنجاح!'
            : 'تم تسجيل رفض العقد وإرسال الملاحظات للمشرف ليتمكن من إرسال عقد جديد.'
        );
      }
      setContractNotes('');
      setClientSignedDoc(null);
    } catch (err) {
      console.error(err);
      if (onRequestToast) onRequestToast('حدث خطأ أثناء اعتماد العقد');
    } finally {
      setIsSubmittingContract(false);
    }
  };

  const handleClientSignedUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeFormatted = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        try {
          const fileKey = `signed-contract-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
          const cachedUrl = await storeFile(fileKey, event.target.result as string);
          setClientSignedDoc({
            id: `DOC-CNT-SIGNED-${Date.now().toString().slice(-4)}`,
            name: `العقد الموقع - ${project.title}`,
            category: 'عقد معتمد',
            fileUrl: cachedUrl,
            fileName: file.name,
            fileSize: sizeFormatted,
            uploadedAt: new Date().toISOString().split('T')[0],
            uploadedBy: 'العميل'
          });
        } catch (err) {
          console.error('Error caching signed contract:', err);
          alert('حدث خطأ أثناء معالجة وحفظ الملف.');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const stageLabels = {
    before: 'قبل البدء',
    progress50: 'نسبة 50%',
    after: 'بعد الإنجاز',
    plans: 'المخططات الهندسية'
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-[1rem] bg-white border border-[#E8E2D8] text-xs font-black text-[#1C3022] hover:bg-[#EFE7DC] transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-[#C5B198]" />
          <span>رجوع للمشاريع</span>
        </button>

        {project.status === 'ملغي' && (
          <button
            onClick={async () => {
              if (window.confirm('هل أنت متأكد من رغبتك في حذف هذا المشروع الملغي نهائياً من حسابك؟')) {
                try {
                  await ProjectService.deleteProject(project.id);
                  if (onRequestToast) onRequestToast('تم حذف المشروع نهائياً بنجاح.');
                  onBack();
                } catch (err) {
                  console.error(err);
                  if (onRequestToast) onRequestToast('حدث خطأ أثناء حذف المشروع.');
                }
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[1rem] bg-red-50 hover:bg-red-100 border border-red-200 text-xs font-black text-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>حذف هذا المشروع الملغي</span>
          </button>
        )}
      </div>

      {/* Project Title and Overview */}
      <div className="bg-white rounded-[2rem] p-6 border border-[#E8E2D8] shadow-sm space-y-5">
        <div>
          <h2 className="text-xl font-black text-[#1C3022]">{project.title}</h2>
          <p className="text-xs text-slate-500 font-bold flex items-center gap-1.5 mt-2">
            <MapPin className="w-3.5 h-3.5 text-[#C5B198]" /> {project.location}
          </p>
        </div>

        {/* Progress Display */}
        <div className="bg-[#FAF7F2] p-5 rounded-[1.5rem] border border-[#E8E2D8] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-black text-[#C5B198] block mb-1">نسبة الإنجاز الفعلية</span>
            <span className="text-3xl font-black text-[#1C3022]">{project.progress}%</span>
          </div>
          <div className="w-16 h-16 relative flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-[#1A2E23]" />
              <circle 
                cx="32" 
                cy="32" 
                r="26" 
                stroke="currentColor" 
                strokeWidth="6" 
                fill="transparent" 
                className="text-[#C5B198] drop-shadow-[0_0_8px_rgba(208,169,126,0.4)]" 
                strokeDasharray={163.3} 
                strokeDashoffset={163.3 - (163.3 * project.progress) / 100} 
                strokeLinecap="round"
              />
            </svg>
            <HardHat className="w-6 h-6 text-[#C5B198] absolute" />
          </div>
        </div>
      </div>

      {/* Project Contract Review & Approval Card */}
      {contract && (
        <div className="bg-white rounded-[2rem] p-6 border border-[#E8E2D8] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE1]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#EFE7DC] flex items-center justify-center text-[#1C3022]">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-sm text-[#1C3022]">عقد المشروع ومراجعة الشروط</h3>
                <span className="text-[10px] text-slate-400">رقم العقد: {contract.contractNumber}</span>
              </div>
            </div>
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl border ${
              contract.status === 'ساري وموثق' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
              contract.status === 'مرفوض' ? 'bg-red-50 text-red-800 border-red-200' :
              'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              {contract.status}
            </span>
          </div>

          <div className="space-y-2 text-xs text-slate-700 font-medium bg-[#FAF7F2] p-4 rounded-2xl border border-[#E8E2D8]">
            <div className="flex justify-between font-bold">
              <span>قيمة العقد الإجمالية:</span>
              <span className="text-[#1C3022] font-black">{contract.totalValue}</span>
            </div>
            <div className="space-y-1 pt-2">
              <span className="text-[11px] font-black text-[#1C3022] block">البنود والشروط الأساسية:</span>
              <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px]">
                {contract.termsSummary?.map((term, i) => (
                  <li key={i}>{term}</li>
                ))}
              </ul>
            </div>
          </div>

          {contract.status !== 'ساري وموثق' && (
            <div className="space-y-4 pt-2">
              {/* Step 1: Download contract template */}
              {contract.pdfUrl && (
                <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E8E2D8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-black text-[#1C3022] block">الخطوة 1: تحميل مسودة العقد المعتمدة</span>
                    <span className="text-[10px] text-slate-500 font-bold">قم بتحميل مسودة العقد، قراءتها، وتوقيعها يدوياً.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadFile(contract.pdfUrl || '', 'مسودة_العقد.pdf')}
                    className="bg-[#1C3022] text-white hover:bg-[#122116] px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all shrink-0 self-start sm:self-auto"
                  >
                    <Download className="w-4 h-4 text-[#C5B198]" />
                    <span>تحميل مسودة العقد</span>
                  </button>
                </div>
              )}

              {/* Step 2: Upload signed contract */}
              <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E8E2D8] space-y-2.5 text-xs">
                <span className="font-black text-[#1C3022] block">الخطوة 2: إرفاق العقد بعد التوقيع اليدوي (PDF / صور) *</span>
                
                {clientSignedDoc ? (
                  <div className="p-2.5 bg-white rounded-xl border border-[#E8E2D8] flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span className="font-bold text-[#1C3022] truncate">{clientSignedDoc.fileName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setClientSignedDoc(null)}
                      className="text-[10px] text-red-600 hover:text-red-800 font-black px-2 py-1 bg-red-50 rounded-md transition-colors"
                    >
                      حذف وإعادة إرفاق
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-[#C5B198] bg-white p-4 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50/50 transition-all text-center">
                    <UploadCloud className="w-6 h-6 text-[#C5B198] mb-1" />
                    <span className="text-xs font-black text-[#1C3022]">إرفاق العقد الموقع يدوياً من جهازك</span>
                    <span className="text-[10px] text-slate-400">انقر لاختيار ملف العقد الموقع (PDF)</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={handleClientSignedUpload}
                    />
                  </label>
                )}
              </div>

              {/* Remarks/Notes */}
              <div>
                <label className="block text-[11px] font-black text-[#1C3022] mb-1">ملاحظات العميل على العقد (اختياري عند القبول، إلزامي عند الرفض):</label>
                <textarea
                  rows={2}
                  value={contractNotes}
                  onChange={e => setContractNotes(e.target.value)}
                  placeholder="اكتب أي ملاحظات أو تعديلات مطلوبة على العقد..."
                  className="w-full bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl p-3 text-xs font-medium outline-none focus:ring-2 focus:ring-[#C5B198] resize-none"
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isSubmittingContract || !clientSignedDoc}
                  onClick={() => handleContractDecision('accept')}
                  className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 rounded-xl text-xs font-black transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>إرسال العقد الموقع وتفعيل المشروع</span>
                </button>
                <button
                  type="button"
                  disabled={isSubmittingContract || !contractNotes.trim()}
                  onClick={() => handleContractDecision('reject')}
                  className="flex-1 bg-red-700 hover:bg-red-800 text-white py-2.5 rounded-xl text-xs font-black transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>رفض العقد (طلب تعديل/عقد جديد)</span>
                </button>
              </div>
            </div>
          )}

          {contract.status === 'ساري وموثق' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-900 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>تم اعتماد هذا العقد بنجاح وأصبح المشروع مكتملاً وموثقاً.</span>
            </div>
          )}
        </div>
      )}

      {/* Contracts & Agreements Card */}
      <div className="bg-white rounded-[2rem] p-6 border border-[#E8E2D8] shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE1]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#EFE7DC] flex items-center justify-center text-[#1C3022]">
              <FileCheck className="w-4 h-4 text-[#C5B198]" />
            </div>
            <div>
              <h3 className="font-black text-sm text-[#1C3022]">العقود والاتفاقيات والمخططات</h3>
              <span className="text-[10px] text-slate-400">سجل بجميع العقود ومسوداتها المرفقة بالمشروع</span>
            </div>
          </div>
        </div>

        {project.contracts && project.contracts.length > 0 ? (
          <div className="space-y-3">
            {project.contracts.map((c) => (
              <div 
                key={c.id} 
                className="bg-[#FAF7F2] border border-[#E8E2D8] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#C5B198] transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-[#1C3022]">{c.title || 'عقد مشروع المقاولة'}</span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                      c.status === 'ساري وموثق' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                      c.status === 'مرفوض' ? 'bg-red-50 text-red-800 border-red-200' :
                      'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 font-bold flex-wrap">
                    <span>رقم العقد: {c.contractNumber}</span>
                    <span>•</span>
                    <span>القيمة الإجمالية: {c.totalValue}</span>
                    {c.clientSignedDate && (
                      <>
                        <span>•</span>
                        <span>تاريخ التوقيع: {c.clientSignedDate}</span>
                      </>
                    )}
                  </div>
                </div>

                {c.pdfUrl && (
                  <button
                    type="button"
                    onClick={() => downloadFile(c.pdfUrl || '', `${c.title || 'عقد'}_رقم_${c.contractNumber}.pdf`)}
                    className="bg-white hover:bg-[#EFE7DC] text-[#1C3022] px-3.5 py-2 rounded-xl border border-[#E8E2D8] shadow-xs text-xs font-black flex items-center gap-1.5 transition-all self-start sm:self-auto shrink-0"
                  >
                    <Download className="w-4 h-4 text-[#C5B198]" />
                    <span>تحميل نسخة العقد ({c.status === 'ساري وموثق' ? 'موقع وثابت' : 'مسودة للطباعة والتوقيع'})</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-5 bg-[#FAF7F2] rounded-2xl border border-[#E8E2D8] text-center text-slate-400 font-bold text-xs">
            لا توجد عقود مدرجة في سجل المشروع حالياً.
          </div>
        )}
      </div>

      {/* Official Contracts & Technical Documents Card (Requirement 7) */}
      <div className="bg-white rounded-[2rem] p-6 border border-[#E8E2D8] shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE1]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#EFE7DC] flex items-center justify-center text-[#1C3022]">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-[#1C3022]">ملفات العقود والوثائق الرسمية</h3>
              <span className="text-[10px] text-slate-400">تحميل المستندات والمخططات المعتمدة وتنزيلها</span>
            </div>
          </div>
        </div>

        {project.documents && project.documents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {project.documents.map((doc) => (
              <div 
                key={doc.id} 
                className="bg-[#FAF7F2] border border-[#E8E2D8] rounded-2xl p-4 flex items-center justify-between gap-3 hover:border-[#C5B198] transition-all"
              >
                <div className="min-w-0">
                  <span className="text-[10px] font-black text-[#A99379] block mb-0.5">تاريخ الرفع: {doc.uploadedAt}</span>
                  <h4 className="text-xs font-black text-[#1C3022] truncate" title={doc.name}>
                    {doc.name}
                  </h4>
                  <span className="text-[9px] text-slate-400 block font-bold mt-1">
                    {doc.fileSize ? `الحجم: ${doc.fileSize}` : 'ملف معتمد'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => downloadFile(doc.fileUrl, doc.fileName || `${doc.name}.pdf`)}
                  className="bg-white hover:bg-[#EFE7DC] text-[#1C3022] p-2.5 rounded-xl border border-[#E8E2D8] shadow-xs shrink-0 transition-colors"
                  title="تحميل الملف"
                >
                  <Download className="w-4 h-4 text-[#A99379]" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-5 bg-[#FAF7F2] rounded-2xl border border-[#E8E2D8] text-center text-slate-400 font-bold text-xs">
            لا توجد وثائق أو عقود رسمية مرفوعة للمشروع حالياً.
          </div>
        )}
      </div>

      {/* Project Stages Gallery */}
      <div className="bg-white rounded-[2rem] p-6 border border-[#E8E2D8] shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-sm text-[#1C3022]">صور ومخططات المشروع</h3>
          <span className="text-[11px] text-[#C5B198] font-bold">تحديثات ميدانية</span>
        </div>

        {/* Stage Selector Pills */}
        <div className="flex gap-2 bg-[#FAF7F2] p-2 rounded-[1.5rem] border border-[#E8E2D8] overflow-x-auto no-scrollbar">
          {(['before', 'progress50', 'after', 'plans'] as const).map(stage => (
            <button
              key={stage}
              onClick={() => setActiveStage(stage)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-[11px] font-black whitespace-nowrap transition-all ${
                activeStage === stage 
                  ? 'bg-[#D0A97E] text-[#1C3022] shadow-sm' 
                  : 'text-slate-400 hover:text-[#C5B198] hover:bg-[#EFE7DC]'
              }`}
            >
              {stageLabels[stage]}
            </button>
          ))}
        </div>

        {/* Stage Images */}
        <div className="grid grid-cols-2 gap-3">
          {project.images[activeStage]?.length > 0 ? (
            project.images[activeStage].map((imgUrl, idx) => (
              <div key={idx} className="h-36 rounded-[1.25rem] overflow-hidden border border-[#E8E2D8] relative group bg-[#FAF7F2]">
                <img 
                  src={imgUrl} 
                  alt={`${project.title} - ${stageLabels[activeStage]}`} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
              </div>
            ))
          ) : (
            <div className="col-span-2 py-10 text-center text-xs text-slate-400 font-bold bg-[#FAF7F2] rounded-[1.5rem] border border-[#E8E2D8] border-dashed">
              لا توجد صور مضافة لهذه المرحلة بعد
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Profile View
// -------------------------------------------------------------
function ProfileView({
  user,
  projects,
  clients = [],
  isSupervisor,
  onLogout,
  onRequestDeleteAccount,
  onUpdateUser,
  onSelectClientProjects,
  onOpenSupportModal
}: {
  user: User;
  projects: Project[];
  clients?: User[];
  isSupervisor?: boolean;
  onLogout: () => void;
  onRequestDeleteAccount: () => void;
  onUpdateUser: (u: User) => void;
  onSelectClientProjects?: (clientId: string) => void;
  onOpenSupportModal: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showClientsModal, setShowClientsModal] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const updatedUser: User = {
      ...user,
      name,
      email,
      phone: phone.trim() || undefined
    };
    try {
      await UserService.saveUser(updatedUser);
      onUpdateUser(updatedUser);
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating user profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-[#F4EFE6] rounded-[2rem] p-6 border-none shadow-sm flex items-center gap-4">
        <div className="w-[72px] h-[72px] bg-slate-200 rounded-full flex items-center justify-center text-slate-500 overflow-hidden shrink-0">
          {user.photoURL ? (
            <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <UserIcon className="w-8 h-8" />
          )}
        </div>
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-[#1C3022]">{user.name}</h2>
            <div className="w-5 h-5 bg-[#E8E2D8] rounded-full flex items-center justify-center text-[#1C3022]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            </div>
            {isSupervisor && (
              <span className="bg-[#1C3022] text-[#C5B198] text-[10px] font-black px-2 py-0.5 rounded-md">
                مشرف
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-bold mt-0.5" dir="ltr">{user.email || user.phone}</p>
        </div>
      </div>

      {/* Account Info Details */}
      <div className="bg-white rounded-[2rem] p-6 border border-[#E8E2D8] shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D8]">
          <h3 className="text-sm font-black text-[#1C3022]">بيانات الحساب</h3>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs font-black text-[#A99379] hover:text-[#1C3022] flex items-center gap-1 transition-colors"
          >
            {isEditing ? 'إلغاء' : 'تعديل رقم الجوال'}
          </button>
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-4">
            {/* View-Only Name Field */}
            <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#E8E2D8]/80">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-black text-slate-500">الاسم الكامل</span>
                <span className="text-[9px] font-bold text-slate-400 bg-black/5 px-2 py-0.5 rounded-full">للاطلاع فقط</span>
              </div>
              <p className="text-xs font-black text-[#1C3022]">{user.name}</p>
            </div>

            {/* View-Only Email Field */}
            <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#E8E2D8]/80">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-black text-slate-500">البريد الإلكتروني</span>
                <span className="text-[9px] font-bold text-slate-400 bg-black/5 px-2 py-0.5 rounded-full">للاطلاع فقط</span>
              </div>
              <p className="text-xs font-black text-[#1C3022]" dir="ltr">{user.email || 'غير مسجل'}</p>
            </div>

            {/* Editable Phone Field */}
            <div>
              <label className="block text-[11px] font-black text-[#1C3022] mb-1.5">رقم الجوال (قابل للتعديل)</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="05XXXXXXXX"
                maxLength={10}
                className="w-full bg-[#FAF7F2] border border-[#E8E2D8] rounded-xl p-3 text-xs font-black text-[#1C3022] outline-none focus:border-[#C5B198] focus:ring-1 focus:ring-[#C5B198]"
                dir="ltr"
              />
              <span className="text-[10px] text-slate-400 font-bold block mt-1">
                مثال: 0512345678
              </span>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-[#1C3022] text-white py-3.5 rounded-xl font-black text-xs hover:bg-[#122116] flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm disabled:opacity-50"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C5B198]" />}
              <span>حفظ رقم الجوال</span>
            </button>
          </form>
        ) : (
          <div className="space-y-4 text-sm font-bold">
            <div className="flex justify-between py-2 border-b border-[#E8E2D8]">
              <span className="text-slate-500">الاسم الكامل</span>
              <span className="text-[#1C3022]">{user.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#E8E2D8]">
              <span className="text-slate-500">البريد الإلكتروني</span>
              <span className="text-[#1C3022]" dir="ltr">{user.email || 'غير مسجل'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#E8E2D8]">
              <span className="text-slate-500">رقم الجوال</span>
              <span className="text-[#1C3022]" dir="ltr">{user.phone || 'غير مسجل'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">نوع الحساب</span>
              <span className="text-[#1C3022]">{isSupervisor ? 'مشرف عام النظام' : 'عميل'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Customer Support Direct Chat Button */}
      {!isSupervisor && (
        <button
          type="button"
          onClick={onOpenSupportModal}
          className="w-full bg-[#1C3022] hover:bg-[#122116] text-white py-3 px-4 rounded-2xl font-black text-xs flex items-center justify-between shadow-sm transition-all active:scale-[0.98] border border-[#C5B198]/30 group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#C5B198] text-[#1C3022] flex items-center justify-center font-black shadow-sm group-hover:scale-105 transition-transform">
              <Headphones className="w-4 h-4" />
            </div>
            <div className="text-right">
              <span className="font-black text-xs text-white block">خدمة العملاء (محادثة فورية)</span>
              <span className="text-[10px] text-[#C5B198] font-bold block">تواصل مباشر مع الدعم الفني</span>
            </div>
          </div>
          <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-[#C5B198] group-hover:translate-x-[-2px] transition-transform">
            <ChevronLeft className="w-3.5 h-3.5" />
          </div>
        </button>
      )}

      {/* Supervisor: Clean and Compact Clients Directory Button */}
      {isSupervisor && (
        <button
          type="button"
          onClick={() => setShowClientsModal(true)}
          className="w-full bg-[#1C3022] hover:bg-[#122116] text-white py-2.5 px-4 rounded-2xl font-black text-xs flex items-center justify-between shadow-sm transition-all active:scale-[0.98] border border-[#C5B198]/30 group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-[#C5B198] text-[#1C3022] flex items-center justify-center font-black shadow-sm group-hover:scale-105 transition-transform">
              <Users className="w-3.5 h-3.5" />
            </div>
            <span className="font-black text-xs text-white">العملاء</span>
          </div>
          <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-[#C5B198] group-hover:translate-x-[-2px] transition-transform">
            <ChevronLeft className="w-3.5 h-3.5" />
          </div>
        </button>
      )}

      {/* Danger Zone: Delete Account & Logout */}
      <div className="space-y-2.5 pt-2">
        <button
          onClick={onLogout}
          className="w-full bg-white border border-[#E8E2D8] text-slate-700 py-3 rounded-2xl font-black text-xs hover:bg-[#FAF7F2] flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm"
        >
          <LogOut className="w-4 h-4 text-slate-500" />
          <span>تسجيل الخروج</span>
        </button>

        {/* Delete Account button is NOT visible to the supervisor */}
        {!isSupervisor && (
          <button
            onClick={onRequestDeleteAccount}
            className="w-full bg-red-50 border border-red-200 text-red-700 py-2.5 rounded-2xl font-black text-xs hover:bg-red-100 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
            <span>حذف الحساب والبيانات نهائياً</span>
          </button>
        )}
      </div>

      {/* Social Media Channels (Compact & at the Very Bottom) */}
      <div className="pt-3 pb-1 border-t border-[#E8E2D8]/60 flex flex-col items-center justify-center gap-2">
        <span className="text-[11px] font-bold text-slate-500">
          تابع نماذج التميز
        </span>
        
        <div className="flex items-center justify-center gap-2.5">
          {/* TikTok Small Icon */}
          <a
            href="https://www.tiktok.com/@models_of_excellence?_r=1&_t=ZS-98f5Rfgof5A"
            target="_blank"
            rel="noreferrer"
            className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-sm group"
            title="تيك توك"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.86 4.43V10.74a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-.04-2.17z"/>
            </svg>
          </a>

          {/* Instagram Small Icon */}
          <a
            href="https://www.instagram.com/models_of_excellence?igsh=Yml2cGFoeHp1eXds&utm_source=qr"
            target="_blank"
            rel="noreferrer"
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-600 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-sm group"
            title="انستغرام"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </a>

          {/* X (Twitter) Small Icon */}
          <a
            href="https://x.com/modelsexcelence?s=21&t=wGA1XXTxXGN_bY17hMAAqw"
            target="_blank"
            rel="noreferrer"
            className="w-8 h-8 rounded-full bg-[#0f1419] text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-sm group"
            title="منصة X"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
        </div>
      </div>

      {/* Clients Directory Modal */}
      {isSupervisor && (
        <ClientsDirectoryModal
          isOpen={showClientsModal}
          onClose={() => setShowClientsModal(false)}
          clients={clients}
        />
      )}
    </div>
  );
}
