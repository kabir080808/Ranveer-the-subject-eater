import React, { useMemo, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Composition, registerRoot, AbsoluteFill, useCurrentFrame, getInputProps } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { EffectComposer } from "@react-three/postprocessing";
import { ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World } from "../videos/ashoka/world";
const mode = (getInputProps() as { m?: string }).m ?? "box";
const Inner: React.FC = () => {
  const f = useCurrentFrame();
  const { advance, gl, camera, scene } = useThree();
  const world = useMemo(() => (mode === "box" ? null : new World()), []);
  if (world) world.update(1, 100, camera as THREE.PerspectiveCamera, scene);
  useEffect(() => { advance(performance.now()); const c = gl.getContext(); const px = new Uint8Array(4); c.readPixels(540, 960, 1, 1, c.RGBA, c.UNSIGNED_BYTE, px); console.log("PX", mode, Array.from(px).join(",")); });
  const tone = useMemo(() => new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }), []);
  return (<>
    {world ? <primitive object={world.root} dispose={null} /> : <mesh><boxGeometry args={[2, 2, 2]} /><meshBasicMaterial color="red" /></mesh>}
    <EffectComposer multisampling={0}><primitive object={tone} dispose={null} /></EffectComposer>
  </>);
};
const T: React.FC = () => (
  <AbsoluteFill style={{ background: "#88aaff" }}>
    <ThreeCanvas width={1080} height={1920} shadows={mode === "shadow"} camera={{ position: [0, 0, 5] }}><Inner /></ThreeCanvas>
  </AbsoluteFill>
);
registerRoot(() => <Composition id="AshokaShort" component={T} durationInFrames={10} fps={30} width={1080} height={1920} />);
