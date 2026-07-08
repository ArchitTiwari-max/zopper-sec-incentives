import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '@/lib/config';

export const PitchSultan = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const rulesRef = useRef<HTMLDivElement>(null);

    const handleEnterBattle = () => {
        navigate('/pitchsultan/battle');
    };

    const scrollToRules = () => {
        rulesRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
            {/* ── NAVBAR ── */}
            <nav
                className="sticky top-0 z-50 flex items-center justify-between px-6 py-3"
                style={{
                    background: 'rgba(10,10,10,0.85)',
                    backdropFilter: 'blur(16px)',
                    borderBottom: '1px solid rgba(245,158,11,0.15)',
                }}
            >
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-black text-xs"
                        style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                    >
                        CA
                    </div>
                    <span className="font-bold text-sm tracking-tight text-white">Customer Ki Awaz</span>
                </div>

                {/* Links */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => navigate('/pitchsultan/battle')}
                        className="px-3 py-1.5 text-xs font-semibold text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                    >
                        HOME
                    </button>
                    <button
                        onClick={() => navigate('/pitchsultan/rewards')}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
                        style={{
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            color: '#000',
                        }}
                    >
                        PS WINNERS
                    </button>
                </div>
            </nav>

            {/* ── HERO ── */}
            <section className="relative flex flex-col items-center text-center px-6 pt-14 pb-10 overflow-hidden">
                {/* Glowing orbs */}
                <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse, rgba(245,158,11,0.12) 0%, transparent 70%)' }}
                />

                {/* Contest badge */}
                <div
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider mb-6"
                    style={{
                        background: 'rgba(245,158,11,0.1)',
                        border: '1px solid rgba(245,158,11,0.3)',
                        color: '#f59e0b',
                    }}
                >
                    🎙️ OFFICIAL CONTEST
                </div>

                {/* Title */}
                <h1
                    className="font-black leading-tight mb-3"
                    style={{
                        fontSize: 'clamp(2.2rem, 8vw, 4rem)',
                        background: 'linear-gradient(135deg, #fff 0%, #f59e0b 50%, #d97706 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '-0.03em',
                    }}
                >
                    Customer Ki<br />Awaz
                </h1>

                <p className="text-gray-400 text-sm max-w-xs mb-8 leading-relaxed">
                    Show your best pitch to customers &amp; win real Amazon vouchers. Every verified video gets rewarded!
                </p>

                {/* CTA */}
                <button
                    onClick={handleEnterBattle}
                    className="relative overflow-hidden font-black text-black px-10 py-4 rounded-2xl text-base tracking-wide transition-all duration-200 active:scale-95"
                    style={{
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        boxShadow: '0 0 40px rgba(245,158,11,0.4), 0 4px 20px rgba(0,0,0,0.4)',
                    }}
                >
                    <span className="relative z-10">🎬 Enter The Battle</span>
                    <div
                        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity"
                        style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' }}
                    />
                </button>

                {/* Stats row */}
                <div className="flex items-center gap-6 mt-10">
                    {[
                        { value: '₹500', label: 'Top 10 Prize' },
                        { value: '₹300', label: 'Every Entry' },
                        { value: '∞', label: 'Videos Allowed' },
                    ].map((s) => (
                        <div key={s.label} className="text-center">
                            <p
                                className="font-black text-xl"
                                style={{ color: '#f59e0b' }}
                            >
                                {s.value}
                            </p>
                            <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── DIVIDER ── */}
            <div className="h-px mx-6" style={{ background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.2), transparent)' }} />

            {/* ── PRIZE SECTION ── */}
            <section className="px-5 pt-10 pb-10">
                <div className="text-center mb-6">
                    <p className="text-xs font-bold tracking-widest text-amber-400 uppercase mb-1">Rewards</p>
                    <h2 className="text-2xl font-black text-white" style={{ letterSpacing: '-0.02em' }}>What You Win</h2>
                </div>

                <div className="flex flex-col gap-4 max-w-sm mx-auto">
                    {/* Top 10 */}
                    <div
                        className="relative overflow-hidden rounded-2xl p-5"
                        style={{
                            background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(217,119,6,0.05) 100%)',
                            border: '1px solid rgba(245,158,11,0.25)',
                        }}
                    >
                        <div className="absolute -top-4 -right-4 text-6xl opacity-10 select-none">🏆</div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold tracking-wider text-amber-400 uppercase mb-1">Top 10 Verified Entries</p>
                                <p className="text-gray-300 text-sm leading-relaxed">Each winner gets an Amazon voucher worth</p>
                                <p
                                    className="font-black text-3xl mt-1"
                                    style={{ color: '#f59e0b', letterSpacing: '-0.02em' }}
                                >
                                    ₹500
                                    <span className="text-base font-bold text-amber-400/70">/-</span>
                                </p>
                            </div>
                            <div
                                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                                style={{ background: 'rgba(245,158,11,0.15)' }}
                            >
                                🏆
                            </div>
                        </div>
                    </div>

                    {/* Everyone else */}
                    <div
                        className="relative overflow-hidden rounded-2xl p-5"
                        style={{
                            background: 'linear-gradient(135deg, rgba(59,130,246,0.10) 0%, rgba(6,182,212,0.04) 100%)',
                            border: '1px solid rgba(59,130,246,0.2)',
                        }}
                    >
                        <div className="absolute -top-4 -right-4 text-6xl opacity-10 select-none">🎁</div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold tracking-wider text-blue-400 uppercase mb-1">All Other Verified Entries</p>
                                <p className="text-gray-300 text-sm leading-relaxed">Every verified entry gets a voucher worth</p>
                                <p
                                    className="font-black text-3xl mt-1"
                                    style={{ color: '#60a5fa', letterSpacing: '-0.02em' }}
                                >
                                    ₹300
                                    <span className="text-base font-bold text-blue-400/70">/-</span>
                                </p>
                            </div>
                            <div
                                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                                style={{ background: 'rgba(59,130,246,0.12)' }}
                            >
                                🎁
                            </div>
                        </div>
                    </div>

                    {/* Disclaimer */}
                    <div
                        className="rounded-xl p-3 text-center"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                        <p className="text-xs text-gray-500 leading-relaxed italic">
                            ⚠️ Only <span className="text-white font-semibold">verified entries</span> qualify. Fake entries will be disqualified.
                        </p>
                    </div>
                </div>
            </section>

            {/* ── DIVIDER ── */}
            <div className="h-px mx-6" style={{ background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.2), transparent)' }} />

            {/* ── HOW TO PLAY / CONTEST RULES ── */}
            <section ref={rulesRef} className="px-5 pt-10 pb-16">
                <div className="text-center mb-6">
                    <p className="text-xs font-bold tracking-widest text-amber-400 uppercase mb-1">Guidelines</p>
                    <h2 className="text-2xl font-black text-white" style={{ letterSpacing: '-0.02em' }}>How To Play</h2>
                </div>

                <div className="max-w-sm mx-auto space-y-3">
                    {[
                        {
                            icon: '⏱',
                            color: 'rgba(245,158,11,0.15)',
                            border: 'rgba(245,158,11,0.2)',
                            title: 'Video Duration',
                            desc: 'Minimum 35 seconds and maximum 2 minutes.',
                        },
                        {
                            icon: '✅',
                            color: 'rgba(16,185,129,0.1)',
                            border: 'rgba(16,185,129,0.2)',
                            title: 'Customer Claim',
                            desc: 'Make sure the customers whose videos are submitted have raised a claim.',
                        },
                        {
                            icon: '🏆',
                            color: 'rgba(59,130,246,0.1)',
                            border: 'rgba(59,130,246,0.2)',
                            title: 'Verified Entries Only',
                            desc: 'Only verified entries will be eligible for rewards.',
                        },
                        {
                            icon: '❌',
                            color: 'rgba(239,68,68,0.1)',
                            border: 'rgba(239,68,68,0.2)',
                            title: 'No Fake Entries',
                            desc: 'Fake entries will be disqualified immediately.',
                        },
                        {
                            icon: '🎬',
                            color: 'rgba(139,92,246,0.1)',
                            border: 'rgba(139,92,246,0.2)',
                            title: 'Upload Unlimited Videos',
                            desc: 'An individual SEC can upload as many videos as they want — each verified video will be rewarded.',
                        },
                        {
                            icon: '📱',
                            color: 'rgba(245,158,11,0.08)',
                            border: 'rgba(245,158,11,0.15)',
                            title: 'Portrait Mode Only',
                            desc: 'Hold your phone vertically (9:16 ratio). Landscape videos will be rejected.',
                        },
                    ].map((rule, i) => (
                        <div
                            key={i}
                            className="flex items-start gap-4 rounded-2xl p-4"
                            style={{
                                background: rule.color,
                                border: `1px solid ${rule.border}`,
                            }}
                        >
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                                style={{ background: 'rgba(0,0,0,0.3)' }}
                            >
                                {rule.icon}
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-white text-sm mb-0.5">{rule.title}</p>
                                <p className="text-gray-400 text-xs leading-relaxed">{rule.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bottom CTA */}
                <div className="mt-10 text-center">
                    <button
                        onClick={handleEnterBattle}
                        className="font-black text-black px-10 py-4 rounded-2xl text-base tracking-wide active:scale-95 transition-all duration-200"
                        style={{
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            boxShadow: '0 0 30px rgba(245,158,11,0.35)',
                        }}
                    >
                        🎬 Start Uploading
                    </button>
                    <p className="text-gray-600 text-xs mt-3">Win Amazon vouchers for every verified video!</p>
                </div>
            </section>
        </div>
    );
};
