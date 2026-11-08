/**
 * Shared timing for the homepage robot hero.
 *
 * Both the HTML layer (home/hero.js) and the 3D camera
 * (visuals/robot-scene.js) read their curves from here, so things that move
 * together — the headline gliding left and the visor sliding right — are
 * driven by the *same* function of scroll progress and cannot drift apart.
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
 * The hand-off is sequenced (lead → follow), not simultaneous: while the
 * visor is still large it covers the left column whatever the curve, so the
 * two can only avoid crossing if they take turns.
 *
 *   titleAt — the headline LEADS: it glides from the centre of the lens to
 *             the left column while the display still fills the screen.
 *   slideAt — the robot FOLLOWS: it slides right as the headline lands
 *             (a small overlap keeps it one continuous motion), so the
 *             shrinking visor clears the left column behind settled text.
 */
export const titleAt = (p) => easeInOut(smooth(0, 0.32, pullAt(p)));
export const slideAt = (p) => easeInOut(smooth(0.26, 0.75, pullAt(p)));

/** The three-quarter turn, which follows once the visor frame has cleared. */
export const turnAt = (p) => easeInOut(smooth(0.35, 1, pullAt(p)));
