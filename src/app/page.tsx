"use client";
import { useState } from "react";

export default function Home() {
  const [appName, setAppName] = useState("MyGeneratedApp");
  const [signup, setSignup] = useState(true);
  const [pkgMgr, setPkgMgr] = useState<"yarn" | "pnpm" | "npm">("yarn");
  const [useLatest, setUseLatest] = useState(true); // NEW

  const generate = async () => {
    const payload = {
      appName,
      useTypescript: false,            // Judged-style uses JS
      packageManager: pkgMgr,
      useLatest,                       // NEW
      // fallback pins if you untick "useLatest"
      expoSdk: "53.0.0",
      rnVersion: "0.79.0",
      features: { login: true, signup }
    };

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) { alert(await res.text()); return; }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${appName}-rn.zip`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1>Structure-Creater-NextJs</h1>

      {/* ... existing fields ... */}

      <div style={{ marginTop: 16 }}>
        <label>Use latest RN/Expo?</label>
        <input
          type="checkbox"
          checked={useLatest}
          onChange={(e) => setUseLatest(e.target.checked)}
          style={{ marginLeft: 8 }}
        />
      </div>

      <button onClick={generate} style={{ marginTop: 24, padding: "10px 16px" }}>
        Generate ZIP
      </button>
    </main>
  );
}
