import HelpArticlePage from '@/components/help/HelpArticlePage'

export const metadata = {
  title: 'Payments | Zenorar Help Center',
  description: 'Understand payment methods, crypto transactions, refund policies, and how to access your invoices and receipts on Zenorar Marketplace.',
}

const sections = [
  {
    title: 'Accepted Payment Methods',
    steps: [
      {
        title: 'Credit and debit cards',
        content: 'We accept Visa, Mastercard, and American Express via our secure Stripe payment gateway. Your card details are encrypted and never stored on our servers. Card payments are processed instantly.',
      },
      {
        title: 'Cryptocurrency',
        content: 'We accept Bitcoin (BTC), Ethereum (ETH), USDT (TRC-20 and ERC-20), Binance Coin (BNB), and Solana (SOL). Crypto payments offer enhanced privacy and are particularly useful for users without access to traditional banking.',
      },
      {
        title: 'Paystack (for African users)',
        content: 'Users in Nigeria, Ghana, Kenya, and South Africa can pay via Paystack, which supports local bank transfers, cards, and mobile money. Select your local currency at checkout for accurate pricing.',
      },
      {
        title: 'Promo codes and discounts',
        content: 'If you have a promo code, enter it in the Promo Code field at checkout before completing payment. Codes cannot be applied after an order is placed. Each code has specific terms — check the promotion details for expiry dates and eligible products.',
      },
    ],
  },
  {
    title: 'How Crypto Payments Work',
    steps: [
      {
        title: 'Select a cryptocurrency at checkout',
        content: 'At checkout, choose your preferred cryptocurrency. The equivalent amount in that currency will be calculated based on the current live exchange rate at the time of the transaction.',
      },
      {
        title: 'Send payment to the provided address',
        content: 'A unique wallet address and QR code are displayed. Send the exact amount shown to that address within 30 minutes — the rate is locked for this window. Sending from a centralised exchange (Binance, Coinbase, etc.) is fine.',
      },
      {
        title: 'Wait for blockchain confirmation',
        content: 'Your order is pending until the transaction receives the required number of network confirmations. For BTC this is typically 1–3 confirmations (10–30 minutes). For ETH, USDT, and others it\'s usually faster. Your dashboard will update automatically.',
      },
      {
        title: 'Order confirmed — access your downloads',
        content: 'Once confirmed, your order status changes to "Completed" and your downloads or eSIM QR codes become available in Account > My Orders. A confirmation email is also sent to your registered address.',
      },
    ],
  },
  {
    title: 'Refund Policy',
    steps: [
      {
        title: 'Eligibility for refunds',
        content: 'Refunds are available within 7 days of purchase if the product is technically defective — meaning it does not function as described in the product listing — and our support team is unable to resolve the issue.',
      },
      {
        title: 'How to request a refund',
        content: 'Submit a support ticket via the Contact page with your order number, a description of the issue, and any relevant error messages or screenshots. Our team will review your request within 2 business days.',
      },
      {
        title: 'Refund method',
        content: 'Approved refunds are returned via the original payment method. Card refunds typically take 5–10 business days to appear. Crypto refunds are processed to the originating wallet address within 48 hours of approval.',
      },
      {
        title: 'Non-refundable situations',
        content: 'Refunds are not issued for: change of mind, incompatibility due to the buyer\'s environment not meeting stated requirements, incorrect configuration, or if more than 7 days have passed since purchase. eSIM plans that have been activated are non-refundable once used.',
      },
    ],
  },
  {
    title: 'Invoices & Receipts',
    steps: [
      {
        title: 'Finding your invoice',
        content: 'Go to Account > My Orders and click on any order to view its details. A downloadable PDF invoice is available for each completed order, showing the product, price, taxes (if applicable), and your billing details.',
      },
      {
        title: 'Receiving receipts by email',
        content: 'An order confirmation email with a receipt summary is sent automatically after each successful payment. Check your inbox (and spam folder) for emails from Zenorar. If you didn\'t receive one, contact support with your order number.',
      },
      {
        title: 'VAT and tax information',
        content: 'Prices shown are exclusive of VAT where applicable. Your invoice will reflect any applicable taxes based on your registered country. If you require a VAT invoice with your company\'s tax number, contact support after placing your order.',
      },
    ],
  },
]

const faqs = [
  {
    question: 'My payment failed. What should I do?',
    answer: 'If a card payment fails, first check that your card details are entered correctly, including the billing address and CVV. Ensure your card has sufficient funds and isn\'t blocked for international or online transactions — some banks block online payments by default. If the problem persists, try a different card or switch to a cryptocurrency payment. Contact your bank if you continue to have issues.',
  },
  {
    question: 'My crypto payment is stuck as pending. How long should I wait?',
    answer: 'Bitcoin transactions can take 10–60 minutes depending on network congestion and the fee used. Ethereum, USDT, and most other coins confirm within 1–10 minutes. If your transaction has been pending for more than 2 hours, contact support with your transaction hash (TXID) and order number — we can manually verify the payment.',
  },
  {
    question: 'Can I get a refund on a crypto payment?',
    answer: 'Yes. Approved refunds for crypto payments are returned to the originating wallet address. Due to the irreversible nature of blockchain transactions, we cannot reverse a payment to a different address. The refund is processed in the same cryptocurrency at the current exchange rate at the time of the refund.',
  },
  {
    question: 'How long does a refund take to process?',
    answer: 'Card refunds are approved within 2 business days and typically appear on your statement within 5–10 business days, depending on your bank. Crypto refunds are sent within 48 hours of approval. If your refund hasn\'t arrived after 14 business days, contact your bank or payment provider with the reference number we provided.',
  },
  {
    question: 'Can I change my currency at checkout?',
    answer: 'Yes. Set your preferred currency in Account Settings > Preferences before checkout. Prices are displayed in your chosen currency using live exchange rates. Note that the final charge amount depends on your payment provider\'s exchange rate at the time of the transaction.',
  },
  {
    question: 'Do you offer discounts for bulk purchases?',
    answer: 'We periodically offer bulk discount codes and seasonal promotions. Follow us or check the Promo Banner on the homepage for current offers. If you\'re a business looking to purchase multiple licenses, contact our support team to discuss custom pricing arrangements.',
  },
  {
    question: 'Is my payment information secure?',
    answer: 'Yes. All card payments are processed through Stripe, which is PCI DSS Level 1 certified — the highest level of payment security certification. We never store your full card number or CVV on our servers. Crypto payments are processed directly on-chain with no custodial storage of your funds.',
  },
]

export default function PaymentsPage() {
  return (
    <HelpArticlePage
      title="Payments"
      icon="wallet"
      description="Everything about paying on Zenorar — accepted methods, how crypto works, our refund policy, and how to access your invoices."
      sections={sections}
      faqs={faqs}
    />
  )
}
