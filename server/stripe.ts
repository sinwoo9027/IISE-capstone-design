/**
 * Stripe 결제 처리 모듈
 */

import Stripe from "stripe";
import { STRIPE_PRICE_IDS } from "./products";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia",
});

/**
 * Checkout 세션 생성
 */
export async function createCheckoutSession(params: {
  userId: number;
  userEmail: string;
  userName: string;
  planId: "premium" | "enterprise";
  origin: string;
}) {
  try {
    const priceId =
      params.planId === "premium"
        ? STRIPE_PRICE_IDS.PREMIUM_MONTHLY
        : STRIPE_PRICE_IDS.ENTERPRISE_MONTHLY;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      customer_email: params.userEmail,
      client_reference_id: params.userId.toString(),
      metadata: {
        user_id: params.userId.toString(),
        customer_email: params.userEmail,
        customer_name: params.userName,
        plan: params.planId,
      },
      success_url: `${params.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${params.origin}/pricing`,
      allow_promotion_codes: true,
    });

    return {
      success: true,
      sessionId: session.id,
      url: session.url,
    };
  } catch (error) {
    console.error("[Stripe] Error creating checkout session:", error);
    return {
      success: false,
      error: "결제 세션 생성에 실패했습니다.",
    };
  }
}

/**
 * 구독 취소
 */
export async function cancelSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId);
    return {
      success: true,
      subscription,
    };
  } catch (error) {
    console.error("[Stripe] Error canceling subscription:", error);
    return {
      success: false,
      error: "구독 취소에 실패했습니다.",
    };
  }
}

/**
 * 구독 정보 조회
 */
export async function getSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return {
      success: true,
      subscription,
    };
  } catch (error) {
    console.error("[Stripe] Error retrieving subscription:", error);
    return {
      success: false,
      error: "구독 정보를 조회할 수 없습니다.",
    };
  }
}

/**
 * 고객 정보 조회
 */
export async function getCustomer(customerId: string) {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    return {
      success: true,
      customer,
    };
  } catch (error) {
    console.error("[Stripe] Error retrieving customer:", error);
    return {
      success: false,
      error: "고객 정보를 조회할 수 없습니다.",
    };
  }
}

/**
 * 결제 의도 조회
 */
export async function getPaymentIntent(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return {
      success: true,
      paymentIntent,
    };
  } catch (error) {
    console.error("[Stripe] Error retrieving payment intent:", error);
    return {
      success: false,
      error: "결제 정보를 조회할 수 없습니다.",
    };
  }
}

/**
 * Webhook 이벤트 검증
 */
export function verifyWebhookSignature(
  body: Buffer,
  signature: string,
  secret: string
): Stripe.Event | null {
  try {
    const event = stripe.webhooks.constructEvent(body, signature, secret);
    return event;
  } catch (error) {
    console.error("[Stripe] Webhook signature verification failed:", error);
    return null;
  }
}

export { stripe };
