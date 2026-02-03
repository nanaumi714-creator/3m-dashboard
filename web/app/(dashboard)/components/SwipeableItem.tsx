"use client";

import { useState } from "react";

type SwipeableItemProps = {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    leftAction?: React.ReactNode;
    rightAction?: React.ReactNode;
    children: React.ReactNode;
};

export default function SwipeableItem({
    onSwipeLeft,
    onSwipeRight,
    leftAction,
    rightAction,
    children,
}: SwipeableItemProps) {
    const [startX, setStartX] = useState(0);
    const [currentX, setCurrentX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);

    function handleTouchStart(e: React.TouchEvent) {
        setStartX(e.touches[0].clientX);
        setIsSwiping(true);
    }

    function handleTouchMove(e: React.TouchEvent) {
        if (!isSwiping) return;
        setCurrentX(e.touches[0].clientX);
    }

    function handleTouchEnd() {
        if (!isSwiping) return;

        const diff = currentX - startX;
        const threshold = 80; // Minimum swipe distance

        if (Math.abs(diff) > threshold) {
            if (diff > 0 && onSwipeRight) {
                // Swipe right
                onSwipeRight();
            } else if (diff < 0 && onSwipeLeft) {
                // Swipe left
                onSwipeLeft();
            }
        }

        // Reset
        setIsSwiping(false);
        setCurrentX(0);
        setStartX(0);
    }

    const translateX = isSwiping ? currentX - startX : 0;
    const showLeftAction = translateX > 50;
    const showRightAction = translateX < -50;

    return (
        <div className="relative overflow-hidden">
            {/* Left action (revealed when swiping right) */}
            {leftAction && showLeftAction && (
                <div className="absolute left-0 top-0 bottom-0 flex items-center px-4 bg-green-500 text-white">
                    {leftAction}
                </div>
            )}

            {/* Right action (revealed when swiping left) */}
            {rightAction && showRightAction && (
                <div className="absolute right-0 top-0 bottom-0 flex items-center px-4 bg-red-500 text-white">
                    {rightAction}
                </div>
            )}

            {/* Swipeable content */}
            <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                    transform: `translateX(${translateX}px)`,
                    transition: isSwiping ? "none" : "transform 0.2s ease-out",
                }}
                className="bg-white touch-pan-x"
            >
                {children}
            </div>
        </div>
    );
}
