-- Add is_test_order column to track test orders
ALTER TABLE public.orders ADD COLUMN is_test_order boolean NOT NULL DEFAULT false;

-- Add index for filtering test orders
CREATE INDEX idx_orders_is_test_order ON public.orders(is_test_order);