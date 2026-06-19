export interface MenuItem {
  id: string;
  name: string;
  price: number;
  desc: string;
  calories: string;
  popular: boolean;
  tag: string;
}

export interface ComboItem {
  id: string;
  name: string;
  price: number;
  desc: string;
  tag: string;
  itemsList: string[];
}

export const entrees: MenuItem[] = [
  { id: 'lamb_chops', name: 'Honey garlic Lamb Chops', price: 30, desc: 'Juicy tender lamb chops grilled to perfection over open flame and glazed in exquisite honey-garlic sauce.', calories: '950 kcal', popular: true, tag: 'Chef Signature' },
  { id: 'turkey_wings', name: 'Turkey Wings', price: 28, desc: 'Gigantic, slow-cooked turkey wings falling off the bone, seasoned with premium soul spices.', calories: '1100 kcal', popular: true, tag: 'Local Legend' },
  { id: 'wing_platter', name: 'Wing Platter', price: 25, desc: 'Crispy seasoned wings served with your choice of two classic sides.', calories: '920 kcal', popular: false, tag: 'New' },
  { id: 'salmon', name: 'Blackened Salmon', price: 25, desc: 'Fresh premium Atlantic salmon with a heavy seared cajun crust, locking in buttery moisture.', calories: '720 kcal', popular: true, tag: 'Bestseller' },
  { id: 'steak', name: 'Sautéed Steak', price: 20, desc: 'Premium cut steak tender strips, sautéed juicy with skillet onions & fresh green bell pepper.', calories: '810 kcal', popular: false, tag: '' },
  { id: 'chicken_platter', name: 'Sautéed Chicken', price: 20, desc: 'Super tender chicken breast bits, perfectly seared & sautéed with house blended spices.', calories: '650 kcal', popular: false, tag: '' },
  { id: 'shrimp_platter', name: 'Sautéed Shrimp', price: 22, desc: 'Succulent butter-sautéed jumbo shrimp tossed in flavorful rich garlic butter seasonings.', calories: '580 kcal', popular: false, tag: '' }
];

export const alfredos: MenuItem[] = [];

export const salads: MenuItem[] = [
  { id: 'pasta_salad', name: 'Pasta Salad', price: 8, desc: 'Chilled creamy tri-colored pasta loaded with fresh crisp veggies and restaurant seasonings.', calories: '340 kcal', popular: false, tag: 'Chilled Side' },
  { id: 'seafood_salad', name: 'Seafood Salad', price: 12, desc: 'Ultimate rich and chilled seafood salad tossed with crisp celery and creamy signature dressing.', calories: '410 kcal', popular: true, tag: 'Customer Favorite' }
];

export const wingFlavors: string[] = [];

export const sides: string[] = [
  'Mac & Cheese',
  'Candy Yams',
  'String Beans w/ Turkey',
  'Cabbge w/ Turkey',
  'Yellow Rice'
];

export const premiumCombos: ComboItem[] = [];

export const faqs = [
  { 
    q: "What are the hours and is there a sell-out risk?", 
    a: "We are open for Soul Food Saturdays. Because of premium fresh preparation, select signature items (such as the Honey Garlic Lamb Chops and Blackened Salmon) sell out early! Building your ticket on our builder guarantees speedy queue placement." 
  },
  { 
    q: "How does the 'Text To Order: 445.326.2790' step work?", 
    a: "After selecting active items and setting customized sides or salad choices, click 'Send SMS' inside your Checkout Ticket. This automatically formats your order specs, timing preferences, and payment preference so you can instantly send it as an SMS text! We verify instantly and reply." 
  },
  { 
    q: "Are the accepted payment routes fully safe?", 
    a: "Completely secure. Once you trigger the text payload, you can pay directly via Zelle, CashApp, Apple Pay, or standard physical cash on pickup." 
  }
];
