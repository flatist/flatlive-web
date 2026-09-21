import { NextResponse } from "next/server";

import { testDatabaseConnection } from "@/lib/db/postgres";

export async function GET() {
  try {
    const db = await testDatabaseConnection();

    return NextResponse.json({
      success: true,
      database: db.database_name,
      user: db.database_user,
    });
  } catch (error) {
    console.error("[DB_HEALTH_ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        error: "DATABASE_CONNECTION_FAILED",
      },
      {
        status: 500,
      },
    );
  }
}
