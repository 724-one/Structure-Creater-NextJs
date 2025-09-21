import { AppBlueprint, AppType, ScreenSpec } from "./schema";

export const APP_TYPES: { value: AppType; label: string }[] = [
  { value: "social", label: "Social Media" },
  { value: "ecommerce", label: "E‑commerce" },
  { value: "fintech", label: "Fintech" },
  { value: "edtech", label: "EdTech" },
  { value: "health", label: "HealthTech" },
  { value: "utility", label: "Utility" },
];

export const DEFAULT_SCREENS: ScreenSpec[] = [
  { key: "login", name: "Login" },
  { key: "signup", name: "Signup" },
  { key: "home", name: "Home", usesBottomTabs: true, tabSpec: { enabled: true, tabs:[
    { key: "home", label: "Home"},
    { key: "search", label: "Search"},
    { key: "chat", label: "Chat"},
    { key: "profile", label: "Profile"},
  ] } },
  { key: "profile", name: "Profile" },
  { key: "settings", name: "Settings" },
];

export function starterBlueprint(appName: string, appType: AppType): AppBlueprint {
  return {
    appName,
    appType,
    screens: DEFAULT_SCREENS,
    initialRoute: "Login",
    auth: {
      enableEmailPassword: true,
      enableGoogle: true,
      enableApple: true,
      enablePhone: false,
    }
  };
}
