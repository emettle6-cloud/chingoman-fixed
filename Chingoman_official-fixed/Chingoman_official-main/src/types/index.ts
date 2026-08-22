export type VehicleType = 'ICE' | 'Hybrid' | 'PHEV' | 'EREV' | 'EV';
export type SteeringSide = 'LHD' | 'RHD';
export type ListingType = 'marketer' | 'direct';
export type VehicleStatus = 'active' | 'sold' | 'out_of_stock' | 'rejected' | 'draft' | 'pending';
export type UserType = 'buyer' | 'marketer' | 'admin';
export type PaymentStatus = 'unpaid' | 'paid' | 'waived' | 'refunded';
export type ListingTier = 'standard' | 'premium';
export type SellerVerificationStatus = 'none' | 'pending' | 'approved' | 'rejected';

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
  has_home_charger: boolean;
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
  payment_status: PaymentStatus;
  tier: ListingTier;
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
  seller_verification_status: SellerVerificationStatus;
  seller_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SellerVerificationRequest {
  id: string;
  profile_id: string;
  requested_role: 'marketer' | 'direct';
  full_name: string;
  email: string;
  phone: string;
  whatsapp: string | null;
  country: string;
  city: string;
  id_type: string;
  id_number: string;
  id_document_url: string;
  business_name: string | null;
  business_registration_no: string | null;
  years_experience: string | null;
  sourcing_details: string | null;
  reference_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notified_at: string | null;
  notify_error: string | null;
  created_at: string;
}

export interface ListingPayment {
  id: string;
  vehicle_id: string;
  profile_id: string;
  tier: ListingTier;
  amount_usd: number;
  currency: string;
  provider: string;
  provider_reference: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  paid_at: string | null;
  created_at: string;
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
  part_id: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  seller_id: string;
  reviewer_id: string;
  vehicle_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer?: Pick<Profile, 'full_name' | 'avatar_url'>;
}

export interface SparePart {
  id: string;
  seller_id: string | null;
  name: string;
  category: string;
  compatible_make: string | null;
  compatible_model: string | null;
  compatible_year_from: number | null;
  compatible_year_to: number | null;
  condition: string;
  price_usd: number;
  quantity: number;
  port_china: string;
  images: string[];
  description: string | null;
  is_verified: boolean;
  is_featured: boolean;
  status: VehicleStatus;
  views: number;
  created_at: string;
  updated_at: string;
}
