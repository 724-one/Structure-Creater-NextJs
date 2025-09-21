// lib/builder/compile.ts
import type {
  AppBlueprint,
  GenerateRequest,
  LegacyNavigationSpec,
  LegacyScreenSpec,
  NavNode,
  NavScreenRef
} from "./schema";

function isScreenRef(x: any): x is NavScreenRef { return x && x.type === "screen"; }

function collectTopScreens(node: NavNode): string[] {
  if (node.type === "stack") {
    return node.children.flatMap((c) => isScreenRef(c) ? [c.screenId] : collectTopScreens(c as NavNode));
  }
  if (node.type === "tabs") {
    return node.children.flatMap((t) => {
      const child = t.child as any;
      return isScreenRef(child) ? [child.screenId] : collectTopScreens(child);
    });
  }
  // drawer
  return node.children.flatMap((d) => {
    const child = (d as any).child;
    return isScreenRef(child) ? [child.screenId] : collectTopScreens(child);
  });
}

export function compileToLegacy(bp: AppBlueprint): GenerateRequest {
  const appName = bp.meta.appName;
  const slug = bp.meta.slug;
  const owner = bp.meta.owner;
  const useLatestExpo = bp.meta.useLatestExpo;

  const hasBottomTabs = bp.navigation.root === "tabs";
  const hasDrawer = bp.navigation.root === "drawer";

  let tabs: LegacyNavigationSpec["tabs"] = [];
  if (hasBottomTabs && bp.navigation.structure.type === "tabs") {
    tabs = bp.navigation.structure.children.map((t) => {
      const child = t.child as any;
      const screenId = isScreenRef(child) ? child.screenId : collectTopScreens(child)[0];
      return { name: t.title, route: screenId || t.tabId };
    });
  }

  let drawerItems: LegacyNavigationSpec["drawerItems"] = [];
  if (hasDrawer && bp.navigation.structure.type === "drawer") {
    drawerItems = bp.navigation.structure.children.map((d) => {
      const child = (d as any).child;
      const screenId = isScreenRef(child) ? child.screenId : collectTopScreens(child)[0];
      return { name: d.title, route: screenId || d.itemId };
    });
  }

  const authIds = new Set(bp.screens.filter(s => s.kind === "auth").map(s => s.id));
  const top = collectTopScreens(bp.navigation.structure).filter(id => !authIds.has(id));
  const stack = Array.from(new Set(top)).map(id => ({ name: id, route: id }));

  const legacyScreens: LegacyScreenSpec[] = bp.screens.map((s) => ({
    type: s.kind === "auth" ? "auth" : "stack",
    name: s.name,
    template: s.template,
    title: s.title,
    props: { ...(s.props || {}), features: s.features || {} }
  }));

  const navigation: LegacyNavigationSpec = {
    hasBottomTabs,
    tabs,
    stack,
    hasDrawer,
    drawerItems
  };

  return { appName, slug, owner, useLatestExpo, appCategory: bp.meta.category, navigation, screens: legacyScreens };
}
