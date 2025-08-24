import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const statusColors = {
  safe: 'bg-green-100 text-green-800',
  'expiring-week': 'bg-yellow-100 text-yellow-800',
  'expiring-soon': 'bg-orange-100 text-orange-800',
  'expiring-today': 'bg-red-100 text-red-800',
  expired: 'bg-gray-200 text-gray-500',
};

const defaultFood = {
  name: '',
  brand: '',
  quantity: { amount: 1, unit: 'pieces' },
  expiryDate: '',
  category: 'other',
  tags: [],
};

const FoodInventory = () => {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [foodForm, setFoodForm] = useState(defaultFood);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [nutrition, setNutrition] = useState(null);
  const [fetchingNutrition, setFetchingNutrition] = useState(false);

  const fetchFoods = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/foods');
      setFoods(res.data.data);
    } catch (e) {
      toast.error('Failed to load food inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFoods();
  }, []);

  const openAddModal = () => {
    setModalMode('add');
    setFoodForm(defaultFood);
    setShowModal(true);
    setEditingId(null);
  };

  const openEditModal = (food) => {
    setModalMode('edit');
    setFoodForm({ ...food, expiryDate: food.expiryDate ? food.expiryDate.slice(0, 10) : '' });
    setShowModal(true);
    setEditingId(food._id);
  };

  const closeModal = () => {
    setShowModal(false);
    setFoodForm(defaultFood);
    setEditingId(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('quantity.')) {
      setFoodForm((prev) => ({
        ...prev,
        quantity: { ...prev.quantity, [name.split('.')[1]]: value },
      }));
    } else {
      setFoodForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const fetchNutrition = async () => {
    setFetchingNutrition(true);
    setNutrition(null);
    try {
      const res = await api.get(`/api/foods/nutrition?name=${encodeURIComponent(foodForm.name)}`);
      setNutrition(res.data.data);
      toast.success('Nutrition info loaded!');
    } catch (e) {
      toast.error('No nutrition info found.');
    } finally {
      setFetchingNutrition(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const foodData = { ...foodForm, entryMethod: 'manual' };
      if (nutrition) foodData.nutrition = nutrition;
      if (modalMode === 'add') {
        await api.post('/api/foods', foodData);
        toast.success('Food item added!');
      } else {
        await api.put(`/api/foods/${editingId}`, foodData);
        toast.success('Food item updated!');
      }
      fetchFoods();
      closeModal();
      setNutrition(null);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save food item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await api.delete(`/api/foods/${id}`);
      toast.success('Food item deleted');
      fetchFoods();
    } catch (e) {
      toast.error('Failed to delete food item');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Food Inventory</h1>
        <button
          onClick={openAddModal}
          className="px-5 py-2 bg-gradient-to-r from-blue-600 to-green-600 text-white font-semibold rounded-lg shadow-md hover:from-blue-700 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-base transition-all duration-200"
        >
          + Add Food
        </button>
      </div>
      <div className="bg-white shadow rounded-2xl overflow-x-auto">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : foods.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-lg">No food items found. Add your first food item!</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Brand</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Expiry</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {foods.map((food) => (
                <tr key={food._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900 font-medium">{food.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-gray-700">{food.brand || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-gray-700">{food.quantity?.amount} {food.quantity?.unit}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-base text-gray-700">{food.expiryDate ? new Date(food.expiryDate).toLocaleDateString() : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusColors[food.expiryStatus] || 'bg-gray-100 text-gray-700'}`}>
                      {food.expiryStatus?.replace('-', ' ') || 'unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                    <button
                      onClick={() => openEditModal(food)}
                      className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(food._id)}
                      disabled={deletingId === food._id}
                      className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors disabled:opacity-50"
                    >
                      {deletingId === food._id ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold focus:outline-none"
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-6 text-gray-900">{modalMode === 'add' ? 'Add Food Item' : 'Edit Food Item'}</h2>
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  name="name"
                  type="text"
                  required
                  value={foodForm.name}
                  onChange={handleFormChange}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                  placeholder="e.g. Milk, Bread, Apple"
                />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={fetchNutrition}
                  disabled={!foodForm.name || fetchingNutrition}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50"
                >
                  {fetchingNutrition ? 'Fetching...' : 'Fetch Nutrition'}
                </button>
                {nutrition && (
                  <span className="text-green-600 font-semibold">Nutrition loaded</span>
                )}
              </div>
              {nutrition && (
                <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
                  <h3 className="text-lg font-bold mb-2 text-blue-700">Nutrition Facts</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="font-semibold">Calories:</span> {nutrition.calories || '-'} kcal</div>
                    <div><span className="font-semibold">Protein:</span> {nutrition.protein || '-'} g</div>
                    <div><span className="font-semibold">Carbs:</span> {nutrition.carbohydrates || '-'} g</div>
                    <div><span className="font-semibold">Fat:</span> {nutrition.fat || '-'} g</div>
                    <div><span className="font-semibold">Fiber:</span> {nutrition.fiber || '-'} g</div>
                    <div><span className="font-semibold">Sugar:</span> {nutrition.sugar || '-'} g</div>
                    <div><span className="font-semibold">Sodium:</span> {nutrition.sodium || '-'} mg</div>
                    <div><span className="font-semibold">Cholesterol:</span> {nutrition.cholesterol || '-'} mg</div>
                  </div>
                  {nutrition.ingredients && (
                    <div className="mt-2 text-xs text-gray-600"><span className="font-semibold">Ingredients:</span> {nutrition.ingredients}</div>
                  )}
                  {nutrition.allergens && nutrition.allergens.length > 0 && (
                    <div className="mt-2 text-xs text-red-600"><span className="font-semibold">Allergens:</span> {nutrition.allergens.join(', ')}</div>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                <input
                  name="brand"
                  type="text"
                  value={foodForm.brand}
                  onChange={handleFormChange}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                  placeholder="e.g. Amul, Britannia"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    name="quantity.amount"
                    type="number"
                    min={1}
                    value={foodForm.quantity.amount}
                    onChange={handleFormChange}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select
                    name="quantity.unit"
                    value={foodForm.quantity.unit}
                    onChange={handleFormChange}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                  >
                    <option value="pieces">pieces</option>
                    <option value="grams">grams</option>
                    <option value="kilograms">kilograms</option>
                    <option value="milliliters">milliliters</option>
                    <option value="liters">liters</option>
                    <option value="packets">packets</option>
                    <option value="cans">cans</option>
                    <option value="bottles">bottles</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                <input
                  name="expiryDate"
                  type="date"
                  required
                  value={foodForm.expiryDate}
                  onChange={handleFormChange}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  name="category"
                  value={foodForm.category}
                  onChange={handleFormChange}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-base"
                >
                  <option value="dairy">Dairy</option>
                  <option value="meat">Meat</option>
                  <option value="fruits">Fruits</option>
                  <option value="vegetables">Vegetables</option>
                  <option value="grains">Grains</option>
                  <option value="snacks">Snacks</option>
                  <option value="beverages">Beverages</option>
                  <option value="condiments">Condiments</option>
                  <option value="frozen">Frozen</option>
                  <option value="canned">Canned</option>
                  <option value="bakery">Bakery</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white font-semibold rounded-lg shadow-md hover:from-blue-700 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (modalMode === 'add' ? 'Adding...' : 'Saving...') : (modalMode === 'add' ? 'Add Food' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodInventory; 