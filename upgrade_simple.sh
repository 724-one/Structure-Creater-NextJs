set -e

# 0) Make sure deps exist (safe to re-run)
yarn add mustache adm-zip -E >/dev/null

# 1) Update the Generator UI (adds App Type, Roles, Login/Signup options)
cat > src/app/page.tsx <<'TSX'
"use client";
import { useMemo, useState } from "react";

const APP_TYPES = [
  "Fintech Apps","Trading Apps","Social Media Apps","E-commerce Apps","EdTech Apps","HealthTech Apps",
  "Food & Delivery Apps","Travel & Hospitality Apps","Gaming Apps","Entertainment Apps","Productivity Apps",
  "Utility Apps","Real Estate Apps","Logistics & Transport Apps","GovTech / Civic Apps","Enterprise Apps"
];

export default function Home() {
  const [appName, setAppName] = useState("MyGeneratedApp");
  const [pkgMgr, setPkgMgr] = useState<"yarn"|"pnpm"|"npm">("yarn");
  const [useLatest, setUseLatest] = useState(true);
  const [appType, setAppType] = useState(APP_TYPES[0]);

  // Roles (comma-separated)
  const [rolesInput, setRolesInput] = useState("User");
  const roles = useMemo(() =>
    rolesInput.split(",").map(r => r.trim()).filter(Boolean), [rolesInput]);

  // Auth toggles
  const [enableLogin, setEnableLogin] = useState(true);
  const [enableSignup, setEnableSignup] = useState(true);
  const [phoneOnly, setPhoneOnly] = useState(false);
  const [socialLogins, setSocialLogins] = useState(false); // Google/Apple buttons

  // Signup fields
  const [sf, setSf] = useState({
    firstName: true, lastName: true, email: true, password: true,
    confirmPassword: true, phone: false, dob: false
  });
  const toggleField = (k: keyof typeof sf) => setSf(s => ({...s, [k]: !s[k]}));

  const generate = async () => {
    const payload = {
      appName, packageManager: pkgMgr, useLatest,
      expoSdk: "53.0.0", rnVersion: "0.79.0",
      appType,
      roles,
      features: { enableLogin, enableSignup, phoneOnly, socialLogins, signupFields: sf }
    };

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${appName}-rn.zip`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("Generate failed: " + (e?.message ?? e));
    }
  };

  return (
    <main style={{ maxWidth: 900, margin: "32px auto", padding: 16 }}>
      <h1>Structure-Creater-NextJs</h1>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
        <div>
          <label>App Name</label>
          <input value={appName} onChange={e=>setAppName(e.target.value)}
                 style={{ display:"block", width:"100%", padding:10, marginTop:6 }} />
        </div>

        <div>
          <label>Package Manager</label><br/>
          <select value={pkgMgr} onChange={e=>setPkgMgr(e.target.value as any)} style={{ padding:10, marginTop:6 }}>
            <option value="yarn">yarn</option><option value="pnpm">pnpm</option><option value="npm">npm</option>
          </select>
        </div>

        <div>
          <label>Type of App</label><br/>
          <select value={appType} onChange={e=>setAppType(e.target.value)} style={{ padding:10, marginTop:6, width:"100%" }}>
            {APP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label>Use latest RN/Expo?</label>
          <div><input type="checkbox" checked={useLatest} onChange={e=>setUseLatest(e.target.checked)} /> Latest</div>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label>How many types of users?</label>
          <div style={{ fontSize:12, opacity:.8, marginTop:4 }}>Enter comma-separated roles. Example: <code>Customer, Admin, Driver</code></div>
          <input value={rolesInput} onChange={e=>setRolesInput(e.target.value)}
                 style={{ display:"block", width:"100%", padding:10, marginTop:6 }} />
        </div>
      </div>

      <hr style={{ margin:"24px 0", opacity:.3 }} />

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr 1fr" }}>
        <div>
          <h3>Login</h3>
          <div><input type="checkbox" checked={enableLogin} onChange={e=>setEnableLogin(e.target.checked)} /> Enable Login</div>
          <div><input type="checkbox" checked={phoneOnly} onChange={e=>setPhoneOnly(e.target.checked)} /> Phone number only</div>
          <div><input type="checkbox" checked={socialLogins} onChange={e=>setSocialLogins(e.target.checked)} /> Google &amp; Apple buttons</div>
        </div>

        <div>
          <h3>Signup</h3>
          <div><input type="checkbox" checked={enableSignup} onChange={e=>setEnableSignup(e.target.checked)} /> Enable Signup</div>
          <div style={{ marginTop:8, fontWeight:600 }}>Fields</div>
          {Object.keys(sf).map(k => (
            <div key={k}><input type="checkbox" checked={(sf as any)[k]} onChange={()=>toggleField(k as any)} /> {k}</div>
          ))}
        </div>

        <div>
          <h3>Notes</h3>
          <div style={{ fontSize:12, opacity:.8 }}>
            • If multiple roles, a Role Select screen appears first.<br/>
            • Phone-only login is UI-only (no OTP backend).<br/>
            • Google/Apple buttons are UI stubs you can wire later.
          </div>
        </div>
      </div>

      <button onClick={generate} style={{ marginTop: 24, padding:"10px 16px" }}>Generate ZIP</button>
    </main>
  );
}
TSX

# 2) Update the API to generate per-role screens and options
cat > src/app/api/generate/route.ts <<'TS'
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import Mustache from "mustache";
import AdmZip from "adm-zip";

type Features = {
  enableLogin: boolean;
  enableSignup: boolean;
  phoneOnly: boolean;
  socialLogins: boolean;
  signupFields: Record<string, boolean>;
};
type Payload = {
  appName: string;
  packageManager: "yarn" | "pnpm" | "npm";
  useLatest?: boolean;
  expoSdk?: string;
  rnVersion?: string;
  appType?: string;
  roles: string[];
  features: Features;
};

const TPL_ROOT = path.join(process.cwd(), "lib", "templates-appjs");

function toSafeName(name: string) {
  const parts = name.toLowerCase().replace(/[^a-z0-9]+/g," ").trim().split(" ").filter(Boolean);
  return parts.map(p=>p[0].toUpperCase()+p.slice(1)).join("") || "User";
}
function render(buildDir: string, templateRel: string, data: any) {
  const tplPath = path.join(TPL_ROOT, templateRel);
  if (!fs.existsSync(tplPath)) throw new Error("Template not found: " + templateRel);
  const tpl = fs.readFileSync(tplPath, "utf8");
  const outRel = templateRel.startsWith("app/") ? templateRel.slice(4) : templateRel;
  const dest = path.join(buildDir, outRel.replace(/\.mustache$/, ""));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const out = Mustache.render(tpl, data);
  fs.writeFileSync(dest, out, "utf8");
}
function renderAs(buildDir: string, templateRel: string, outRelPath: string, data: any) {
  const tplPath = path.join(TPL_ROOT, templateRel);
  if (!fs.existsSync(tplPath)) throw new Error("Template not found: " + templateRel);
  const tpl = fs.readFileSync(tplPath, "utf8");
  const dest = path.join(buildDir, outRelPath.replace(/\.mustache$/, ""));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const out = Mustache.render(tpl, data);
  fs.writeFileSync(dest, out, "utf8");
}

export async function GET() {
  return NextResponse.json({ ok: true, templatesRoot: TPL_ROOT });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Payload;
    const buildDir = fs.mkdtempSync(path.join(os.tmpdir(), "rn-gen-"));

    const roles = (body.roles && body.roles.length ? body.roles : ["User"]).map(r => ({
      displayName: r, safeName: toSafeName(r)
    }));
    const rolesJson = JSON.stringify(roles);
    const featuresJson = JSON.stringify(body.features || {});

    // Root files
    ["app/package.json.mustache","app/app.config.js.mustache","app/babel.config.js.mustache",
     "app/App.js.mustache","app/.gitignore.mustache","app/README.md.mustache"
    ].forEach(p => render(buildDir, p, body));

    // Ensure assets folders exist
    fs.mkdirSync(path.join(buildDir, "assets"), { recursive: true });
    fs.mkdirSync(path.join(buildDir, "src/assets/images"), { recursive: true });

    // Global components & utilities
    render(buildDir, "src/components/GlobalButton.js.mustache", body);
    render(buildDir, "src/components/GlobalTextInput.js.mustache", body);
    render(buildDir, "src/styles/Theme.js.mustache", body);
    render(buildDir, "src/utils/validators.js.mustache", body);

    // RoleSelect screen if multiple roles
    const initialRoute = roles.length > 1 ? "RoleSelect" : (body.features.enableLogin ? `${roles[0].safeName}Login` : `${roles[0].safeName}Signup`);
    if (roles.length > 1) {
      render(buildDir, "src/screens/RoleSelect.js.mustache", { rolesJson });
    }

    // Navigation aware of roles
    render(buildDir, "src/navigation/RootNavigator.js.mustache", {
      features: body.features,
      roles,
      initialRoute,
      "roles.length_gt_1": roles.length > 1
    });

    // Per-role auth screens
    for (const role of roles) {
      const ctx = { role, features: body.features, featuresJson };
      if (body.features.enableLogin) {
        renderAs(buildDir, "src/screens/auth/LoginScreen.tpl.mustache", `src/screens/${role.safeName}/Auth/LoginScreen.js`, ctx);
      }
      if (body.features.enableSignup) {
        renderAs(buildDir, "src/screens/auth/SignupScreen.tpl.mustache", `src/screens/${role.safeName}/Auth/SignupScreen.js`, ctx);
      }
    }

    // Zip
    const zip = new AdmZip();
    zip.addLocalFolder(buildDir);
    return new NextResponse(zip.toBuffer(), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${body.appName || "App"}-rn.zip"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (e: any) {
    return new NextResponse("Generator error: " + (e?.stack || e), { status: 500 });
  }
}
TS

# 3) Add/Update only the few templates needed for the new options
base="lib/templates-appjs"
mkdir -p "$base"/src/{components,navigation,screens,styles,utils} "$base"/src/screens/auth

# validators (dynamic)
cat > "$base/src/utils/validators.js.mustache" <<'JS'
import * as Yup from "yup";
const F = (f) => !!(f && f === true);

export const loginSchema = (features) => {
  if (features.phoneOnly) {
    return Yup.object({ phone: Yup.string().required("Required") });
  }
  return Yup.object({
    email: Yup.string().email("Invalid email").required("Required"),
    password: Yup.string().min(6, "Min 6 chars").required("Required")
  });
};

export const signupSchema = (features) => {
  const f = features.signupFields || {};
  const shape = {};
  if (F(f.firstName)) shape.firstName = Yup.string().min(2,"Too short").required("Required");
  if (F(f.lastName))  shape.lastName  = Yup.string().min(2,"Too short").required("Required");
  if (F(f.email))     shape.email     = Yup.string().email("Invalid email").required("Required");
  if (F(f.phone))     shape.phone     = Yup.string().required("Required");
  if (F(f.dob))       shape.dob       = Yup.string().required("Required");
  if (F(f.password))  shape.password  = Yup.string().min(6,"Min 6 chars").required("Required");
  if (F(f.confirmPassword) && F(f.password)) {
    shape.confirmPassword = Yup.string().oneOf([Yup.ref("password")],"Passwords must match").required("Required");
  }
  return Yup.object(shape);
};
JS

# role select
cat > "$base/src/screens/RoleSelect.js.mustache" <<'JS'
import React from "react"; import { View, Text, TouchableOpacity, ScrollView } from "react-native";
export default function RoleSelect({ navigation }){
  const roles = {{&rolesJson}};
  return (
    <ScrollView contentContainerStyle={{ flexGrow:1, padding:20, backgroundColor:"#0F1420" }}>
      <Text style={{ fontSize:22, color:"white", fontWeight:"700", marginBottom:16 }}>Select Role</Text>
      {roles.map((r) => (
        <TouchableOpacity key={r.safeName} onPress={() => navigation.navigate(r.safeName + "Login")}
          style={{ backgroundColor:"#1F2430", padding:16, borderRadius:12, marginBottom:12 }}>
          <Text style={{ color:"white", fontSize:16 }}>{r.displayName}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
JS

# root navigator (role-aware)
cat > "$base/src/navigation/RootNavigator.js.mustache" <<'JS'
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
{{#roles.length_gt_1}}import RoleSelect from "../screens/RoleSelect";{{/roles.length_gt_1}}
{{#roles}}
import {{safeName}}Login from "../screens/{{safeName}}/Auth/LoginScreen";
{{#features.enableSignup}}import {{safeName}}Signup from "../screens/{{safeName}}/Auth/SignupScreen";{{/features.enableSignup}}
{{/roles}}
const Stack = createNativeStackNavigator();

export default function RootNavigator(){
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown:false }} initialRouteName="{{initialRoute}}">
        {{#roles.length_gt_1}}<Stack.Screen name="RoleSelect" component={RoleSelect}/>{{/roles.length_gt_1}}
        {{#roles}}
          {{#features.enableLogin}}<Stack.Screen name="{{safeName}}Login" component={{{safeName}}Login}/>{{/features.enableLogin}}
          {{#features.enableSignup}}<Stack.Screen name="{{safeName}}Signup" component={{{safeName}}Signup}/>{{/features.enableSignup}}
        {{/roles}}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
JS

# login/signup templates (role-aware, options)
cat > "$base/src/screens/auth/LoginScreen.tpl.mustache" <<'JS'
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Formik } from "formik";
import GlobalTextInput from "../../components/GlobalTextInput";
import GlobalButton from "../../components/GlobalButton";
import { loginSchema } from "../../utils/validators";

export default function LoginScreen({ navigation }){
  const features = {{&featuresJson}};
  return (
    <View style={{ flex:1, backgroundColor:"#0F1420", padding:20, justifyContent:"center" }}>
      <Text style={{ fontSize:24, color:"white", fontWeight:"700", marginBottom:20 }}>{{role.displayName}} Login</Text>
      <Formik initialValues={{ email:"", password:"", phone:"" }} validationSchema={loginSchema(features)} onSubmit={() => {}}>
        {({ handleChange, handleSubmit, values, errors, touched }) => (
          <>
            {{#features.phoneOnly}}
              <GlobalTextInput value={values.phone} onChangeText={handleChange("phone")} placeholder="Phone number" keyboardType="phone-pad" error={touched.phone && errors.phone} />
            {{/features.phoneOnly}}
            {{^features.phoneOnly}}
              <GlobalTextInput value={values.email} onChangeText={handleChange("email")} placeholder="Email" error={touched.email && errors.email} />
              <GlobalTextInput value={values.password} onChangeText={handleChange("password")} placeholder="Password" secureTextEntry error={touched.password && errors.password} />
            {{/features.phoneOnly}}

            {{#features.enableSignup}}
              <Text onPress={() => navigation.navigate("{{role.safeName}}Signup")} style={{ color:"#A5B4FC", marginBottom:12 }}>
                Go to Sign up
              </Text>
            {{/features.enableSignup}}

            <GlobalButton label="Login" onPress={handleSubmit} />

            {{#features.socialLogins}}
              <View style={{ height:12 }}/>
              <TouchableOpacity style={{ backgroundColor:"#FFFFFF", padding:12, borderRadius:10, marginBottom:8, alignItems:"center" }}>
                <Text style={{ color:"#111827", fontWeight:"600" }}>Continue with Google</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ backgroundColor:"#000000", padding:12, borderRadius:10, alignItems:"center" }}>
                <Text style={{ color:"#FFFFFF", fontWeight:"600" }}>Continue with Apple</Text>
              </TouchableOpacity>
            {{/features.socialLogins}}
          </>
        )}
      </Formik>
    </View>
  );
}
JS

cat > "$base/src/screens/auth/SignupScreen.tpl.mustache" <<'JS'
import React from "react";
import { View, Text } from "react-native";
import { Formik } from "formik";
import GlobalTextInput from "../../components/GlobalTextInput";
import GlobalButton from "../../components/GlobalButton";
import { signupSchema } from "../../utils/validators";

export default function SignupScreen({ navigation }){
  const features = {{&featuresJson}};
  const init = { firstName:"", lastName:"", email:"", phone:"", dob:"", password:"", confirmPassword:"" };
  return (
    <View style={{ flex:1, backgroundColor:"#0F1420", padding:20, justifyContent:"center" }}>
      <Text style={{ fontSize:24, color:"white", fontWeight:"700", marginBottom:20 }}>{{role.displayName}} Sign up</Text>
      <Formik initialValues={init} validationSchema={signupSchema(features)} onSubmit={() => navigation.goBack()}>
        {({ handleChange, handleSubmit, values, errors, touched }) => (
          <>
            {{#features.signupFields.firstName}}<GlobalTextInput value={values.firstName} onChangeText={handleChange("firstName")} placeholder="First name" error={touched.firstName && errors.firstName} />{{/features.signupFields.firstName}}
            {{#features.signupFields.lastName}} <GlobalTextInput value={values.lastName}  onChangeText={handleChange("lastName")}  placeholder="Last name"  error={touched.lastName && errors.lastName} />{{/features.signupFields.lastName}}
            {{#features.signupFields.email}}    <GlobalTextInput value={values.email}     onChangeText={handleChange("email")}     placeholder="Email"      error={touched.email && errors.email} />{{/features.signupFields.email}}
            {{#features.signupFields.phone}}    <GlobalTextInput value={values.phone}     onChangeText={handleChange("phone")}     placeholder="Phone"      keyboardType="phone-pad" error={touched.phone && errors.phone} />{{/features.signupFields.phone}}
            {{#features.signupFields.dob}}      <GlobalTextInput value={values.dob}       onChangeText={handleChange("dob")}       placeholder="Date of birth (YYYY-MM-DD)" error={touched.dob && errors.dob} />{{/features.signupFields.dob}}
            {{#features.signupFields.password}} <GlobalTextInput value={values.password}  onChangeText={handleChange("password")}  placeholder="Password"   secureTextEntry error={touched.password && errors.password} />{{/features.signupFields.password}}
            {{#features.signupFields.confirmPassword}}<GlobalTextInput value={values.confirmPassword} onChangeText={handleChange("confirmPassword")} placeholder="Confirm password" secureTextEntry error={touched.confirmPassword && errors.confirmPassword} />{{/features.signupFields.confirmPassword}}
            <GlobalButton label="Create account" onPress={handleSubmit}/>
          </>
        )}
      </Formik>
    </View>
  );
}
JS

echo "✅ Upgrade applied."
