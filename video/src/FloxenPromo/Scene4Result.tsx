import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const Scene4Result: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Panel entrance
  const panelScale = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  // Product highlight animation
  const highlightDelay = 30;
  const highlightProgress = spring({
    frame: Math.max(0, frame - highlightDelay),
    fps,
    config: { damping: 15 },
  });

  // Counter animation
  const counterDelay = 60;
  const counterProgress = interpolate(
    frame,
    [counterDelay, counterDelay + 45],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const userCount = Math.floor(counterProgress * 247);

  // Glow pulse effect
  const glowIntensity = interpolate(
    (frame - highlightDelay) % 60,
    [0, 30, 60],
    [0.3, 0.6, 0.3],
    { extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        background: "#f7f7f8",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* ChatGPT-style interface */}
      <div
        style={{
          width: 1000,
          background: "white",
          borderRadius: 24,
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          padding: 48,
          transform: `scale(${panelScale})`,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              background: "#10a37f",
              borderRadius: 8,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <span style={{ color: "white", fontSize: 18, fontWeight: 700 }}>G</span>
          </div>
          <span style={{ fontSize: 18, fontWeight: 600, color: "#202123" }}>
            ChatGPT Shopping
          </span>
        </div>

        {/* Search query shown */}
        <div
          style={{
            background: "#f4f4f4",
            borderRadius: 16,
            padding: "16px 24px",
            marginBottom: 32,
            border: "1px solid #e5e5e5",
          }}
        >
          <span style={{ fontSize: 18, color: "#202123" }}>
            What's the best espresso machine under $200?
          </span>
        </div>

        {/* Results section */}
        <div
          style={{
            fontSize: 14,
            color: "#666",
            marginBottom: 16,
            fontWeight: 500,
          }}
        >
          Top Shopping Results
        </div>

        {/* Product cards */}
        <div style={{ display: "flex", gap: 16 }}>
          {/* YOUR PRODUCT - Highlighted */}
          <div
            style={{
              flex: 1,
              background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
              borderRadius: 12,
              padding: 16,
              border: "2px solid #3b82f6",
              transform: `scale(${1 + highlightProgress * 0.05})`,
              boxShadow: `0 0 ${30 * glowIntensity}px ${10 * glowIntensity}px rgba(59, 130, 246, ${glowIntensity})`,
              position: "relative",
            }}
          >
            {/* Best Match badge */}
            <div
              style={{
                position: "absolute",
                top: -12,
                left: 16,
                background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                color: "white",
                fontSize: 11,
                fontWeight: 600,
                padding: "4px 12px",
                borderRadius: 20,
                opacity: highlightProgress,
              }}
            >
              ⭐ Best Match
            </div>

            <div
              style={{
                width: "100%",
                height: 100,
                background: "linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)",
                borderRadius: 8,
                marginBottom: 12,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 32 }}>☕</span>
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "#1e3a5f",
                marginBottom: 4,
              }}
            >
              Barista Pro 3000
            </div>
            <div style={{ fontSize: 14, color: "#666", marginBottom: 8 }}>
              Professional-grade espresso
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 20, fontWeight: 700, color: "#10b981" }}>
                $189
              </span>
              <div
                style={{
                  background: "#3b82f6",
                  color: "white",
                  padding: "8px 16px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Buy Now
              </div>
            </div>
          </div>

          {/* Other products (less prominent) */}
          {[
            { name: "Basic Espresso Maker", price: "$149" },
            { name: "Coffee Station Mini", price: "$199" },
          ].map((product, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                background: "#fafafa",
                borderRadius: 12,
                padding: 16,
                border: "1px solid #eee",
                opacity: 0.7,
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: 100,
                  background: "#e5e5e5",
                  borderRadius: 8,
                  marginBottom: 12,
                }}
              />
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#666",
                  marginBottom: 4,
                }}
              >
                {product.name}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#333" }}>
                {product.price}
              </div>
            </div>
          ))}
        </div>

        {/* Stats counter */}
        <div
          style={{
            marginTop: 32,
            textAlign: "center",
            padding: "20px 0",
            borderTop: "1px solid #eee",
          }}
        >
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: "#3b82f6",
              marginBottom: 4,
            }}
          >
            {userCount}M+
          </div>
          <div style={{ fontSize: 16, color: "#666" }}>
            ChatGPT Users → Your Products
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
