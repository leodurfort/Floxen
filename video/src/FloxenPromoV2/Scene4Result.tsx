import React from "react";
import {
  AbsoluteFill,
  Video,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const Scene4Result: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title animation
  const titleProgress = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  // Video entrance
  const videoDelay = 15;
  const videoProgress = spring({
    frame: Math.max(0, frame - videoDelay),
    fps,
    config: { damping: 15 },
  });

  // Highlight badge
  const badgeDelay = 40;
  const badgeProgress = spring({
    frame: Math.max(0, frame - badgeDelay),
    fps,
    config: { damping: 10, stiffness: 100 },
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      {/* Ambient light effects */}
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%)",
          top: "-20%",
          right: "-10%",
        }}
      />

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 50,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: titleProgress,
          transform: `translateY(${(1 - titleProgress) * 20}px)`,
          zIndex: 10,
        }}
      >
        <div
          style={{
            fontSize: 44,
            fontWeight: 700,
            color: "white",
            fontFamily: "Inter, system-ui, sans-serif",
            textShadow: "0 2px 20px rgba(0,0,0,0.2)",
          }}
        >
          Your Products in ChatGPT
        </div>
      </div>

      {/* Video container with device frame */}
      <div
        style={{
          position: "relative",
          opacity: videoProgress,
          transform: `scale(${0.9 + videoProgress * 0.1}) translateY(${(1 - videoProgress) * 40}px)`,
        }}
      >
        {/* Glow effect behind video */}
        <div
          style={{
            position: "absolute",
            inset: -20,
            background: "rgba(255,255,255,0.15)",
            borderRadius: 32,
            filter: "blur(30px)",
          }}
        />

        {/* Video with rounded corners */}
        <div
          style={{
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: "0 30px 100px rgba(0,0,0,0.4)",
            position: "relative",
          }}
        >
          <Video
            src={staticFile("chatgpt_recording.mov")}
            style={{
              width: 1000,
              height: "auto",
            }}
            startFrom={0}
            volume={0}
          />
        </div>
      </div>

      {/* Success badge */}
      <div
        style={{
          position: "absolute",
          bottom: 50,
          left: "50%",
          transform: `translateX(-50%) scale(${badgeProgress})`,
          opacity: badgeProgress,
          background: "rgba(255,255,255,0.95)",
          borderRadius: 100,
          padding: "16px 32px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <path d="M5 12l5 5L20 7" />
          </svg>
        </div>
        <span
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "#1a1a1a",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          Products synced and discoverable
        </span>
      </div>
    </AbsoluteFill>
  );
};
