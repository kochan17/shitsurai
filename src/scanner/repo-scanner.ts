import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

interface RepoContext {
  framework?: string;
  tokens?: string;
  root?: string;
}

export interface DetailedRepoContext extends RepoContext {
  styling?: string;
  componentLibrary?: string;
  routes?: string[];
  cssTokens?: string[];
}

type PackageDeps = Record<string, string>;

interface PackageJson {
  dependencies?: PackageDeps;
  devDependencies?: PackageDeps;
}

function isPackageJson(value: unknown): value is PackageJson {
  return typeof value === "object" && value !== null;
}

function readPackageJson(projectDir: string): PackageJson | undefined {
  const pkgPath = join(projectDir, "package.json");
  if (!existsSync(pkgPath)) return undefined;
  try {
    const raw = readFileSync(pkgPath, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return isPackageJson(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function allDeps(pkg: PackageJson): PackageDeps {
  return { ...pkg.dependencies, ...pkg.devDependencies };
}

function detectFramework(deps: PackageDeps): string | undefined {
  if ("next" in deps) return "Next.js";
  if ("react" in deps) return "React";
  if ("nuxt" in deps) return "Nuxt";
  if ("vue" in deps) return "Vue";
  if ("svelte" in deps || "@sveltejs/kit" in deps) return "Svelte";
  if ("angular" in deps || "@angular/core" in deps) return "Angular";
  return undefined;
}

function detectStyling(deps: PackageDeps, projectDir: string): string | undefined {
  if ("tailwindcss" in deps) return "Tailwind CSS";
  const tailwindConfigs = ["tailwind.config.js", "tailwind.config.ts", "tailwind.config.mjs", "tailwind.config.cjs"];
  if (tailwindConfigs.some((f) => existsSync(join(projectDir, f)))) return "Tailwind CSS";
  if ("styled-components" in deps) return "styled-components";
  if ("@emotion/react" in deps) return "Emotion";
  return undefined;
}

function detectComponentLibrary(deps: PackageDeps, projectDir: string): string | undefined {
  const parts: string[] = [];

  const hasRadix = Object.keys(deps).some((key) => key.startsWith("@radix-ui/"));
  if (hasRadix) {
    parts.push("Radix UI");
  }

  if (existsSync(join(projectDir, "components.json"))) {
    parts.push("shadcn/ui");
  }

  if ("@mui/material" in deps) parts.push("MUI");
  if ("@chakra-ui/react" in deps) parts.push("Chakra UI");

  return parts.length > 0 ? parts.join(", ") : undefined;
}

function collectFiles(dir: string, depth: number): string[] {
  if (depth < 0) return [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    const results: string[] = [];
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...collectFiles(fullPath, depth - 1));
      } else {
        results.push(fullPath);
      }
    }
    return results;
  } catch {
    return [];
  }
}

function toRoutePath(filePath: string, routerRoot: string): string {
  const rel = relative(routerRoot, filePath);
  const withoutFile = rel.replace(/\\/g, "/").replace(/\/[^/]+$/, "");
  if (!withoutFile) return "/";
  const cleaned = withoutFile
    .replace(/\(.*?\)\//g, "")
    .replace(/\[([^\]]+)\]/g, ":$1");
  return "/" + cleaned;
}

function detectNextRoutes(projectDir: string): string[] {
  const appDir = join(projectDir, "app");
  const pagesDir = join(projectDir, "pages");

  if (existsSync(appDir)) {
    const files = collectFiles(appDir, 6);
    const pageFiles = files.filter((f) => /page\.(tsx|ts|jsx|js)$/.test(f));
    const routes = pageFiles
      .map((f) => toRoutePath(f, appDir))
      .filter((r, i, arr) => arr.indexOf(r) === i);
    return routes.slice(0, 20);
  }

  if (existsSync(pagesDir)) {
    const files = collectFiles(pagesDir, 4);
    const pageFiles = files.filter((f) => /\.(tsx|jsx|ts|js)$/.test(f) && !f.includes("_app") && !f.includes("_document"));
    const routes = pageFiles
      .map((f) => {
        const rel = relative(pagesDir, f).replace(/\\/g, "/");
        const withoutExt = rel.replace(/\.(tsx|jsx|ts|js)$/, "");
        if (withoutExt === "index") return "/";
        return "/" + withoutExt.replace(/\/index$/, "");
      })
      .filter((r, i, arr) => arr.indexOf(r) === i);
    return routes.slice(0, 20);
  }

  return [];
}

const CSS_FILE_NAMES = ["globals.css", "global.css", "index.css", "app.css"];
const CSS_TOKEN_PATTERN = /(--[\w-]+)\s*:/g;

function detectCssTokens(projectDir: string): string[] {
  const candidates: string[] = [];

  const srcDir = join(projectDir, "src");
  const appDir = join(projectDir, "app");
  const stylesDir = join(projectDir, "styles");

  for (const dir of [projectDir, srcDir, appDir, stylesDir]) {
    if (!existsSync(dir)) continue;
    for (const name of CSS_FILE_NAMES) {
      const candidate = join(dir, name);
      if (existsSync(candidate)) candidates.push(candidate);
    }
  }

  const tokens: string[] = [];
  for (const filePath of candidates) {
    try {
      const content = readFileSync(filePath, "utf-8");
      CSS_TOKEN_PATTERN.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = CSS_TOKEN_PATTERN.exec(content)) !== null) {
        const token = match[1];
        if (token !== undefined && !tokens.includes(token)) {
          tokens.push(token);
          if (tokens.length >= 30) break;
        }
      }
    } catch {
      // best-effort
    }
    if (tokens.length >= 30) break;
  }

  return tokens;
}

export async function scanRepo(projectDir: string): Promise<DetailedRepoContext> {
  const pkg = readPackageJson(projectDir);
  if (pkg === undefined) return {};

  const deps = allDeps(pkg);
  const framework = detectFramework(deps);
  const styling = detectStyling(deps, projectDir);
  const componentLibrary = detectComponentLibrary(deps, projectDir);

  const routes = framework === "Next.js" ? detectNextRoutes(projectDir) : [];
  const cssTokens = detectCssTokens(projectDir);

  const tokenParts: string[] = [];
  if (styling !== undefined) tokenParts.push(styling);
  if (componentLibrary !== undefined) tokenParts.push(componentLibrary);
  if (cssTokens.length > 0) tokenParts.push(`tokens: ${cssTokens.join(", ")}`);
  const tokens = tokenParts.length > 0 ? tokenParts.join(", ") : undefined;

  const root = routes.length > 0 ? routes.join(", ") : undefined;

  return {
    framework,
    styling,
    componentLibrary,
    tokens,
    root,
    routes: routes.length > 0 ? routes : undefined,
    cssTokens: cssTokens.length > 0 ? cssTokens : undefined,
  };
}
