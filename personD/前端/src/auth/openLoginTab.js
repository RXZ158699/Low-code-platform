export function openLoginTab() {
  const url = `${window.location.origin}/login`;
  window.open(url, "_blank");
}

export function returnToOpenerOrHome(goHome) {
  if (window.opener && !window.opener.closed) {
    window.opener.focus();
    window.close();
    return;
  }
  goHome();
}
