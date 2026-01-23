import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Cursor3D } from "./Cursor3D";

export const Scene2Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Panel entrance
  const panelScale = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  // Typewriter for search query
  const query = 'What\'s the best espresso machine under $200?';
  const typeDelay = 20;
  const charsPerSecond = 25;
  const framesPerChar = fps / charsPerSecond;
  const typeFrame = Math.max(0, frame - typeDelay);
  const visibleChars = Math.floor(typeFrame / framesPerChar);
  const displayedQuery = query.slice(0, Math.min(visibleChars, query.length));
  const isTyping = visibleChars < query.length;

  // Results appear after typing
  const resultsDelay = typeDelay + Math.ceil(query.length * framesPerChar) + 15;
  const showResults = frame > resultsDelay;

  const resultsOpacity = interpolate(
    frame,
    [resultsDelay, resultsDelay + 20],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Cursor position (moves to search then to results)
  const cursorX = interpolate(frame, [0, 20, 60], [900, 750, 600], {
    extrapolateRight: "clamp",
  });
  const cursorY = interpolate(frame, [0, 20, 60], [400, 340, 520], {
    extrapolateRight: "clamp",
  });

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
        {/* OpenAI logo placeholder */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 32,
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
            ChatGPT
          </span>
        </div>

        {/* Search input */}
        <div
          style={{
            background: "#f4f4f4",
            borderRadius: 16,
            padding: "16px 24px",
            marginBottom: 32,
            border: "1px solid #e5e5e5",
          }}
        >
          <span
            style={{
              fontSize: 18,
              color: "#202123",
              fontFamily: "Inter, system-ui, sans-serif",
            }}
          >
            {displayedQuery}
            {isTyping && (
              <span style={{ color: "#10a37f", marginLeft: 2 }}>|</span>
            )}
          </span>
        </div>

        {/* Results section */}
        {showResults && (
          <div style={{ opacity: resultsOpacity }}>
            <div
              style={{
                fontSize: 14,
                color: "#666",
                marginBottom: 16,
                fontWeight: 500,
              }}
            >
              Shopping Results
            </div>

            {/* Competitor products (grayed out) */}
            <div style={{ display: "flex", gap: 16 }}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    background: "#fafafa",
                    borderRadius: 12,
                    padding: 16,
                    border: "1px solid #eee",
                    opacity: 0.6,
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      height: 80,
                      background: "#e5e5e5",
                      borderRadius: 8,
                      marginBottom: 12,
                    }}
                  />
                  <div
                    style={{
                      height: 14,
                      background: "#ddd",
                      borderRadius: 4,
                      marginBottom: 8,
                      width: "80%",
                    }}
                  />
                  <div
                    style={{
                      height: 12,
                      background: "#eee",
                      borderRadius: 4,
                      width: "50%",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* "Your product is missing" indicator */}
            <div
              style={{
                marginTop: 24,
                padding: "12px 20px",
                background: "#fef2f2",
                borderRadius: 8,
                border: "1px solid #fecaca",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 20 }}>😔</span>
              <span style={{ color: "#dc2626", fontSize: 14, fontWeight: 500 }}>
                Your products aren't showing up here...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3D Cursor */}
      <Cursor3D x={cursorX} y={cursorY} delay={5} />
    </AbsoluteFill>
  );
};
