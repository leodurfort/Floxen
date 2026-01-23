import React from "react";
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";

const features = [
  { icon: "🔄", label: "Auto-Sync", description: "Products stay updated" },
  { icon: "🔌", label: "No Plugins", description: "Zero installation needed" },
  { icon: "⚡", label: "30 Sec Setup", description: "Connect instantly" },
];

export const Scene5Features: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title entrance
  const titleProgress = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      {/* Title */}
      <div
        style={{
          fontSize: 48,
          fontWeight: 700,
          color: "white",
          marginBottom: 60,
          opacity: titleProgress,
          transform: `translateY(${(1 - titleProgress) * 20}px)`,
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        Why Floxen?
      </div>

      {/* Feature pills */}
      <div style={{ display: "flex", gap: 32 }}>
        {features.map((feature, i) => {
          const delay = 15 + i * 10;
          const pillProgress = spring({
            frame: Math.max(0, frame - delay),
            fps,
            config: { damping: 12, stiffness: 100 },
          });

          // Checkmark draw animation
          const checkDelay = delay + 20;
          const checkProgress = interpolate(
            frame,
            [checkDelay, checkDelay + 15],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          return (
            <div
              key={feature.label}
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(10px)",
                borderRadius: 20,
                padding: "32px 40px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
                border: "1px solid rgba(255, 255, 255, 0.2)",
                transform: `scale(${pillProgress}) translateY(${(1 - pillProgress) * 30}px)`,
                opacity: pillProgress,
                minWidth: 200,
              }}
            >
              {/* Icon with checkmark */}
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                    borderRadius: 16,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontSize: 28,
                    boxShadow: "0 4px 16px rgba(59, 130, 246, 0.4)",
                  }}
                >
                  {feature.icon}
                </div>

                {/* Animated checkmark */}
                <div
                  style={{
                    position: "absolute",
                    top: -8,
                    right: -8,
                    width: 28,
                    height: 28,
                    background: "#10b981",
                    borderRadius: "50%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    transform: `scale(${checkProgress})`,
                    boxShadow: "0 2px 8px rgba(16, 185, 129, 0.4)",
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path
                      d="M5 12l5 5L20 7"
                      strokeDasharray="24"
                      strokeDashoffset={24 * (1 - checkProgress)}
                    />
                  </svg>
                </div>
              </div>

              {/* Label */}
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: "white",
                  fontFamily: "Inter, system-ui, sans-serif",
                }}
              >
                {feature.label}
              </div>

              {/* Description */}
              <div
                style={{
                  fontSize: 14,
                  color: "rgba(255, 255, 255, 0.7)",
                  fontFamily: "Inter, system-ui, sans-serif",
                }}
              >
                {feature.description}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
