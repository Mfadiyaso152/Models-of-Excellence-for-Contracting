import { db, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, deleteDoc } from '../firebase';
import { User, Project, QuoteRequest, ProjectStatus } from '../types';

// Helper to remove undefined properties recursively so Firestore does not throw errors
function cleanForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanForFirestore(item)) as any;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanForFirestore(value);
      }
    }
    return cleaned;
  }
  return obj;
}

// User Service
export const UserService = {
  // Get user by ID (UID) from Firestore
  async getUserById(userId: string): Promise<User | null> {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        return userSnap.data() as User;
      }
      return null;
    } catch (error) {
      console.warn('Firestore getUserById:', error);
      return null;
    }
  },

  // Get user by email from Firestore
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data() as User;
      }
      return null;
    } catch (error) {
      console.warn('Firestore getUserByEmail:', error);
      return null;
    }
  },

  // Get user by phone number from Firestore (backward compatibility)
  async getUserByPhone(phone: string): Promise<User | null> {
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const userRef = doc(db, 'users', cleanPhone);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        return userSnap.data() as User;
      }
      return null;
    } catch (error) {
      console.warn('Firestore getUserByPhone:', error);
      return null;
    }
  },

  // Save or update user profile using user ID
  async saveUser(user: User): Promise<void> {
    try {
      const userRef = doc(db, 'users', user.id);
      const cleanedData = cleanForFirestore(user);
      await setDoc(userRef, cleanedData, { merge: true });
    } catch (error) {
      console.warn('Firestore saveUser error:', error);
      throw error;
    }
  },

  // Get all users (Admin/Supervisor view)
  async getAllUsers(): Promise<User[]> {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const users: User[] = [];
      querySnapshot.forEach((docSnap) => {
        users.push(docSnap.data() as User);
      });
      return users;
    } catch (error) {
      console.warn('Firestore getAllUsers error:', error);
      return [];
    }
  },

  // Delete user document and associated user data
  async deleteUser(userId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);

      // Clean up user's projects
      try {
        const userProjects = await ProjectService.getProjectsForUser(userId);
        for (const p of userProjects) {
          await ProjectService.deleteProject(p.id);
        }
      } catch (pErr) {
        console.warn('Error deleting user projects:', pErr);
      }

      // Clean up user's quote requests
      try {
        const userQuotes = await ProjectService.getQuotesForUser(userId);
        for (const q of userQuotes) {
          await ProjectService.deleteQuoteRequest(q.id);
        }
      } catch (qErr) {
        console.warn('Error deleting user quotes:', qErr);
      }
    } catch (error) {
      console.warn('Firestore deleteUser error:', error);
      throw error;
    }
  },

  // Purge all users except supervisor
  async purgeNonSupervisorUsers(supervisorEmail: string): Promise<number> {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      let deletedCount = 0;
      const deletePromises: Promise<void>[] = [];
      querySnapshot.forEach((docSnap) => {
        const u = docSnap.data() as User;
        if (!u.email || u.email.trim().toLowerCase() !== supervisorEmail.trim().toLowerCase()) {
          deletePromises.push(deleteDoc(docSnap.ref));
          deletedCount++;
        }
      });
      await Promise.all(deletePromises);
      return deletedCount;
    } catch (error) {
      console.warn('Firestore purgeNonSupervisorUsers error:', error);
      return 0;
    }
  }
};

