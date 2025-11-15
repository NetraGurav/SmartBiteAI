import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({});
  const [wasteAnalysis, setWasteAnalysis] = useState({});
  const [nutritionReport, setNutritionReport] = useState({});
  const [healthInsights, setHealthInsights] = useState({});

  useEffect(() => {
    fetchDashboardData();
    fetchWasteAnalysis();
    fetchNutritionReport();
    fetchHealthInsights();
  }, []);

  // Refetch nutrition when user opens the Nutrition tab to allow on-demand enrichment
  useEffect(() => {
    if (activeTab === 'nutrition') {
      fetchNutritionReport();
    }
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/api/reports/dashboard');
      
      if (response.data.success) {
        setDashboardData(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchWasteAnalysis = async () => {
    try {
      const response = await api.get('/api/reports/waste-analysis');
      
      if (response.data.success) {
        setWasteAnalysis(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch waste analysis:', error);
    }
  };

  const fetchNutritionReport = async (attempts = 2) => {
    try {
      const response = await api.get('/api/reports/nutrition', {
        params: { enrich: true, limit: 50, persist: true }
      });
      if (response.data.success) {
        setNutritionReport(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch nutrition report:', error);
      if (attempts > 0) {
        // Small delay, then retry
        setTimeout(() => fetchNutritionReport(attempts - 1), 800);
      }
    }
  };

  const fetchHealthInsights = async () => {
    try {
      const response = await api.get('/api/reports/health-insights');
      
      if (response.data.success) {
        setHealthInsights(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch health insights:', error);
    }
  };

  // CSV export removed per requirement; only PDF is supported now.

  const exportPDF = async () => {
    try {
      const response = await api.get('/api/reports/export/pdf', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `smartbite-report-${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF report downloaded successfully');
    } catch (error) {
      console.error('Failed to export PDF:', error);
      toast.error('Failed to export PDF report');
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              📊 Reports & Analytics
            </h1>
            <div className="flex space-x-2">
              <button
                onClick={exportPDF}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                📋 Export PDF
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'dashboard', name: 'Overview', icon: '📈' },
                { id: 'waste', name: 'Waste Analysis', icon: '🗑️' },
                { id: 'nutrition', name: 'Nutrition', icon: '🥗' },
                { id: 'health', name: 'Health Insights', icon: '⚕️' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Dashboard Overview Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">
                    {dashboardData.overview?.totalFoods || 0}
                  </div>
                  <div className="text-sm text-blue-800">Total Food Items</div>
                </div>
                <div className="bg-red-50 p-6 rounded-lg">
                  <div className="text-3xl font-bold text-red-600">
                    {dashboardData.overview?.expiredFoods || 0}
                  </div>
                  <div className="text-sm text-red-800">Expired Items</div>
                </div>
                <div className="bg-yellow-50 p-6 rounded-lg">
                  <div className="text-3xl font-bold text-yellow-600">
                    {dashboardData.overview?.expiringSoon || 0}
                  </div>
                  <div className="text-sm text-yellow-800">Expiring Soon</div>
                </div>
                <div className="bg-green-50 p-6 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">
                    {dashboardData.overview?.wastePercentage || 0}%
                  </div>
                  <div className="text-sm text-green-800">Waste Rate</div>
                </div>
              </div>

              {/* Category Breakdown */}
              {dashboardData.categoryStats && Object.keys(dashboardData.categoryStats).length > 0 && (
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Food Categories</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(dashboardData.categoryStats).map(([category, count]) => (
                      <div key={category} className="text-center">
                        <div className="text-2xl font-bold text-gray-700">{count}</div>
                        <div className="text-sm text-gray-600">{category}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Monthly Trends */}
              {dashboardData.monthlyTrends && dashboardData.monthlyTrends.length > 0 && (
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Trends</h3>
                  <div className="space-y-3">
                    {dashboardData.monthlyTrends.map((month, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <span className="font-medium">{month.month}</span>
                        <div className="flex space-x-4 text-sm">
                          <span className="text-green-600">+{month.added} added</span>
                          <span className="text-red-600">{month.expired} expired</span>
                          <span className="text-gray-600">{month.wastePercentage}% waste</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              {dashboardData.recentActivity && dashboardData.recentActivity.length > 0 && (
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {dashboardData.recentActivity.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <span className="font-medium">{item.name}</span>
                          {item.brand && <span className="text-gray-600 ml-2">({item.brand})</span>}
                        </div>
                        <div className="text-sm text-gray-600">
                          Added {new Date(item.addedDate).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Waste Analysis Tab */}
          {activeTab === 'waste' && (
            <div className="space-y-6">
              {/* Waste Summary */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="bg-red-50 p-6 rounded-lg">
                  <div className="text-3xl font-bold text-red-600">
                    {wasteAnalysis.summary?.totalExpired || 0}
                  </div>
                  <div className="text-sm text-red-800">Items Wasted</div>
                </div>
                <div className="bg-purple-50 p-6 rounded-lg">
                  <div className="text-3xl font-bold text-purple-600">
                    {wasteAnalysis.summary?.totalUnits || 0}
                  </div>
                  <div className="text-sm text-purple-800">Units Wasted</div>
                </div>
                <div className="bg-yellow-50 p-6 rounded-lg">
                  <div className="text-3xl font-bold text-yellow-600">
                    ₹{Number(wasteAnalysis.summary?.totalValue || 0).toFixed(2)}
                  </div>
                  <div className="text-sm text-yellow-800">Value Lost (INR)</div>
                </div>
                <div className="bg-orange-50 p-6 rounded-lg">
                  <div className="text-3xl font-bold text-orange-600">
                    ₹{Number(wasteAnalysis.summary?.averageValuePerItem || 0).toFixed(2)}
                  </div>
                  <div className="text-sm text-orange-800">Avg. Value/Item (INR)</div>
                </div>
                <div className="bg-green-50 p-6 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">
                    ₹{Number(wasteAnalysis.summary?.averageValuePerUnit || 0).toFixed(2)}
                  </div>
                  <div className="text-sm text-green-800">Avg. Value/Unit (INR)</div>
                </div>
              </div>

              {/* Waste by Category */}
              {wasteAnalysis.wasteByCategory && Object.keys(wasteAnalysis.wasteByCategory).length > 0 && (
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Waste by Category</h3>
                  <div className="space-y-3">
                    {Object.entries(wasteAnalysis.wasteByCategory).map(([category, data]) => (
                      <div key={category} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <span className="font-medium">{category}</span>
                        <div className="flex space-x-4 text-sm">
                          <span className="text-red-600">{data.count} items</span>
                          <span className="text-yellow-600">₹{Number(data.estimatedValue || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Wasted Items */}
              {wasteAnalysis.topWastedItems && wasteAnalysis.topWastedItems.length > 0 && (
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Most Wasted Items</h3>
                  <div className="space-y-3">
                    {wasteAnalysis.topWastedItems.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <span className="font-medium">{item.name}</span>
                          {item.brand && <span className="text-gray-600 ml-2">({item.brand})</span>}
                        </div>
                        <div className="flex space-x-4 text-sm">
                          <span className="text-red-600">{item.daysExpired} days expired</span>
                          <span className="text-yellow-600">₹{Number(item.estimatedValue || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Nutrition Tab */}
          {activeTab === 'nutrition' && (
            <div className="space-y-6">
              {nutritionReport.summary ? (
                <>
                  {/* Nutrition Summary */}
                  <div className="bg-green-50 p-6 rounded-lg">
                    <h3 className="text-lg font-medium text-green-900 mb-4">
                      Average Nutrition (per 100g)
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {nutritionReport.summary.averageNutrition?.calories || 0}
                        </div>
                        <div className="text-sm text-green-800">Calories</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {nutritionReport.summary.averageNutrition?.protein || 0}g
                        </div>
                        <div className="text-sm text-blue-800">Protein</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {nutritionReport.summary.averageNutrition?.carbohydrates || 0}g
                        </div>
                        <div className="text-sm text-yellow-800">Carbs</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {nutritionReport.summary.averageNutrition?.fat || 0}g
                        </div>
                        <div className="text-sm text-purple-800">Fat</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {nutritionReport.summary.averageNutrition?.fiber || 0}g
                        </div>
                        <div className="text-sm text-orange-800">Fiber</div>
                      </div>
                    </div>
                  </div>

                  {/* Nutrition by Category */}
                  {nutritionReport.nutritionByCategory && Object.keys(nutritionReport.nutritionByCategory).length > 0 && (
                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Nutrition by Category</h3>
                      <div className="space-y-3">
                        {Object.entries(nutritionReport.nutritionByCategory).map(([category, data]) => (
                          <div key={category} className="p-4 bg-gray-50 rounded">
                            <div className="font-medium text-gray-900 mb-2">{category}</div>
                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Calories:</span>
                                <span className="ml-1 font-medium">{data.avgCalories}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Protein:</span>
                                <span className="ml-1 font-medium">{data.avgProtein}g</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Carbs:</span>
                                <span className="ml-1 font-medium">{data.avgCarbs}g</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Fat:</span>
                                <span className="ml-1 font-medium">{data.avgFat}g</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Detailed Per-Item Nutrition */}
                  {nutritionReport.items && nutritionReport.items.length > 0 && (
                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Per-Item Nutrition</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left font-semibold text-gray-700">Item</th>
                              <th className="px-4 py-2 text-right font-semibold text-gray-700">Calories</th>
                              <th className="px-4 py-2 text-right font-semibold text-gray-700">Protein (g)</th>
                              <th className="px-4 py-2 text-right font-semibold text-gray-700">Carbs (g)</th>
                              <th className="px-4 py-2 text-right font-semibold text-gray-700">Fat (g)</th>
                              <th className="px-4 py-2 text-right font-semibold text-gray-700">Fiber (g)</th>
                              <th className="px-4 py-2 text-right font-semibold text-gray-700">Sugar (g)</th>
                              <th className="px-4 py-2 text-right font-semibold text-gray-700">Sodium (mg)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {nutritionReport.items.map((it) => (
                              <tr key={it.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2">
                                  <div className="font-medium text-gray-900">{it.name}</div>
                                  <div className="text-xs text-gray-500">{it.brand || '—'} • {it.category}</div>
                                </td>
                                <td className="px-4 py-2 text-right">{it.nutrition?.calories ?? '—'}</td>
                                <td className="px-4 py-2 text-right">{it.nutrition?.protein ?? '—'}</td>
                                <td className="px-4 py-2 text-right">{it.nutrition?.carbohydrates ?? '—'}</td>
                                <td className="px-4 py-2 text-right">{it.nutrition?.fat ?? '—'}</td>
                                <td className="px-4 py-2 text-right">{it.nutrition?.fiber ?? '—'}</td>
                                <td className="px-4 py-2 text-right">{it.nutrition?.sugar ?? '—'}</td>
                                <td className="px-4 py-2 text-right">{it.nutrition?.sodium ?? '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {nutritionReport.recommendations && nutritionReport.recommendations.length > 0 && (
                    <div className="bg-blue-50 p-6 rounded-lg">
                      <h3 className="text-lg font-medium text-blue-900 mb-4">💡 Nutrition Recommendations</h3>
                      <ul className="space-y-2">
                        {nutritionReport.recommendations.map((rec, index) => (
                          <li key={index} className="text-blue-800">• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <span className="text-6xl">🥗</span>
                  <p className="mt-4 text-lg text-gray-600">No nutrition data available</p>
                  <p className="mt-2 text-sm text-gray-500">
                    Add foods with nutrition information to see detailed reports
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Health Insights Tab */}
          {activeTab === 'health' && (
            <div className="space-y-6">
              {/* Summary */}
              {healthInsights.summary && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-gray-50 p-4 rounded text-center">
                    <div className="text-2xl font-bold text-gray-700">{healthInsights.summary.totalFoods}</div>
                    <div className="text-xs text-gray-500">Total Items</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded text-center">
                    <div className="text-2xl font-bold text-green-700">{healthInsights.summary.safe}</div>
                    <div className="text-xs text-green-700">Safe</div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded text-center">
                    <div className="text-2xl font-bold text-yellow-700">{healthInsights.summary.moderate}</div>
                    <div className="text-xs text-yellow-700">Moderate</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded text-center">
                    <div className="text-2xl font-bold text-orange-700">{healthInsights.summary.risky}</div>
                    <div className="text-xs text-orange-700">Risky</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded text-center">
                    <div className="text-2xl font-bold text-red-700">{healthInsights.summary.harmful}</div>
                    <div className="text-xs text-red-700">Harmful</div>
                  </div>
                </div>
              )}
              {/* Allergen Exposure */}
              {healthInsights.allergenExposure && Object.keys(healthInsights.allergenExposure).length > 0 && (
                <div className="bg-red-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-red-900 mb-4">⚠️ Allergen Exposure</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(healthInsights.allergenExposure).map(([allergen, count]) => (
                      <div key={allergen} className="text-center">
                        <div className="text-2xl font-bold text-red-600">{count}</div>
                        <div className="text-sm text-red-800 capitalize">{allergen}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Disease Risk Foods */}
              {healthInsights.diseaseRiskFoods && Object.keys(healthInsights.diseaseRiskFoods).length > 0 && (
                <div className="bg-yellow-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-yellow-900 mb-4">🏥 Disease Risk Foods</h3>
                  <div className="space-y-3">
                    {Object.entries(healthInsights.diseaseRiskFoods).map(([disease, count]) => (
                      <div key={disease} className="flex justify-between items-center p-3 bg-yellow-100 rounded">
                        <span className="font-medium capitalize">{disease}</span>
                        <span className="text-yellow-800">{count} risky foods</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Health Recommendations */}
              {healthInsights.recommendations && healthInsights.recommendations.length > 0 && (
                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-green-900 mb-4">💚 Health Recommendations</h3>
                  <ul className="space-y-2">
                    {healthInsights.recommendations.map((rec, index) => (
                      <li key={index} className="text-green-800">• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Per-Food Risk Cards */}
              {healthInsights.perFood && healthInsights.perFood.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Per-Food Health Analysis</h3>
                  {healthInsights.perFood.map(item => (
                    <div key={item.id} className="p-4 rounded-lg border flex flex-col md:flex-row md:items-start md:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className={`px-2 py-1 rounded text-xs font-semibold ${
                            item.overallRisk === 'safe' ? 'bg-green-100 text-green-700' :
                            item.overallRisk === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                            item.overallRisk === 'risky' ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {item.overallRisk.toUpperCase()}
                          </div>
                          <div className="font-medium text-gray-900">{item.name}</div>
                          {item.brand && <div className="text-gray-500">({item.brand})</div>}
                        </div>
                        {/* Details */}
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {item.risks.allergens && item.risks.allergens.length > 0 && (
                            <div className="bg-red-50 border border-red-100 p-3 rounded">
                              <div className="font-medium text-red-800 mb-1">Allergens</div>
                              <ul className="text-red-700 list-disc ml-5">
                                {item.risks.allergens.map((r, idx) => (
                                  <li key={idx}>Contains {r.allergen} (found: {r.found})</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {item.risks.diseases && item.risks.diseases.length > 0 && (
                            <div className="bg-yellow-50 border border-yellow-100 p-3 rounded">
                              <div className="font-medium text-yellow-800 mb-1">Disease Risks</div>
                              <ul className="text-yellow-700 list-disc ml-5">
                                {item.risks.diseases.map((r, idx) => (
                                  <li key={idx}>{r.disease}: {r.found} ({r.severity})</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {item.risks.drugs && item.risks.drugs.length > 0 && (
                            <div className="bg-orange-50 border border-orange-100 p-3 rounded">
                              <div className="font-medium text-orange-800 mb-1">Drug Interactions</div>
                              <ul className="text-orange-700 list-disc ml-5">
                                {item.risks.drugs.map((r, idx) => (
                                  <li key={idx}>{r.medication}: {r.found} ({r.severity})</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {item.risks.symptoms && item.risks.symptoms.length > 0 && (
                            <div className="bg-blue-50 border border-blue-100 p-3 rounded">
                              <div className="font-medium text-blue-800 mb-1">Symptom Triggers</div>
                              <ul className="text-blue-700 list-disc ml-5">
                                {item.risks.symptoms.map((r, idx) => (
                                  <li key={idx}>{r.symptom}: {r.found} ({r.severity})</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        {item.recommendations && item.recommendations.length > 0 && (
                          <div className="mt-3 text-sm text-gray-700">
                            <div className="font-medium mb-1">Recommendations:</div>
                            <ul className="list-disc ml-5">
                              {item.recommendations.map((rec, idx) => (
                                <li key={idx}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      {item.alternatives && item.alternatives.length > 0 && (
                        <div className="mt-4 md:mt-0 md:ml-6 w-full md:w-64">
                          <div className="text-sm font-medium text-gray-900 mb-2">Safer Alternatives</div>
                          <div className="space-y-2">
                            {item.alternatives.map(alt => (
                              <div key={alt.id} className="p-2 bg-gray-50 rounded border">
                                <div className="font-medium text-gray-800">{alt.name}</div>
                                <div className="text-xs text-gray-500">{alt.brand} • {alt.category}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {Object.keys(healthInsights).length === 0 && (
                <div className="text-center py-12">
                  <span className="text-6xl">⚕️</span>
                  <p className="mt-4 text-lg text-gray-600">No health insights available</p>
                  <p className="mt-2 text-sm text-gray-500">
                    Complete your health profile to get personalized insights
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
