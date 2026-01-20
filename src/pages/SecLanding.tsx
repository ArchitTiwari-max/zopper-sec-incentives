import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { isSECUser } from '@/lib/auth'

// Import assets
import pitchSultanImg from '@/assets/pitch_sultan_tile.jpg'
import salesDostImg from '@/assets/sales_dost_tile.png'

export function SecLanding() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const secUser = user && isSECUser(user) ? user : null
    const firstName = secUser?.name?.split(' ')[0] || 'Partner'

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a237e] via-[#000000] to-[#000000] text-white p-6 relative overflow-hidden flex flex-col items-center justify-center">
            {/* Background Orbs */}
            <div className="absolute top-[-20%] left-[-20%] w-[80vh] h-[80vh] bg-blue-600/30 rounded-full blur-[128px] mix-blend-screen" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[80vh] h-[80vh] bg-indigo-600/20 rounded-full blur-[128px] mix-blend-screen" />

            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="relative z-10 w-full max-w-2xl mx-auto text-center"
            >


                <motion.h1
                    variants={item}
                    className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200"
                >
                    Welcome Back,<br />
                    {firstName}!
                </motion.h1>

                <motion.p variants={item} className="text-blue-100/80 mb-8 text-lg">
                    Ready to crush your targets today? <br /> Let's get those numbers up.
                </motion.p>

                {/* Feature Tiles */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                    {/* Pitch Sultan Tile with Wave Animation */}
                    <motion.div variants={item}>
                        <style>{`
                            @keyframes float {
                                0% { transform: translateY(0px); }
                                50% { transform: translateY(-10px); }
                                100% { transform: translateY(0px); }
                            }
                        `}</style>
                        <div
                            style={{ animation: 'float 3s ease-in-out infinite' }}
                            onClick={() => navigate('/pitchsultan/rewards')}
                            className="cursor-pointer relative rounded-2xl overflow-hidden aspect-[3/4] shadow-lg border border-white/10 group bg-black"
                        >
                            <img src={pitchSultanImg} alt="Pitch Sultan" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />

                            {/* New Badge */}
                            <motion.div
                                animate={{
                                    scale: [1, 1.1, 1],
                                    rotate: [0, -5, 5, 0]
                                }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                                className="absolute top-0 left-0 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-br-lg shadow-md z-20"
                            >
                                NEW
                            </motion.div>

                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-5">
                                <span className="text-white font-bold text-xl mb-1">Pitch Sultan</span>
                                <span className="text-yellow-400 text-sm text-left font-medium">Winner Announcement</span>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        variants={item}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/plan-sell-info')}
                        className="cursor-pointer relative rounded-2xl overflow-hidden aspect-[3/4] shadow-lg border border-white/10 group bg-black"
                    >
                        <img src={salesDostImg} alt="Sales Dost" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-5">
                            <span className="text-white font-bold text-xl mb-1">SalesDost</span>
     
                        </div>
                    </motion.div>
                </div>

                <motion.div variants={item} className="mt-8">
                    <p className="text-xs text-blue-200/40">Powered by Zopper</p>
                </motion.div>

            </motion.div >
        </div >
    )
}
