import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();

    const { error } = await supabase.from("user_profiles").select("id").limit(1);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          message: "Supabase connected but query failed.",
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Supabase connection is healthy and schema is reachable.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        ok: false,
        message:
          "Supabase health check is unavailable. Ensure SUPABASE_SERVICE_ROLE_KEY is set.",
        error: message,
      },
      { status: 503 },
    );
  }
}
