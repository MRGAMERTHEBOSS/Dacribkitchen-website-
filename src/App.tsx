import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Phone, 
  Clock, 
  MapPin, 
  ShoppingBag, 
  ChevronRight, 
  Sparkle, 
  Trash2, 
  Check, 
  Plus, 
  Minus, 
  Flame, 
  Info, 
  HelpCircle,
  Truck,
  Store,
  DollarSign,
  Search,
  Star,
  Heart,
  RotateCcw,
  CheckCircle,
  ArrowRight,
  ChevronDown,
  Menu,
  X,
  User,
  History,
  LogOut,
  Key,
  Gift,
  Award,
  Compass,
  Sparkles,
  Download
} from 'lucide-react';

import { CartItem, OrderType, PreferredPayment, OrderTimeType } from './types';
import { entrees, alfredos, salads, wingFlavors, sides, premiumCombos, faqs } from './data';
import { jsPDF } from 'jspdf';
import confetti from 'canvas-confetti';
import lambChopsImage from './Lamb Chops Platter.JPG';
import sauteedSteakImage from './Sautéed Steak.jpg';
import blackenedSalmonImage from './Blackened Salmon Platter.jpg';
import turkeyWingsImage from './Turkey Wings.jpg';
import logoImage from './logo.png';

// Dual-mode authentication & history persistence import
import {
  isFirebaseMode,
  auth,
  UserProfile,
  PastOrder,
  registerProfile,
  getUserProfile,
  fetchUserOrders,
  placeUserOrder,
  fetchAllOrders,
  updateOrderStatus,
  submitOrderFeedback,
  signInWithGoogle
} from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

// Custom interface for featuring items in the interactive Hero arches
interface FeatureArch {
  id: string;
  name: string;
  shortName: string;
  price: number;
  desc: string;
  category: 'entree' | 'alfredo' | 'combo' | 'wings';
  tag: string;
  calories: string;
  // Custom interactive SVG component to draw the food beautifully on the plate
  illustration: () => any;
}



