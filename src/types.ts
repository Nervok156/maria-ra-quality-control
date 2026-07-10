export type ProductCategory = 
  | 'dairy'
  | 'bakery'
  | 'meat_sausage'
  | 'grocery'
  | 'beverages'
  | 'confectionery'
  | 'other';

export interface Product {
  id: string;
  barcode: string;
  name: string;
  category: ProductCategory;
  price: number;
  quantity: number;
  expirationDate: string;
  manufactureDate?: string;
  status: 'fresh' | 'expiring_soon' | 'expired' | 'marked_down' | 'written_off';
  markdownPrice?: number;
  markdownPercent?: number;
  writeOffReason?: string;
  location?: string;
  addedAt: string;
}

export interface Inspection {
  id: string;
  date: string;
  inspectorName: string;
  shift: 'morning' | 'evening';
  checkedCategories: ProductCategory[];
  itemsFoundExpiring: number;
  itemsFoundExpired: number;
  notes?: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  avatarColor: string;
}