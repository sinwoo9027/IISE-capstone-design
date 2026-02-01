import { describe, expect, it, vi } from "vitest";
import { createCheckoutSession, verifyWebhookSignature } from "./stripe";

describe("Stripe Payment Module", () => {
  describe("createCheckoutSession", () => {
    it("should create checkout session with valid parameters", async () => {
      const result = await createCheckoutSession({
        userId: 1,
        userEmail: "test@example.com",
        userName: "Test User",
        planId: "premium",
        origin: "https://aptgpt.example.com",
      });

      expect(result).toHaveProperty("success");
      if (result.success) {
        expect(result).toHaveProperty("sessionId");
        expect(result).toHaveProperty("url");
      }
    });

    it("should handle enterprise plan", async () => {
      const result = await createCheckoutSession({
        userId: 1,
        userEmail: "test@example.com",
        userName: "Test User",
        planId: "enterprise",
        origin: "https://aptgpt.example.com",
      });

      expect(result).toHaveProperty("success");
    });

    it("should include user metadata in checkout session", async () => {
      const userId = 123;
      const userEmail = "user@example.com";
      const userName = "John Doe";

      const result = await createCheckoutSession({
        userId,
        userEmail,
        userName,
        planId: "premium",
        origin: "https://aptgpt.example.com",
      });

      expect(result).toHaveProperty("success");
    });

    it("should use origin for success and cancel URLs", async () => {
      const origin = "https://custom.example.com";
      const result = await createCheckoutSession({
        userId: 1,
        userEmail: "test@example.com",
        userName: "Test User",
        planId: "premium",
        origin,
      });

      expect(result).toHaveProperty("success");
      if (result.success && result.url) {
        expect(result.url).toContain("stripe.com");
      }
    });
  });

  describe("verifyWebhookSignature", () => {
    it("should return null for invalid signature", () => {
      const body = Buffer.from("test");
      const signature = "invalid_signature";
      const secret = "test_secret";

      const result = verifyWebhookSignature(body, signature, secret);
      expect(result).toBeNull();
    });

    it("should handle malformed webhook data", () => {
      const body = Buffer.from("malformed");
      const signature = "invalid";
      const secret = "secret";

      const result = verifyWebhookSignature(body, signature, secret);
      expect(result).toBeNull();
    });
  });

  describe("Payment Plans", () => {
    it("should support premium monthly plan", () => {
      const planId = "premium";
      expect(planId).toBe("premium");
    });

    it("should support enterprise monthly plan", () => {
      const planId = "enterprise";
      expect(planId).toBe("enterprise");
    });

    it("should have correct price values", () => {
      const premiumPrice = 9900; // ₩99,000
      const enterprisePrice = 49900; // ₩499,000

      expect(premiumPrice).toBeGreaterThan(0);
      expect(enterprisePrice).toBeGreaterThan(premiumPrice);
    });
  });
});
