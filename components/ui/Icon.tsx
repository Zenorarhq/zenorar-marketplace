'use client'

import {
  Home01Icon,
  Search01Icon,
  ShoppingCart01Icon,
  UserIcon,
  HelpCircleIcon,
  LanguageCircleIcon,
  Menu01Icon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  ArrowUpRight01Icon,
  ArrowRight02Icon,
  ArrowLeft02Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  Add01Icon,
  Remove01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Settings01Icon,
  Notification01Icon,
  Delete01Icon,
  Edit01Icon,
  Download01Icon,
  Upload01Icon,
  Share01Icon,
  Copy01Icon,
  Mail01Icon,
  CallIcon,
  Location01Icon,
  Calendar01Icon,
  Clock01Icon,
  StarIcon,
  FavouriteIcon,
  FilterHorizontalIcon,
  Sorting01Icon,
  GridViewIcon,
  Menu09Icon,
  CodeIcon,
  ApiIcon,
  Rocket01Icon,
  Shield01Icon,
  SquareLock01Icon,
  SquareUnlock01Icon,
  Key01Icon,
  CreditCardIcon,
  Wallet01Icon,
  Invoice01Icon,
  PackageIcon,
  DeliveryTruck01Icon,
  Store01Icon,
  GiftIcon,
  DiscountIcon,
  SaleTag01Icon,
  Bookmark01Icon,
  File01Icon,
  Folder01Icon,
  Image01Icon,
  Video01Icon,
  MusicNote01Icon,
  Mic01Icon,
  Camera01Icon,
  QrCodeIcon,
  Wifi01Icon,
  GlobeIcon,
  SmartPhone01Icon,
  LaptopIcon,
  ComputerIcon,
  Simcard01Icon,
  SmartPhone02Icon,
  Message01Icon,
  Comment01Icon,
  SentIcon,
  InboxIcon,
  MoreHorizontalIcon,
  MoreVerticalIcon,
  RefreshIcon,
  Loading01Icon,
  AlertCircleIcon,
  InformationCircleIcon,
  HelpCircleIcon as QuestionIcon,
  Tick01Icon,
  Link01Icon,
  LinkSquare02Icon,
  EyeIcon,
  ViewOffSlashIcon,
  PrinterIcon,
  ScanIcon,
  FlashIcon,
  ZapIcon,
  Sun01Icon,
  Moon01Icon,
  LeftToRightListNumberIcon,
  DashboardSquare01Icon,
  Analytics01Icon,
  ChartLineData01Icon,
  PieChartIcon,
  UserGroupIcon,
  UserAdd01Icon,
  UserCircleIcon,
  UserSettings01Icon,
  SecurityCheckIcon,
  Clock02Icon,
  CustomerSupportIcon,
  HeadsetIcon,
  BookOpen01Icon,
  Award01Icon,
  Medal01Icon,
  CommandIcon,
  ComputerTerminal01Icon,
  Database01Icon,
  ServerStack01Icon,
  CloudIcon,
  Bitcoin01Icon,
  MoneyReceive01Icon,
  MoneySend01Icon,
  PercentIcon,
  HashtagIcon,
  AtIcon,
  PlusSignIcon,
  MinusSignIcon,
  MultiplicationSignIcon,
  DivideSignIcon,
  EqualSignIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  RecordIcon,
  PreviousIcon,
  NextIcon,
  VolumeHighIcon,
  VolumeLowIcon,
  VolumeMute01Icon,
  Maximize01Icon,
  Minimize01Icon,
  ZoomInAreaIcon,
  ZoomOutAreaIcon,
  MapPinIcon,
  MapsIcon,
  Navigation01Icon,
  Compass01Icon,
  AirplaneTakeOff01Icon,
  Car01Icon,
  Building01Icon,
  Home01Icon as HomeIcon,
  CheckmarkBadge01Icon,
  CheckmarkCircle01Icon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  Attachment01Icon,
  Attachment02Icon,
  Calculator01Icon,
  TaskEdit01Icon,
  Note01Icon,
  StickyNote01Icon,
  Table01Icon,
  CalendarCheckIn01Icon,
  AlarmClockIcon,
  Timer01Icon,
  HourglassIcon,
  ChampionIcon,
  CrownIcon,
  Diamond01Icon,
  SparklesIcon,
  MagicWand01Icon,
  PaintBrush01Icon,
  PencilEdit01Icon,
  Eraser01Icon,
  ColorPickerIcon,
  Layers01Icon,
  FlipHorizontalIcon,
  RotateClockwiseIcon,
  CropIcon,
  Move01Icon,
  Resize01Icon,
  TextIcon,
  TextBoldIcon,
  TextItalicIcon,
  TextUnderlineIcon,
  TextStrikethroughIcon,
  TextAlignLeftIcon,
  TextAlignCenterIcon,
  TextAlignRightIcon,
  TextAlignJustifyCenterIcon,
  Menu01Icon as ListIcon,
  LeftToRightListNumberIcon as ListNumberIcon,
  TextIndentMoreIcon,
  TextIndentLessIcon,
  LeftToRightBlockQuoteIcon,
  SourceCodeIcon,
  FunctionIcon,
  Bug01Icon,
  TestTube01Icon,
  MicroscopeIcon,
  Dna01Icon,
  Atom01Icon,
  FireIcon,
  WaterEnergyIcon,
  Leaf01Icon,
  Tree01Icon,
  FlowerIcon,
  SunCloudAngledRain01Icon,
  CloudFastWindIcon,
  CloudSnowIcon,
  ThermometerIcon,
  UmbrellaIcon,
  Ticket01Icon,
  ArrowRightDoubleIcon,
  Login01Icon,
  Logout01Icon,
  UndoIcon,
  RedoIcon,
  Tablet01Icon,
  GridTableIcon,
  AlertDiamondIcon,
  CircleIcon as CircleIconBase,
  AddCircleIcon,
  MinusSignCircleIcon,
  Tick02Icon,
  SnowIcon,
  Recycle03Icon,
} from 'hugeicons-react'

