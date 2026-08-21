const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;
const VIDEO_EXT = /\.(mp4|webm)$/i;

export const MEDIA_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,.jpg,.jpeg,.png,.webp,.gif,.mp4,.webm";

export function mediaKind(file) {
  if (!file) return null;
  const type = String(file.type || "").toLowerCase();
  const name = String(file.name || "");
  if (type.startsWith("video/") || VIDEO_EXT.test(name)) return "video";
  if (type.startsWith("image/") || IMAGE_EXT.test(name)) return "image";
  return null;
}

function fallbackSize() {
  return { width: 640, height: 360 };
}

function objectUrl(file) {
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return null;
  try {
    return URL.createObjectURL(file);
  } catch {
    return null;
  }
}

export function readMediaSize(file) {
  const fallback = fallbackSize();
  const kind = mediaKind(file);
  const url = objectUrl(file);
  if (!url) return Promise.resolve(fallback);

  return new Promise((resolve) => {
    let settled = false;
    const done = (width, height) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve({
        width: Number(width) > 0 ? Number(width) : fallback.width,
        height: Number(height) > 0 ? Number(height) : fallback.height,
      });
    };

    if (kind === "video") {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => done(video.videoWidth, video.videoHeight);
      video.onerror = () => done();
      video.src = url;
    } else {
      const img = document.createElement("img");
      img.onload = () => done(img.naturalWidth, img.naturalHeight);
      img.onerror = () => done();
      img.src = url;
      if (typeof img.decode === "function") {
        img.decode()
          .then(() => done(img.naturalWidth, img.naturalHeight))
          .catch(() => done());
      }
    }
    window.setTimeout(() => done(), 50);
  });
}
