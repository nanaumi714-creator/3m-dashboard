'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/database.types'
import { fetchVisibleExpenseCategories } from '@/lib/expense-categories'

type Vendor = Database['public']['Tables']['vendors']['Row']
type ExpenseCategory = Database['public']['Tables']['expense_categories']['Row']
type VendorWithCategory = Vendor & {
  expense_categories?: Pick<ExpenseCategory, "id" | "name"> | null;
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<VendorWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newVendor, setNewVendor] = useState({
    name: "",
    description: "",
    default_category_id: "",
  })
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])

  useEffect(() => {
    loadVendors();
  }, [])

  function getSuggestions(input: string): string[] {
    if (input.length < 2) return [];

    const normalized = input.toLowerCase().replace(/\s+/g, "");
    const similar: string[] = [];

    // Find similar vendor names using simple string matching
    vendors.forEach((vendor) => {
      const vendorNorm = vendor.name.toLowerCase().replace(/\s+/g, "");

      // Partial match
      if (vendorNorm.includes(normalized) && vendor.name !== input) {
        similar.push(vendor.name);
      }
    });

    // Also check transactions for common vendor_raw values
    // (Would need API call in real implementation)

    return similar.slice(0, 5);
  }

  function handleNameChange(value: string) {
    setNewVendor({ ...newVendor, name: value });
    setSuggestions(getSuggestions(value));
  }

  async function loadVendors() { // Renamed from loadData
    try {
      setLoading(true)

      // Load vendors with their default categories
      const { data: vendorsData, error: vendorsError } = await supabase
        .from('vendors')
        .select(`
          *,
          expense_categories:default_category_id (
            id,
            name
          )
        `)
        .order('name')

      if (vendorsError) throw vendorsError

      // Load all categories for dropdown
      const categoriesData = await fetchVisibleExpenseCategories(supabase)

      setVendors((vendorsData || []) as VendorWithCategory[])
      setCategories(categoriesData || [])
    } catch (err) {
      console.error('Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddVendor(e: React.FormEvent) {
    e.preventDefault()

    if (!newVendor.name.trim()) {
      alert('Vendor name is required')
      return
    }

    try {
      const { error } = await supabase
        .from('vendors')
        .insert([{
          name: newVendor.name.trim(),
          description: newVendor.description.trim() || null,
          default_category_id: newVendor.default_category_id || null
        }])

      if (error) throw error

      setNewVendor({ name: '', description: '', default_category_id: '' })
      setShowAddForm(false)
      loadVendors()
    } catch (err) {
      console.error('Error adding vendor:', err)
      alert('Failed to add vendor: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  async function toggleVendorStatus(id: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('vendors')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) throw error
      loadVendors()
    } catch (err) {
      console.error('Error updating vendor:', err)
      alert('Failed to update vendor')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading vendors...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600 bg-red-50 px-4 py-3 rounded-lg">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ベンダー管理</h1>
          <p className="text-gray-600">取引先の情報とデフォルトカテゴリを管理します</p>
        </div>

        {/* Add Vendor Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            + 新しいベンダーを追加
          </button>
        </div>

        {/* Add Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">新しいベンダーを追加</h2>
              <form onSubmit={handleAddVendor}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ベンダー名 *
                    </label>
                    <input
                      type="text"
                      value={newVendor.name}
                      onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="例: Amazon Web Services"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      説明
                    </label>
                    <input
                      type="text"
                      value={newVendor.description}
                      onChange={(e) => setNewVendor({ ...newVendor, description: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="例: クラウドサービス"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      デフォルトカテゴリ
                    </label>
                    <select
                      value={newVendor.default_category_id}
                      onChange={(e) => setNewVendor({ ...newVendor, default_category_id: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">-- カテゴリを選択 --</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false)
                      setNewVendor({ name: '', description: '', default_category_id: '' })
                    }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    追加
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Vendors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendors.map((vendor) => (
            <div key={vendor.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {vendor.name}
                  </h3>
                  {vendor.description && (
                    <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                      {vendor.description}
                    </p>
                  )}
                  {/* @ts-ignore - Supabase join typing issue */}
                  {vendor.expense_categories && (
                    <div className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-md">
                      📁 {/* @ts-ignore */}{vendor.expense_categories.name}
                    </div>
                  )}
                </div>
                <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${vendor.is_active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
                  }`}>
                  {vendor.is_active ? 'アクティブ' : '無効'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-500">
                  {new Date(vendor.created_at).toLocaleDateString('ja-JP')}
                </span>
                <button
                  onClick={() => toggleVendorStatus(vendor.id, vendor.is_active)}
                  className={`text-sm font-medium px-3 py-1 rounded-md transition-colors ${vendor.is_active
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-green-600 hover:bg-green-50'
                    }`}
                >
                  {vendor.is_active ? '無効にする' : '有効にする'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {vendors.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-2">🏢</div>
            <p className="text-gray-500">ベンダーが見つかりません</p>
            <p className="text-sm text-gray-400">最初のベンダーを追加してください</p>
          </div>
        )}
      </div>
    </div>
  )
}
