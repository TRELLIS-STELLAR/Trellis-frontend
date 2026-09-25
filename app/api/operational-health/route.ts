import { NextResponse } from "next/server";
import { getBugReports } from "@/app/api/bug-reports/route";
import { buildOperationalHealth } from "@/lib/operational-health";

export async function GET() {
  return NextResponse.json(buildOperationalHealth(getBugReports()));
}