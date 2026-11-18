"""
Builds the "room camera" plates for a hero photo (developer-only, run once).

  python scripts/make-room-plates.py <depth-model.onnx> scripts/room/<name>.json [<name> ...]

Per photo it writes to public/images/room/:
  <name>-outside.webp  the skyline with the office painted out (seen through the glass)
  <name>-inside.webp   the office with the glass cut out (alpha)
  <name>-depth.webp    near = white, dilated and softened so edges do not tear

Needs: numpy, opencv-python, onnxruntime, and the Depth Anything V2 Small
ONNX model (huggingface.co/onnx-community/depth-anything-v2-small).
The glass is drawn by hand in the JSON (polygons, mullion x-ranges, extra
exclusions) because a depth model sees glass and sky as the same distance.
"""
import json, os, sys
import cv2
import numpy as np
import onnxruntime as ort

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "images", "room")


def depth_of(model, rgb):
    h, w = 518, 924  # multiples of 14 near the photo's 16:9
    x = cv2.resize(rgb, (w, h), interpolation=cv2.INTER_CUBIC)
    x = (x - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
    x = x.transpose(2, 0, 1)[None].astype(np.float32)
    d = ort.InferenceSession(model).run(None, {"pixel_values": x})[0][0]
    d = (d - d.min()) / (d.max() - d.min())  # 1 = nearest
    return cv2.resize(d, (rgb.shape[1], rgb.shape[0]), interpolation=cv2.INTER_CUBIC)


def fill_outside(img, valid, region):
    """Continue the view through the glass into everything that is not glass.

    1. Gaps bounded left and right on the same row (mullions, monitors) are
       interpolated across, which suits a horizontal skyline and water.
    2. Above the glass, the sky continues and darkens; below it, the water
       mirrors what is above the waterline (a reflection).
    3. Columns with no glass at all mirror the nearest filled columns.
    """
    h, w = valid.shape
    out = img.copy()
    have = valid.copy()
    xs = np.arange(w)
    for y in range(h):
        v = np.flatnonzero(valid[y])
        if len(v) < 2:
            continue
        span = (xs > v[0]) & (xs < v[-1]) & ~valid[y]
        if span.any():
            for c in range(3):
                out[y, span, c] = np.interp(xs[span], v, img[y, v, c])
            have[y, span] = True
        # Holes at a pane's edge (an object in front of the glass): mirror
        # the row sideways from the glass, within the drawn pane.
        r = np.flatnonzero(region[y])
        if len(r):
            for x in range(v[-1] + 1, r[-1] + 1):
                out[y, x] = out[y, max(v[0], 2 * v[-1] - x)]
                have[y, x] = True
            for x in range(r[0], v[0]):
                out[y, x] = out[y, min(v[-1], 2 * v[0] - x)]
                have[y, x] = True
    cols = np.flatnonzero(have.any(axis=0))
    for x in cols:
        v = np.flatnonzero(have[:, x])
        t, b = v[0], v[-1]
        if t > 0:  # sky: continue the column's own top tone upward, deepening
            sky = out[t : t + 24, x].mean(axis=0)
            ramp = np.linspace(1, 0, t)[:, None]
            out[:t, x] = sky * (1 - 0.35 * ramp)
        if b < h - 1:  # water: mirror upward from the waterline, dimmed
            n = h - 1 - b
            src = np.clip(b - np.arange(1, n + 1), t, b)
            out[b + 1 :, x] = out[src, x] * 0.82
    if len(cols):
        a, z = cols[0], cols[-1]
        for x in range(0, a):  # mirror leftward
            out[:, x] = out[:, min(z, a + (a - x))]
        for x in range(z + 1, w):  # mirror rightward
            out[:, x] = out[:, max(a, z - (x - z))]
    fill = ~valid
    blurred = cv2.GaussianBlur(out, (0, 0), 3)
    out[fill] = blurred[fill]
    return out


def build(model, cfg_path):
    name = os.path.splitext(os.path.basename(cfg_path))[0]
    cfg = json.load(open(cfg_path))
    bgr = cv2.imread(os.path.join(ROOT, cfg["photo"]))
    h, w = bgr.shape[:2]
    depth = depth_of(model, bgr[:, :, ::-1].astype(np.float32) / 255.0)

    # Glass: the drawn panes, minus mullions, exclusions and anything near.
    glass = np.zeros((h, w), np.uint8)
    for poly in cfg["glass"]:
        cv2.fillPoly(glass, [np.array(poly, np.int32)], 255)
    region = glass > 0
    for x0, x1 in cfg["mullions"]:
        glass[:, x0:x1] = 0
    for poly in cfg["exclude"]:
        cv2.fillPoly(glass, [np.array(poly, np.int32)], 0)
    near = (cv2.GaussianBlur(depth, (0, 0), 1.5) > cfg["depthCut"]).astype(np.uint8)
    near = cv2.dilate(near, np.ones((5, 5), np.uint8))
    glass[near > 0] = 0
    glass = cv2.morphologyEx(glass, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    soft = cv2.GaussianBlur(glass.astype(np.float32) / 255.0, (0, 0), 1.2)

    # Outside: keep the glass pixels and extend the scene past them the way
    # it would continue (see fill_outside), so the camera can look past the
    # glass edges mid-move without hitting smears.
    filled = fill_outside(bgr.astype(np.float32), cv2.erode(glass, np.ones((3, 3), np.uint8)) > 0, region)
    k = soft[:, :, None]
    outside = np.clip(bgr * k + filled * (1 - k), 0, 255).astype(np.uint8)

    # Inside: the photo with the glass transparent.
    inside = np.dstack([bgr, ((1 - soft) * 255).astype(np.uint8)])

    # Depth for the vertex shader: far stays 0, near objects grow a few px
    # past their edge so triangles stretch over the floor, not the object.
    d = np.clip(depth, 0, 1)
    d = cv2.dilate(d, np.ones((9, 9), np.uint8))
    d = cv2.GaussianBlur(d, (0, 0), 3)
    d = cv2.resize(d, (w // 2, h // 2), interpolation=cv2.INTER_AREA)

    os.makedirs(OUT, exist_ok=True)
    q = [cv2.IMWRITE_WEBP_QUALITY, 82]
    cv2.imwrite(os.path.join(OUT, f"{name}-outside.webp"), outside, q)
    cv2.imwrite(os.path.join(OUT, f"{name}-inside.webp"), inside, q)
    cv2.imwrite(os.path.join(OUT, f"{name}-depth.webp"), (d * 255).astype(np.uint8), [cv2.IMWRITE_WEBP_QUALITY, 90])
    print(name, "ok")


if __name__ == "__main__":
    for cfg in sys.argv[2:]:
        build(sys.argv[1], cfg)
