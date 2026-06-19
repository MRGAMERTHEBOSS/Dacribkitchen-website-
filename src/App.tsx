import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Phone, 
  Clock, 
  MapPin, 
  ShoppingBag, 
  ChevronRight, 
  Sparkle, 
  Sparkles,
  Trash2, 
  Check, 
  Plus, 
  Minus, 
  Info, 
  HelpCircle,
  Truck,
  Store,
  DollarSign,
  Search,
  Star,
  RotateCcw,
  CheckCircle,
  ArrowRight,
  ChevronDown,
  Menu,
  X,
  User,
  History,
  Download,
  FileText,
  BadgeAlert,
  Lock,
  LogOut
} from 'lucide-react';

import { CartItem, OrderType, PreferredPayment, OrderTimeType } from './types';
import { entrees, alfredos, salads, sides, faqs } from './data';
import { jsPDF } from 'jspdf';
import confetti from 'canvas-confetti';

// Import Firebase integration helpers
import { 
  auth,
  isFirebaseMode, 
  getUserProfile, 
  registerProfile, 
  fetchUserOrders, 
  placeUserOrder, 
  submitOrderFeedback, 
  getPersistentGuestId, 
  signInWithGoogle,
  fetchAllOrders,
  UserProfile,
  PastOrder
} from './firebase';

import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';

// Import image assets
import lambChopsImg from './assets/images/lamb_chops_platter.png';
import salmonImg from './assets/images/salmon_platter.png';
import turkeyWingsImg from './assets/images/turkey_wing_platter.png';
import steakImg from './assets/images/steak_tips_platter.png';
import chickenImg from './assets/images/chicken_platter.png';
import wingsImg from './assets/images/wings_platter.png';
import shrimpImg from './assets/images/Sauteed_Shrimp.png';
import pastaSaladImg from './assets/images/Pasta_Salad.png';
import seafoodSaladImg from './assets/images/Seafood_Salad.png';
import sauteedSteakImg from './assets/images/Sautéed_Steak.png';
import logoImg from './assets/images/logo.png';

// Map IDs to imported images
const imageMap: Record<string, string> = {
  lamb_chops: lambChopsImg,
  salmon: salmonImg,
  turkey_wings: turkeyWingsImg,
  steak: sauteedSteakImg,
  chicken_platter: chickenImg,
  shrimp_platter: shrimpImg,
  pasta_salad: pastaSaladImg,
  seafood_salad: seafoodSaladImg,
};

