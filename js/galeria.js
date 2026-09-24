/**
 * galeria.js
 * ===========
 * v21: guardar fotos y videos en la galeria del telefono.
 *
 * Una pagina web no puede escribir directo en Fotos. Lo que si puede es
 * compartir el archivo: en iPhone la hoja de compartir trae "Guardar
 * imagen" / "Guardar video" (va a Fotos); en Android, guardar en la
 * galeria. Si el navegador no comparte archivos, se descarga.
 * Siempre hay que llamarlo dentro de un toque.
 *
 * Las fotos pixel son chiquitas (176x132): se agrandan sin suavizar
 * (unos 1056 px de ancho) para que en la galeria se vean nitidas.
 */

const ANCHO_GALERIA = 1056;

function cargar(src) {
  return new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
}

function aBlob(canvas, tipo = "image/png") {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), tipo));
}

/** Una foto (dataUrl o canvas) agrandada con pixeles nitidos, como Blob PNG. */
export async function fotoParaGaleria(fuente) {
  const img = fuente instanceof HTMLCanvasElement ? fuente : await cargar(fuente);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const k = Math.max(1, Math.round(ANCHO_GALERIA / w));
  const c = document.createElement("canvas");
  c.width = w * k;
  c.height = h * k;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.drawImage(img, 0, 0, c.width, c.height);
  return aBlob(c);
}

function nombreConFecha(base, ext) {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${base}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.${ext}`;
}

/**
 * Comparte (o descarga) un Blob. Devuelve "compartido" | "descargado" |
 * "cancelado" | "error".
 */
export async function guardarBlob(blob, nombre) {
  if (!blob) return "error";
  const archivo = new File([blob], nombre, { type: blob.type });
  try {
    if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
      await navigator.share({ files: [archivo] });
      return "compartido";
    }
  } catch (e) {
    if (e && e.name === "AbortError") return "cancelado";
    // si compartir falla por otra cosa, se intenta descargar
  }
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return "descargado";
  } catch (e) {
    return "error";
  }
}

export async function guardarFotoEnGaleria(fuente, base = "baozi") {
  try {
    const blob = await fotoParaGaleria(fuente);
    return guardarBlob(blob, nombreConFecha(base, "png"));
  } catch (e) {
    return "error";
  }
}

export function guardarVideoEnGaleria(blob, base = "baozi-video") {
  const ext = (blob && blob.type.includes("webm")) ? "webm" : "mp4";
  return guardarBlob(blob, nombreConFecha(base, ext));
}

/** El boton de siempre: "Save to Photos" (se usa en la camara, el diario, la postal y el final). */
export function htmlBotonGuardar(id = "", clase = "", texto = "Save to Photos") {
  return `<button class="boton boton-fantasma boton-galeria ${clase}" ${id ? `id="${id}"` : ""} type="button">${texto}</button>`;
}
