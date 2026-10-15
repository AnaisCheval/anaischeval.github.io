#!/usr/bin/env bash
# Media recipes for the site. Needs ffmpeg.
#
#   scripts/media.sh web    in.mp4 [out.mp4]   web-safe H.264 for a page video (keeps audio, max 1280 px wide)
#   scripts/media.sh cover  in.(mp4|gif) out.mp4   small silent loop for a homepage card (max 640 px wide)
#       Aim for 4:3. To crop a 16:9 clip to its centre 4:3 part first:
#       ffmpeg -i in.mp4 -vf "crop=ih*4/3:ih" -an tmp.mp4 && scripts/media.sh cover tmp.mp4 cover.mp4
#   scripts/media.sh poster in.mp4 [seconds]   still frame <name>.poster.jpg (max 960 px), shown before the video plays
#
# Every video X.mp4 on the site has a poster X.poster.jpg next to it; cover.poster.jpg is also the link preview.
#
# With no out file, `web` replaces the input, but only if the result is at least 20% smaller.
# Browsers show a gray box for H.264 above level 4.x or with a bogus frame rate, so every
# recipe forces High profile, level 4.0, yuv420p, a sane fps and +faststart.
set -euo pipefail

h264=(-c:v libx264 -preset slow -profile:v high -level 4.0 -pix_fmt yuv420p -movflags +faststart)
# even dimensions, never upscale
scale() { echo "scale='min($1,iw)':-2"; }

cmd=${1:?usage: media.sh web|cover|poster in [out]}
in=${2:?missing input}

case $cmd in
  web)
    out=${3:-}
    tmp=$(mktemp --suffix=.mp4); chmod 644 "$tmp"
    ffmpeg -v error -y -i "$in" -vf "$(scale 1280),fps=fps='min(source_fps,30)'" "${h264[@]}" -crf 26 \
      -c:a aac -b:a 96k "$tmp"
    if [[ -n $out ]]; then
      mv "$tmp" "$out"
    elif (( $(stat -c%s "$tmp") * 10 < $(stat -c%s "$in") * 8 )); then
      mv "$tmp" "$in"
    else
      rm "$tmp"; echo "kept $in (re-encode not smaller)"
    fi
    ;;
  cover)
    out=${3:?missing output}
    ffmpeg -v error -y -i "$in" -vf "$(scale 640),fps=fps='min(source_fps,30)'" "${h264[@]}" -crf 28 -an "$out"
    ;;
  poster)
    ffmpeg -v error -y -ss "${3:-1}" -i "$in" -frames:v 1 -vf "$(scale 960)" -q:v 5 "${in%.*}.poster.jpg"
    ;;
  *)
    echo "unknown command: $cmd" >&2; exit 1 ;;
esac
