-- Migration 028: Fix existing deposits with payment_method = 'STRIPE'
-- Prisma DepositMethod enum does not have 'STRIPE', only 'CARD'.
-- This updates all existing rows to use the correct enum value.
-- Cast to text to bypass Prisma enum validation for comparison
UPDATE deposits SET payment_method = 'CARD' WHERE payment_method::text = 'STRIPE';
