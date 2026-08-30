import { describe, expect, it } from "vitest";
import { ADD_DRAG_TYPE, readAddDrag, startAddDrag } from "./addDrag.js";

describe("add drag payload", () => {
  it("round-trips an action with payload through dataTransfer", () => {
    const transfer = {
      data: "",
      effectAllowed: "",
      setData(type, value) {
        this.data = `${type}=${value}`;
      },
      getData(type) {
        return type === ADD_DRAG_TYPE
          ? this.data.slice(ADD_DRAG_TYPE.length + 1)
          : "";
      },
    };
    startAddDrag({ dataTransfer: transfer }, "text-h1", { x: 1 });
    expect(readAddDrag({ dataTransfer: transfer })).toEqual({
      action: "text-h1",
      payload: { x: 1 },
    });
  });

  it("returns null for unrelated drag data", () => {
    expect(
      readAddDrag({ dataTransfer: { getData: () => "" } }),
    ).toBeNull();
    expect(
      readAddDrag({ dataTransfer: { getData: () => "not-json" } }),
    ).toBeNull();
  });
});
