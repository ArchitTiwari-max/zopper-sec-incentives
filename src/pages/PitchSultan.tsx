import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '@/lib/config';
import pitchSultanImage from '../assets/pitch-sultan.jpg';
import pitchSultanDesktopImage from '../assets/pitch-sultan-desktop.jpg';
import enterBattleBg from '../assets/enter-battle-bg.png';
import whoWillBeSultanImage from '../assets/who-will-be-sultan.png';

export const PitchSultan = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const handleEnterBattle = async () => {
        if (user && 'phone' in user) {
            try {
                const res = await fetch(`${API_BASE_URL}/pitch-sultan/user?phone=${user.phone}`);
                const data = await res.json();

                if (data.success && data.data) {
                    // Sync local storage just in case
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
                    setTimeout(() => navigate('/pitchsultan/battle'), 150);
                    return;
                }
            } catch (e) {
                console.error("Failed to check user status:", e);
            }
        }
        // If no user found or error, go to setup
        setTimeout(() => navigate('/pitchsultan/setup'), 150);
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-0 overflow-hidden">
            <div className="relative w-full lg:h-screen">
                {/* Mobile/Tablet Poster */}
                <img
                    src={pitchSultanImage}
                    alt="Pitch Sultan - Welcome to the Battle"
                    className="w-full h-auto block lg:hidden object-contain shadow-2xl mx-auto"
                />

                {/* Desktop Poster */}
                <img
                    src={pitchSultanDesktopImage}
                    alt="Pitch Sultan - Welcome to the Battle"
                    className="hidden lg:block w-full h-full object-fill shadow-2xl mx-auto"
                />

                {/* Footer Overlay: Who Will Be Sultan (Mobile/Tablet Only) */}
                <div className="absolute bottom-[21%] right-[9.5%] w-[43%] bg-black/90 rounded-sm block lg:hidden">
                    <img
                        src={whoWillBeSultanImage}
                        alt="Who Will Be The Sultan?"
                        className="w-full h-auto shadow-lg rounded-sm opacity-100"
                    />
                </div>

                {/* Interactive Button: Enter Battle */}
                <div className="absolute top-[48%] lg:top-[63%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-20 w-fit">
                    <button
                        onClick={handleEnterBattle}
                        className="relative group cursor-pointer focus:outline-none bg-transparent"
                        style={{ width: 'clamp(240px, 80vw, 400px)', aspectRatio: '212/36' }}
                        aria-label="Enter The Battle"
                    >
                        <div className="w-full h-full relative flex items-center justify-center transition-transform duration-100 ease-out group-active:scale-[0.95] group-active:scale-y-[0.76]">
                            <img
                                src={enterBattleBg}
                                alt=""
                                className="w-full h-full object-fill absolute top-0 left-0"
                            />
                            <span className="relative z-10 text-black font-black tracking-wide uppercase font-sans select-none"
                                style={{
                                    fontFamily: 'Impact, sans-serif',
                                    fontSize: 'clamp(16px, 4.5vw, 28px)',
                                    textShadow: '0px 1px 0px rgba(255,255,255,0.4)'
                                }}>
                                Enter The Battle
                            </span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};
