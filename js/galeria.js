const ANCHO_GALERIA = 1056;

function cargar(src) {
    return new Promise(((resolve, reject) => {
        const i = new Image;
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = src;
    }));
}

function aBlob(canvas, tipo = "image/png") {
    return new Promise((resolve => canvas.toBlob((b => resolve(b)), tipo)));
}

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
    const d = new Date;
    const p = n => String(n).padStart(2, "0");
    return `${base}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.${ext}`;
}

let compartiendo = false;

const CANCELADO = new Set([ "AbortError", "InvalidStateError", "NotAllowedError" ]);

export const compartiendoAhora = () => compartiendo;

async function compartir(datos) {
    compartiendo = true;
    try {
        await navigator.share(datos);
        return "compartido";
    } catch (e) {
        return e && CANCELADO.has(e.name) ? "cancelado" : null;
    } finally {
        compartiendo = false;
    }
}

export async function guardarBlob(blob, nombre) {
    if (!blob) return "error";
    if (compartiendo) return "ocupado";
    const archivo = new File([ blob ], nombre, {
        type: blob.type
    });
    try {
        if (navigator.canShare && navigator.canShare({
            files: [ archivo ]
        })) {
            const r = await compartir({
                files: [ archivo ]
            });
            if (r) return r;
        }
    } catch (e) {}
    try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = nombre;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout((() => URL.revokeObjectURL(url)), 6e4);
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
    const ext = blob && blob.type.includes("webm") ? "webm" : "mp4";
    return guardarBlob(blob, nombreConFecha(base, ext));
}

const ANCHO_LOTE = 704;

export async function prepararFotos(fotos, base = "baozi") {
    const archivos = [];
    const porDia = {};
    for (const f of fotos) {
        try {
            const blob = await fotoParaGaleria(f.dataUrl, ANCHO_LOTE);
            if (!blob) continue;
            const dia = f.dia || "foto";
            porDia[dia] = (porDia[dia] || 0) + 1;
            archivos.push(new File([ blob ], `${base}-${dia}-${porDia[dia]}.png`, {
                type: "image/png"
            }));
        } catch (e) {}
    }
    return archivos;
}

export async function guardarVarios(archivos) {
    if (!archivos || !archivos.length) return "error";
    if (compartiendo) return "ocupado";
    try {
        if (navigator.canShare && navigator.canShare({
            files: archivos
        })) {
            const r = await compartir({
                files: archivos
            });
            if (r) return r;
        }
    } catch (e) {}
    try {
        for (const a of archivos) {
            const url = URL.createObjectURL(a);
            const link = document.createElement("a");
            link.href = url;
            link.download = a.name;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout((() => URL.revokeObjectURL(url)), 6e4);
        }
        return "descargado";
    } catch (e) {
        return "error";
    }
}

export function htmlBotonGuardar(id = "", clase = "", texto = "Save to Photos") {
    return `<button class="boton boton-fantasma boton-galeria ${clase}" ${id ? `id="${id}"` : ""} type="button">${texto}</button>`;
}
