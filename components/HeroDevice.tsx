"use client";

import { useEffect, useRef } from "react";
import { FoldablePhone, PhoneDevice, useFoldablePhone } from "./iphone-duo";

function AutoUnfold({ target }: { target: React.RefObject<HTMLDivElement | null> }) {
  const { progress, toggle } = useFoldablePhone();

  useEffect(() => {
    const el = target.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || progress.get() > 0.5) return;
        toggle();
        io.disconnect();
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [progress, toggle, target]);

  return null;
}

export function HeroDevice() {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className="hero-device" ref={ref}>
      <FoldablePhone duration={2} className="hero-duo">
        <AutoUnfold target={ref} />
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
      </FoldablePhone>
    </div>
  );
}
