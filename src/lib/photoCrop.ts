// Finds the product photo inside a screenshot (a WhatsApp chat, a Marketplace page, and so on).
// It is a free, in-browser guess with no AI, and the admin can always adjust the crop afterwards.
//
// It works on a small copy of the screenshot (about 480 px wide) in 4x4 pixel blocks:
//  - "Foreground" blocks are the ones that are not plain background.
//  - Text shows up as thin, gappy bands. A photo is a big, mostly filled rectangle with plenty of colour.
//  - If a shape is mostly one flat colour (a chat bubble, or black bars beside a tall photo), that colour is
//    treated as the background and the search repeats inside it, so only the photo is left.

export type Region = { x: number; y: number; w: number; h: number }; // fractions of the image, 0 to 1

type Box = { x0: number; y0: number; x1: number; y1: number }; // in blocks, inclusive
type Found = Box & { score: number };

const B = 4; // block size in pixels
const TEXTURE = 7; // luminance variation that counts as "something is here"
const BG_DISTANCE = 45; // how different from the background a block must be to count

export function findPhotoRegion(rgba: Uint8ClampedArray, width: number, height: number): Region | null {
  const gx = Math.floor(width / B);
  const gy = Math.floor(height / B);
  if (gx < 10 || gy < 10) return null;
  const n = gx * gy;

  // Average colour and detail level of every block
  const mean = new Float32Array(n * 3);
  const std = new Float32Array(n);
  for (let by = 0; by < gy; by++) {
    for (let bx = 0; bx < gx; bx++) {
      let r = 0, g = 0, b = 0, l = 0, l2 = 0;
      for (let y = 0; y < B; y++) {
        let p = ((by * B + y) * width + bx * B) * 4;
        for (let x = 0; x < B; x++, p += 4) {
          const R = rgba[p], G = rgba[p + 1], Bl = rgba[p + 2];
          const lum = 0.299 * R + 0.587 * G + 0.114 * Bl;
          r += R; g += G; b += Bl; l += lum; l2 += lum * lum;
        }
      }
      const k = B * B;
      const i = by * gx + bx;
      mean[i * 3] = r / k; mean[i * 3 + 1] = g / k; mean[i * 3 + 2] = b / k;
      const ml = l / k;
      std[i] = Math.sqrt(Math.max(0, l2 / k - ml * ml));
    }
  }
  const colourKey = (i: number) => ((mean[i * 3] >> 5) << 6) | ((mean[i * 3 + 1] >> 5) << 3) | (mean[i * 3 + 2] >> 5);

  const search = (box: Box, depth: number): Found | null => {
    // The background of this area is its most common colour
    const bins = new Map<number, { count: number; r: number; g: number; b: number }>();
    for (let y = box.y0; y <= box.y1; y++) {
      for (let x = box.x0; x <= box.x1; x++) {
        const i = y * gx + x;
        const key = colourKey(i);
        const e = bins.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
        e.count++; e.r += mean[i * 3]; e.g += mean[i * 3 + 1]; e.b += mean[i * 3 + 2];
        bins.set(key, e);
      }
    }
    let top = { count: 0, r: 255, g: 255, b: 255 };
    for (const e of bins.values()) if (e.count > top.count) top = e;
    const bg = [top.r / top.count, top.g / top.count, top.b / top.count];

    // Foreground: not plain background, then grown by one block so nearby blocks join up
    const fg = new Uint8Array(n);
    for (let y = box.y0; y <= box.y1; y++) {
      for (let x = box.x0; x <= box.x1; x++) {
        const i = y * gx + x;
        const dr = mean[i * 3] - bg[0], dg = mean[i * 3 + 1] - bg[1], db = mean[i * 3 + 2] - bg[2];
        fg[i] = std[i] >= TEXTURE || Math.sqrt(dr * dr + dg * dg + db * db) >= BG_DISTANCE ? 1 : 0;
      }
    }
    const fused = new Uint8Array(n);
    for (let y = box.y0; y <= box.y1; y++) {
      for (let x = box.x0; x <= box.x1; x++) {
        if (!fg[y * gx + x]) continue;
        for (let yy = Math.max(box.y0, y - 1); yy <= Math.min(box.y1, y + 1); yy++)
          for (let xx = Math.max(box.x0, x - 1); xx <= Math.min(box.x1, x + 1); xx++) fused[yy * gx + xx] = 1;
      }
    }

    const seen = new Uint8Array(n);
    let best: Found | null = null;
    for (let sy = box.y0; sy <= box.y1; sy++) {
      for (let sx = box.x0; sx <= box.x1; sx++) {
        const s = sy * gx + sx;
        if (!fused[s] || seen[s]) continue;

        // Flood fill one shape
        let x0 = gx, y0 = gy, x1 = 0, y1 = 0;
        const stack = [s];
        seen[s] = 1;
        while (stack.length) {
          const c = stack.pop() as number;
          const cx = c % gx, cy = (c / gx) | 0;
          if (cx < x0) x0 = cx;
          if (cx > x1) x1 = cx;
          if (cy < y0) y0 = cy;
          if (cy > y1) y1 = cy;
          if (cx > box.x0 && fused[c - 1] && !seen[c - 1]) { seen[c - 1] = 1; stack.push(c - 1); }
          if (cx < box.x1 && fused[c + 1] && !seen[c + 1]) { seen[c + 1] = 1; stack.push(c + 1); }
          if (cy > box.y0 && fused[c - gx] && !seen[c - gx]) { seen[c - gx] = 1; stack.push(c - gx); }
          if (cy < box.y1 && fused[c + gx] && !seen[c + gx]) { seen[c + gx] = 1; stack.push(c + gx); }
        }

        const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
        const total = bw * bh;
        const areaFrac = total / n;
        const aspect = bw / bh;
        if (areaFrac < 0.04 || bw < gx * 0.15 || bh < gy * 0.06 || aspect < 0.25 || aspect > 4) continue;

        // How photo-like is it? Mostly filled, with a good spread of colours.
        let filled = 0, dom = 0;
        const colours = new Map<number, number>();
        for (let y = y0; y <= y1; y++) {
          for (let x = x0; x <= x1; x++) {
            const i = y * gx + x;
            if (fg[i]) filled++;
            const key = colourKey(i);
            colours.set(key, (colours.get(key) ?? 0) + 1);
          }
        }
        let variety = 0;
        for (const c of colours.values()) {
          if (c >= total * 0.015) variety++;
          if (c > dom) dom = c;
        }
        const fill = filled / total;
        if (fill < 0.6 || variety < 3) continue;

        let cand: Found | null;
        if (dom / total >= 0.2 && depth < 2) {
          // Mostly one flat colour: a chat bubble or letterbox bars. Look inside it for the real photo.
          // Step in by two blocks first, so the edge where the bubble meets the page is not mistaken for detail.
          if (bw < 14 || bh < 14) continue;
          cand = search({ x0: x0 + 2, y0: y0 + 2, x1: x1 - 2, y1: y1 - 2 }, depth + 1);
        } else {
          // Trim thin, mostly empty rows and columns at the edges
          const rowFill = (y: number) => {
            let t = 0;
            for (let x = x0; x <= x1; x++) t += fg[y * gx + x];
            return t / (x1 - x0 + 1);
          };
          const colFill = (x: number) => {
            let t = 0;
            for (let y = y0; y <= y1; y++) t += fg[y * gx + x];
            return t / (y1 - y0 + 1);
          };
          const maxY = Math.floor(bh * 0.2), maxX = Math.floor(bw * 0.2);
          for (let t = 0; t < maxY && y0 < y1 && rowFill(y0) < 0.5; t++) y0++;
          for (let t = 0; t < maxY && y1 > y0 && rowFill(y1) < 0.5; t++) y1--;
          for (let t = 0; t < maxX && x0 < x1 && colFill(x0) < 0.5; t++) x0++;
          for (let t = 0; t < maxX && x1 > x0 && colFill(x1) < 0.5; t++) x1--;
          cand = { x0, y0, x1, y1, score: areaFrac * fill * Math.min(variety, 10) };
        }
        if (cand && (!best || cand.score > best.score)) best = cand;
      }
    }
    return best;
  };

  const found = search({ x0: 0, y0: 0, x1: gx - 1, y1: gy - 1 }, 0);
  if (!found) return null;
  return {
    x: (found.x0 * B) / width,
    y: (found.y0 * B) / height,
    w: ((found.x1 - found.x0 + 1) * B) / width,
    h: ((found.y1 - found.y0 + 1) * B) / height,
  };
}
