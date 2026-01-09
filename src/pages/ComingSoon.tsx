import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MdArrowBack, MdOutlineTimer } from 'react-icons/md';

export const ComingSoon = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2" />

            {/* Content */}
            <div className="relative z-10 text-center max-w-md w-full">
                <div className="mb-8 flex justify-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center transform rotate-12 shadow-2xl">
                        <MdOutlineTimer className="text-5xl text-white -rotate-12" />
                    </div>
                </div>

                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                    Pitch Sultan
                    <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mt-2">
                        Coming Soon!
                    </span>
                </h1>

                <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                    We're crafting the ultimate sales pitch battle arena. Get ready to showcase your skills and win big!
                </p>

                <div className="space-y-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-full py-3.5 bg-white text-gray-900 rounded-xl font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                    >
                        <MdArrowBack />
                        Go Back
                    </button>

                    <button
                        onClick={() => navigate('/')}
                        className="w-full py-3.5 bg-gray-800 text-white rounded-xl font-semibold hover:bg-gray-700 transition-colors border border-gray-700"
                    >
                        Back to Home
                    </button>
                </div>

                <p className="mt-8 text-sm text-gray-500">
                    Stay tuned for updates! 🚀
                </p>
            </div>
        </div>
    );
};
