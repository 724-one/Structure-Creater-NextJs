// lib/builder/feature-registry.ts
import type { ScreenKind } from "./schema";

export type ControlType = "checkbox" | "multi" | "select";
export type FeatureOption =
  | { key: string; label: string; control: "checkbox"; default?: boolean }
  | { key: string; label: string; control: "multi"; options: string[]; default?: string[] }
  | { key: string; label: string; control: "select"; options: string[]; default?: string };

export const FeatureRegistry: Record<ScreenKind, FeatureOption[]> = {
  auth: [
    { key: "auth.emailPassword", label: "Email + Password", control: "checkbox", default: true },
    { key: "auth.google", label: "Google Sign-In", control: "checkbox" },
    { key: "auth.apple", label: "Apple Sign-In", control: "checkbox" },
    { key: "auth.phoneOtp", label: "Phone OTP", control: "checkbox" },
    { key: "auth.magicLink", label: "Magic Link", control: "checkbox" },
    { key: "auth.rememberMe", label: "Remember me", control: "checkbox", default: true },
    { key: "auth.forgotPassword", label: "Forgot password", control: "checkbox", default: true },
    { key: "auth.socialButtonsLayout", label: "Social layout", control: "select", options: ["row","column"], default: "row" }
  ],
  home: [
    { key: "home.welcomeHeader", label: "Welcome header", control: "checkbox", default: true },
    { key: "home.metricCards", label: "Metric cards", control: "checkbox", default: true },
    { key: "home.charts", label: "Charts", control: "multi", options: ["line","bar","pie","area"], default: ["line"] },
    { key: "home.recentActivityList", label: "Recent activity", control: "checkbox" },
    { key: "home.quickActions", label: "Quick actions", control: "checkbox" },
    { key: "home.search", label: "Search bar", control: "checkbox" },
    { key: "home.notificationsBell", label: "Notifications bell", control: "checkbox" }
  ],
  profile: [
    { key: "profile.avatarUpload", label: "Avatar upload", control: "checkbox", default: true },
    { key: "profile.bio", label: "Bio field", control: "checkbox", default: true },
    { key: "profile.location", label: "Location", control: "checkbox" },
    { key: "profile.socials", label: "Social links", control: "multi", options: ["twitter","instagram","linkedin","website"] },
    { key: "profile.editButton", label: "Edit button", control: "checkbox", default: true },
    { key: "profile.settingsShortcut", label: "Settings shortcut", control: "checkbox" }
  ],
  settings: [
    { key: "settings.themeToggle", label: "Theme toggle", control: "checkbox", default: true },
    { key: "settings.languagePicker", label: "Language picker", control: "checkbox" },
    { key: "settings.pushToggle", label: "Push notifications", control: "checkbox" },
    { key: "settings.privacyToggles", label: "Privacy toggles", control: "multi", options: ["privateProfile","hideAge","readReceipts"] }
  ],
  analytics: [
    { key: "home.charts", label: "Charts", control: "multi", options: ["line","bar","pie","area"], default: ["bar"] }
  ],
  list: [
    { key: "list.search", label: "Search", control: "checkbox", default: true },
    { key: "list.filters", label: "Filters", control: "checkbox" },
    { key: "list.pagination", label: "Pagination", control: "select", options: ["infinite","paged"], default: "infinite" }
  ],
  details: [
    { key: "details.share", label: "Share button", control: "checkbox" }
  ],
  chat: [
    { key: "chat.attachments", label: "Attachments", control: "checkbox", default: true },
    { key: "chat.imagePreview", label: "Image preview", control: "checkbox", default: true },
    { key: "chat.multipleImages", label: "Multiple images", control: "checkbox" },
    { key: "chat.typingIndicator", label: "Typing indicator", control: "checkbox" }
  ],
  custom: []
};