// Project Service
export const ProjectService = {
  // Purge all projects in system
  async purgeAllProjects(): Promise<number> {
    try {
      const querySnapshot = await getDocs(collection(db, 'projects'));
      let count = 0;
      const deletePromises: Promise<void>[] = [];
      querySnapshot.forEach((docSnap) => {
        deletePromises.push(deleteDoc(docSnap.ref));
        count++;
      });
      await Promise.all(deletePromises);
      return count;
    } catch (error) {
      console.warn('Firestore purgeAllProjects error:', error);
      return 0;
    }
  },
  // Fetch all projects in system (Admin/Supervisor view)
  async getAllProjects(): Promise<Project[]> {
    try {
      const querySnapshot = await getDocs(collection(db, 'projects'));
      const projects: Project[] = [];
      querySnapshot.forEach((docSnap) => {
        projects.push(docSnap.data() as Project);
      });
      return projects;
    } catch (error) {
      console.warn('Firestore getAllProjects error:', error);
      return [];
    }
  },

  // Fetch projects specifically belonging to a client user from Firestore
  async getProjectsForUser(userId: string): Promise<Project[]> {
    try {
      const q = query(collection(db, 'projects'), where('clientId', '==', userId));
      const querySnapshot = await getDocs(q);
      const projects: Project[] = [];
      querySnapshot.forEach((docSnap) => {
        projects.push(docSnap.data() as Project);
      });
      return projects;
    } catch (error) {
      console.warn('Firestore getProjectsForUser error:', error);
      return [];
    }
  },

  // Save or update a project
  async saveProject(project: Project): Promise<void> {
    try {
      const projRef = doc(db, 'projects', project.id);
      const cleanedData = cleanForFirestore(project);
      await setDoc(projRef, cleanedData, { merge: true });
    } catch (error) {
      console.warn('Firestore saveProject error:', error);
      throw error;
    }
  },

  // Delete a project
  async deleteProject(projectId: string): Promise<void> {
    try {
      const projRef = doc(db, 'projects', projectId);
      await deleteDoc(projRef);
    } catch (error) {
      console.warn('Firestore deleteProject error:', error);
      throw error;
    }
  },

  // Create a new project for a user
  async createNewProject(projectData: Partial<Project> & { clientId: string; title: string; location: string }): Promise<Project> {
    const newProjId = `P-${Math.floor(1000 + Math.random() * 9000)}`;
    const newProject: Project = {
      id: newProjId,
      clientId: projectData.clientId,
      title: projectData.title,
      location: projectData.location,
      progress: projectData.progress || 0,
      status: (projectData.status as ProjectStatus) || 'قيد الانتظار',
      startDate: projectData.startDate || new Date().toISOString().split('T')[0],
      estimatedEndDate: projectData.estimatedEndDate || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      licenseNumber: projectData.licenseNumber || `BL-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      landArea: projectData.landArea || '400 م²',
      builtUpArea: projectData.builtUpArea || '600 م²',
      supervisingEngineer: projectData.supervisingEngineer || {
        name: 'م. فهد بن عبد العزيز السالم',
        phone: '0551239874',
        title: 'مهندس إنشائي ومشرف موقع معتمد'
      },
      phases: projectData.phases || [
        { id: 'PH-1', title: 'أعمال الحفر والإحلال وصب النظافة', progress: 0, status: 'قيد الانتظار' },
        { id: 'PH-2', title: 'القواعد والرقاب والميد الأرضية', progress: 0, status: 'قيد الانتظار' },
        { id: 'PH-3', title: 'أعمدة وأسقف الدور الأرضي والأول', progress: 0, status: 'قيد الانتظار' },
        { id: 'PH-4', title: 'أعمال المباني والعوازل المائية والحرارية', progress: 0, status: 'قيد الانتظار' },
        { id: 'PH-5', title: 'التأسيسات الكهروميكانيكية (سباكة وكهرباء)', progress: 0, status: 'قيد الانتظار' },
        { id: 'PH-6', title: 'اللياسة والدهانات والتشطيبات النهائية', progress: 0, status: 'قيد الانتظار' }
      ],
      contracts: projectData.contracts || [],
      engineerRequests: projectData.engineerRequests || [],
      images: projectData.images || {
        before: [],
        progress50: [],
        after: [],
        plans: [],
        officialPapers: []
      },
      installments: projectData.installments || []
    };

    await ProjectService.saveProject(newProject);
    return newProject;
  },

  // Save a new quote request or update an existing one in Firestore
  async saveQuoteRequest(quote: QuoteRequest): Promise<void> {
    try {
      const quoteRef = doc(db, 'quotes', quote.id);
      const cleanedData = cleanForFirestore(quote);
      await setDoc(quoteRef, cleanedData, { merge: true });
    } catch (error) {
      console.warn('Firestore saveQuoteRequest error:', error);
      throw error;
    }
  },

  // Get all quote requests (Admin view)
  async getAllQuotes(): Promise<QuoteRequest[]> {
    try {
      const querySnapshot = await getDocs(collection(db, 'quotes'));
      const quotes: QuoteRequest[] = [];
      querySnapshot.forEach((docSnap) => {
        quotes.push(docSnap.data() as QuoteRequest);
      });
      return quotes;
    } catch (error) {
      console.warn('Firestore getAllQuotes error:', error);
      return [];
    }
  },

  // Get quote requests for a specific client
  async getQuotesForUser(clientId: string): Promise<QuoteRequest[]> {
    try {
      const q = query(collection(db, 'quotes'), where('clientId', '==', clientId));
      const querySnapshot = await getDocs(q);
      const quotes: QuoteRequest[] = [];
      querySnapshot.forEach((docSnap) => {
        quotes.push(docSnap.data() as QuoteRequest);
      });
      return quotes;
    } catch (error) {
      console.warn('Firestore getQuotesForUser error, falling back to client filter:', error);
      // Fallback: fetch all and filter client side
      const all = await ProjectService.getAllQuotes();
      return all.filter(q => q.clientId === clientId);
    }
  },

  // Delete a quote request
  async deleteQuoteRequest(quoteId: string): Promise<void> {
    try {
      const quoteRef = doc(db, 'quotes', quoteId);
      await deleteDoc(quoteRef);
    } catch (error) {
      console.warn('Firestore deleteQuoteRequest error:', error);
      throw error;
    }
  }
};
