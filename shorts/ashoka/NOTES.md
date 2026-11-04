# The King Who Said Sorry in Stone — production notes

An original 69.5 s vertical cartoon short (1440x2560, 30 fps) about Emperor Ashoka, made with the `cartoon-3d-short`
skill (three.js in Remotion: flat bean-head cards in a 3D toon world, ink pass, lens blur, grade).

| Path | What |
|---|---|
| `SCRIPT.md` | facts with sources + the approved script |
| `voice/` | ElevenLabs narration (voice "Omar – Calm History Storyteller", eleven_v4): `take1.mp3` raw, `voice.wav` with pauses capped at 0.32 s and sped up 1.3x (68.85 s); `words.json` word timings (local faster-whisper small.en, "Galinga" fixed to Kalinga) |
| `remotion/src/videos/ashoka/` | the film: `story.ts` (shots, cues, cameras, lens), `world.ts` (12 sets in one world), `cast.ts` (staging), `toon.ts` (people, + turban/crown/spear), `zoo.ts` (animals, effect cards, edict script, chakra, banknote, lions) |
| `audio/sound.py` | synthesized SFX event table + original score + mix → `audio/mix.wav`, `cues.md` (stems regenerate, not in git) |
| `remotion/scripts/` | `stills.mjs` (look checks), `render.mjs` / `render_all.sh` (chunked final render), `sheet.py`, `short_qa.py` |

## Rebuild
```
cd shorts/ashoka/remotion && npm install
node scripts/stills.mjs out/x_ 100,400 0.5          # look check
bash scripts/render_all.sh                           # final picture -> out/final/video.mp4
python3 -I ../audio/sound.py ..                      # sound -> ../audio/mix.wav
ffmpeg -i out/final/video.mp4 -i ../audio/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -shortest ashoka_short.mp4
```

## Things learned on this machine (Linux cloud container, no GPU)
- Chromium headless shell from `/opt/pw-browsers` with `gl: "swangle"` (software WebGL) renders the post chain.
- `@react-three/postprocessing` draws nothing on the first render after mount here: `Ashoka.tsx` advances R3F again
  after the first few commits. Without it every still is just the background colour.
- `--scale` must give integer sizes: use exactly 4/3 for 1440x2560.
- Speed: ~17 s per 540x960 still (fresh mount), ~10 s per frame at 2K in a sequence (concurrency 2-3) → ~6 h for the film.
- The Kenney GLB props of the bridge template were not shipped with the skill; every prop here is built from primitives.
- A sea plane sized for one set spread under other sets as a black band: keep set-specific planes local.

## Review
One independent verifier pass on 26 stills (colour 8, ink 7, characters 7.5, composition 6.5); its fixes for the fight
cloud, battlefield debris, cow, lion capital, banknote, flag, fridge, sick face and well framing were applied.
