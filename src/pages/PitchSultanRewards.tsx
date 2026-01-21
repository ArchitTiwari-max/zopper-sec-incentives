import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MdArrowBack, MdPlayArrow, MdStar } from 'react-icons/md';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Confetti } from '@/components/Confetti';
import { useConfettiAnimation } from '@/hooks/useConfettiAnimation';

interface Winner {
    serial_number: string;
    id?: string;
    url: string;
    secName?: string;
    storeName?: string;
    isTopWinner?: boolean;
    objectPosition?: string;
}

const WINNERS_DATA: Winner[] = [
    { serial_number: "1018", id: "6963a4b5466906a319fdadd8", url: "https://d2f4sgw13r1zfn.cloudfront.net/videos/68f1c1880c5509d1d4467c65/WhatsApp+Image+2026-01-11+at+20.01.10.jpeg", secName: "Vaibhav Jalindar Zambare", storeName: "Croma- A115 -Pune-Seasons Mall", isTopWinner: true, objectPosition: "center 30%" },
    { serial_number: "1001", id: "69613b962e53ebe5a5c7db85", url: "https://d2f4sgw13r1zfn.cloudfront.net/media/Pitchsultan_winners/1001.jpg", secName: "Meena kumari", storeName: "Croma- A055 -Delhi-Connaught Place", objectPosition: "center 70%" },
    { serial_number: "1011", id: "69634b1c4d1f0bced79fc60e", url: "https://d2f4sgw13r1zfn.cloudfront.net/media/Pitchsultan_winners/1011.jpg", secName: "Naveen dubey", storeName: "Croma- A306 -Gurugram-Sector 86", objectPosition: "center 25%" },
    { serial_number: "1012", id: "69634ebe0cd7dfc3ace6fbeb", url: "https://d2f4sgw13r1zfn.cloudfront.net/media/Pitchsultan_winners/1012.jpg", secName: "Shivam Kushwaha", storeName: "Croma- A297 -Surat-Katargam", objectPosition: "center 30%" },
    { serial_number: "1019", id: "6963af34cdf3b44a07ee087e", url: "https://d2f4sgw13r1zfn.cloudfront.net/media/Pitchsultan_winners/1019.jpg", secName: "MOHAMMED AMER", storeName: "Croma- A091 -Hyderabad-Kondapur", objectPosition: "center 25%" },
    { serial_number: "1030", id: "6966513179d7b30b36f217f6", url: "https://d2f4sgw13r1zfn.cloudfront.net/media/Pitchsultan_winners/1030.jpg", secName: "JUBER", storeName: "Croma- A259 -Lucknow-Vibhuti Khand", objectPosition: "center 35%" },
    { serial_number: "1037", id: "69677652dd3c7f1a44c06427", url: "https://d2f4sgw13r1zfn.cloudfront.net/media/Pitchsultan_winners/1037.jpg", secName: "Nirmal makwana", storeName: "Croma- A348 -Indore-Bicholi Mardana", objectPosition: "center 1%" },
    { serial_number: "1047", id: "6968f4d94889e19322c5e42a", url: "https://d2f4sgw13r1zfn.cloudfront.net/media/Pitchsultan_winners/1047.png", secName: "ABDUL MUBEEN KHAN", storeName: "VS- Belapur Br", objectPosition: "center 40%" },
    { serial_number: "1048", id: "6969036692d1214238b0c125", url: "https://d2f4sgw13r1zfn.cloudfront.net/media/Pitchsultan_winners/1048.jpg", secName: "Altamash Miyabhai Shaikh", storeName: "Croma- A215 -Nashik-Nashik Road", objectPosition: "center 30%" },
    { serial_number: "1053", id: "69691c816bcc83baed7ee4c6", url: "https://d2f4sgw13r1zfn.cloudfront.net/media/Pitchsultan_winners/1053.jpg", secName: "Anushikha Bose", storeName: "Croma- A197 -Kolkata-Rajarhat", objectPosition: "center 50%" },
    { serial_number: "1059", id: "696a107a5340015c829eda00", url: "https://d2f4sgw13r1zfn.cloudfront.net/media/Pitchsultan_winners/1059.jpg", secName: "SOURAV KUMAR", storeName: "Croma- A163 -Jalandhar-Lajpat Nagar", objectPosition: "center 50%" }
];

