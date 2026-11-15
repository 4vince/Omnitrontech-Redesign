/**
 * Shared timing for the homepage hero's opening ("inside the AI's mind").
 *
 * Both the HTML layer (home/hero.js) and the 3D camera
 * (visuals/brain-scene.js) read their curves from here, so things that move
 * together (the headline gliding left, the brain sliding right) are driven
 * by the *same* function of scroll progress and cannot drift apart.
 * Kept free of three.js so the main bundle can import it.
 */

/* Progress beats across the pinned track (p, 0-1). */
export const BEATS = { pull: 0.08, reveal: 0.55, hold: 0.9 };

export const clamp01 = (v) => Math.min(1, Math.max(0, v));

export function smooth(a, b, v) {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
}

export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Camera pull-back amount, 0 at the "pull" beat → 1 at the "hold" beat. */
export const pullAt = (p) => smooth(BEATS.pull, BEATS.hold, p);

/*
 * slideAt — once the brain resolves as an object it slides right, clear of
 * the copy column (the copy holds its resting position throughout).
 */
export const slideAt = (p) => easeInOut(smooth(0.26, 0.75, pullAt(p)));

/** The office photograph fades up once the camera is clear of the brain. */
export const photoAt = (p) => smooth(0.36, 0.56, p);