// Map of icon names to HugeIcon components
const iconMap = {
  // Navigation & UI
  home: Home01Icon,
  search: Search01Icon,
  'search-01': Search01Icon,
  cart: ShoppingCart01Icon,
  'shopping-cart': ShoppingCart01Icon,
  user: UserIcon,
  'user-circle': UserCircleIcon,
  help: HelpCircleIcon,
  'help-circle': HelpCircleIcon,
  language: LanguageCircleIcon,
  menu: Menu01Icon,
  settings: Settings01Icon,
  'settings-01': Settings01Icon,
  notification: Notification01Icon,
  'notification-03': Notification01Icon,
  bell: Notification01Icon,

  // Arrows & Chevrons
  'arrow-right': ArrowRight01Icon,
  'arrow-left': ArrowLeft01Icon,
  'arrow-up-right': ArrowUpRight01Icon,
  'arrow-outward': ArrowUpRight01Icon,
  'arrow-right-double': ArrowRightDoubleIcon,
  'chevron-right': ArrowRight02Icon,
  'chevron-left': ArrowLeft02Icon,
  'chevron-down': ArrowDown01Icon,
  'chevron-up': ArrowUp01Icon,
  'expand-more': ArrowDown01Icon,
  'expand-less': ArrowUp01Icon,
  'expand_more': ArrowDown01Icon,
  'expand_less': ArrowUp01Icon,

  // Actions
  add: Add01Icon,
  'add-01': Add01Icon,
  plus: PlusSignIcon,
  remove: Remove01Icon,
  minus: MinusSignIcon,
  close: Cancel01Icon,
  'cancel-01': Cancel01Icon,
  cancel: Cancel01Icon,
  check: Tick01Icon,
  'check-circle': CheckmarkCircle02Icon,
  delete: Delete01Icon,
  edit: Edit01Icon,
  'pencil-edit': PencilEdit01Icon,
  download: Download01Icon,
  upload: Upload01Icon,
  share: Share01Icon,
  'share-08': Share01Icon,
  copy: Copy01Icon,
  link: Link01Icon,
  'external-link': LinkSquare02Icon,
  'link-external-01': LinkSquare02Icon,
  undo: UndoIcon,
  redo: RedoIcon,
  refresh: RefreshIcon,
  'refresh-cw': RefreshIcon,
  loading: Loading01Icon,
  spinner: Loading01Icon,
  x: Cancel01Icon,
  ban: Cancel01Icon,
  trash: Delete01Icon,
  dollar: Wallet01Icon,
  'trending-up': ArrowUpRight01Icon,

  // Communication
  mail: Mail01Icon,
  'mail-01': Mail01Icon,
  email: Mail01Icon,
  call: CallIcon,
  phone: SmartPhone02Icon,
  message: Message01Icon,
  'message-01': Message01Icon,
  chat: Comment01Icon,
  send: SentIcon,
  sent: SentIcon,
  inbox: InboxIcon,
  forum: Comment01Icon,

  // Location & Time
  location: Location01Icon,
  'location-on': Location01Icon,
  map: MapsIcon,
  navigation: Navigation01Icon,
  compass: Compass01Icon,
  calendar: Calendar01Icon,
  'calendar-today': Calendar01Icon,
  clock: Clock01Icon,
  timer: Timer01Icon,
  alarm: AlarmClockIcon,
  history: Clock02Icon,

  // Commerce
  'credit-card': CreditCardIcon,
  wallet: Wallet01Icon,
  invoice: Invoice01Icon,
  receipt: Invoice01Icon,
  'receipt-long': Invoice01Icon,
  package: PackageIcon,
  box: PackageIcon,
  'inventory-2': PackageIcon,
  delivery: DeliveryTruck01Icon,
  store: Store01Icon,
  storefront: Store01Icon,
  bank: Building01Icon,
  gift: GiftIcon,
  'card-giftcard': GiftIcon,
  discount: DiscountIcon,
  tag: SaleTag01Icon,
  payments: Wallet01Icon,
  bitcoin: Bitcoin01Icon,
  'money-receive': MoneyReceive01Icon,
  'money-send': MoneySend01Icon,

  // Rating & Favorites
  star: StarIcon,
  heart: FavouriteIcon,
  favorite: FavouriteIcon,
  bookmark: Bookmark01Icon,
  'thumbs-up': ThumbsUpIcon,
  'thumbs-down': ThumbsDownIcon,

  // Filtering & Sorting
  filter: FilterHorizontalIcon,
  'filter-list': FilterHorizontalIcon,
  sort: Sorting01Icon,
  'grid-view': GridViewIcon,
  'list-view': Menu09Icon,
  list: Menu09Icon,

  // Tech & Development
  code: CodeIcon,
  api: ApiIcon,
  terminal: ComputerTerminal01Icon,
  command: CommandIcon,
  database: Database01Icon,
  server: ServerStack01Icon,
  cloud: CloudIcon,
  function: FunctionIcon,
  bug: Bug01Icon,
  'code-block': SourceCodeIcon,

  // Security
  shield: Shield01Icon,
  security: SecurityCheckIcon,
  lock: SquareLock01Icon,
  unlock: SquareUnlock01Icon,
  key: Key01Icon,
  'lock-person': SquareLock01Icon,
  'shield-person': SecurityCheckIcon,
  login: Login01Icon,
  logout: Logout01Icon,

  // User & Account
  'user-group': UserGroupIcon,
  users: UserGroupIcon,
  group: UserGroupIcon,
  people: UserGroupIcon,
  'user-add': UserAdd01Icon,
  'user-add-01': UserAdd01Icon,
  'person-add': UserAdd01Icon,
  'user-settings': UserSettings01Icon,
  'manage-accounts': UserSettings01Icon,

  // Files & Folders
  file: File01Icon,
  folder: Folder01Icon,
  attachment: Attachment01Icon,
  paperclip: Attachment02Icon,
  clipboard: TaskEdit01Icon,
  note: Note01Icon,
  description: File01Icon,

  // Media
  image: Image01Icon,
  video: Video01Icon,
  music: MusicNote01Icon,
  mic: Mic01Icon,
  camera: Camera01Icon,
  play: PlayIcon,
  pause: PauseIcon,
  stop: StopIcon,
  record: RecordIcon,
  'volume-high': VolumeHighIcon,
  'volume-low': VolumeLowIcon,
  'volume-mute': VolumeMute01Icon,
  fullscreen: Maximize01Icon,
  minimize: Minimize01Icon,
  'zoom-in': ZoomInAreaIcon,
  'zoom-out': ZoomOutAreaIcon,
  'play-circle': PlayIcon,
  'add-shopping-cart': ShoppingCart01Icon,

  // Devices
  smartphone: SmartPhone01Icon,
  tablet: Tablet01Icon,
  laptop: LaptopIcon,
  'laptop-mac': LaptopIcon,
  desktop: ComputerIcon,
  computer: ComputerIcon,
  'desktop-windows': ComputerIcon,
  monitor: ComputerIcon,
  'sim-card': Simcard01Icon,
  qr: QrCodeIcon,
  'qr-code': QrCodeIcon,
  'qr-code-scanner': QrCodeIcon,
  wifi: Wifi01Icon,
  globe: GlobeIcon,

  // Support
  'customer-support': CustomerSupportIcon,
  headphones: HeadsetIcon,
  'headset-mic': HeadsetIcon,
  'support-agent': CustomerSupportIcon,

  // Categories & Features
  rocket: Rocket01Icon,
  'rocket-launch': Rocket01Icon,
  sparkles: SparklesIcon,
  'magic-wand': MagicWand01Icon,
  flash: FlashIcon,
  bolt: ZapIcon,
  zap: ZapIcon,
  fire: FireIcon,
  trophy: ChampionIcon,
  crown: CrownIcon,
  diamond: Diamond01Icon,
  award: Award01Icon,
  medal: Medal01Icon,
  badge: CheckmarkBadge01Icon,
  'checkmark-badge': CheckmarkBadge01Icon,
  verified: CheckmarkCircle01Icon,

  // Dashboard & Analytics
  dashboard: DashboardSquare01Icon,
  'dashboard-square': DashboardSquare01Icon,
  analytics: Analytics01Icon,
  chart: ChartLineData01Icon,
  'pie-chart': PieChartIcon,

  // Library & Learning
  library: BookOpen01Icon,

  // Shopping
  'shopping-bag': PackageIcon,
  'shopping-bag-01': PackageIcon,

  // Confirmation & Tickets
  'confirmation-number': Ticket01Icon,
  ticket: Ticket01Icon,
  'ticket-01': Ticket01Icon,

  // View
  eye: EyeIcon,
  visibility: EyeIcon,
  'visibility-off': ViewOffSlashIcon,

  // More
  'more-horizontal': MoreHorizontalIcon,
  'more-vertical': MoreVerticalIcon,
  'more-horiz': MoreHorizontalIcon,
  'more-vert': MoreVerticalIcon,

  // Status
  alert: AlertCircleIcon,
  'alert-circle': AlertCircleIcon,
  'alert-triangle': AlertDiamondIcon,
  'warning': AlertDiamondIcon,
  info: InformationCircleIcon,
  'info-circle': InformationCircleIcon,
  question: QuestionIcon,
  circle: CircleIconBase,
  'plus-circle': AddCircleIcon,
  'minus-circle': MinusSignCircleIcon,
  'arrow-down-circle': ArrowDown01Icon,
  'arrow-up-circle': ArrowUp01Icon,
  'check-02': Tick02Icon,
  snowflake: SnowIcon,
  frozen: SnowIcon,
  recycle: Recycle03Icon,

  // Theme
  sun: Sun01Icon,
  'light-mode': Sun01Icon,
  moon: Moon01Icon,
  'dark-mode': Moon01Icon,

  // Layout
  'view-column': GridTableIcon,
  'layout-left': LeftToRightListNumberIcon,
  layers: Layers01Icon,
  web: GlobeIcon,
  campaign: Notification01Icon,
  'photo-library': Image01Icon,
  'smart-button': FlashIcon,
  category: GridViewIcon,

  // Export/Import
  'ios-share': Share01Icon,

  // Print
  print: PrinterIcon,
  scan: ScanIcon,

  // Travel
  airplane: AirplaneTakeOff01Icon,
  car: Car01Icon,
  building: Building01Icon,

  // Radio button
  'radio-button-checked': CheckmarkCircle02Icon,

  // Open in new
  'open-in-new': LinkSquare02Icon,

  // Shapes (using available icons as alternatives)
  'hexagon': SparklesIcon, // BNB/crypto icon alternative

  // Payment providers - these will be handled as custom SVGs in the component
  'stripe': null as any,
  'paystack': null as any,
  'paypal': null as any,

  // Crypto icons (using bitcoin as fallback for all crypto)
  'ethereum': Bitcoin01Icon,
  'usdt': Bitcoin01Icon,
  'solana': Bitcoin01Icon,
  'bnb': Bitcoin01Icon,
  'tron': Bitcoin01Icon,
}

