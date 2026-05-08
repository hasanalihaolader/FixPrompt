import * as vscode from "vscode";
import * as path from "path";

export interface WorkspaceContext {
  framework: string[];
  language: string;
  packageManager: string;
  dependencies: string[];
}

const FRAMEWORK_HINTS: Record<string, string> = {
  next: "Next.js",
  react: "React",
  vue: "Vue",
  nuxt: "Nuxt",
  svelte: "Svelte",
  express: "Express",
  fastify: "Fastify",
  nestjs: "@nestjs/core",
  hono: "Hono",
  prisma: "Prisma",
  drizzle: "drizzle-orm",
  mongoose: "mongoose",
  tailwindcss: "Tailwind CSS",
  trpc: "@trpc/server",
  graphql: "graphql",
  zod: "Zod",
  vitest: "Vitest",
  jest: "Jest",
};

export async function scanWorkspace(): Promise<WorkspaceContext | null> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {return null;}

  const root = folders[0].uri;
  const pkgUri = vscode.Uri.joinPath(root, "package.json");

  let pkg: Record<string, unknown>;
  try {
    const raw = await vscode.workspace.fs.readFile(pkgUri);
    pkg = JSON.parse(Buffer.from(raw).toString("utf8"));
  } catch {
    return null;
  }

  const allDeps: string[] = [
    ...Object.keys((pkg.dependencies as Record<string, string>) ?? {}),
    ...Object.keys((pkg.devDependencies as Record<string, string>) ?? {}),
  ];

  const detectedFrameworks: string[] = [];
  for (const [dep, label] of Object.entries(FRAMEWORK_HINTS)) {
    if (allDeps.some(d => d === dep || d.startsWith(`@${dep}/`) || d === label.toLowerCase())) {
      detectedFrameworks.push(label);
    }
  }

  const hasTsConfig = await fileExists(vscode.Uri.joinPath(root, "tsconfig.json"));
  const language = hasTsConfig ? "TypeScript" : "JavaScript";

  const packageManager = await detectPackageManager(root);

  return {
    framework: detectedFrameworks,
    language,
    packageManager,
    dependencies: allDeps.slice(0, 30),
  };
}

async function fileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

async function detectPackageManager(root: vscode.Uri): Promise<string> {
  if (await fileExists(vscode.Uri.joinPath(root, "pnpm-lock.yaml"))) {return "pnpm";}
  if (await fileExists(vscode.Uri.joinPath(root, "yarn.lock"))) {return "yarn";}
  if (await fileExists(vscode.Uri.joinPath(root, "bun.lockb"))) {return "bun";}
  return "npm";
}

export function formatContext(ctx: WorkspaceContext): string {
  const lines: string[] = [];
  lines.push(`Language: ${ctx.language}`);
  if (ctx.framework.length > 0) {lines.push(`Frameworks/Libraries: ${ctx.framework.join(", ")}`);}
  lines.push(`Package manager: ${ctx.packageManager}`);
  return lines.join("\n");
}
