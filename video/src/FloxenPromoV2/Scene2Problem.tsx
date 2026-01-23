import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const Scene2Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Question text animation
  const questionProgress = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  // Stats counter
  const statsDelay = 30;
  const statsProgress = spring({
    frame: Math.max(0, frame - statsDelay),
    fps,
    config: { damping: 15 },
  });

  // Problem statement
  const problemDelay = 60;
  const problemOpacity = interpolate(frame, [problemDelay, problemDelay + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Counter animation
  const counterValue = interpolate(frame, [statsDelay, statsDelay + 40], [0, 247], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #fafafa 0%, #f0f0f0 100%)",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        padding: 80,
      }}
    >
      {/* Question */}
      <div
        style={{
          fontSize: 28,
          color: "#666",
          fontFamily: "Inter, system-ui, sans-serif",
          marginBottom: 20,
          opacity: questionProgress,
          transform: `translateY(${(1 - questionProgress) * 20}px)`,
        }}
      >
        When someone asks ChatGPT...
      </div>

      {/* Search query bubble */}
      <div
        style={{
          background: "white",
          borderRadius: 24,
          padding: "24px 48px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          marginBottom: 60,
          opacity: questionProgress,
          transform: `scale(${questionProgress})`,
        }}
      >
        <span
          style={{
            fontSize: 32,
            color: "#1a1a1a",
            fontFamily: "Inter, system-ui, sans-serif",
            fontWeight: 500,
          }}
        >
          "What's the best ski gear under $500?"
        </span>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "flex",
          gap: 80,
          marginBottom: 60,
          opacity: statsProgress,
          transform: `translateY(${(1 - statsProgress) * 30}px)`,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: "#C65D21",
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            {Math.floor(counterValue)}M+
          </div>
          <div
            style={{
              fontSize: 18,
              color: "#666",
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            ChatGPT Users
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: "#C65D21",
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            1B+
          </div>
          <div
            style={{
              fontSize: 18,
              color: "#666",
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            Shopping Queries/Month
          </div>
        </div>
      </div>

      {/* Problem statement */}
      <div
        style={{
          fontSize: 36,
          color: "#333",
          fontFamily: "Inter, system-ui, sans-serif",
          fontWeight: 600,
          textAlign: "center",
          opacity: problemOpacity,
          maxWidth: 900,
        }}
      >
        Are <span style={{ color: "#C65D21" }}>your products</span> showing up?
      </div>
    </AbsoluteFill>
  );
};
