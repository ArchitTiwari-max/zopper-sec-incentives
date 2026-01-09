import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MdArrowBack } from 'react-icons/md';
import pitchSultanRewardsImg from '../assets/pitch-sultan-rewards.jpg';

export const PitchSultanRewards = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center p-4">
            {/* Back Button */}
            <button
                onClick={() => navigate('/pitchsultan')}
                className="absolute top-4 left-4 z-10 p-2 bg-black/60 hover:bg-black/80 rounded-full transition-colors"
            >
                <MdArrowBack className="text-2xl text-white" />
            </button>

            <img
                src={pitchSultanRewardsImg}
                alt="Rewards"
                className="w-full max-w-4xl h-auto object-contain"
            />
        </div>
    );
};
