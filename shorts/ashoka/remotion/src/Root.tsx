import React from "react";
import { Composition } from "remotion";
import { AshokaShort, ASHOKA_FRAMES } from "./videos/ashoka/Ashoka";

export const RemotionRoot: React.FC = () => (
  <Composition id="AshokaShort" component={AshokaShort} durationInFrames={ASHOKA_FRAMES} fps={30} width={1080} height={1920} />
);
