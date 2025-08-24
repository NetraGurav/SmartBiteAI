import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import NotificationPreferences from '../components/NotificationPreferences';

const defaultPrefs = {
  channels: {
    email: true,
    whatsapp: false,
    sms: false,
    inApp: true,
  },
  expiryDays: 3,
  notificationTime: '09:00',
  types: {
    expiry: true,
    healthWarnings: true,
    suggestions: true,
    summaries: true,
  },
};

const DISEASES = [
  'Diabetes', 'Hypertension', 'Heart Disease', 'Asthma', 'Celiac Disease', 'Kidney Disease', 'Liver Disease', 'Thyroid', 'Cancer', 'Other'
];
const ALLERGIES = [
  'Nuts', 'Shellfish', 'Gluten', 'Milk', 'Eggs', 'Fish', 'Soy', 'Peanuts', 'Sesame', 'Other'
];
const DIETARY_PREFS = [
  'vegetarian', 'vegan', 'keto', 'paleo', 'halal', 'kosher', 'gluten-free', 'dairy-free', 'low-sodium', 'low-sugar'
];

const SYMPTOMS = [
  'Headache', 'Bloating', 'Rashes', 'Nausea', 'Fatigue', 'Cough', 'Fever', 'Shortness of breath', 'Abdominal pain', 'Other'
];

const defaultProfile = {
  diseases: [],
  allergies: [],
  symptoms: [],
  medications: [],
  dietaryPreferences: [],
};

