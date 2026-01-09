import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchStores, Store } from '@/lib/api';
import { API_BASE_URL } from '@/lib/config';
import { useAuth } from '@/contexts/AuthContext';
import { FaStore, FaUser, FaMapMarkerAlt } from 'react-icons/fa';

const REGIONS = [
    { id: 'north', name: 'North' },
    { id: 'south', name: 'South' },
    { id: 'east', name: 'East' },
    { id: 'west', name: 'West' }
];

export function PitchSultanSetup() {
    const navigate = useNavigate();
    const { user, updateUser } = useAuth();
    const [stores, setStores] = useState<Store[]>([]);
    const [name, setName] = useState('');
    const [selectedStore, setSelectedStore] = useState('');
    const [selectedRegion, setSelectedRegion] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const checkUserAndLoadStores = async () => {
            try {
                // 1. Check if user is logged in
                if (!user || !('phone' in user)) {
                    setError('Please login as an SEC user first');
                    setLoading(false);
                    return;
                }

                // 2. Check if Pitch Sultan user already exists with complete profile
                try {
                    const checkRes = await fetch(`${API_BASE_URL}/pitch-sultan/user?phone=${user.phone}`);
                    const checkData = await checkRes.json();
                    if (checkData.success && checkData.data) {
                        // Check if user has completed profile (has name, storeId, AND region)
                        if (checkData.data.name && checkData.data.storeId && checkData.data.region) {
                            // User has complete profile, update localStorage and redirect to battle
                            console.log('✅ User has complete profile, updating localStorage and redirecting to battle');
                            
                            // Update auth context with complete data
                            updateUser({
                                ...user,
                                id: checkData.data.id,
                                secId: checkData.data.secId || user.secId,
                                name: checkData.data.name,
                                storeId: checkData.data.storeId,
                                region: checkData.data.region
                            });
                            
                            navigate('/pitchsultan/battle');
                            return;
                        } else {
                            // User exists but profile incomplete, stay on setup page and pre-fill
                            console.log('⚠️ User exists but profile incomplete, staying on setup');
                            if (checkData.data.name) {
                                setName(checkData.data.name);
                            }
                            if (checkData.data.storeId) {
                                setSelectedStore(checkData.data.storeId);
                            }
                            if (checkData.data.region) {
                                setSelectedRegion(checkData.data.region);
                            }
                        }
                    }
                } catch (e) {
                    // User not found, proceed to setup
                    console.log("User not found, proceeding to setup");
                }

                // 3. Load stores
                const response = await fetchStores();
                if (response.success && response.data) {
                    setStores(response.data);
                } else {
                    setError('Failed to load stores');
                }
            } catch (err) {
                setError('Failed to load stores');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        checkUserAndLoadStores();
    }, [user, navigate]);

    const handleContinue = async () => {
        if (!name.trim()) {
            setError('Please enter your name');
            return;
        }
        if (!selectedStore) {
            setError('Please select a store');
            return;
        }
        if (!selectedRegion) {
            setError('Please select a region');
            return;
        }

        try {
            setLoading(true);

            const phone = user && 'phone' in user ? user.phone : null;
            if (!phone) {
                setError('You must be logged in as an SEC to continue.');
                setLoading(false);
                return;
            }

            const response = await fetch(`${API_BASE_URL}/pitch-sultan/user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name.trim(),
                    storeId: selectedStore,
                    region: selectedRegion,
                    phone
                }),
            });

            const data = await response.json();

            if (data.success && data.data) {
                // Navigate to battle page (user data will be fetched from auth context)
                navigate('/pitchsultan/battle');
            } else {
                setError(data.error || 'Failed to create user');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-700">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center">
                        <span className="text-black font-black text-2xl">PS</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Pitch Sultan</h1>
                    <p className="text-gray-400">Enter your details to join the battle</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                        {error}
                    </div>
                )}

                {/* Name Input */}
                <div className="mb-6">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                        Your Name
                    </label>
                    <div className="relative">
                        <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                setError(null);
                            }}
                            placeholder="Enter your name"
                            className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-white placeholder-gray-500"
                        />
                    </div>
                </div>

                {/* Store Dropdown */}
                <div className="mb-6">
                    <label htmlFor="store" className="block text-sm font-medium text-gray-300 mb-2">
                        Select Store
                    </label>
                    <div className="relative">
                        <FaStore className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 z-10" />
                        <select
                            id="store"
                            value={selectedStore}
                            onChange={(e) => {
                                setSelectedStore(e.target.value);
                                setError(null);
                            }}
                            className="w-full pl-10 pr-10 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent appearance-none text-white"
                        >
                            <option value="" className="bg-gray-800">Select a store...</option>
                            {stores.map(store => (
                                <option key={store.id} value={store.id} className="bg-gray-800">
                                    {store.storeName} - {store.city}
                                </option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">▾</div>
                    </div>
                </div>

                {/* Region Dropdown */}
                <div className="mb-8">
                    <label htmlFor="region" className="block text-sm font-medium text-gray-300 mb-2">
                        Select Region
                    </label>
                    <div className="relative">
                        <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 z-10" />
                        <select
                            id="region"
                            value={selectedRegion}
                            onChange={(e) => {
                                setSelectedRegion(e.target.value);
                                setError(null);
                            }}
                            className="w-full pl-10 pr-10 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent appearance-none text-white"
                        >
                            <option value="" className="bg-gray-800">Select a region...</option>
                            {REGIONS.map(region => (
                                <option key={region.id} value={region.id} className="bg-gray-800">
                                    {region.name}
                                </option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">▾</div>
                    </div>
                </div>

                {/* Continue Button */}
                <button
                    onClick={handleContinue}
                    disabled={!name.trim() || !selectedStore || !selectedRegion}
                    className="w-full px-6 py-4 bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-bold rounded-lg hover:from-amber-600 hover:to-yellow-700 disabled:from-gray-600 disabled:to-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                    Enter The Battle
                </button>

                {/* Back Link */}
                <div className="mt-6 text-center">
                    <button
                        onClick={() => navigate('/pitchsultan')}
                        className="text-gray-400 hover:text-white text-sm transition-colors"
                    >
                        ← Back to Landing Page
                    </button>
                </div>
            </div>
        </div>
    );
}
