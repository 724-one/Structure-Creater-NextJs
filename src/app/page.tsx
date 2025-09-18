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
