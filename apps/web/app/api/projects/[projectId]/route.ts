import { NextResponse } from "next/server";
import { getDemoProject, updateDemoHtml } from "../../../../lib/demo-store";
import { resolveRequestContext } from "../../../../lib/auth";

export async function GET(request: Request, context: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await context.params;
    const requestContext = await resolveRequestContext(request);
    const project = await getDemoProject(projectId, requestContext);
    if (!project) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Project not found.", details: {}, requestId: crypto.randomUUID() } }, { status: 404 });
    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: error instanceof Error ? error.message : "Authentication is required.", details: {}, requestId: crypto.randomUUID() } }, { status: 401 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await context.params;
    const requestContext = await resolveRequestContext(request);
    const body = await request.json() as { html?: unknown };
    if (typeof body.html !== "string") return NextResponse.json({ error: { code: "INVALID_BODY", message: "html is required.", details: {}, requestId: crypto.randomUUID() } }, { status: 400 });
    const project = await updateDemoHtml(projectId, body.html, requestContext);
    if (!project) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Project not found.", details: {}, requestId: crypto.randomUUID() } }, { status: 404 });
    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: error instanceof Error ? error.message : "Authentication is required.", details: {}, requestId: crypto.randomUUID() } }, { status: 401 });
  }
}
