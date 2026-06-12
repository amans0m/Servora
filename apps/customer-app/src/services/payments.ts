export interface PayInput {
  amount: number;
  bookingId: string;
  orderId?: string;
  razorpayKeyId?: string; // supplied by the backend — never hardcoded (B1)
  customerEmail?: string;
}
export interface PayResult {
  success: boolean;
  paymentId?: string;
}

/**
 * Default (Expo Web / dev) payment. Native devices load `payments.native.ts`
 * which opens the official Razorpay checkout (B6 — the app never collects or
 * stores raw card data). Here we resolve success so the flow proceeds; the
 * real capture always happens server-side.
 */
export async function openCheckout(input: PayInput): Promise<PayResult> {
  await new Promise((r) => setTimeout(r, 600));
  return { success: true, paymentId: `web_${input.bookingId}` };
}
