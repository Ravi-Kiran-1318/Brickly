const fs = require('fs');
const path = require('path');

const proPath = path.join(__dirname, 'src/pages/ProfessionalDashboard.jsx');
let proContent = fs.readFileSync(proPath, 'utf-8');
proContent = proContent.replace(
  "import { useTheme } from '../context/ThemeContext';",
  "import { useTheme } from '../context/ThemeContext';\nimport NOTIFICATION_TABS from '../../shared/notificationConstants';"
);
proContent = proContent.replace(
  "const [activeTab, setActiveTab] = useState('Job Feed');",
  "const [activeTab, setActiveTab] = useState(NOTIFICATION_TABS.PROFESSIONAL_JOB_FEED);"
);
proContent = proContent.replace(
  /const navItems = \[\s*\{ label: 'Job Feed'[^\]]+\];/m,
  `const navItems = [
    { id: NOTIFICATION_TABS.PROFESSIONAL_JOB_FEED, label: 'Job Feed', icon: IconBriefcase },
    { id: NOTIFICATION_TABS.PROFESSIONAL_MY_AVAILABILITY, label: 'My Availability', icon: IconCalendarEvent },
    { id: NOTIFICATION_TABS.PROFESSIONAL_MY_APPLICATIONS, label: 'Applications', icon: IconClipboardText },
    { id: NOTIFICATION_TABS.PROFESSIONAL_REVIEWS, label: 'My Reviews', icon: IconStar },
    { id: 'Settings', label: 'Settings', icon: IconUserCircle },
  ];`
);
proContent = proContent.replace(
  /const renderActiveTab = \(\) => \{\s*switch \(activeTab\) \{\s*case 'Job Feed': return <JobsFeedTab openMapJobId={openMapJobId} setOpenMapJobId={setOpenMapJobId} \/>;\s*case 'My Availability': return <AvailabilityTab \/>;\s*case 'Applications': return <ApplicationsTab openMapJobId={openMapJobId} setOpenMapJobId={setOpenMapJobId} \/>;\s*case 'My Reviews': return <ReviewsTab \/>;\s*case 'Settings': return <SettingsTab \/>;\s*case 'Notifications': return <NotificationsTab setUnreadCount={setUnreadCount} setActiveTab={setActiveTab} \/>;\s*default: return <JobsFeedTab \/>;\s*\}\s*\};/m,
  `const renderActiveTab = () => {
    switch (activeTab) {
      case NOTIFICATION_TABS.PROFESSIONAL_JOB_FEED: return <JobsFeedTab openMapJobId={openMapJobId} setOpenMapJobId={setOpenMapJobId} />;
      case NOTIFICATION_TABS.PROFESSIONAL_MY_AVAILABILITY: return <AvailabilityTab />;
      case NOTIFICATION_TABS.PROFESSIONAL_MY_APPLICATIONS: return <ApplicationsTab openMapJobId={openMapJobId} setOpenMapJobId={setOpenMapJobId} />;
      case NOTIFICATION_TABS.PROFESSIONAL_REVIEWS: return <ReviewsTab />;
      case 'Settings': return <SettingsTab />;
      case NOTIFICATION_TABS.PROFESSIONAL_NOTIFICATIONS: return <NotificationsTab setUnreadCount={setUnreadCount} setActiveTab={setActiveTab} />;
      default: return <JobsFeedTab />;
    }
  };`
);
proContent = proContent.replace(
  /onClick=\{\(\) => setActiveTab\(item\.label\)\}/g,
  "onClick={() => setActiveTab(item.id)}"
);
proContent = proContent.replace(
  /activeTab === item\.label/g,
  "activeTab === item.id"
);
proContent = proContent.replace(
  /<h1>\{activeTab\}<\/h1>/g,
  "<h1>{navItems.find(i => i.id === activeTab)?.label || 'Notifications'}</h1>"
);
proContent = proContent.replace(
  /onClick=\{\(\) => setActiveTab\('Notifications'\)\}/g,
  "onClick={() => setActiveTab(NOTIFICATION_TABS.PROFESSIONAL_NOTIFICATIONS)}"
);
proContent = proContent.replace(
  /\{activeTab\}/,
  "{navItems.find(i => i.id === activeTab)?.label || 'Notifications'}"
);
fs.writeFileSync(proPath, proContent);


