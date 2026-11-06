"use client";

import { AppleCredit, FoldablePhone, FoldScrubber, FoldToggle, PhoneDevice } from "./iphone-duo";

export function HeroDevice() {
  return (
    <div className="hero-device">
      <FoldablePhone duration={2} defaultValue={1} className="hero-duo">
        <PhoneDevice
          modelSrc="/models/iphone-duo.glb"
          screenSrc="/wallpapers/apple-desert.avif"
          coverSrc="/wallpapers/apple-desert-cover.avif"
          screenOverlaySrc="/hypersep/aggregator.svg"
          coverOverlaySrc="/wallpapers/home-cover.svg"
          revealSrc="/hypersep/agent-chat.svg"
          blur={36}
          parallax={1}
        />
        <div className="hero-duo-controls">
          <FoldToggle className="chip-btn" />
          <FoldScrubber aria-label="Fold angle" />
          <AppleCredit />
        </div>
      </FoldablePhone>
    </div>
  );
}
