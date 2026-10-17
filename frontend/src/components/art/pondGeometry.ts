/**
 * Where things sit in the pond art. The capybara and water layers share one square canvas of side S;
 * these fractions were measured from the layer files in the capi-frog-pond pack.
 */
export const S = 210; // the layer canvas, in points

const X0 = 0.1 * S; // visible part of the canvas: left edge
const Y0 = 0.27 * S; // top edge
export const NODE_W = Math.round(0.8 * S); // 168
export const WATER_Y = Math.round(0.405 * S); // waterline, from the top of the visible part
export const WATER_BOTTOM = Math.round(0.52 * S);
export const NODE_H = WATER_BOTTOM + 38; // art plus the name label under it

/** Offsets of the layer canvas inside the visible part. */
export const LAYER_LEFT = -X0;
export const LAYER_TOP = -Y0;

/** The frog box (square) and where its centre sits on the capybara's head. */
export const FROG_BOX = 72;
export const FROG_DX = 0.4 * S - FROG_BOX / 2;
export const FROG_DY = 0.108 * S - FROG_BOX / 2;