const conPath = path.join(__dirname, 'src/pages/ContractorDashboard.jsx');
let conContent = fs.readFileSync(conPath, 'utf-8');
conContent = conContent.replace(
  "import { useTheme } from '../context/ThemeContext';",
  "import { useTheme } from '../context/ThemeContext';\nimport NOTIFICATION_TABS from '../../shared/notificationConstants';"
);
conContent = conContent.replace(
  "const [activeTab, setActiveTab] = useState('Overview');",
  "const [activeTab, setActiveTab] = useState(NOTIFICATION_TABS.CONTRACTOR_OVERVIEW);"
);
conContent = conContent.replace(
  /const navItems = \[\s*\{ label: 'Overview'[^\]]+\];/m,
  `const navItems = [
    { id: NOTIFICATION_TABS.CONTRACTOR_OVERVIEW, label: 'Overview', icon: IconLayoutDashboard },
    { id: NOTIFICATION_TABS.CONTRACTOR_JOB_POSTS, label: 'Job Posts', icon: IconBriefcase },
    { id: NOTIFICATION_TABS.CONTRACTOR_BROWSE_PROFESSIONALS, label: 'Browse Professionals', icon: IconUsers },
    { id: NOTIFICATION_TABS.CONTRACTOR_PORTFOLIO, label: 'Portfolio', icon: IconPhoto },
    { id: NOTIFICATION_TABS.CONTRACTOR_REVIEWS, label: 'Reviews', icon: IconStar },
    { id: NOTIFICATION_TABS.CONTRACTOR_FIND_MATERIALS, label: 'Find Materials', icon: IconPackage },
    { id: NOTIFICATION_TABS.CONTRACTOR_MY_QUOTES, label: 'My Quotes', icon: IconFileInvoice },
    { id: NOTIFICATION_TABS.CONTRACTOR_ORDERS, label: 'Orders', icon: IconTruck },
    { id: NOTIFICATION_TABS.CONTRACTOR_DEALS_FEED, label: 'Deals Feed', icon: IconTag },
    { id: 'Project Progress', label: 'Project Progress', icon: IconHammer },
  ];`
);
conContent = conContent.replace(
  /const renderActiveTab = \(\) => \{\s*switch \(activeTab\) \{\s*case 'Overview': return <OverviewTab setActiveTab=\{changeTab\} \/>;\s*case 'Job Posts': return <JobPostsTab \/>;\s*case 'Browse Professionals': return <BrowseProfessionalsTab \/>;\s*case 'Portfolio': return <PortfolioTab \/>;\s*case 'Reviews': return <ReviewsTab \/>;\s*case 'Find Materials': return <MaterialsTab \/>;\s*case 'My Quotes': return <MyQuotesTab \/>;\s*case 'Orders': return <OrdersTab \/>;\s*case 'Deals Feed': return <DealsFeedTab \/>;\s*case 'Project Progress': return <ContractsTab tabData=\{tabData\} setTabData=\{setTabData\} \/>;\s*case 'Notifications': return <NotificationsTab setUnreadCount=\{setUnreadCount\} setActiveTab=\{changeTab\} \/>;\s*default: return <OverviewTab setActiveTab=\{changeTab\} \/>;\s*\}\s*\};/m,
  `const renderActiveTab = () => {
    switch (activeTab) {
      case NOTIFICATION_TABS.CONTRACTOR_OVERVIEW: return <OverviewTab setActiveTab={changeTab} />;
      case NOTIFICATION_TABS.CONTRACTOR_JOB_POSTS: return <JobPostsTab />;
      case NOTIFICATION_TABS.CONTRACTOR_BROWSE_PROFESSIONALS: return <BrowseProfessionalsTab />;
      case NOTIFICATION_TABS.CONTRACTOR_PORTFOLIO: return <PortfolioTab />;
      case NOTIFICATION_TABS.CONTRACTOR_REVIEWS: return <ReviewsTab />;
      case NOTIFICATION_TABS.CONTRACTOR_FIND_MATERIALS: return <MaterialsTab />;
      case NOTIFICATION_TABS.CONTRACTOR_MY_QUOTES: return <MyQuotesTab />;
      case NOTIFICATION_TABS.CONTRACTOR_ORDERS: return <OrdersTab />;
      case NOTIFICATION_TABS.CONTRACTOR_DEALS_FEED: return <DealsFeedTab />;
      case 'Project Progress': return <ContractsTab tabData={tabData} setTabData={setTabData} />;
      case NOTIFICATION_TABS.CONTRACTOR_NOTIFICATIONS: return <NotificationsTab setUnreadCount={setUnreadCount} setActiveTab={changeTab} />;
      default: return <OverviewTab setActiveTab={changeTab} />;
    }
  };`
);
conContent = conContent.replace(
  /onClick=\{\(\) => setActiveTab\(item\.label\)\}/g,
  "onClick={() => setActiveTab(item.id)}"
);
conContent = conContent.replace(
  /activeTab === item\.label/g,
  "activeTab === item.id"
);
conContent = conContent.replace(
  /onClick=\{\(\) => setActiveTab\('Notifications'\)\}/g,
  "onClick={() => setActiveTab(NOTIFICATION_TABS.CONTRACTOR_NOTIFICATIONS)}"
);
conContent = conContent.replace(
  /\{activeTab\}/,
  "{navItems.find(i => i.id === activeTab)?.label || 'Notifications'}"
);
fs.writeFileSync(conPath, conContent);

