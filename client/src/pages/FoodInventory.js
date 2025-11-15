import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

const statusColors = {
  safe: 'bg-green-100 text-green-800',
  'expiring-week': 'bg-yellow-100 text-yellow-800',
  'expiring-soon': 'bg-orange-100 text-orange-800',
  'expiring-today': 'bg-red-100 text-red-800',
  expired: 'bg-gray-200 text-gray-500',
};


const FoodInventory = () => {
  const navigate = useNavigate();
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

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

  const handleAddFood = () => {
    navigate('/add-food');
  };

  const handleEditFood = (food) => {
    navigate(`/add-food?edit=${food._id}`);
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
          onClick={handleAddFood}
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
                      onClick={() => handleEditFood(food)}
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
    </div>
  );
};

export default FoodInventory; 