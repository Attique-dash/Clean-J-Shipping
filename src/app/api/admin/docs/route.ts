import { NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/rbac";
import { promises as fs } from "fs";
import path from "path";

const DOCS_ROOT = path.join(process.cwd(), "src", "docs");

async function listMarkdownFiles(dir: string, base = ""): Promise<Array<{ path: string; name: string }>> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out: Array<{ path: string; name: string }> = [];
  for (const e of entries) {
    if (e.isDirectory()) {
      out.push(...(await listMarkdownFiles(path.join(dir, e.name), path.join(base, e.name))));
    } else if (e.isFile() && e.name.toLowerCase().endsWith(".md")) {
      const rel = path.join(base, e.name).replaceAll("\\", "/");
      out.push({ path: rel, name: e.name.replace(/\.md$/i, "") });
    }
  }
  return out;
}

export async function GET(req: Request) {
  const payload = await getAuthFromRequest(req);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const file = (url.searchParams.get("path") || "").trim();

  try {
    if (!file) {
      const files = await listMarkdownFiles(DOCS_ROOT);
      return NextResponse.json({ docs: files });
    }

    const normalized = path.normalize(file).replace(/^([/\\])+/, "");
    const target = path.join(DOCS_ROOT, normalized);
    const resolved = path.resolve(target);
    if (!resolved.startsWith(DOCS_ROOT)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
    const content = await fs.readFile(resolved, "utf-8");
    return NextResponse.json({ path: normalized, content });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