const dealerPath = path.join(__dirname, 'src/pages/DealerDashboard.jsx');
let dealerContent = fs.readFileSync(dealerPath, 'utf-8');
dealerContent = dealerContent.replace(
  "import { useTheme } from '../context/ThemeContext';",
  "import { useTheme } from '../context/ThemeContext';\nimport NOTIFICATION_TABS from '../../shared/notificationConstants';"
);
dealerContent = dealerContent.replace(
  "const [activeTab, setActiveTab] = useState('Overview');",
  "const [activeTab, setActiveTab] = useState(NOTIFICATION_TABS.DEALER_OVERVIEW);"
);
dealerContent = dealerContent.replace(
  /const navItems = \[\s*\{ label: 'Overview'[^\]]+\];/m,
  `const navItems = [
    { id: NOTIFICATION_TABS.DEALER_OVERVIEW, label: 'Overview', icon: IconLayoutDashboard },
    { id: NOTIFICATION_TABS.DEALER_INVENTORY, label: 'Inventory', icon: IconPackage },
    { id: NOTIFICATION_TABS.DEALER_QUOTE_REQUESTS, label: 'Quote Requests', icon: IconFileInvoice },
    { id: NOTIFICATION_TABS.DEALER_ORDERS, label: 'Orders', icon: IconTruck },
    { id: NOTIFICATION_TABS.DEALER_DEALS_BOARD, label: 'Deals Board', icon: IconTag },
    { id: 'Reviews', label: 'Reviews', icon: IconStar },
  ];`
);
dealerContent = dealerContent.replace(
  /const renderActiveTab = \(\) => \{\s*switch \(activeTab\) \{\s*case 'Overview': return <OverviewTab setActiveTab=\{setActiveTab\} \/>;\s*case 'Inventory': return <InventoryTab \/>;\s*case 'Quote Requests': return <QuotesInboxTab \/>;\s*case 'Orders': return <OrdersTab \/>;\s*case 'Deals Board': return <DealsTab \/>;\s*case 'Reviews': return <ReviewsTab \/>;\s*case 'Notifications': return <NotificationsTab setUnreadCount=\{setUnreadCount\} setActiveTab=\{setActiveTab\} \/>;\s*default: return <OverviewTab setActiveTab=\{setActiveTab\} \/>;\s*\}\s*\};/m,
  `const renderActiveTab = () => {
    switch (activeTab) {
      case NOTIFICATION_TABS.DEALER_OVERVIEW: return <OverviewTab setActiveTab={setActiveTab} />;
      case NOTIFICATION_TABS.DEALER_INVENTORY: return <InventoryTab />;
      case NOTIFICATION_TABS.DEALER_QUOTE_REQUESTS: return <QuotesInboxTab />;
      case NOTIFICATION_TABS.DEALER_ORDERS: return <OrdersTab />;
      case NOTIFICATION_TABS.DEALER_DEALS_BOARD: return <DealsTab />;
      case 'Reviews': return <ReviewsTab />;
      case NOTIFICATION_TABS.DEALER_NOTIFICATIONS: return <NotificationsTab setUnreadCount={setUnreadCount} setActiveTab={setActiveTab} />;
      default: return <OverviewTab setActiveTab={setActiveTab} />;
    }
  };`
);
dealerContent = dealerContent.replace(
  /onClick=\{\(\) => setActiveTab\(item\.label\)\}/g,
  "onClick={() => setActiveTab(item.id)}"
);
dealerContent = dealerContent.replace(
  /activeTab === item\.label/g,
  "activeTab === item.id"
);
dealerContent = dealerContent.replace(
  /onClick=\{\(\) => setActiveTab\('Notifications'\)\}/g,
  "onClick={() => setActiveTab(NOTIFICATION_TABS.DEALER_NOTIFICATIONS)}"
);
dealerContent = dealerContent.replace(
  /\{activeTab\}/,
  "{navItems.find(i => i.id === activeTab)?.label || 'Notifications'}"
);
fs.writeFileSync(dealerPath, dealerContent);

