import HelpArticlePage from '@/components/help/HelpArticlePage'

export const metadata = {
  title: 'eSIM & Connectivity | Zenorar Help Center',
  description: 'Activate your eSIM, configure APN settings, troubleshoot data connectivity, and get the most from your Zenorar eSIM plan.',
}

const sections = [
  {
    title: 'What is an eSIM?',
    steps: [
      {
        title: 'eSIM vs physical SIM',
        content: 'An eSIM (embedded SIM) is a digital SIM card built directly into your device. Unlike a physical SIM, it doesn\'t require a card slot — you activate it by scanning a QR code. It works exactly like a regular SIM for calls, texts, and data.',
      },
      {
        title: 'Benefits of using an eSIM',
        content: 'eSIMs are ideal for international travel because you can switch carriers without physically swapping cards. You can keep your existing SIM active while adding a local data plan — perfect for avoiding expensive roaming charges.',
      },
      {
        title: 'How Zenorar eSIMs work',
        content: 'When you purchase an eSIM plan, you receive a QR code via email and in your account dashboard. Scan the QR code from your device settings to install the plan. Data is available immediately once the eSIM is activated.',
      },
    ],
  },
  {
    title: 'Checking Device Compatibility',
    steps: [
      {
        title: 'Verify your device supports eSIM',
        content: 'eSIM is supported on iPhone XS and later, most Google Pixel phones (3 and later), Samsung Galaxy S20 and later, and many other flagship Android devices. Check your device manufacturer\'s website or settings to confirm eSIM support.',
      },
      {
        title: 'Check that your device is unlocked',
        content: 'Your phone must be unlocked (not tied to a specific carrier) to use a third-party eSIM. Contact your carrier to check or request an unlock if needed. Devices purchased directly from manufacturers (not from carriers) are usually unlocked by default.',
      },
      {
        title: 'Check for remaining eSIM slots',
        content: 'Most devices support 1–2 active eSIMs at a time, with storage for up to 5–20 eSIM profiles. To check your remaining slots: on iPhone, go to Settings > Cellular; on Android, go to Settings > Network & Internet > SIMs.',
      },
      {
        title: 'Ensure your region supports the plan',
        content: 'Each eSIM plan covers specific countries or regions. Check the coverage map on the product page before purchasing to ensure your destination is included. Some plans are global, others are regional or country-specific.',
      },
    ],
  },
  {
    title: 'Activating Your eSIM via QR Code',
    steps: [
      {
        title: 'Find your QR code',
        content: 'After purchase, your eSIM QR code is sent to your registered email and also available in Account > My Orders. Do not scan the QR code until you\'re ready to activate — each code can only be used once.',
      },
      {
        title: 'On iPhone: add the eSIM',
        content: 'Go to Settings > Cellular > Add eSIM (or Add Cellular Plan on older iOS versions). Select "Use QR Code" and point your camera at the QR code. Follow the on-screen prompts to install and label your plan.',
      },
      {
        title: 'On Android: add the eSIM',
        content: 'Go to Settings > Network & Internet > SIMs > Add SIM. Select "Scan a QR code" and scan your Zenorar QR code. The exact menu path varies by device manufacturer — refer to your device manual if you can\'t find it.',
      },
      {
        title: 'Set the eSIM as your data line',
        content: 'After installation, go back to your SIM settings and set the new eSIM as your preferred data line. You can keep your existing SIM for calls and texts while using the Zenorar eSIM for data — this is the recommended setup for travel.',
      },
    ],
  },
  {
    title: 'Troubleshooting Connectivity Issues',
    steps: [
      {
        title: 'No data after activation',
        content: 'First, toggle Airplane Mode on and off to force a network search. If that doesn\'t help, go to Settings > Cellular > Cellular Data Network (iPhone) or Settings > Network > Mobile Networks (Android) and manually select a carrier in your destination country.',
      },
      {
        title: 'Configure APN settings manually',
        content: 'Some devices require manual APN configuration. The correct APN settings are included in your purchase confirmation email. On iPhone: Settings > Cellular > Cellular Data Network. On Android: Settings > Network > Mobile Networks > Access Point Names. Create a new APN using the values provided.',
      },
      {
        title: 'eSIM showing but not connecting',
        content: 'Ensure Data Roaming is enabled for the eSIM line. On iPhone, go to Settings > Cellular > [your eSIM plan] and enable Data Roaming. On Android, this is usually in Settings > Network > Data Roaming. Restart your device after enabling.',
      },
      {
        title: 'QR code not scanning',
        content: 'Ensure the QR code image is clear and well-lit. If scanning from a screen, increase the brightness of the display showing the QR code. Alternatively, some carriers provide a manual activation code you can enter instead — check your confirmation email for this option.',
      },
    ],
  },
]

const faqs = [
  {
    question: 'How do I check if my phone is compatible with eSIM?',
    answer: 'On iPhone, go to Settings > General > About and look for "Available SIM" or "EID" — if either is present, your device supports eSIM. On Android, go to Settings > About Phone and look for EID. Alternatively, check your device model against our compatibility list or the manufacturer\'s website.',
  },
  {
    question: 'Can I have two eSIMs active at the same time?',
    answer: 'Most modern devices support Dual SIM + eSIM functionality, allowing you to have a physical SIM and an eSIM active simultaneously (or even two eSIMs on devices that support it). You can usually set which line handles calls, SMS, and data independently in your SIM settings.',
  },
  {
    question: 'My eSIM activation failed. What do I do?',
    answer: 'Activation failures are usually caused by an unstable Wi-Fi connection during setup, an already-used QR code, or a device incompatibility. Ensure you have a stable internet connection before activating. If the QR code was already used or the activation still fails, contact our support team with your order number — we can reissue your activation code.',
  },
  {
    question: 'I have no data connection even though the eSIM is installed.',
    answer: 'This is usually an APN or Data Roaming issue. First, enable Data Roaming for the eSIM line in your cellular settings. Then, check that the APN settings are correctly configured using the values from your confirmation email. If the problem persists, try manually selecting a network carrier from your device\'s network settings.',
  },
  {
    question: 'Can I use my eSIM plan in multiple countries?',
    answer: 'It depends on the plan you purchased. Regional and global plans cover multiple countries, while country-specific plans only work in one destination. Check the coverage details on the product page. If you travel to a country not covered by your plan, the eSIM will not have data there, but your original SIM (if kept active) will still work.',
  },
  {
    question: 'Does the eSIM expire if I don\'t use it?',
    answer: 'eSIM plans have a validity period which starts from the date of activation, not the date of purchase. The validity period is listed on the product page. If you purchase an eSIM plan but don\'t activate it, the QR code will remain valid until you scan it. Once activated, the validity period begins counting down.',
  },
  {
    question: 'Can I top up my eSIM data once it runs out?',
    answer: 'Top-up availability depends on the specific plan. Some plans are fixed (single use) while others are refillable. If your plan supports top-ups, you\'ll find the option in Account > My Orders. Alternatively, purchasing a new eSIM plan and adding it as an additional eSIM profile is always an option.',
  },
]

export default function EsimConnectivityPage() {
  return (
    <HelpArticlePage
      title="eSIM & Connectivity"
      icon="sim-card"
      description="Learn how to activate your Zenorar eSIM, configure your device settings, and troubleshoot any connectivity issues on your travels."
      sections={sections}
      faqs={faqs}
    />
  )
}
