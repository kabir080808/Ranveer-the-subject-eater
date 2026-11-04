#!/bin/bash
# Final render in chunks (each chunk its own mp4, skipped if already done), then concat. Usage: bash scripts/render_all.sh
cd "$(dirname "$0")/.."
mkdir -p out/final
CH=300
for a in $(seq 0 $CH 2084); do
  b=$((a + CH - 1)); [ $b -gt 2084 ] && b=2084
  f=out/final/part_$(printf %04d $a).mp4
  [ -s $f ] && continue
  node scripts/render.mjs $f.tmp.mp4 1.3333333333333333 $a-$b 3 && mv $f.tmp.mp4 $f && echo "CHUNK $a-$b OK $(date +%T)" || echo "CHUNK $a-$b FAILED $(date +%T)"
done
ls out/final/part_*.mp4 | sed 's/^/file /; s/out\/final\///' > out/final/list.txt
ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i out/final/list.txt -c copy out/final/video.mp4 && echo "CONCAT OK"
