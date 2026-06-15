import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User as FirebaseUser, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, query, where, orderBy,addDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

// Detect if Firebase setup has been completed with valid keys
export const isFirebaseMode = 
  firebaseConfig.apiKey && 
  !firebaseConfig.apiKey.includes('placeholder') && 
  firebaseConfig.projectId && 
  !firebaseConfig.projectId.includes('placeholder');

let app;
let db: any = null;
let auth: any = null;

if (isFirebaseMode) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
    auth = getAuth(app);
    console.log("🔥 Firebase initialized in cloud connected mode.");
  } catch (error) {
    console.error("Failed to initialize Firebase SDK, falling back to local storage:", error);
  }
} else {
  console.log("📂 Firebase config is placeholder. Operating in high-fidelity localStorage mode.");
}

export { db, auth };

// Firestore Hardened Error Handler from the Firebase Integration Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentAuth = auth;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuth?.currentUser?.uid,
      email: currentAuth?.currentUser?.email,
      emailVerified: currentAuth?.currentUser?.emailVerified,
      isAnonymous: currentAuth?.currentUser?.isAnonymous,
      tenantId: currentAuth?.currentUser?.tenantId,
    },
    operationType,
    path
  };
  console.error('Firestore Error Details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Global Interfaces for Dual-Mode Account
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface PastOrder {
  orderId: string;
  userId: string;
  customerName: string;
  items: Array<{
    name: string;
    computedPrice: number;
    category: string;
    selectedSides?: string[];
    pastaBase?: string;
    wingFlavors?: string[];
  }>;
  subtotal: number;
  deliveryFee: number;
  grandTotal: number;
  orderType: 'pickup' | 'delivery';
  scheduledTime: string;
  preferredPayment: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
  rating?: number;
  review?: string;
  trackingInfo?: string;
}

// Helper to load local user accounts
const getLocalUsers = (): UserProfile[] => {
  const data = localStorage.getItem('dacrib_local_users');
  return data ? JSON.parse(data) : [];
};

const saveLocalUser = (user: UserProfile) => {
  const users = getLocalUsers();
  // Avoid duplicate entries
  const filtered = users.filter(u => u.uid !== user.uid);
  filtered.push(user);
  localStorage.setItem('dacrib_local_users', JSON.stringify(filtered));
};

// Helper for local orders
export const getLocalOrders = (userId: string): PastOrder[] => {
  const data = localStorage.getItem('dacrib_local_orders');
  const allOrders: PastOrder[] = data ? JSON.parse(data) : [];
  return allOrders.filter(o => o.userId === userId);
};

export const saveLocalOrder = (order: PastOrder) => {
  const data = localStorage.getItem('dacrib_local_orders');
  const allOrders: PastOrder[] = data ? JSON.parse(data) : [];
  const filtered = allOrders.filter(o => o.orderId !== order.orderId);
  filtered.push(order);
  localStorage.setItem('dacrib_local_orders', JSON.stringify(filtered));
};

// Unified registration function
export async function registerProfile(email: string, displayName: string, uid: string): Promise<UserProfile> {
  const profile: UserProfile = {
    uid,
    email,
    displayName: displayName || email.split('@')[0],
    createdAt: new Date().toISOString()
  };

  if (isFirebaseMode && db) {
    const path = `users/${uid}`;
    try {
      await setDoc(doc(db, 'users', uid), profile);
      saveLocalUser(profile);
      return profile;
    } catch (err: any) {
      console.warn("Firestore registration failed, using localStorage fallback:", err);
      const errStr = err instanceof Error ? err.message : String(err);
      const isPermissionErr = errStr.toLowerCase().includes('permission') || err.code === 'permission-denied';
      if (isPermissionErr) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
  }

  // Local storage fallback
  saveLocalUser(profile);
  return profile;
}

// Get user profile
export async function getUserProfile(uid: string, defaultEmail: string): Promise<UserProfile> {
  if (isFirebaseMode && db) {
    const path = `users/${uid}`;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const uProfile = snap.data() as UserProfile;
        saveLocalUser(uProfile);
        return uProfile;
      }
    } catch (err: any) {
      console.warn("Firestore getUserProfile failed, checking localStorage fallback:", err);
      const errStr = err instanceof Error ? err.message : String(err);
      const isPermissionErr = errStr.toLowerCase().includes('permission') || err.code === 'permission-denied';
      if (isPermissionErr) {
        handleFirestoreError(err, OperationType.GET, path);
      }
    }
  }

  // Local fallback
  const localUsers = getLocalUsers();
  const found = localUsers.find(u => u.uid === uid);
  if (found) return found;

  const newProfile = {
    uid,
    email: defaultEmail,
    displayName: defaultEmail.split('@')[0],
    createdAt: new Date().toISOString()
  };
  saveLocalUser(newProfile);
  return newProfile;
}