export default function App() {
  // --- STATE PERSISTENCE CLIENT ENGINE ---
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('dacrib_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [customerName, setCustomerName] = useState(() => localStorage.getItem('dacrib_customerName') || '');
  const [orderType, setOrderType] = useState<OrderType>(() => (localStorage.getItem('dacrib_orderType') as OrderType) || 'pickup');
  const [preferredPayment, setPreferredPayment] = useState<PreferredPayment>(() => (localStorage.getItem('dacrib_preferredPayment') as PreferredPayment) || 'Apple Pay');
  const [orderTimeType, setOrderTimeType] = useState<OrderTimeType>(() => (localStorage.getItem('dacrib_orderTimeType') as OrderTimeType) || 'asap');
  const [scheduledTime, setScheduledTime] = useState(() => localStorage.getItem('dacrib_scheduledTime') || '6:00 PM');
  const [specialNotes, setSpecialNotes] = useState(() => localStorage.getItem('dacrib_specialNotes') || '');
  const [deliveryAddress, setDeliveryAddress] = useState(() => localStorage.getItem('dacrib_deliveryAddress') || '');

  // UI state managers
  const [activeView, setActiveView] = useState<'home' | 'history'>('home');
  const [activeTab, setActiveTab] = useState<'entrees' | 'salads' | 'sides'>('entrees');
  const [customizingItem, setCustomizingItem] = useState<any | null>(null);
  const [selectedSides, setSelectedSides] = useState<string[]>([]);
  const [extraOptionChecked, setExtraOptionChecked] = useState(false);
  
  const [orderPlacing, setOrderPlacing] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // --- IDENTITY & PROFILE STATES ---
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authLoading, setAuthLoading] = useState(false);

  // --- PAST ORDERS & REVIEWS STATES ---
  const [userOrders, setUserOrders] = useState<PastOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [submittingFeedbackMap, setSubmittingFeedbackMap] = useState<Record<string, boolean>>({});
  const [feedbackRatingMap, setFeedbackRatingMap] = useState<Record<string, number>>({});
  const [feedbackTextMap, setFeedbackTextMap] = useState<Record<string, string>>({});

  // --- PUBLIC REVIEWS WALL & RECIPES STATES ---
  const [publicReviews, setPublicReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [newReviewName, setNewReviewName] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewPlatter, setNewReviewPlatter] = useState('Honey garlic Lamb Chops');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Trigger transient top-layer alerts
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync to local storage on change
  useEffect(() => {
    localStorage.setItem('dacrib_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('dacrib_customerName', customerName);
    localStorage.setItem('dacrib_orderType', orderType);
    localStorage.setItem('dacrib_preferredPayment', preferredPayment);
    localStorage.setItem('dacrib_orderTimeType', orderTimeType);
    localStorage.setItem('dacrib_scheduledTime', scheduledTime);
    localStorage.setItem('dacrib_specialNotes', specialNotes);
    localStorage.setItem('dacrib_deliveryAddress', deliveryAddress);
  }, [customerName, orderType, preferredPayment, orderTimeType, scheduledTime, specialNotes, deliveryAddress]);

  // Load past orders for the active user/guest ID
  const loadUserOrders = async (userId: string) => {
    setOrdersLoading(true);
    try {
      const orders = await fetchUserOrders(userId);
      setUserOrders(orders);
    } catch (e) {
      console.error("Failed to load user orders", e);
    } finally {
      setOrdersLoading(false);
    }
  };

  // Listen to Firebase Auth state or restore local VIP cache on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('dacrib_logged_in_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setCurrentUser(parsed);
        if (!customerName) {
          setCustomerName(parsed.displayName);
        }
        loadUserOrders(parsed.uid);
      } catch (e) {
        console.error("Error parsing stored user", e);
      }
    } else {
      const guestId = getPersistentGuestId();
      loadUserOrders(guestId);
    }

    if (isFirebaseMode && auth) {
      const unsubscribe = auth.onAuthStateChanged(async (firebaseUser: any) => {
        if (firebaseUser) {
          try {
            const profile = await getUserProfile(firebaseUser.uid, firebaseUser.email || '');
            setCurrentUser(profile);
            localStorage.setItem('dacrib_logged_in_user', JSON.stringify(profile));
            setCustomerName(profile.displayName);
            loadUserOrders(profile.uid);
          } catch (err) {
            console.error("Error matching user profile in listener", err);
          }
        } else {
          // If signed out or guest
          const storedUserObj = localStorage.getItem('dacrib_logged_in_user');
          if (storedUserObj) {
            // clear visual cache on actual null auth
            setCurrentUser(null);
            localStorage.removeItem('dacrib_logged_in_user');
          }
          const guestId = getPersistentGuestId();
          loadUserOrders(guestId);
        }
      });
      return () => unsubscribe();
    }
  }, []);

  // Pricing math calculations
  const calculatedItems = useMemo(() => {
    return cart.map((it) => {
      let computedPrice = it.basePrice;
      if (it.extraOptionChecked) {
        computedPrice += 5; // Double portion is $5 extra
      }
      return {
        ...it,
        computedPrice
      };
    });
  }, [cart]);

  const subtotal = useMemo(() => {
    return calculatedItems.reduce((acc, it) => acc + it.computedPrice, 0);
  }, [calculatedItems]);

  const deliveryFee = orderType === 'delivery' ? 5 : 0;
  const grandTotal = subtotal + deliveryFee;

  // Add standard item or request custom configuration modal
  const handleItemAction = (item: any, isSalad: boolean = false) => {
    if (isSalad) {
      // Salads don't have mandatory sides, add immediately
      const newCartItem: CartItem = {
        cartId: `salad-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: item.name,
        basePrice: item.price,
        category: 'salad'
      };
      setCart((prev) => [...prev, newCartItem]);
      triggerToast(`Added ${item.name} to your tray! 🥗`);
      confetti({ particleCount: 30, spread: 40, colors: ['#D32F2F', '#E5A93C'] });
    } else {
      // Entrees trigger custom sides selection modal
      setCustomizingItem(item);
      setSelectedSides([]);
      setExtraOptionChecked(false);
    }
  };

  const handleApplyCustomizations = () => {
    if (!customizingItem) return;
    
    // Validate side options (must select up to 2, we strongly recommend exactly 2)
    if (selectedSides.length > 2) {
      triggerToast("You can choose a maximum of 2 complimentary sides!");
      return;
    }

    const newCartItem: CartItem = {
      cartId: `entree-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: customizingItem.name,
      basePrice: customizingItem.price,
      category: 'entree',
      selectedSides: [...selectedSides],
      extraOptionChecked
    };

    setCart((prev) => [...prev, newCartItem]);
    setCustomizingItem(null);
    triggerToast(`Configured & added ${customizingItem.name}! 🍳`);
    confetti({ particleCount: 40, spread: 50, colors: ['#D32F2F', '#E5A93C'] });
  };

  const toggleSideSelection = (sideName: string) => {
    if (selectedSides.includes(sideName)) {
      setSelectedSides(prev => prev.filter(s => s !== sideName));
    } else {
      if (selectedSides.length >= 2) {
        triggerToast("Maximum of 2 complimentary sides already chosen!");
        return;
      }
      setSelectedSides(prev => [...prev, sideName]);
    }
  };

  const handleRemoveFromCart = (cartId: string) => {
    setCart((prev) => prev.filter(it => it.cartId !== cartId));
    triggerToast("Item removed from your plate list.");
  };

  // Compile detailed text message payload to trigger SMS order placement
  const handleTriggerSmsOrder = () => {
    if (cart.length === 0) {
      triggerToast("Please add items to your dinner tray first!");
      return;
    }
    if (!customerName.trim()) {
      triggerToast("Please provide your name for the kitchen ticket!");
      return;
    }
    if (orderType === 'delivery' && !deliveryAddress.trim()) {
      triggerToast("Please enter a valid West Philly delivery address!");
      return;
    }

    let smsBody = `DACRIB KITCHEN ORDER\n`;
    smsBody += `Client: ${customerName}\n`;
    smsBody += `Type: ${orderType.toUpperCase()} (${orderTimeType === 'asap' ? 'ASAP' : `Scheduled ${scheduledTime}`})\n`;
    if (orderType === 'delivery') {
      smsBody += `Address: ${deliveryAddress}\n`;
    }
    smsBody += `Payment: ${preferredPayment}\n`;
    smsBody += `Items:\n`;

    calculatedItems.forEach((it, idx) => {
      const sides = it.selectedSides && it.selectedSides.length > 0 ? ` [${it.selectedSides.join(', ')}]` : '';
      const extra = it.extraOptionChecked ? ' +Double' : '';
      smsBody += `${idx + 1}. ${it.name}${sides}${extra} - $${it.computedPrice}\n`;
    });

    smsBody += `\nSubtotal: $${subtotal}.00\n`;
    if (deliveryFee > 0) smsBody += `Delivery: $${deliveryFee}.00\n`;
    smsBody += `Total: $${grandTotal}.00\n`;
    if (specialNotes.trim()) {
      smsBody += `Note: ${specialNotes}\n`;
    }
    smsBody += `Receipt: download PDF receipt and show this order when texting.\n`;
    smsBody += `\nCRIB-DISPATCH-VERIFIED`;

    const encoded = encodeURIComponent(smsBody);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const smsUrl = isIOS
      ? `sms:+14453262790&body=${encoded}`
      : `sms:+14453262790?body=${encoded}`;
    window.location.href = smsUrl;

    // Save order in history (real database persistent storage)
    setOrderPlacing(true);
    const orderData = {
      userId: currentUser?.uid || getPersistentGuestId(),
      customerName: customerName.trim(),
      items: calculatedItems.map(it => ({
        name: it.name,
        computedPrice: it.computedPrice,
        category: it.category,
        selectedSides: it.selectedSides || [],
        pastaBase: it.pastaBase || '',
        wingFlavors: it.wingFlavors || []
      })),
      subtotal,
      deliveryFee,
      grandTotal,
      orderType,
      scheduledTime: orderTimeType === 'asap' ? 'ASAP' : scheduledTime,
      preferredPayment,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    placeUserOrder(orderData).then((generatedId) => {
      setPlacedOrderId(generatedId);
      setOrderPlacing(false);
      setCart([]);
      confetti({ particleCount: 150, spread: 80, scaler: 1.2 });
      triggerToast(`Order dispatched! Ticket saved: ${generatedId} 🧾`);
      
      // Reload order list
      loadUserOrders(currentUser?.uid || getPersistentGuestId());
    }).catch((err) => {
      console.error(err);
      setOrderPlacing(false);
      triggerToast("Error logging ticket in order registry.");
    });
  };

  // Download high-fidelity invoice PDF receipt utilizing jsPDF
  const downloadPdfReceipt = () => {
    if (cart.length === 0 && !placedOrderId) {
      triggerToast("Add plates or place an order to get your invoice receipt!");
      return;
    }
    
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Vintage boutique letterhead styles
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(33, 33, 33); // charcoal gray
      doc.text("DA CRIB KITCHEN", 105, 20, { align: "center" });
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("Philadelphia's Premier Soul Food & Platter Spot", 105, 25, { align: "center" });
      doc.text("Direct Line / Crib dispatcher: 445-326-2790", 105, 30, { align: "center" });
      
      doc.setLineWidth(0.5);
      doc.setDrawColor(210, 210, 210);
      doc.line(15, 35, 195, 35);
      
      // Invoice metadata block
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      const randomTicketNum = Math.floor(100000 + Math.random() * 900000);
      doc.text(`TICKET REF: CRIB-DISPATCH-${randomTicketNum}`, 15, 45);
      doc.text(`DATE: ${new Date().toLocaleString()}`, 15, 51);
      doc.text(`ORDER TYPE: ${orderType.toUpperCase()}`, 15, 57);
      doc.text(`PAYMENT PREFERENCE: ${preferredPayment.toUpperCase()}`, 15, 63);
      if (customerName) {
        doc.text(`CUSTOMER: ${customerName.toUpperCase()}`, 15, 69);
      }
      
      // Table Header row (classic dark gray solid structure)
      doc.setFillColor(33, 33, 33);
      doc.rect(15, 76, 180, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.text("ITEM DETAILS & PLATTER CUSTOMIZATIONS", 18, 81);
      doc.text("QTY", 150, 81);
      doc.text("PRICE", 190, 81, { align: "right" });
      
      let currentY = 92;
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(60, 60, 60);

      const itemsToPrint = calculatedItems.length > 0 ? calculatedItems : [
        { name: "Sample Signature Platter Choice", computedPrice: 30, category: 'entree', selectedSides: ['Mac & Cheese', 'Candy Yams'], extraOptionChecked: false }
      ];

      itemsToPrint.forEach((item) => {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        // Draw main item title
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(33, 33, 33);
        doc.text(`${item.name}`, 18, currentY);
        
        // Qty and Subtotal
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(10);
        doc.text("1", 151, currentY);
        doc.text(`$${item.computedPrice}.00`, 190, currentY, { align: "right" });
        
        // Draw side details carefully
        let details: string[] = [];
        if (item.category === 'entree' && item.selectedSides) {
          details.push(`Sides choice: ${item.selectedSides.join(', ')}`);
          if (item.extraOptionChecked) details.push("Extra: Double Meat Portion (+$5)");
        } else if (item.category === 'salad') {
          details.push("Chilled specialty salad bowl prep");
        }
        
        if (details.length > 0) {
          currentY += 5;
          doc.setFont("Helvetica", "oblique");
          doc.setFontSize(8.5);
          doc.setTextColor(110, 110, 110);
          doc.text(details.join(" | "), 22, currentY);
        }
        
        currentY += 9;
      });

      // Separator line before totals
      doc.setLineWidth(0.3);
      doc.setDrawColor(220, 220, 220);
      doc.line(15, currentY, 195, currentY);
      currentY += 8;

      // Totals list
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text("Platters Subtotal:", 115, currentY);
      doc.text(`$${subtotal || 30}.00`, 190, currentY, { align: "right" });
      
      currentY += 6;
      doc.text("West Philly Delivery Fee:", 115, currentY);
      doc.text(`$${deliveryFee}.00`, 190, currentY, { align: "right" });
      
      currentY += 7;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(190, 30, 30); // Crimson highlight
      doc.text("GRAND BILL TOTAL:", 115, currentY);
      doc.text(`$${grandTotal || 30}.00`, 190, currentY, { align: "right" });

      currentY += 15;
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(130, 130, 130);
      doc.text("Secure order code formatted & dispatched instantly to dispatcher logs.", 105, currentY, { align: "center" });

      doc.setFont("Helvetica", "bold");
      doc.setTextColor(190, 30, 30);
      doc.text("THANK YOU FOR YOUR PATRONAGE! CRIB KITCHEN CO.", 105, currentY + 6, { align: "center" });

      doc.save(`Da_Crib_Receipt_${randomTicketNum}.pdf`);
      triggerToast("Compiled PDF Invoice dispatched successfully! 🧾");
    } catch (pdfErr) {
      console.error("PDF generation failed:", pdfErr);
      triggerToast("Failed to compile PDF. Check console logs!");
    }
  };

  // --- AUTH INTERACTIVE TRIGGERS ---
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      triggerToast("Complete your email and password!");
      return;
    }
    setAuthLoading(true);
    try {
      if (isFirebaseMode && auth) {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
        triggerToast("Welcome back to Da Crib, VIP! 🌟");
      } else {
        // Local auth fallback
        const mockUid = 'local-vip-' + authEmail.split('@')[0];
        const registered = await registerProfile(authEmail, authDisplayName || authEmail.split('@')[0], mockUid);
        setCurrentUser(registered);
        localStorage.setItem('dacrib_logged_in_user', JSON.stringify(registered));
        setCustomerName(registered.displayName);
        loadUserOrders(registered.uid);
        triggerToast("Logged in successfully (VIP Session) 🌟");
      }
      setAuthEmail('');
      setAuthPassword('');
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || "Failed to sign in. Check password!");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword || !authDisplayName) {
      triggerToast("Provide all fields for standard VIP sign up!");
      return;
    }
    setAuthLoading(true);
    try {
      if (isFirebaseMode && auth) {
        const res = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        const registered = await registerProfile(authEmail, authDisplayName, res.user.uid);
        setCurrentUser(registered);
        triggerToast("Registered & logged in as VIP! 🎉");
      } else {
        const mockUid = 'local-vip-' + authEmail.split('@')[0];
        const registered = await registerProfile(authEmail, authDisplayName, mockUid);
        setCurrentUser(registered);
        localStorage.setItem('dacrib_logged_in_user', JSON.stringify(registered));
        setCustomerName(registered.displayName);
        loadUserOrders(registered.uid);
        triggerToast("Registered & logged in (VIP Session) 🎉");
      }
      setAuthEmail('');
      setAuthPassword('');
      setAuthDisplayName('');
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || "Failed to register!");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignInTrigger = async () => {
    setAuthLoading(true);
    try {
      const profile = await signInWithGoogle();
      setCurrentUser(profile);
      setCustomerName(profile.displayName);
      triggerToast(`Successfully authenticated as ${profile.displayName}! 🌟`);
      loadUserOrders(profile.uid);
    } catch (err) {
      console.error(err);
      triggerToast("Google Sign-In Cancelled or Unresolved.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOutTrigger = async () => {
    try {
      if (isFirebaseMode && auth) {
        await signOut(auth);
      }
      setCurrentUser(null);
      localStorage.removeItem('dacrib_logged_in_user');
      triggerToast("Signed out. Operating in Guest Mode.");
      
      const guestId = getPersistentGuestId();
      loadUserOrders(guestId);
    } catch (err) {
      console.error(err);
      triggerToast("Error signing out!");
    }
  };

  // --- PAST ORDER PDF INVOICE DOWNLOADER ---
  const handleDownloadPastOrderPdf = (order: PastOrder) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(33, 33, 33);
      doc.text("DACRIB KITCHEN", 105, 20, { align: "center" });
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("Philadelphia's Premier Soul Food & Platter Spot", 105, 25, { align: "center" });
      doc.text("Direct Line / Crib dispatcher: 445-326-2790", 105, 30, { align: "center" });
      
      doc.setLineWidth(0.5);
      doc.setDrawColor(210, 210, 210);
      doc.line(15, 35, 195, 35);
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      doc.text(`TICKET REF: ${order.orderId}`, 15, 45);
      doc.text(`DATE: ${new Date(order.createdAt).toLocaleString()}`, 15, 51);
      doc.text(`ORDER TYPE: ${order.orderType.toUpperCase()}`, 15, 57);
      doc.text(`PAYMENT PREFERENCE: ${order.preferredPayment.toUpperCase()}`, 15, 63);
      doc.text(`CUSTOMER: ${order.customerName.toUpperCase()}`, 15, 69);
      
      // Table Header row
      doc.setFillColor(33, 33, 33);
      doc.rect(15, 76, 180, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.text("ITEM DETAILS & PLATTER CUSTOMIZATIONS", 18, 81);
      doc.text("QTY", 150, 81);
      doc.text("PRICE", 190, 81, { align: "right" });
      
      let currentY = 92;
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(60, 60, 60);

      order.items.forEach((item) => {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(33, 33, 33);
        doc.text(`${item.name}`, 18, currentY);
        
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(10);
        doc.text("1", 151, currentY);
        doc.text(`$${item.computedPrice}.00`, 190, currentY, { align: "right" });
        
        let details: string[] = [];
        if (item.selectedSides && item.selectedSides.length > 0) {
          details.push(`Sides choice: ${item.selectedSides.join(', ')}`);
        }
        if (item.pastaBase) {
          details.push(`Pasta choice: ${item.pastaBase}`);
        }
        if (item.wingFlavors && item.wingFlavors.length > 0) {
          details.push(`Flavors: ${item.wingFlavors.join(', ')}`);
        }
        
        if (details.length > 0) {
          currentY += 5;
          doc.setFont("Helvetica", "oblique");
          doc.setFontSize(8.5);
          doc.setTextColor(110, 110, 110);
          doc.text(details.join(" | "), 22, currentY);
        }
        
        currentY += 9;
      });

      doc.setLineWidth(0.3);
      doc.setDrawColor(220, 220, 220);
      doc.line(15, currentY, 195, currentY);
      currentY += 8;

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text("Platters Subtotal:", 115, currentY);
      doc.text(`$${order.subtotal}.00`, 190, currentY, { align: "right" });
      
      currentY += 6;
      doc.text("West Philly Delivery Fee:", 115, currentY);
      doc.text(`$${order.deliveryFee}.00`, 190, currentY, { align: "right" });
      
      currentY += 7;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(190, 30, 30);
      doc.text("GRAND BILL TOTAL:", 115, currentY);
      doc.text(`$${order.grandTotal}.00`, 190, currentY, { align: "right" });

      currentY += 15;
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(130, 130, 130);
      doc.text("Secure order code matching dispatcher logs and records status: " + order.status.toUpperCase(), 105, currentY, { align: "center" });

      doc.setFont("Helvetica", "bold");
      doc.setTextColor(190, 30, 30);
      doc.text("THANK YOU FOR YOUR PATRONAGE! CRIB KITCHEN CO.", 105, currentY + 6, { align: "center" });

      doc.save(`Da_Crib_Receipt_${order.orderId}.pdf`);
      triggerToast("Past ticket PDF downloaded! 🧾");
    } catch (pdfErr) {
      console.error(pdfErr);
      triggerToast("Error printing past receipt PDF.");
    }
  };

  // --- REVIEW FEEDBACK SUBMIT HANDLER ---
  const handleFeedbackSubmit = async (orderId: string) => {
    const rStar = feedbackRatingMap[orderId] || 5;
    const rTxt = feedbackTextMap[orderId] || '';
    if (!rTxt.trim()) {
      triggerToast("Please type a quick comment before submitting review!");
      return;
    }

    setSubmittingFeedbackMap(prev => ({ ...prev, [orderId]: true }));
    try {
      await submitOrderFeedback(orderId, rStar, rTxt);
      triggerToast("Review posted successfully! Thank you! 🌟");
      
      // Reload order list which updates state
      loadUserOrders(currentUser?.uid || getPersistentGuestId());
    } catch (e) {
      console.error(e);
      triggerToast("Error updating feedback.");
    } finally {
      setSubmittingFeedbackMap(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // --- PUBLIC REVIEWS LOAD FROM FIRESTORE ---
  const loadReviewsFromFirestore = async () => {
    setReviewsLoading(true);
    try {
      const orders = await fetchAllOrders();
      // Filter out orders that contain reviews
      const dbReviews = orders
        .filter(o => o && o.review && o.review.trim() !== '')
        .map(o => ({
          reviewId: o.orderId,
          customerName: o.customerName || 'Anonymous Diner',
          rating: o.rating || 5,
          reviewText: o.review,
          platterTried: o.items && o.items.length > 0 ? o.items[0].name : undefined,
          createdAt: o.createdAt || new Date().toISOString()
        }));

      const sortedReviews = dbReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPublicReviews(sortedReviews);
    } catch (e) {
      console.error("Failed to load public reviews:", e);
    } finally {
      setReviewsLoading(false);
    }
  };

  // --- GUEST REVIEWS SUBMIT ACTION ---
  const handleGuestReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewName.trim()) {
      triggerToast("Please provide your name for the review card!");
      return;
    }
    if (!newReviewComment.trim()) {
      triggerToast("Please write a quick comment first!");
      return;
    }
    
    setSubmittingReview(true);
    try {
      // Save reviews as complete elements in DB orders collection so it works automatically with current Firestore DB
      const orderPayload: Omit<PastOrder, 'orderId'> = {
        userId: getPersistentGuestId(),
        customerName: newReviewName,
        items: [{
          name: newReviewPlatter,
          computedPrice: 0,
          category: 'review-tag'
        }],
        subtotal: 0,
        deliveryFee: 0,
        grandTotal: 0,
        orderType: 'pickup',
        scheduledTime: 'asap',
        preferredPayment: 'N/A',
        status: 'completed',
        createdAt: new Date().toISOString(),
        rating: newReviewRating,
        review: newReviewComment
      };

      await placeUserOrder(orderPayload);
      triggerToast("Your review is published! Thank you! 🌟");
      
      // Reset input fields
      setNewReviewComment('');
      setNewReviewRating(5);
      
      // Reload combined listings
      loadReviewsFromFirestore();
    } catch (err) {
      console.error(err);
      triggerToast("Failed to post review. Please try again.");
    } finally {
      setSubmittingReview(false);
    }
  };

  // Trigger loading of public reviews on mount
  useEffect(() => {
    loadReviewsFromFirestore();
  }, []);

  // Helper smooth scroll
  const scrollTo = (elementId: string) => {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Safe subset filtering for search
  const filteredEntrees = entrees.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSalads = salads.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="main-frame-root" className="min-h-screen bg-[#06100B] text-[#E8ECE9] font-sans antialiased relative">
      
      {/* Toast Alert Notification Layer */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#092215]/95 text-white border border-[#143323] rounded-2xl px-6 py-3.5 shadow-xl flex items-center space-x-3 text-xs uppercase font-mono font-black"
          >
            <span className="w-2 h-2 rounded-full bg-[#D32F2F] animate-pulse" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP ANNOUNCEMENT BAR */}
      <div className="w-full bg-[#050D09] text-[#A2BAAD] py-2.5 px-6 text-center text-[10px] uppercase font-mono tracking-widest font-black flex items-center justify-center space-x-2 border-b border-[#11291b]">
        <Sparkle className="w-3.5 h-3.5 text-[#E5A93C] animate-spin" />
        <span>SOUL FOOD SATURDAYS OPEN FOR BUSINESS — WEST PHILLY SECURE DELIVERY RANGE</span>
        <Sparkle className="w-3.5 h-3.5 text-[#E5A93C] animate-spin" />
      </div>

      {/* FIXED BOUTIQUE NAV HEADER */}
      <header className="px-6 md:px-12 py-5.5 flex items-center justify-between border-b border-[#143323] bg-[#092215]/95 backdrop-blur-md sticky top-0 z-30 shadow-md">
        
        {/* Brand logo */}
        <div onClick={() => scrollTo('main-frame-root')} className="flex items-center space-x-3 cursor-pointer select-none">
          <img
            src={logoImg}
            alt="DaCrib Kitchen logo"
            className="w-16 h-16 md:w-20 md:h-20 object-contain shrink-0"
          />
          <div>
            <span className="font-serif font-black text-2xl tracking-tighter text-[#E8ECE9] uppercase block leading-none">
              DACRIB <span className="text-[#D32F2F]">KITCHEN</span>
            </span>
            <span className="text-[10px] font-mono font-black uppercase tracking-widest text-[#E5A93C] mt-0.5 block leading-none">
              Est. 2018 | West Philly Soul
            </span>
          </div>
        </div>

        {/* Navigation links styled like a classic Italian pizzeria */}
        <nav className="hidden lg:flex items-center space-x-7 font-mono text-xs uppercase tracking-wider font-extrabold text-[#A2BAAD]">
          <button 
            onClick={() => { setActiveView('home'); }} 
            className={`relative py-1.5 transition duration-200 cursor-pointer uppercase ${activeView === 'home' ? 'text-[#E5A93C]' : 'hover:text-[#E8ECE9]'}`}
          >
            <span>The Soul Menu</span>
            {activeView === 'home' && (
              <span className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#E5A93C]" />
            )}
          </button>

          <button 
            onClick={() => { setActiveView('history'); }} 
            className={`relative py-1.5 transition duration-200 cursor-pointer uppercase flex items-center space-x-1 ${activeView === 'history' ? 'text-[#E5A93C]' : 'hover:text-[#E8ECE9]'}`}
          >
            <Star className="w-3.5 h-3.5 text-[#E5A93C] fill-current animate-pulse" />
            <span>Diner Reviews & receipts</span>
            {activeView === 'history' && (
              <span className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#E5A93C]" />
            )}
          </button>
        </nav>

        {/* Actions panel */}
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => scrollTo('menu-grid-section')}
            className="p-2 rounded-full hover:bg-[#0d331f] text-[#E5A93C] transition relative"
            title="Search the menu"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Quick PDF Receipt Trigger */}
          <button
            onClick={downloadPdfReceipt}
            className="px-4 py-2 bg-[#0d2a1b] text-[#E8ECE9] hover:bg-[#113a25] text-[10.5px] uppercase font-mono font-black rounded-lg transition hidden md:flex items-center space-x-2 border border-[#1a4a31]"
            title="Download invoice receipt"
          >
            <FileText className="w-3.5 h-3.5 text-[#D32F2F]" />
            <span>Generate PDF</span>
          </button>

          {/* Tray Badge button */}
          <button
            onClick={() => scrollTo('order-form-ticket')}
            className="px-5 py-2.5 bg-[#D32F2F] text-white flex items-center space-x-2 rounded-full transition hover:bg-[#B71C1C] cursor-pointer shadow-md shadow-[#D32F2F]/10"
          >
            <ShoppingBag className="w-4 h-4 text-white" />
            <span className="font-mono text-xs font-black">{cart.length}</span>
          </button>

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-stone-300 bg-[#0d2a1b] rounded-full hover:bg-[#113a25]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* MOBILE NAV OVERLAY */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-[#092215] border-b border-[#143323] overflow-hidden shadow-lg z-20 sticky top-[73px]"
          >
            <div className="px-6 py-5 flex flex-col space-y-4 font-mono text-xs uppercase tracking-wider font-extrabold text-[#A2BAAD]">
              <div 
                onClick={() => { setActiveView('home'); scrollTo('main-frame-root'); setMobileMenuOpen(false); }} 
                className={`py-2 cursor-pointer flex items-center justify-between border-b border-[#05110a] ${activeView === 'home' ? 'text-[#E5A93C]' : 'text-stone-300'}`}
              >
                <span>The Soul Menu</span>
                <span className={`w-1.5 h-1.5 rounded-full ${activeView === 'home' ? 'bg-[#E5A93C]' : 'bg-transparent'}`} />
              </div>
              <div 
                onClick={() => { setActiveView('history'); setMobileMenuOpen(false); }} 
                className={`py-2 cursor-pointer flex items-center justify-between border-b border-[#05110a] ${activeView === 'history' ? 'text-[#E5A93C]' : 'text-stone-300'}`}
              >
                <span>Diner Reviews & receipts</span>
                <span className={`w-1.5 h-1.5 rounded-full ${activeView === 'history' ? 'bg-[#E5A93C]' : 'bg-transparent'}`} />
              </div>
              <div 
                onClick={() => { downloadPdfReceipt(); setMobileMenuOpen(false); }} 
                className="py-2.5 text-[#E5A93C] flex items-center space-x-2 font-black"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF Receipt</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOUTIQUE FOOD HERO SHOWCASE */}
      {activeView === 'home' && (
      <section className="relative overflow-hidden min-h-[500px] lg:min-h-[560px] grid grid-cols-1 lg:grid-cols-12 items-center bg-gradient-to-tr from-[#020503] via-[#06100B] to-[#041a0f] border-b border-[#143323]">
        
        {/* Subtle decorative background grids */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#E5A93C_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* HERO LEFT COLUMN: Editorial Copy, Star Badge, Action CTAs */}
        <div className="lg:col-span-7 px-6 md:px-16 lg:py-16 py-12 space-y-6 text-left relative z-10">
          
          <div className="inline-flex items-center space-x-2.5 bg-[#D32F2F]/10 border border-[#D32F2F]/20 px-3 py-1 rounded-md text-[10px] text-white font-mono tracking-widest font-black uppercase">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D32F2F] opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#D32F2F]" />
            </span>
            <span>Premium Philadelphia Soul Food</span>
          </div>

          <h1 className="font-serif font-black text-4xl sm:text-5xl md:text-6.5xl tracking-tight text-white leading-[0.95] uppercase">
            The Crib Platter <span className="text-[#E5A93C] block">Experience.</span>
          </h1>

          <div className="flex items-center space-x-3.5 text-xs text-[#A2BAAD] font-mono">
            <div className="flex items-center text-[#E5A93C] gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-4 h-4 fill-current" />
              ))}
            </div>
            <span>•</span>
            <span className="text-stone-200 font-bold">4.9/5 Chef Platters Rating</span>
            <span>•</span>
            <span className="text-[#D32F2F] font-black animate-pulse">Open Saturday</span>
          </div>

          <p className="text-[#A2BAAD] text-sm md:text-base leading-relaxed max-w-xl font-sans">
            Fresh, slow-cooked honey garlic Lamb Chops, giant seasoned Turkey Wings falling off the bone, and Blackened Atlantic Salmon seared perfectly on blazing cast-iron skillets. Fully customizable with our signature Yellow Rice, triple-baked Mac & Cheese, or sweetened Candy Yams.
          </p>

          <div className="pt-3 flex flex-wrap items-center gap-4">
            <button
              onClick={() => scrollTo('menu-grid-section')}
              className="px-8 py-3.5 bg-[#D32F2F] hover:bg-[#B71C1C] text-stone-100 font-serif font-bold uppercase text-xs tracking-widest rounded-full transition shadow-lg shadow-[#D32F2F]/25 flex items-center space-x-2.5 cursor-pointer"
            >
              <span>Build Your Platter</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => scrollTo('faq-decorations')}
              className="px-6 py-3.5 border border-[#143323] hover:border-[#E5A93C] text-stone-300 hover:text-white bg-[#0a2014]/40 font-mono uppercase text-[10.5px] font-black rounded-full transition cursor-pointer"
            >
              <span>How we package / ETAs</span>
            </button>
          </div>
        </div>

        {/* HERO RIGHT COLUMN: Takeout Container Food Presentation Graphic */}
        <div className="lg:col-span-5 h-full relative flex items-center justify-center p-6 lg:p-12 bg-[#050D09]/50 border-t lg:border-t-0 lg:border-l border-[#143323]">
          
          {/* Robust takeout box styled container rim */}
          <div className="relative w-full max-w-[360px] aspect-square rounded-[2.5rem] bg-[#040C08] border-[10px] border-[#133020] p-4.5 shadow-2xl flex items-center justify-center overflow-hidden">
            
            {/* Checkered liner paper background peek */}
            <div 
              className="absolute inset-1 rounded-[1.85rem] pointer-events-none opacity-20"
              style={{
                backgroundImage: 'repeating-conic-gradient(#FAF8F5 0% 25%, #050D09 0% 50%)',
                backgroundSize: '24px 24px',
              }}
            />
            
            {/* Inner compartment border */}
            <div className="absolute inset-3.5 rounded-[1.6rem] border border-dashed border-[#143323] pointer-events-none z-0" />
            
            {/* Real local image dynamically styled inside our signature platter box */}
            <motion.div 
              initial={{ rotate: -2, scale: 0.95 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ duration: 1.2 }}
              className="w-full h-full rounded-[1.4rem] border-2 border-[#1c4730]/60 shadow-xl relative overflow-hidden bg-[#050D09] z-10"
            >
              <img 
                src={imageMap.salmon} 
                alt="DaCrib Specialty Blackened Salmon Platter" 
                className="w-full h-full object-cover object-[center_68%] scale-[1.12]"
                referrerPolicy="no-referrer"
              />
              {/* Overlaid Banner Badge with no clipping bounds */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent p-5 text-left">
                <div className="flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E5A93C] animate-pulse" />
                  <span className="text-[10px] font-mono font-black uppercase text-[#E5A93C] tracking-widest">SIGNATURE CRIB PLATTER</span>
                </div>
                <h4 className="font-serif font-black text-white text-base leading-tight uppercase mt-1 tracking-tight">BLACKENED SALMON</h4>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      )}
            {/* MAIN TWO-COLUMN CONTAINER: MENU vs BILLING INVOICE */}
      {activeView === 'home' && (
      <main className="max-w-7xl mx-auto px-4 md:px-10 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: ACTIVE MENU PLATTERS (7 Cols) */}
        <div id="menu-grid-section" className="lg:col-span-7 space-y-8">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#143323]">
            <div>
              <h2 className="font-serif font-black text-3xl text-white uppercase tracking-tight">The Southern Cuisine Menu</h2>
              <p className="text-xs text-[#829e90] font-mono mt-1">Sautéed proteins cooked with deep Philly flavor & soul seasonings.</p>
            </div>

            {/* In-Menu Search Helper */}
            <div className="relative max-w-[220px]">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search skillet meals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#0a2014] border border-[#143323] rounded-md focus:outline-none focus:border-[#E5A93C] font-mono text-[#E8ECE9] placeholder-stone-500 transition"
              />
            </div>
          </div>

          {/* Boutique Horizontal Tab Navigation */}
          <div className="flex space-x-1.5 p-1 bg-[#0a2014] rounded-xl max-w-[340px]">
            {(['entrees', 'salads', 'sides'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-center text-[10.5px] uppercase font-mono font-black rounded-lg transition-all duration-150 cursor-pointer ${
                  activeTab === tab 
                  ? 'bg-[#0d2e1c] text-[#E5A93C] shadow-sm font-extrabold border border-[#1d5738]' 
                  : 'text-[#829e90] hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Active Tab Grid Displays */}
          {activeTab === 'entrees' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {filteredEntrees.length > 0 ? (
                filteredEntrees.map((item) => (
                  <div key={item.id} className="bg-[#091b11] border border-[#143323] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col h-full">
                    
                    {/* Visual Card Top Block with real local asset rendering */}
                    <div className="h-44 relative bg-[#050D09] overflow-hidden">
                      <img 
                        src={imageMap[item.id] || imageMap.salmon} 
                        alt={item.name} 
                        className="w-full h-full object-cover select-none transition duration-530 hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      {item.popular && (
                        <span className="absolute top-3 left-3 px-2 py-0.5 bg-[#E5A93C] text-stone-900 font-mono text-[8px] uppercase font-black rounded-md tracking-wider shadow-sm">
                          POPULAR Choice ⭐
                        </span>
                      )}
                      
                      {/* Price circle overlay */}
                      <span className="absolute bottom-3 right-3 px-3 py-1.5 bg-[#0d2a1b] text-[#E5A93C] font-mono text-xs font-black rounded-lg tracking-wider border border-[#1a4a31]">
                        ${item.price}.00
                      </span>
                    </div>

                    {/* Platter Card Details */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-3.5">
                      <div className="space-y-1.5">
                        <h4 className="font-serif font-black text-base text-white uppercase tracking-tight leading-tight">
                          {item.name}
                        </h4>
                        <p className="text-xs text-[#A2BAAD] leading-relaxed">
                          {item.desc}
                        </p>
                      </div>

                      {/* Add Button & Calories Indicator */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-[#143323]">
                        <span className="text-[9.5px] font-mono text-[#829e90] font-extrabold uppercase">
                          {item.calories}
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => handleItemAction(item, false)}
                          className="px-4 py-2 bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-mono text-[10px] uppercase font-black rounded-lg transition-all shadow-sm shadow-[#D32F2F]/10 flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Select Sides</span>
                        </button>
                      </div>
                    </div>

                  </div>
                ))
              ) : (
                <div className="col-span-full py-12 text-center text-stone-400 font-mono text-xs uppercase">
                  No platters matched your active searches.
                </div>
              )}
            </div>
          )}

          {activeTab === 'salads' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {filteredSalads.length > 0 ? (
                filteredSalads.map((item) => (
                  <div key={item.id} className="bg-[#091b11] border border-[#143323] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col h-full">
                    
                    {/* Visual Card Top Block */}
                    <div className="h-44 relative bg-[#050D09] overflow-hidden">
                      <img 
                        src={imageMap[item.id] || imageMap.wings_platter} 
                        alt={item.name} 
                        className="w-full h-full object-cover select-none"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute bottom-3 right-3 px-3 py-1.5 bg-[#0d2a1b] text-[#E5A93C] font-mono text-xs font-black rounded-lg tracking-wider border border-[#1a4a31]">
                        ${item.price}.00
                      </span>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-3.5">
                      <div className="space-y-1.5">
                        <h4 className="font-serif font-black text-base text-white uppercase tracking-tight leading-tight">
                          {item.name}
                        </h4>
                        <p className="text-xs text-[#A2BAAD] leading-relaxed">
                          {item.desc}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2.5 border-t border-[#143323]">
                        <span className="text-[9.5px] font-mono text-[#829e90] font-extrabold uppercase">
                          {item.calories}
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => handleItemAction(item, true)}
                          className="px-4 py-2 bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-mono text-[10px] uppercase font-black rounded-lg transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add to Tray</span>
                        </button>
                      </div>
                    </div>

                  </div>
                ))
              ) : (
                <div className="col-span-full py-12 text-center text-stone-400 font-mono text-xs uppercase">
                  No side salads matched your search.
                </div>
              )}
            </div>
          )}

          {activeTab === 'sides' && (
            <div className="bg-[#091b11] border border-[#143323] rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#143323]">
                <span className="text-xs uppercase font-mono font-black text-[#829e90]">Available Complimentary Sides</span>
                <span className="text-[10px] text-stone-400 font-sans italic">Custom selection handled inside entree menus</span>
              </div>
              <p className="text-xs text-[#A2BAAD]">
                Our standard entree platters include your selection of **up to 2** of our signature slow-simmered sides. Sides are not sold separately so they stay hot and packed with our custom-blended kitchen seasonings.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {sides.map((sideName) => (
                  <div key={sideName} className="flex items-center space-x-2.5 bg-[#0a2014] border border-[#143323] p-3 rounded-xl select-none text-xs font-mono font-[#829e90] text-stone-200">
                    <div className="w-2 h-2 rounded-full bg-[#E5A93C]" />
                    <span>{sideName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FAQS CUSTOM BLOCK */}
          <div id="faq-decorations" className="bg-[#091b11] border border-[#143323] rounded-3xl p-6.5 text-left space-y-5 shadow-xs">
            <h3 className="font-serif font-black text-xl text-white uppercase tracking-tight">Crib Logistics & FAQs</h3>
            
            <div className="space-y-4.5 divide-y divide-[#143323]">
              {faqs.map((f, idx) => (
                <div key={idx} className={`${idx > 0 ? 'pt-4.5' : ''} space-y-1.5`}>
                  <p className="text-xs font-mono font-black uppercase text-[#D32F2F] flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4" />
                    <span>{f.q}</span>
                  </p>
                  <p className="text-xs text-[#A2BAAD] leading-relaxed pl-5.5 font-sans">
                    {f.a}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: REVENUE CHECKOUT STUB RECEIPT & ORDER ACTIONS (5 Cols) */}
        <div id="order-form-ticket" className="lg:col-span-12 xl:col-span-5 lg:order-last space-y-6">
          
          <div className="bg-[#091b11] border-2 border-[#143323] rounded-3xl p-6 space-y-5 shadow-lg relative overflow-hidden">
            
            {/* Traditional invoice layout elements */}
            <div className="absolute top-0 left-0 w-full h-[5px] bg-gradient-to-r from-[#D32F2F] via-[#E5A93C] to-[#091b11] opacity-90" />
            
            <div className="flex items-center justify-between pb-3 border-b border-[#143323] pt-2">
              <div className="flex items-center space-x-2 text-white">
                <FileText className="w-5 h-5 text-[#D32F2F]" />
                <h3 className="font-serif font-black text-sm uppercase tracking-tight">Active Dinner Plate Ticket</h3>
              </div>
              <span className="font-mono text-[9px] uppercase font-black tracking-widest text-[#D32F2F]">PAYMENT SECURE</span>
            </div>

            {/* Placed Order Confirmation Success Display */}
            {placedOrderId ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#0a2014] border border-[#143323] rounded-2xl p-5 text-center space-y-3.5"
              >
                <div className="w-12 h-12 bg-emerald-950/20 rounded-full flex items-center justify-center text-emerald-400 mx-auto border border-emerald-900/30 shadow-xs">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-black uppercase tracking-widest text-[#D32F2F] block">ORDER TRANSMITTED</span>
                  <h4 className="font-serif font-black text-xl uppercase mt-1 leading-none text-white">{placedOrderId}</h4>
                  <p className="text-xs text-[#A2BAAD] mt-2 font-sans">
                    We updated our kitchen dispatcher logs! Tap the button below to secure your PDF print billing receipt:
                  </p>
                </div>

                <div className="pt-2.5 flex flex-col gap-2">
                  <button
                    onClick={downloadPdfReceipt}
                    className="w-full py-2.5 bg-[#D32F2F] text-white hover:bg-[#B71C1C] font-mono text-[10px] uppercase font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Download className="w-4 h-4 text-[#E5A93C]" />
                    <span>Download Invoice Receipt</span>
                  </button>

                  <button
                    onClick={() => setPlacedOrderId(null)}
                    className="w-full py-2 text-[#A2BAAD] hover:text-white border border-[#143323] text-[9px] uppercase font-mono font-black rounded-lg transition cursor-pointer"
                  >
                    Place Another Order
                  </button>
                </div>
              </motion.div>
            ) : (
              <>
                {/* Active Cart Item Listing */}
                {cart.length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {calculatedItems.map((it) => (
                      <div key={it.cartId} className="bg-[#0a2014] border border-[#1a4a31]/60 rounded-xl p-3.5 space-y-2 relative shadow-xs">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h5 className="font-serif font-black text-sm text-white uppercase tracking-tight">
                              {it.name}
                            </h5>
                            
                            {/* Extra portion toggle description if checked */}
                            {it.category === 'entree' && it.selectedSides && (
                              <p className="text-[10.5px] text-[#A2BAAD] font-mono mt-0.5 font-bold">
                                Sides: {it.selectedSides.join(', ')}
                              </p>
                            )}

                            {it.extraOptionChecked && (
                              <span className="inline-block mt-1 text-[8.5px] uppercase font-mono text-[#D32F2F] font-extrabold bg-[#D32F2F]/10 px-1.5 py-0.5 rounded">
                                Double portion (+$5)
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-3 flex-shrink-0">
                            <span className="font-mono text-sm font-black text-[#E5A93C]">
                              ${it.computedPrice}.00
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(it.cartId)}
                              className="text-stone-400 hover:text-[#D32F2F] transition duration-150 p-1 rounded-md hover:bg-[#113a25]"
                              title="Delete platter from tray"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-stone-400 border border-dashed border-[#143323] bg-[#050D09]/50 rounded-2xl min-h-[140px] flex flex-col items-center justify-center space-y-2">
                    <ShoppingBag className="w-7 h-7 text-stone-300" />
                    <div>
                      <p className="font-serif font-black text-[#829e90] uppercase tracking-tight text-xs">Your Food Tray is Empty</p>
                      <p className="text-[10px] text-stone-400 font-mono mt-1">Add Southern platters or side salads to continue.</p>
                    </div>
                  </div>
                )}

                {/* Billing Summary lines */}
                {cart.length > 0 && (
                  <div className="pt-3 border-t border-[#143323] space-y-2 font-mono text-xs">
                    <div className="flex justify-between text-[#A2BAAD]">
                      <span>Platters Subtotal</span>
                      <span>${subtotal}.00</span>
                    </div>
                    <div className="flex justify-between text-[#A2BAAD]">
                      <span>West Philly Delivery Fee ({orderType})</span>
                      <span>${deliveryFee}.00</span>
                    </div>
                    <div className="flex justify-between text-stone-200 font-black text-sm pt-2.5 border-t border-[#143323]">
                      <span className="uppercase">Grand Total Bill</span>
                      <span className="text-[#E5A93C]">${grandTotal}.00</span>
                    </div>
                  </div>
                )}

                {/* THE SECURE INFORMATION FORM MATCHING USER INPUT SPECIFICATIONS */}
                <div className="space-y-4 pt-1.5 border-t border-[#143323]">
                  
                  {/* Dining Passenger Name */}
                  <div>
                    <label className="text-[10px] uppercase font-mono text-[#829e90] tracking-wider font-extrabold block mb-1">
                      Your Name <span className="text-[#D32F2F]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Marcus Garvey"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-[#0a2014] border border-[#143323] rounded-xl px-3 py-2.5 text-xs text-[#E8ECE9] focus:outline-none focus:border-[#E5A93C] font-mono transition placeholder-stone-500"
                    />
                  </div>

                  {/* Delivery Route switch tabs */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-[10px] uppercase font-mono text-[#829e90] tracking-wider font-extrabold block mb-1.5">Dispatch Method</span>
                      <div className="flex rounded-xl bg-[#050D09] p-1 gap-1 border border-[#143323]">
                        <button
                          type="button"
                          onClick={() => setOrderType('pickup')}
                          className={`flex-1 py-1.5 text-center text-[10px] font-black rounded-lg transition uppercase flex items-center justify-center space-x-1 cursor-pointer ${
                            orderType === 'pickup' ? 'bg-[#0d2a1b] border border-[#1d5738] text-[#E5A93C]' : 'text-[#829e90] hover:text-white'
                          }`}
                        >
                          <Store className="w-3.5 h-3.5" />
                          <span>Pickup</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrderType('delivery')}
                          className={`flex-1 py-1.5 text-center text-[10px] font-black rounded-lg transition uppercase flex items-center justify-center space-x-1 cursor-pointer ${
                            orderType === 'delivery' ? 'bg-[#0d2a1b] border border-[#1d5738] text-[#E5A93C]' : 'text-[#829e90] hover:text-white'
                          }`}
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Delivery</span>
                        </button>
                      </div>
                    </div>

                    {/* Timing Switch */}
                    <div>
                      <span className="text-[10px] uppercase font-mono text-[#829e90] tracking-wider font-extrabold block mb-1.5">Schedule Platter</span>
                      <div className="flex rounded-xl bg-[#050D09] p-1 gap-1 border border-[#143323]">
                        <button
                          type="button"
                          onClick={() => setOrderTimeType('asap')}
                          className={`flex-1 py-1.5 text-center text-[10px] font-black rounded-lg transition uppercase flex items-center justify-center space-x-1 cursor-pointer ${
                            orderTimeType === 'asap' ? 'bg-[#0d2a1b] border border-[#1d5738] text-[#E5A93C]' : 'text-[#829e90]'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>ASAP</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrderTimeType('scheduled')}
                          className={`flex-1 py-1.5 text-center text-[10px] font-black rounded-lg transition uppercase flex items-center justify-center space-x-1 cursor-pointer ${
                            orderTimeType === 'scheduled' ? 'bg-[#0d2a1b] border border-[#1d5738] text-[#E5A93C]' : 'text-[#829e90]'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>Later</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Address if active */}
                  {orderType === 'delivery' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-1"
                    >
                      <label className="text-[10px] uppercase font-mono text-[#829e90] tracking-wider font-extrabold block mb-1">
                        West Philly Delivery Address <span className="text-[#D32F2F]">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 4800 Market St, Philadelphia"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full bg-[#0a2014] border border-[#143323] rounded-xl px-3 py-2.5 text-xs text-[#E8ECE9] focus:outline-none focus:border-[#E5A93C] font-mono transition placeholder-stone-500"
                      />
                      <p className="text-[8.5px] text-[#829e90] font-mono italic">West Philly courier dispatched for an additional $5 flat rate.</p>
                    </motion.div>
                  )}

                  {/* Scheduled Selection Hour list if active */}
                  {orderTimeType === 'scheduled' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-1"
                    >
                      <label className="text-[10px] uppercase font-mono text-[#829e90] tracking-wider font-extrabold block mb-1">
                        Target Delivery / Pickup Hour <span className="text-[#D32F2F]">*</span>
                      </label>
                      <select
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full bg-[#0a2014] border border-[#143323] rounded-xl px-3 py-2.5 text-xs text-[#E8ECE9] focus:outline-none focus:border-[#E5A93C] font-mono transition"
                      >
                        <option value="12:00 PM" className="bg-[#091b11] text-white">12:00 PM (Noon)</option>
                        <option value="1:00 PM" className="bg-[#091b11] text-white">1:00 PM</option>
                        <option value="2:00 PM" className="bg-[#091b11] text-white">2:00 PM</option>
                        <option value="3:00 PM" className="bg-[#091b11] text-white">3:00 PM</option>
                        <option value="4:00 PM" className="bg-[#091b11] text-white">4:00 PM</option>
                        <option value="5:00 PM" className="bg-[#091b11] text-white">5:00 PM</option>
                        <option value="6:00 PM" className="bg-[#091b11] text-white">6:00 PM</option>
                        <option value="7:00 PM" className="bg-[#091b11] text-white">7:00 PM</option>
                        <option value="8:00 PM" className="bg-[#091b11] text-white">8:00 PM</option>
                      </select>
                    </motion.div>
                  )}

                  {/* Payment Routing Method options */}
                  <div>
                    <span className="text-[10px] uppercase font-mono text-[#829e90] tracking-wider font-extrabold block mb-2">Preferred CRIB Payment Route</span>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      {[
                        { name: 'Apple Pay' as const, label: 'Apple Pay' },
                        { name: 'CashApp' as const, label: '$ CashApp' },
                        { name: 'Zelle' as const, label: 'Zelle Pay' },
                        { name: 'Cash' as const, label: 'Cash On Deliver' }
                      ].map((item) => {
                        const active = preferredPayment === item.name;
                        return (
                          <button
                            key={item.name}
                            type="button"
                            onClick={() => setPreferredPayment(item.name)}
                            className={`py-2 px-3 text-center text-[10px] font-black rounded-lg transition uppercase border cursor-pointer ${
                              active 
                              ? 'bg-[#0d2e1c] border-[#E5A93C] text-[#E5A93C] shadow-sm' 
                              : 'bg-[#050D09] border-[#143323] text-[#829e90] hover:text-white hover:bg-[#0a2014]'
                            }`}
                          >
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Cooking instructions */}
                  <div>
                    <label className="text-[10px] uppercase font-mono text-[#829e90] tracking-wider font-extrabold block mb-1">
                      Chef Cooking Instructions (Optional)
                    </label>
                    <textarea
                      placeholder="e.g. Double gravy, well done lamb chops, yams well sweetened..."
                      value={specialNotes}
                      onChange={(e) => setSpecialNotes(e.target.value)}
                      className="w-full bg-[#0a2014] border border-[#143323] rounded-xl px-3 py-2.5 text-xs text-[#E8ECE9] focus:outline-none focus:border-[#E5A93C] font-mono transition h-14 resize-none placeholder-stone-500"
                    />
                  </div>

                  <div className="space-y-3 pt-4 border-t border-[#143323]">
                    <div className="bg-[#08170E] border border-[#143323] rounded-2xl p-4 text-sm text-[#A2BAAD] font-mono leading-relaxed">
                      <p className="font-black uppercase text-[9px] tracking-widest text-[#E5A93C]">Receipt tip</p>
                      <p className="mt-2">Download the PDF receipt before sending the SMS order so you can show the exact order details.</p>
                    </div>

                    <button
                      type="button"
                      onClick={downloadPdfReceipt}
                      className="w-full py-3 bg-[#1E5F33] hover:bg-[#1A5530] text-[#E5A93C] font-mono text-[10px] uppercase font-black rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download PDF Receipt</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTriggerSmsOrder}
                      disabled={cart.length === 0 || orderPlacing}
                      className="w-full h-12 bg-[#D32F2F] hover:bg-[#B71C1C] text-white disabled:bg-stone-800 disabled:text-stone-600 disabled:cursor-not-allowed font-serif font-[#FAF8F5] uppercase tracking-widest text-xs rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer shadow-md shadow-[#D32F2F]/10 font-black"
                    >
                      {orderPlacing ? (
                        <>
                          <RotateCcw className="w-4 h-4 animate-spin text-[#E5A93C]" />
                          <span>Dispatching Order Ticket...</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-4 h-4 text-[#E5A93C]" />
                          <span>SECURE CRIB ORDER DISPATCH</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>
              </>
            )}

          </div>

        </div>

      </main>
      )}

      {/* CUSTOMER REVIEWS & RECEIPTS HUB */}
      {activeView === 'history' && (
        <div className="max-w-7xl mx-auto px-4 md:px-10 py-12 space-y-12 animate-fade-in">
          
          {/* Billboard Header with West Philly Vibes */}
          <div className="bg-[#2C2925] border-2 border-stone-900 rounded-3xl p-8 md:p-10 text-center text-white relative overflow-hidden shadow-xl">
            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#C82333_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="relative z-10 space-y-4 max-w-3xl mx-auto">
              <span className="inline-flex items-center space-x-2 bg-[#E5A93C]/20 border border-[#E5A93C]/30 px-3 py-1 rounded-md text-[10px] font-mono tracking-widest text-[#E5A93C] uppercase font-black">
                ★ ★ ★ ★ ★ Neighbors Certified
              </span>
              <h2 className="font-serif font-black text-3xl md:text-5xl uppercase tracking-tight leading-none">
                DACRIB KITCHEN REVIEWS WALL
              </h2>
              <p className="text-xs md:text-sm text-stone-400 font-mono leading-relaxed">
                Est. 2018 — Every recipe cooked block-by-block with skillet flame, heavy garlic butter, and absolute love. Read real neighbor experiences or file your own guest review below!
              </p>
              
              {/* Brand highlights bento panel */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-stone-800/80 text-left">
                <div className="space-y-1">
                  <p className="text-[10px] font-mono font-black uppercase text-stone-400">Total reviews</p>
                  <p className="text-xl font-serif font-black text-[#E5A93C]">500 Verified</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-mono font-black uppercase text-stone-400">Average Rating</p>
                  <div className="flex items-center space-x-1">
                    <span className="text-xl font-serif font-black text-[#E5A93C]">5.0</span>
                    <div className="flex items-center text-[#E5A93C] gap-0.5">
                      <Star className="w-3.5 h-3.5 fill-current" />
                    </div>
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-1 space-y-1">
                  <p className="text-[10px] font-mono font-black uppercase text-stone-400">Searing Method</p>
                  <p className="text-lg font-serif font-black text-emerald-400 uppercase">100% Sautéed fresh</p>
                </div>
              </div>
            </div>
          </div>

          {/* TWO COLUMN GRID: Review form and Reviews Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* COLUMN 1: Share a Review Form Card */}
            <div className="lg:col-span-4 bg-[#091b11] border-2 border-[#143323] rounded-3xl p-6 md:p-8 space-y-5 shadow-sm text-left">
              <div className="space-y-1 border-b border-[#143323] pb-4">
                <h3 className="font-serif font-black text-xl text-white uppercase tracking-tight">
                  Leave a Review
                </h3>
                <p className="text-[11px] text-[#A2BAAD] font-mono">
                  Sautéed platters got you full? Share your feedback for the kitchen cooks!
                </p>
              </div>

              <form onSubmit={handleGuestReviewSubmit} className="space-y-4">
                
                {/* Guest Name */}
                <div className="space-y-1 text-left">
                  <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-[#829e90]">Your Nickname / Name</label>
                  <input
                    required
                    type="text"
                    value={newReviewName}
                    onChange={(e) => setNewReviewName(e.target.value)}
                    placeholder="e.g. Shameka T. or West Philly Diner"
                    className="w-full h-11 border border-[#143323] rounded-xl px-4 text-xs font-mono focus:outline-none focus:border-[#E5A93C] bg-[#0a2014] text-[#E8ECE9] placeholder-stone-500"
                  />
                </div>

                {/* Platter tried */}
                <div className="space-y-1 text-left">
                  <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-[#829e90]">Platter / Meal enjoyed</label>
                  <select
                    value={newReviewPlatter}
                    onChange={(e) => setNewReviewPlatter(e.target.value)}
                    className="w-full h-11 border border-[#143323] rounded-xl px-3 text-xs font-mono focus:outline-none focus:border-[#E5A93C] bg-[#0a2014] text-[#E8ECE9]"
                  >
                    <option value="Honey garlic Lamb Chops">Honey garlic Lamb Chops Platter</option>
                    <option value="Blackened Salmon">Blackened Salmon Platter</option>
                    <option value="Turkey Wings">Turkey Wings Platter</option>
                    <option value="Sautéed Steak">Sautéed Steak Tips</option>
                    <option value="Sautéed Chops">Sautéed Lamb Chops</option>
                    <option value="Sautéed Shrimp">Sautéed Shrimp Tub</option>
                    <option value="Seafood Salad">Seafood Combo Salad</option>
                    <option value="Pasta Salad">Gourmet Pasta Salad</option>
                  </select>
                </div>

                {/* Star rating selection */}
                <div className="space-y-1.5 text-left">
                  <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-[#829e90]">Platter Rating Star Score</label>
                  <div className="flex items-center justify-between bg-[#050D09] p-3 rounded-xl border border-[#143323]">
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setNewReviewRating(st)}
                          className="p-1 hover:scale-110 transition cursor-pointer"
                        >
                          <Star className={`w-6 h-6 ${st <= newReviewRating ? 'text-[#E5A93C] fill-[#E5A93C]' : 'text-stone-700'}`} />
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] font-mono font-black uppercase text-[#E5A93C] bg-[#0d2a1b] px-2.5 py-1 rounded">
                      {newReviewRating} / 5 stars
                    </span>
                  </div>
                </div>

                {/* Comment area */}
                <div className="space-y-1 text-left">
                  <label className="block text-[10px] font-mono font-black uppercase tracking-wider text-[#829e90]">Your Taste Review comment</label>
                  <textarea
                    required
                    rows={4}
                    value={newReviewComment}
                    onChange={(e) => setNewReviewComment(e.target.value)}
                    placeholder="Tell us what you liked about the garlic butter, double sides, or seasoning..."
                    className="w-full border border-[#143323] rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-[#E5A93C] bg-[#0a2014] text-[#E8ECE9] resize-none placeholder-stone-500"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full h-11 bg-[#D32F2F] hover:bg-[#B71C1C] disabled:bg-stone-800 disabled:text-stone-600 text-white font-mono uppercase font-black text-xs tracking-wider rounded-xl transition shadow-md flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {submittingReview ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin text-white" />
                      <span>Posting review...</span>
                    </>
                  ) : (
                    <span>Publish Diner Testimonial</span>
                  )}
                </button>

              </form>
            </div>

            {/* COLUMN 2: Scrollable Customer Reviews Wall Feed */}
            <div className="lg:col-span-8 space-y-6">
              
              <div className="flex items-center justify-between pb-3 border-b border-[#143323] text-left">
                <h4 className="font-serif font-black text-2xl text-white uppercase tracking-tight">
                  Neighborhood Critiques Feed
                </h4>
                <span className="text-[10px] bg-[#0d2a1b] text-[#E5A93C] border border-[#1d5738] px-2.5 py-1 rounded font-mono font-bold">
                  {publicReviews.length} Testimonials Loaded
                </span>
              </div>

              {reviewsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((sk) => (
                    <div key={sk} className="bg-[#091b11] border border-[#143323] rounded-3xl p-6 space-y-4 animate-pulse">
                      <div className="flex items-center justify-between">
                        <div className="h-5 bg-[#143323] rounded w-1/3" />
                        <div className="h-4 bg-[#143323] rounded w-16" />
                      </div>
                      <div className="h-4 bg-[#143323] rounded w-full" />
                      <div className="h-4 bg-[#143323] rounded w-5/6" />
                    </div>
                  ))}
                </div>
              ) : publicReviews.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {publicReviews.map((rev, idx) => (
                    <motion.div
                      key={rev.reviewId || idx}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.05, 0.4) }}
                      className="bg-[#091b11] border border-[#143323] rounded-3xl p-6 text-left hover:shadow-md transition duration-200 flex flex-col justify-between space-y-4 relative overflow-hidden"
                    >
                      {/* Rating decorative sticker info */}
                      <span className="absolute top-4 right-4 text-[9px] font-mono uppercase bg-[#0d2a1b] text-[#E5A93C] border border-[#1d5738] font-black px-2 py-0.5 rounded">
                        ✓ Verified Diner
                      </span>

                      <div className="space-y-2.5 font-sans pb-3">
                        
                        {/* Rating row */}
                        <div className="flex items-center text-[#E5A93C] gap-0.5">
                          {Array.from({ length: rev.rating || 5 }).map((_, s) => (
                            <Star key={s} className="w-4 h-4 fill-current" />
                          ))}
                        </div>

                        {/* Comment text */}
                        <p className="text-xs text-stone-200 font-serif leading-relaxed italic">
                          "{rev.reviewText}"
                        </p>

                      </div>

                      {/* Author credentials */}
                      <div className="border-t border-[#143323] pt-3 flex flex-col space-y-1">
                        <span className="font-serif font-black text-sm text-white leading-none uppercase">
                          {rev.customerName}
                        </span>
                        
                        <div className="flex items-center justify-between text-[10px] font-mono text-[#829e90] leading-none mt-1">
                          {rev.platterTried ? (
                            <span className="text-[#D32F2F] font-bold">🍽️ Tried: {rev.platterTried}</span>
                          ) : (
                            <span className="italic">Guest Platter</span>
                          )}
                          <span>{new Date(rev.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="bg-[#FDFBF7] border border-dashed border-stone-300 rounded-3xl py-16 text-center text-stone-500 space-y-4">
                  <Star className="w-12 h-12 text-stone-300 mx-auto" />
                  <p className="font-serif font-black text-lg uppercase text-stone-850">Be the first to review!</p>
                  <p className="text-xs font-mono text-stone-400 max-w-xs mx-auto">No online reviews have been saved yet. Test our real-time database and write yours!</p>
                </div>
              )}

            </div>

          </div>

          {/* SECTION 4: Private Browser Receipts & Live dispatch tickets tracking */}
          <div className="border-t border-stone-200 pt-12 space-y-6 text-left">
            
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-full bg-[#D32F2F]/10 border border-[#D32F2F]/20 flex items-center justify-center text-[#D32F2F]">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-serif font-black text-xl text-[#2C2925] uppercase leading-none">
                  Your past dispatch tickets & receipts
                </h4>
                <p className="text-[11px] text-stone-500 font-mono mt-0.5 leading-none">
                  Automatically synchronized to your specific browser cookie ID — scan, keep track, or download PDF invoices
                </p>
              </div>
            </div>

            {ordersLoading ? (
              <div className="space-y-4">
                {[1, 2].map((sk) => (
                  <div key={sk} className="h-28 bg-stone-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : userOrders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {userOrders.map((order: PastOrder) => {
                  const rating = feedbackRatingMap[order.orderId] || order.rating || 5;
                  const text = feedbackTextMap[order.orderId] !== undefined ? feedbackTextMap[order.orderId] : (order.review || '');
                  const displayRating = order.rating;
                  const displayReview = order.review;

                  return (
                    <div 
                      key={order.orderId}
                      className="bg-white border-2 border-stone-900 rounded-3xl p-6 flex flex-col justify-between space-y-4 shadow-sm"
                    >
                      <div className="space-y-3">
                        
                        {/* Status bar */}
                        <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                          <div>
                            <span className="font-mono text-[9px] text-stone-400 uppercase leading-none">TICKET NO.</span>
                            <h5 className="font-serif font-black text-base uppercase text-stone-900 leading-none mt-0.5">{order.orderId}</h5>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded ${order.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                              {order.status === 'pending' ? 'COOKING/DISPATCH' : order.status.toUpperCase()}
                            </span>
                            <button
                              onClick={() => handleDownloadPastOrderPdf(order)}
                              className="p-1 px-2 border border-stone-200 hover:border-stone-400 text-stone-600 hover:text-stone-900 rounded font-mono text-[9px] uppercase tracking-wider flex items-center space-x-1 cursor-pointer bg-stone-50"
                              title="Print ticket invoice receipt"
                            >
                              <Download className="w-3 h-3 text-[#D32F2F]" />
                              <span>PDF Invoice</span>
                            </button>
                          </div>
                        </div>

                        {/* Timestamp */}
                        <div className="flex justify-between items-center text-[10px] font-mono text-stone-500">
                          <span>📅 {new Date(order.createdAt).toLocaleDateString()}</span>
                          <span className="uppercase text-stone-800 font-bold">{order.orderType}</span>
                        </div>

                        {/* Items summary */}
                        <div className="bg-[#FDFBF7] p-3 rounded-2xl border border-stone-200 space-y-1.5 text-xs text-stone-700">
                          <p className="text-[9px] font-mono font-black uppercase text-stone-400">PLATES SECURED:</p>
                          {order.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between font-medium">
                              <div>
                                <span className="text-stone-900 font-bold">• {it.name}</span>
                                {it.selectedSides && it.selectedSides.length > 0 && (
                                  <span className="text-[10px] text-stone-500 italic block pl-3">Complimentary sides: {it.selectedSides.join(', ')}</span>
                                )}
                              </div>
                              <span>${it.computedPrice}.00</span>
                            </div>
                          ))}
                        </div>

                        {/* Cost list */}
                        <div className="flex justify-between items-center pt-2 text-[11px] font-mono text-stone-500 border-t border-stone-100">
                          <span>Sub: ${order.subtotal}.00 {order.deliveryFee > 0 && `| Deliv: $${order.deliveryFee}.00`}</span>
                          <span className="text-sm font-serif font-black text-[#D32F2F]">Total: ${order.grandTotal}.00</span>
                        </div>

                      </div>

                      {/* Rate specific order module */}
                      <div className="pt-3 border-t border-stone-150 space-y-3 bg-stone-50/50 p-3 rounded-2xl">
                        <p className="text-[9.5px] font-mono font-black uppercase tracking-wider text-[#D32F2F] flex items-center space-x-1.5 leading-none">
                          <Star className="w-3.5 h-3.5 text-[#E5A93C] fill-current" />
                          <span>OFFICIAL VERIFIED PLATES FEEDBACK</span>
                        </p>

                        {displayReview ? (
                          <div className="space-y-1.5 font-sans">
                            <div className="flex items-center text-[#E5A93C] gap-0.5">
                              {Array.from({ length: displayRating || 5 }).map((_, s) => (
                                <Star key={s} className="w-3.5 h-3.5 fill-current" />
                              ))}
                            </div>
                            <p className="text-xs text-stone-700 font-serif leading-normal italic">
                              "{displayReview}"
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            <p className="text-[10px] text-stone-505 font-mono">Taste-tested this dinner ticket? Submit rating stars and review to the community wall:</p>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-1 font-sans">
                                {[1, 2, 3, 4, 5].map((st) => (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => setFeedbackRatingMap(prev => ({ ...prev, [order.orderId]: st }))}
                                    className="p-0.5 rounded cursor-pointer"
                                  >
                                    <Star className={`w-5 h-5 ${st <= rating ? 'text-[#E5A93C] fill-[#E5A93C]' : 'text-stone-300'}`} />
                                  </button>
                                ))}
                              </div>
                              <span className="text-[9px] font-mono font-black uppercase bg-stone-100 text-stone-600 px-2 py-0.5 rounded">{rating}/5 choice</span>
                            </div>

                            <textarea
                              rows={2}
                              value={text}
                              onChange={(e) => setFeedbackTextMap(prev => ({ ...prev, [order.orderId]: e.target.value }))}
                              placeholder="Type feedback comment..."
                              className="w-full text-xs font-mono p-2 border border-stone-250 rounded-lg focus:outline-none focus:border-[#D32F2F] bg-white resize-none"
                            />

                            <button
                              type="button"
                              disabled={submittingFeedbackMap[order.orderId]}
                              onClick={() => handleFeedbackSubmit(order.orderId)}
                              className="w-full h-8 bg-[#2C2925] hover:bg-[#1C1C1F] disabled:bg-stone-300 text-stone-100 font-mono text-[9px] font-black uppercase tracking-wider rounded-lg transition text-center flex items-center justify-center cursor-pointer"
                            >
                              {submittingFeedbackMap[order.orderId] ? 'Registering comment...' : 'Post Verified Plate Review'}
                            </button>
                          </div>
                        )}

                      </div>

                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-[#FDFBF7] border border-dashed border-stone-300 rounded-3xl py-12 text-center text-stone-500 space-y-4">
                <History className="w-12 h-12 text-stone-300 mx-auto" />
                <div className="space-y-1">
                  <p className="font-serif font-black text-base uppercase text-stone-800">Your Tickets Registry Is Empty</p>
                  <p className="text-xs font-mono text-stone-400 max-w-sm mx-auto">No dispatched orders yet in this specific browser. Complete checkout in 'The Soul Menu' to get real-time status and invoices.</p>
                </div>
                <button 
                  onClick={() => { setActiveView('home'); }}
                  className="px-5 py-2.5 bg-[#D32F2F] hover:bg-[#B71C1C] text-stone-100 text-xs font-serif font-black uppercase rounded-xl transition cursor-pointer"
                >
                  Browse the Soul Menu now
                </button>
              </div>
            )}

          </div>

        </div>
      )}

      {/* COMPLIMENTARY PLATTER SIDE CUSTOMIZER MODAL */}
      <AnimatePresence>
        {customizingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-2 border-stone-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]"
            >
              
              {/* Header Title Accent */}
              <div className="bg-[#D32F2F] text-white p-5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-black uppercase tracking-widest text-stone-200">Platter Side Customizer</span>
                  <h4 className="font-serif font-black text-xl uppercase mt-0.5 leading-none">{customizingItem.name}</h4>
                </div>
                <button
                  onClick={() => setCustomizingItem(null)}
                  className="p-1 rounded-full hover:bg-white/10 text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable details */}
              <div className="p-6 overflow-y-auto space-y-6 text-left">
                
                {/* Visual description */}
                <p className="text-xs text-stone-500 font-sans leading-relaxed">
                  Every soul food entree platter is fully loaded with your selection of up to **2 complimentary sides** fresh from our hot skillets.
                </p>

                {/* SIDES PREFAB FIELD */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-mono font-black border-b border-stone-200 pb-2">
                    <span className="text-stone-500 uppercase">CHOOSE COMPLIMENTARY SIDES:</span>
                    <span className="text-[#D32F2F] bg-[#D32F2F]/10 px-2 py-0.5 rounded text-[10px]">
                      {selectedSides.length}/2 SELECT
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {sides.map((sideName) => {
                      const checked = selectedSides.includes(sideName);
                      return (
                        <button
                          key={sideName}
                          type="button"
                          onClick={() => toggleSideSelection(sideName)}
                          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono font-black text-left cursor-pointer transition ${
                            checked 
                            ? 'border-[#D32F2F] bg-[#D32F2F]/10 text-[#D32F2F]' 
                            : 'border-stone-300/60 bg-stone-50 hover:bg-stone-100 text-stone-600'
                          }`}
                        >
                          <span>{sideName}</span>
                          <div className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                            checked ? 'bg-[#D32F2F] border-[#D32F2F] text-white' : 'border-stone-400 bg-white'
                          }`}>
                            {checked && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* UPSELL CHIP: Double portion option */}
                <div className="bg-stone-50 border border-stone-200 p-4 rounded-2xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-mono font-black uppercase text-stone-700">Double Platter Searing Portions</p>
                    <p className="text-[10px] text-stone-500">Upgrade to massive double-sized portion of standard protein base.</p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setExtraOptionChecked(!extraOptionChecked)}
                    className={`px-3 py-1.5 rounded-lg border text-[10px] font-mono uppercase font-black transition cursor-pointer ${
                      extraOptionChecked 
                      ? 'border-[#D32F2F] bg-[#D32F2F]/10 text-[#D32F2F]' 
                      : 'border-stone-300 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <span>{extraOptionChecked ? "Added (+$5)" : "Add (+$5)"}</span>
                  </button>
                </div>

              </div>

              {/* Action buttons footer */}
              <div className="p-5 border-t border-stone-200 bg-stone-50 flex items-center space-x-3 justify-end">
                <button
                  type="button"
                  onClick={() => setCustomizingItem(null)}
                  className="px-5 py-2 hover:bg-stone-150 text-stone-600 font-mono uppercase font-black text-[10px] rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyCustomizations}
                  className="px-6 py-2.5 bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-mono uppercase font-black text-[10px] rounded-lg transition shadow-sm"
                >
                  Confirm Platter Setup
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <footer className="bg-[#2C2925] text-stone-300 py-12 px-6 md:px-12 border-t border-stone-850 mt-12 text-left">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="space-y-3">
            <h4 className="font-serif font-black text-white text-lg uppercase">DACRIB KITCHEN CO.</h4>
            <p className="text-xs text-stone-400 max-w-xs leading-relaxed">
              We started in 2018 at the heart of Philadelphia to bring hot skillet comfort dinners and gourmet blackened combinations straight to the neighborhood. 
            </p>
          </div>

          <div className="space-y-2 font-mono text-xs text-stone-400">
            <p className="text-stone-300 font-black uppercase text-[10px]">CRIB SCHEDULES</p>
            <p>Saturdays Only: 11:00 AM — 9:00 PM</p>
            <p>Direct dispatcher line: 445.326.2790</p>
          </div>

          <div className="space-y-3">
            <p className="text-stone-300 font-mono font-black uppercase text-[10px]">Secure Payments accepted</p>
            <div className="flex flex-wrap gap-2 text-[10px] font-mono text-stone-400">
              <span className="bg-stone-800 px-2.5 py-1 rounded">Apple Pay</span>
              <span className="bg-stone-800 px-2.5 py-1 rounded">CashApp</span>
              <span className="bg-stone-800 px-2.5 py-1 rounded">Zelle</span>
              <span className="bg-stone-800 px-2.5 py-1 rounded">Cash</span>
            </div>
          </div>

        </div>

        <div className="max-w-7xl mx-auto border-t border-stone-800 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-stone-500 font-mono gap-4">
          <span>&copy; {new Date().getFullYear()} DACRIB KITCHEN. All Rights Reserved.</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Digital Platform Live & Secure</span>
          </span>
        </div>
      </footer>

    </div>
  );
}