type IconName = keyof typeof iconMap

interface IconProps {
  name: IconName | string
  size?: number
  className?: string
  strokeWidth?: number
  color?: string
}

// Custom SVG icons for payment providers
const PayPalIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M19.5 8.5C19.5 5.5 17 3.5 13.5 3.5H7L4 20.5H8L9 14.5H12.5C16.5 14.5 19.5 12 19.5 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 11C21 14 18.5 16.5 15 16.5H12L11 21H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const StripeIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M12 8C10.5 8 9.5 8.5 9.5 9.5C9.5 11.5 14.5 10.5 14.5 13.5C14.5 14.8 13.2 16 11 16C9.5 16 8 15.5 7 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 6V8M12 16V18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

const PaystackIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M7 8H17M7 12H14M7 16H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

export default function Icon({
  name,
  size = 24,
  className = '',
  strokeWidth = 1.5,
  color,
}: IconProps) {
  // Handle custom payment provider icons
  if (name === 'paypal') {
    return <PayPalIcon size={size} className={className} />
  }
  if (name === 'stripe') {
    return <StripeIcon size={size} className={className} />
  }
  if (name === 'paystack') {
    return <PaystackIcon size={size} className={className} />
  }

  const IconComponent = iconMap[name as IconName]

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in icon map`)
    return <span className={className}>?</span>
  }

  return (
    <IconComponent
      size={size}
      className={className}
      strokeWidth={strokeWidth}
      color={color}
    />
  )
}

// Export the icon map for reference
export { iconMap }
export type { IconName }
