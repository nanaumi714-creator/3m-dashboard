import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/database.types";

type ExpenseCategory = Database["public"]["Tables"]["expense_categories"]["Row"];
type CategoryPreference =
  Database["public"]["Tables"]["user_category_preferences"]["Row"];

export type ExpenseCategoryWithUserVisibility = ExpenseCategory & {
  user_visible: boolean;
};

function isMissingPreferenceTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return (
    candidate.code === "PGRST205" ||
    candidate.message?.includes("user_category_preferences") === true
  );
}

function applyVisibility(
  categories: ExpenseCategory[],
  preferences: Pick<CategoryPreference, "category_id" | "is_visible">[]
) {
  const hiddenCategoryIds = new Set(
    preferences
      .filter((pref) => pref.is_visible === false)
      .map((pref) => pref.category_id)
  );

  return categories.filter((category) => !hiddenCategoryIds.has(category.id));
}

export async function fetchVisibleExpenseCategories(
  supabase: SupabaseClient<Database>,
  options?: { includeInactive?: boolean }
) {
  let query = supabase.from("expense_categories").select("*").order("name");
  if (!options?.includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data: categories, error: categoryError } = await query;
  if (categoryError) throw categoryError;

  const categoryList = (categories || []) as ExpenseCategory[];
  if (categoryList.length === 0) return [] as ExpenseCategory[];

  const { data: preferences, error: preferenceError } = await supabase
    .from("user_category_preferences")
    .select("category_id, is_visible")
    .in(
      "category_id",
      categoryList.map((category) => category.id)
    );

  if (preferenceError) {
    if (isMissingPreferenceTableError(preferenceError)) {
      return categoryList;
    }
    throw preferenceError;
  }

  return applyVisibility(
    categoryList,
    (preferences || []) as Pick<CategoryPreference, "category_id" | "is_visible">[]
  );
}

export async function fetchExpenseCategoriesWithUserVisibility(
  supabase: SupabaseClient<Database>
) {
  const { data: categories, error: categoryError } = await supabase
    .from("expense_categories")
    .select("*")
    .order("name");

  if (categoryError) throw categoryError;

  const categoryList = (categories || []) as ExpenseCategory[];
  if (categoryList.length === 0) return [] as ExpenseCategoryWithUserVisibility[];

  const { data: preferences, error: preferenceError } = await supabase
    .from("user_category_preferences")
    .select("category_id, is_visible")
    .in(
      "category_id",
      categoryList.map((category) => category.id)
    );

  if (preferenceError) {
    if (isMissingPreferenceTableError(preferenceError)) {
      return categoryList.map((category) => ({ ...category, user_visible: true }));
    }
    throw preferenceError;
  }

  const visibilityMap = new Map<string, boolean>();
  ((preferences || []) as Pick<CategoryPreference, "category_id" | "is_visible">[]).forEach(
    (preference) => {
      visibilityMap.set(preference.category_id, preference.is_visible);
    }
  );

  return categoryList.map((category) => ({
    ...category,
    user_visible: visibilityMap.get(category.id) ?? true,
  }));
}
