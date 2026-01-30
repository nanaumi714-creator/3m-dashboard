'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/database.types'

type ExpenseCategory = Database['public']['Tables']['expense_categories']['Row']

export default function CategoriesPage() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCategory, setNewCategory] = useState({ name: '', description: '' })

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (err) {
      console.error('Error loading categories:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault()
    
    if (!newCategory.name.trim()) {
      alert('Category name is required')
      return
    }

    try {
      const { error } = await supabase
        .from('expense_categories')
        .insert([{
          name: newCategory.name.trim(),
          description: newCategory.description.trim() || null
        }])

      if (error) throw error

      setNewCategory({ name: '', description: '' })
      setShowAddForm(false)
      loadCategories()
    } catch (err) {
      console.error('Error adding category:', err)
      alert('Failed to add category: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  async function toggleCategoryStatus(id: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('expense_categories')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) throw error
      loadCategories()
    } catch (err) {
      console.error('Error updating category:', err)
      alert('Failed to update category')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading categories...</div>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">経費カテゴリ</h1>
          <p className="text-gray-600">事業経費の分類を管理します</p>
        </div>

        {/* Add Category Button */}
        <div className="mb-6">
          <button 
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            + 新しいカテゴリを追加
          </button>
        </div>

        {/* Add Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">新しいカテゴリを追加</h2>
              <form onSubmit={handleAddCategory}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      カテゴリ名 *
                    </label>
                    <input
                      type="text"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="例: 通信費"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      説明
                    </label>
                    <input
                      type="text"
                      value={newCategory.description}
                      onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="例: インターネット、電話、ホスティング"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false)
                      setNewCategory({ name: '', description: '' })
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

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <div key={category.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {category.name}
                  </h3>
                  {category.description && (
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {category.description}
                    </p>
                  )}
                </div>
                <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                  category.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {category.is_active ? 'アクティブ' : '無効'}
                </span>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-500">
                  {new Date(category.created_at).toLocaleDateString('ja-JP')}
                </span>
                <button 
                  onClick={() => toggleCategoryStatus(category.id, category.is_active)}
                  className={`text-sm font-medium px-3 py-1 rounded-md transition-colors ${
                    category.is_active 
                      ? 'text-red-600 hover:bg-red-50' 
                      : 'text-green-600 hover:bg-green-50'
                  }`}
                >
                  {category.is_active ? '無効にする' : '有効にする'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {categories.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-2">📁</div>
            <p className="text-gray-500">カテゴリが見つかりません</p>
            <p className="text-sm text-gray-400">最初のカテゴリを追加してください</p>
          </div>
        )}
      </div>
    </div>
  )
}