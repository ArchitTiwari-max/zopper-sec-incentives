import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { FaArrowRight, FaClipboardList, FaTrophy } from 'react-icons/fa'
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
                className="relative z-10 w-full max-w-lg mx-auto text-center"
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
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <motion.div
                        variants={item}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/pitchsultan')}
                        className="cursor-pointer relative rounded-2xl overflow-hidden aspect-[3/4] shadow-lg border border-white/10 group bg-black"
                    >
                        <img src={pitchSultanImg} alt="Pitch Sultan" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3">
                            <span className="text-white font-bold text-sm">Pitch Sultan</span>
                            <span className="text-yellow-400 text-xs text-left">Live Now!</span>
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
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3">
                            <span className="text-white font-bold text-sm">SalesDost</span>
                            <span className="text-yellow-400 text-xs text-left">Live Now!</span>
                        </div>
                    </motion.div>
                </div>

                <motion.button
                    variants={item}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/plan-sell-info')}
                    className="group w-full mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-[1px] shadow-2xl shadow-blue-500/30"
                >
                    <div className="relative bg-white/10 backdrop-blur-sm px-8 py-5 rounded-2xl flex items-center justify-center gap-3 transition-colors group-hover:bg-white/15">
                        <span className="font-bold text-xl">Enter Dashboard</span>
                        <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                    </div>
                </motion.button>

                <div className="grid grid-cols-2 gap-4">
                    <QuickLink
                        icon={<FaClipboardList size={20} className="text-emerald-400" />}
                        label="Passbook"
                        desc="Check earnings"
                        onClick={() => navigate('/reporting')}
                        delay={0.4}
                    />
                    <QuickLink
                        icon={<FaTrophy size={20} className="text-yellow-400" />}
                        label="Leaderboard"
                        desc="Your ranking"
                        onClick={() => navigate('/leaderboard')}
                        delay={0.5}
                    />
                    {/* 
          <QuickLink 
            icon={<FaQuestionCircle size={20} className="text-pink-400" />}
            label="Help"
            desc="Get support"
            onClick={() => navigate('/help')}
            delay={0.6}
          /> 
          */}
                </div>

                <motion.div variants={item} className="mt-8">
                    <p className="text-xs text-blue-200/40">Powered by Zopper</p>
                </motion.div>

            </motion.div>
        </div>
    )
}

function QuickLink({ icon, label, desc, onClick, delay }: { icon: React.ReactNode, label: string, desc: string, onClick: () => void, delay: number }) {
    return (
        <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            onClick={onClick}
            whileHover={{ y: -2, backgroundColor: 'rgba(255,255,255,0.08)' }}
            className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm transition-all text-center"
        >
            <div className="mb-2 p-3 bg-white/5 rounded-full">
                {icon}
            </div>
            <div className="font-semibold text-white">{label}</div>
            <div className="text-xs text-blue-200/60">{desc}</div>
        </motion.button>
    )
}
