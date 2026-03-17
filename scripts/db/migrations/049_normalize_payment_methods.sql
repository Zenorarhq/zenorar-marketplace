-- Normalize paymentMethod values on orders table
-- Fix: different code paths stored different strings for the same gateway

-- Stripe variants → STRIPE
UPDATE orders SET "paymentMethod" = 'STRIPE' WHERE "paymentMethod" IN ('stripe', 'Card Stripe', 'card_stripe');

-- Paystack variants → PAYSTACK
UPDATE orders SET "paymentMethod" = 'PAYSTACK' WHERE "paymentMethod" IN ('paystack', 'Card Paystack', 'card_paystack');

-- Wallet variants → WALLET
UPDATE orders SET "paymentMethod" = 'WALLET' WHERE "paymentMethod" IN ('wallet_credits', 'wallet', 'Wallet Credits', 'Wallet');

-- Delete E2E test order
DELETE FROM order_items WHERE "orderId" IN (SELECT id FROM orders WHERE LOWER("paymentMethod") = 'test');
DELETE FROM orders WHERE LOWER("paymentMethod") = 'test';