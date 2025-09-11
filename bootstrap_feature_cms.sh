set -e

# Use Yarn Classic (stable) so things “just work”
corepack enable >/dev/null 2>&1 || true
corepack prepare yarn@1.22.22 --activate

# Project files/folders
mkdir -p src/app src/app/api/generate lib/templates/app lib/templates/src/{components,navigation,screens,utils}

# package.json (Next 14 + React 18 + mustache + adm-zip)
cat > package.json <<'JSON'
{
  "name": "structure-creater-nextjs",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.2.5",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "mustache": "^4.2.0",
    "adm-zip": "^0.5.10"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/node": "^18.19.0",
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.18",
    "eslint": "^8.57.0",
    "eslint-config-next": "14.2.5"
  },
  "packageManager": "yarn@1.22.22"
}
JSON

# next config (prevents “wrong root” warning)
cat > next.config.js <<'JS'
/** @type {import('next').NextConfig} */
module.exports = { turbopack: { root: __dirname } };
JS

# tsconfig + next-env
cat > tsconfig.json <<'JSON'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "es2020"],
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
JSON
printf "/// <reference types=\"next\" />\n/// <reference types=\"next/types/global\" />\n" > next-env.d.ts

# minimal layout
cat > src/app/layout.tsx <<'TSX'
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
TSX

# generator UI page
cat > src/app/page.tsx <<'TSX'
"use client";
import { useState } from "react";

export default function Home() {
  const [appName, setAppName] = useState("MyGeneratedApp");
  const [signup, setSignup] = useState(true);
  const [pkgMgr, setPkgMgr] = useState<"yarn"|"pnpm"|"npm">("yarn");

  const generate = async () => {
    const payload = {
      appName,
      useTypescript: true,
      packageManager: pkgMgr,
      expoSdk: "52.0.0",
      rnVersion: "0.76.0",
      features: { login: true, signup }
    };
    const res = await fetch("/api/generate", { method: "POST", body: JSON.stringify(payload) });
    if (!res.ok) { alert("Generate failed: " + await res.text()); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${appName}-rn.zip`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1>Feature → Code Generator</h1>
      <div style={{ marginTop: 20 }}>
        <label>App Name</label>
        <input value={appName} onChange={e => setAppName(e.target.value)}
               style={{ display: "block", width: "100%", padding: 10, marginTop: 6 }} />
      </div>
      <div style={{ marginTop: 16 }}>
        <label>Include Signup screen?</label>
        <input type="checkbox" checked={signup} onChange={e => setSignup(e.target.checked)} style={{ marginLeft: 8 }} />
      </div>
      <div style={{ marginTop: 16 }}>
        <label>Package Manager</label>
        <select value={pkgMgr} onChange={e => setPkgMgr(e.target.value as any)} style={{ marginLeft: 8 }}>
          <option value="yarn">yarn</option><option value="pnpm">pnpm</option><option value="npm">npm</option>
        </select>
      </div>
      <button onClick={generate} style={{ marginTop: 24, padding: "10px 16px" }}>Generate ZIP</button>
    </main>
  );
}
TSX

# API route: render templates → zip
cat > src/app/api/generate/route.ts <<'TS'
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import Mustache from "mustache";
import AdmZip from "adm-zip";

type Payload = {
  appName: string;
  features: { login: boolean; signup: boolean };
  useTypescript: boolean;
  packageManager: "yarn" | "pnpm" | "npm";
  expoSdk: string;
  rnVersion: string;
};

const TPL_ROOT = path.join(process.cwd(), "lib", "templates");

function render(buildDir: string, relPath: string, data: Payload) {
  const tplPath = path.join(TPL_ROOT, relPath);
  if (!fs.existsSync(tplPath)) throw new Error("Template not found: " + relPath);
  const tpl = fs.readFileSync(tplPath, "utf8");
  const outRel = relPath.startsWith("app/") ? relPath.slice(4) : relPath; // app/* to ZIP root
  const dest = path.join(buildDir, outRel.replace(/\.mustache$/, ""));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const out = Mustache.render(tpl, data as any);
  fs.writeFileSync(dest, out, "utf8");
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Payload;
  const buildDir = fs.mkdtempSync(path.join(os.tmpdir(), "rn-gen-"));

  // base
  [
    "app/package.json.mustache",
    "app/app.json.mustache",
    "app/babel.config.js.mustache",
    "app/index.js.mustache",
    "app/tsconfig.json.mustache",
    "src/App.tsx.mustache",
    "src/components/GlobalButton.tsx.mustache",
    "src/components/GlobalTextInput.tsx.mustache",
    "src/utils/validators.ts.mustache",
    "src/navigation/RootNavigator.tsx.mustache"
  ].forEach((p) => render(buildDir, p, body));

  // conditional
  render(buildDir, "src/screens/LoginScreen.tsx.mustache", body);
  if (body.features?.signup) render(buildDir, "src/screens/SignupScreen.tsx.mustache", body);

  const zip = new AdmZip();
  zip.addLocalFolder(buildDir);
  return new NextResponse(zip.toBuffer(), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${body.appName || "App"}-rn.zip"`
    }
  });
}
TS

