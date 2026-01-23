import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Cursor3D } from "./Cursor3D";

export const Scene3Solution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Panel entrance
  const panelProgress = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  // Click animation at frame 45
  const clickFrame = 45;
  const isClicking = frame >= clickFrame && frame <= clickFrame + 10;

  // Connected state appears after click
  const connectedDelay = clickFrame + 20;
  const showConnected = frame > connectedDelay;

  const connectedScale = spring({
    frame: Math.max(0, frame - connectedDelay),
    fps,
    config: { damping: 10, stiffness: 100 },
  });

  // Products flowing animation
  const productsDelay = connectedDelay + 30;
  const showProducts = frame > productsDelay;

  // Cursor movement
  const cursorX = interpolate(frame, [0, 40], [700, 580], {
    extrapolateRight: "clamp",
  });
  const cursorY = interpolate(frame, [0, 40], [300, 380], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 60,
          alignItems: "center",
          transform: `scale(${panelProgress})`,
        }}
      >
        {/* WooCommerce panel */}
        <div
          style={{
            width: 400,
            background: "white",
            borderRadius: 20,
            padding: 32,
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          }}
        >
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
                width: 40,
                height: 40,
                background: "#96588a",
                borderRadius: 10,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <span style={{ color: "white", fontSize: 20, fontWeight: 700 }}>
                W
              </span>
            </div>
            <span style={{ fontSize: 20, fontWeight: 600, color: "#333" }}>
              WooCommerce
            </span>
          </div>

          {/* Product list preview */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {["Barista Pro 3000", "Coffee Grinder X", "Milk Frother Plus"].map(
              (product, i) => {
                const productDelay = productsDelay + i * 8;
                const productProgress = showProducts
                  ? spring({
                      frame: Math.max(0, frame - productDelay),
                      fps,
                      config: { damping: 12 },
                    })
                  : 0;

                return (
                  <div
                    key={product}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: 12,
                      background: "#f8f8f8",
                      borderRadius: 8,
                      opacity: productProgress,
                      transform: `translateX(${(1 - productProgress) * -20}px)`,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        background: "#e5e5e5",
                        borderRadius: 6,
                      }}
                    />
                    <span style={{ fontSize: 14, color: "#333" }}>{product}</span>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* Arrow / Connection */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          {/* Connect button or Connected badge */}
          {!showConnected ? (
            <div
              style={{
                padding: "16px 32px",
                background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                borderRadius: 12,
                color: "white",
                fontSize: 18,
                fontWeight: 600,
                boxShadow: "0 4px 16px rgba(59, 130, 246, 0.4)",
                cursor: "pointer",
                transform: isClicking ? "scale(0.95)" : "scale(1)",
                transition: "transform 0.1s",
              }}
            >
              Connect Store
            </div>
          ) : (
            <div
              style={{
                padding: "16px 32px",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                borderRadius: 12,
                color: "white",
                fontSize: 18,
                fontWeight: 600,
                boxShadow: "0 4px 16px rgba(16, 185, 129, 0.4)",
                transform: `scale(${connectedScale})`,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span>✓</span>
              Connected in 30 seconds
            </div>
          )}

          {/* Flowing arrow */}
          {showProducts && (
            <div
              style={{
                fontSize: 32,
                color: "#3b82f6",
                animation: "none",
              }}
            >
              →
            </div>
          )}
        </div>

        {/* Floxen panel */}
        <div
          style={{
            width: 400,
            background: "white",
            borderRadius: 20,
            padding: 32,
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          }}
        >
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
                width: 40,
                height: 40,
                background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                borderRadius: 10,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <span style={{ color: "white", fontSize: 20, fontWeight: 700 }}>
                F
              </span>
            </div>
            <span style={{ fontSize: 20, fontWeight: 600, color: "#333" }}>
              Floxen.ai
            </span>
          </div>

          {/* Synced products */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {["Barista Pro 3000", "Coffee Grinder X", "Milk Frother Plus"].map(
              (product, i) => {
                const productDelay = productsDelay + 15 + i * 10;
                const productProgress = showProducts
                  ? spring({
                      frame: Math.max(0, frame - productDelay),
                      fps,
                      config: { damping: 12 },
                    })
                  : 0;

                return (
                  <div
                    key={product}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: 12,
                      background:
                        productProgress > 0.5
                          ? "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)"
                          : "#f8f8f8",
                      borderRadius: 8,
                      opacity: productProgress,
                      transform: `translateX(${(1 - productProgress) * 20}px)`,
                      border:
                        productProgress > 0.5
                          ? "1px solid #86efac"
                          : "1px solid transparent",
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        background: "#e5e5e5",
                        borderRadius: 6,
                      }}
                    />
                    <span style={{ fontSize: 14, color: "#333", flex: 1 }}>
                      {product}
                    </span>
                    {productProgress > 0.8 && (
                      <span style={{ color: "#10b981", fontWeight: 600 }}>✓</span>
                    )}
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* 3D Cursor */}
      {!showConnected && <Cursor3D x={cursorX} y={cursorY} clicking={isClicking} />}
    </AbsoluteFill>
  );
};
