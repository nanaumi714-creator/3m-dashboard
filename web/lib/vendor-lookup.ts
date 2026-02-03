import { supabaseServer } from "@/lib/supabase-server";

export type VendorSuggestion = {
  vendorId: string | null;
  matchedVendorName: string | null;
  categoryId: string | null;
  businessRatio: number | null;
  isBusiness: boolean | null;
};

type VendorRow = {
  id: string;
  name: string;
  default_category_id: string | null;
  is_active: boolean | null;
};

type VendorRuleRow = {
  is_business: boolean;
  business_ratio: number;
  category_id: string | null;
};

async function findVendorByName(name: string): Promise<VendorRow | null> {
  const { data, error } = await supabaseServer
    .from("vendors")
    .select("id, name, default_category_id, is_active")
    .ilike("name", name)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (error) {
    return null;
  }

  return data ? (data as VendorRow) : null;
}

async function findVendorByAlias(name: string): Promise<VendorRow | null> {
  const { data, error } = await supabaseServer
    .from("vendor_aliases")
    .select("vendor_id")
    .ilike("alias", name)
    .limit(1)
    .single();

  if (error || !data?.vendor_id) {
    return null;
  }

  const { data: vendor, error: vendorError } = await supabaseServer
    .from("vendors")
    .select("id, name, default_category_id, is_active")
    .eq("id", data.vendor_id)
    .eq("is_active", true)
    .single();

  if (vendorError || !vendor) {
    return null;
  }

  return vendor as VendorRow;
}

async function findVendorRule(
  vendorId: string
): Promise<VendorRuleRow | null> {
  const { data, error } = await supabaseServer
    .from("vendor_rules")
    .select("is_business, business_ratio, category_id")
    .eq("vendor_id", vendorId)
    .eq("is_active", true)
    .order("rule_priority", { ascending: true })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data as VendorRuleRow;
}

export async function findVendorSuggestion(
  vendorName: string
): Promise<VendorSuggestion> {
  const trimmed = vendorName.trim();
  if (!trimmed) {
    return {
      vendorId: null,
      matchedVendorName: null,
      categoryId: null,
      businessRatio: null,
      isBusiness: null,
    };
  }

  const vendor =
    (await findVendorByName(trimmed)) || (await findVendorByAlias(trimmed));

  if (!vendor) {
    return {
      vendorId: null,
      matchedVendorName: null,
      categoryId: null,
      businessRatio: null,
      isBusiness: null,
    };
  }

  const rule = await findVendorRule(vendor.id);
  if (rule) {
    return {
      vendorId: vendor.id,
      matchedVendorName: vendor.name,
      categoryId: rule.category_id,
      businessRatio: rule.business_ratio,
      isBusiness: rule.is_business,
    };
  }

  const hasCategory = Boolean(vendor.default_category_id);
  return {
    vendorId: vendor.id,
    matchedVendorName: vendor.name,
    categoryId: vendor.default_category_id,
    businessRatio: hasCategory ? 100 : null,
    isBusiness: hasCategory ? true : null,
  };
}
