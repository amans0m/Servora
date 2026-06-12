export interface Category {
  id: string;
  name: string;
  icon: string;
  custom?: boolean;
}

export interface Review {
  id: string;
  author: string;
  stars: number;
  text: string;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
}

export interface Service {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  rating: number;
  engineersNearby: number;
  summary: string;
  included: string[];
  addons: Addon[];
  reviews: Review[];
}

export interface Engineer {
  id: string;
  name: string;
  rating: number;
  jobs: number;
  distanceKm: number;
  skills: string[];
  etaMin: number;
}

export interface Coupon {
  code: string;
  label: string;
  type: 'percent' | 'flat';
  value: number;
}

export type BookingStatus =
  | 'quote'
  | 'confirmed'
  | 'en_route'
  | 'in_progress'
  | 'awaiting_payment'
  | 'completed'
  | 'cancelled';

export interface Booking {
  id: string;
  type: 'standard' | 'custom';
  serviceId?: string;
  serviceName: string;
  address: string;
  scheduledAt?: string;
  status: BookingStatus;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  couponCode?: string;
  engineer?: Engineer;
  startOtp?: string;
  completionOtp?: string; // revealed ONLY after payment
  paid: boolean;
  proof: string[];
  createdAt: number;
}

export const TAX_RATE = 0.18;
