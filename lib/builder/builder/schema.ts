export type AppType =
  | "social"
  | "ecommerce"
  | "fintech"
  | "edtech"
  | "health"
  | "utility";

export type FieldType =
  | "text"
  | "email"
  | "password"
  | "phone"
  | "date"
  | "number"
  | "checkbox";

export interface FieldSpec {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
}

export interface AuthOptions {
  enableEmailPassword?: boolean;
  enableApple?: boolean;
  enableGoogle?: boolean;
  enablePhone?: boolean;
}

export interface BottomTabSpec {
  enabled: boolean;
  tabs: { key: string; label: string; icon?: string }[];
}

export interface ScreenSpec {
  key: string;             // e.g., "login", "signup", "home"
  name: string;            // used as screen name
  fields?: FieldSpec[];    // for forms
  usesBottomTabs?: boolean;
  tabSpec?: BottomTabSpec; // used when a bottom bar is requested
}

export interface AppBlueprint {
  appName: string;
  appType: AppType;
  screens: ScreenSpec[];
  auth?: AuthOptions;
  initialRoute?: string;
}

export interface GenerateRequest {
  blueprint: AppBlueprint;
}
