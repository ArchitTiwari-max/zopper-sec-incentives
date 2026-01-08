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
    const { user } = useAuth();
    const [stores, setStores] = useState<Store[]>([]);
    const [name, setName] = useState('');
    const [selectedStore, setSelectedStore] = useState('');
    const [selectedRegion, setSelectedRegion] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const checkUserAndLoadStores = async () => {
            try {
                // 1. Check if user already exists (safeguard)
                if (user && 'phone' in user) {
                    try {
                        const checkRes = await fetch(`${API_BASE_URL}/pitch-sultan/user?phone=${user.phone}`);
                        const checkData = await checkRes.json();
                        if (checkData.success && checkData.data) {
                            // User exists, redirect immediately
                            localStorage.setItem('pitchSultanUserId', checkData.data.id);
                            localStorage.setItem('pitchSultanUser', JSON.stringify(checkData.data));
                            navigate('/pitchsultan/battle');
                            return;
                        }
                    } catch (e) {
                        // Ignore error and proceed to setup
                        console.log("User not found, proceeding to setup");
                    }
                }

                // 2. Load stores
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
                // Store user ID and basic info in localStorage
                localStorage.setItem('pitchSultanUserId', data.data.id);
                localStorage.setItem('pitchSultanUser', JSON.stringify({
                    name: data.data.name,
                    store: {
                        id: data.data.store.id,
                        name: data.data.store.storeName,
                        city: data.data.store.city
                    },
                    region: data.data.region
                }));

                // Navigate to battle page
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
