import HelpArticlePage from '@/components/help/HelpArticlePage'

export const metadata = {
  title: 'Selling on Marketplace | Zenorar Help Center',
  description: 'Learn how to become a verified seller on Zenorar, list your products, manage orders, and withdraw your earnings.',
}

const sections = [
  {
    title: 'Becoming a Verified Seller',
    steps: [
      {
        title: 'Apply for a seller account',
        content: 'To start selling on Zenorar, submit a seller application via Account > Become a Seller. Provide details about the type of products you plan to sell, your background, and links to any previous work or portfolio. Applications are reviewed within 3–5 business days.',
      },
      {
        title: 'Verification process',
        content: 'We verify each seller to maintain quality and trust on the platform. Verification may include ID confirmation, a review of your submitted products, and a quality check. You\'ll be notified by email once your application is approved or if more information is needed.',
      },
      {
        title: 'Set up your seller profile',
        content: 'Once approved, complete your seller profile with a display name, bio, profile picture, and contact preferences. A strong profile builds buyer confidence — sellers with complete profiles and verified badges receive significantly more views and sales.',
      },
      {
        title: 'Agree to seller terms',
        content: 'Before listing products, review and accept the Seller Agreement. This covers your responsibilities regarding product quality, intellectual property, customer support obligations, and the platform\'s commission structure.',
      },
    ],
  },
  {
    title: 'Listing Your First Product',
    steps: [
      {
        title: 'Go to Seller Dashboard > Add Product',
        content: 'From your Seller Dashboard, click "Add New Product". You\'ll be taken through a step-by-step listing form covering all the details buyers need to make an informed decision.',
      },
      {
        title: 'Write a detailed title and description',
        content: 'Your title should be clear and specific — include the main use case and technology (e.g., "Python Web Scraper — Multi-threaded with Proxy Support"). Your description should explain what the product does, what problems it solves, and who it\'s for. Use clear, professional language.',
      },
      {
        title: 'Upload product files and documentation',
        content: 'Upload your script or tool as a compressed .zip file. Include a comprehensive README with installation steps, configuration instructions, and examples. Buyers evaluate products heavily based on documentation quality — thorough docs lead to better reviews and fewer support requests.',
      },
      {
        title: 'Set pricing and license types',
        content: 'Set your Standard and Extended License prices. Consider the market — browse similar products to gauge fair pricing. Underpricing can undervalue your work; overpricing without clear justification can reduce conversions. You can always adjust pricing later.',
      },
      {
        title: 'Add screenshots and a demo (optional but recommended)',
        content: 'Products with screenshots or video demos convert at significantly higher rates. Show the script running, show the output, or demonstrate the user interface. Buyers want to see what they\'re getting before purchasing.',
      },
    ],
  },
  {
    title: 'Understanding Commission & Earnings',
    steps: [
      {
        title: 'How the commission structure works',
        content: 'Zenorar takes a platform commission from each sale to cover hosting, payment processing, and platform development. Your net earnings after commission are displayed on each product in your Seller Dashboard. The exact commission rate is shown in your Seller Agreement.',
      },
      {
        title: 'Tracking your sales and revenue',
        content: 'Your Seller Dashboard shows real-time statistics including total sales, revenue earned, pending payouts, and individual transaction details. You can filter by product, date range, or status to analyse your performance.',
      },
      {
        title: 'Earnings from license types',
        content: 'You earn different amounts based on the license type purchased. Extended License purchases typically generate higher revenue per sale. Consider offering both license types to maximise earning potential across buyer types.',
      },
    ],
  },
  {
    title: 'Withdrawing Your Earnings',
    steps: [
      {
        title: 'Minimum payout threshold',
        content: 'Withdrawals are available once your balance reaches the minimum payout threshold (shown in your Seller Dashboard). This threshold exists to minimise transaction fees on small amounts.',
      },
      {
        title: 'Choose your payout method',
        content: 'Go to Seller Dashboard > Withdraw and select your preferred payout method. Options include bank transfer, cryptocurrency (BTC, ETH, USDT), and other regional methods depending on your location. Set up your preferred payout method in advance to avoid delays.',
      },
      {
        title: 'Processing times',
        content: 'Cryptocurrency withdrawals are processed within 24–48 hours. Bank transfers typically take 3–7 business days depending on your bank and location. International transfers may take longer. You\'ll receive an email confirmation when your withdrawal is initiated.',
      },
      {
        title: 'Tax responsibilities',
        content: 'Sellers are responsible for declaring and paying applicable taxes on earnings in their jurisdiction. Zenorar provides transaction records and payout summaries in your Seller Dashboard to assist with tax reporting. Consult a tax professional if you are unsure of your obligations.',
      },
    ],
  },
  {
    title: 'Seller Best Practices',
    steps: [
      {
        title: 'Respond to buyer messages promptly',
        content: 'Quick response times build trust and lead to better reviews. Aim to respond to all buyer messages within 24 hours. Sellers with response rates above 90% are featured more prominently in search results.',
      },
      {
        title: 'Keep your products updated',
        content: 'Regularly update your scripts to stay compatible with new OS versions, language runtimes, or API changes. Buyers appreciate active maintenance. Use the update feature in your Seller Dashboard to push new versions — buyers with active update periods are notified automatically.',
      },
      {
        title: 'Actively request reviews',
        content: 'After a successful purchase, politely ask buyers to leave a review if they\'re happy with the product. Positive reviews significantly increase your conversion rate and product visibility on the marketplace.',
      },
      {
        title: 'Handle disputes professionally',
        content: 'If a buyer requests a refund or raises a complaint, engage professionally and constructively. Offer troubleshooting assistance before a refund is issued — most issues can be resolved. Escalating disputes or responding aggressively can result in account penalties.',
      },
    ],
  },
]

