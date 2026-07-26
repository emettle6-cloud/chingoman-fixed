export type VehicleType = 'ICE' | 'Hybrid' | 'PHEV' | 'EREV' | 'EV';
export type SteeringSide = 'LHD' | 'RHD';
export type ListingType = 'marketer' | 'direct';
export type VehicleStatus = 'active' | 'sold' | 'draft' | 'pending';
export type UserType = 'buyer' | 'marketer' | 'admin';

export interface Vehicle {
  id: string;
  seller_id: string | null;
  make: string;
  model: string;
  year: number;
  vehicle_type: VehicleType;
  powertrain_detail: string | null;
  steering_side: SteeringSide;
  price_usd: number;
  mileage_km: number | null;
  condition: string;
  color: string | null;
  transmission: string | null;
  engine_cc: number | null;
  fuel_type: string | null;
  battery_capacity_kwh: number | null;
  battery_soh: number | null;
  range_km: number | null;
  charging_type: string | null;
  port_china: string;
  listing_type: ListingType;
  shipping_available: boolean;
  images: string[];
  inspection_report_url: string | null;
  inspection_date: string | null;
  inspection_company: string | null;
  is_verified: boolean;
  is_featured: boolean;
  description: string | null;
  status: VehicleStatus;
  views: number;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  phone: string;
  whatsapp: string;
  country: string;
  city: string;
  user_type: UserType;
  is_verified: boolean;
  is_admin: boolean;
  avatar_url: string;
  bio: string;
  rating: number;
  total_reviews: number;
  created_at: string;
  updated_at: string;
}

export interface Inspection {
  id: string;
  vehicle_id: string;
  inspector_name: string;
  company: string;
  inspection_date: string;
  port_china: string;
  overall_grade: string;
  engine_score: number;
  body_score: number;
  interior_score: number;
  electrical_score: number;
  battery_score: number;
  report_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface ShippingQuote {
  id: string;
  vehicle_id: string | null;
  buyer_auth_id: string | null;
  name: string;
  email: string;
  phone: string;
  port_china: string;
  port_destination: string;
  vehicle_price_usd: number;
  estimated_freight_usd: number | null;
  estimated_insurance_usd: number | null;
  estimated_cif_usd: number | null;
  notes: string | null;
  status: string;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  vehicle_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  vehicle_id: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
}
