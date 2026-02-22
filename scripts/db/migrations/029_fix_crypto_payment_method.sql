-- Fix deposits with invalid 'CRYPTO' payment_method to match Prisma enum values
UPDATE deposits SET payment_method = 'CRYPTO_BTC' WHERE payment_method = 'CRYPTO' AND crypto_network = 'BTC';
UPDATE deposits SET payment_method = 'CRYPTO_ETH' WHERE payment_method = 'CRYPTO' AND crypto_network = 'ETH';
UPDATE deposits SET payment_method = 'CRYPTO_USDT' WHERE payment_method = 'CRYPTO' AND crypto_network IS NOT NULL;
UPDATE deposits SET payment_method = 'CRYPTO_USDT' WHERE payment_method = 'CRYPTO';
