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
  BadgeAlert
} from 'lucide-react';

import { CartItem, OrderType, PreferredPayment, OrderTimeType } from './types';
import { entrees, alfredos, salads, sides, faqs } from './data';
import { jsPDF } from 'jspdf';
import confetti from 'canvas-confetti';

// Import image assets
import lambChopsImg from './assets/images/lamb_chops_platter_1781637578642.jpg';
import salmonImg from './assets/images/salmon_platter_1781637544257.jpg';
import turkeyWingsImg from './assets/images/turkey_wing_platter_1781637568663.jpg';
import steakImg from './assets/images/steak_tips_platter_1781637532486.jpg';
import chickenImg from './assets/images/chicken_and_cabbage_1781637556702.jpg';
import wingsImg from './assets/images/wings_platter_1781637522509.jpg';

// Map IDs to imported images
const imageMap: Record<string, string> = {
  lamb_chops: lambChopsImg,
  salmon: salmonImg,
  turkey_wings: turkeyWingsImg,
  steak: steakImg,
  chicken_platter: chickenImg,
  shrimp_platter: wingsImg,
  pasta_salad: wingsImg,
  seafood_salad: salmonImg,
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
  const [activeTab, setActiveTab] = useState<'entrees' | 'salads' | 'sides'>('entrees');
  const [customizingItem, setCustomizingItem] = useState<any | null>(null);
  const [selectedSides, setSelectedSides] = useState<string[]>([]);
  const [extraOptionChecked, setExtraOptionChecked] = useState(false);
  
  const [orderPlacing, setOrderPlacing] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

    let smsBody = `🔥 DACRIB KITCHEN ORDER 🔥\n`;
    smsBody += `Client: ${customerName}\n`;
    smsBody += `Type: ${orderType.toUpperCase()} (${orderTimeType === 'asap' ? 'ASAP' : `Scheduled for ${scheduledTime}`})\n`;
    if (orderType === 'delivery') {
      smsBody += `Delivery Address: ${deliveryAddress}\n`;
    }
    smsBody += `Payment: ${preferredPayment}\n\n`;
    smsBody += `PLATES SECURED:\n`;
    
    calculatedItems.forEach((it, idx) => {
      smsBody += `${idx + 1}. ${it.name} ($${it.computedPrice})\n`;
      if (it.selectedSides && it.selectedSides.length > 0) {
        smsBody += `   • Sides: ${it.selectedSides.join(', ')}\n`;
      }
      if (it.extraOptionChecked) {
        smsBody += `   • Extra Option: Double Portion Included (+$5)\n`;
      }
    });

    smsBody += `\nSubtotal: $${subtotal}.00\n`;
    if (deliveryFee > 0) smsBody += `Delivery: $${deliveryFee}.00\n`;
    smsBody += `Total Bill: $${grandTotal}.00\n\n`;
    if (specialNotes.trim()) {
      smsBody += `Notes: "${specialNotes}"\n\n`;
    }
    smsBody += `*CRIB-DISPATCH-ORDER-VERIFICATION*`;

    const encoded = encodeURIComponent(smsBody);
    window.open(`https://wa.me/14453262790?text=${encoded}`, '_blank');
    
    // Simulate placing order in guest history
    setOrderPlacing(true);
    setTimeout(() => {
      const generatedId = `CRIB-${Math.floor(1000 + Math.random() * 9000)}`;
      setPlacedOrderId(generatedId);
      setOrderPlacing(false);
      setCart([]);
      confetti({ particleCount: 150, spread: 80, scaler: 1.2 });
    }, 1200);
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
      doc.text("PRICE", 175, 81, { align: "right" });
      
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
        doc.text(`$${item.computedPrice}.00`, 175, currentY, { align: "right" });
        
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
      doc.text("Platters Subtotal:", 130, currentY);
      doc.text(`$${subtotal || 30}.00`, 175, currentY, { align: "right" });
      
      currentY += 6;
      doc.text("West Philly Delivery Fee:", 130, currentY);
      doc.text(`$${deliveryFee}.00`, 175, currentY, { align: "right" });
      
      currentY += 7;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(190, 30, 30); // Crimson highlight
      doc.text("GRAND BILL TOTAL:", 130, currentY);
      doc.text(`$${grandTotal || 30}.00`, 175, currentY, { align: "right" });

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
    <div id="main-frame-root" className="min-h-screen bg-[#FBF9F5] text-[#2C2925] font-sans antialiased relative">
      
      {/* Toast Alert Notification Layer */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#2C2925]/95 text-[#FBF9F5] border border-neutral-700/50 rounded-2xl px-6 py-3.5 shadow-xl flex items-center space-x-3 text-xs uppercase font-mono font-black"
          >
            <span className="w-2 h-2 rounded-full bg-[#D32F2F] animate-pulse" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP ANNOUNCEMENT BAR */}
      <div className="w-full bg-[#2C2925] text-stone-200 py-2.5 px-6 text-center text-[10px] uppercase font-mono tracking-widest font-black flex items-center justify-center space-x-2 border-b border-stone-800">
        <Sparkle className="w-3.5 h-3.5 text-[#E5A93C] animate-spin" />
        <span>SOUL FOOD SATURDAYS OPEN FOR BUSINESS — WEST PHILLY SECURE DELIVERY RANGE</span>
        <Sparkle className="w-3.5 h-3.5 text-[#E5A93C] animate-spin" />
      </div>

      {/* FIXED BOUTIQUE NAV HEADER */}
      <header className="px-6 md:px-12 py-5.5 flex items-center justify-between border-b border-stone-200 bg-white/95 backdrop-blur-md sticky top-0 z-30 shadow-xs">
        
        {/* Typographic Serif Logo Matching Pizza-style Brand */}
        <div onClick={() => scrollTo('main-frame-root')} className="flex items-center space-x-3 cursor-pointer select-none">
          <div className="w-10.5 h-10.5 rounded-full bg-[#D32F2F] flex items-center justify-center text-[#FBF9F5] shadow-md shadow-[#D32F2F]/20">
            <span className="font-serif font-black text-lg">C</span>
          </div>
          <div>
            <span className="font-serif font-black text-2xl tracking-tighter text-[#2C2925] uppercase block leading-none">
              DA CRIB <span className="text-[#D32F2F]">KITCHEN</span>
            </span>
            <span className="text-[10px] font-mono font-black uppercase tracking-widest text-[#E5A93C] mt-0.5 block leading-none">
              Est. 2018 | West Philly Soul
            </span>
          </div>
        </div>

        {/* Navigation links styled like a classic Italian pizzeria */}
        <nav className="hidden lg:flex items-center space-x-9 font-mono text-xs uppercase tracking-wider font-extrabold text-stone-500">
          <div className="relative group cursor-pointer text-[#D32F2F]">
            <span>Our House</span>
            <span className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#D32F2F]" />
          </div>
          
          <div onClick={() => scrollTo('menu-grid-section')} className="hover:text-[#D32F2F] transition duration-200 cursor-pointer flex items-center space-x-1.5">
            <span>The Soul Menu</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#D32F2F]" />
          </div>

          <div onClick={() => scrollTo('faq-decorations')} className="hover:text-[#D32F2F] transition duration-200 cursor-pointer">
            <span>Help Info / Q&A</span>
          </div>
        </nav>

        {/* Actions panel */}
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => scrollTo('menu-grid-section')}
            className="p-2 rounded-full hover:bg-stone-100 text-[#D32F2F] transition relative"
            title="Search the menu"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Quick PDF Receipt Trigger */}
          <button
            onClick={downloadPdfReceipt}
            className="px-4 py-2 bg-stone-100 text-[#2C2925] hover:bg-stone-200 text-[10.5px] uppercase font-mono font-black rounded-lg transition hidden md:flex items-center space-x-2 border border-stone-300"
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
            className="lg:hidden p-2 text-stone-700 bg-stone-100 rounded-full"
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
            className="lg:hidden bg-white border-b border-stone-200 overflow-hidden shadow-lg z-20 sticky top-[73px]"
          >
            <div className="px-6 py-5 flex flex-col space-y-4 font-mono text-xs uppercase tracking-wider font-extrabold text-stone-600">
              <div 
                onClick={() => { scrollTo('main-frame-root'); setMobileMenuOpen(false); }} 
                className="py-2 text-stone-900 cursor-pointer flex items-center justify-between border-b border-stone-100"
              >
                <span>Our House</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#D32F2F]" />
              </div>
              <div 
                onClick={() => { scrollTo('menu-grid-section'); setMobileMenuOpen(false); }} 
                className="py-2 hover:text-[#D32F2F] transition cursor-pointer flex items-center justify-between border-b border-stone-100"
              >
                <span>The Soul Menu</span>
                <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-[#D32F2F]" />
              </div>
              <div 
                onClick={() => { scrollTo('faq-decorations'); setMobileMenuOpen(false); }} 
                className="py-2 hover:text-[#D32F2F] transition cursor-pointer border-b border-stone-100"
              >
                <span>FAQs & Info</span>
              </div>
              <div 
                onClick={() => { downloadPdfReceipt(); setMobileMenuOpen(false); }} 
                className="py-2.5 text-[#D32F2F] flex items-center space-x-2 font-black"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF Receipt</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOUTIQUE FOOD HERO SHOWCASE */}
      <section className="relative overflow-hidden min-h-[500px] lg:min-h-[560px] grid grid-cols-1 lg:grid-cols-12 items-center bg-[#FDFBF7] border-b border-stone-200">
        
        {/* Subtle decorative background grids */}
        <div className="absolute inset-0 opacity-2.5 pointer-events-none bg-[radial-gradient(#C82333_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* HERO LEFT COLUMN: Editorial Copy, Star Badge, Action CTAs */}
        <div className="lg:col-span-7 px-6 md:px-16 lg:py-16 py-12 space-y-6 text-left relative z-10">
          
          <div className="inline-flex items-center space-x-2.5 bg-[#D32F2F]/10 border border-[#D32F2F]/20 px-3 py-1 rounded-md text-[10px] text-[#D32F2F] font-mono tracking-widest font-black uppercase">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D32F2F] opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#D32F2F]" />
            </span>
            <span>Premium Philadelphia Soul Food</span>
          </div>

          <h1 className="font-serif font-black text-4xl sm:text-5xl md:text-6.5xl tracking-tight text-[#2C2925] leading-[0.95] uppercase">
            The Crib Platter <span className="text-[#D32F2F] block">Experience.</span>
          </h1>

          <div className="flex items-center space-x-3.5 text-xs text-stone-500 font-mono">
            <div className="flex items-center text-[#E5A93C] gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-4 h-4 fill-current" />
              ))}
            </div>
            <span>•</span>
            <span className="text-stone-900 font-bold">4.9/5 Chef Platters Rating</span>
            <span>•</span>
            <span className="text-[#D32F2F] font-black">Open Sat</span>
          </div>

          <p className="text-[#5C564F] text-sm md:text-base leading-relaxed max-w-xl font-sans">
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
              className="px-6 py-3.5 border border-stone-300 hover:border-stone-500 text-stone-700 font-mono uppercase text-[10.5px] font-black rounded-full transition cursor-pointer"
            >
              <span>How we package / ETAs</span>
            </button>
          </div>
        </div>

        {/* HERO RIGHT COLUMN: Pristine Food Presentation Plate Graphic */}
        <div className="lg:col-span-5 h-full relative flex items-center justify-center p-6 lg:p-12 bg-stone-50/50 border-t lg:border-t-0 lg:border-l border-stone-200">
          
          <div className="relative w-full max-w-[340px] aspect-square rounded-full bg-[#2C2925]/5 border border-stone-300/40 p-4 flex items-center justify-center overflow-hidden">
            
            {/* Real local image dynamically styled as our flagship Salmon platter */}
            <motion.div 
              initial={{ rotate: -15, scale: 0.9 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ duration: 1.2 }}
              className="w-full h-full rounded-full border-4 border-white shadow-2xl relative overflow-hidden"
            >
              <img 
                src={imageMap.salmon} 
                alt="DaCrib Specialty Blackened Salmon Platter" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              {/* Overlaid Banner Badge */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-5 text-left">
                <span className="text-[10px] font-mono font-black uppercase text-[#E5A93C] tracking-widest">SIGNATURE ENTRÉE</span>
                <h4 className="font-serif font-black text-white text-base leading-tight uppercase mt-0.5">BLACKENED CAJUN SALMON</h4>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* MAIN TWO-COLUMN CONTAINER: MENU vs BILLING INVOICE */}
      <main className="max-w-7xl mx-auto px-4 md:px-10 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: ACTIVE MENU PLATTERS (7 Cols) */}
        <div id="menu-grid-section" className="lg:col-span-7 space-y-8">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-200">
            <div>
              <h2 className="font-serif font-black text-3xl text-[#2C2925] uppercase tracking-tight">The Southern Cuisine Menu</h2>
              <p className="text-xs text-stone-500 font-mono mt-1">Sautéed proteins cooked with deep Philly flavor & soul seasonings.</p>
            </div>

            {/* In-Menu Search Helper */}
            <div className="relative max-w-[220px]">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search skillet meals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:border-[#D32F2F] font-mono transition"
              />
            </div>
          </div>

          {/* Boutique Horizontal Tab Navigation */}
          <div className="flex space-x-1.5 p-1 bg-stone-200/60 rounded-xl max-w-[340px]">
            {(['entrees', 'salads', 'sides'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-center text-[10.5px] uppercase font-mono font-black rounded-lg transition-all duration-150 cursor-pointer ${
                  activeTab === tab 
                  ? 'bg-white text-[#D32F2F] shadow-sm font-extrabold' 
                  : 'text-stone-600 hover:text-stone-900'
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
                  <div key={item.id} className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col h-full">
                    
                    {/* Visual Card Top Block with real local asset rendering */}
                    <div className="h-44 relative bg-stone-100 overflow-hidden">
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
                      <span className="absolute bottom-3 right-3 px-3 py-1.5 bg-[#2C2925] text-stone-100 font-mono text-xs font-black rounded-lg tracking-wider">
                        ${item.price}.00
                      </span>
                    </div>

                    {/* Platter Card Details */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-3.5">
                      <div className="space-y-1.5">
                        <h4 className="font-serif font-black text-base text-[#2C2925] uppercase tracking-tight leading-tight">
                          {item.name}
                        </h4>
                        <p className="text-xs text-[#5C564F] leading-relaxed">
                          {item.desc}
                        </p>
                      </div>

                      {/* Add Button & Calories Indicator */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-stone-100">
                        <span className="text-[9.5px] font-mono text-stone-400 font-extrabold uppercase">
                          {item.calories}
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => handleItemAction(item, false)}
                          className="px-4 py-2 bg-gradient-to-r from-[#D32F2F] to-[#C82333] hover:from-[#C82333] hover:to-[#D32F2F] text-white font-mono text-[10px] uppercase font-black rounded-lg transition-all shadow-sm shadow-[#D32F2F]/10 flex items-center space-x-1.5 cursor-pointer"
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
                  <div key={item.id} className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col h-full">
                    
                    {/* Visual Card Top Block */}
                    <div className="h-44 relative bg-stone-100 overflow-hidden">
                      <img 
                        src={imageMap[item.id] || imageMap.wings_platter} 
                        alt={item.name} 
                        className="w-full h-full object-cover select-none"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute bottom-3 right-3 px-3 py-1.5 bg-[#2C2925] text-stone-100 font-mono text-xs font-black rounded-lg tracking-wider">
                        ${item.price}.00
                      </span>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-3.5">
                      <div className="space-y-1.5">
                        <h4 className="font-serif font-black text-base text-[#2C2925] uppercase tracking-tight leading-tight">
                          {item.name}
                        </h4>
                        <p className="text-xs text-[#5C564F] leading-relaxed">
                          {item.desc}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2.5 border-t border-stone-100">
                        <span className="text-[9.5px] font-mono text-stone-400 font-extrabold uppercase">
                          {item.calories}
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => handleItemAction(item, true)}
                          className="px-4 py-2 bg-gradient-to-r from-[#D32F2F] to-[#C82333] hover:from-[#C82333] hover:to-[#D32F2F] text-white font-mono text-[10px] uppercase font-black rounded-lg transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
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
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <span className="text-xs uppercase font-mono font-black text-stone-400">Available Complimentary Sides</span>
                <span className="text-[10px] text-stone-400 font-sans italic">Custom selection handled inside entree menus</span>
              </div>
              <p className="text-xs text-[#5C564F]">
                Our standard entree platters include your selection of **up to 2** of our signature slow-simmered sides. Sides are not sold separately so they stay hot and packed with our custom-blended kitchen seasonings.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {sides.map((sideName) => (
                  <div key={sideName} className="flex items-center space-x-2.5 bg-stone-100 border border-stone-300/40 p-3 rounded-xl select-none text-xs font-mono font-bold">
                    <div className="w-2 h-2 rounded-full bg-[#E5A93C]" />
                    <span>{sideName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FAQS CUSTOM BLOCK */}
          <div id="faq-decorations" className="bg-white border border-stone-200 rounded-3xl p-6.5 text-left space-y-5 shadow-xs">
            <h3 className="font-serif font-black text-xl text-[#2C2925] uppercase tracking-tight">Crib Logistics & FAQs</h3>
            
            <div className="space-y-4.5 divide-y divide-stone-100">
              {faqs.map((f, idx) => (
                <div key={idx} className={`${idx > 0 ? 'pt-4.5' : ''} space-y-1.5`}>
                  <p className="text-xs font-mono font-black uppercase text-[#D32F2F] flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4" />
                    <span>{f.q}</span>
                  </p>
                  <p className="text-xs text-[#5C564F] leading-relaxed pl-5.5 font-sans">
                    {f.a}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: REVENUE CHECKOUT STUB RECEIPT & ORDER ACTIONS (5 Cols) */}
        <div id="order-form-ticket" className="lg:col-span-12 xl:col-span-5 lg:order-last space-y-6">
          
          <div className="bg-[#FAF8F5] border-2 border-[#2C2925] rounded-3xl p-6 space-y-5 shadow-lg relative overflow-hidden">
            
            {/* Traditional invoice layout elements */}
            <div className="absolute top-0 left-0 w-full h-[5px] bg-repeating-linear bg-gradient-to-r from-[#D32F2F] via-[#E5A93C] to-[#2C2925] opacity-90" />
            
            <div className="flex items-center justify-between pb-3 border-b border-stone-300/50 pt-2">
              <div className="flex items-center space-x-2 text-[#2C2925]">
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
                className="bg-stone-100 border border-stone-300 rounded-2xl p-5 text-center space-y-3.5"
              >
                <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mx-auto border border-emerald-300/30 shadow-xs">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-black uppercase tracking-widest text-[#D32F2F] block">ORDER TRANSMITTED</span>
                  <h4 className="font-serif font-black text-xl uppercase mt-1 leading-none">{placedOrderId}</h4>
                  <p className="text-xs text-stone-500 mt-2 font-sans">
                    We updated our kitchen dispatcher logs! Tap the button below to secure your PDF print billing receipt:
                  </p>
                </div>

                <div className="pt-2.5 flex flex-col gap-2">
                  <button
                    onClick={downloadPdfReceipt}
                    className="w-full py-2.5 bg-[#2C2925] text-stone-100 hover:bg-[#1C1C1F] font-mono text-[10px] uppercase font-black rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Download className="w-4 h-4 text-[#E5A93C]" />
                    <span>Download Invoice Receipt</span>
                  </button>

                  <button
                    onClick={() => setPlacedOrderId(null)}
                    className="w-full py-2 text-stone-600 hover:text-stone-900 border border-stone-350 text-[9px] uppercase font-mono font-black rounded-lg transition cursor-pointer"
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
                      <div key={it.cartId} className="bg-white border border-stone-200 rounded-xl p-3.5 space-y-2 relative shadow-xs">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h5 className="font-serif font-black text-sm text-[#2C2925] uppercase tracking-tight">
                              {it.name}
                            </h5>
                            
                            {/* Extra portion toggle description if checked */}
                            {it.category === 'entree' && it.selectedSides && (
                              <p className="text-[10.5px] text-stone-500 font-mono mt-0.5 font-bold">
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
                            <span className="font-mono text-sm font-black text-[#2C2925]">
                              ${it.computedPrice}.00
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(it.cartId)}
                              className="text-stone-400 hover:text-[#D32F2F] transition duration-150 p-1 rounded-md hover:bg-stone-100"
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
                  <div className="py-12 text-center text-stone-400 border border-dashed border-stone-300 rounded-2xl min-h-[140px] flex flex-col items-center justify-center space-y-2">
                    <ShoppingBag className="w-7 h-7 text-stone-300" />
                    <div>
                      <p className="font-serif font-black text-stone-500 uppercase tracking-tight text-xs">Your Food Tray is Empty</p>
                      <p className="text-[10px] text-stone-400 font-mono mt-1">Add Southern platters or side salads to continue.</p>
                    </div>
                  </div>
                )}

                {/* Billing Summary lines */}
                {cart.length > 0 && (
                  <div className="pt-3 border-t border-stone-300/50 space-y-2 font-mono text-xs">
                    <div className="flex justify-between text-stone-600">
                      <span>Platters Subtotal</span>
                      <span>${subtotal}.00</span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>West Philly Delivery Fee ({orderType})</span>
                      <span>${deliveryFee}.00</span>
                    </div>
                    <div className="flex justify-between text-stone-800 font-black text-sm pt-2.5 border-t border-stone-200">
                      <span className="uppercase">Grand Total Bill</span>
                      <span className="text-[#D32F2F]">${grandTotal}.00</span>
                    </div>
                  </div>
                )}

                {/* THE SECURE INFORMATION FORM MATCHING USER INPUT SPECIFICATIONS */}
                <div className="space-y-4 pt-1.5 border-t border-stone-300/50">
                  
                  {/* Dining Passenger Name */}
                  <div>
                    <label className="text-[10px] uppercase font-mono text-stone-400 tracking-wider font-extrabold block mb-1">
                      Your Name <span className="text-[#D32F2F]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Marcus Garvey"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2.5 text-xs text-[#2C2925] focus:outline-none focus:border-[#D32F2F] font-mono transition"
                    />
                  </div>

                  {/* Delivery Route switch tabs */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-[10px] uppercase font-mono text-stone-400 tracking-wider font-extrabold block mb-1.5">Dispatch Method</span>
                      <div className="flex rounded-xl bg-stone-200/50 p-1 gap-1">
                        <button
                          type="button"
                          onClick={() => setOrderType('pickup')}
                          className={`flex-1 py-1.5 text-center text-[10px] font-black rounded-lg transition uppercase flex items-center justify-center space-x-1 cursor-pointer ${
                            orderType === 'pickup' ? 'bg-[#2C2925] text-white' : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          <Store className="w-3.5 h-3.5" />
                          <span>Pickup</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrderType('delivery')}
                          className={`flex-1 py-1.5 text-center text-[10px] font-black rounded-lg transition uppercase flex items-center justify-center space-x-1 cursor-pointer ${
                            orderType === 'delivery' ? 'bg-[#2C2925] text-white' : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Delivery</span>
                        </button>
                      </div>
                    </div>

                    {/* Timing Switch */}
                    <div>
                      <span className="text-[10px] uppercase font-mono text-stone-400 tracking-wider font-extrabold block mb-1.5">Schedule Platter</span>
                      <div className="flex rounded-xl bg-stone-200/50 p-1 gap-1">
                        <button
                          type="button"
                          onClick={() => setOrderTimeType('asap')}
                          className={`flex-1 py-1.5 text-center text-[10px] font-black rounded-lg transition uppercase flex items-center justify-center space-x-1 cursor-pointer ${
                            orderTimeType === 'asap' ? 'bg-[#2C2925] text-white' : 'text-stone-600'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>ASAP</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrderTimeType('scheduled')}
                          className={`flex-1 py-1.5 text-center text-[10px] font-black rounded-lg transition uppercase flex items-center justify-center space-x-1 cursor-pointer ${
                            orderTimeType === 'scheduled' ? 'bg-[#2C2925] text-white' : 'text-stone-600'
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
                      <label className="text-[10px] uppercase font-mono text-stone-400 tracking-wider font-extrabold block mb-1">
                        West Philly Delivery Address <span className="text-[#D32F2F]">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 4800 Market St, Philadelphia"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2.5 text-xs text-[#2C2925] focus:outline-none focus:border-[#D32F2F] font-mono transition"
                      />
                      <p className="text-[8.5px] text-stone-400 font-mono italic">West Philly courier dispatched for an additional $5 flat rate.</p>
                    </motion.div>
                  )}

                  {/* Scheduled Selection Hour list if active */}
                  {orderTimeType === 'scheduled' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-1"
                    >
                      <label className="text-[10px] uppercase font-mono text-stone-400 tracking-wider font-extrabold block mb-1">
                        Target Delivery / Pickup Hour <span className="text-[#D32F2F]">*</span>
                      </label>
                      <select
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2.5 text-xs text-[#2C2925] focus:outline-none focus:border-[#D32F2F] font-mono transition"
                      >
                        <option value="12:00 PM">12:00 PM (Noon)</option>
                        <option value="1:00 PM">1:00 PM</option>
                        <option value="2:00 PM">2:00 PM</option>
                        <option value="3:00 PM">3:00 PM</option>
                        <option value="4:00 PM">4:00 PM</option>
                        <option value="5:00 PM">5:00 PM</option>
                        <option value="6:00 PM">6:00 PM</option>
                        <option value="7:00 PM">7:00 PM</option>
                        <option value="8:00 PM">8:00 PM</option>
                      </select>
                    </motion.div>
                  )}

                  {/* Payment Routing Method options */}
                  <div>
                    <span className="text-[10px] uppercase font-mono text-stone-400 tracking-wider font-extrabold block mb-2">Preferred CRIB Payment Route</span>
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
                              ? 'bg-white border-[#D32F2F] text-[#D32F2F] shadow-sm' 
                              : 'bg-stone-50 border-stone-300/40 text-stone-600 hover:text-stone-900'
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
                    <label className="text-[10px] uppercase font-mono text-stone-400 tracking-wider font-extrabold block mb-1">
                      Chef Cooking Instructions (Optional)
                    </label>
                    <textarea
                      placeholder="e.g. Double gravy, well done lamb chops, yams well sweetened..."
                      value={specialNotes}
                      onChange={(e) => setSpecialNotes(e.target.value)}
                      className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2.5 text-xs text-[#2C2925] focus:outline-none focus:border-[#D32F2F] font-mono transition h-14 resize-none"
                    />
                  </div>

                  {/* SUBMIT BUTTON SECTION FOR CUSTOM PLATES */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleTriggerSmsOrder}
                      disabled={cart.length === 0 || orderPlacing}
                      className="w-full h-12 bg-[#2C2925] hover:bg-[#1C1C1F] text-stone-100 disabled:bg-stone-300 disabled:cursor-not-allowed font-serif font-black uppercase tracking-widest text-xs rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer shadow-md"
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
            <h4 className="font-serif font-black text-white text-lg uppercase">DA CRIB KITCHEN CO.</h4>
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
          <span>&copy; {new Date().getFullYear()} DA CRIB KITCHEN. All Rights Reserved.</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Digital Platform Live & Secure</span>
          </span>
        </div>
      </footer>

    </div>
  );
}
