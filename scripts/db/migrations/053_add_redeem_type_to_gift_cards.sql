-- Migration 053: Add redeem_type to gift_cards
-- Stores where a gift card can be redeemed: online, instore, or both.
-- Populated automatically during provider sync; admin can override per card.

ALTER TABLE gift_cards
  ADD COLUMN IF NOT EXISTS redeem_type VARCHAR(10)
    CHECK (redeem_type IN ('online', 'instore', 'both'))
    DEFAULT NULL;