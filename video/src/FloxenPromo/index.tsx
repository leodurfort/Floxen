import React from "react";
import {
  TransitionSeries,
  linearTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";

import { Scene1LogoReveal } from "./Scene1LogoReveal";
import { Scene2Problem } from "./Scene2Problem";
import { Scene3Solution } from "./Scene3Solution";
import { Scene4Result } from "./Scene4Result";
import { Scene5Features } from "./Scene5Features";
import { Scene6CTA } from "./Scene6CTA";

// 30fps, 30 seconds = 900 frames total
// Scene durations (in frames at 30fps):
// Scene 1: 0-3s = 90 frames
// Scene 2: 3-8s = 150 frames
// Scene 3: 8-15s = 210 frames
// Scene 4: 15-22s = 210 frames
// Scene 5: 22-27s = 150 frames
// Scene 6: 27-30s = 90 frames

const TRANSITION_DURATION = 15; // 0.5 seconds

export const FloxenPromo: React.FC = () => {
  return (
    <TransitionSeries>
      {/* Scene 1: Logo Reveal (0-3s) */}
      <TransitionSeries.Sequence durationInFrames={90}>
        <Scene1LogoReveal />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: "from-right" })}
        timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
      />

      {/* Scene 2: The Problem (3-8s) */}
      <TransitionSeries.Sequence durationInFrames={150}>
        <Scene2Problem />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
      />

      {/* Scene 3: The Solution (8-15s) */}
      <TransitionSeries.Sequence durationInFrames={210}>
        <Scene3Solution />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
      />

      {/* Scene 4: The Result (15-22s) */}
      <TransitionSeries.Sequence durationInFrames={210}>
        <Scene4Result />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
      />

      {/* Scene 5: Features (22-27s) */}
      <TransitionSeries.Sequence durationInFrames={150}>
        <Scene5Features />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
      />

      {/* Scene 6: CTA (27-30s) */}
      <TransitionSeries.Sequence durationInFrames={90}>
        <Scene6CTA />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};

// Calculate total duration accounting for transitions
// Total = sum of sequences - (number of transitions * transition duration)
// = (90 + 150 + 210 + 210 + 150 + 90) - (5 * 15)
// = 900 - 75 = 825 frames
// At 30fps = 27.5 seconds

export const FLOXEN_PROMO_DURATION = 825;
