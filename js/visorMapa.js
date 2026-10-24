/**
 * visorMapa.js
 * =============
 * v31: mover y acercar el mapa real del corcho con los dedos: un dedo
 * arrastra, dos pellizcan, la ruedita (o los botones + / -) acerca. El
 * mapa se agranda con width/height (no con transform) para que el pixel
 * quede nitido a cualquier zoom.
 *
 * Un arrastre no cuenta como toque: si el dedo se movio, el click que
 * viene despues (sobre un sello) se ignora.
 */

const UMBRAL_ARRASTRE_PX = 6;

/**
 * caja: el area visible (overflow hidden). capa: la imagen del mapa (w x h
 * pixeles de mapa). vista: { s, cx, cy } guardada (s = pixeles de pantalla
 * por pixel de mapa; cx, cy = el punto del mapa en el centro). alMover({ s, tx, ty })
 * se llama cada vez que cambia (para ubicar los sellos).
 */
export function crearVisor(caja, { capa, w, h, vista, alMover = () => {} }) {
  let vw = 1;
  let vh = 1;
  let s = 1;
  let tx = 0;
  let ty = 0;

  const medir = () => {
    const r = caja.getBoundingClientRect();
    vw = Math.max(1, r.width);
    vh = Math.max(1, r.height);
  };
  const sMin = () => Math.min(vw / w, vh / h);
  const sMax = () => Math.max(sMin() * 10, 6);
  const limitar = () => {
    s = Math.max(sMin(), Math.min(sMax(), s));
    const mw = w * s;
    const mh = h * s;
    tx = mw <= vw ? (vw - mw) / 2 : Math.max(vw - mw, Math.min(0, tx));
    ty = mh <= vh ? (vh - mh) / 2 : Math.max(vh - mh, Math.min(0, ty));
  };
  const aplicar = () => {
    limitar();
    capa.style.width = `${w * s}px`;
    capa.style.height = `${h * s}px`;
    capa.style.left = `${tx}px`;
    capa.style.top = `${ty}px`;
    alMover({ s, tx, ty });
  };
  /** Acerca (f > 1) o aleja alrededor de un punto de la caja. */
  const zoomEn = (f, px = vw / 2, py = vh / 2) => {
    const nuevo = Math.max(sMin(), Math.min(sMax(), s * f));
    tx = px - (px - tx) * (nuevo / s);
    ty = py - (py - ty) * (nuevo / s);
    s = nuevo;
    aplicar();
  };
  /** Pone el punto (x, y) del mapa en el centro, con escala s2 (o la actual). */
  const centrar = (x, y, s2 = s) => {
    s = s2;
    tx = vw / 2 - x * s;
    ty = vh / 2 - y * s;
    aplicar();
  };

  medir();
  if (vista && Number.isFinite(vista.s)) centrar(vista.cx, vista.cy, vista.s);
  else centrar(w / 2, h / 2, sMin());

  // ---- dedos ----
  const dedos = new Map();
  let inicio = null; // { s, tx, ty, pts: [{x, y}] }
  let movido = 0;
  let arrastro = false;
  const punto = (e) => {
    const r = caja.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const foto = () => {
    inicio = { s, tx, ty, pts: [...dedos.values()].map((p) => ({ ...p })) };
  };
  caja.addEventListener("pointerdown", (e) => {
    dedos.set(e.pointerId, punto(e));
    if (dedos.size === 1) {
      movido = 0;
      arrastro = false;
    }
    foto();
  });
  caja.addEventListener("pointermove", (e) => {
    if (!dedos.has(e.pointerId) || !inicio) return;
    dedos.set(e.pointerId, punto(e));
    const pts = [...dedos.values()];
    if (pts.length >= 2 && inicio.pts.length >= 2) {
      const [a, b] = pts;
      const [a0, b0] = inicio.pts;
      const d0 = Math.hypot(a0.x - b0.x, a0.y - b0.y) || 1;
      const m0 = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 };
      const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const nuevo = Math.max(sMin(), Math.min(sMax(), inicio.s * (Math.hypot(a.x - b.x, a.y - b.y) / d0)));
      // el punto del mapa que estaba entre los dedos sigue entre los dedos
      const mxMapa = (m0.x - inicio.tx) / inicio.s;
      const myMapa = (m0.y - inicio.ty) / inicio.s;
      s = nuevo;
      tx = m.x - mxMapa * s;
      ty = m.y - myMapa * s;
      movido = Infinity;
    } else if (pts.length === 1 && inicio.pts.length >= 1) {
      const dx = pts[0].x - inicio.pts[0].x;
      const dy = pts[0].y - inicio.pts[0].y;
      movido = Math.max(movido, Math.hypot(dx, dy));
      tx = inicio.tx + dx;
      ty = inicio.ty + dy;
    }
    if (movido > UMBRAL_ARRASTRE_PX && !arrastro) {
      arrastro = true;
      try {
        caja.setPointerCapture(e.pointerId);
      } catch (err) {
        /* nada */
      }
    }
    aplicar();
  });
  const soltar = (e) => {
    dedos.delete(e.pointerId);
    foto();
  };
  caja.addEventListener("pointerup", soltar);
  caja.addEventListener("pointercancel", soltar);
  // si arrastro, el click que sigue no elige un sello
  caja.addEventListener(
    "click",
    (e) => {
      if (!arrastro) return;
      arrastro = false;
      e.stopPropagation();
      e.preventDefault();
    },
    true,
  );
  caja.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const p = punto(e);
      zoomEn(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y);
    },
    { passive: false },
  );

  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => {
    const cx = (vw / 2 - tx) / s;
    const cy = (vh / 2 - ty) / s;
    medir();
    centrar(cx, cy);
  }) : null;
  if (ro) ro.observe(caja);

  return {
    zoomEn,
    centrar,
    /** Para guardar y volver al mismo lugar despues de redibujar. */
    vista: () => ({ s, cx: (vw / 2 - tx) / s, cy: (vh / 2 - ty) / s }),
    sMin,
    destruir: () => ro && ro.disconnect(),
  };
}
