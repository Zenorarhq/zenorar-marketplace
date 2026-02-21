import HelpArticlePage from '@/components/help/HelpArticlePage'

export const metadata = {
  title: 'Scripts & Tools | Zenorar Help Center',
  description: 'Installation guides, compatibility requirements, licensing explained, and troubleshooting help for premium scripts and automation tools on Zenorar.',
}

const sections = [
  {
    title: 'Types of Scripts Available',
    steps: [
      {
        title: 'Automation scripts',
        content: 'These scripts handle repetitive tasks automatically — web scraping, data processing, social media automation, and workflow management. Most are written in Python, JavaScript, or Bash and run from your terminal or server.',
      },
      {
        title: 'Web tools & browser extensions',
        content: 'Browser-based tools and extensions that work directly in Chrome, Firefox, or Edge. These typically require no installation beyond adding them to your browser or injecting them via a bookmarklet.',
      },
      {
        title: 'API integrations & bots',
        content: 'Pre-built integrations that connect services together — Telegram bots, Discord bots, webhook handlers, and third-party API wrappers. Most require API credentials from the relevant platform to function.',
      },
      {
        title: 'System utilities',
        content: 'Command-line tools and scripts for system administration, file management, network analysis, and security testing. These typically run on Linux, macOS, or Windows with appropriate permissions.',
      },
    ],
  },
  {
    title: 'Installing Your Script',
    steps: [
      {
        title: 'Download your files from the Dashboard',
        content: 'After purchase, go to Account > My Orders and click the download button for your product. Files come as a .zip archive containing the script, a README, and any supporting configuration files.',
      },
      {
        title: 'Read the README before running anything',
        content: 'Every product includes a README file with specific installation instructions. This is the most important step — requirements, environment setup, and configuration vary between scripts. Skipping this is the most common cause of setup issues.',
      },
      {
        title: 'Install required dependencies',
        content: 'Most scripts list their dependencies in a requirements.txt (Python) or package.json (Node.js) file. Run the appropriate installer: `pip install -r requirements.txt` for Python or `npm install` for Node.js projects.',
      },
      {
        title: 'Configure environment variables',
        content: 'Many scripts require API keys, tokens, or credentials stored in a .env file. Duplicate the .env.example file (if provided), rename it to .env, and fill in your values. Never share your .env file or commit it to version control.',
      },
      {
        title: 'Run the script and verify',
        content: 'Follow the README instructions to start the script. Most will print a success message or begin outputting results. If you encounter errors, check the Troubleshooting section of the README first before contacting support.',
      },
    ],
  },
  {
    title: 'Compatibility & Requirements',
    steps: [
      {
        title: 'Check the requirements before buying',
        content: 'Each product page lists its supported operating systems, runtime versions (e.g. Python 3.10+, Node 18+), and any external services required. Verify these match your environment before purchasing.',
      },
      {
        title: 'Python scripts',
        content: 'Python scripts typically require Python 3.8 or higher. We recommend using a virtual environment (`python -m venv venv`) to avoid conflicts between projects. Install dependencies inside the virtual environment, not globally.',
      },
      {
        title: 'Node.js scripts',
        content: 'Node.js scripts require Node 16 or higher and npm or yarn. Check the package.json for the specific version requirements. Using nvm (Node Version Manager) makes it easy to switch between Node versions.',
      },
      {
        title: 'Browser-based tools',
        content: 'Browser extensions and injected scripts work best in the latest version of Chrome or Firefox. Some tools may require you to disable certain browser security settings temporarily — the README will specify this.',
      },
    ],
  },
  {
    title: 'License Types Explained',
    steps: [
      {
        title: 'Standard License',
        content: 'The Standard License allows you to use the product for a single personal or commercial project. You may not resell, redistribute, or sublicense the code. This is the right license for most individual use cases.',
      },
      {
        title: 'Extended License',
        content: 'The Extended License allows use across multiple projects and client work. It covers commercial applications where the end product is sold or monetised. If you\'re building a product for clients or building a SaaS tool, choose Extended.',
      },
      {
        title: 'What you cannot do with either license',
        content: 'You may not resell the original script files, offer them on other marketplaces, or claim authorship. Reverse-engineering and redistribution of source code are prohibited. These terms apply regardless of license type.',
      },
    ],
  },
]

const faqs = [
  {
    question: 'The script isn\'t working after installation. What should I do?',
    answer: 'First, re-read the README carefully and verify that every step was completed correctly, including installing all dependencies and configuring the .env file. Check if you\'re running the correct version of Python or Node.js. If the issue persists, use the "Contact Seller" button on the product page — the seller can often diagnose the problem quickly. Include the exact error message you see in your message.',
  },
  {
    question: 'Can I run the script on a server (VPS or cloud)?',
    answer: 'Yes, most scripts are designed to run on any Linux-based server (Ubuntu, Debian, CentOS). The README will indicate if there are specific server requirements. For scripts requiring a browser (like Selenium-based automation), you\'ll need to install a headless browser on your server.',
  },
  {
    question: 'I got an error installing dependencies. What do I do?',
    answer: 'Common causes include using the wrong Python or Node.js version, missing system-level packages (like build tools on Linux), or permission issues. Try running the install command with administrator/sudo privileges if needed. If you\'re on Windows, ensure you have Microsoft C++ Build Tools installed for Python packages that require compilation.',
  },
  {
    question: 'How do I get updates for a script I\'ve purchased?',
    answer: 'Free updates are included for 6 months from your purchase date. When an update is available, you\'ll receive an email notification and the new version will appear in your Downloads section. After 6 months, you can purchase an extended support period or upgrade to the latest version at a discounted rate.',
  },
  {
    question: 'Can I install the script on more than one machine?',
    answer: 'Under the Standard License, you can install the script on your own machines for personal use (e.g. your desktop and laptop). However, if you\'re deploying to multiple client environments or running it commercially across multiple servers, you\'ll need an Extended License.',
  },
  {
    question: 'I want a refund because the script doesn\'t work as described.',
    answer: 'We offer refunds within 7 days of purchase if the script is technically defective and our support team is unable to resolve the issue. Contact us via the Support page with your order number and a description of the problem. Note that refunds are not issued for issues caused by incompatible environments or incorrect configuration.',
  },
  {
    question: 'Can I modify the script\'s source code?',
    answer: 'Yes — both Standard and Extended licenses allow you to modify the code for your own use. However, you may not distribute or resell the modified version without explicit permission from the original author. If you\'re unsure, contact the seller directly.',
  },
]

export default function ScriptsToolsPage() {
  return (
    <HelpArticlePage
      title="Scripts & Tools"
      icon="code"
      description="Everything you need to know about buying, installing, and running premium scripts and tools from the Zenorar marketplace."
      sections={sections}
      faqs={faqs}
    />
  )
}
