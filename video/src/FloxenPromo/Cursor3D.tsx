import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

type Cursor3DProps = {
  x: number;
  y: number;
  delay?: number;
  clicking?: boolean;
};

export const Cursor3D: React.FC<Cursor3DProps> = ({
  x,
  y,
  delay = 0,
  clicking = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = Math.max(0, frame - delay);

  const enterProgress = spring({
    frame: adjustedFrame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const clickScale = clicking
    ? interpolate(
        adjustedFrame,
        [0, 5, 10],
        [1, 0.85, 1],
        { extrapolateRight: "clamp" }
      )
    : 1;

  const scale = enterProgress * clickScale;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
        zIndex: 1000,
      }}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Main cursor body - 3D teal style */}
        <defs>
          <linearGradient id="cursorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Cursor shape */}
        <path
          d="M5.5 3.21V20.79C5.5 21.55 6.41 21.97 6.99 21.45L10.48 18.35H18.5C19.05 18.35 19.5 17.9 19.5 17.35V4.21C19.5 3.66 19.05 3.21 18.5 3.21H5.5Z"
          fill="url(#cursorGradient)"
          filter="url(#glow)"
          stroke="#0e7490"
          strokeWidth="0.5"
        />
        {/* Highlight */}
        <path
          d="M7 5V15L9 13H12"
          fill="none"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};