const Profile = () => {
  const [prefs, setPrefs] = useState(defaultPrefs);
  const [profile, setProfile] = useState(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prefsRes, profileRes] = await Promise.all([
          api.get('/api/auth/notification-preferences'),
          api.get('/api/auth/profile'),
        ]);
        setPrefs({ ...defaultPrefs, ...prefsRes.data.data });
        setProfile({
          diseases: profileRes.data.data.user.diseases || [],
          allergies: profileRes.data.data.user.allergies || [],
          symptoms: profileRes.data.data.user.symptoms || [],
          medications: profileRes.data.data.user.medications || [],
          dietaryPreferences: profileRes.data.data.user.dietaryPreferences || [],
        });
      } catch (e) {
        toast.error('Failed to load profile/settings');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line
  }, []);

  // --- Notification Settings Handlers (unchanged) ---
  const handleChannelChange = (channel) => {
    setPrefs((prev) => ({
      ...prev,
      channels: { ...prev.channels, [channel]: !prev.channels[channel] },
    }));
  };
  const handleTypeChange = (type) => {
    setPrefs((prev) => ({
      ...prev,
      types: { ...prev.types, [type]: !prev.types[type] },
    }));
  };
  const handlePrefsInputChange = (e) => {
    const { name, value } = e.target;
    setPrefs((prev) => ({ ...prev, [name]: value }));
  };
  const handleSavePrefs = async (e) => {
    e.preventDefault();
    setSavingPrefs(true);
    try {
      await api.put('/api/auth/notification-preferences', prefs);
      toast.success('Notification settings updated!');
    } catch (e) {
      toast.error('Failed to update notification settings');
    } finally {
      setSavingPrefs(false);
    }
  };

  // --- Health Profile Handlers ---
  const handleProfileChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };
  const handleAddToList = (field, value) => {
    if (!value) return;
    setProfile((prev) => ({ ...prev, [field]: [...prev[field], value] }));
  };
  const handleRemoveFromList = (field, idx) => {
    setProfile((prev) => ({ ...prev, [field]: prev[field].filter((_, i) => i !== idx) }));
  };
  const handleToggleDietaryPref = (pref) => {
    setProfile((prev) => ({
      ...prev,
      dietaryPreferences: prev.dietaryPreferences.includes(pref)
        ? prev.dietaryPreferences.filter((p) => p !== pref)
        : [...prev.dietaryPreferences, pref],
    }));
  };
  const [inputs, setInputs] = useState({ disease: '', allergy: '', symptom: '', medication: '', customDisease: '', customAllergy: '', customSymptom: '' });
  const handleInput = (e) => setInputs({ ...inputs, [e.target.name]: e.target.value });

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/api/auth/profile', profile);
      toast.success('Health profile updated!');
    } catch (e) {
      toast.error('Failed to update health profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow rounded-2xl p-8 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile Settings</h1>
        <h2 className="text-lg font-semibold text-blue-700 mb-4">Health Profile</h2>
        <form onSubmit={handleSaveProfile} className="space-y-8">
          {/* Diseases */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Diseases</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {profile.diseases.map((d, i) => (
                <span key={i} className="inline-flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {d}
                  <button type="button" className="ml-2 text-blue-400 hover:text-blue-700" onClick={() => handleRemoveFromList('diseases', i)}>&times;</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 mb-2">
              <select name="disease" value={inputs.disease} onChange={handleInput} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg">
                <option value="">Select disease</option>
                {DISEASES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <button type="button" onClick={() => { handleAddToList('diseases', inputs.disease); setInputs({ ...inputs, disease: '' }); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Add</button>
            </div>
            <div className="flex gap-2">
              <input name="customDisease" value={inputs.customDisease || ''} onChange={handleInput} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg" placeholder="Add custom disease" />
              <button type="button" onClick={() => { handleAddToList('diseases', inputs.customDisease); setInputs({ ...inputs, customDisease: '' }); }} className="px-4 py-2 bg-blue-500 text-white rounded-lg">Add Custom</button>
            </div>
          </div>
          {/* Allergies */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Allergies</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {profile.allergies.map((a, i) => (
                <span key={i} className="inline-flex items-center bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                  {a}
                  <button type="button" className="ml-2 text-red-400 hover:text-red-700" onClick={() => handleRemoveFromList('allergies', i)}>&times;</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 mb-2">
              <select name="allergy" value={inputs.allergy} onChange={handleInput} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg">
                <option value="">Select allergy</option>
                {ALLERGIES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <button type="button" onClick={() => { handleAddToList('allergies', inputs.allergy); setInputs({ ...inputs, allergy: '' }); }} className="px-4 py-2 bg-red-600 text-white rounded-lg">Add</button>
            </div>
            <div className="flex gap-2">
              <input name="customAllergy" value={inputs.customAllergy || ''} onChange={handleInput} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg" placeholder="Add custom allergy" />
              <button type="button" onClick={() => { handleAddToList('allergies', inputs.customAllergy); setInputs({ ...inputs, customAllergy: '' }); }} className="px-4 py-2 bg-red-500 text-white rounded-lg">Add Custom</button>
            </div>
          </div>
          {/* Symptoms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Symptoms</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {profile.symptoms.map((s, i) => (
                <span key={i} className="inline-flex items-center bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                  {s}
                  <button type="button" className="ml-2 text-yellow-400 hover:text-yellow-700" onClick={() => handleRemoveFromList('symptoms', i)}>&times;</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 mb-2">
              <select name="symptom" value={inputs.symptom} onChange={handleInput} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg">
                <option value="">Select symptom</option>
                {SYMPTOMS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button type="button" onClick={() => { handleAddToList('symptoms', inputs.symptom); setInputs({ ...inputs, symptom: '' }); }} className="px-4 py-2 bg-yellow-500 text-white rounded-lg">Add</button>
            </div>
            <div className="flex gap-2">
              <input name="customSymptom" value={inputs.customSymptom || ''} onChange={handleInput} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg" placeholder="Add custom symptom" />
              <button type="button" onClick={() => { handleAddToList('symptoms', inputs.customSymptom); setInputs({ ...inputs, customSymptom: '' }); }} className="px-4 py-2 bg-yellow-600 text-white rounded-lg">Add Custom</button>
            </div>
          </div>
          {/* Medications */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Medications</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {profile.medications.map((m, i) => (
                <span key={i} className="inline-flex items-center bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                  {m}
                  <button type="button" className="ml-2 text-purple-400 hover:text-purple-700" onClick={() => handleRemoveFromList('medications', i)}>&times;</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input name="medication" value={inputs.medication} onChange={handleInput} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg" placeholder="Add medication" />
              <button type="button" onClick={() => { handleAddToList('medications', inputs.medication); setInputs({ ...inputs, medication: '' }); }} className="px-4 py-2 bg-purple-600 text-white rounded-lg">Add</button>
            </div>
          </div>
          {/* Dietary Preferences */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Dietary Preferences</label>
            <div className="flex flex-wrap gap-2">
              {DIETARY_PREFS.map((pref) => (
                <label key={pref} className={`px-4 py-2 rounded-lg cursor-pointer border ${profile.dietaryPreferences.includes(pref) ? 'bg-green-100 border-green-400 text-green-800 font-semibold' : 'bg-gray-50 border-gray-300 text-gray-700'}`}>
                  <input
                    type="checkbox"
                    checked={profile.dietaryPreferences.includes(pref)}
                    onChange={() => handleToggleDietaryPref(pref)}
                    className="mr-2"
                  />
                  {pref.replace('-', ' ')}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white font-semibold rounded-lg shadow-md hover:from-blue-700 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Health Profile'}
            </button>
          </div>
        </form>
      </div>
      {/* Notification Channels */}
      <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">📢 Notification Channels</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'email', label: 'Email', icon: '📧', description: 'Get notifications via email' },
            { key: 'sms', label: 'SMS', icon: '📱', description: 'Get text messages on your phone' },
            { key: 'whatsapp', label: 'WhatsApp', icon: '💬', description: 'Get WhatsApp messages' },
            { key: 'inApp', label: 'In-App', icon: '🔔', description: 'Show notifications in the app' }
          ].map(channel => (
            <div key={channel.key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{channel.icon}</span>
                <div>
                  <div className="font-medium text-gray-900">{channel.label}</div>
                  <div className="text-sm text-gray-500">{channel.description}</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.notificationPreferences?.channels?.[channel.key] || false}
                  onChange={(e) => {
                    const updatedProfile = {
                      ...profile,
                      notificationPreferences: {
                        ...profile.notificationPreferences,
                        channels: {
                          ...profile.notificationPreferences?.channels,
                          [channel.key]: e.target.checked
                        }
                      }
                    };
                    setProfile(updatedProfile);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
      {/* Notification Preferences */}
      <div className="mt-8">
        <NotificationPreferences />
      </div>
    </div>
  );
};

export default Profile;