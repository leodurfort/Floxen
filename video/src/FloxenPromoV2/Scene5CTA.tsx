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

export const Scene5CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logos entrance
  const logosProgress = spring({
    frame,
    fps,
    config: { damping: 15 },
  });

  // CTA button
  const ctaDelay = 30;
  const ctaProgress = spring({
    frame: Math.max(0, frame - ctaDelay),
    fps,
    config: { damping: 10, stiffness: 100 },
  });

  // Pulse animation for button
  const pulseIntensity = interpolate(
    (frame - ctaDelay) % 60,
    [0, 30, 60],
    [1, 1.02, 1],
    { extrapolateRight: "clamp" }
  );

  // Subtext
  const subtextDelay = 50;
  const subtextOpacity = interpolate(frame, [subtextDelay, subtextDelay + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "#0f0f14",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      {/* Subtle gradient background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, rgba(198,93,33,0.08) 0%, transparent 60%)",
        }}
      />

      {/* Partnership logos */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 48,
          marginBottom: 60,
          opacity: logosProgress,
          transform: `translateY(${(1 - logosProgress) * 30}px)`,
        }}
      >
        {/* Floxen Logo */}
        <Img
          src={staticFile("logo_orange.png")}
          style={{
            height: 50,
            objectFit: "contain",
          }}
        />

        {/* Plus */}
        <div
          style={{
            fontSize: 32,
            color: "rgba(255,255,255,0.3)",
            fontWeight: 300,
          }}
        >
          +
        </div>

        {/* WooCommerce text logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              background: "#96588a",
              borderRadius: 10,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <span style={{ color: "white", fontSize: 24, fontWeight: 700 }}>W</span>
          </div>
          <span
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: "white",
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            WooCommerce
          </span>
        </div>

        {/* Plus */}
        <div
          style={{
            fontSize: 32,
            color: "rgba(255,255,255,0.3)",
            fontWeight: 300,
          }}
        >
          +
        </div>

        {/* ChatGPT text logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              background: "#10a37f",
              borderRadius: 10,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <span style={{ color: "white", fontSize: 24, fontWeight: 700 }}>G</span>
          </div>
          <span
            style={{
              fontSize: 28,
              fontWeight: 600,
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
          transform: `scale(${ctaProgress * pulseIntensity})`,
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #C65D21 0%, #a84d1a 100%)",
            padding: "22px 56px",
            borderRadius: 16,
            fontSize: 26,
            fontWeight: 600,
            color: "white",
            fontFamily: "Inter, system-ui, sans-serif",
            boxShadow: "0 8px 40px rgba(198, 93, 33, 0.5)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          Start Free Today
          <span style={{ fontSize: 24 }}>→</span>
        </div>
      </div>

      {/* Subtext */}
      <div
        style={{
          marginTop: 28,
          fontSize: 18,
          color: "rgba(255, 255, 255, 0.5)",
          fontFamily: "Inter, system-ui, sans-serif",
          opacity: subtextOpacity,
        }}
      >
        No credit card required • 5 products free forever
      </div>

      {/* Website URL */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          fontSize: 20,
          color: "rgba(255, 255, 255, 0.3)",
          fontFamily: "Inter, system-ui, sans-serif",
          letterSpacing: 1,
          opacity: subtextOpacity,
        }}
      >
        floxen.ai
      </div>
    </AbsoluteFill>
  );
};
