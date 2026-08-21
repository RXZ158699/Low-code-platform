import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CanvasTextCopy from "./CanvasTextCopy.jsx";

describe("CanvasTextCopy", () => {
  it("keeps SVG gradient stops when stroke width is 0", () => {
    const { container } = render(
      <CanvasTextCopy
        item={{
          type: "text",
          text: "渐变字",
          gradientEnabled: true,
          gradientFrom: "#111111",
          gradientTo: "#eeeeee",
          strokeEnabled: false,
          strokeWidth: 0,
        }}
      />,
    );

    const stops = [...container.querySelectorAll("stop")];
    expect(stops).toHaveLength(2);
    expect(stops[0]).toHaveAttribute("stop-color", "#111111");
    expect(stops[1]).toHaveAttribute("stop-color", "#eeeeee");
    expect(container.querySelector("text").getAttribute("fill")).toMatch(/^url\(#/);
    expect(container.querySelector("text")).toHaveAttribute("stroke", "none");
  });

  it("does not change gradient stops when stroke is added", () => {
    const item = {
      type: "text",
      text: "渐变字",
      gradientEnabled: true,
      gradientFrom: "#ff0000",
      gradientTo: "#00ff00",
    };
    const { container, rerender } = render(
      <CanvasTextCopy item={{ ...item, strokeEnabled: false, strokeWidth: 0 }} />,
    );
    const fillOff = container.querySelector("text").getAttribute("fill");
    const stopsOff = [...container.querySelectorAll("stop")].map((stop) => stop.getAttribute("stop-color"));

    rerender(<CanvasTextCopy item={{ ...item, strokeEnabled: true, strokeWidth: 1, strokeColor: "#111827" }} />);
    expect(container.querySelector("text").getAttribute("fill")).toBe(fillOff);
    expect([...container.querySelectorAll("stop")].map((stop) => stop.getAttribute("stop-color"))).toEqual(stopsOff);
    expect(container.querySelector("text")).toHaveAttribute("stroke", "#111827");
  });

  it("paints selected characters with their own fill", () => {
    const { container } = render(
      <CanvasTextCopy
        item={{
          type: "text",
          text: "你好",
          color: "#111827",
          fontSize: 20,
          width: 200,
          height: 40,
          spans: [
            { text: "你" },
            { text: "好", color: "#ff0000" },
          ],
        }}
      />,
    );
    const fills = [...container.querySelectorAll("text")].map((node) => node.getAttribute("fill"));
    expect(fills).toContain("#111827");
    expect(fills).toContain("#ff0000");
  });

  it("circles highlighted characters instead of filling a background", () => {
    const { container } = render(
      <CanvasTextCopy
        item={{
          type: "text",
          text: "你好",
          color: "#111827",
          fontSize: 20,
          width: 200,
          height: 40,
          highlight: "#fde047",
        }}
      />,
    );
    const ellipse = container.querySelector("ellipse");
    expect(ellipse).toHaveAttribute("fill", "none");
    expect(ellipse).toHaveAttribute("stroke", "#fde047");
    expect(container.querySelector("rect")).not.toBeInTheDocument();
  });

  it("paints selected characters with their own type styles", () => {
    const { container } = render(
      <CanvasTextCopy
        item={{
          type: "text",
          text: "你好",
          color: "#111827",
          fontSize: 20,
          fontWeight: 400,
          width: 200,
          height: 40,
          spans: [
            { text: "你" },
            { text: "好", fontWeight: 700, italic: true, underline: true, strikethrough: true },
          ],
        }}
      />,
    );
    const nodes = [...container.querySelectorAll("text")];
    expect(nodes.map((node) => node.style.fontWeight)).toContain("700");
    expect(nodes.map((node) => node.style.fontStyle)).toContain("italic");
    expect(nodes.map((node) => node.style.textDecoration)).toContain("underline line-through");
  });
});
