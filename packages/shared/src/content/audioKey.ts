import { normalizeUtterance } from "../scoring/normalize.js";

/** File-name key for a spoken item: "Magandang umaga" -> "magandang-umaga". */
export function audioKey(text: string): string {
  return normalizeUtterance(text).replace(/\s+/g, "-");
}
