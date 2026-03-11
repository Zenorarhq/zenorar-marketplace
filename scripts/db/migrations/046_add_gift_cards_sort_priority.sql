-- Add sort_priority column to gift_cards for manual popularity ordering
-- Lower numbers appear first (1 = most popular), NULL values sort last

ALTER TABLE gift_cards ADD COLUMN IF NOT EXISTS sort_priority INTEGER DEFAULT NULL;

-- Create index for efficient sorting
CREATE INDEX IF NOT EXISTS idx_gift_cards_sort_priority ON gift_cards(sort_priority) WHERE sort_priority IS NOT NULL;

COMMENT ON COLUMN gift_cards.sort_priority IS 'Manual sort order for popularity (lower = higher priority). NULL values sort after numbered items.';