const EARLY_BIRD_DATA: Winner[] = [
    { serial_number: "1001", id: "69613b962e53ebe5a5c7db85", url: "https://d2f4sgw13r1zfn.cloudfront.net/media/Pitchsultan_winners/1001.jpg", secName: "Meena kumari", storeName: "Croma- A055 -Delhi-Connaught Place", objectPosition: "center 70%" },
    { serial_number: "1002", id: "69613db82e53ebe5a5c7db87", url: "/assets/winners/1002.png", secName: "Varsha", storeName: "Croma- A477 -Dehradun-Saharanpur Road", objectPosition: "center 20%" },
    { serial_number: "1003", id: "69614063ff9b2af81c05e025", url: "/assets/winners/1003.png", secName: "Salman Khan", storeName: "Croma- A642 -Bangalore-Vega City", objectPosition: "center 20%" },
    { serial_number: "1004", id: "69622c31b5a0f0bf575083bd", url: "/assets/winners/1004.png", secName: "Anshu", storeName: "Croma- A217 -Surat-VIP Road", objectPosition: "center 25%" },
    { serial_number: "1005", id: "69623b3a9f05f41f1aaa6be3", url: "/assets/winners/1005.png", secName: "Praveen Kumar Singh", storeName: "Croma- A055 -Delhi-Connaught Place", objectPosition: "center 20%" }
];

export const PitchSultanRewards = () => {
    const navigate = useNavigate();
    const topWinner = WINNERS_DATA[0];
    const otherWinners = WINNERS_DATA.slice(1);
    const [showFirecrackers, setShowFirecrackers] = useState(true);

    const handleWinnerClick = (winner: Winner) => {
        if (winner.id) {
            navigate('/pitchsultan/battle', { state: { videoId: winner.id } });
        } else {
            navigate('/pitchsultan/battle');
        }
    };

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
                onClick={() => handleWinnerClick(topWinner)}
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



                        {/* Serial Number & Info Badge */}
                        <div className="absolute bottom-3 md:bottom-4 left-3 md:left-4 right-3 md:right-4 bg-black/80 px-3 md:px-4 py-2 md:py-3 rounded-xl backdrop-blur-md border border-white/10">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-yellow-400 font-bold text-xs md:text-sm uppercase tracking-wider">Top Winner • Serial: {topWinner.serial_number}</span>
                                <h3 className="text-white font-bold text-lg md:text-2xl truncate">{topWinner.secName}</h3>
                                <p className="text-gray-300 text-xs md:text-sm truncate">{topWinner.storeName}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Other Winners - Grid */}
            <div className="max-w-6xl mx-auto mb-12">
                <h2 className="text-2xl font-bold text-white mb-6 text-center">TOP 10 Finalists</h2>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {otherWinners.map((winner, index) => (
                        <motion.div
                            key={winner.serial_number}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + index * 0.05 }}
                            className="group cursor-pointer"
                            onClick={() => handleWinnerClick(winner)}
                        >
                            <div className="relative overflow-hidden rounded-2xl shadow-lg aspect-square">
                                <img
                                    src={winner.url}
                                    alt={`Winner ${winner.serial_number}`}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    style={{ objectPosition: winner.objectPosition || "center" }}
                                />



                                {/* Serial Number & Info */}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 pt-8">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-yellow-400 font-bold text-[10px] uppercase">Serial: {winner.serial_number}</span>
                                        <h4 className="text-white font-bold text-sm truncate">{winner.secName}</h4>
                                        <p className="text-gray-400 text-[10px] truncate">{winner.storeName}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Early Birds - Grid */}
            <div className="max-w-6xl mx-auto mb-12">
                <h2 className="text-2xl font-bold text-white mb-6 text-center">TOP 5 EARLY BIRDS</h2>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {EARLY_BIRD_DATA.map((winner, index) => (
                        <motion.div
                            key={winner.serial_number}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + index * 0.05 }}
                            className="group cursor-pointer"
                            onClick={() => handleWinnerClick(winner)}
                        >
                            <div className="relative overflow-hidden rounded-2xl shadow-lg aspect-square">
                                <img
                                    src={winner.url}
                                    alt={`Early Bird ${winner.serial_number}`}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    style={{ objectPosition: winner.objectPosition || "center" }}
                                />

                                {/* Serial Number & Info */}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 pt-8">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-yellow-400 font-bold text-[10px] uppercase">Serial: {winner.serial_number}</span>
                                        <h4 className="text-white font-bold text-sm truncate">{winner.secName}</h4>
                                        <p className="text-gray-400 text-[10px] truncate">{winner.storeName}</p>
                                    </div>
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
