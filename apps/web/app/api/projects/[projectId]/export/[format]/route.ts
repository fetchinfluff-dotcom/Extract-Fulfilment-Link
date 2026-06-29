import { NextResponse } from "next/server";
import { exportProject, getDemoProject } from "../../../../../../lib/demo-store";

export async function GET(_request: Request, context: { params: Promise<{ projectId: string; format: string }> }) {
  const { projectId, format } = await context.params;
  if (format !== "html" && format !== "json" && format !== "csv") {
    return NextResponse.json({ error: { code: "BAD_FORMAT", message: "Unsupported export format.", details: {}, requestId: crypto.randomUUID() } }, { status: 400 });
  }
  const project = getDemoProject(projectId);
  if (!project) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Project not found.", details: {}, requestId: crypto.randomUUID() } }, { status: 404 });
  const body = exportProject(project, format);
  const type = format === "json" ? "application/json" : format === "csv" ? "text/csv" : "text/html";
  return new NextResponse(body, { headers: { "content-type": `${type}; charset=utf-8` } });
}