const faqs = [
  {
    question: 'How long does seller approval take?',
    answer: 'Seller applications are reviewed within 3–5 business days. During busy periods it may take slightly longer. You\'ll receive an email update regardless of the outcome. If your application is declined, we\'ll explain why and you can reapply after addressing the issues raised.',
  },
  {
    question: 'What types of products can I sell on Zenorar?',
    answer: 'You can sell automation scripts, web tools, browser extensions, API integrations, bots, system utilities, eSIM plans, virtual number services, and other digital tools. Products must be original work (or properly licensed for resale), functional as described, and not violate our content policies. We do not accept malicious software, cracked tools, or content that violates third-party terms of service.',
  },
  {
    question: 'What is Zenorar\'s commission rate?',
    answer: 'Our commission rate is outlined in your Seller Agreement. The rate is competitive with similar digital marketplaces and covers payment processing fees, hosting, platform support, and marketing. As your sales volume grows, you may qualify for reduced commission rates — contact us to discuss volume pricing.',
  },
  {
    question: 'When do I get paid?',
    answer: 'Earnings are available for withdrawal once they clear a 7-day holding period after each sale. This period protects against payment disputes and chargebacks. Once cleared, funds appear in your available balance and can be withdrawn at any time above the minimum threshold.',
  },
  {
    question: 'Can I set my own prices?',
    answer: 'Yes — you have full control over your pricing. We recommend researching comparable products on the marketplace to set competitive prices. You can change prices at any time from your Seller Dashboard. Price changes do not affect orders already completed.',
  },
  {
    question: 'What happens if a buyer requests a refund on my product?',
    answer: 'If a refund is requested, our support team will review the case and may reach out to you for your input. If the product is found to be defective and you cannot resolve the issue, the refund is approved and charged against your earnings balance. Sellers with high refund rates may be subject to account review.',
  },
  {
    question: 'Can I offer my products at a discount or run promotions?',
    answer: 'Yes. Contact our support team to set up a discount code for your products, or reach out to discuss featured placement during sale events. Running promotions is one of the most effective ways to boost initial sales and reviews when launching a new product.',
  },
]

export default function SellingPage() {
  return (
    <HelpArticlePage
      title="Selling on Marketplace"
      icon="store"
      description="Everything developers and digital creators need to know to list products, grow their sales, and withdraw earnings on Zenorar Marketplace."
      sections={sections}
      faqs={faqs}
    />
  )
}
