declare module "@supabase/auth-helpers-nextjs" {
  import type { SupabaseClient } from "@supabase/supabase-js";
  import type {
    SupabaseClientOptionsWithoutAuth,
    CookieOptionsWithName,
  } from "@supabase/auth-helpers-shared";
  import type { NextRequest, NextResponse } from "next/server";
  import { cookies } from "next/headers";

  type DefaultSchemaName<Database> = "public" extends keyof Database
    ? "public"
    : string & keyof Database;

  export function createClientComponentClient<
    Database = any,
    SchemaName extends string & keyof Database = DefaultSchemaName<Database>
  >(options?: {
    supabaseUrl?: string;
    supabaseKey?: string;
    options?: SupabaseClientOptionsWithoutAuth<SchemaName>;
    cookieOptions?: CookieOptionsWithName;
    isSingleton?: boolean;
  }): SupabaseClient<Database, SchemaName>;

  export function createRouteHandlerClient<
    Database = any,
    SchemaName extends string & keyof Database = DefaultSchemaName<Database>
  >(
    context: { cookies: () => ReturnType<typeof cookies> },
    options?: {
      supabaseUrl?: string;
      supabaseKey?: string;
      options?: SupabaseClientOptionsWithoutAuth<SchemaName>;
      cookieOptions?: CookieOptionsWithName;
    }
  ): SupabaseClient<Database, SchemaName>;

  export function createMiddlewareClient<
    Database = any,
    SchemaName extends string & keyof Database = DefaultSchemaName<Database>
  >(
    context: { req: NextRequest; res: NextResponse },
    options?: {
      supabaseUrl?: string;
      supabaseKey?: string;
      options?: SupabaseClientOptionsWithoutAuth<SchemaName>;
      cookieOptions?: CookieOptionsWithName;
    }
  ): SupabaseClient<Database, SchemaName>;
}
