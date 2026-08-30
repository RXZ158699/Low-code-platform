export const ADD_DRAG_TYPE = "application/x-editor-add";

export function startAddDrag(event, action, payload) {
  const transfer = event?.dataTransfer;
  if (!transfer) return;
  transfer.setData(ADD_DRAG_TYPE, JSON.stringify({ action, payload }));
  transfer.effectAllowed = "copy";
}

export function readAddDrag(event) {
  const raw = event?.dataTransfer?.getData(ADD_DRAG_TYPE);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data.action !== "string") return null;
    return data;
  } catch {
    return null;
  }
}
