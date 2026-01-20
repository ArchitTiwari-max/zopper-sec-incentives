import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

export const useConfettiAnimation = () => {
    const confettiTriggered = useRef(false);

    useEffect(() => {
        if (confettiTriggered.current) return;
        confettiTriggered.current = true;

        const duration = 2500;
        const animationEnd = Date.now() + duration;
        const colors = ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#1E90FF'];

        const frame = () => {
            // Center burst - 5 particles, 70° spread
            confetti({
                particleCount: 5,
                angle: 90,
                spread: 70,
                origin: { x: 0.5, y: 0.5 },
                colors: colors,
                gravity: 0.8,
                decay: 0.95,
                scalar: 1.2
            });

            // Left burst - 3 particles, 50° spread
            confetti({
                particleCount: 3,
                angle: 60,
                spread: 50,
                origin: { x: 0.1, y: 0.5 },
                colors: colors,
                gravity: 0.8,
                decay: 0.95,
                scalar: 1
            });

            // Right burst - 3 particles, 50° spread
            confetti({
                particleCount: 3,
                angle: 120,
                spread: 50,
                origin: { x: 0.9, y: 0.5 },
                colors: colors,
                gravity: 0.8,
                decay: 0.95,
                scalar: 1
            });

            if (Date.now() < animationEnd) {
                requestAnimationFrame(frame);
            }
        };

        frame();
    }, []);
};