# RN templates (Expo + React Navigation + Formik/Yup)
cat > lib/templates/app/package.json.mustache <<'TPL'
{
  "name": "{{appName}}",
  "version": "1.0.0",
  "private": true,
  "main": "index.js",
  "scripts": { "start": "expo start", "android": "expo run:android", "ios": "expo run:ios" },
  "dependencies": {
    "expo": "~{{expoSdk}}",
    "react": "18.2.0",
    "react-native": "{{rnVersion}}",
    "@react-navigation/native": "*",
    "@react-navigation/native-stack": "*",
    "react-native-gesture-handler": "*",
    "react-native-safe-area-context": "*",
    "react-native-screens": "*",
    "formik": "*",
    "yup": "*"
  },
  "devDependencies": { "typescript": "*", "@types/react": "*", "@types/react-native": "*" }
}
TPL

cat > lib/templates/app/app.json.mustache <<'TPL'
{ "expo": { "name": "{{appName}}", "slug": "{{appName}}", "scheme": "{{appName}}", "version": "1.0.0" } }
TPL

cat > lib/templates/app/babel.config.js.mustache <<'TPL'
module.exports = function(api){ api.cache(true); return { presets:['babel-preset-expo'], plugins:['react-native-reanimated/plugin'] }; };
TPL

cat > lib/templates/app/index.js.mustache <<'TPL'
import { registerRootComponent } from 'expo';
import App from './src/App';
registerRootComponent(App);
TPL

cat > lib/templates/app/tsconfig.json.mustache <<'TPL'
{ "compilerOptions": { "target":"es2017","module":"esnext","jsx":"react-jsx","strict":true,"skipLibCheck":true,"baseUrl":".","paths":{ "@/*":["src/*"] } } }
TPL

cat > lib/templates/src/App.tsx.mustache <<'TPL'
import React from "react";
import RootNavigator from "./navigation/RootNavigator";
export default function App(){ return <RootNavigator/>; }
TPL

