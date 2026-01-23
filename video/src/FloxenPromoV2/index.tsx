import React from "react";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";

import { Scene1Logo } from "./Scene1Logo";
import { Scene2Problem } from "./Scene2Problem";
import { Scene3Solution } from "./Scene3Solution";
import { Scene4Result } from "./Scene4Result";
import { Scene5CTA } from "./Scene5CTA";

// 30fps timing:
// Scene 1 (Logo): 3s = 90 frames
// Scene 2 (Problem): 4s = 120 frames
// Scene 3 (Solution): 6s = 180 frames
// Scene 4 (Result/Video): 12s = 360 frames (to show most of the 21s recording)
// Scene 5 (CTA): 4s = 120 frames

const TRANSITION_DURATION = 20; // ~0.67 seconds for smoother transitions

export const FloxenPromoV2: React.FC = () => {
  return (
    <TransitionSeries>
      {/* Scene 1: Logo Reveal */}
      <TransitionSeries.Sequence durationInFrames={90}>
        <Scene1Logo />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
      />

      {/* Scene 2: The Problem */}
      <TransitionSeries.Sequence durationInFrames={120}>
        <Scene2Problem />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
      />

      {/* Scene 3: The Solution (Floxen Dashboard) */}
      <TransitionSeries.Sequence durationInFrames={180}>
        <Scene3Solution />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: "from-bottom" })}
        timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
      />

      {/* Scene 4: The Result (ChatGPT Recording) */}
      <TransitionSeries.Sequence durationInFrames={420}>
        <Scene4Result />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
      />

      {/* Scene 5: CTA */}
      <TransitionSeries.Sequence durationInFrames={120}>
        <Scene5CTA />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};

// Total duration calculation:
// Sum of sequences: 90 + 120 + 180 + 420 + 120 = 930 frames
// Minus transitions: 4 * 20 = 80 frames
// Total: 930 - 80 = 850 frames = ~28.3 seconds at 30fps
export const FLOXEN_PROMO_V2_DURATION = 850;
