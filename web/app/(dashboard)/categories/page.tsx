"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchExpenseCategoriesWithUserVisibility } from "@/lib/expense-categories";
import { Database } from "@/lib/database.types";

type ExpenseCategory = Database["public"]["Tables"]["expense_categories"]["Row"];
type CategoryWithVisibility = ExpenseCategory & { user_visible: boolean };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryWithVisibility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", description: "" });

  useEffect(() => {
    void loadCategories();
  }, []);

  async function loadCategories() {
    try {
      setLoading(true);
      const data = await fetchExpenseCategoriesWithUserVisibility(supabase);
      setCategories(data);
    } catch (err) {
      console.error("Error loading categories:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategory.name.trim()) {
      alert("カテゴリ名は必須です。");
      return;
    }

    try {
      const { error: insertError } = await supabase.from("expense_categories").insert([
        {
          name: newCategory.name.trim(),
          description: newCategory.description.trim() || null,
        },
      ]);

      if (insertError) throw insertError;

      setNewCategory({ name: "", description: "" });
      setShowAddForm(false);
      await loadCategories();
    } catch (err) {
      console.error("Error adding category:", err);
      alert(`カテゴリ追加に失敗しました: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  async function toggleCategoryStatus(category: CategoryWithVisibility) {
    if (!category.is_active) return;

    try {
      const response = await fetch("/api/categories/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: category.id,
          isVisible: !category.user_visible,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update category visibility.");
      }
      await loadCategories();
    } catch (err) {
      console.error("Error updating category visibility:", err);
      alert("カテゴリ表示設定の更新に失敗しました。");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading categories...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600 bg-red-50 px-4 py-3 rounded-lg">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">カテゴリ管理</h1>
          <p className="text-gray-600 font-medium">ユーザーごとにカテゴリ表示を切り替えできます。</p>
        </div>

        <div className="mb-6">
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-100 active:scale-[0.98]"
          >
            + 新しいカテゴリを追加
          </button>
        </div>

        {showAddForm && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">新しいカテゴリを追加</h2>
              <form onSubmit={handleAddCategory}>
                <div className="space-y-4">
                  <input
                    type="text"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="w-full border-none bg-gray-50 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                    placeholder="カテゴリ名"
                    required
                  />
                  <input
                    type="text"
                    value={newCategory.description}
                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                    className="w-full border-none bg-gray-50 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                    placeholder="説明（任意）"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewCategory({ name: "", description: "" });
                    }}
                    className="bg-white text-gray-700 border border-gray-100 px-6 py-3 rounded-2xl hover:bg-gray-50 transition-all font-bold"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-3 rounded-2xl hover:bg-blue-700 transition-all font-bold"
                  >
                    追加
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => {
            const visibleForUser = category.is_active && category.user_visible;
            return (
              <div key={category.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between mb-4 gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 truncate">{category.name}</h3>
                    {category.description && <p className="text-sm text-gray-600 mt-1">{category.description}</p>}
                  </div>
                  <span
                    className={`inline-flex px-3 py-1 text-xs font-bold rounded-full whitespace-nowrap ${
                      visibleForUser ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {visibleForUser ? "表示中" : "非表示"}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-xs text-gray-500">
                    {new Date(category.created_at).toLocaleDateString("ja-JP")}
                  </span>
                  <button
                    onClick={() => toggleCategoryStatus(category)}
                    disabled={!category.is_active}
                    className={`text-sm font-bold px-3 py-1.5 rounded-xl transition-colors ${
                      !category.is_active
                        ? "text-gray-300 bg-gray-50 cursor-not-allowed"
                        : visibleForUser
                          ? "text-red-600 hover:bg-red-50"
                          : "text-blue-600 hover:bg-blue-50"
                    }`}
                  >
                    {!category.is_active ? "システム無効" : visibleForUser ? "非表示にする" : "表示する"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
