import { describe, expect, it } from "vitest";
import * as contentAssets from "../../src/features/content-assets/index.js";

describe("content-assets public API", () => {
  it("exports only the documented runtime surface", () => {
    expect(Object.keys(contentAssets).sort()).toEqual([
      "ContentAssetError",
      "DEFAULT_CONTENT_ASSET_EXTENSIONS",
      "createContentAssetUrl",
      "syncContentAssets",
    ]);
  });
});
