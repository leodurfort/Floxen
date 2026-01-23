import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const Scene1LogoReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo entrance with bouncy spring
  const logoScale = spring({
    frame,
    fps,
    config: { damping: 10, stiffness: 100 },
  });

  const logoOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Tagline typewriter effect
  const tagline = "Get Your Products Discovered by AI";
  const taglineDelay = 25;
  const charsPerSecond = 30;
  const framesPerChar = fps / charsPerSecond;
  const taglineFrame = Math.max(0, frame - taglineDelay);
  const visibleChars = Math.floor(taglineFrame / framesPerChar);
  const displayedTagline = tagline.slice(0, visibleChars);

  // Cursor blink for typewriter
  const cursorVisible = Math.floor(frame / 15) % 2 === 0;
  const showCursor = visibleChars < tagline.length || cursorVisible;

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
        }}
      >
        {/* Floxen Icon - stylized F */}
        <div
          style={{
            width: 80,
            height: 80,
            background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
            borderRadius: 20,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            boxShadow: "0 8px 32px rgba(59, 130, 246, 0.4)",
          }}
        >
          <span
            style={{
              fontSize: 48,
              fontWeight: 800,
              color: "white",
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            F
          </span>
        </div>

        {/* Logo text */}
        <span
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "white",
            fontFamily: "Inter, system-ui, sans-serif",
            letterSpacing: "-2px",
          }}
        >
          Floxen
          <span style={{ color: "#3b82f6" }}>.ai</span>
        </span>
      </div>

      {/* Tagline with typewriter effect */}
      <div
        style={{
          marginTop: 40,
          fontSize: 32,
          color: "rgba(255, 255, 255, 0.8)",
          fontFamily: "Inter, system-ui, sans-serif",
          fontWeight: 400,
          minHeight: 50,
        }}
      >
        {displayedTagline}
        {showCursor && (
          <span
            style={{
              color: "#3b82f6",
              marginLeft: 2,
            }}
          >
            |
          </span>
        )}
      </div>
    </AbsoluteFill>
  );
};
