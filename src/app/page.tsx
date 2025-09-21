// src/app/page.tsx
"use client";
import { useMemo, useState } from "react";
import type { AppBlueprint, ScreenKind, ScreenSpecV2 } from "../../lib/builder/schema";
import { FeatureRegistry } from "../../lib/builder/feature-registry";

const CATEGORIES = [
  "Fintech","Trading","Social","E-commerce","EdTech","HealthTech",
  "Food & Delivery","Travel","Gaming","Entertainment","Productivity","Utility",
] as const;

type Category = typeof CATEGORIES[number];

const DEFAULT_SCREENS: Array<{ id: string; kind: ScreenKind; name: string; template: string }> = [
  { id: "Login", kind: "auth", name: "Login", template: "Login" },
  { id: "Signup", kind: "auth", name: "Signup", template: "Signup" },
  { id: "Home", kind: "home", name: "Home", template: "Home" },
  { id: "Settings", kind: "settings", name: "Settings", template: "Settings" },
];

export default function Generator() {
  const [appName, setAppName] = useState("DemoApp");
  const [slug, setSlug] = useState("demo-app");
  const [owner, setOwner] = useState("yasir");
  const [category, setCategory] = useState<Category>("Productivity");
  const [useLatestExpo, setUseLatestExpo] = useState(true);

  const [navMode, setNavMode] = useState<"stack"|"tabs"|"drawer">("tabs");
  const [selected, setSelected] = useState<Record<string, boolean>>({ Login: true, Signup: true, Home: true, Settings: true });
  const [features, setFeatures] = useState<Record<string, any>>({});

  const selectedScreens: ScreenSpecV2[] = useMemo(() => {
    return DEFAULT_SCREENS.filter(s => selected[s.id]).map(s => ({ ...s, features: features[s.id] || {} }));
  }, [selected, features]);

  function setFeature(screenId: string, dottedKey: string, value: any) {
    setFeatures(prev => {
      const next = { ...(prev[screenId] || {}) } as any;
      const parts = dottedKey.split("."); // e.g., auth.google
      let obj = next;
      for (let i = 0; i < parts.length - 1; i++) {
        const k = parts[i];
        obj[k] = obj[k] || {};
        obj = obj[k];
      }
      obj[parts[parts.length - 1]] = value;
      return { ...prev, [screenId]: next };
    });
  }

  async function generate() {
    const structure: any = navMode === "tabs" ? {
      type: "tabs",
      id: "ROOT_TABS",
      children: [
        ...(selected["Home"] ? [{ tabId: "home", title: "Home", child: { type: "screen", screenId: "Home" } }] : []),
        ...(selected["Settings"] ? [{ tabId: "settings", title: "Settings", child: { type: "screen", screenId: "Settings" } }] : []),
      ]
    } : navMode === "drawer" ? {
      type: "drawer",
      id: "ROOT_DRAWER",
      children: [
        ...(selected["Home"] ? [{ itemId: "home", title: "Home", child: { type: "screen", screenId: "Home" } }] : []),
        ...(selected["Settings"] ? [{ itemId: "settings", title: "Settings", child: { type: "screen", screenId: "Settings" } }] : []),
      ]
    } : {
      type: "stack",
      id: "ROOT_STACK",
      children: [
        ...(selected["Home"] ? [{ type: "screen", screenId: "Home" }] : []),
        ...(selected["Settings"] ? [{ type: "screen", screenId: "Settings" }] : []),
      ]
    };

    const blueprint: AppBlueprint = {
      meta: { appName, slug, owner, category, useLatestExpo },
      navigation: { root: navMode, structure },
      screens: selectedScreens,
      integrations: { authProvider: "none", database: "none", storage: "none", analytics: "expo", push: "expo" }
    };

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(blueprint),
    });
    if (!res.ok) { const j = await res.json().catch(() => ({})); alert(j.error || `HTTP ${res.status}`); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "generated-app.zip"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Structure-Creater-NextJs</h1>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="space-y-1">
          <div className="text-sm font-medium">App Name</div>
          <input className="border rounded px-3 py-2 w-full" value={appName} onChange={(e)=>setAppName(e.target.value)} />
        </label>
        <label className="space-y-1">
          <div className="text-sm font-medium">Slug</div>
          <input className="border rounded px-3 py-2 w-full" value={slug} onChange={(e)=>setSlug(e.target.value)} />
        </label>
        <label className="space-y-1">
          <div className="text-sm font-medium">Owner</div>
          <input className="border rounded px-3 py-2 w-full" value={owner} onChange={(e)=>setOwner(e.target.value)} />
        </label>
        <label className="space-y-1">
          <div className="text-sm font-medium">Category</div>
          <select className="border rounded px-3 py-2 w-full" value={category} onChange={(e)=>setCategory(e.target.value as Category)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={useLatestExpo} onChange={(e)=>setUseLatestExpo(e.target.checked)} /> Use latest Expo
        </label>
        <label className="space-y-1">
          <div className="text-sm font-medium">Navigation Mode</div>
          <select className="border rounded px-3 py-2 w-full" value={navMode} onChange={(e)=>setNavMode(e.target.value as any)}>
            <option value="stack">Stack</option>
            <option value="tabs">Tabs</option>
            <option value="drawer">Drawer</option>
          </select>
        </label>
      </section>

      <section className="p-4 border rounded">
        <div className="font-semibold mb-3">Screens</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {DEFAULT_SCREENS.map(s => (
            <label key={s.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!selected[s.id]}
                onChange={(e)=>setSelected(v=>({ ...v, [s.id]: e.target.checked }))}
              />
              {s.name}
            </label>
          ))}
        </div>
      </section>

      {selectedScreens.map(screen => (
        <section key={screen.id} className="p-4 border rounded">
          <div className="font-semibold mb-2">{screen.name} features</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(FeatureRegistry[screen.kind] || []).map(opt => {
              const [group, key] = opt.key.split(".");
              const current = (((features[screen.id]||{}) as any)[group] || {})[key];
              return (
                <div key={opt.key} className="flex items-center gap-2">
                  {opt.control === "checkbox" && (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(current ?? opt.default)}
                        onChange={(e)=> setFeature(screen.id, opt.key, e.target.checked)}
                      />
                      {opt.label}
                    </label>
                  )}
                  {opt.control === "select" && (
                    <label className="flex items-center gap-2">
                      <span className="min-w-40">{opt.label}</span>
                      <select className="border rounded px-2 py-1"
                        defaultValue={(opt as any).default as any}
                        onChange={(e)=> setFeature(screen.id, opt.key, e.target.value)}>
                        {(opt as any).options.map((o:string)=>(<option key={o} value={o}>{o}</option>))}
                      </select>
                    </label>
                  )}
                  {opt.control === "multi" && (
                    <div>
                      <div className="text-sm">{opt.label}</div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {(opt as any).options.map((o:string)=>{
                          const cur = current || opt.default || [];
                          const checked = cur.includes(o);
                          return (
                            <label key={o} className="flex items-center gap-1 border rounded px-2 py-1">
                              <input type="checkbox" checked={checked}
                                onChange={(e)=> {
                                  const next = new Set(cur);
                                  if (e.target.checked) next.add(o); else next.delete(o);
                                  setFeature(screen.id, opt.key, Array.from(next));
                                }} />
                              {o}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <button onClick={generate} className="px-4 py-2 rounded bg-black text-white">Generate ZIP</button>
    </main>
  );
}
