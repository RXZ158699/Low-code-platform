export function openLoginTab() {
  const url = `${window.location.origin}/login`;
  window.open(url, "_blank", "noopener,noreferrer");
}
