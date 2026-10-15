#!/usr/bin/env bash
# Media recipes for the site. Needs ffmpeg.
#
#   scripts/media.sh web    in.mp4 [out.mp4]   web-safe H.264 for a page video (keeps audio, max 1280 px wide)
#   scripts/media.sh cover  in.(mp4|gif) out.mp4   small silent loop for a homepage card (max 640 px wide)
#       Aim for 4:3. To crop a 16:9 clip to its centre 4:3 part first:
#       ffmpeg -i in.mp4 -vf "crop=ih*4/3:ih" -an tmp.mp4 && scripts/media.sh cover tmp.mp4 cover.mp4
#       CRF=31 scripts/media.sh cover ... gives a smaller file (default 28; keep covers under ~300 KB).
#   scripts/media.sh poster in.mp4 [seconds]   still frame <name>.poster.jpg (max 960 px), shown before the video plays
#   scripts/media.sh figure in.(pdf|png) out.png   figure for a page: ~1600 px wide, transparent parts made white
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
# at most 30 fps; slower sources keep their rate (ffmpeg 4.4 has no min(source_fps,30))
fpscap() {
  ffprobe -v error -select_streams v:0 -show_entries stream=avg_frame_rate -of csv=p=0 "$1" |
    awk -F/ '{ f = $2 ? $1 / $2 : $1; print (f > 30 || f == 0) ? "fps=30" : "null" }'
}

cmd=${1:?usage: media.sh web|cover|poster|figure in [out]}
in=${2:?missing input}

case $cmd in
  web)
    out=${3:-}
    tmp=$(mktemp --suffix=.mp4); chmod 644 "$tmp"
    ffmpeg -nostdin -v error -y -i "$in" -vf "$(scale 1280),$(fpscap "$in")" "${h264[@]}" -crf 26 \
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
    ffmpeg -nostdin -v error -y -i "$in" -vf "$(scale 640),$(fpscap "$in")" "${h264[@]}" -crf "${CRF:-28}" -an "$out"
    ;;
  poster)
    ffmpeg -nostdin -v error -y -ss "${3:-1}" -i "$in" -frames:v 1 -vf "$(scale 960)" -q:v 5 "${in%.*}.poster.jpg"
    ;;
  figure)
    # PDF (first page) or image -> PNG about 1600 px wide on a white background, readable in dark mode.
    # Needs poppler-utils (pdftoppm) and ImageMagick (convert).
    out=${3:?missing output}
    if [[ $in == *.pdf ]]; then
      w=$(pdfinfo "$in" | awk '/Page size/ { print $3 }')
      dpi=$(awk -v w="$w" 'BEGIN { d = int(1600 * 72 / w + 0.5); print (d > 600 ? 600 : d) }')
      pdftoppm -png -r "$dpi" -singlefile "$in" "${out%.png}"
    else
      cp "$in" "$out"
    fi
    convert "$out" -background white -alpha remove -alpha off -resize '2000x2000>' -strip "$out"
    ;;
  *)
    echo "unknown command: $cmd" >&2; exit 1 ;;
esac
