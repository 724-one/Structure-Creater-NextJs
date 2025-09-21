// src/app/api/generate/route.ts
import { NextResponse } from "next/server";
import AdmZip from "adm-zip";
import Mustache from "mustache";
import path from "path";
import fs from "fs";
import type { AppBlueprint, GenerateRequest } from "../../../../lib/builder/schema";
import { compileToLegacy } from "../../../../lib/builder/compile";

function tryLoad(relPaths: string[]) {
  for (const rel of relPaths) {
    const p = path.join(process.cwd(), rel);
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf-8");
  }
  throw new Error(`Template not found in any of: ${relPaths.join(", ")}`);
}

function renderTemplateOrThrow(templateName: string, template: string, view: any) {
  try { return Mustache.render(template, view); }
  catch (e: any) {
    const keys = view && typeof view === "object" ? Object.keys(view).join(", ") : String(view);
    throw new Error(`Mustache render failed for "${templateName}". Error: ${e?.message || e}. View keys: [${keys}]`);
  }
}

function put(zip: AdmZip, filename: string, contents: string) {
  zip.addFile(filename, Buffer.from(contents, "utf8"));
}

function withSafeDefaultsLegacy(req: GenerateRequest): GenerateRequest {
  const safe = { ...req } as any;
  const nav = {
    hasBottomTabs: Boolean(safe.navigation?.hasBottomTabs),
    tabs: Array.isArray(safe.navigation?.tabs) ? safe.navigation.tabs : [],
    stack: Array.isArray(safe.navigation?.stack) ? safe.navigation.stack : [],
    hasDrawer: Boolean(safe.navigation?.hasDrawer),
    drawerItems: Array.isArray(safe.navigation?.drawerItems) ? safe.navigation.drawerItems : []
  };
  safe.navigation = nav;
  safe.screens = Array.isArray(safe.screens) ? safe.screens : [];
  return safe as GenerateRequest;
}

export async function POST(req: Request) {
  try {
    const incoming: any = await req.json();

    const legacy: GenerateRequest = incoming.meta
      ? compileToLegacy(incoming as AppBlueprint)
      : withSafeDefaultsLegacy(incoming as GenerateRequest);

    const zip = new AdmZip();

    const authScreens = (legacy.screens || [])
      .filter((s) => s.type === "auth")
      .map((s) => ({ name: s.name, route: s.name }));

    const navView = { ...legacy.navigation, authScreens };

    const appConfigTpl = tryLoad([
      "lib/templates-appjs/app.config.js.mustache",
      "lib/templates-appjs/app/app.config.js.mustache",
    ]);
    put(zip, "app.config.js", renderTemplateOrThrow("app.config.js.mustache", appConfigTpl, {
      appName: legacy.appName,
      slug: legacy.slug,
      owner: legacy.owner,
      useLatestExpo: legacy.useLatestExpo,
    }));

    const pkgTpl = tryLoad(["lib/templates-appjs/package.json.mustache"]);
    put(zip, "package.json", renderTemplateOrThrow("package.json.mustache", pkgTpl, {
      slug: legacy.slug,
      appName: legacy.appName,
    }));

    const appTpl = tryLoad(["lib/templates-appjs/App.js.mustache"]);
    put(zip, "App.js", renderTemplateOrThrow("App.js.mustache", appTpl, { appName: legacy.appName }));

    const rootNavTpl = tryLoad(["lib/templates-appjs/src/navigation/RootNavigator.js.mustache"]);
    put(zip, "src/navigation/RootNavigator.js", renderTemplateOrThrow("RootNavigator.js.mustache", rootNavTpl, navView));

    if (legacy.navigation.hasBottomTabs) {
      const bottomTabsTpl = tryLoad([
        "lib/templates-appjs/src/navigation/BottomTabs.js.mustache",
        "lib/builder/templates-appjs/src/navigation/BottomTabs.js.mustache"
      ]);
      put(zip, "src/navigation/BottomTabs.js", renderTemplateOrThrow("BottomTabs.js.mustache", bottomTabsTpl, navView));
    }

    if (legacy.navigation.hasDrawer) {
      const drawerTpl = tryLoad([
        "lib/templates-appjs/src/navigation/Drawer.js.mustache",
        "lib/builder/templates-appjs/src/navigation/Drawer.js.mustache"
      ]);
      put(zip, "src/navigation/Drawer.js", renderTemplateOrThrow("Drawer.js.mustache", drawerTpl, navView));
    }

    const btnTpl = tryLoad(["lib/templates-appjs/src/components/GlobalButton.js.mustache"]);
    put(zip, "src/components/GlobalButton.js", renderTemplateOrThrow("GlobalButton.js.mustache", btnTpl, {}));

    const inputTpl = tryLoad(["lib/templates-appjs/src/components/GlobalTextInput.js.mustache"]);
    put(zip, "src/components/GlobalTextInput.js", renderTemplateOrThrow("GlobalTextInput.js.mustache", inputTpl, {}));

    for (const screen of legacy.screens) {
      const tpl = tryLoad([`lib/templates-appjs/src/screens/${screen.template}.mustache`]);
      const out = screen.type === "auth" ? `src/screens/Auth/${screen.name}.js` : `src/screens/${screen.name}.js`;
      put(zip, out, renderTemplateOrThrow(`${screen.template}.mustache`, tpl, screen.props || {}));
    }

    const data = zip.toBuffer();
    return new NextResponse(data, { status: 200, headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": "attachment; filename=generated-app.zip",
    }});
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
