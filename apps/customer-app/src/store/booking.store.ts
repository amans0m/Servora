import { create } from 'zustand';

import { mockEngineers } from '../services/mock/data';
import {
  type Addon,
  type Booking,
  type Coupon,
  type Engineer,
  type Service,
  TAX_RATE,
} from '../types';

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function priceCoupon(subtotal: number, coupon?: Coupon | null): number {
  if (!coupon) return 0;
  const raw = coupon.type === 'percent' ? (subtotal * coupon.value) / 100 : coupon.value;
  return Math.min(round2(raw), subtotal);
}

export function quote(subtotal: number, coupon?: Coupon | null) {
  const discount = priceCoupon(subtotal, coupon);
  const taxable = round2(subtotal - discount);
  const tax = round2(taxable * TAX_RATE);
  return { subtotal, discount, tax, total: round2(taxable + tax) };
}

function otp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}
function id() {
  return `bk_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

interface BookingState {
  bookings: Booking[];
  get: (id: string) => Booking | undefined;
  /** Confirm a standard booking — NO payment taken (prototype/§6). */
  createStandard: (input: {
    service: Service;
    addons: Addon[];
    address: string;
    scheduledAt?: string;
    coupon?: Coupon | null;
  }) => string;
  createCustom: (input: { categoryName: string; description: string; address: string }) => string;
  /** Customer taps "Engineer finished" → job is ready to pay (proof attached). */
  markAwaitingPayment: (id: string) => void;
  /** Pay → reveal the completion OTP (the gate, §6). */
  pay: (id: string, _method: string) => string | undefined;
  changeEngineer: (id: string, engineer: Engineer) => void;
  reschedule: (id: string, scheduledAt: string) => void;
  rate: (id: string) => void;
  cancel: (id: string) => void;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings: [],

  get: (bid) => get().bookings.find((b) => b.id === bid),

  createStandard: ({ service, addons, address, scheduledAt, coupon }) => {
    const subtotal = service.price + addons.reduce((s, a) => s + a.price, 0);
    const q = quote(subtotal, coupon);
    const bid = id();
    const booking: Booking = {
      id: bid,
      type: 'standard',
      serviceId: service.id,
      serviceName: service.name,
      address,
      scheduledAt,
      status: 'confirmed',
      ...q,
      couponCode: coupon?.code,
      paid: false,
      proof: [],
      createdAt: Date.now(),
    };
    set((s) => ({ bookings: [booking, ...s.bookings] }));

    // Simulate auto-dispatch: an engineer accepts shortly after booking.
    setTimeout(() => {
      const engineer = mockEngineers[0];
      set((s) => ({
        bookings: s.bookings.map((b) =>
          b.id === bid ? { ...b, status: 'en_route', engineer, startOtp: otp() } : b,
        ),
      }));
    }, 1500);
    return bid;
  },

  createCustom: ({ categoryName, description, address }) => {
    const bid = id();
    const booking: Booking = {
      id: bid,
      type: 'custom',
      serviceName: `Custom: ${categoryName}`,
      address,
      status: 'quote',
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0,
      paid: false,
      proof: [description],
      createdAt: Date.now(),
    };
    set((s) => ({ bookings: [booking, ...s.bookings] }));
    return bid;
  },

  markAwaitingPayment: (bid) =>
    set((s) => ({
      bookings: s.bookings.map((b) =>
        b.id === bid
          ? {
              ...b,
              status: 'awaiting_payment',
              proof: ['proof-1.jpg', 'proof-2.jpg'],
            }
          : b,
      ),
    })),

  pay: (bid, _method) => {
    const code = otp();
    set((s) => ({
      bookings: s.bookings.map((b) =>
        b.id === bid ? { ...b, paid: true, completionOtp: code, status: 'completed' } : b,
      ),
    }));
    return code;
  },

  changeEngineer: (bid, engineer) =>
    set((s) => ({
      bookings: s.bookings.map((b) => (b.id === bid ? { ...b, engineer } : b)),
    })),

  reschedule: (bid, scheduledAt) =>
    set((s) => ({
      bookings: s.bookings.map((b) =>
        b.id === bid ? { ...b, scheduledAt, status: 'confirmed' } : b,
      ),
    })),

  rate: (bid) =>
    set((s) => ({
      bookings: s.bookings.map((b) => (b.id === bid ? { ...b, status: 'completed' } : b)),
    })),

  cancel: (bid) =>
    set((s) => ({
      bookings: s.bookings.map((b) => (b.id === bid ? { ...b, status: 'cancelled' } : b)),
    })),
}));
