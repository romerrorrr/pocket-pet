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
export async function fotoParaGaleria(fuente, ancho = ANCHO_GALERIA) {
  const img = fuente instanceof HTMLCanvasElement ? fuente : await cargar(fuente);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const k = Math.max(1, Math.round(ancho / w));
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

// v35 (F39): un toque doble con la hoja de compartir abierta tiraba
// InvalidStateError y caia en la descarga (un archivo de mas, sin aviso).
// Mientras hay una hoja abierta, el segundo toque no hace nada ("ocupado"),
// y InvalidStateError / NotAllowedError (se perdio el toque) cuentan como
// "cancelado": nada de descargar por las dudas.
let compartiendo = false;
const CANCELADO = new Set(["AbortError", "InvalidStateError", "NotAllowedError"]);

/** Si hay una hoja de compartir abierta (para no abrir otra). */
export const compartiendoAhora = () => compartiendo;

async function compartir(datos) {
  compartiendo = true;
  try {
    await navigator.share(datos);
    return "compartido";
  } catch (e) {
    return e && CANCELADO.has(e.name) ? "cancelado" : null; // null: probar descargando
  } finally {
    compartiendo = false;
  }
}

/**
 * Comparte (o descarga) un Blob. Devuelve "compartido" | "descargado" |
 * "cancelado" | "ocupado" | "error".
 */
export async function guardarBlob(blob, nombre) {
  if (!blob) return "error";
  if (compartiendo) return "ocupado";
  const archivo = new File([blob], nombre, { type: blob.type });
  try {
    if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
      const r = await compartir({ files: [archivo] });
      if (r) return r;
    }
  } catch (e) {
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
  if (compartiendo) return "ocupado";
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

// v33: "Save all photos". Todas juntas van mas chicas (704 px, x4): son
// muchas, y la hoja de compartir del iPhone se pone lenta con archivos
// grandes. Se preparan con un toque y se comparten con otro: preparar
// lleva un momento, y compartir tiene que caer dentro de un toque.
const ANCHO_LOTE = 704;

/** fotos: [{ dataUrl, dia }] -> File[] (las que no se pudieron leer se saltean). */
export async function prepararFotos(fotos, base = "baozi") {
  const archivos = [];
  const porDia = {};
  for (const f of fotos) {
    try {
      const blob = await fotoParaGaleria(f.dataUrl, ANCHO_LOTE);
      if (!blob) continue;
      const dia = f.dia || "foto";
      porDia[dia] = (porDia[dia] || 0) + 1;
      archivos.push(new File([blob], `${base}-${dia}-${porDia[dia]}.png`, { type: "image/png" }));
    } catch (e) {
      /* una foto rota no frena a las demas */
    }
  }
  return archivos;
}

/** Comparte varios archivos juntos (o los descarga de a uno). Mismo resultado que guardarBlob. */
export async function guardarVarios(archivos) {
  if (!archivos || !archivos.length) return "error";
  if (compartiendo) return "ocupado";
  try {
    if (navigator.canShare && navigator.canShare({ files: archivos })) {
      const r = await compartir({ files: archivos });
      if (r) return r;
    }
  } catch (e) {
    /* se intenta descargar */
  }
  try {
    for (const a of archivos) {
      const url = URL.createObjectURL(a);
      const link = document.createElement("a");
      link.href = url;
      link.download = a.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
    return "descargado";
  } catch (e) {
    return "error";
  }
}

/** El boton de siempre: "Save to Photos" (se usa en la camara, el diario, la postal y el final). */
export function htmlBotonGuardar(id = "", clase = "", texto = "Save to Photos") {
  return `<button class="boton boton-fantasma boton-galeria ${clase}" ${id ? `id="${id}"` : ""} type="button">${texto}</button>`;
}
