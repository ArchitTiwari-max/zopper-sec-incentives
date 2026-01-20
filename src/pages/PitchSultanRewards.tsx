import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MdArrowBack, MdPlayArrow, MdStar } from 'react-icons/md';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Confetti } from '@/components/Confetti';
import { useConfettiAnimation } from '@/hooks/useConfettiAnimation';

interface Winner {
  serial_number: string;
  url: string;
  isTopWinner?: boolean;
  objectPosition?: string;
}

const WINNERS_DATA: Winner[] = [
  { serial_number: "1018", url: "https://d2f4sgw13r1zfn.cloudfront.net/videos/68f1c1880c5509d1d4467c65/WhatsApp+Image+2026-01-11+at+20.01.10.jpeg", isTopWinner: true, objectPosition: "center 30%" },
  { serial_number: "1001", url: "https://d2f4sgw13r1zfn.cloudfront.net/media/Pitchsultan_winners/1001.jpg", objectPosition: "center 70%" },
  { serial_number: "1011", url: "https://d2f4sgw13r1zfn.cloudfront.net/media/Pitchsultan_winners/1011.jpg", objectPosition: "center 25%" },
  { serial_number: "1012", url: "https://d2f4sgw13r1zfn.cloudfront.net/media/Pitchsultan_winners/1012.jpg", objectPosition: "center 30%" },
  { serial_number: "1019", url: "https://d2f4sgw13r1zfn.cloudfront.net/media/Pitchsultan_winners/1019.jpg", objectPosition: "center 25%" },
  { serial_number: "1030", url: "https://d2f4sgw13r1zfn.cloudfront.net/media/Pitchsultan_winners/1030.jpg", objectPosition: "center 35%" },
  { serial_number: "1037", url: "https://d2f4sgw13r1zfn.cloudfront.net/media/Pitchsultan_winners/1037.jpg", objectPosition: "center 1%" },
  { serial_number: "1047", url: "https://d2f4sgw13r1zfn.cloudfront.net/media/Pitchsultan_winners/1047.png", objectPosition: "center 40%" },
  { serial_number: "1048", url: "https://d2f4sgw13r1zfn.cloudfront.net/media/Pitchsultan_winners/1048.jpg", objectPosition: "center 30%" },
  { serial_number: "1053", url: "https://d2f4sgw13r1zfn.cloudfront.net/media/Pitchsultan_winners/1053.jpg", objectPosition: "center 50%" },
  { serial_number: "1059", url: "https://d2f4sgw13r1zfn.cloudfront.net/media/Pitchsultan_winners/1059.jpg", objectPosition: "center 50%" }
];

export const PitchSultanRewards = () => {
    const navigate = useNavigate();
    const topWinner = WINNERS_DATA[0];
    const otherWinners = WINNERS_DATA.slice(1);
    const [showFirecrackers, setShowFirecrackers] = useState(true);

    useConfettiAnimation();

    useEffect(() => {
        const timer = setTimeout(() => setShowFirecrackers(false), 3000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0f0f0f] via-[#1a1a1a] to-[#0f0f0f] p-4 md:p-6">

            {/* Header */}
            <div className="text-center mt-8 mb-12">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500 mb-2"
                >
                    🏆 Pitch Sultan Winners
                </motion.h1>
                <p className="text-gray-400 text-lg">Celebrating our top performers</p>
            </div>

            {/* Top Winner - Large Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="max-w-2xl mx-auto mb-12 md:mb-16"
            >
                <div className="relative group cursor-pointer">
                    {/* Animated Crown Badge - Center Top */}
                    <motion.div
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute -top-8 md:-top-10 left-1/2 -translate-x-1/2 z-10 text-5xl md:text-7xl"
                    >
                        👑
                    </motion.div>

                    {/* Image Container */}
                    <div className="relative overflow-hidden rounded-2xl md:rounded-3xl shadow-2xl aspect-video">
                        <img
                            src={topWinner.url}
                            alt={`Winner ${topWinner.serial_number}`}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            style={{ objectPosition: topWinner.objectPosition || "center" }}
                        />
                        
                        {/* #1 Badge - Top Right */}
                        <div className="absolute top-3 md:top-4 right-3 md:right-4 bg-gradient-to-r from-purple-500 to-pink-500 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                            <span className="text-white font-bold text-lg md:text-xl">#1</span>
                        </div>
                        
                        {/* Serial Number Badge */}
                        <div className="absolute bottom-3 md:bottom-4 left-3 md:left-4 bg-black/80 px-3 md:px-4 py-1 md:py-2 rounded-full">
                            <span className="text-white font-bold text-sm md:text-lg">Serial: {topWinner.serial_number}</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Other Winners - Grid */}
            <div className="max-w-6xl mx-auto mb-12">
                <h2 className="text-2xl font-bold text-white mb-6 text-center">Other 10 Finalists</h2>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {otherWinners.map((winner, index) => (
                        <motion.div
                            key={winner.serial_number}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + index * 0.05 }}
                            className="group cursor-pointer"
                        >
                            <div className="relative overflow-hidden rounded-2xl shadow-lg aspect-square">
                                <img
                                    src={winner.url}
                                    alt={`Winner ${winner.serial_number}`}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    style={{ objectPosition: winner.objectPosition || "center" }}
                                />

                                {/* Rank Badge */}
                                <div className="absolute top-2 right-2 bg-gradient-to-r from-purple-500 to-pink-500 w-8 h-8 rounded-full flex items-center justify-center shadow-lg">
                                    <span className="text-white font-bold text-sm">#{index + 2}</span>
                                </div>

                                {/* Serial Number */}
                                <div className="absolute bottom-2 left-2 bg-black/80 px-2 py-1 rounded-lg">
                                    <span className="text-white font-semibold text-xs">{winner.serial_number}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* CTA Button */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex justify-center mb-12"
            >
                <button
                    onClick={() => navigate('/pitchsultan/battle')}
                    className="px-8 py-4 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500 text-black font-bold text-lg rounded-full hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center gap-3 shadow-lg"
                >
                    <MdPlayArrow className="text-2xl" />
                    Watch All Videos
                </button>
            </motion.div>

            {/* Footer Info */}
            <div className="text-center text-gray-500 text-sm">
            </div>
        </div>
    );
};
