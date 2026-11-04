// usage: node scripts/render.mjs <out.mp4> [scale] [from-to] [concurrency]  (software GL in headless chromium, h264 crf 16)
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [out, scale = "1.3333", range, conc = "2"] = process.argv.slice(2);
const browserExecutable = "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const chromiumOptions = { gl: "swangle" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: "AshokaShort", browserExecutable, chromiumOptions });
const frameRange = range ? range.split("-").map(Number) : null;
const t0 = Date.now(); let last = 0;
await renderMedia({ composition, serveUrl, codec: "h264", crf: 16, outputLocation: out, scale: Number(scale), browserExecutable, chromiumOptions,
  concurrency: Number(conc), frameRange, timeoutInMilliseconds: 600000, muted: true,
  onProgress: ({ renderedFrames, progress }) => { if (renderedFrames - last >= 25 || progress === 1) { last = renderedFrames; console.log(`frames ${renderedFrames} ${((Date.now() - t0) / 1000).toFixed(0)}s`); } } });
console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