// Fetch user orders
export async function fetchUserOrders(userId: string): Promise<PastOrder[]> {
  if (isFirebaseMode && db) {
    const path = 'orders';
    try {
      const qRef = query(
        collection(db, path),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(qRef);
      const orders: PastOrder[] = [];
      snap.forEach(d => {
        orders.push({ orderId: d.id, ...d.data() } as PastOrder);
      });
      return orders;
    } catch (err: any) {
      console.warn("Firestore fetchUserOrders failed, checking localStorage fallback:", err);
      const errStr = err instanceof Error ? err.message : String(err);
      const isPermissionErr = errStr.toLowerCase().includes('permission') || err.code === 'permission-denied';
      if (isPermissionErr) {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    }
  }

  // Local fallback
  return getLocalOrders(userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Save newly placed order
export async function placeUserOrder(orderData: Omit<PastOrder, 'orderId'>): Promise<string> {
  const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
  const finalOrder: PastOrder = { ...orderData, orderId };

  if (isFirebaseMode && db) {
    const path = 'orders';
    try {
      await setDoc(doc(db, 'orders', orderId), finalOrder);
      saveLocalOrder(finalOrder);
      return orderId;
    } catch (err: any) {
      console.warn("Firestore placeUserOrder failed, using localStorage fallback:", err);
      const errStr = err instanceof Error ? err.message : String(err);
      const isPermissionErr = errStr.toLowerCase().includes('permission') || err.code === 'permission-denied';
      if (isPermissionErr) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
  }

  // Local placement
  saveLocalOrder(finalOrder);
  return orderId;
}

// Fetch all orders (for Owner dashboard)
export async function fetchAllOrders(): Promise<PastOrder[]> {
  if (isFirebaseMode && db) {
    const path = 'orders';
    try {
      const qRef = query(
        collection(db, path),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(qRef);
      const orders: PastOrder[] = [];
      snap.forEach(d => {
        orders.push({ orderId: d.id, ...d.data() } as PastOrder);
      });
      return orders;
    } catch (err: any) {
      console.warn("Firestore fetchAllOrders failed, using localStorage fallback:", err);
      const errStr = err instanceof Error ? err.message : String(err);
      const isPermissionErr = errStr.toLowerCase().includes('permission') || err.code === 'permission-denied';
      if (isPermissionErr) {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    }
  }

  // Local fallback
  const data = localStorage.getItem('dacrib_local_orders');
  const allOrders: PastOrder[] = data ? JSON.parse(data) : [];
  return allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Update order status (for Owner dashboard)
export async function updateOrderStatus(
  orderId: string, 
  status: PastOrder['status'] | string, 
  trackingInfo?: string
): Promise<void> {
  const updatePayload: any = { status };
  if (trackingInfo !== undefined) {
    updatePayload.trackingInfo = trackingInfo;
  }

  if (isFirebaseMode && db) {
    const path = `orders/${orderId}`;
    try {
      await setDoc(doc(db, 'orders', orderId), updatePayload, { merge: true });
      
      const data = localStorage.getItem('dacrib_local_orders');
      let allOrders: PastOrder[] = data ? JSON.parse(data) : [];
      allOrders = allOrders.map(o => o.orderId === orderId ? { ...o, ...updatePayload } : o);
      localStorage.setItem('dacrib_local_orders', JSON.stringify(allOrders));
      
      return;
    } catch (err: any) {
      console.warn("Firestore updateOrderStatus failed, using localStorage fallback:", err);
      const errStr = err instanceof Error ? err.message : String(err);
      const isPermissionErr = errStr.toLowerCase().includes('permission') || err.code === 'permission-denied';
      if (isPermissionErr) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
  }

  // Local fallback
  const data = localStorage.getItem('dacrib_local_orders');
  let allOrders: PastOrder[] = data ? JSON.parse(data) : [];
  allOrders = allOrders.map(o => o.orderId === orderId ? { ...o, ...updatePayload } : o);
  localStorage.setItem('dacrib_local_orders', JSON.stringify(allOrders));
}

// Submit rating and review feedback for a completed order
export async function submitOrderFeedback(orderId: string, rating: number, review: string): Promise<void> {
  if (isFirebaseMode && db) {
    const path = `orders/${orderId}`;
    try {
      await setDoc(doc(db, 'orders', orderId), { rating, review }, { merge: true });
      
      const data = localStorage.getItem('dacrib_local_orders');
      let allOrders: PastOrder[] = data ? JSON.parse(data) : [];
      allOrders = allOrders.map(o => o.orderId === orderId ? { ...o, rating, review } : o);
      localStorage.setItem('dacrib_local_orders', JSON.stringify(allOrders));
      
      return;
    } catch (err: any) {
      console.warn("Firestore submitOrderFeedback failed, using localStorage fallback:", err);
      const errStr = err instanceof Error ? err.message : String(err);
      const isPermissionErr = errStr.toLowerCase().includes('permission') || err.code === 'permission-denied';
      if (isPermissionErr) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
  }

  // Local fallback
  const data = localStorage.getItem('dacrib_local_orders');
  let allOrders: PastOrder[] = data ? JSON.parse(data) : [];
  allOrders = allOrders.map(o => o.orderId === orderId ? { ...o, rating, review } : o);
  localStorage.setItem('dacrib_local_orders', JSON.stringify(allOrders));
}

// Google Sign-In helper with Firestore auto-sync and local fallback
export async function signInWithGoogle(): Promise<UserProfile> {
  if (isFirebaseMode && auth) {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const email = user.email || '';
      const uid = user.uid;
      const displayName = user.displayName || email.split('@')[0] || "VIP Member";
      
      // Retrieve or register profile
      const profile = await getUserProfile(uid, email);
      
      // Update with Google display name if empty or default fallback
      if (!profile.displayName || profile.displayName === email.split('@')[0]) {
        profile.displayName = displayName;
        await registerProfile(email, displayName, uid);
      }
      
      return profile;
    } catch (err: any) {
      console.error("Google Sign-In Exception:", err);
      throw err;
    }
  }

  // Local fallback / mock Google mode
  const localUid = 'google-mock-' + Math.floor(100000 + Math.random() * 900000);
  const email = 'vipsoulfood@gmail.com';
  const profile: UserProfile = {
    uid: localUid,
    email: email,
    displayName: "Philly Soul VIP",
    createdAt: new Date().toISOString()
  };
  saveLocalUser(profile);
  return profile;
}


