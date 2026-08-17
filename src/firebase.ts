import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider,
  signInWithPopup,
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { 
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot,
  deleteDoc,
  addDoc,
  orderBy
} from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import firebaseConfigJson from "../firebase-applet-config.json";

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
  ...(firebaseConfigJson.measurementId ? { measurementId: firebaseConfigJson.measurementId } : {})
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize optional Analytics in browser
if (typeof window !== "undefined" && firebaseConfig.measurementId) {
  isSupported().then((supported) => {
    if (supported) {
      try {
        getAnalytics(app);
      } catch (e) {
        console.warn("Firebase analytics init error:", e);
      }
    }
  }).catch(() => {});
}

// Initialize Firestore with auto-detect long polling and multi-tab persistent cache
const firestoreDbId = (firebaseConfigJson.firestoreDatabaseId && firebaseConfigJson.firestoreDatabaseId !== "(default)" && firebaseConfigJson.firestoreDatabaseId.trim() !== "")
  ? firebaseConfigJson.firestoreDatabaseId
  : undefined;

let firestoreInstance;
try {
  const cacheSettings = {
    experimentalAutoDetectLongPolling: true,
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  };
  firestoreInstance = firestoreDbId
    ? initializeFirestore(app, cacheSettings, firestoreDbId)
    : initializeFirestore(app, cacheSettings);
} catch {
  try {
    const basicSettings = {
      experimentalAutoDetectLongPolling: true
    };
    firestoreInstance = firestoreDbId
      ? initializeFirestore(app, basicSettings, firestoreDbId)
      : initializeFirestore(app, basicSettings);
  } catch {
    firestoreInstance = firestoreDbId ? getFirestore(app, firestoreDbId) : getFirestore(app);
  }
}

export const db = firestoreInstance;

export { 
  GoogleAuthProvider,
  signInWithPopup,
  signOut, 
  onAuthStateChanged,
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot,
  deleteDoc,
  addDoc,
  orderBy
};
export type { FirebaseUser };

