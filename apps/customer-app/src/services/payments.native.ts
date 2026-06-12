import RazorpayCheckout from 'react-native-razorpay';

import type { PayInput, PayResult } from './payments';

/**
 * Native Razorpay checkout (B6). The key id + order id come from the backend
 * (never hardcoded); the SDK handles card entry — raw card data never touches
 * our app or servers. Capture is finalised server-side via the webhook.
 */
export async function openCheckout(input: PayInput): Promise<PayResult> {
  try {
    const data = await RazorpayCheckout.open({
      key: input.razorpayKeyId ?? '',
      amount: Math.round(input.amount * 100),
      currency: 'INR',
      name: 'Servora',
      description: `Booking ${input.bookingId}`,
      order_id: input.orderId,
      prefill: input.customerEmail ? { email: input.customerEmail } : undefined,
      theme: { color: '#4338CA' },
    });
    return { success: true, paymentId: data.razorpay_payment_id };
  } catch {
    return { success: false };
  }
}
