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
  { id: 'lamb_chops', name: 'Honey Garlic Lamb Chops (4)', price: 30, desc: 'Four juicy tender lamb chops grilled to perfection and glazed in honey-garlic sauce.', calories: '950 kcal', popular: true, tag: 'Chef Signature' },
  { id: 'turkey_wings', name: 'Turkey Wings', price: 28, desc: 'Gigantic, slow-cooked turkey wings falling off the bone, seasoned with premium soul spices.', calories: '1100 kcal', popular: true, tag: 'Local Legend' },
  { id: 'salmon', name: 'Blackened Salmon', price: 25, desc: 'Fresh premium Atlantic salmon, heavy cajun seared crust, locking in moisture.', calories: '720 kcal', popular: true, tag: 'Bestseller' },
  { id: 'steak', name: 'Sautéed Steak', price: 25, desc: 'Premium cut steak pieces, sautéed juicy tender with onions & bell pepper strips.', calories: '810 kcal', popular: false, tag: '' },
  { id: 'chicken_platter', name: 'Sautéed Chicken', price: 20, desc: 'Super tender chicken breast bits, perfectly seared & sautéed with house spices.', calories: '650 kcal', popular: false, tag: '' },
  { id: 'shrimp_platter', name: 'Sautéed Shrimp', price: 22, desc: 'Succulent butter-sautéed jumbo shrimp tossed in flavorful garlic butter sauce.', calories: '580 kcal', popular: false, tag: '' }
];

export const alfredos: MenuItem[] = [
  { id: 'alf_salmon', name: 'Blackened Salmon Alfredo', price: 20, desc: 'Rich home-cooked creamy alfredo sauce tossed with penne or fettuccine, topped with seared cajun salmon.', calories: '1250 kcal', popular: true, tag: 'Ultra Creamy' },
  { id: 'alf_steak', name: 'Sautéed Steak Alfredo', price: 20, desc: 'Prime juicy sautéed steak strips served on top of absolute creamy, buttery house-made alfredo.', calories: '1310 kcal', popular: true, tag: 'Top Choice' },
  { id: 'alf_shrimp', name: 'Sautéed Shrimp Alfredo', price: 18, desc: 'Juicy sautéed garlic-butter shrimp resting on a mountain of velvety, rich parmesan alfredo.', calories: '1120 kcal', popular: false, tag: '' },
  { id: 'alf_chicken', name: 'Sautéed Chicken Alfredo', price: 18, desc: 'Sautéed seasoned chicken tenders piled high on creamy penne or fettuccine alfredo.', calories: '1190 kcal', popular: false, tag: '' }
];

export const salads: MenuItem[] = [
  { id: 'pasta_salad', name: 'Pasta Salad', price: 8, desc: 'Chilled creamy colored pasta loaded with fresh colorful veggies and special restaurant seasonings.', calories: '340 kcal', popular: false, tag: 'Chilled Side' },
  { id: 'seafood_salad', name: 'Seafood Salad', price: 12, desc: 'Ultimate rich and chilled seafood salad tossed with crisp celery and our signature creamy herb seasoning.', calories: '410 kcal', popular: true, tag: 'Customer Favorite' }
];

export const wingFlavors: string[] = [
  'Thai Chili',
  'Hot Honey',
  'Fried',
  'Mango Habanero',
  'Teriyaki',
  'Kickin Bourbon'
];

export const sides: string[] = [
  'Mac & Cheese',
  'Candy Yams',
  'String Beans w/ Turkey',
  'Cabbge w/ Turkey',
  'Yellow Rice'
];

export const premiumCombos: ComboItem[] = [
  { 
    id: 'philly_king', 
    name: 'The Philly King Platter', 
    price: 50, 
    desc: 'Our supreme bundle. 4 Honey Garlic Lamb Chops coupled with a juicy Sautéed Steak entree. Includes double helper portion of Mac & Cheese & Candy yams.',
    tag: 'Crib Favorite',
    itemsList: ['Honey Garlic Lamb Chops', 'Sautéed Steak', 'Yellow Rice', 'Mac & Cheese', 'Candy Yams']
  },
  { 
    id: 'crave_pack', 
    name: 'Late Night Crave Bundle', 
    price: 42, 
    desc: '10 Crispy Wing Dings of your desired flavor paired alongside standard rich Sautéed Chicken Alfredo. Served with Yellow Rice & Mac on the house.',
    tag: 'Best Value',
    itemsList: ['10 Pieces Wing Dings', 'Sautéed Chicken Alfredo', 'Yellow Rice', 'Mac & Cheese']
  },
  { 
    id: 'sea_pack', 
    name: 'True Swimmer Seafood Double', 
    price: 38, 
    desc: 'Freshly blackened premium seared Salmon platter combined with garlic butter Sautéed Jumbo Shrimp. Heavy loaded comfort.',
    tag: 'Top Rated',
    itemsList: ['Blackened Salmon', 'Sautéed Shrimp', 'Yellow Rice', 'Cabbge w/ Turkey']
  }
];

export const faqs = [
  { 
    q: "What are the hours and is there a sell-out risk?", 
    a: "We open starting from 1:00 PM Tuesday through Saturday. Because of premium fresh preparation, select signature items (such as the Honey Garlic Lamb Chops and Blackened Salmon) sell out early! Building your ticket on our builder guarantees speedy queue placement." 
  },
  { 
    q: "How does the 'Text To Order: 445.326.2790' step work?", 
    a: "After selecting active items and setting customized sides or salad/pasta choices, click 'Send SMS' inside your Checkout Ticket. This automatically formats your order specs, timing preferences, and payment preference so you can instantly send it as an SMS text! We verify instantly and reply." 
  },
  { 
    q: "Are the accepted payment routes fully safe?", 
    a: "Completely secure. Once you trigger the text payload, you can pay directly via Zelle, CashApp, Apple Pay, or standard physical cash on pickup." 
  }
];
