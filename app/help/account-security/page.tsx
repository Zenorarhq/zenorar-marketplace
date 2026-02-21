import HelpArticlePage from '@/components/help/HelpArticlePage'

export const metadata = {
  title: 'Account & Security | Zenorar Help Center',
  description: 'Manage your Zenorar account settings, reset your password, enable two-factor authentication, and keep your account secure.',
}

const sections = [
  {
    title: 'Managing Your Profile',
    steps: [
      {
        title: 'Access account settings',
        content: 'Log in and click your avatar or name in the top-right corner, then select "Account Settings". From here you can update all personal details.',
      },
      {
        title: 'Update your display name and avatar',
        content: 'In the Profile tab, you can change your display name and upload a profile picture. Supported image formats are JPG, PNG, and WEBP, up to 2MB.',
      },
      {
        title: 'Change your email address',
        content: 'To update your email, enter the new address in the Email field and save. A confirmation link will be sent to your new email — click it to confirm the change. Your old email remains active until confirmed.',
      },
      {
        title: 'Set your country and currency',
        content: 'Your country and preferred currency can be set in the Preferences section. This ensures product prices, payment options, and tax calculations are shown correctly for your region.',
      },
    ],
  },
  {
    title: 'Changing Your Password',
    steps: [
      {
        title: 'Go to the Security tab',
        content: 'In Account Settings, navigate to the Security tab. You\'ll see options for password management and two-factor authentication.',
      },
      {
        title: 'Enter your current password',
        content: 'For security, you must verify your current password before setting a new one. If you\'ve forgotten it, use the "Forgot Password" link on the login page instead.',
      },
      {
        title: 'Set a strong new password',
        content: 'Your new password must be at least 8 characters long. We recommend using a mix of uppercase and lowercase letters, numbers, and symbols. Avoid using the same password across multiple sites.',
      },
      {
        title: 'Save and log back in',
        content: 'After saving, you\'ll be logged out of all active sessions for security. Log back in with your new password. We recommend using a password manager to keep track of your credentials.',
      },
    ],
  },
  {
    title: 'Setting Up Two-Factor Authentication (2FA)',
    steps: [
      {
        title: 'What is 2FA and why you need it',
        content: 'Two-factor authentication adds a second layer of security beyond your password. Even if someone obtains your password, they cannot access your account without the second verification code.',
      },
      {
        title: 'Enable 2FA from account settings',
        content: 'In the Security tab, click "Enable Two-Factor Authentication". You\'ll be guided through the setup process using an authenticator app such as Google Authenticator, Authy, or Microsoft Authenticator.',
      },
      {
        title: 'Scan the QR code',
        content: 'Open your authenticator app and scan the QR code shown on screen. The app will begin generating 6-digit codes that refresh every 30 seconds. Enter the current code to confirm setup.',
      },
      {
        title: 'Save your backup codes',
        content: 'After enabling 2FA, you\'ll receive a set of one-time backup codes. Store these in a safe place — they can be used to access your account if you lose access to your authenticator app.',
      },
    ],
  },
  {
    title: 'Protecting Your Account',
    steps: [
      {
        title: 'Watch for suspicious activity',
        content: 'Zenorar sends email notifications for new logins from unrecognised devices or locations. If you receive one you didn\'t initiate, change your password immediately and contact support.',
      },
      {
        title: 'Never share your credentials',
        content: 'Zenorar staff will never ask for your password via email or chat. If you receive a message requesting your login details, it is a phishing attempt — report it and do not respond.',
      },
      {
        title: 'Use a unique, strong password',
        content: 'Avoid reusing passwords from other websites. If any site you use has experienced a data breach, change your Zenorar password immediately as a precaution.',
      },
      {
        title: 'Log out on shared devices',
        content: 'If you access your account from a shared or public computer, always log out when done. You can also manage and revoke active sessions from the Security tab in Account Settings.',
      },
    ],
  },
]

const faqs = [
  {
    question: 'I forgot my password. How do I reset it?',
    answer: 'On the login page, click "Forgot Password" and enter your registered email address. You\'ll receive a password reset link within a few minutes. Click the link in the email and follow the instructions to create a new password. The link expires after 1 hour for security.',
  },
  {
    question: 'I\'m locked out because of 2FA. What can I do?',
    answer: 'If you can\'t access your authenticator app, use one of your backup codes to log in. These were provided when you first enabled 2FA. If you don\'t have your backup codes, contact our support team with proof of account ownership (such as your registered email and a recent order number) and we will help you regain access.',
  },
  {
    question: 'Can I change the email address on my account?',
    answer: 'Yes. Go to Account Settings > Profile and update your email address. A confirmation link will be sent to the new address. Your account continues to use the old email until you click the confirmation link. This prevents accidental lockouts.',
  },
  {
    question: 'I noticed an unrecognised login. What should I do?',
    answer: 'Change your password immediately via Account Settings > Security. Then review your active sessions and revoke any you don\'t recognise. Enable 2FA if you haven\'t already. Finally, contact our support team to inform us of potential unauthorised access so we can flag the account for review.',
  },
  {
    question: 'Can I delete my account?',
    answer: 'Yes. You can request account deletion by contacting our support team. Note that deleting your account is permanent and will remove your order history, downloads, and all personal data. We recommend downloading your purchased files before requesting deletion, as you will lose access to them.',
  },
  {
    question: 'Is it safe to use social login (Google)?',
    answer: 'Yes. When you sign in with Google, we only receive your name and email address — we never see or store your Google password. You can use this method safely. If you want to set a Zenorar password for direct login, you can do so in Account Settings after signing in via Google.',
  },
]

export default function AccountSecurityPage() {
  return (
    <HelpArticlePage
      title="Account & Security"
      icon="security"
      description="Keep your Zenorar account secure. Learn how to manage your profile, change your password, enable 2FA, and respond to suspicious activity."
      sections={sections}
      faqs={faqs}
    />
  )
}
