import { NextResponse } from "next/server";
import { createDemoProject } from "../../../lib/demo-store";

export async function POST(request: Request) {
  try {
    const project = await createDemoProject(await request.json());
    return NextResponse.json({ id: project.id, status: "ready" }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "PROJECT_CREATE_FAILED", message: error instanceof Error ? error.message : "Unknown error", details: {}, requestId: crypto.randomUUID() } },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ projects: [] });
}
