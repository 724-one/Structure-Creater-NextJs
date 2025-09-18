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
