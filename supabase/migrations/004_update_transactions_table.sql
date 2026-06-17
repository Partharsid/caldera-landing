-- Alter transactions table to add missing columns
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(255);

-- Update the payment_method constraint to allow 'razorpay'
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_payment_method_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_payment_method_check CHECK (payment_method IN ('cash', 'upi', 'razorpay'));
