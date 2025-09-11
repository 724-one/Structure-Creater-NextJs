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
  useTypescript: boolean; // we’ll set false
  packageManager: "yarn" | "pnpm" | "npm";
  useLatest?: boolean;    // NEW
  expoSdk?: string;       // fallback if not latest
  rnVersion?: string;     // fallback if not latest
  features: { login: boolean; signup: boolean };
};

const TPL_ROOT = path.join(process.cwd(), "lib", "templates-appjs");// NEW template root

function render(buildDir: string, relPath: string, data: Payload) {
  const tplPath = path.join(TPL_ROOT, relPath);
  if (!fs.existsSync(tplPath)) throw new Error("Template not found: " + relPath);
  const tpl = fs.readFileSync(tplPath, "utf8");
  const outRel = relPath.startsWith("app/") ? relPath.slice(4) : relPath; // put app/* at ZIP root
  const dest = path.join(buildDir, outRel.replace(/\.mustache$/, ""));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const out = Mustache.render(tpl, data as any);
  fs.writeFileSync(dest, out, "utf8");
}

export async function GET() {
  return NextResponse.json({ ok: true, templatesRoot: TPL_ROOT });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Payload;
    const buildDir = fs.mkdtempSync(path.join(os.tmpdir(), "rn-gen-"));

    // ---- Root files (Judged-style) ----
    render(buildDir, "app/package.json.mustache", body);
    render(buildDir, "app/app.config.js.mustache", body);
    render(buildDir, "app/babel.config.js.mustache", body);
    render(buildDir, "app/App.js.mustache", body);
    render(buildDir, "app/.gitignore.mustache", body);
    render(buildDir, "app/README.md.mustache", body);

    // ---- src folders ----
    [
      "src/navigation/RootNavigator.js.mustache",
      "src/navigation/AuthNavigator.js.mustache",
      "src/components/GlobalButton.js.mustache",
      "src/components/GlobalTextInput.js.mustache",
      "src/utils/validators.js.mustache",
      "src/styles/Theme.js.mustache",
      "src/screens/Auth/LoginScreen.js.mustache",
      "src/screens/Auth/SignupScreen.js.mustache"
    ].forEach((p) => render(buildDir, p, body));

    // Example assets layout
// Create asset folders directly (no templates needed)
fs.mkdirSync(path.join(buildDir, "assets"), { recursive: true });
fs.mkdirSync(path.join(buildDir, "src/assets/images"), { recursive: true });


    // zip it
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
