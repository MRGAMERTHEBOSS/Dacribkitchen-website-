export interface CartItem {
  cartId: string;
  name: string;
  basePrice: number;
  category: 'entree' | 'alfredo' | 'wings' | 'side' | 'combo' | 'salad';
  selectedSides?: string[];
  pastaBase?: 'Penne' | 'Fettuccine';
  wingFlavors?: string[];
  extraOptionChecked?: boolean; // Extra Meat for entrees, Extra Portion for alfredo
}

export type OrderType = 'pickup' | 'delivery';
export type PreferredPayment = 'Apple Pay' | 'CashApp' | 'Zelle' | 'Cash';
export type OrderTimeType = 'asap' | 'scheduled';
