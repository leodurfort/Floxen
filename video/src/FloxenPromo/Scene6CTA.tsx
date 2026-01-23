import React from "react";
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";

export const Scene6CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logos entrance
  const logosProgress = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  // Plus sign pop
  const plusProgress = spring({
    frame: Math.max(0, frame - 10),
    fps,
    config: { damping: 10, stiffness: 100 },
  });

  // CTA button entrance
  const ctaDelay = 30;
  const ctaProgress = spring({
    frame: Math.max(0, frame - ctaDelay),
    fps,
    config: { damping: 12 },
  });

  // Button pulse
  const pulseIntensity = interpolate(
    (frame - ctaDelay) % 45,
    [0, 22, 45],
    [1, 1.03, 1],
    { extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        background: "#0f172a",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      {/* Partnership logos */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 40,
          marginBottom: 60,
          opacity: logosProgress,
          transform: `translateY(${(1 - logosProgress) * 20}px)`,
        }}
      >
        {/* Floxen Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 60,
              height: 60,
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              borderRadius: 16,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              boxShadow: "0 4px 20px rgba(59, 130, 246, 0.4)",
            }}
          >
            <span
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: "white",
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              F
            </span>
          </div>
          <span
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: "white",
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            Floxen
          </span>
        </div>

        {/* Plus sign */}
        <div
          style={{
            fontSize: 40,
            color: "rgba(255, 255, 255, 0.5)",
            fontWeight: 300,
            transform: `scale(${plusProgress})`,
          }}
        >
          +
        </div>

        {/* WooCommerce Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 60,
              height: 60,
              background: "#96588a",
              borderRadius: 16,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              boxShadow: "0 4px 20px rgba(150, 88, 138, 0.4)",
            }}
          >
            <span
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: "white",
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              W
            </span>
          </div>
          <span
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: "white",
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            WooCommerce
          </span>
        </div>

        {/* Plus sign */}
        <div
          style={{
            fontSize: 40,
            color: "rgba(255, 255, 255, 0.5)",
            fontWeight: 300,
            transform: `scale(${plusProgress})`,
          }}
        >
          +
        </div>

        {/* ChatGPT Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 60,
              height: 60,
              background: "#10a37f",
              borderRadius: 16,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              boxShadow: "0 4px 20px rgba(16, 163, 127, 0.4)",
            }}
          >
            <span
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: "white",
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              G
            </span>
          </div>
          <span
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: "white",
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            ChatGPT
          </span>
        </div>
      </div>

      {/* CTA Button */}
      <div
        style={{
          opacity: ctaProgress,
          transform: `scale(${ctaProgress * pulseIntensity}) translateY(${(1 - ctaProgress) * 30}px)`,
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
            padding: "20px 48px",
            borderRadius: 16,
            fontSize: 24,
            fontWeight: 600,
            color: "white",
            fontFamily: "Inter, system-ui, sans-serif",
            boxShadow: "0 8px 32px rgba(59, 130, 246, 0.5)",
            cursor: "pointer",
          }}
        >
          Start Free Today →
        </div>
      </div>

      {/* Subtext */}
      <div
        style={{
          marginTop: 24,
          fontSize: 16,
          color: "rgba(255, 255, 255, 0.6)",
          fontFamily: "Inter, system-ui, sans-serif",
          opacity: ctaProgress,
        }}
      >
        No credit card required • 5 products free forever
      </div>

      {/* Website */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          fontSize: 20,
          color: "rgba(255, 255, 255, 0.4)",
          fontFamily: "Inter, system-ui, sans-serif",
          opacity: ctaProgress,
        }}
      >
        floxen.ai
      </div>
    </AbsoluteFill>
  );
};
