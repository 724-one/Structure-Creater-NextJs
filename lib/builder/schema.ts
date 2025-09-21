// lib/builder/schema.ts
export type AppCategory =
  | "Fintech" | "Trading" | "Social" | "E-commerce" | "EdTech" | "HealthTech"
  | "Food & Delivery" | "Travel" | "Gaming" | "Entertainment" | "Productivity" | "Utility";

export type NavigatorType = "stack" | "tabs" | "drawer";
export type NavScreenRef = { type: "screen"; screenId: string; options?: Record<string, any> };
export type NavNode =
  | { type: "stack"; id: string; initialRoute?: string; children: Array<NavNode | NavScreenRef> }
  | { type: "tabs"; id: string; children: Array<{ tabId: string; title: string; child: NavNode | NavScreenRef }> }
  | { type: "drawer"; id: string; children: Array<{ itemId: string; title: string; child: NavNode | NavScreenRef }> };

export type ScreenKind =
  | "auth" | "home" | "profile" | "list" | "details" | "settings" | "chat" | "analytics" | "custom";

export type ScreenFeatureFlags = {
  auth?: {
    emailPassword?: boolean;
    google?: boolean;
    apple?: boolean;
    phoneOtp?: boolean;
    magicLink?: boolean;
    anonymous?: boolean;
    rememberMe?: boolean;
    forgotPassword?: boolean;
    socialButtonsLayout?: "row" | "column";
  };
  home?: {
    welcomeHeader?: boolean;
    metricCards?: boolean;
    charts?: Array<"line" | "bar" | "pie" | "area">;
    recentActivityList?: boolean;
    quickActions?: boolean;
    search?: boolean;
    notificationsBell?: boolean;
  };
  profile?: {
    avatarUpload?: boolean;
    bio?: boolean;
    location?: boolean;
    socials?: Array<"twitter" | "instagram" | "linkedin" | "website">;
    settingsShortcut?: boolean;
    editButton?: boolean;
  };
  settings?: {
    themeToggle?: boolean;
    languagePicker?: boolean;
    pushToggle?: boolean;
    privacyToggles?: Array<"privateProfile" | "hideAge" | "readReceipts">;
  };
  list?: { search?: boolean; filters?: boolean; pagination?: "infinite" | "paged" };
  details?: { share?: boolean; actions?: string[] };
  chat?: { attachments?: boolean; typingIndicator?: boolean; imagePreview?: boolean; multipleImages?: boolean };
  payments?: { stripe?: boolean; inAppPurchases?: boolean };
};

export type ScreenSpecV2 = {
  id: string;
  kind: ScreenKind;
  name: string;
  template: string;
  title?: string;
  features?: ScreenFeatureFlags;
  props?: Record<string, any>;
};

export type Integrations = {
  authProvider?: "firebase" | "supabase" | "custom" | "none";
  database?: "firestore" | "supabase" | "none";
  storage?: "firebaseStorage" | "none";
  analytics?: "expo" | "firebaseAnalytics" | "none";
  push?: "expo" | "firebase" | "none";
};

export type AppBlueprint = {
  meta: {
    appName: string;
    slug: string;
    owner: string;
    category: AppCategory;
    useLatestExpo: boolean;
  };
  navigation: {
    root: NavigatorType;
    structure: NavNode;
  };
  screens: ScreenSpecV2[];
  integrations?: Integrations;
};

// ---- Legacy bridge (existing generator) ----
export type LegacyTab = { name: string; icon?: string; route: string };
export type LegacyStackRoute = { name: string; route: string };

export type LegacyNavigationSpec = {
  hasBottomTabs: boolean;
  roles?: string[]; // kept for compatibility, not used
  tabs?: LegacyTab[];
  stack?: LegacyStackRoute[];
  hasDrawer?: boolean;
  drawerItems?: Array<{ name: string; route: string }>;
};

export type LegacyScreenSpec = {
  type: "auth" | "stack" | "tab" | "other";
  name: string;
  template: string;
  title?: string;
  props?: Record<string, any>;
};

export type GenerateRequest = {
  appName: string;
  slug: string;
  owner: string;
  useLatestExpo: boolean;
  appCategory?: string;
  navigation: LegacyNavigationSpec;
  screens: LegacyScreenSpec[];
};
