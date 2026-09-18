import { describe, it, expect } from "vitest";
import { humanizeField } from "@/lib/data/entityLabels";

describe("humanizeField (regression: Research/alerts were rendering raw camelCase field names like 'twelveMonthReturnPercent' to the user)", () => {
  it("uses the explicit label table for known fields", () => {
    expect(humanizeField("twelveMonthReturnPercent")).toBe("12-month return");
    expect(humanizeField("unitPrice")).toBe("unit price");
  });

  it("de-camelCases an unmapped field as a fallback", () => {
    expect(humanizeField("someNewFieldName")).toBe("some new field name");
  });
});