cat > lib/templates/src/navigation/RootNavigator.tsx.mustache <<'TPL'
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/LoginScreen";
{{#features.signup}}import SignupScreen from "../screens/SignupScreen";{{/features.signup}}
const Stack = createNativeStackNavigator();
export default function RootNavigator(){
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown:false }}>
        <Stack.Screen name="Login" component={LoginScreen}/>
        {{#features.signup}}<Stack.Screen name="Signup" component={SignupScreen}/>{{/features.signup}}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
TPL

cat > lib/templates/src/components/GlobalButton.tsx.mustache <<'TPL'
import React from "react";
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle } from "react-native";
type Props = { label:string; onPress:()=>void; loading?:boolean; style?:ViewStyle };
export default function GlobalButton({ label, onPress, loading, style }: Props){
  return (
    <TouchableOpacity onPress={onPress} style={[{ backgroundColor:"#6C5CE7", padding:14, borderRadius:12, alignItems:"center" }, style]} disabled={loading}>
      {loading ? <ActivityIndicator/> : <Text style={{ color:"white", fontWeight:"600" }}>{label}</Text>}
    </TouchableOpacity>
  );
}
TPL

cat > lib/templates/src/components/GlobalTextInput.tsx.mustache <<'TPL'
import React from "react";
import { TextInput, View, Text } from "react-native";
export default function GlobalTextInput({ value, onChangeText, placeholder, error, secureTextEntry }: any){
  return (
    <View style={{ marginBottom:12 }}>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#9AA0A6" secureTextEntry={secureTextEntry}
        style={{ backgroundColor:"#1F2430", color:"white", borderRadius:12, padding:14, borderWidth:1, borderColor: error ? "#EF4444" : "transparent" }}/>
      {!!error && <Text style={{ color:"#EF4444", marginTop:6 }}>{error}</Text>}
    </View>
  );
}
TPL

cat > lib/templates/src/utils/validators.ts.mustache <<'TPL'
import * as Yup from "yup";
export const loginSchema = Yup.object({ email: Yup.string().email("Invalid email").required("Required"), password: Yup.string().min(6,"Min 6 chars").required("Required") });
export const signupSchema = Yup.object({
  name: Yup.string().min(2,"Too short").required("Required"),
  email: Yup.string().email("Invalid email").required("Required"),
  password: Yup.string().min(6,"Min 6 chars").required("Required"),
  confirmPassword: Yup.string().oneOf([Yup.ref("password")],"Passwords must match").required("Required")
});
TPL

cat > lib/templates/src/screens/LoginScreen.tsx.mustache <<'TPL'
import React from "react";
import { View, Text } from "react-native";
import { Formik } from "formik";
import GlobalTextInput from "../components/GlobalTextInput";
import GlobalButton from "../components/GlobalButton";
import { loginSchema } from "../utils/validators";
export default function LoginScreen({ navigation }: any){
  return (
    <View style={{ flex:1, backgroundColor:"#0F1420", padding:20, justifyContent:"center" }}>
      <Text style={{ fontSize:24, color:"white", fontWeight:"700", marginBottom:20 }}>Login</Text>
      <Formik initialValues={{ email:"", password:"" }} validationSchema={loginSchema} onSubmit={() => {}}>
        {({ handleChange, handleSubmit, values, errors, touched }) => (
          <>
            <GlobalTextInput value={values.email} onChangeText={handleChange("email")} placeholder="Email" error={touched.email && errors.email}/>
            <GlobalTextInput value={values.password} onChangeText={handleChange("password")} placeholder="Password" secureTextEntry error={touched.password && errors.password}/>
            {{#features.signup}}<Text onPress={() => navigation.navigate("Signup")} style={{ color:"#A5B4FC", marginBottom:12 }}>Go to Sign up</Text>{{/features.signup}}
            <GlobalButton label="Login" onPress={handleSubmit as any}/>
          </>
        )}
      </Formik>
    </View>
  );
}
TPL

cat > lib/templates/src/screens/SignupScreen.tsx.mustache <<'TPL'
import React from "react";
import { View, Text } from "react-native";
import { Formik } from "formik";
import GlobalTextInput from "../components/GlobalTextInput";
import GlobalButton from "../components/GlobalButton";
import { signupSchema } from "../utils/validators";
export default function SignupScreen({ navigation }: any){
  return (
    <View style={{ flex:1, backgroundColor:"#0F1420", padding:20, justifyContent:"center" }}>
      <Text style={{ fontSize:24, color:"white", fontWeight:"700", marginBottom:20 }}>Sign up</Text>
      <Formik initialValues={{ name:"", email:"", password:"", confirmPassword:"" }} validationSchema={signupSchema} onSubmit={() => navigation.goBack()}>
        {({ handleChange, handleSubmit, values, errors, touched }) => (
          <>
            <GlobalTextInput value={values.name} onChangeText={handleChange("name")} placeholder="Full name" error={touched.name && errors.name}/>
            <GlobalTextInput value={values.email} onChangeText={handleChange("email")} placeholder="Email" error={touched.email && errors.email}/>
            <GlobalTextInput value={values.password} onChangeText={handleChange("password")} placeholder="Password" secureTextEntry error={touched.password && errors.password}/>
            <GlobalTextInput value={values.confirmPassword} onChangeText={handleChange("confirmPassword")} placeholder="Confirm password" secureTextEntry error={touched.confirmPassword && errors.confirmPassword}/>
            <GlobalButton label="Create account" onPress={handleSubmit as any}/>
          </>
        )}
      </Formik>
    </View>
  );
}
TPL

# install deps now so you're ready to run
yarn install --silent
echo "✅ Bootstrap complete."
echo "Next:"
echo "  yarn dev"
echo "Then open http://localhost:3000"
