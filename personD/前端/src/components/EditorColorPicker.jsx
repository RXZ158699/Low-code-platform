import { ColorPicker } from "antd";

export function hexColor(value, fallback = "#111827") {
  const hex = String(value || "").toLowerCase();
  return /^#([0-9a-f]{6})$/.test(hex) ? hex : fallback;
}

function cssHex(color, fallback) {
  return hexColor(String(color?.toHexString?.() || color || "").slice(0, 7), fallback);
}

export default function EditorColorPicker({ label, value, fallback = "#111827", onChange }) {
  const hex = hexColor(value, fallback);
  return (
    <ColorPicker
      value={hex}
      size="small"
      disabledAlpha
      defaultFormat="hex"
      placement="left"
      arrow={false}
      className="editor-color-picker"
      aria-label={label}
      getPopupContainer={() => document.body}
      onChange={(next) => onChange(cssHex(next, fallback))}
    />
  );
}
