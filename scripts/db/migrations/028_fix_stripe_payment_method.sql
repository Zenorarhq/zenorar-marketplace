-- Migration 028: Fix existing deposits with payment_method = 'STRIPE'
-- Prisma DepositMethod enum does not have 'STRIPE', only 'CARD'.
-- This updates all existing rows to use the correct enum value.
UPDATE deposits SET payment_method = 'CARD' WHERE payment_method = 'STRIPE';
