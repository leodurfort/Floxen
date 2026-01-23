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

export const Scene1Logo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo entrance with spring
  const logoProgress = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  const logoScale = interpolate(logoProgress, [0, 1], [0.8, 1]);
  const logoOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Tagline fade in
  const taglineOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const taglineY = interpolate(frame, [30, 50], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtitle fade in
  const subtitleOpacity = interpolate(frame, [50, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f1a 100%)",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      {/* Subtle gradient orbs in background */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(198,93,33,0.15) 0%, transparent 70%)",
          top: "10%",
          left: "10%",
          filter: "blur(60px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(198,93,33,0.1) 0%, transparent 70%)",
          bottom: "10%",
          right: "15%",
          filter: "blur(80px)",
        }}
      />

      {/* Logo */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
          marginBottom: 40,
        }}
      >
        <Img
          src={staticFile("logo_orange.png")}
          style={{
            height: 120,
            objectFit: "contain",
          }}
        />
      </div>

      {/* Tagline */}
      <div
        style={{
          fontSize: 42,
          fontWeight: 500,
          color: "white",
          fontFamily: "Inter, system-ui, sans-serif",
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
          textAlign: "center",
          maxWidth: 800,
        }}
      >
        Get Your Products Discovered by AI
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: 24,
          color: "rgba(255, 255, 255, 0.6)",
          fontFamily: "Inter, system-ui, sans-serif",
          opacity: subtitleOpacity,
          marginTop: 20,
        }}
      >
        Connect WooCommerce to ChatGPT Shopping
      </div>
    </AbsoluteFill>
  );
};
