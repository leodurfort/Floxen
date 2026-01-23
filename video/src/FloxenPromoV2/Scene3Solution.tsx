import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const Scene3Solution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title animation
  const titleProgress = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  // Screenshot entrance
  const screenshotDelay = 20;
  const screenshotProgress = spring({
    frame: Math.max(0, frame - screenshotDelay),
    fps,
    config: { damping: 15, stiffness: 80 },
  });

  // Zoom and pan effect on screenshot
  const zoomScale = interpolate(frame, [screenshotDelay, 180], [1.1, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Checklist overlay
  const checklistDelay = 100;
  const checklistProgress = spring({
    frame: Math.max(0, frame - checklistDelay),
    fps,
    config: { damping: 12 },
  });

  // Feature badges
  const features = ["30 Sec Setup", "No Plugins", "Auto-Sync"];

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #f8f4f0 0%, #fff 100%)",
        overflow: "hidden",
      }}
    >
      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 60,
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
            fontSize: 48,
            fontWeight: 700,
            color: "#1a1a1a",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          Connect in <span style={{ color: "#C65D21" }}>30 seconds</span>
        </div>
      </div>

      {/* Main screenshot with perspective */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -45%) scale(${screenshotProgress * zoomScale}) perspective(1500px) rotateX(2deg)`,
          opacity: screenshotProgress,
          width: "85%",
          maxWidth: 1400,
        }}
      >
        {/* Browser chrome */}
        <div
          style={{
            background: "#f5f5f5",
            borderRadius: "12px 12px 0 0",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderBottom: "1px solid #e0e0e0",
          }}
        >
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#febc2e" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28c840" }} />
          </div>
          <div
            style={{
              flex: 1,
              background: "white",
              borderRadius: 6,
              padding: "6px 12px",
              fontSize: 13,
              color: "#666",
              marginLeft: 12,
            }}
          >
            app.floxen.ai/dashboard
          </div>
        </div>

        {/* Screenshot */}
        <div
          style={{
            background: "white",
            borderRadius: "0 0 12px 12px",
            overflow: "hidden",
            boxShadow: "0 25px 80px rgba(0,0,0,0.15)",
          }}
        >
          <Img
            src={staticFile("floxen_1.png")}
            style={{
              width: "100%",
              display: "block",
            }}
          />
        </div>
      </div>

      {/* Checklist overlay */}
      <div
        style={{
          position: "absolute",
          right: 80,
          top: "50%",
          transform: `translateY(-50%) translateX(${(1 - checklistProgress) * 100}px)`,
          opacity: checklistProgress,
          background: "white",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          width: 280,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#666",
            marginBottom: 16,
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          Getting Started
        </div>
        {[
          "Connect WooCommerce",
          "Select Products",
          "Complete Profile",
          "Activate Feed",
        ].map((item, i) => (
          <div
            key={item}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 0",
              borderBottom: i < 3 ? "1px solid #f0f0f0" : "none",
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "#C65D21",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <path d="M5 12l5 5L20 7" />
              </svg>
            </div>
            <span
              style={{
                fontSize: 14,
                color: "#333",
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              {item}
            </span>
          </div>
        ))}
      </div>

      {/* Feature badges at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 50,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 24,
        }}
      >
        {features.map((feature, i) => {
          const badgeDelay = 140 + i * 10;
          const badgeProgress = spring({
            frame: Math.max(0, frame - badgeDelay),
            fps,
            config: { damping: 12 },
          });

          return (
            <div
              key={feature}
              style={{
                background: "white",
                borderRadius: 100,
                padding: "12px 24px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                display: "flex",
                alignItems: "center",
                gap: 8,
                opacity: badgeProgress,
                transform: `translateY(${(1 - badgeProgress) * 20}px)`,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#10b981",
                }}
              />
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: "#333",
                  fontFamily: "Inter, system-ui, sans-serif",
                }}
              >
                {feature}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
