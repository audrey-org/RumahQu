ALTER TABLE inventory_items
  DROP CONSTRAINT IF EXISTS inventory_items_quantity_check;

ALTER TABLE inventory_items
  ADD CONSTRAINT inventory_items_quantity_check CHECK (quantity >= 0);

ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER CHECK (low_stock_threshold >= 0),
  ADD COLUMN IF NOT EXISTS restock_target_quantity INTEGER CHECK (restock_target_quantity >= 0);

ALTER TABLE inventory_items
  DROP CONSTRAINT IF EXISTS inventory_items_restock_target_check;

ALTER TABLE inventory_items
  ADD CONSTRAINT inventory_items_restock_target_check
  CHECK (
    low_stock_threshold IS NULL
    OR restock_target_quantity IS NULL
    OR restock_target_quantity > low_stock_threshold
  );

CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  adjusted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('add', 'use', 'set')),
  delta INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL CHECK (quantity_before >= 0),
  quantity_after INTEGER NOT NULL CHECK (quantity_after >= 0),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_item_id ON inventory_adjustments(item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_group_id ON inventory_adjustments(group_id);
