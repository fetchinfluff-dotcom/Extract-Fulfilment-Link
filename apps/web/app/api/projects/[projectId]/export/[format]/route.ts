import { NextResponse } from "next/server";
import { auditExport, exportProject, getDemoProject } from "../../../../../../lib/demo-store";
import { resolveRequestContext } from "../../../../../../lib/auth";

export async function GET(request: Request, context: { params: Promise<{ projectId: string; format: string }> }) {
  try {
    const { projectId, format } = await context.params;
    if (format !== "html" && format !== "json" && format !== "csv") {
      return NextResponse.json({ error: { code: "BAD_FORMAT", message: "Unsupported export format.", details: {}, requestId: crypto.randomUUID() } }, { status: 400 });
    }
    const requestContext = await resolveRequestContext(request);
    const project = await getDemoProject(projectId, requestContext);
    if (!project) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Project not found.", details: {}, requestId: crypto.randomUUID() } }, { status: 404 });
    await auditExport(project, format, requestContext);
    const body = exportProject(project, format);
    const type = format === "json" ? "application/json" : format === "csv" ? "text/csv" : "text/html";
    return new NextResponse(body, { headers: { "content-type": `${type}; charset=utf-8` } });
  } catch (error) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: error instanceof Error ? error.message : "Authentication is required.", details: {}, requestId: crypto.randomUUID() } }, { status: 401 });
  }
}
