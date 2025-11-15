import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
// Notification preferences are managed in the Notifications page; Profile keeps only contact info

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
  const [contactInfo, setContactInfo] = useState({ email: '', phone: '', whatsapp: '', name: '' });
  const [profile, setProfile] = useState(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const fetchData = async () => {
      try {
        const [prefsRes, profileRes] = await Promise.all([
          api.get('/api/auth/notification-preferences'),
          api.get('/api/auth/profile'),
        ]);
        setPrefs({ ...defaultPrefs, ...prefsRes.data.data });
        setContactInfo(prefsRes.data.data?.contactInfo || { email: '', phone: '', whatsapp: '', name: '' });
        const u = profileRes.data.data.user;
        const mapNames = (arr) => (arr || []).map((x) => {
          if (typeof x === 'string') return x;
          if (!x || typeof x !== 'object') return '';
          const cand = x.name || x.label || x.title || x.disease || x.allergy || x.symptom || x.medication;
          return cand ? String(cand) : '';
        }).filter(Boolean);
        setProfile({
          diseases: mapNames(u.diseases),
          allergies: mapNames(u.allergies),
          symptoms: mapNames(u.symptoms),
          medications: mapNames(u.medications),
          dietaryPreferences: u.dietaryPreferences || [],
        });
      } catch (e) {
        toast.error('Failed to load profile/settings');
      } finally {
        setLoading(false);
      }
    };
  useEffect(() => {
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
      await api.put('/api/auth/notification-preferences', {
        contactInfo: {
          email: String(contactInfo.email || '').trim(),
          phone: String(contactInfo.phone || '').trim(),
          whatsapp: String(contactInfo.whatsapp || '').trim(),
          name: String(contactInfo.name || '').trim()
        }
      });
      toast.success('Contact information updated!');
      await fetchData();
    } catch (e) {
      toast.error('Failed to update contact information');
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
  const [inputs, setInputs] = useState({ disease: '', allergy: '', symptom: '', medication: '' });
  const handleInput = (e) => setInputs({ ...inputs, [e.target.name]: e.target.value });

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Ensure pending selections in inputs are included
      const ensureIncluded = (list, value) => {
        const val = (value || '').trim();
        if (!val) return list;
        return list.includes(val) ? list : [...list, val];
      };
      const payload = {
        ...profile,
        diseases: ensureIncluded(profile.diseases, inputs.disease),
        allergies: ensureIncluded(profile.allergies, inputs.allergy),
        symptoms: ensureIncluded(profile.symptoms, inputs.symptom),
        medications: ensureIncluded(profile.medications, inputs.medication)
      };

      await api.put('/api/auth/profile', payload);
      toast.success('Health profile updated!');
      await fetchData();
      setIsEditing(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow rounded-2xl p-8 mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Your Health Profile</h1>
          {!isEditing && (
            <button onClick={() => setIsEditing(true)} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Edit Profile</button>
          )}
        </div>
        {!isEditing ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 rounded-lg border">
                <div className="text-sm font-medium text-gray-500 mb-1">Diseases</div>
                <div className="text-gray-900">{profile.diseases.join(', ') || '—'}</div>
              </div>
              <div className="p-4 rounded-lg border">
                <div className="text-sm font-medium text-gray-500 mb-1">Allergies</div>
                <div className="text-gray-900">{profile.allergies.join(', ') || '—'}</div>
              </div>
              <div className="p-4 rounded-lg border">
                <div className="text-sm font-medium text-gray-500 mb-1">Symptoms</div>
                <div className="text-gray-900">{profile.symptoms.join(', ') || '—'}</div>
              </div>
              <div className="p-4 rounded-lg border">
                <div className="text-sm font-medium text-gray-500 mb-1">Medications</div>
                <div className="text-gray-900">{profile.medications.join(', ') || '—'}</div>
              </div>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="text-sm font-medium text-gray-500 mb-1">Dietary Preferences</div>
              <div className="text-gray-900">{profile.dietaryPreferences.join(', ') || '—'}</div>
            </div>
            <div>
              <button onClick={() => setIsEditing(true)} className="px-5 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Edit</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveProfile} className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Diseases */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Diseases</label>
                <span className="text-xs text-gray-400">Choose all that apply</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {profile.diseases.map((d, i) => (
                  <span key={i} className="inline-flex items-center bg-blue-50 text-blue-800 px-3 py-1 rounded-full text-xs font-medium border border-blue-200">
                    {d}
                    <button type="button" className="ml-2 text-blue-400 hover:text-blue-700" onClick={() => handleRemoveFromList('diseases', i)}>&times;</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <select name="disease" value={inputs.disease} onChange={handleInput} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                  <option value="">Select disease</option>
                  {DISEASES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <button type="button" onClick={() => { handleAddToList('diseases', inputs.disease); setInputs({ ...inputs, disease: '' }); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Add</button>
              </div>
            </div>
            {/* Allergies */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Allergies</label>
                <span className="text-xs text-gray-400">Choose all that apply</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {profile.allergies.map((a, i) => (
                  <span key={i} className="inline-flex items-center bg-red-50 text-red-800 px-3 py-1 rounded-full text-xs font-medium border border-red-200">
                    {a}
                    <button type="button" className="ml-2 text-red-400 hover:text-red-700" onClick={() => handleRemoveFromList('allergies', i)}>&times;</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <select name="allergy" value={inputs.allergy} onChange={handleInput} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                  <option value="">Select allergy</option>
                  {ALLERGIES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <button type="button" onClick={() => { handleAddToList('allergies', inputs.allergy); setInputs({ ...inputs, allergy: '' }); }} className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700">Add</button>
              </div>
            </div>
            {/* Symptoms */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Symptoms</label>
                <span className="text-xs text-gray-400">Choose all that apply</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {profile.symptoms.map((s, i) => (
                  <span key={i} className="inline-flex items-center bg-yellow-50 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium border border-yellow-200">
                    {s}
                    <button type="button" className="ml-2 text-yellow-500 hover:text-yellow-700" onClick={() => handleRemoveFromList('symptoms', i)}>&times;</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <select name="symptom" value={inputs.symptom} onChange={handleInput} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                  <option value="">Select symptom</option>
                  {SYMPTOMS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button type="button" onClick={() => { handleAddToList('symptoms', inputs.symptom); setInputs({ ...inputs, symptom: '' }); }} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">Add</button>
              </div>
            </div>
            {/* Medications */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Medications</label>
                <span className="text-xs text-gray-400">Add names you take regularly</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {profile.medications.map((m, i) => (
                  <span key={i} className="inline-flex items-center bg-purple-50 text-purple-800 px-3 py-1 rounded-full text-xs font-medium border border-purple-200">
                    {m}
                    <button type="button" className="ml-2 text-purple-400 hover:text-purple-700" onClick={() => handleRemoveFromList('medications', i)}>&times;</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input name="medication" value={inputs.medication} onChange={handleInput} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g., Metformin" />
                <button type="button" onClick={() => { handleAddToList('medications', inputs.medication); setInputs({ ...inputs, medication: '' }); }} className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700">Add</button>
              </div>
            </div>
          </div>
          {/* Dietary Preferences */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Dietary Preferences</label>
            <div className="flex flex-wrap gap-2">
              {DIETARY_PREFS.map((pref) => (
                <label key={pref} className={`px-4 py-2 rounded-full cursor-pointer border text-sm ${profile.dietaryPreferences.includes(pref) ? 'bg-green-100 border-green-400 text-green-800 font-semibold' : 'bg-gray-50 border-gray-300 text-gray-700'}`}>
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
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-emerald-600 text-white font-semibold rounded-lg shadow-md hover:from-indigo-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Health Profile'}
            </button>
          </div>
          </form>
        )}
      </div>
      {/* Contact Information */}
      <div className="mt-8 bg-white shadow rounded-2xl p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">📱 Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={contactInfo.email}
              onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="you@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone (with country code)</label>
            <input
              type="tel"
              value={contactInfo.phone}
              onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="+91XXXXXXXXXX"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp (with country code)</label>
            <input
              type="tel"
              value={contactInfo.whatsapp}
              onChange={(e) => setContactInfo({ ...contactInfo, whatsapp: e.target.value })}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="+91XXXXXXXXXX"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name (for messages)</label>
            <input
              type="text"
              value={contactInfo.name}
              onChange={(e) => setContactInfo({ ...contactInfo, name: e.target.value })}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Your name"
            />
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={handleSavePrefs}
            disabled={savingPrefs}
            className="px-5 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {savingPrefs ? 'Saving...' : 'Save Contact & Preferences'}
          </button>
        </div>
      </div>

      {/* Link to Notification Preferences */}
      <div className="mt-6 flex justify-end">
        <a
          href="/notifications"
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          Configure notification channels and timing →
        </a>
      </div>
    </div>
  );
};

export default Profile;