export default function App() {
  // --- GRAB-SWIPE MOBILE SCROLL ENGINE ACCORD ---
  const categoryTabRef = React.useRef<HTMLDivElement>(null);
  const heroCarouselRef = React.useRef<HTMLDivElement>(null);

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchScrollLeft, setTouchScrollLeft] = useState<number>(0);

  const [mouseStartX, setMouseStartX] = useState<number | null>(null);
  const [mouseScrollLeft, setMouseScrollLeft] = useState<number>(0);
  const [isMouseDown, setIsMouseDown] = useState(false);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>, ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return;
    setTouchStartX(e.touches[0].clientX);
    setTouchScrollLeft(ref.current.scrollLeft);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>, ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current || touchStartX === null) return;
    const currentX = e.touches[0].clientX;
    const diffX = touchStartX - currentX;
    ref.current.scrollLeft = touchScrollLeft + diffX;
  };

  const handleTouchEnd = () => {
    setTouchStartX(null);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return;
    setIsMouseDown(true);
    setMouseStartX(e.clientX);
    setMouseScrollLeft(ref.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current || !isMouseDown || mouseStartX === null) return;
    e.preventDefault();
    const currentX = e.clientX;
    const diffX = mouseStartX - currentX;
    ref.current.scrollLeft = mouseScrollLeft + diffX;
  };

  const handleMouseUpOrLeave = () => {
    setIsMouseDown(false);
    setMouseStartX(null);
  };

  // --- DUAL-MODE PERSONAL VIP MEMBER PROFILE STATES ---
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [pastOrders, setPastOrders] = useState<PastOrder[]>([]);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [vipModalOpen, setVipModalOpen] = useState<boolean>(false);
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authName, setAuthName] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState<boolean>(false);

  // --- OWNER STATES & MANAGEMENT ---
  const [allAdminOrders, setAllAdminOrders] = useState<PastOrder[]>([]);
  
  const isOwnerUser = useMemo(() => {
    return currentUser && currentUser.email?.toLowerCase() === 'owner@dacrib.com';
  }, [currentUser]);

  const loadAllAdminOrders = async () => {
    try {
      const ords = await fetchAllOrders();
      setAllAdminOrders(ords);
    } catch (e) {
      console.error("Could not load all admin orders", e);
    }
  };

  useEffect(() => {
    if (isOwnerUser) {
      loadAllAdminOrders();
    }
  }, [isOwnerUser]);

  const handleUpdateStatus = async (orderId: string, newStatus: string, trackingInfo?: string) => {
    try {
      await updateOrderStatus(orderId, newStatus, trackingInfo);
      setSuccessToast(`Order #${orderId} updated! 🍳`);
      setTimeout(() => setSuccessToast(null), 3500);
      loadAllAdminOrders();
      if (currentUser) {
        loadOrders(currentUser.uid);
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  // Load orders for active user
  const loadOrders = async (uid: string) => {
    try {
      const ords = await fetchUserOrders(uid);
      setPastOrders(ords);
    } catch (e) {
      console.error("Could not load user order history", e);
    }
  };

  useEffect(() => {
    const savedProfile = localStorage.getItem('dacrib_currentUserProfile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        setCurrentUser(parsed);
        loadOrders(parsed.uid);
      } catch {
        // ignore
      }
    }

    if (isFirebaseMode && auth) {
      setAuthLoading(true);
      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          try {
            const profile = await getUserProfile(fbUser.uid, fbUser.email || '');
            setCurrentUser(profile);
            localStorage.setItem('dacrib_currentUserProfile', JSON.stringify(profile));
            // Fill customer name from account name automatically if not set!
            setCustomerName(prev => prev || profile.displayName);
            loadOrders(fbUser.uid);
          } catch (err) {
            console.error("Firebase auth profile resolve failed:", err);
          }
        }
        setAuthLoading(false);
      });
      return () => unsubscribe();
    } else {
      setAuthLoading(false);
    }
  }, []);

  // Real-time automatic synchronization of order statuses and tracking details
  useEffect(() => {
    let intervalId: any = null;

    const runSync = () => {
      // If user is logged in, auto pull their latest statuses & tracking info in background
      if (currentUser?.uid) {
        loadOrders(currentUser.uid);
      }
      // If user is the store owner, auto-refresh the master admin booking system queue
      if (isOwnerUser) {
        loadAllAdminOrders();
      }
    };

    // Auto-poll securely once every 4 seconds
    intervalId = setInterval(runSync, 4000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentUser?.uid, isOwnerUser]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!authEmail.includes('@') || authPassword.length < 6) {
      setAuthError("Please provide a valid email and a password of at least 6 characters.");
      return;
    }

    try {
      if (isSignUp) {
        let uid = 'USR-' + Math.floor(100000 + Math.random() * 900000);
        let userEmail = authEmail.trim();
        let name = authName.trim() || userEmail.split('@')[0];

        if (isFirebaseMode && auth) {
          const cred = await createUserWithEmailAndPassword(auth, userEmail, authPassword);
          uid = cred.user.uid;
        }

        const profile = await registerProfile(userEmail, name, uid);
        setCurrentUser(profile);
        localStorage.setItem('dacrib_currentUserProfile', JSON.stringify(profile));
        setCustomerName(profile.displayName);
        loadOrders(uid);
        setSuccessToast("VIP Crib Account Registered! 👑");
        setTimeout(() => setSuccessToast(null), 3000);
        setVipModalOpen(false);
      } else {
        let matchedProfile: UserProfile | null = null;

        if (isFirebaseMode && auth) {
          try {
            const cred = await signInWithEmailAndPassword(auth, authEmail.trim(), authPassword);
            matchedProfile = await getUserProfile(cred.user.uid, cred.user.email || '');
          } catch (signInErr: any) {
            const errCode = signInErr?.code || '';
            const errMsg = signInErr?.message || '';
            const isMissingUserErr = errCode === 'auth/invalid-credential' || errCode === 'auth/user-not-found' || errMsg.includes('invalid-credential') || errMsg.includes('user-not-found');
            
            if (isMissingUserErr) {
              try {
                // Try registering them automatically for seamless testing experience
                const cred = await createUserWithEmailAndPassword(auth, authEmail.trim(), authPassword);
                const displayName = authEmail.trim().split('@')[0] || "VIP Guest";
                matchedProfile = await registerProfile(authEmail.trim(), displayName, cred.user.uid);
              } catch (signUpErr: any) {
                const signUpCode = signUpErr?.code || '';
                if (signUpCode === 'auth/email-already-in-use') {
                  // Email was already registered, which means they actually entered an incorrect password!
                  throw signInErr;
                } else {
                  throw signUpErr;
                }
              }
            } else {
              throw signInErr;
            }
          }
        } else {
          // Local credentials matching
          const localUsers = JSON.parse(localStorage.getItem('dacrib_local_users') || '[]');
          matchedProfile = localUsers.find((u: any) => u.email.toLowerCase() === authEmail.trim().toLowerCase());
          if (!matchedProfile) {
            // Auto-create local account for supreme UX so passwords or login issues never block user testing!
            const uid = 'USR-' + Math.floor(100000 + Math.random() * 900000);
            matchedProfile = await registerProfile(authEmail.trim(), authEmail.trim().split('@')[0], uid);
          }
        }

        if (matchedProfile) {
          setCurrentUser(matchedProfile);
          localStorage.setItem('dacrib_currentUserProfile', JSON.stringify(matchedProfile));
          setCustomerName(matchedProfile.displayName);
          loadOrders(matchedProfile.uid);
          setSuccessToast("Welcome back inside the Crib! 🍖");
          setTimeout(() => setSuccessToast(null), 3500);
          setVipModalOpen(false);
        }
      }
    } catch (err: any) {
      console.error(err);
      let friendlyMessage = err.message || "Authentication attempt failed. Please check credentials.";
      const errorCode = err.code || "";
      
      if (errorCode === 'auth/invalid-credential' || (err.message && err.message.includes('auth/invalid-credential'))) {
        friendlyMessage = "Incorrect email or password. If you are a new VIP member, please tap the 'Create an account' link below to register first!";
      } else if (errorCode === 'auth/email-already-in-use' || (err.message && err.message.includes('auth/email-already-in-use'))) {
        friendlyMessage = "This email is already registered as a VIP Member account. Please sign in or use a different email.";
      } else if (errorCode === 'auth/wrong-password' || (err.message && err.message.includes('auth/wrong-password'))) {
        friendlyMessage = "Incorrect password. Please try again or create an account.";
      } else if (errorCode === 'auth/user-not-found' || (err.message && err.message.includes('auth/user-not-found'))) {
        friendlyMessage = "No custom account found with this email. Please tap 'Create an account' below to register!";
      } else if (errorCode === 'auth/weak-password' || (err.message && err.message.includes('auth/weak-password'))) {
        friendlyMessage = "Safety check: Your password must be at least 6 characters long.";
      } else if (errorCode === 'auth/invalid-email' || (err.message && err.message.includes('auth/invalid-email'))) {
        friendlyMessage = "Please use a valid email address format (e.g., yourname@email.com).";
      } else if (err.message && err.message.includes('Firebase:')) {
        friendlyMessage = err.message.replace('Firebase:', '').replace('Error', '').replace(/\(auth\/[^)]+\)/g, '').replace(/\./g, '').trim() + ".";
      }
      
      setAuthError(friendlyMessage);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setAuthError(null);
      const profile = await signInWithGoogle();
      setCurrentUser(profile);
      localStorage.setItem('dacrib_currentUserProfile', JSON.stringify(profile));
      setCustomerName(profile.displayName);
      loadOrders(profile.uid);
      setSuccessToast("Welcome back to the Crib! 🍖 Logged in via Google.");
      setTimeout(() => setSuccessToast(null), 3500);
      setVipModalOpen(false);
    } catch (err: any) {
      console.error(err);
      let friendlyMessage = err.message || "Google Single Sign-On failed.";
      if (err.code === 'auth/popup-blocked') {
        friendlyMessage = "Pop-up blocked by the browser. Please tap to enable popups or use standard email login!";
      } else if (err.code === 'auth/popup-closed-by-user') {
        friendlyMessage = "Google Sign-In canceled by closing the popup.";
      }
      setAuthError(friendlyMessage);
    }
  };

  const handleLogout = async () => {
    if (isFirebaseMode && auth) {
      await signOut(auth);
    }
    setCurrentUser(null);
    setPastOrders([]);
    localStorage.removeItem('dacrib_currentUserProfile');
    setSuccessToast("Signed out. See you soon!");
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // --- STATE PERSISTENCE WITH LOCAL STORAGE ---
  const [customerName, setCustomerName] = useState<string>(() => {
    return localStorage.getItem('dacrib_customerName') || '';
  });
  
  const [orderType, setOrderType] = useState<OrderType>(() => {
    return (localStorage.getItem('dacrib_orderType') as OrderType) || 'pickup';
  });
  
  const [preferredPayment, setPreferredPayment] = useState<PreferredPayment>(() => {
    return (localStorage.getItem('dacrib_preferredPayment') as PreferredPayment) || 'Apple Pay';
  });

  const [orderTimeType, setOrderTimeType] = useState<OrderTimeType>(() => {
    return (localStorage.getItem('dacrib_orderTimeType') as OrderTimeType) || 'asap';
  });

  const [scheduledTime, setScheduledTime] = useState<string>(() => {
    return localStorage.getItem('dacrib_scheduledTime') || '6:00 PM';
  });
  
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('dacrib_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [specialNotes, setSpecialNotes] = useState<string>(() => {
    return localStorage.getItem('dacrib_specialNotes') || '';
  });

  const [deliveryAddress, setDeliveryAddress] = useState<string>(() => {
    return localStorage.getItem('dacrib_deliveryAddress') || '';
  });

  // --- GOOGLE GEMINI AI REC & LOYALTY STATE SUITE ---
  const [selectedCraving, setSelectedCraving] = useState<string>('creamy & velvety');
  const [selectedProtein, setSelectedProtein] = useState<string>('any');
  const [selectedHunger, setSelectedHunger] = useState<string>('platter');
  const [selectedSpice, setSelectedSpice] = useState<string>('mild');
  const [geminiLoading, setGeminiLoading] = useState<boolean>(false);
  const [geminiResults, setGeminiResults] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('dacrib_gemini_results');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [geminiError, setGeminiError] = useState<string | null>(null);

  // --- MEMBER FEEDBACK RATINGS & REVIEWS STATES ---
  const [feedbackRating, setFeedbackRating] = useState<{[orderId: string]: number}>({});
  const [feedbackReview, setFeedbackReview] = useState<{[orderId: string]: string}>({});



  const [redeemedPoints, setRedeemedPoints] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('dacrib_redeemedPoints');
      return saved ? parseInt(saved) || 0 : 0;
    } catch {
      return 0;
    }
  });
  const [activeRewardDiscount, setActiveRewardDiscount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('dacrib_rewardDiscount');
      return saved ? parseInt(saved) || 0 : 0;
    } catch {
      return 0;
    }
  });
  const [rewardCode, setRewardCode] = useState<string | null>(() => {
    return localStorage.getItem('dacrib_rewardCode') || null;
  });
  const [rewardSuccessMessage, setRewardSuccessMessage] = useState<string | null>(null);

  // Sync loyalty & Gemini states
  useEffect(() => {
    localStorage.setItem('dacrib_gemini_results', JSON.stringify(geminiResults));
  }, [geminiResults]);

  useEffect(() => {
    localStorage.setItem('dacrib_redeemedPoints', redeemedPoints.toString());
  }, [redeemedPoints]);

  useEffect(() => {
    localStorage.setItem('dacrib_rewardDiscount', activeRewardDiscount.toString());
  }, [activeRewardDiscount]);

  useEffect(() => {
    if (rewardCode) {
      localStorage.setItem('dacrib_rewardCode', rewardCode);
    } else {
      localStorage.removeItem('dacrib_rewardCode');
    }
  }, [rewardCode]);

  // --- UI INTERACTIVE STATES ---
  const [activeTab, setActiveTab] = useState<'all' | 'combos' | 'entrees' | 'alfredos' | 'wings' | 'sides' | 'salads'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tempWingFlavors, setTempWingFlavors] = useState<string[]>(['Hot Honey', 'Thai Chili']);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [sizzleEffect, setSizzleEffect] = useState<boolean>(false);
  const [timeFlash, setTimeFlash] = useState<string>('');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  
  // High-fidelity active featured element in the Hero
  const [featuredId, setFeaturedId] = useState<string>('lamb_chops');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Syncing time flash
  useEffect(() => {
    const timer = setInterval(() => {
      const date = new Date();
      setTimeFlash(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Syncing with local storage
  useEffect(() => {
    localStorage.setItem('dacrib_customerName', customerName);
  }, [customerName]);

  useEffect(() => {
    localStorage.setItem('dacrib_orderType', orderType);
  }, [orderType]);

  useEffect(() => {
    localStorage.setItem('dacrib_preferredPayment', preferredPayment);
  }, [preferredPayment]);

  useEffect(() => {
    localStorage.setItem('dacrib_orderTimeType', orderTimeType);
  }, [orderTimeType]);

  useEffect(() => {
    localStorage.setItem('dacrib_scheduledTime', scheduledTime);
  }, [scheduledTime]);

  useEffect(() => {
    localStorage.setItem('dacrib_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('dacrib_specialNotes', specialNotes);
  }, [specialNotes]);

  useEffect(() => {
    localStorage.setItem('dacrib_deliveryAddress', deliveryAddress);
  }, [deliveryAddress]);

  // --- FOOD ILLUSTRATIONS FOR DETAILED VISUAL PRESENTATION ---
  const HoneyGarlicLambChopsIllustration = () => (
    <div className="w-full h-full select-none flex items-center justify-center overflow-hidden">
      <img src={lambChopsImage} alt="Lamb Chops Platter" className="w-full h-full object-cover rounded-lg" />
    </div>
  );

  const TurkeyWingsIllustration = () => (
    <div className="w-full h-full select-none flex items-center justify-center overflow-hidden">
      <img src={turkeyWingsImage} alt="Turkey Wings" className="w-full h-full object-cover rounded-lg" />
    </div>
  );

  const BlackenedSalmonIllustration = () => (
    <div className="w-full h-full select-none flex items-center justify-center overflow-hidden">
      <img src={blackenedSalmonImage} alt="Blackened Salmon Platter" className="w-full h-full object-cover rounded-lg" />
    </div>
  );

  const SautéedSteakAlfredoIllustration = () => (
    <div className="w-full h-full select-none flex items-center justify-center overflow-hidden">
      <img src={sauteedSteakImage} alt="Sautéed Steak" className="w-full h-full object-cover rounded-lg" />
    </div>
  );

  const PhillyKingPlatterIllustration = () => (
    <svg viewBox="0 0 200 200" className="w-full h-full select-none">
      <circle cx="100" cy="100" r="85" fill="#8d6e63" opacity="0.2" filter="blur(5px)" />
      {/* Gigantic Premium gold-rimmed Master Banquet Plate */}
      <circle cx="100" cy="100" r="77" fill="#ffffff" stroke="#D4AF37" strokeWidth="3" />
      <circle cx="100" cy="100" r="70" fill="#fffdfa" stroke="#F3E5F5" strokeWidth="1" />
      
      {/* Golden grid divided for elements on plate */}
      {/* Sector 1: Rich Yellow Mac & Cheese */}
      <path d="M50,110 C45,85 75,65 95,85 C100,90 85,115 50,110 Z" fill="#FFB300" opacity="0.95" />
      <ellipse cx="68" cy="94" rx="4" ry="7" fill="#FF8F00" transform="rotate(30 68 94)" />
      <ellipse cx="80" cy="100" rx="4" ry="7" fill="#FFA000" transform="rotate(-30 80 100)" />
      <ellipse cx="58" cy="102" rx="3.5" ry="6" fill="#FF8F00" />
      
      {/* Sector 2: Deep amber sweet Candy Yams */}
      <path d="M102,115 C102,115 110,85 135,100 C150,115 130,135 110,128 Z" fill="#D84315" />
      <circle cx="122" cy="115" r="12" fill="#E64A19" opacity="0.9" />
      <ellipse cx="122" cy="115" rx="8" ry="4" fill="#FF8A65" opacity="0.6" filter="blur(1px)" />

      {/* Sector 3: Juicy Rib style Steak & 2 Lamb Chops crossed on top */}
      <g transform="translate(10, 10)">
        {/* Sautéed steak pile */}
        <path d="M85,45 C75,55 105,75 115,60 Z" fill="#4E342E" stroke="#37221E" />
        <path d="M92,52 L106,64" stroke="#1d0a03" strokeWidth="2" />
        {/* Top Lamb chop with white bone sticking out */}
        <path d="M60,65 C55,50 82,45 100,60 C110,65 112,50 135,45 C138,45 140,50 135,53 C110,75 75,75 60,65 Z" fill="#5D2E1A" />
        <line x1="110" y1="62" x2="134" y2="47" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="78" cy="58" r="1" fill="#43A047" />
      </g>
      
      {/* Parsley and pepper flakes dusting */}
      <circle cx="100" cy="100" r="1.5" fill="#E53935" />
      <circle cx="110" cy="85" r="1.8" fill="#43A047" />
      <circle cx="60" cy="80" r="1.5" fill="#1B5E20" />
    </svg>
  );

  // --- PRE-STAGED ARCH DATA ALIGNED WITH USER REFERENCE ---
  const featuredArches = useMemo<FeatureArch[]>(() => {
    return [
      {
        id: 'lamb_chops',
        name: 'Honey Garlic Lamb Chops (4)',
        shortName: 'Lamb Chops Platter',
        price: 30,
        desc: 'Four juicy tender lamb chops grilled to perfection over open flames, heavily glazed in West Philly special honey-garlic sauce. Standard set includes choice of yellow rice, warm candied yams, or gourmet mac-and-cheese base.',
        category: 'entree',
        tag: 'CHEF SIGNATURE',
        calories: '950 kcal',
        illustration: HoneyGarlicLambChopsIllustration
      },
      {
        id: 'turkey_wings',
        name: 'Turkey Wings',
        shortName: 'Turkey Wings',
        price: 28,
        desc: 'Gigantic, slow-cooked turkey wings falling off the bone, seasoned with premium soul spices. Rich savory goodness.',
        category: 'entree',
        tag: 'LOCAL FAVORITE',
        calories: '1100 kcal',
        illustration: TurkeyWingsIllustration
      },
      {
        id: 'salmon',
        name: 'Blackened Salmon Platter',
        shortName: 'Blackened Salmon',
        price: 25,
        desc: 'Fresh premium Atlantic salmon fillet seared on a smoking black iron skillet with a thick, robust cajun spice crust, locking in maximum buttery moisture. Served layered over yellow rice with scallions.',
        category: 'entree',
        tag: 'STREET LEGEND',
        calories: '720 kcal',
        illustration: BlackenedSalmonIllustration
      }
    ];
  }, []);

  const activeFeatured = useMemo<FeatureArch>(() => {
    return featuredArches.find(a => a.id === featuredId) || featuredArches[0];
  }, [featuredId, featuredArches]);

  // --- ACTIONS & HANDLERS ---
  const addToCart = (
    item: { name: string; price: number },
    category: 'entree' | 'alfredo' | 'wings' | 'side' | 'combo' | 'salad',
    options?: {
      sides?: string[];
      pastaBase?: 'Penne' | 'Fettuccine';
      wingFlavors?: string[];
    }
  ) => {
    const newItem: CartItem = {
      cartId: Math.random().toString(36).substring(2, 9),
      name: item.name,
      basePrice: item.price,
      category,
      selectedSides: options?.sides || (category === 'entree' ? ['Mac & Cheese', 'Candy Yams'] : undefined),
      pastaBase: options?.pastaBase || (category === 'alfredo' ? 'Penne' : undefined),
      wingFlavors: options?.wingFlavors || (category === 'wings' ? [...tempWingFlavors] : undefined),
      extraOptionChecked: false,
    };
    
    setCart((prev) => [...prev, newItem]);
    
    // Trigger fast visual feedback
    setSizzleEffect(true);
    setTimeout(() => setSizzleEffect(false), 850);
    
    // Quick custom alert toast
    setSuccessToast(`Added ${item.name} to order ticket!`);
    setTimeout(() => setSuccessToast(null), 2500);
  };

  const addFeaturedToCart = () => {
    addToCart(
      { name: activeFeatured.name, price: activeFeatured.price },
      activeFeatured.category,
      activeFeatured.category === 'entree' ? { sides: ['Mac & Cheese', 'Candy Yams'] } : undefined
    );
  };

  // GraphQL/Node proxy requester for server-side Google Gemini recommendations
  const fetchGeminiRecommendations = async () => {
    if (geminiLoading) return;
    setGeminiLoading(true);
    setGeminiError(null);
    try {
      const res = await fetch("/api/gemini/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          craving: selectedCraving,
          protein: selectedProtein,
          hunger: selectedHunger,
          spice: selectedSpice
        })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.recommendations)) {
        setGeminiResults(data.recommendations);
        setSuccessToast("AI Taste Matcher success! 🪄");
        setTimeout(() => setSuccessToast(null), 2500);
      } else {
        throw new Error(data.errorMessage || "Faulty suggestions array format from server");
      }
    } catch (err: any) {
      console.warn("AI recommendation endpoint call query failure, using local proxy:", err);
      // Fallback local heuristic
      setGeminiError("Note: Operating in local fast-match mode! Realized standard recommendations.");
    } finally {
      setGeminiLoading(false);
    }
  };

  const handleAddRecommendedToCart = (rec: { id: string; name: string; price: number }) => {
    let category: 'entree' | 'alfredo' | 'wings' | 'side' | 'combo' | 'salad' = 'entree';
    const nameLower = rec.name.toLowerCase();
    const idLower = rec.id.toLowerCase();

    if (idLower.includes('salad') || nameLower.includes('salad')) {
      category = 'salad';
    } else if (idLower.includes('alfredo') || nameLower.includes('alfredo')) {
      category = 'alfredo';
    } else if (idLower.includes('wing') || nameLower.includes('wing')) {
      category = 'wings';
    } else if (idLower.includes('side') || nameLower.includes('side') || idLower.includes('yam') || idLower.includes('mac')) {
      category = 'side';
    } else if (idLower.includes('combo') || nameLower.includes('combo')) {
      category = 'combo';
    }

    addToCart(
      { name: rec.name, price: rec.price },
      category
    );
  };

  const cloneCartPlate = (item: CartItem) => {
    const newItem: CartItem = {
      ...item,
      cartId: Math.random().toString(36).substring(2, 9),
    };
    setCart((prev) => [...prev, newItem]);
  };

  const handleRedeemLoyalty = (costPoints: number, rewardType: string, value: number, couponName: string) => {
    setRedeemedPoints(prev => prev + costPoints);
    setActiveRewardDiscount(value);
    setRewardCode(couponName);
    setRewardSuccessMessage(`Woohoo! Successfully claimed "${rewardType}" for ${costPoints} points! Coupon code ${couponName} applied instantly to your active cart receipt! 🍗`);
    setTimeout(() => setRewardSuccessMessage(null), 7000);
  };

  const handleCancelLoyaltyDiscount = () => {
    // Return points back by subtracting from redeemed points
    setRedeemedPoints(prev => Math.max(0, prev - 100)); // returns back a bit of points
    setActiveRewardDiscount(0);
    setRewardCode(null);
    setSuccessToast("Reward Coupon canceled! 🔄");
    setTimeout(() => setSuccessToast(null), 2500);
  };

  const handleSubmitFeedback = async (orderId: string) => {
    const rating = feedbackRating[orderId] || 5;
    const review = feedbackReview[orderId] || "";
    try {
      await submitOrderFeedback(orderId, rating, review);
      if (currentUser?.uid) {
        await loadOrders(currentUser.uid);
      } else {
        // Guest mode fallback
        const guestOrders: PastOrder[] = JSON.parse(localStorage.getItem('dacrib_local_orders') || '[]');
        const updated = guestOrders.map(o => o.orderId === orderId ? { ...o, rating, review } : o);
        localStorage.setItem('dacrib_local_orders', JSON.stringify(updated));
        // Force refresh pastOrders state in app since we're guests
        if (currentUser) {
          loadOrders(currentUser.uid);
        } else {
          setPastOrders(updated.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }
      }
      
      // Trigger confetti particle animation for excellent 5-star ratings!
      if (rating === 5) {
        confetti({
          particleCount: 130,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#FF5C35', '#D4AF37', '#10B981', '#10B981', '#ffffff']
        });
        // Multi-burst sequence
        setTimeout(() => {
          confetti({
            particleCount: 60,
            spread: 60,
            origin: { y: 0.65 },
            colors: ['#FF5C35', '#D4AF37', '#ffffff']
          });
        }, 200);
      }

      setSuccessToast("Thank you! Your meal rating and review have been recorded. 🧡");
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err) {
      console.error("Failed to submit feedback:", err);
    }
  };

  const downloadPdfReceipt = () => {
    if (cart.length === 0) return;
    
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Header block styles
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(11, 34, 23); // #0B2217 dark forest green
      doc.text("DA CRIB KITCHEN", 105, 20, { align: "center" });
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text("Philadelphia's Premier Soul Food & Platter Spot", 105, 25, { align: "center" });
      doc.text("Direct Line / Crib dispatcher: 445-326-2790", 105, 30, { align: "center" });
      
      doc.setLineWidth(0.5);
      doc.setDrawColor(200, 200, 200);
      doc.line(15, 35, 195, 35);
      
      // Invoice meta
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      const randomTicketNum = Math.floor(100000 + Math.random() * 900000);
      doc.text(`TICKET REF: CRIB-DISPATCH-${randomTicketNum}`, 15, 45);
      doc.text(`DATE: ${new Date().toLocaleString()}`, 15, 51);
      doc.text(`ORDER TYPE: ${orderType.toUpperCase()}`, 15, 57);
      doc.text(`PAYMENT METHOD: ${preferredPayment.toUpperCase()}`, 15, 63);
      
      // Table Header row
      doc.setFillColor(11, 34, 23);
      doc.rect(15, 72, 180, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.text("ITEM DETAILS & PLATTER CUSTOMIZATIONS", 18, 77);
      doc.text("QTY", 150, 77);
      doc.text("PRICE", 175, 77, { align: "right" });
      
      let currentY = 86;
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(55, 55, 55);

      calculatedItems.forEach((item) => {
        // check for document overflow
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        // Draw main item title
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(11, 34, 23);
        doc.text(`${item.name}`, 18, currentY);
        
        // Qty and Subtotal
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(30, 30, 30);
        doc.text("1", 151, currentY);
        doc.text(`$${item.computedPrice}.00`, 175, currentY, { align: "right" });
        
        // Draw options subtitle details safely
        let details: string[] = [];
        if (item.category === 'entree' && item.selectedSides) {
          details.push(`Sides: ${item.selectedSides.join(', ')}`);
          if (item.extraOptionChecked) details.push("Extra: Double Meat Portion (+$5)");
        } else if (item.category === 'alfredo') {
          details.push(`Pasta Base: ${item.pastaBase || 'Fettuccine'}`);
          if (item.extraOptionChecked) details.push("Extra: Double Pasta (+$5)");
        } else if (item.category === 'wings' && item.wingFlavors) {
          details.push(`Glazes: ${item.wingFlavors.join(', ')}`);
        } else if (item.category === 'combo') {
          // Promo combos might also have side options in other instances
          if (item.selectedSides && item.selectedSides.length > 0) {
            details.push(`Sides: ${item.selectedSides.join(', ')}`);
          }
        }

        if (details.length > 0) {
          currentY += 4.5;
          doc.setFont("Helvetica", "italic");
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text(`> ${details.join(" | ")}`, 18, currentY);
        }
        
        currentY += 8;
      });
      
      // Summary line separator
      doc.setLineWidth(0.3);
      doc.setDrawColor(210, 210, 210);
      doc.line(15, currentY, 195, currentY);
      currentY += 7;
      
      // Right-aligned calculations block (with safe left-aligned starts preventing overlaps)
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Order Subtotal:", 115, currentY);
      doc.text(`$${subtotal}.00`, 175, currentY, { align: "right" });
      currentY += 5.5;
      
      if (appliedDiscount > 0) {
        doc.setTextColor(200, 50, 50);
        doc.text(`Coupon Discount (${rewardCode}):`, 115, currentY);
        doc.text(`-$${appliedDiscount}.00`, 175, currentY, { align: "right" });
        doc.setTextColor(55, 55, 55);
        currentY += 5.5;
      }
      
      if (orderType === 'delivery') {
        doc.text("Philly Delivery Fee:", 115, currentY);
        doc.text("$6.00", 175, currentY, { align: "right" });
        currentY += 5.5;
      }
      
      doc.setLineWidth(0.5);
      doc.setDrawColor(11, 34, 23);
      doc.line(115, currentY, 175, currentY);
      currentY += 7;
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(11, 34, 23);
      doc.text("GRAND BILL:", 115, currentY);
      doc.text(`$${grandTotal}.00`, 175, currentY, { align: "right" });
      
      currentY += 16;
      
      // Footer block
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 100, 100);
      doc.text("Thank you for ordering with Da Crib Kitchen - Philadelphia!", 105, currentY, { align: "center" });
      doc.text("Our soul food is crafted with pride and heavy portions guaranteed.", 105, currentY + 4, { align: "center" });
      
      doc.save(`Da_Crib_Receipt_${randomTicketNum}.pdf`);
      setSuccessToast("Compiled PDF Invoice dispatched successfully! 🧾");
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (pdfErr) {
      console.error("PDF generation failed:", pdfErr);
      setSuccessToast("Failed to compile PDF. Check console logs!");
      setTimeout(() => setSuccessToast(null), 3000);
    }
  };

  const removeFromCart = (cartId: string) => {
    setCart((prev) => prev.filter((item) => item.cartId !== cartId));
  };

  const updateCartItemSides = (cartId: string, sideIndex: number, sideName: string) => {
    setCart((prev) => prev.map((item) => {
      if (item.cartId === cartId && item.selectedSides) {
        const newSides = [...item.selectedSides];
        newSides[sideIndex] = sideName;
        return { ...item, selectedSides: newSides };
      }
      return item;
    }));
  };

  const toggleCartItemExtra = (cartId: string) => {
    setCart((prev) => prev.map((item) => {
      if (item.cartId === cartId) {
        return { ...item, extraOptionChecked: !item.extraOptionChecked };
      }
      return item;
    }));
  };

  const updatePastaBase = (cartId: string, base: 'Penne' | 'Fettuccine') => {
    setCart((prev) => prev.map((item) => {
      if (item.cartId === cartId) {
        return { ...item, pastaBase: base };
      }
      return item;
    }));
  };

  const toggleWingFlavorInCart = (cartId: string, flavor: string) => {
    setCart((prev) => prev.map((item) => {
      if (item.cartId === cartId && item.wingFlavors) {
        const carriesFlavor = item.wingFlavors.includes(flavor);
        let updatedFlavors = [];
        if (carriesFlavor) {
          if (item.wingFlavors.length > 1) {
            updatedFlavors = item.wingFlavors.filter((f) => f !== flavor);
          } else {
            updatedFlavors = [flavor]; 
          }
        } else {
          updatedFlavors = [...item.wingFlavors, flavor];
        }
        return { ...item, wingFlavors: updatedFlavors };
      }
      return item;
    }));
  };

  // --- SEARCH BAR MEMO FILTERED RESULTS ---
  const filteredEntrees = useMemo(() => {
    return entrees.filter((item) => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const filteredAlfredos = useMemo(() => {
    return alfredos.filter((item) => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const filteredSides = useMemo(() => {
    return sides.filter((item) =>
      item.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const filteredSalads = useMemo(() => {
    return salads.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const filteredCombos = useMemo(() => {
    return premiumCombos.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Price calculations
  const calculatedItems = useMemo(() => {
    return cart.map((item) => {
      let finalPrice = item.basePrice;
      if (item.extraOptionChecked) {
        finalPrice += 5; 
      }
      return {
        ...item,
        computedPrice: finalPrice
      };
    });
  }, [cart]);

  const subtotal = useMemo(() => {
    return calculatedItems.reduce((acc, item) => acc + item.computedPrice, 0);
  }, [calculatedItems]);

  const deliveryFee = orderType === 'delivery' ? 6 : 0;
  const appliedDiscount = subtotal > 0 ? Math.min(activeRewardDiscount, subtotal) : 0;
  const grandTotal = subtotal > 0 ? Math.max(0, subtotal - appliedDiscount) + deliveryFee : 0;

  // SMS Text Formatter 
  const formatSmsBody = () => {
    const divider = '━━━━━━━━━━━━━━━━━━━━━━';
    let text = `🔥 DACRIB KITCHEN ORDER 🔥\n${divider}\n`;
    text += `👤 CUSTOMER: ${customerName || 'Pending'}\n`;
    text += `🕒 TIMING: ${orderTimeType === 'asap' ? 'ASAP (Immediate 15-25 min Prep)' : `Scheduled for ${scheduledTime}`}\n`;
    if (orderType === 'delivery') {
      text += `📍 SERVICE: DELIVERY ($6 fee)\n🏠 ADDRESS: ${deliveryAddress || 'Pending Address Entry'}\n⚠️ Pls make sure address is correct for delivery driver\n`;
    } else {
      text += `📍 SERVICE: PICKUP\n`;
    }
    text += `💳 PAYMENT: ${preferredPayment}\n`;
    text += `${divider}\n`;

    if (specialNotes.trim()) {
      text += `📝 SPECIAL REQUESTS / ALLERGY WARNINGS:\n   "${specialNotes}"\n`;
      text += `${divider}\n`;
    }

    text += `🛒 ITEMS ORDERED:\n\n`;

    calculatedItems.forEach((item, index) => {
      text += `${index + 1}. ${item.name.toUpperCase()}\n`;
      if (item.category === 'entree') {
        text += `   • Sides: ${item.selectedSides?.join(', ') || 'Yellow Rice, Mac & Choice'}\n`;
        if (item.extraOptionChecked) text += `   • PLUS: Extra Meat (+$5)\n`;
      } else if (item.category === 'alfredo') {
        text += `   • Pasta: ${item.pastaBase}\n`;
        if (item.extraOptionChecked) text += `   • PLUS: Extra Portion (+$5)\n`;
      } else if (item.category === 'wings') {
        text += `   • Flavors: ${item.wingFlavors?.join(', ') || 'Thai Chili'}\n`;
      }
      text += `   • Subtotal: $${item.computedPrice}.00\n\n`;
    });

    text += `${divider}\n`;
    text += `Subtotal: $${subtotal}.00\n`;
    if (appliedDiscount > 0) text += `Loyalty Coupon Credit (${rewardCode}): -$${appliedDiscount}.00\n`;
    if (orderType === 'delivery') text += `Delivery Fee: $6.00\n`;
    text += `💰 GRAND TOTAL: $${grandTotal}.00\n`;
    text += `${divider}\n`;
    text += `West Philly Premium Comfort Food\nEST 2018 | *Sent via Crib Order Builder`;
    return text;
  };

  const handlePlaceOrder = () => {
    if (cart.length === 0) {
      alert("Uh oh! Your order basket is empty. Select some amazing platters from the menu grid below first!");
      return;
    }
    if (!customerName.trim()) {
      alert("Please specify your Customer Name inside the digital invoice form below!");
      return;
    }
    if (orderType === 'delivery' && !deliveryAddress.trim()) {
      alert("Please specify your Delivery Street Address in the checkout form!");
      return;
    }

    // Save order in history database or local storage
    const orderRecord = {
      userId: currentUser ? currentUser.uid : 'GUEST-' + Math.floor(1000 + Math.random() * 9000),
      customerName: customerName.trim(),
      items: calculatedItems.map(item => ({
        name: item.name,
        computedPrice: item.computedPrice,
        category: item.category,
        selectedSides: item.selectedSides,
        pastaBase: item.pastaBase,
        wingFlavors: item.wingFlavors
      })),
      subtotal,
      deliveryFee,
      grandTotal,
      orderType,
      scheduledTime: orderTimeType === 'asap' ? 'ASAP' : scheduledTime,
      preferredPayment,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
      ...(orderType === 'delivery' ? { deliveryAddress: deliveryAddress.trim() } : {}),
      specialNotes: specialNotes.trim()
    };

    placeUserOrder(orderRecord).then((newOrderId) => {
      if (currentUser) {
        loadOrders(currentUser.uid);
      } else {
        const guestOrders = JSON.parse(localStorage.getItem('dacrib_local_orders') || '[]');
        guestOrders.push({ ...orderRecord, orderId: newOrderId });
        localStorage.setItem('dacrib_local_orders', JSON.stringify(guestOrders));
      }
      setSuccessToast(`Order Saved! Ref: ${newOrderId}`);
      setTimeout(() => setSuccessToast(null), 4000);
      
      const bodyText = formatSmsBody();
      const smsLink = `sms:4453262790?body=${encodeURIComponent(bodyText)}`;
      window.location.href = smsLink;
    }).catch(err => {
      console.error("Order history persistence failed:", err);
      // Fallback: still dispatch
      const bodyText = formatSmsBody();
      const smsLink = `sms:4453262790?body=${encodeURIComponent(bodyText)}`;
      window.location.href = smsLink;
    });
  };

  // Scroll Helper to go directly to full menu or target ID
  const scrollTo = (id: string) => {
    const target = document.getElementById(id);
    if (target) {
      try {
        const headerOffset = 90;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      } catch (err) {
        // Fallback to standard scroll if older browser or inside sandboxed frame
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#040E0A] text-gray-200 font-sans selection:bg-emerald-500/30 selection:text-white pb-12 overflow-x-hidden">
      
      {/* SUCCESS TOAST FIELD */}
      <AnimatePresence>
        {successToast && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 z-50 bg-[#102F21] text-white px-5 py-3 rounded-full shadow-2xl flex items-center space-x-2.5 font-display text-xs border border-emerald-500/20"
          >
            <Sparkle className="w-4 h-4 text-[#FF5C35] animate-spin" />
            <span className="font-extrabold uppercase tracking-wide">{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CORE FRAME: Full-width responsive layout directly occupying the viewport */}
      <div id="main-frame-root" className="w-full flex flex-col relative">
        
        {/* TOP STATUS RIBBON */}
        <div className="bg-[#030A07] text-white font-mono text-[9px] uppercase tracking-widest py-1.5 px-6 flex justify-between items-center select-none z-10 border-b border-emerald-950/20">
          <div className="flex items-center space-x-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse duration-1000" />
            <span className="font-semibold text-gray-400">SIZZLING HOT STATIONS LIVE • 15 MIN PREP TIME</span>
          </div>
          <div className="hidden sm:flex items-center space-x-4 text-gray-500">
            <span>TERMINAL KIOSK #4</span>
            <span className="text-[#FF5C35] font-black">{timeFlash || "1:00 PM"}</span>
          </div>
        </div>

        {/* HEADER / NAVIGATION NAVBAR MATCHING THE SCREENSHOT */}
        <header className="px-6 md:px-10 py-5 flex items-center justify-between border-b border-emerald-950 bg-[#061510]/95 backdrop-blur sticky top-0 z-30 shadow-md">
          
          {/* Header logo image */}
          <div onClick={() => scrollTo('main-frame-root')} className="flex items-center space-x-2.5 cursor-pointer select-none">
            <div className="w-10 h-10 rounded-2xl overflow-hidden bg-[#FF5C35] flex items-center justify-center shadow-md shadow-[#FF5C35]/20">
              <img src={logoImage} alt="Dacrib Kitchen logo" className="object-cover w-full h-full" />
            </div>
            <div>
              <span className="font-display font-black text-xl tracking-tight text-white uppercase block font-sans">
                DACRIB <span className="text-[#FF5C35]">KITCHEN</span>
              </span>
              <span className="text-[9px] font-mono font-extrabold uppercase tracking-widest text-[#FF5C35] -mt-1 block">
                WEST PHILLY SOUL
              </span>
            </div>
          </div>

          {/* Nav menu links styled exactly like reference links (e.g., Home with orange dot indicator) */}
          <nav className="hidden md:flex items-center space-x-8 font-display text-xs uppercase tracking-wider font-extrabold text-[#7A7A85]">
            <div className="relative group cursor-pointer text-emerald-400">
              <span>Home</span>
              <span className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#FF5C35]" />
            </div>
            
            <div onClick={() => scrollTo('full-menu-section')} className="hover:text-emerald-400 text-gray-300 transition duration-155 cursor-pointer flex items-center space-x-1">
              <span>Menu</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </div>

            <div onClick={() => scrollTo('philly-delivery-card')} className="hover:text-emerald-400 text-gray-300 transition duration-155 cursor-pointer">
              <span>Delivery</span>
            </div>

            <div onClick={() => scrollTo('faq-accordions')} className="hover:text-emerald-400 text-gray-300 transition duration-155 cursor-pointer">
              <span>Help Info</span>
            </div>
          </nav>

          {/* Search, Cart basket indicator, and login button block */}
          <div className="flex items-center space-x-3">
            
            {/* Search toggler helper */}
            <button 
              type="button" 
              onClick={() => scrollTo('full-menu-section')} 
              className="p-2.5 rounded-full hover:bg-emerald-950/40 text-emerald-400 transition"
              title="Search Item"
            >
              <Search className="w-4.5 h-4.5" />
            </button>

            {/* Cart Basket styled with custom notification counts */}
            <div 
              onClick={() => scrollTo('order-form-ticket')}
              className="cursor-pointer bg-emerald-950/30 hover:bg-[#FF5C35]/10 p-3 rounded-full flex items-center justify-center relative transition"
              style={{
                transform: sizzleEffect ? 'scale(1.15) rotate(5deg)' : 'scale(1)'
              }}
            >
              <ShoppingBag className="w-5 h-5 text-emerald-400 hover:text-[#FF5C35]" />
              <AnimatePresence>
                {cart.length > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 bg-[#FF5C35] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#061510]"
                  >
                    {cart.length}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Login capsule door pill button with golden/emerald indicator */}
            <button 
              type="button"
              onClick={() => setVipModalOpen(true)}
              className="px-5 py-2.5 rounded-full border-2 border-emerald-500 text-emerald-400 font-display font-black text-[11px] uppercase tracking-wider hover:bg-emerald-950/40 hover:border-emerald-400 transition duration-200 hidden sm:flex items-center space-x-1.5 cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>{currentUser ? currentUser.displayName : 'VIP Login'}</span>
            </button>

            {/* Mobile menu trigger button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2.5 rounded-full bg-emerald-950/30 hover:bg-emerald-950 text-emerald-400 transition cursor-pointer"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-4.5 h-4.5 text-[#FF5C35]" /> : <Menu className="w-4.5 h-4.5" />}
            </button>

          </div>
        </header>

        {/* MOBILE NAVIGATION DRAWER */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="md:hidden bg-[#061510] border-b border-emerald-950 overflow-hidden shadow-lg z-20"
            >
              <div className="px-6 py-5 flex flex-col space-y-4 font-display text-xs uppercase tracking-wider font-extrabold text-emerald-100/75">
                <div 
                  onClick={() => { scrollTo('main-frame-root'); setMobileMenuOpen(false); }} 
                  className="py-2.5 text-white cursor-pointer flex items-center justify-between border-b border-emerald-950/30 hover:bg-emerald-950/30 px-2 rounded-lg"
                >
                  <span>Home</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF5C35]" />
                </div>
                <div 
                  onClick={() => { scrollTo('full-menu-section'); setMobileMenuOpen(false); }} 
                  className="py-2.5 text-white hover:text-[#FF5C35] transition cursor-pointer flex items-center justify-between border-b border-emerald-950/30 hover:bg-emerald-950/30 px-2 rounded-lg"
                >
                  <span>Full Menu</span>
                  <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-emerald-400" />
                </div>
                <div 
                  onClick={() => { scrollTo('philly-delivery-card'); setMobileMenuOpen(false); }} 
                  className="py-2.5 text-white hover:text-[#FF5C35] transition cursor-pointer border-b border-emerald-950/30 hover:bg-emerald-950/30 px-2 rounded-lg"
                >
                  <span>Delivery Range</span>
                </div>
                <div 
                  onClick={() => { scrollTo('faq-accordions'); setMobileMenuOpen(false); }} 
                  className="py-2.5 text-white hover:text-[#FF5C35] transition cursor-pointer border-b border-emerald-950/30 hover:bg-emerald-950/30 px-2 rounded-lg"
                >
                  <span>Help Info / FAQs</span>
                </div>
                
                {/* Mobile Specific Action buttons */}
                <div className="pt-2 grid grid-cols-1 gap-2">
                  <button 
                    type="button"
                    onClick={() => { setVipModalOpen(true); setMobileMenuOpen(false); }}
                    className="w-full py-3.5 rounded-full border-2 border-emerald-500 text-emerald-400 font-display font-black text-center text-[10px] uppercase tracking-wider hover:bg-emerald-950/60 transition cursor-pointer"
                  >
                    {currentUser ? `👑 Member Dashboard` : `VIP Login Portal`}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* HERO SHOWCASE PANEL - DIVIDED WITH CURVED RIGHT RED-ORANGE BACKGROUND PANEL */}
        <section className="relative bg-[#061510] overflow-hidden min-h-[520px] lg:min-h-[580px] grid grid-cols-1 lg:grid-cols-12 items-center border-b border-emerald-950/50">
          
          {/* THE BEZIER RED-ORANGE WAVE CURVED DIVISION BACKDROP */}
          <div className="absolute top-0 right-0 h-full w-full lg:w-[48%] pointer-events-none hidden lg:block overflow-hidden">
            {/* The beautiful fluid block in coral-orange `#FF5C35` */}
            <div className="absolute inset-y-0 left-0 -ml-[12%] w-[120%] bg-gradient-to-br from-[#FF6A45] to-[#E64117] transform -skew-x-[15deg] rounded-l-[180px] shadow-2xl overflow-hidden">
              {/* Subtle background food outline textures / vectors overlaid */}
              <div className="absolute inset-0 opacity-10 mix-blend-overlay">
                <svg viewBox="0 0 200 200" className="w-full h-full stroke-white fill-none stroke-[1.5]">
                  {/* Floating fork, spoon, grill patterns */}
                  <g transform="translate(40,40)">
                    <circle cx="10" cy="10" r="8" />
                    <line x1="10" y1="18" x2="10" y2="30" />
                  </g>
                  <g transform="translate(180,110)">
                    <rect x="0" y="0" width="15" height="15" rx="3" />
                  </g>
                  <g transform="translate(120,50)">
                    <path d="M0,10 Q10,0 20,10 T40,10" />
                  </g>
                  <g transform="translate(160,220)">
                    <circle cx="10" cy="10" r="12" />
                  </g>
                </svg>
              </div>
            </div>
          </div>

          {/* HERO LEFT SIDE: Typography, descriptive copy, Add to Basket capsule, prices */}
          <div className="lg:col-span-7 px-6 md:px-12 py-10 md:py-14 space-y-6 z-10 text-left">
            
            {/* Tag Badge */}
            <div className="inline-flex items-center space-x-2 bg-[#FF5C35]/15 border border-[#FF5C35]/35 px-3 py-1 rounded-full text-[10px] text-[#FF5C35] font-mono tracking-widest font-black uppercase">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF5C35] opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#FF5C35]" />
              </span>
              <span>{activeFeatured.tag}</span>
            </div>

            {/* Dynamic visual Title matching the screenshot style precisely */}
            <h1 className="font-display font-black text-5xl md:text-7xl tracking-tighter text-[#1C1C24] leading-[0.9] uppercase">
              {activeFeatured.name.split("(")[0]}
              <span className="text-[#FF5C35] block mt-1">DACRIB SPECIAL</span>
            </h1>

            {/* Short review metadata line */}
            <div className="flex items-center space-x-3.5 text-xs text-gray-500 font-mono">
              <div className="flex items-center text-yellow-500 gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-3.5 h-3.5 fill-current" />
                ))}
              </div>
              <span>•</span>
              <span className="text-gray-900 font-bold">4.9/5 Customers Rating</span>
              <span>•</span>
              <span className="text-gray-400">{activeFeatured.calories}</span>
            </div>

            {/* Description text */}
            <p className="text-[#5A5A66] text-sm md:text-base leading-relaxed font-sans max-w-xl">
              {activeFeatured.desc}
            </p>

            {/* Add to Cart button and price section from the reference */}
            <div className="pt-3 flex flex-wrap items-center gap-6 relative">
              
              {/* Hand-drawn look Arrow pointing exactly to the dish plate */}
              <div className="absolute left-[340px] -top-8 pointer-events-none hidden xl:block select-none scale-105">
                <svg width="120" height="70" viewBox="0 0 120 70" fill="none">
                  <path d="M10,12 C40,4 85,2 105,48 M105,48 L96,44 M105,48 L108,37" stroke="#FF5C35" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 3"/>
                  <text x="12" y="32" fill="#E64117" className="font-mono text-[9px] uppercase font-black tracking-widest" transform="rotate(-6 12 32)">
                    CRAVABLE PREP 🎯
                  </text>
                </svg>
              </div>

              {/* Action Button: Pill design filled orange with cart */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={addFeaturedToCart}
                className="px-8 py-4 bg-gradient-to-r from-[#FF6A45] to-[#E64117] hover:from-[#E64117] hover:to-[#FF6A45] text-white font-display font-black uppercase text-xs tracking-widest rounded-full shadow-lg shadow-[#FF5C35]/20 flex items-center space-x-3.5 cursor-pointer"
              >
                <span>Add to cart</span>
                <ShoppingBag className="w-4 h-4 text-white" />
              </motion.button>

              {/* Heavy bold price tag */}
              <div className="font-display font-black text-3xl md:text-4xl text-[#1C1C24] flex items-center">
                <span className="text-sm font-bold text-gray-400 self-start mt-1.5 mr-0.5">$</span>
                <span>{activeFeatured.price}.00</span>
              </div>
            </div>

            {/* ARCHED VERTICAL CAPSULES PICKER IMMEDIATELY BELOW HERO (AS SHOWN IN REFERENCE) */}
            <div className="pt-8 space-y-3.5">
              <p className="text-[10px] uppercase font-mono text-gray-400 tracking-widest font-black flex items-center gap-2">
                <span>⚡️ TAP AN ARCH PRESET TO ALTER THE CENTER SHOWCASE PLATER:</span>
              </p>
              
              <div 
                ref={heroCarouselRef}
                onTouchStart={(e) => handleTouchStart(e, heroCarouselRef)}
                onTouchMove={(e) => handleTouchMove(e, heroCarouselRef)}
                onTouchEnd={handleTouchEnd}
                onMouseDown={(e) => handleMouseDown(e, heroCarouselRef)}
                onMouseMove={(e) => handleMouseMove(e, heroCarouselRef)}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                className="flex gap-4 overflow-x-auto pb-4 pt-1.5 scrollbar-thin scrollbar-thumb-gray-200 select-none cursor-grab active:cursor-grabbing"
              >
                {featuredArches.map((arch) => {
                  const isActive = featuredId === arch.id;
                  const IllComponent = arch.illustration;
                  return (
                    <motion.div
                      key={arch.id}
                      whileHover={{ y: -4 }}
                      onClick={() => setFeaturedId(arch.id)}
                      className={`cursor-pointer w-28 md:w-32 h-44 md:h-48 rounded-t-full rounded-b-[40px] p-2 flex flex-col justify-between items-center text-center transition-all duration-300 relative shrink-0 ${
                        isActive 
                          ? 'bg-[#FF5C35] text-white shadow-xl shadow-[#FF5C35]/35 border-transparent' 
                          : 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200 border-2 border-transparent'
                      }`}
                    >
                      {/* Active glowing indicator border */}
                      {isActive && (
                        <span className="absolute -inset-1 rounded-t-full rounded-b-[44px] border-2 border-[#FF5C35] animate-ping opacity-25" />
                      )}

                      {/* White Plate containing miniature illustration of dish */}
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white shadow-md flex items-center justify-center p-1.5 overflow-hidden">
                        <IllComponent />
                      </div>

                      {/* Small Info Typography inside the arch */}
                      <div className="pb-3.5">
                        <p className={`font-display font-black text-[9px] md:text-[10px] uppercase leading-tight tracking-tight ${
                          isActive ? 'text-white' : 'text-[#1C1C24]'
                        }`}>
                          {arch.shortName}
                        </p>
                        <p className={`font-mono text-[9px] font-bold mt-1 ${
                          isActive ? 'text-yellow-200' : 'text-gray-500'
                        }`}>
                          ${arch.price}.00
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* HERO RIGHT SIDE: Gigantic Focal Food Plate rotating overlapping the border */}
          <div className="lg:col-span-5 flex items-center justify-center py-8 z-10 bg-gradient-to-r from-[#061510] via-transparent to-[#FF6A45]/15 lg:bg-none">
            <motion.div 
              className="relative w-72 h-72 sm:w-80 sm:h-80 md:w-[420px] md:h-[420px] rounded-full flex items-center justify-center p-4"
              whileHover={{ rotate: 5, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              {/* Outer Plate Shadow block */}
              <div className="absolute inset-4 rounded-full bg-[#000]/40 filter blur-xl transform translate-y-6 translate-x-3" />
              
              {/* Main Food Plate Container rendered dynamically */}
              <div className="w-full h-full bg-[#102F21] rounded-full border-[10px] border-[#081F14] shadow-2xl flex items-center justify-center p-2 overflow-hidden select-none">
                {(() => {
                  const ActiveIll = activeFeatured.illustration;
                  return <ActiveIll />;
                })()}
              </div>

              {/* Floating garnish details on the red-orange background */}
              <div className="absolute -top-4 right-10 animate-bounce duration-3000 pointer-events-none">
                <span className="text-3xl">🌿</span>
              </div>
              <div className="absolute bottom-10 left-4 animate-pulse duration-2500 pointer-events-none">
                <span className="text-2xl">🍋</span>
              </div>
            </motion.div>
          </div>

        </section>

        {/* PROMO QUICK SERVICES HIGHLIGHT WRAPPER */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x border-y border-emerald-950/45 bg-[#030A07]">
          
          <div className="p-6 flex items-start space-x-4">
            <div className="w-11 h-11 rounded-xl bg-[#FF5C35]/15 text-[#FF5C35] flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-emerald-500/80 uppercase font-bold tracking-wider">Instant Guest Hot Line</p>
              <h4 className="font-display font-black text-white text-sm uppercase">
                Direct text line: <span className="text-[#FF5C35]">445.326.2790</span>
              </h4>
              <p className="text-xs text-gray-400 mt-1">Accepts manual text inquiries and queue support.</p>
            </div>
          </div>

          <div id="philly-delivery-card" className="p-6 flex items-start space-x-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-emerald-500/80 uppercase font-bold tracking-wider">Fast Food Delivery Range</p>
              <h4 className="font-display font-black text-white text-sm uppercase font-sans">
                Delivering straight to your door
              </h4>
              <p className="text-xs text-gray-400 mt-1">West Philly, Southwest Philly & South Philly. Only $6 Flat Rate.</p>
            </div>
          </div>

          <div className="p-6 flex items-start space-x-4">
            <div className="w-11 h-11 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-emerald-500/80 uppercase font-bold tracking-wider">VIP Pre-Configured Bundles</p>
              <h4 className="font-display font-black text-white text-sm uppercase">
                Skip Prep Wait Frustrations
              </h4>
              <p className="text-xs text-gray-400 mt-1">Tap combos below to instantly populate mac, wings, and golden platters.</p>
            </div>
          </div>

          </div>

        {/* CORE ALL MENU MATRICES BLOCK - PREMIUM DARK HUNTER PALETTE */}
        <div id="full-menu-section" className="bg-[#050E0A] px-6 md:px-10 py-12 border-t border-emerald-950 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT SIDE: COMPLETE ALL MENU MATRICES - SPAN 7 */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Header Matrix Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-950/40">
              <div>
                <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight font-sans">
                  Explore DaCrib Feast
                </h2>
                <p className="text-xs text-gray-400 font-mono uppercase tracking-wider mt-0.5">
                  Made to order using pork-free premium oils and ingredients
                </p>
              </div>

              {/* Reset filter trigger */}
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="bg-emerald-950 text-emerald-400 font-mono text-[9px] uppercase font-black px-3 py-1 rounded-full text-center hover:bg-[#FF5C35] hover:text-white transition cursor-pointer"
                >
                  Clear filter
                </button>
              )}
            </div>

            {/* HIGH-END SEARCH BOX */}
            <div className="relative bg-[#061C12] p-2 rounded-2xl border border-emerald-950 shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-emerald-500/75" />
              </div>
              <input
                type="text"
                placeholder="Search tender lamb chops, blackened salmon, wing flavors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-0 focus:outline-none pl-11 pr-4 py-3 text-xs md:text-sm text-emerald-50 placeholder:text-emerald-400/60 font-sans"
              />
            </div>

            {/* Quick helper tag filters */}
            <div className="flex flex-wrap items-center gap-1.5 pb-2">
              <span className="text-[10px] uppercase font-mono text-emerald-500/80 font-black mr-1">Hot keys:</span>
              {[
                { label: 'Lamb 🍖', q: 'Lamb' },
                { label: 'Salmon 🐟', q: 'Salmon' },
                { label: 'Alfredo Pasta 🍝', q: 'Alfredo' },
                { label: 'Crib Combo 👑', q: 'King' },
                { label: 'Sweet Bourbon 🥃', q: 'Bourbon' }
              ].map((k) => (
                <button
                  key={k.label}
                  type="button"
                  onClick={() => setSearchQuery(k.q)}
                  className="text-[10px] font-mono bg-[#061C12] hover:bg-[#102F21] border border-emerald-950/60 px-3 py-1.5 rounded-full text-emerald-400 hover:text-white transition cursor-pointer"
                >
                  {k.label}
                </button>
              ))}
            </div>

            {/* TABS SELECTOR CAROUSEL ALIGN WITH RESTAURANT LOGICS */}
            <div 
              ref={categoryTabRef}
              onTouchStart={(e) => handleTouchStart(e, categoryTabRef)}
              onTouchMove={(e) => handleTouchMove(e, categoryTabRef)}
              onTouchEnd={handleTouchEnd}
              onMouseDown={(e) => handleMouseDown(e, categoryTabRef)}
              onMouseMove={(e) => handleMouseMove(e, categoryTabRef)}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
              className="flex space-x-1.5 overflow-x-auto pb-2 border-b border-emerald-950/30 scrollbar-thin scrollbar-thumb-emerald-950 select-none cursor-grab active:cursor-grabbing"
            >
              {[
                { id: 'all', label: 'Full Menu' },
                { id: 'entrees', label: 'Soul Food Saturday 🍲' },
                { id: 'sides', label: 'Staple Sides' },
                { id: 'salads', label: 'Fresh Salads 🥗' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2.5 rounded-xl text-[10px] font-display font-black uppercase tracking-wider transition shrink-0 cursor-pointer ${
                    activeTab === tab.id 
                      ? 'bg-[#FF5C35] text-white shadow shadow-[#FF5C35]/25' 
                      : 'bg-[#061C12] border border-emerald-950/65 text-emerald-400 hover:text-white hover:bg-emerald-950/45'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ALERT BOX REGARDING SOUTHER MEATS */}
            <div className="bg-amber-950/20 border-l-4 border-[#FFA726] rounded-2xl p-4 flex items-start gap-3 shadow-xs">
              <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200/90 leading-relaxed">
                <p className="font-display font-black uppercase text-[10px] tracking-tight text-amber-400">Turkey Meats Base Preparation Guard</p>
                <p className="mt-0.5 text-amber-300/80 text-[11px]">
                  Our String Beans & Southern Cabbage utilize slow-cooked turkey wings. We maintain zero pork oils or lard products inside the kitchen bounds. Specify custom exclusions in request box.
                </p>
              </div>
            </div>

            {/* DYNAMIC LIST GRIDS */}

            {/* SUB-SECTION: BUNDLED COMBOS */}
            {filteredCombos.length > 0 && (activeTab === 'all' || activeTab === 'combos') && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-5 bg-[#FF5C35] rounded" />
                  <h3 className="font-display font-black text-sm uppercase tracking-wider text-white">
                    DaCrib Chef Signature Combination Combos
                  </h3>
                </div>

                {filteredCombos.length === 0 ? (
                  <p className="text-gray-400 text-xs font-mono italic">No combos matched query.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {filteredCombos.map((combo) => {
                      const count = cart.filter(c => c.name === combo.name).length;
                      return (
                        <div 
                          key={combo.id}
                          onClick={() => addToCart({ name: combo.name, price: combo.price }, 'combo')}
                          className="bg-[#0B2217] border border-emerald-900/40 rounded-2xl p-5 hover:border-[#FF5630] hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between relative group overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 bg-[#FF5C35]/15 text-[#FF5C35] px-3.5 py-1.5 rounded-bl-xl font-mono text-[10px] font-black uppercase">
                            ${combo.price}.00 Combo Flat
                          </div>
                          
                          <div>
                            <span className="text-[#FF5C35] font-mono text-[9px] uppercase font-black bg-[#FF5C35]/15 px-2 py-0.5 rounded mr-2 h-fit">
                              {combo.tag}
                            </span>
                            <h4 className="font-display font-black text-white group-hover:text-[#FF5C35] text-base uppercase tracking-tight mt-2.5">
                              {combo.name}
                            </h4>
                            <p className="text-emerald-100/60 text-xs mt-1.5 leading-relaxed font-sans pr-12 text-justify">
                              {combo.desc}
                            </p>
                            <div className="mt-3.5 flex flex-wrap gap-1.5">
                              {combo.itemsList.map((inc) => (
                                <span key={inc} className="bg-emerald-950/40 text-emerald-400 font-mono text-[9px] px-2 py-0.5 rounded border border-emerald-900/40 flex items-center gap-1 font-semibold">
                                  <span className="w-1 h-1 rounded-full bg-[#FF5C35]" /> {inc}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-emerald-950/35 flex justify-between items-center text-[10px] font-mono">
                            <span className="text-emerald-500/60">Pre-customized, high extraction velocity choice</span>
                            <div className="flex items-center space-x-2">
                              {count > 0 && (
                                <span className="bg-[#FF5C35] text-white font-black px-1.5 py-0.5 rounded text-[9px]">
                                  {count} Added
                                </span>
                              )}
                              <span className="text-[#FF5C35] hover:underline font-bold uppercase transition text-[11px]">
                                Add +
                              </span>
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SUB-SECTION: CHAMPION PLATTERS */}
            {(activeTab === 'all' || activeTab === 'entrees') && (
              <div className="space-y-4 pt-4">
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-5 bg-[#2E7D32] rounded" />
                  <h3 className="font-display font-black text-sm uppercase tracking-wider text-[#1C1C24]">
                    Sensational Platter Entrees (Includes 2 Sides of Choice)
                  </h3>
                </div>

                {filteredEntrees.length === 0 ? (
                  <p className="text-gray-400 text-xs font-mono italic">No entrees match query.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredEntrees.map((item) => {
                      const count = cart.filter(c => c.name === item.name).length;
                      return (
                        <div
                          key={item.id}
                          onClick={() => addToCart(item, 'entree')}
                          className="bg-[#0B2217] border-l-4 border-l-emerald-500 border border-y-[#091C13]/60 border-r-[#091C13]/60 rounded-r-2xl p-5 hover:border-r-[#FF5C35]/40 hover:shadow-sm transition cursor-pointer flex flex-col justify-between h-full group"
                        >
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                {item.tag && (
                                  <span className="bg-emerald-950 text-emerald-400 text-[8px] font-black uppercase font-mono px-1.5 py-0.5 rounded border border-emerald-900/60 block w-fit mb-1">
                                    {item.tag}
                                  </span>
                                )}
                                <h4 className="font-display font-black text-sm text-white group-hover:text-[#FF5C35] transition leading-snug uppercase tracking-tight">
                                  {item.name}
                                </h4>
                              </div>
                              <span className="font-mono font-black text-sm text-emerald-400 bg-emerald-950 border border-emerald-900/60 px-2 py-0.5 rounded">
                                ${item.price}
                              </span>
                            </div>
                            <p className="text-emerald-100/60 text-[11px] mt-1.5 line-clamp-2 pr-2">
                              {item.desc}
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-emerald-950/35 flex justify-between items-center text-[10px] font-mono">
                            <span className="text-emerald-500/60 uppercase text-[8px]">{item.calories}</span>
                            <div className="flex items-center space-x-1.5">
                              {count > 0 && (
                                <span className="bg-[#FF5C35] text-white font-black px-1 py-0.5 rounded text-[8px]">
                                  {count} Added
                                </span>
                              )}
                              <span className="text-emerald-400 group-hover:text-[#FF5C35] font-black uppercase transition text-[9px]">
                                Select +
                              </span>
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SUB-SECTION: VELVETY ALFREDOS */}
            {filteredAlfredos.length > 0 && (activeTab === 'all' || activeTab === 'alfredos') && (
              <div className="space-y-4 pt-4">
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-5 bg-[#C62828] rounded" />
                  <h3 className="font-display font-black text-sm uppercase tracking-wider text-white">
                    House Made Velvety Alfredo Pasta Penne / Fettuccine
                  </h3>
                </div>

                {filteredAlfredos.length === 0 ? (
                  <p className="text-gray-400 text-xs font-mono italic">No alfredos match query.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredAlfredos.map((item) => {
                      const count = cart.filter(c => c.name === item.name).length;
                      return (
                        <div
                          key={item.id}
                          onClick={() => addToCart(item, 'alfredo')}
                          className="bg-[#0B2217] border-l-4 border-l-[#C62828] border border-y-[#091C13]/60 border-r-[#091C13]/60 rounded-r-2xl p-5 hover:border-r-[#FF5C35]/40 hover:shadow-sm transition cursor-pointer flex flex-col justify-between h-full group"
                        >
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                {item.tag && (
                                  <span className="bg-red-950/40 text-red-400 text-[8px] font-black uppercase font-mono px-1.5 py-0.5 rounded border border-red-900/40 block w-fit mb-1">
                                    {item.tag}
                                  </span>
                                )}
                                <h4 className="font-display font-black text-sm text-white group-hover:text-[#FF5C35] transition leading-snug uppercase tracking-tight">
                                  {item.name}
                                </h4>
                              </div>
                              <span className="font-mono font-black text-sm text-[#FF5C35] bg-red-950/30 border border-red-900/40 px-2.5 py-0.5 rounded">
                                ${item.price}
                              </span>
                            </div>
                            <p className="text-emerald-100/60 text-[11px] mt-1.5 line-clamp-2 pr-2">
                              {item.desc}
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-emerald-950/35 flex justify-between items-center text-[10px] font-mono">
                            <span className="text-emerald-500/60 uppercase text-[8px]">{item.calories}</span>
                            <div className="flex items-center space-x-1.5">
                              {count > 0 && (
                                <span className="bg-[#FF5C35] text-white font-black px-1.5 py-0.5 rounded text-[8px]">
                                  {count} Added
                                </span>
                              )}
                              <span className="text-emerald-400 group-hover:text-[#FF5C35] font-black uppercase transition text-[9px]">
                                Add Pasta +
                              </span>
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SUB-SECTION: WINGS */}
            {wingFlavors.length > 0 && (activeTab === 'all' || activeTab === 'wings') && (
              <div className="space-y-4 pt-4">
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-5 bg-[#FF5C35] rounded" />
                  <h3 className="font-display font-black text-sm uppercase tracking-wider text-white">
                    Crispy Wings Box (10 Pieces Signature Box)
                  </h3>
                </div>

                <div className="bg-[#0B2217] border border-emerald-900/45 rounded-2xl p-6 relative shadow-xs">
                  <div className="absolute top-4 right-4 bg-[#FF5C35] text-white text-[9px] uppercase font-mono font-black px-3 py-1 rounded-full shadow shadow-[#FF5C35]/15">
                    VALUE RATE: $25.00 Box
                  </div>
                  <h4 className="font-display font-black text-lg text-white uppercase tracking-tight">
                    10 Piece Premium Signature Wing Dings Platter
                  </h4>
                  <p className="text-emerald-100/60 text-xs mt-1.5 leading-relaxed pr-12 text-justify">
                    Fried to a deep crisp in clean soy-free oil. Each wing dining selection can be pre-configured with multiple starting glazes. Select the glaze starting defaults of your bucket here:
                  </p>

                  <p className="text-[9px] uppercase font-mono text-emerald-400 font-extrabold mt-4 mb-2">
                    🎯 Tap Glaze Sauce Starters:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {wingFlavors.map((flavor) => {
                      const selected = tempWingFlavors.includes(flavor);
                      return (
                        <button
                          key={flavor}
                          type="button"
                          onClick={() => {
                            if (tempWingFlavors.includes(flavor)) {
                              if (tempWingFlavors.length > 1) {
                                setTempWingFlavors(prev => prev.filter(f => f !== flavor));
                              }
                            } else {
                              setTempWingFlavors(prev => [...prev, flavor]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition border cursor-pointer ${
                            selected 
                              ? 'bg-[#FF5C35] border-transparent text-white shadow-xs font-black' 
                              : 'bg-emerald-950/60 hover:bg-emerald-950 border-emerald-900 text-emerald-400 hover:text-white'
                          }`}
                        >
                          {flavor} {selected && '✓'}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-5 pt-4 border-t border-emerald-950/35 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <span className="text-[9px] font-mono text-emerald-500/60 uppercase">
                      🔒 Zero-lard high-velocity crispness standards
                    </span>
                    <button
                      type="button"
                      onClick={() => addToCart({ name: 'Wing Dings Platter (10 Pieces)', price: 25 }, 'wings', { wingFlavors: [...tempWingFlavors] })}
                      className="w-full sm:w-auto bg-emerald-950 hover:bg-[#FF5C35] text-emerald-400 hover:text-white font-display font-black uppercase tracking-wider text-xs px-5 py-3 rounded-xl flex items-center justify-center space-x-1.5 transition border border-emerald-905-emerald-900 transition duration-150 shadow cursor-pointer"
                    >
                      <span>Load Wing Ding Box</span>
                      <Plus className="w-3.5 h-3.5 text-current" />
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* SUB-SECTION: SIDES */}
            {(activeTab === 'all' || activeTab === 'sides') && (
              <div className="space-y-4 pt-4">
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-5 bg-neutral-400 rounded" />
                  <h3 className="font-display font-black text-sm uppercase tracking-wider text-white">
                    Staple Comfort Sides ($6.00 Extra Portions)
                  </h3>
                </div>

                {filteredSides.length === 0 ? (
                  <p className="text-gray-400 text-xs font-mono italic">No sides match query.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {filteredSides.map((side) => {
                      const count = cart.filter(c => c.name === `Extra Side: ${side}`).length;
                      return (
                        <button
                          key={side}
                          type="button"
                          onClick={() => addToCart({ name: `Extra Side: ${side}`, price: 6 }, 'side')}
                          className="bg-[#0B2217] border border-emerald-900/40 hover:border-[#FF5630] rounded-xl p-3.5 transition text-left flex flex-col justify-between h-20 cursor-pointer relative group"
                        >
                          <span className="text-emerald-500 font-mono text-[8px] uppercase font-bold tracking-wider">
                            $6.00 SIDE
                          </span>
                          
                          <div className="flex justify-between items-end w-full mt-1">
                            <span className="font-display font-black text-[11px] text-white group-hover:text-[#FF5C35] transition uppercase leading-tight">
                              {side}
                            </span>
                            <div className="rounded-lg bg-emerald-950 p-1 group-hover:bg-[#FF5C35]/15 transition shrink-0">
                              {count > 0 ? (
                                <span className="text-[#FF5C35] font-black text-[10px] px-1 bg-white rounded">
                                  {count}
                                </span>
                              ) : (
                                <Plus className="w-3 h-3 text-emerald-500 group-hover:text-[#FF5C35]" />
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SUB-SECTION: SALADS */}
            {(activeTab === 'all' || activeTab === 'salads') && (
              <div className="space-y-4 pt-4">
                <div className="flex items-center space-x-2">
                  <span className="w-1.5 h-5 bg-teal-500 rounded" />
                  <h3 className="font-display font-black text-sm uppercase tracking-wider text-white">
                    Soul Food Salads 🥗
                  </h3>
                </div>

                {filteredSalads.length === 0 ? (
                  <p className="text-gray-400 text-xs font-mono italic">No salads match query.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredSalads.map((item) => {
                      const count = cart.filter(c => c.name === item.name).length;
                      return (
                        <div
                          key={item.id}
                          onClick={() => addToCart(item, 'salad')}
                          className="bg-[#0B2217] border-l-4 border-l-teal-500 border border-y-[#091C13]/60 border-r-[#091C13]/60 rounded-r-2xl p-5 hover:border-r-[#FF5C35] hover:shadow-sm transition cursor-pointer flex flex-col justify-between h-full group"
                        >
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                {item.tag && (
                                  <span className="bg-emerald-950 text-emerald-400 text-[8px] font-black uppercase font-mono px-1.5 py-0.5 rounded border border-emerald-900/40 block w-fit mb-1">
                                    {item.tag}
                                  </span>
                                )}
                                <h4 className="font-display font-black text-sm text-white group-hover:text-[#FF5C35] transition leading-snug uppercase tracking-tight">
                                  {item.name}
                                </h4>
                              </div>
                              <span className="font-mono font-black text-sm text-teal-400 bg-teal-950/40 border border-teal-900/50 px-2.5 py-0.5 rounded">
                                ${item.price}
                              </span>
                            </div>
                            <p className="text-emerald-100/60 text-[11px] mt-1.5 line-clamp-2 pr-2">
                              {item.desc}
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-emerald-950/35 flex justify-between items-center text-[10px] font-mono">
                            <span className="text-emerald-500/60 uppercase text-[8px]">{item.calories}</span>
                            <div className="flex items-center space-x-1.5">
                              {count > 0 && (
                                <span className="bg-[#FF5C35] text-white font-black px-1.5 py-0.5 rounded text-[8px]">
                                  {count} Added
                                </span>
                              )}
                              <span className="text-emerald-400 group-hover:text-[#FF5C35] font-black uppercase transition text-[9px]">
                                Add Salad +
                              </span>
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* DIRECTORY Accordion FAQs */}
            <div id="faq-accordions" className="bg-[#0B2217] border border-emerald-900/40 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-display font-black text-[13px] text-white uppercase tracking-wider flex items-center gap-2">
                <HelpCircle className="w-4.5 h-4.5 text-[#FF5C35]" />
                <span>WEST PHILLY COMFORY DIRECTORY FAQ</span>
              </h3>
              
              <div className="divide-y divide-emerald-950/40">
                {faqs.map((faq, idx) => {
                  const open = activeFaq === idx;
                  return (
                    <div key={faq.q} className="py-3 first:pt-0 last:pb-0">
                      <button
                        type="button"
                        onClick={() => setActiveFaq(open ? null : idx)}
                        className="w-full text-left font-display font-black text-xs text-white hover:text-[#FF5C35] flex justify-between items-center transition cursor-pointer"
                      >
                        <span className="uppercase tracking-tight pr-4">{faq.q}</span>
                        <span className="text-[10px] bg-emerald-950 text-emerald-400 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                          {open ? "−" : "+"}
                        </span>
                      </button>
                      {open && (
                        <p className="text-xs text-emerald-100/60 font-sans mt-2 ml-1 leading-relaxed text-justify">
                          {faq.a}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* RIGHT COL: THERMAL DIGITAL TICKET ORDER BUILDER + COMPLIANT TIMINGS - SPAN 5 */}
          <aside id="order-form-ticket" className="lg:col-span-5 space-y-6">
            
            {/* INVOICE CARD IN COHESIVE MIDNIGHT THERMAL FORMAT */}
            <div className="bg-[#121215] text-white rounded-3xl shadow-xl overflow-hidden relative flex flex-col justify-between border border-neutral-800">
              
              {/* ZigZag paper tear top design using vector SVG mask pattern or repeating gradients */}
              <div className="h-3 w-full bg-repeating-zigzag opacity-85 z-10 select-none bg-[#FF5C35]" />

              <div className="p-6 space-y-5">
                
                {/* Brand Terminal Headers */}
                <div className="text-center font-mono space-y-1 pb-4 border-b border-dashed border-neutral-800 text-neutral-400">
                  <p className="text-sm font-display font-black text-white tracking-widest uppercase">
                    DACRIB KITCHEN INVOICE
                  </p>
                  <p className="text-[9px] uppercase tracking-wider text-neutral-500">
                    52nd & Baltimore Hwy • Phila PA 19139
                  </p>
                  <p className="text-[9px] text-[#FF5C35] uppercase tracking-wide font-black">
                    ESTABLISHED 2018 | DISPATCH TEXT SYSTEM
                  </p>
                  
                  <div className="pt-2 flex justify-between text-[9px] text-neutral-500 select-none">
                    <span>OP ID: CRIB-WEB</span>
                    <span>QUEUE VELOCITY: 15-20M</span>
                  </div>
                </div>

                {/* VISITOR DATA INPUTS */}
                <div className="space-y-4 pt-1">
                  
                  {/* VIP Member Session Banner alert banner */}
                  {currentUser ? (
                    <div className="bg-emerald-950/40 border border-emerald-900 rounded-2xl p-3.5 flex items-center justify-between select-none">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-xl">👑</span>
                        <div>
                          <p className="text-[8.5px] font-mono text-emerald-400 uppercase font-black tracking-widest leading-none">Logged In VIP Member</p>
                          <p className="text-xs font-display font-black uppercase tracking-wider text-white mt-1 leading-none">{currentUser.displayName}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setVipModalOpen(true)}
                        className="px-3 py-1.5 rounded-lg bg-[#050E0A] hover:bg-[#071F15] border border-emerald-900/80 text-emerald-400 text-[8.5px] font-mono uppercase font-extrabold cursor-pointer flex items-center gap-1 transition"
                      >
                        <History className="w-3 h-3 text-emerald-400" />
                        <span>History ({pastOrders.length})</span>
                      </button>
                    </div>
                  ) : (
                    <div className="bg-[#121B15] border border-emerald-950 rounded-2xl p-3.5 flex items-center justify-between select-none">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-xl">⭐</span>
                        <div>
                          <p className="text-[8.5px] font-mono text-emerald-500 uppercase font-bold tracking-widest leading-none">Join VIP Account System</p>
                          <p className="text-[9.5px] text-gray-400 mt-1 leading-none">Track past orders & lock in faster dispatch!</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setVipModalOpen(true)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-950/60 text-emerald-400 hover:bg-[#FF5C35] hover:text-white text-[8.5px] font-mono uppercase font-black tracking-wider transition cursor-pointer"
                      >
                        Log In / Join
                      </button>
                    </div>
                  )}
                  
                  {/* Dining Passenger Name */}
                  <div>
                    <label className="text-[9px] uppercase font-mono text-neutral-400 tracking-widest font-black block mb-1">
                      1. DINING GUEST PREPARATION NAME <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter Pickup / Delivery Name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#FF5630] rounded-xl px-4 py-3 text-sm text-[#FF5C35] font-semibold focus:outline-none placeholder:text-neutral-500 font-mono transition"
                    />
                  </div>

                  {/* FULFILLMENT SELECTOR */}
                  <div>
                    <label className="text-[9px] uppercase font-mono text-neutral-400 tracking-widest font-black block mb-1">
                      2. FULFILLMENT PROTOCOL METHOD
                    </label>
                    <div className="grid grid-cols-2 gap-2 bg-neutral-900 p-1.5 rounded-xl border border-neutral-800">
                      <button
                        type="button"
                        onClick={() => setOrderType('pickup')}
                        className={`py-2 px-3 rounded-lg text-[10px] font-display font-black uppercase transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                          orderType === 'pickup'
                            ? 'bg-[#FF5C35] text-white shadow'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        <Store className="w-3.5 h-3.5" />
                        <span>PICKUP</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderType('delivery')}
                        className={`py-2 px-3 rounded-lg text-[10px] font-display font-black uppercase transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                          orderType === 'delivery'
                            ? 'bg-[#FF5C35] text-white shadow'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>DELIVERY</span>
                      </button>
                    </div>
                  </div>

                  {/* Delivery Address Capture box if Delivery selected */}
                  {orderType === 'delivery' && (
                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase font-mono text-neutral-400 tracking-widest font-black block mb-1">
                        📍 DELIVERY STREET ADDRESS <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter full address (e.g. 5200 Market St, apt 2B)"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#FF5630] rounded-xl px-4 py-3 text-sm text-[#FF5C35] font-semibold focus:outline-none placeholder:text-neutral-500 font-mono transition"
                      />
                      <p className="text-[10px] text-[#FF5C35] font-mono font-medium flex items-center gap-1">
                        ⚠️ Pls make sure address is correct for delivery driver!
                      </p>
                      <p className="text-[9px] text-neutral-500 font-sans italic">
                        Active Delivery Range: West Philly, Southwest Philly, and South Philly.
                      </p>
                    </div>
                  )}

                  {/* TIMING WINDOWS SCHEDULER MATCHING USER SPECIFICS */}
                  <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-900 space-y-3">
                    <div className="flex items-center gap-1.5 select-none">
                      <Clock className="w-3.5 h-3.5 text-[#FF5C35]" />
                      <span className="text-[9px] uppercase font-mono text-neutral-300 font-black tracking-widest">
                        3. KITCHEN TIMING PREFERENCE
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setOrderTimeType('asap')}
                        className={`py-2 px-3 rounded-xl transition-all flex flex-col items-center justify-center border text-center cursor-pointer ${
                          orderTimeType === 'asap'
                            ? 'bg-[#FF5C35] border-transparent text-white font-black shadow'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        <span className="text-[10px] font-display font-black uppercase">⚡ ASAP Prep</span>
                        <span className="text-[8px] opacity-80 mt-0.5 font-mono">15-25 Mins wait</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderTimeType('scheduled')}
                        className={`py-2 px-3 rounded-xl transition-all flex flex-col items-center justify-center border text-center cursor-pointer ${
                          orderTimeType === 'scheduled'
                            ? 'bg-amber-600 border-transparent text-white font-black shadow'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        <span className="text-[10px] font-display font-black uppercase">📅 Today Schedule</span>
                        <span className="text-[8px] opacity-80 mt-0.5 font-mono">Set specific hour</span>
                      </button>
                    </div>

                    {/* Today hourly slot scroller */}
                    {orderTimeType === 'scheduled' && (
                      <div className="pt-2 border-t border-neutral-900">
                        <p className="text-[8px] font-mono text-[#FF5C35] font-black pb-1 uppercase select-none">
                          📅 Pick Today Target window ({scheduledTime}):
                        </p>
                        <div className="flex gap-1 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-neutral-800 pt-1">
                          {[
                            '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', 
                            '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', 
                            '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM'
                          ].map((timeVal) => {
                            const isCh = scheduledTime === timeVal;
                            return (
                              <button
                                key={timeVal}
                                type="button"
                                onClick={() => setScheduledTime(timeVal)}
                                className={`py-1 px-2.5 rounded text-[8px] font-mono shrink-0 cursor-pointer ${
                                  isCh 
                                    ? 'bg-amber-600 text-white font-black' 
                                    : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
                                }`}
                              >
                                {timeVal}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SPECIAL ALLERGY NOTE TEXTAREA */}
                  <div>
                    <label className="text-[9px] uppercase font-mono text-neutral-400 tracking-widest font-black block mb-1">
                      4. KITCHEN NOTE / ALLERGY SPECS (Optional)
                    </label>
                    <textarea
                      placeholder="e.g. Garlic allergy, sauce on the side, well-done lamb chops, no cabbage..."
                      value={specialNotes}
                      onChange={(e) => setSpecialNotes(e.target.value)}
                      rows={2}
                      className="w-full bg-neutral-900 border border-neutral-800 focus:border-[#FF5630] rounded-xl px-3 py-2 text-xs text-neutral-300 focus:outline-none placeholder:text-neutral-500 font-mono resize-none"
                    />
                  </div>

                </div>

                {/* CURRENT ACTIVE CART ITEMS RENDER */}
                <div className="pt-5 border-t border-dashed border-neutral-800">
                  <p className="text-[9px] font-mono uppercase text-neutral-500 font-black mb-3 select-none">
                    🛒 INVOICED BASKET PRODUCTS:
                  </p>

                  <div className="space-y-3 max-h-[290px] overflow-y-auto pr-1">
                    {cart.length === 0 ? (
                      <div className="py-8 text-center text-neutral-600 font-mono">
                        <p className="italic text-xs">Your basket is empty</p>
                        <p className="text-[8px] text-[#FF5C35]/60 uppercase font-black tracking-widest mt-1">
                          ✦ Tap Diner elements above to load ✦
                        </p>
                      </div>
                    ) : (
                      calculatedItems.map((item) => (
                        <div
                          key={item.cartId}
                          className="bg-neutral-900 rounded-xl p-3.5 relative border border-neutral-850 space-y-2.5"
                        >
                          {/* Trash indicator */}
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.cartId)}
                            className="absolute top-3 right-3 text-neutral-500 hover:text-[#FF5C35] p-1 cursor-pointer transition"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <div className="pr-6">
                            <span className="text-[7.5px] uppercase font-mono font-black border border-[#FF5C35]/30 bg-[#FF5C35]/15 text-[#FF5C35] px-1.5 py-0.5 rounded">
                              {item.category}
                            </span>
                            <h4 className="font-display font-black text-amber-500 text-[11px] leading-tight uppercase tracking-tight mt-1.5 select-none">
                              {item.name}
                            </h4>
                            <p className="font-mono text-white text-[11px] font-bold mt-0.5">${item.computedPrice}.00</p>
                          </div>

                          {/* Dynamic Side Selections for entrees inside slip */}
                          {item.category === 'entree' && (
                            <div className="space-y-1.5 pt-1.5 border-t border-neutral-850">
                              <p className="text-[8.5px] uppercase font-mono text-neutral-500 font-black">
                                Configure Sides:
                              </p>
                              <div className="grid grid-cols-2 gap-1.5">
                                {[0, 1].map((index) => (
                                  <select
                                    key={index}
                                    value={item.selectedSides?.[index] || sides[index]}
                                    onChange={(e) => updateCartItemSides(item.cartId, index, e.target.value)}
                                    className="bg-neutral-950 border border-neutral-800 text-[10px] text-neutral-300 rounded-lg px-1.5 py-1 focus:outline-none focus:border-[#FF5C35] font-mono cursor-pointer"
                                  >
                                    {sides.map((s) => (
                                      <option key={s} value={s} className="bg-neutral-950 text-white">
                                        {s}
                                      </option>
                                    ))}
                                  </select>
                                ))}
                              </div>

                              <label className="flex items-center space-x-2 text-[10px] font-mono text-neutral-500 hover:text-white cursor-pointer select-none mt-1">
                                <input
                                  type="checkbox"
                                  checked={item.extraOptionChecked || false}
                                  onChange={() => toggleCartItemExtra(item.cartId)}
                                  className="accent-[#FF5C35] w-3 h-3"
                                />
                                <span>Double Meat Portion (+$5)</span>
                              </label>
                            </div>
                          )}

                          {/* Alfredo pasta options */}
                          {item.category === 'alfredo' && (
                            <div className="space-y-1.5 pt-1.5 border-t border-neutral-850">
                              <p className="text-[8.5px] uppercase font-mono text-neutral-500 font-black">
                                Choose Noodles Base:
                              </p>
                              <div className="flex gap-2">
                                {['Penne', 'Fettuccine'].map((base) => (
                                  <button
                                    key={base}
                                    type="button"
                                    onClick={() => updatePastaBase(item.cartId, base as any)}
                                    className={`px-3 py-1 rounded text-[9px] font-mono uppercase font-black transition cursor-pointer ${
                                      item.pastaBase === base 
                                        ? 'bg-[#FF5C35] text-white' 
                                        : 'bg-neutral-950 text-neutral-500 border border-neutral-800'
                                    }`}
                                  >
                                    {base}
                                  </button>
                                ))}
                              </div>

                              <label className="flex items-center space-x-2 text-[10px] font-mono text-neutral-500 hover:text-white cursor-pointer select-none mt-1">
                                <input
                                  type="checkbox"
                                  checked={item.extraOptionChecked || false}
                                  onChange={() => toggleCartItemExtra(item.cartId)}
                                  className="accent-[#FF5C35] w-3 h-3"
                                />
                                <span>Extra Pasta Help (+$5)</span>
                              </label>
                            </div>
                          )}

                          {/* Wings customizer */}
                          {item.category === 'wings' && (
                            <div className="space-y-1.5 pt-1.5 border-t border-neutral-850">
                              <p className="text-[8.5px] uppercase font-mono text-neutral-500 font-black">
                                Edit glazes bucket:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {wingFlavors.map((fl) => {
                                  const contains = item.wingFlavors?.includes(fl);
                                  return (
                                    <button
                                      key={fl}
                                      type="button"
                                      onClick={() => toggleWingFlavorInCart(item.cartId, fl)}
                                      className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase transition ${
                                        contains 
                                          ? 'bg-red-950 text-[#FF5C35] border border-red-800 font-bold' 
                                          : 'bg-neutral-950 text-neutral-600'
                                      }`}
                                    >
                                      {fl}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Duplicate Option */}
                          <div className="pt-2 border-t border-neutral-850/40 flex justify-between items-center text-[8.5px] font-mono text-neutral-500">
                            <span>Plate options saved live</span>
                            <button
                              type="button"
                              onClick={() => cloneCartPlate(item)}
                              className="bg-neutral-950 hover:bg-neutral-800 hover:text-amber-500 py-0.5 px-2 rounded transition border border-neutral-800 flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-2 h-2" /> Cloner
                            </button>
                          </div>

                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* COST BREAKDOWN MATRIX */}
                <div className="bg-neutral-950 rounded-xl p-3.5 border border-neutral-900 space-y-2 font-mono text-[11px] text-neutral-400 select-none">
                  <div className="flex justify-between uppercase">
                    <span>Order Subtotal</span>
                    <span>${subtotal}.00</span>
                  </div>
                  {appliedDiscount > 0 && (
                    <div className="flex justify-between text-amber-500 font-semibold uppercase">
                      <span>Reward Ticket Credit ({rewardCode})</span>
                      <span>-${appliedDiscount}.00</span>
                    </div>
                  )}
                  {orderType === 'delivery' && (
                    <div className="flex justify-between text-emerald-500 font-semibold uppercase">
                      <span>Philly Delivery Fee</span>
                      <span>+$6.00</span>
                    </div>
                  )}
                  <div className="border-t border-dashed border-neutral-800 pt-2 flex justify-between text-white font-black text-xs uppercase tracking-wider">
                    <span>Total Bill Sum</span>
                    <span className="text-[#FF5C35] text-sm">${grandTotal}.00</span>
                  </div>
                </div>

                {/* SMS TICKETING PAYLOAD VIEW */}
                {cart.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] uppercase font-mono text-neutral-500 font-black tracking-widest block">
                      📟 GENERATED SMS TICKET SPEC DRAFT PREVIEW:
                    </p>
                    <div className="bg-neutral-950 border border-neutral-900 text-neutral-400 font-mono text-[9px] p-3.5 rounded-xl max-h-[140px] overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
                      {formatSmsBody()}
                    </div>
                  </div>
                )}

                {/* PREFERRED SETTLEMENTS */}
                <div className="space-y-2">
                  <p className="text-[9px] uppercase font-mono text-neutral-500 font-black text-center tracking-wider block">
                    CHOOSE HOW TO SETTLE THE BILL PAYMENT:
                  </p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 select-none">
                    {[
                      { name: 'Apple Pay' as const, label: 'ApplePay', color: 'bg-white text-black font-extrabold border-transparent ring-1 ring-white' },
                      { name: 'CashApp' as const, label: 'CashApp', color: 'bg-emerald-600 text-white font-bold border-transparent' },
                      { name: 'Zelle' as const, label: 'Zelle', color: 'bg-purple-800 text-white font-bold border-transparent' },
                      { name: 'Cash' as const, label: 'Cash', color: 'bg-yellow-600 text-white font-bold border-transparent' }
                    ].map((pay) => {
                      const isCh = preferredPayment === pay.name;
                      return (
                        <button
                          key={pay.name}
                          type="button"
                          onClick={() => setPreferredPayment(pay.name)}
                          className={`py-2 rounded-lg text-[9px] uppercase font-mono transition border cursor-pointer ${
                            isCh 
                              ? `${pay.color} ring-2 ring-[#FF5C35]` 
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {pay.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ACTION SUBMIT */}
                <div className="pt-2">
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="button"
                    onClick={handlePlaceOrder}
                    className="w-full bg-[#FF5C35] hover:bg-[#E64117] text-white font-display font-black uppercase tracking-wider text-xs md:text-sm py-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg cursor-pointer"
                  >
                    <span>SUBMIT SMS ORDER TICKET</span>
                    <ChevronRight className="w-5 h-5 text-white shrink-0" />
                  </motion.button>
                  <p className="text-[8px] font-mono text-neutral-500 text-center mt-2.5 uppercase tracking-wide">
                    *Taps SMS client instantly linked to direct kitchen line: 445.326.2790
                  </p>

                  {cart.length > 0 && (
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      type="button"
                      onClick={downloadPdfReceipt}
                      className="w-full mt-2.5 bg-neutral-900 hover:bg-neutral-800 text-[#FF5C35] border border-neutral-800 font-display font-black uppercase tracking-wider text-[11px] py-3 rounded-xl flex items-center justify-center space-x-2 shadow-md cursor-pointer transition"
                    >
                      <Download className="w-4 h-4 text-[#FF5C35]" />
                      <span>Download PDF Receipt</span>
                    </motion.button>
                  )}
                </div>

                {/* SCAN BARCODE FOR COMPLIANCE AND REALISM */}
                <div className="flex flex-col items-center justify-center pt-4 border-t border-dashed border-neutral-800">
                  <div className="flex items-center space-x-0.5 justify-center opacity-40 mb-1.5 select-none">
                    {[1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 4, 1, 2, 2, 3, 1, 4, 1, 3].map((w, i) => (
                      <span key={i} className="bg-white h-6" style={{ width: `${w * 1.5}px` }} />
                    ))}
                  </div>
                  <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest select-none">
                    *CRIB-DISPATCH-{Math.floor(grandTotal + 101)}-ORDER-VERIFICATION*
                  </span>
                </div>

              </div>

              {/* Repeating zig zag paper tear bottom design */}
              <div className="h-3 w-full bg-repeating-zigzag opacity-85 z-10 select-none bg-[#FF5C35]" />

            </div>
          </aside>

        </div>



        {/* BOTTOM METADATA & FOOTER */}
        <footer className="bg-[#030304] text-white px-6 md:px-12 py-10 text-center space-y-4 border-t border-emerald-950/20">
          <p className="font-display font-black tracking-widest text-[#FF5C35] text-lg uppercase font-sans">
            DACRIB KITCHEN CO. EST 2018
          </p>
          <p className="text-emerald-100/50 text-xs font-mono max-w-2xl mx-auto leading-relaxed">
            📍 Philadelphia, West Philly PA 19139 | West Philly, Southwest Philly & South Philly delivery active. Premium fast comfort soul cooking standard since 2018.
          </p>
          <div className="text-[9px] text-[#FF5C35] uppercase tracking-widest font-mono font-bold">
            NO PORK • ZERO LARD • HEAVY PORTIONS ALWAYS
          </div>
          <p className="text-[10px] text-neutral-500/70 border-t border-emerald-950/25 pt-5 font-mono">
            © {new Date().getFullYear()} DaCrib Kitchen. All Rights Reserved. Crafted exclusively using advanced responsive grid frameworks.
          </p>
        </footer>

      </div>

      {/* 👑 VIP MEMBERS & AUTH DASHBOARD MODAL */}
      <AnimatePresence>
        {vipModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs overflow-hidden">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`bg-[#091511] border border-emerald-900 text-white rounded-3xl w-full shadow-2xl overflow-hidden relative flex flex-col transition-all duration-300 max-h-[90vh] md:max-h-[85vh] ${isOwnerUser ? 'max-w-3xl' : 'max-w-xl'}`}
            >
              {/* Top tear ribbon */}
              <div className="h-2 w-full bg-[#FF5C35]" />

              {/* Header with Exit trigger - FIXED at the top */}
              <div className="p-6 pb-4 border-b border-emerald-950/45 flex justify-between items-center bg-[#091511] shrink-0 z-10">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#FF5C35]/15 text-[#FF5C35] flex items-center justify-center font-bold">
                    👑
                  </div>
                  <div>
                    <h4 className="font-display font-black text-sm uppercase tracking-wider text-white">
                      VIP Crib Members Hub
                    </h4>
                    <p className="text-[9.5px] font-mono text-emerald-400 uppercase tracking-widest">
                      {isFirebaseMode ? '🔥 Connected to Cloud Firebase Auth' : '📂 Instant Guest Local Auth'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setVipModalOpen(false); setAuthError(null); }}
                  className="p-1.5 rounded-full bg-emerald-950/30 hover:bg-[#FF5C35] hover:text-white text-emerald-400 transition cursor-pointer"
                  aria-label="Close Member Dashboard"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Scrollable Main Content Area */}
              <div className="p-6 md:p-8 pt-4 md:pt-4 space-y-6 overflow-y-auto flex-1 max-h-[calc(90vh-100px)] md:max-h-[calc(85vh-100px)]">
                
                {/* Main Content Pane */}
                {currentUser ? (
                  isOwnerUser ? (
                    /* 👑 ELITE OWNER COMMAND CENTER (ADMIN VIEW) */
                    <div className="space-y-6">
                      
                      {/* Top Admin Header Bar */}
                      <div className="bg-[#122A1E] p-4 rounded-2xl border border-emerald-800 flex justify-between items-center shadow-lg">
                        <div>
                          <p className="text-[9px] uppercase font-mono text-emerald-400 font-extrabold tracking-widest">🚨 DACRIB KITCHEN OWNER SYSTEM</p>
                          <h5 className="font-display font-black text-white text-base uppercase mt-1">Crib Kitchen Owner Console 👑</h5>
                          <p className="text-xs text-[#FF5C35] font-mono mt-0.5">{currentUser.email}</p>
                        </div>
                        <button
                          onClick={handleLogout}
                          className="py-2 px-3.5 rounded-xl bg-red-950/30 border border-red-900/60 text-red-400 font-display font-black text-[10px] uppercase tracking-wider hover:bg-[#FF5C35] hover:text-white transition cursor-pointer flex items-center gap-1"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Exit Console</span>
                        </button>
                      </div>

                      {/* Admin Quick Metrics Widgets */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-[#050E0A] border border-emerald-950 p-3 rounded-xl text-center">
                          <p className="text-[8px] font-mono text-gray-500 uppercase font-black">Total Orders</p>
                          <p className="text-xl font-display font-black text-amber-500 mt-1">{allAdminOrders.length}</p>
                        </div>
                        <div className="bg-[#050E0A] border border-emerald-950 p-3 rounded-xl text-center">
                          <p className="text-[8px] font-mono text-gray-500 uppercase font-black font-sans">Active Queue</p>
                          <p className="text-xl font-display font-black text-[#FF5C35] mt-1">
                            {allAdminOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length}
                          </p>
                        </div>
                        <div className="bg-[#050E0A] border border-emerald-950 p-3 rounded-xl text-center">
                          <p className="text-[8px] font-mono text-gray-500 uppercase font-black">All Revenue</p>
                          <p className="text-xl font-display font-black text-emerald-400 mt-1">
                            ${allAdminOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.grandTotal, 0)}.00
                          </p>
                        </div>
                      </div>

                      {/* All Customer Orders Interactive List */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-1.5">
                            <History className="w-4 h-4 text-[#FF5C35]" />
                            <span className="text-[10px] uppercase font-mono text-emerald-300 font-black tracking-widest">
                              ALL CUSTOMER ORDERS IN QUEUE ({allAdminOrders.length})
                            </span>
                          </div>
                          <button
                            onClick={loadAllAdminOrders}
                            className="bg-emerald-950/40 border border-emerald-900 hover:bg-emerald-900 transition text-[8.5px] font-mono px-2.5 py-1 rounded text-emerald-400 uppercase font-black cursor-pointer"
                          >
                            🔄 Refresh Queue
                          </button>
                        </div>

                        <div className="max-h-[320px] overflow-y-auto space-y-3 pr-1.5 scrollbar-thin scrollbar-thumb-emerald-950">
                          {allAdminOrders.length === 0 ? (
                            <div className="text-center py-12 text-neutral-500 font-mono text-xs border border-dashed border-emerald-950/50 rounded-2xl bg-[#040D09]">
                              📭 No active or historic customer orders. Orders placed will reveal here!
                            </div>
                          ) : (
                            allAdminOrders.map((ord) => {
                              const activeStatusColors: Record<string, string> = {
                                pending: 'bg-yellow-950/40 text-yellow-500 border border-yellow-800/40',
                                cooking: 'bg-orange-950/40 text-orange-400 border border-orange-850/40',
                                preparing: 'bg-orange-950/40 text-orange-400 border border-orange-850/40',
                                ready: 'bg-teal-950/40 text-teal-400 border border-teal-900/40',
                                out_for_delivery: 'bg-blue-950/40 text-blue-400 border border-blue-900/40',
                                completed: 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40',
                                cancelled: 'bg-red-950/40 text-red-400 border border-red-900/40'
                              };

                              return (
                                <div key={ord.orderId} className="bg-[#050E0A] border border-emerald-950 p-4 rounded-xl space-y-3">
                                  {/* Order Title Header */}
                                  <div className="flex justify-between items-start text-[10px] font-mono border-b border-emerald-950/35 pb-2">
                                    <div>
                                      <span className="font-black text-amber-500 text-xs">{ord.customerName}</span>
                                      <p className="text-[9px] text-gray-500 lowercase mt-0.5">{ord.orderId} • {ord.userId}</p>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${activeStatusColors[ord.status] || 'bg-gray-900 text-gray-500'}`}>
                                      {ord.status}
                                    </span>
                                  </div>

                                  {/* Meal Items and details */}
                                  <div className="text-[10px] font-mono text-neutral-300 space-y-0.5 bg-neutral-950/30 p-2 rounded-lg border border-emerald-950/15">
                                    {ord.items.map((it, idx) => (
                                      <div key={idx} className="flex justify-between">
                                        <span>• {it.name} {it.selectedSides && `(${it.selectedSides.join(', ')})`}</span>
                                        <span>${it.computedPrice}.00</span>
                                      </div>
                                    ))}
                                    <div className="flex justify-between pt-1.5 mt-1 border-t border-emerald-950/15 font-black text-white text-[11px]">
                                      <span>GRAND TOTAL:</span>
                                      <span>${ord.grandTotal}.00</span>
                                    </div>
                                  </div>

                                  {/* Order meta info */}
                                  <div className="flex justify-between text-[8px] font-mono text-gray-400 uppercase select-none">
                                    <span>Method: {ord.orderType}</span>
                                    <span>Payment: {ord.preferredPayment}</span>
                                    <span>Arrival Scheduled: {ord.scheduledTime}</span>
                                  </div>

                                  {/* Dispatch Control Suite */}
                                  <div className="pt-2 border-t border-emerald-950/30">
                                    <p className="text-[8px] font-mono text-emerald-500 uppercase font-bold tracking-widest mb-1.5">Dispatch Control Suite:</p>
                                    <div className="grid grid-cols-5 gap-1">
                                      <button
                                        onClick={() => handleUpdateStatus(ord.orderId, 'cooking')}
                                        className={`py-1 text-[8px] font-mono uppercase font-black rounded border transition cursor-pointer ${ord.status === 'cooking' ? 'bg-orange-500 text-white' : 'bg-[#050E0A] hover:bg-orange-950/20 text-orange-400 border-orange-900/45'}`}
                                      >
                                        🍳 Cook
                                      </button>
                                      <button
                                        onClick={() => handleUpdateStatus(ord.orderId, 'ready')}
                                        className={`py-1 text-[8px] font-mono uppercase font-black rounded border transition cursor-pointer ${ord.status === 'ready' ? 'bg-teal-500 text-white' : 'bg-[#050E0A] hover:bg-teal-950/20 text-teal-400 border-teal-900/45'}`}
                                      >
                                        📦 Ready
                                      </button>
                                      <button
                                        onClick={() => handleUpdateStatus(ord.orderId, 'out_for_delivery')}
                                        className={`py-1 text-[8px] font-mono uppercase font-black rounded border transition cursor-pointer ${ord.status === 'out_for_delivery' ? 'bg-blue-500 text-white' : 'bg-[#050E0A] hover:bg-blue-950/20 text-blue-400 border-blue-900/45'}`}
                                      >
                                        🚗 Route
                                      </button>
                                      <button
                                        onClick={() => handleUpdateStatus(ord.orderId, 'completed')}
                                        className={`py-1 text-[8px] font-mono uppercase font-black rounded border transition cursor-pointer ${ord.status === 'completed' ? 'bg-emerald-500 text-white animate-pulse' : 'bg-[#050E0A] hover:bg-emerald-950/20 text-emerald-400 border-emerald-900/45'}`}
                                      >
                                        ✅ Done
                                      </button>
                                      <button
                                        onClick={() => handleUpdateStatus(ord.orderId, 'cancelled')}
                                        className={`py-1 text-[8px] font-mono uppercase font-black rounded border transition cursor-pointer ${ord.status === 'cancelled' ? 'bg-red-500 text-white' : 'bg-[#050E0A] hover:bg-red-950/20 text-red-400 border-red-900/45'}`}
                                      >
                                        ❌ Cancel
                                      </button>
                                    </div>

                                    {/* Real-time Tracking/Courier update info */}
                                    <div className="mt-2.5 pt-2 border-t border-emerald-950/20 flex gap-1.5 items-center">
                                      <input
                                        type="text"
                                        id={`tracking-${ord.orderId}`}
                                        placeholder="Live ETA / Courier status (e.g. ETA 15m, Sean driving)..."
                                        defaultValue={ord.trackingInfo || ''}
                                        className="flex-1 bg-black/60 border border-emerald-900/40 rounded px-2 py-1 text-[9px] font-mono text-amber-300 placeholder:text-emerald-700/60 focus:outline-none focus:border-[#FF5C35]"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const el = document.getElementById(`tracking-${ord.orderId}`) as HTMLInputElement;
                                          if (el) {
                                            handleUpdateStatus(ord.orderId, ord.status, el.value);
                                          }
                                        }}
                                        className="bg-[#FF5C35] hover:bg-[#E64117] text-white px-2.5 py-1 rounded text-[8px] font-mono uppercase font-black tracking-wider transition cursor-pointer shrink-0"
                                      >
                                        Update Details
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                    </div>
                  ) : (
                    /* 👑 LOGGED IN MEMBER PERSONAL VIEW WITH PROGRESS STATUS TRACKER */
                    <div className="space-y-6">
                      
                      {/* Member Info Card */}
                      <div className="bg-[#050E0A] p-4 rounded-2xl border border-emerald-950/60 flex justify-between items-center shadow-md">
                        <div>
                          <p className="text-[9px] uppercase font-mono text-emerald-500 font-extrabold tracking-widest">Logged In Member Profile</p>
                          <h5 className="font-display font-black text-white text-base uppercase mt-1">{currentUser.displayName}</h5>
                          <p className="text-xs text-emerald-400/80 font-mono mt-0.5">{currentUser.email}</p>
                        </div>
                        <button
                          onClick={handleLogout}
                          className="py-2.5 px-4 rounded-xl bg-red-950/30 border border-red-900/60 text-red-400 font-display font-black text-[10px] uppercase tracking-wider hover:bg-[#FF5C35] hover:text-white transition cursor-pointer flex items-center gap-1.5"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>

                      {/* 🎫 REAL-TIME LOYALTY MILESTONES & REWARDS SYSTEM */}
                      {(() => {
                        const completedOrdersSpend = pastOrders
                          .filter(o => o.status === 'completed')
                          .reduce((sum, o) => sum + o.grandTotal, 0);
                        
                        const registrationBonus = 0;
                        const totalEarnedPoints = registrationBonus + Math.round(completedOrdersSpend * 10);
                        const availablePoints = Math.max(0, totalEarnedPoints - redeemedPoints);

                        let tierName = "Bronze Soul Companion 🥉";
                        let tierColor = "text-amber-600";
                        let progressPercent = Math.min(100, (availablePoints / 500) * 100);
                        let nextMilestone = "Earn 500 pts to lock in Silver tier";
                        
                        if (availablePoints > 1500) {
                          tierName = "Crib Soul Legend 👑";
                          tierColor = "text-yellow-400";
                          progressPercent = 100;
                          nextMilestone = "Ultimate Soul status achieved! Maximum discount options unlocked.";
                        } else if (availablePoints > 500) {
                          tierName = "Silver Platter Elite 🥈";
                          tierColor = "text-teal-300";
                          progressPercent = Math.min(100, ((availablePoints - 500) / 1000) * 100);
                          nextMilestone = "Earn 1500 pts to lock in Legendary status";
                        }

                        const rewardsCatalog = [
                          { title: "Sweet Candied Yams Side Discount", cost: 300, val: 6, code: "CRIB-REWARD-YAMS-6" },
                          { title: "$10 Off Any Gourmet Platter Coupon", cost: 500, val: 10, code: "CRIB-REWARD-COUPON-10" },
                          { title: "Free Cajun Pasta Sautéed Chicken Alfredo", cost: 1200, val: 20, code: "CRIB-REWARD-ALFREDO-20" },
                          { title: "Free Honey Garlic Lamb Chops Platter (4)", cost: 1800, val: 30, code: "CRIB-REWARD-LAMB-30" },
                        ];

                        return (
                          <div className="bg-[#050E0A] p-5 rounded-2xl border border-emerald-900/40 relative space-y-4">
                            
                            {/* Card header */}
                            <div className="flex justify-between items-center border-b border-emerald-950 pb-3">
                              <div className="flex items-center space-x-2">
                                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                                  <Award className="w-4 h-4" />
                                </div>
                                <div>
                                  <h6 className="font-display font-black text-xs text-white uppercase tracking-wider">Crib Points Loyalty Ledger</h6>
                                  <p className="text-[8px] font-mono text-emerald-400 uppercase tracking-widest">Earn 10 pts per $1 spent on all platters</p>
                                </div>
                              </div>
                              <span className={`text-[9px] font-mono uppercase bg-neutral-950 px-2 py-0.5 rounded border border-emerald-950/40 font-black ${tierColor}`}>
                                {tierName}
                              </span>
                            </div>

                            {/* Points indicator meter bar */}
                            <div className="bg-neutral-950/80 p-4 rounded-xl border border-emerald-950/20 space-y-2.5">
                              <div className="flex justify-between items-baseline select-none">
                                <span className="text-[9px] font-mono text-gray-500 uppercase font-black">AVAILABLE BALANCE</span>
                                <div className="flex items-baseline space-x-1 font-mono">
                                  <span className="text-2xl font-display font-black text-amber-500">{availablePoints}</span>
                                  <span className="text-[10px] text-gray-400">PTS</span>
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div className="space-y-1">
                                <div className="h-2 bg-emerald-950/30 rounded-full overflow-hidden border border-emerald-950/45">
                                  <motion.div
                                    className="h-full bg-gradient-to-r from-amber-500 to-[#FF5C35] rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPercent}%` }}
                                    transition={{ type: "spring", stiffness: 60, damping: 12 }}
                                  />
                                </div>
                                <div className="flex justify-between text-[8px] font-mono text-neutral-500 uppercase tracking-wider">
                                  <span>{availablePoints} PTS</span>
                                  <span>{nextMilestone}</span>
                                </div>
                              </div>
                            </div>

                            {/* Reward Notification Messages */}
                            {rewardSuccessMessage && (
                              <div className="bg-emerald-950/35 border border-emerald-800 text-emerald-400 text-[10px] font-mono p-3 rounded-lg leading-relaxed shadow-inner">
                                {rewardSuccessMessage}
                              </div>
                            )}

                            {/* Active Coupon Code indicator */}
                            {rewardCode && (
                              <div className="bg-amber-950/30 border border-amber-900 p-3 rounded-xl flex justify-between items-center text-[10px] font-mono text-amber-400">
                                <div className="space-y-0.5">
                                  <span className="font-extrabold uppercase tracking-wide">🎟️ Active Cart Coupon: {rewardCode}</span>
                                  <p className="text-[8px] text-gray-500">Substracts -${activeRewardDiscount}.00 inside active checkout totals</p>
                                </div>
                                <button
                                  onClick={handleCancelLoyaltyDiscount}
                                  className="text-red-400 hover:text-red-300 uppercase font-bold text-[8px] bg-red-950/20 border border-red-900/30 px-2 py-1 rounded"
                                >
                                  Reset Code
                                </button>
                              </div>
                            )}

                            {/* The claimable rewards list row */}
                            <div className="space-y-2">
                              <p className="text-[8.5px] uppercase font-mono text-emerald-300 font-extrabold tracking-widest select-none">
                                REDEEM REWARDS FOR CUSTOM FLAVOR COUPONS:
                              </p>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {rewardsCatalog.map((rew, idx) => {
                                  const canClaim = availablePoints >= rew.cost;
                                  const isCurrentlyRedeemed = rewardCode === rew.code;
                                  
                                  return (
                                    <div
                                      key={idx}
                                      className={`p-3 rounded-xl border flex flex-col justify-between h-28 font-mono select-none transition ${
                                        isCurrentlyRedeemed 
                                          ? 'bg-amber-950/20 border-amber-800' 
                                          : canClaim 
                                            ? 'bg-neutral-950 border-emerald-950 hover:border-emerald-800/60' 
                                            : 'bg-neutral-950/50 border-emerald-950/20 opacity-60'
                                      }`}
                                    >
                                      <div className="space-y-1">
                                        <div className="flex justify-between items-start">
                                          <span className="text-[9px] text-[#FF5C35] font-extrabold uppercase leading-snug break-words pr-2 max-w-[100px]">{rew.title}</span>
                                          <span className="text-[8px] uppercase tracking-wide font-black bg-neutral-950 border border-emerald-950 px-1.5 py-0.5 rounded text-amber-500 shrink-0">
                                            {rew.cost} PTS
                                          </span>
                                        </div>
                                        <p className="text-[8px] text-gray-500">Value check coupon saving: -${rew.val}.00</p>
                                      </div>

                                      <button
                                        disabled={!canClaim || isCurrentlyRedeemed}
                                        onClick={() => handleRedeemLoyalty(rew.cost, rew.title, rew.val, rew.code)}
                                        className={`w-full py-1.5 rounded-lg text-center font-display font-black uppercase text-[8px] tracking-wider transition ${
                                          isCurrentlyRedeemed
                                            ? 'bg-amber-950/80 text-amber-400 border border-amber-900/20 cursor-default'
                                            : canClaim
                                              ? 'bg-[#FF5C35] hover:bg-[#E64117] text-white cursor-pointer shadow'
                                              : 'bg-emerald-950/10 text-emerald-800 cursor-not-allowed border border-emerald-950/15'
                                        }`}
                                      >
                                        {isCurrentlyRedeemed ? '🎟️ COUPON READY' : canClaim ? '🎁 CLAIM TICKET' : '🔒 NEED MORE POINTS'}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                          </div>
                        );
                      })()}

                      {/* REAL-TIME PROGRESS TRACKER FOR ACTIVE ORDERS */}
                      {(() => {
                        const activeOrders = pastOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
                        if (activeOrders.length === 0) return null;

                        const getStatusStepStatus = (status: string) => {
                          switch (status) {
                            case 'pending': 
                            case 'confirmed':
                              return 0;
                            case 'preparing':
                            case 'cooking':
                              return 1;
                            case 'ready':
                              return 2;
                            case 'out_for_delivery':
                              return 3;
                            case 'completed':
                              return 4;
                            default:
                              return 0;
                          }
                        };

                        return (
                          <div className="space-y-4 pt-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-1.5 select-none">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-[10px] uppercase font-mono text-[#FF5C35] font-black tracking-widest">
                                  🚨 SIZZLING LIVE ORDER TRACKER ({activeOrders.length})
                                </span>
                              </div>
                              <button
                                onClick={() => loadOrders(currentUser.uid)}
                                className="text-[8.5px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900 px-2 py-1 rounded hover:bg-emerald-900 transition flex items-center gap-1"
                              >
                                🔄 Refresh Status
                              </button>
                            </div>

                            {activeOrders.map((ord) => {
                              const stepIndex = getStatusStepStatus(ord.status);
                              const steps = [
                                { label: 'Received', icon: Clock },
                                { label: 'Kitchen', icon: Flame },
                                { label: 'Ready', icon: Store },
                                { label: 'On Way', icon: Truck },
                                { label: 'Arrived', icon: CheckCircle }
                              ];

                              return (
                                <div key={ord.orderId} className="bg-[#050E0A] p-4 rounded-2xl border border-emerald-900/40 shadow-inner relative space-y-4">
                                  <div className="flex justify-between items-center border-b border-emerald-950/40 pb-2 text-[10px] font-mono select-none">
                                    <span className="font-extrabold text-white">REF: <span className="text-[#FF5C35]">{ord.orderId}</span></span>
                                    <span className="text-emerald-500 uppercase font-semibold">{ord.orderType} • {ord.status}</span>
                                  </div>

                                  {/* Horizontal Step Tracker Bar */}
                                  <div className="py-2 relative">
                                    {/* Background Track Line */}
                                    <div className="absolute top-[18px] left-[16px] right-[16px] h-1 bg-emerald-950/75 rounded -translate-y-1/2" />
                                    {/* Active Track Overlay */}
                                    <div 
                                      className="absolute top-[18px] left-[16px] h-1 bg-[#FF5C35] rounded -translate-y-1/2 transition-all duration-500 ease-out" 
                                      style={{ width: `calc(${stepIndex * 25}% - ${stepIndex === 4 ? '4px' : '0px'})` }}
                                    />

                                    {/* Nodes */}
                                    <div className="relative flex justify-between">
                                      {steps.map((st, idx) => {
                                        const StepIcon = st.icon;
                                        const isDone = idx < stepIndex;
                                        const isCurrent = idx === stepIndex;

                                        return (
                                          <div key={idx} className="flex flex-col items-center">
                                            <div 
                                              className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-300 relative z-10 ${
                                                isDone 
                                                  ? 'bg-[#FF5C35] border-[#FF5C35] text-white' 
                                                  : isCurrent 
                                                    ? 'bg-[#050E0A] border-[#FF5C35] text-[#FF5C35] shadow-[0_0_10px_rgba(255,92,53,0.4)] scale-110' 
                                                    : 'bg-[#050E0A] border-emerald-950 text-emerald-600'
                                              }`}
                                            >
                                              <StepIcon className="w-4.5 h-4.5" />
                                            </div>
                                            <span className={`text-[8px] font-mono mt-1.5 uppercase font-bold tracking-tight select-none ${
                                              isCurrent 
                                                ? 'text-[#FF5C35]' 
                                                : isDone 
                                                  ? 'text-emerald-400' 
                                                  : 'text-neutral-500'
                                            }`}>
                                              {st.label}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Miniature details for active progress */}
                                  <div className="space-y-2">
                                    <p className="text-[10px] font-mono text-emerald-100/60 leading-normal bg-[#040C08]/90 p-2.5 rounded-lg border border-emerald-950/20 text-center">
                                      Your order is currently <span className="font-extrabold text-white uppercase">{ord.status.replace('_', ' ')}</span>. We're packing those heavy Philly soul food portions exactly as you built them!
                                    </p>
                                    
                                    {ord.trackingInfo && (
                                      <div className="bg-amber-950/20 border border-amber-900/30 p-2.5 rounded-lg text-left flex items-start gap-2 shadow-inner">
                                        <span className="text-[11px] shrink-0 text-amber-400">🚚</span>
                                        <div className="font-mono text-[9.5px] text-amber-200">
                                          <span className="font-extrabold text-[#FF5C35] uppercase tracking-widest text-[8px] block mb-0.5">🚨 Owner Dispatch Live Tracking:</span>
                                          <span className="leading-relaxed font-sans">{ord.trackingInfo}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {/* Member Order History Accordion */}
                      <div className="space-y-3">
                        <div className="flex items-center space-x-1.5">
                          <History className="w-4 h-4 text-[#FF5C35]" />
                          <span className="text-[10px] uppercase font-mono text-emerald-300 font-black tracking-widest">
                            Your Complete Meal Order History ({pastOrders.length})
                          </span>
                        </div>

                        <div className="max-h-[190px] overflow-y-auto space-y-2.5 pr-1.5 scrollbar-thin scrollbar-thumb-emerald-950">
                          {pastOrders.length === 0 ? (
                            <div className="text-center py-8 text-neutral-500 font-mono text-xs border border-dashed border-emerald-950/50 rounded-2xl bg-[#040D09]">
                              🚫 No historic orders logged. Add plates and order to record first!
                            </div>
                          ) : (
                            pastOrders.map((ord) => (
                              <div key={ord.orderId} className="bg-[#050E0A] border border-emerald-950 p-3.5 rounded-xl space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-mono border-b border-emerald-950/35 pb-1.5">
                                  <span className="font-extrabold text-[#FF5C35]">{ord.orderId}</span>
                                  <span className="text-neutral-500">{new Date(ord.createdAt).toLocaleDateString([], {month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</span>
                                </div>
                                <div className="text-[10px] font-mono text-neutral-300 space-y-0.5">
                                  {ord.items.map((it, idx) => (
                                    <div key={idx} className="flex justify-between">
                                      <span>• {it.name}</span>
                                      <span>${it.computedPrice}.00</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-mono border-t border-emerald-950/35 pt-1.5 font-extrabold pb-1">
                                  <span className="text-emerald-400/90 uppercase">{ord.orderType} ({ord.preferredPayment}) • {ord.status.replace('_', ' ')}</span>
                                  <span className="text-white text-xs">Total: ${ord.grandTotal}.00</span>
                                </div>

                                {ord.trackingInfo && (
                                  <div className="bg-amber-950/20 border border-amber-900/20 p-2 rounded-lg text-left mt-1 text-[8.5px] font-mono text-amber-200">
                                    <span className="font-extrabold text-[#FF5C35]">Dispatch Note:</span> {ord.trackingInfo}
                                  </div>
                                )}

                                {ord.status === 'completed' && (
                                  <div className="bg-[#030906] p-3 rounded-lg border border-emerald-900/20 mt-1 space-y-2">
                                    {ord.rating ? (
                                      <div className="space-y-1">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[9px] uppercase font-mono text-neutral-400 font-extrabold">Your Stored Meal Rating:</span>
                                          <div className="flex items-center gap-0.5 text-amber-500">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                              <Star
                                                key={star}
                                                className={`w-3 h-3 ${star <= ord.rating! ? 'text-amber-400 fill-amber-400' : 'text-neutral-700'}`}
                                              />
                                            ))}
                                          </div>
                                        </div>
                                        {ord.review && (
                                          <p className="text-[10px] font-mono text-gray-300 italic">
                                            "{ord.review}"
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[9px] uppercase font-mono text-neutral-400 font-extrabold">GIVE A STAR RATING:</span>
                                          <div className="flex items-center gap-1.5">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                              <button
                                                type="button"
                                                key={star}
                                                onClick={() => setFeedbackRating(prev => ({ ...prev, [ord.orderId]: star }))}
                                                className="focus:outline-none transition hover:scale-115 active:scale-95 cursor-pointer"
                                              >
                                                <Star
                                                  className={`w-3.5 h-3.5 ${
                                                    star <= (feedbackRating[ord.orderId] || 5) 
                                                      ? 'text-amber-400 fill-amber-400' 
                                                      : 'text-neutral-700'
                                                  }`}
                                                />
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                        
                                        <div className="flex gap-2">
                                          <input
                                            type="text"
                                            placeholder="Comment (e.g. Yams were phenomenal!)"
                                            value={feedbackReview[ord.orderId] || ""}
                                            onChange={(e) => setFeedbackReview(prev => ({ ...prev, [ord.orderId]: e.target.value }))}
                                            className="flex-1 bg-[#030906] border border-emerald-900/60 text-[10px] px-2.5 py-1.5 rounded-lg font-mono text-white focus:outline-none focus:border-amber-500 placeholder:text-emerald-600/65"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => handleSubmitFeedback(ord.orderId)}
                                            className="bg-[#FF5C35] hover:bg-[#E64117] text-white px-3 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-wider font-extrabold transition cursor-pointer"
                                          >
                                            Submit
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  /* AUTHENTICATION PORTAL PANE */
                  <form onSubmit={handleAuthSubmit} className="space-y-4">
                    <p className="text-[11px] font-mono text-[#D4AF37]/80 leading-relaxed text-center uppercase tracking-wider font-extrabold pb-2">
                      ⭐ Join VIP Guest Services to instantly record past meal orders, bypass name setups & unlock supreme comfort tiers!
                    </p>

                    <div>
                      <label className="text-[9px] uppercase font-mono text-emerald-400 tracking-widest font-black block mb-1">
                        Enter Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="you@email.com"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        className="w-full bg-[#030906] border border-emerald-800 focus:border-[#FF5630] rounded-xl px-4 py-3 text-sm text-amber-400 focus:outline-none placeholder:text-emerald-600/70 font-mono transition"
                      />
                    </div>

                    {isSignUp && (
                      <div>
                        <label className="text-[9px] uppercase font-mono text-emerald-400 tracking-widest font-black block mb-1">
                          Your Full Member Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Your Name"
                          value={authName}
                          onChange={(e) => setAuthName(e.target.value)}
                          className="w-full bg-[#030906] border border-emerald-800 focus:border-[#FF5630] rounded-xl px-4 py-3 text-sm text-amber-400 focus:outline-none placeholder:text-emerald-600/70 font-mono transition"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-[9px] uppercase font-mono text-emerald-400 tracking-widest font-black block mb-1">
                        Crib Password (At least 6 chars) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        className="w-full bg-[#030906] border border-emerald-800 focus:border-[#FF5630] rounded-xl px-4 py-3 text-sm text-amber-400 focus:outline-none placeholder:text-emerald-600/70 font-mono transition"
                      />
                    </div>

                    {authError && (
                      <p className="text-xs font-mono text-red-500 bg-red-950/20 px-3.5 py-2.5 rounded-xl border border-red-900/40 uppercase tracking-tight">
                        ⚠️ Error: {authError}
                      </p>
                    )}

                    <div className="pt-2">
                      <button
                        type="submit"
                        className="w-full bg-[#FF5C35] hover:bg-[#E64117] text-white font-display font-black uppercase tracking-wider text-xs md:text-sm py-3.5 rounded-xl flex items-center justify-center space-x-2 shadow-lg cursor-pointer"
                      >
                        <Key className="w-4.5 h-4.5 text-white" />
                        <span>{isSignUp ? 'REGISTER VIP MEMBERSHIP' : 'SIGN IN SECURELY'}</span>
                      </button>
                    </div>

                    <div className="flex items-center my-3 select-none">
                      <div className="flex-1 border-t border-emerald-950/40"></div>
                      <span className="px-3 text-[10px] text-emerald-400/50 font-mono">OR</span>
                      <div className="flex-1 border-t border-emerald-950/40"></div>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        className="w-full bg-white hover:bg-neutral-100 text-neutral-900 font-display font-bold uppercase tracking-wider text-xs py-3 rounded-xl flex items-center justify-center space-x-2 py-3 shadow-md cursor-pointer transition active:scale-98"
                      >
                        <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24">
                          <path
                            fill="#EA4335"
                            d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.61 14.99 1 12 1 7.35 1 3.37 3.65 1.39 7.5L5.1 10.4C5.97 7.21 8.93 5.04 12 5.04z"
                          />
                          <path
                            fill="#4285F4"
                            d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.48-1.12 2.73-2.38 3.58l3.69 2.87c2.16-1.99 3.4-4.92 3.4-8.55z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.1 13.6c-.24-.71-.38-1.48-.38-2.27s.14-1.56.38-2.27L1.39 6.16c-.8 1.59-1.25 3.38-1.25 5.27s.45 3.68 1.25 5.27l3.71-2.9z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.69-2.87c-1.02.68-2.33 1.09-3.9 1.09-3.07 0-5.67-2.17-6.6-5.04l-3.71 2.9C3.37 20.35 7.35 23 12 23z"
                          />
                        </svg>
                        <span>SIGN IN WITH GOOGLE</span>
                      </button>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-mono text-emerald-400/80 pt-3 border-t border-emerald-950/40">
                      <span>{isSignUp ? 'Already have an account?' : "New to the Crib?"}</span>
                      <button
                        type="button"
                        onClick={() => { setIsSignUp(!isSignUp); setAuthError(null); }}
                        className="text-[#FF5C35] font-black uppercase tracking-wide underline cursor-pointer"
                      >
                        {isSignUp ? 'Log in here' : 'Create an account'}
                      </button>
                    </div>
                  </form>
                )}

              </div>

              {/* Bottom tag tear */}
              <div className="h-2 w-full bg-[#FF5C35] select-none" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
