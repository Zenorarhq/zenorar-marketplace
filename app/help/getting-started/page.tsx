import HelpArticlePage from '@/components/help/HelpArticlePage'

export const metadata = {
  title: 'Getting Started | Zenorar Help Center',
  description: 'Learn how to create your account, browse products, make your first purchase, and access your downloads on Zenorar Marketplace.',
}

const sections = [
  {
    title: 'Creating Your Account',
    steps: [
      {
        title: 'Visit the sign-up page',
        content: 'Go to zenorar.com and click "Sign Up" in the top-right corner. You can register with your email address or continue with Google for a faster setup.',
      },
      {
        title: 'Enter your details',
        content: 'Provide your full name, a valid email address, and a strong password (at least 8 characters, with a mix of letters and numbers). Your email will be used for order confirmations and downloads.',
      },
      {
        title: 'Verify your email',
        content: 'Check your inbox for a verification email from Zenorar. Click the link inside to activate your account. If you don\'t see it within 5 minutes, check your spam/junk folder.',
      },
      {
        title: 'Complete your profile',
        content: 'Once logged in, head to Account Settings to add a profile picture, your country, and preferred currency. This helps personalise your shopping experience and ensures accurate pricing.',
      },
    ],
  },
  {
    title: 'Browsing & Buying Products',
    steps: [
      {
        title: 'Explore the marketplace',
        content: 'Use the top navigation to browse by category — Scripts & Tools, eSIM, Virtual Numbers, and more. You can also use the search bar to find a specific product by name or keyword.',
      },
      {
        title: 'Review product details',
        content: 'Each product page includes a full description, screenshots, compatibility notes, licensing terms, and buyer reviews. Read these carefully before purchasing to ensure the product fits your needs.',
      },
      {
        title: 'Select your license type',
        content: 'Most scripts offer a Standard License (for personal or single-project use) and an Extended License (for commercial or multi-project use). Choose the one that matches your intended use.',
      },
      {
        title: 'Add to cart and checkout',
        content: 'Click "Add to Cart" or "Buy Now". At checkout, review your order summary, apply any promo codes, and select your payment method. We accept cards, crypto, and more.',
      },
    ],
  },
  {
    title: 'Accessing Your Downloads',
    steps: [
      {
        title: 'Check your order confirmation',
        content: 'After payment is confirmed, you\'ll receive an order confirmation email with download instructions. For crypto payments, please allow 10–30 minutes for blockchain confirmation.',
      },
      {
        title: 'Go to your Dashboard',
        content: 'Log in and navigate to Account > My Orders or the Downloads section. Every product you\'ve purchased will appear here with a download button.',
      },
      {
        title: 'Download your files',
        content: 'Click the download button next to your product. Files are typically delivered as a .zip archive. Unzip the folder to access your scripts, documentation, and any included assets.',
      },
      {
        title: 'Access future updates',
        content: 'If a product receives an update, you\'ll be notified by email and the new version will appear in your Downloads section. Updates are free for 6 months from your purchase date.',
      },
    ],
  },
  {
    title: 'Getting Support',
    steps: [
      {
        title: 'Check the Help Center first',
        content: 'Most common questions are answered in our Help Center articles. Use the search bar or browse categories to find answers quickly without waiting for a response.',
      },
      {
        title: 'Contact the product seller',
        content: 'For technical questions specific to a product, use the "Contact Seller" button on the product page. Sellers typically respond within 24–48 hours.',
      },
      {
        title: 'Submit a support ticket',
        content: 'For billing, account, or platform issues, submit a ticket via our Contact page. Include your order number and a clear description of the issue for a faster resolution.',
      },
    ],
  },
]

const faqs = [
  {
    question: 'I signed up but didn\'t receive a verification email. What do I do?',
    answer: 'First, check your spam or junk folder — verification emails sometimes end up there. If it\'s not there, wait 5 minutes and try requesting a new verification email from the login page. If the problem persists, contact our support team with the email address you used to register.',
  },
  {
    question: 'Can I browse products without creating an account?',
    answer: 'Yes — you can browse all products and view their details without signing in. However, you\'ll need an account to make a purchase, access your downloads, and save items to your wishlist.',
  },
  {
    question: 'How do I make my first purchase?',
    answer: 'Find the product you want, select your license type, and click "Add to Cart" or "Buy Now". At checkout, enter your payment details and confirm your order. You\'ll receive an email confirmation immediately after.',
  },
  {
    question: 'My download isn\'t showing in my account. What should I do?',
    answer: 'Ensure you\'re logged into the same account you used during checkout. If you paid with cryptocurrency, allow up to 30 minutes for blockchain confirmation. If the download still doesn\'t appear after an hour, contact support with your order reference number.',
  },
  {
    question: 'Can I use the same account on multiple devices?',
    answer: 'Yes, your Zenorar account works across all your devices. Simply log in with your email and password from any browser. Your orders, downloads, and wishlist will all be synced.',
  },
  {
    question: 'What should I do if I forget my password?',
    answer: 'Click "Forgot Password" on the login page and enter your registered email address. You\'ll receive a password reset link within a few minutes. If you don\'t see it, check your spam folder.',
  },
  {
    question: 'Is my personal information secure?',
    answer: 'Yes. Zenorar uses industry-standard SSL encryption to protect all data transmitted on our platform. We never store your full payment card details — all transactions are processed through PCI-compliant payment gateways.',
  },
]

export default function GettingStartedPage() {
  return (
    <HelpArticlePage
      title="Getting Started"
      icon="rocket"
      description="New to Zenorar? This guide walks you through everything — from creating your account to making your first purchase and accessing your downloads."
      sections={sections}
      faqs={faqs}
    />
  )
}
