import { NextResponse } from "next/server";
import { getDemoProject, updateDemoHtml } from "../../../../lib/demo-store";

export async function GET(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;
  const project = await getDemoProject(projectId);
  if (!project) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Project not found.", details: {}, requestId: crypto.randomUUID() } }, { status: 404 });
  return NextResponse.json(project);
}

export async function PATCH(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;
  const body = await request.json() as { html?: unknown };
  if (typeof body.html !== "string") return NextResponse.json({ error: { code: "INVALID_BODY", message: "html is required.", details: {}, requestId: crypto.randomUUID() } }, { status: 400 });
  const project = await updateDemoHtml(projectId, body.html);
  if (!project) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Project not found.", details: {}, requestId: crypto.randomUUID() } }, { status: 404 });
  return NextResponse.json(project);
}
