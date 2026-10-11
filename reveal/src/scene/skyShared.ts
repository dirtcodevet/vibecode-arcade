import { Color } from 'three'

/**
 * Uniforms shared by the sky dome and the lake. When a painted backdrop loads, it samples the painting's top edge
 * into uTop so the procedural sky above the painting continues the same color.
 */
export const skyShared = {
  /** sRGB color of the painting's upper edge. */
  uTop: { value: new Color(0.06, 0.07, 0.16) },
  /** sRGB color of the painting's lower edge, continued below it. */
  uBottom: { value: new Color(0.04, 0.04, 0.09) },
  /** 0 = procedural sky colors, 1 = continue the painting's sky. */
  uTopMix: { value: 0 },
}
