import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User as FirebaseUser, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, query, where, orderBy, addDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const placeholderPatterns = [
  'placeholder',
  'remixed',
  'your-api-key',
  'your-project-id',
  'your-app-id',
  'your-auth-domain',
  'your-storage-bucket',
  'your-messaging-sender-id',
  'your-measurement-id',
  'example',
  'demo',
  'changeme',
];

function isPlaceholderValue(value: string | undefined) {
  if (!value) return true;
  const normalized = value.toLowerCase().trim();
  return placeholderPatterns.some((pattern) => normalized.includes(pattern));
}

// Detect if Firebase setup has been completed with valid keys
export const isFirebaseMode =
  !!firebaseConfig.apiKey &&
  !!firebaseConfig.projectId &&
  !!firebaseConfig.appId &&
  !!firebaseConfig.authDomain &&
  !isPlaceholderValue(firebaseConfig.apiKey) &&
  !isPlaceholderValue(firebaseConfig.projectId) &&
  !isPlaceholderValue(firebaseConfig.appId) &&
  !isPlaceholderValue(firebaseConfig.authDomain);

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
}

// Helper to load local user accounts
const getLocalUsers = (): UserProfile[] => {
  const data = localStorage.getItem('dacrib_local_users');
  return data ? JSON.parse(data) : [];
};

const saveLocalUser = (user: UserProfile) => {
  const users = getLocalUsers();
  users.push(user);
  localStorage.setItem('dacrib_local_users', JSON.stringify(users));
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
  allOrders.push(order);
  localStorage.setItem('dacrib_local_orders', JSON.stringify(allOrders));
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
      return profile;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  // Local storage fallback fallback
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
        return snap.data() as UserProfile;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
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
    } catch (err) {
      // If it fails because of missing indexes or something, fallback to unindexed list or local
      console.warn("Firestore fetch failed, checking local storage as fallback:", err);
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
      return orderId;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
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
    } catch (err) {
      console.warn("Firestore fetchAllOrders failed, checking local storage:", err);
    }
  }

  // Local fallback
  const data = localStorage.getItem('dacrib_local_orders');
  const allOrders: PastOrder[] = data ? JSON.parse(data) : [];
  return allOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Update order status (for Owner dashboard)
export async function updateOrderStatus(orderId: string, status: PastOrder['status'] | string): Promise<void> {
  if (isFirebaseMode && db) {
    const path = `orders/${orderId}`;
    try {
      await setDoc(doc(db, 'orders', orderId), { status }, { merge: true });
      return;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  // Local fallback
  const data = localStorage.getItem('dacrib_local_orders');
  let allOrders: PastOrder[] = data ? JSON.parse(data) : [];
  allOrders = allOrders.map(o => o.orderId === orderId ? { ...o, status: status as any } : o);
  localStorage.setItem('dacrib_local_orders', JSON.stringify(allOrders));
}

// Submit rating and review feedback for a completed order
export async function submitOrderFeedback(orderId: string, rating: number, review: string): Promise<void> {
  if (isFirebaseMode && db) {
    const path = `orders/${orderId}`;
    try {
      await setDoc(doc(db, 'orders', orderId), { rating, review }, { merge: true });
      return;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  // Local fallback
  const data = localStorage.getItem('dacrib_local_orders');
  let allOrders: PastOrder[] = data ? JSON.parse(data) : [];
  allOrders = allOrders.map(o => o.orderId === orderId ? { ...o, rating, review } : o);
  localStorage.setItem('dacrib_local_orders', JSON.stringify(allOrders));
}

