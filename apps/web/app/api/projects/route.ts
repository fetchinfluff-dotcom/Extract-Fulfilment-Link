import { NextResponse } from "next/server";
import { createDemoProject, listDemoProjects } from "../../../lib/demo-store";
import { resolveRequestContext } from "../../../lib/auth";

export async function POST(request: Request) {
  try {
    const context = await resolveRequestContext(request);
    const project = await createDemoProject(await request.json(), context);
    return NextResponse.json({ id: project.id, status: "ready" }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: { code: error instanceof Error && error.message === "Authentication is required." ? "UNAUTHENTICATED" : "PROJECT_CREATE_FAILED", message: error instanceof Error ? error.message : "Unknown error", details: {}, requestId: crypto.randomUUID() } },
      { status: error instanceof Error && error.message === "Authentication is required." ? 401 : 400 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const context = await resolveRequestContext(request);
    return NextResponse.json({ projects: await listDemoProjects(context) });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: error instanceof Error ? error.message : "Authentication is required.", details: {}, requestId: crypto.randomUUID() } },
      { status: 401 }
    );
  }
}
