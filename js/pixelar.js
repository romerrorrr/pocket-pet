const NS = "http://www.w3.org/2000/svg";

const FORMAS = new Set([ "rect", "circle", "ellipse", "path", "polygon", "polyline", "line" ]);

const GEOM = new Set([ "d", "x", "y", "width", "height", "rx", "ry", "cx", "cy", "r", "x1", "y1", "x2", "y2", "points", "transform", "stroke-width", "stroke-dasharray", "stroke-linecap", "stroke" ]);

const ESTILO = new Set([ "fill", "opacity", "fill-opacity", "stroke-opacity" ]);

let lienzo = null;

let ctx = null;

function canvas2d() {
    if (!ctx) {
        lienzo = document.createElement("canvas");
        ctx = lienzo.getContext("2d", {
            willReadFrequently: true
        });
    }
    return ctx;
}

const num = (e, a, d = 0) => {
    const v = parseFloat(e.getAttribute(a));
    return Number.isFinite(v) ? v : d;
};

const nada = c => !c || c === "none" || c === "transparent";

function caminoDe(e) {
    const t = e.tagName;
    if (t === "path") return e.getAttribute("d") || "";
    if (t === "rect") {
        const x = num(e, "x");
        const y = num(e, "y");
        const w = num(e, "width");
        const h = num(e, "height");
        let rx = Math.min(num(e, "rx", num(e, "ry")), w / 2);
        let ry = Math.min(num(e, "ry", rx), h / 2);
        if (!rx || !ry) return `M${x} ${y}h${w}v${h}h${-w}z`;
        return `M${x + rx} ${y}h${w - 2 * rx}a${rx} ${ry} 0 0 1 ${rx} ${ry}v${h - 2 * ry}a${rx} ${ry} 0 0 1 ${-rx} ${ry}h${-(w - 2 * rx)}a${rx} ${ry} 0 0 1 ${-rx} ${-ry}v${-(h - 2 * ry)}a${rx} ${ry} 0 0 1 ${rx} ${-ry}z`;
    }
    if (t === "circle" || t === "ellipse") {
        const cx = num(e, "cx");
        const cy = num(e, "cy");
        const rx = t === "circle" ? num(e, "r") : num(e, "rx");
        const ry = t === "circle" ? rx : num(e, "ry");
        if (rx <= 0 || ry <= 0) return "";
        return `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0z`;
    }
    if (t === "line") return `M${num(e, "x1")} ${num(e, "y1")}L${num(e, "x2")} ${num(e, "y2")}`;
    const pts = (e.getAttribute("points") || "").trim();
    if (!pts) return "";
    const n = pts.split(/[\s,]+/).map(Number);
    let d = `M${n[0]} ${n[1]}`;
    for (let i = 2; i + 1 < n.length; i += 2) d += `L${n[i]} ${n[i + 1]}`;
    return t === "polygon" ? d + "z" : d;
}

function cajaDe(e) {
    const t = e.tagName;
    if (t === "rect") return {
        x: num(e, "x"),
        y: num(e, "y"),
        w: num(e, "width"),
        h: num(e, "height")
    };
    if (t === "circle") {
        const r = num(e, "r");
        return {
            x: num(e, "cx") - r,
            y: num(e, "cy") - r,
            w: 2 * r,
            h: 2 * r
        };
    }
    if (t === "ellipse") {
        const rx = num(e, "rx");
        const ry = num(e, "ry");
        return {
            x: num(e, "cx") - rx,
            y: num(e, "cy") - ry,
            w: 2 * rx,
            h: 2 * ry
        };
    }
    if (t === "line") {
        const x1 = num(e, "x1");
        const y1 = num(e, "y1");
        const x2 = num(e, "x2");
        const y2 = num(e, "y2");
        return {
            x: Math.min(x1, x2),
            y: Math.min(y1, y2),
            w: Math.abs(x2 - x1),
            h: Math.abs(y2 - y1)
        };
    }
    try {
        const b = e.getBBox();
        return {
            x: b.x,
            y: b.y,
            w: b.width,
            h: b.height
        };
    } catch (err) {
        return null;
    }
}

function transformDe(e) {
    if (!e.getAttribute("transform")) return null;
    const lista = e.transform && e.transform.baseVal;
    if (!lista || !lista.numberOfItems) return null;
    const m = lista.consolidate().matrix;
    if (Math.abs(m.a - 1) < 1e-6 && Math.abs(m.d - 1) < 1e-6 && Math.abs(m.b) < 1e-6 && Math.abs(m.c) < 1e-6) return {
        tras: true,
        e: m.e,
        f: m.f
    };
    return {
        tras: false,
        m: m
    };
}

function corridas(on, cols, filas, x0, y0, G, quien = null) {
    let d = "";
    for (let j = 0; j < filas; j++) {
        let i = 0;
        while (i < cols) {
            const k = j * cols + i;
            if (!on[k] || quien && !quien[k]) {
                i++;
                continue;
            }
            let f = i;
            while (f < cols && on[j * cols + f] && (!quien || quien[j * cols + f])) f++;
            d += `M${x0 + i * G} ${y0 + j * G}h${(f - i) * G}v${G}h${-(f - i) * G}z`;
            i = f;
        }
    }
    return d;
}

export function pixelar(svg, {G: G = 2} = {}) {
    if (typeof window !== "undefined" && window.__sinPixel) return {
        parar() {}
    };
    const gemelas = new WeakMap;
    const cache = new Map;
    const enClip = e => !!e.closest("clipPath");
    const pintar = e => {
        let gem = gemelas.get(e);
        const clip = enClip(e);
        if (!gem || !gem.isConnected) {
            gem = document.createElementNS(NS, clip ? "path" : "g");
            gem.setAttribute("data-px", "");
            if (!clip) {
                gem._relleno = document.createElementNS(NS, "path");
                gem._borde = document.createElementNS(NS, "path");
                for (const p of [ gem._relleno, gem._borde ]) {
                    p.setAttribute("shape-rendering", "crispEdges");
                    p.setAttribute("data-px", "");
                    gem.appendChild(p);
                }
            } else gem.setAttribute("shape-rendering", "crispEdges");
            gemelas.set(e, gem);
            e.after(gem);
        }
        e.setAttribute("data-v", "");
        dibujar(e, gem, clip);
    };
    const colores = (e, gem, clip) => {
        if (clip) return;
        const fill = e.getAttribute("fill");
        const stroke = e.getAttribute("stroke");
        const conBorde = gem._conBorde;
        const f1 = gem._soloTrazo ? nada(stroke) ? "rgb(0,0,0)" : stroke : nada(fill) ? "none" : fill || "rgb(0,0,0)";
        const f2 = conBorde ? stroke : "none";
        const op = e.getAttribute("opacity") || "";
        const o1 = (gem._soloTrazo ? e.getAttribute("stroke-opacity") : e.getAttribute("fill-opacity")) || "";
        const o2 = e.getAttribute("stroke-opacity") || "";
        const firma = `${f1}|${f2}|${op}|${o1}|${o2}`;
        if (gem._firma === firma) return;
        gem._firma = firma;
        gem._relleno.style.fill = f1;
        gem._borde.style.fill = f2;
        gem.style.opacity = op;
        gem._relleno.style.fillOpacity = o1;
        gem._borde.style.fillOpacity = o2;
    };
    const dibujar = (e, gem, clip) => {
        const fill = e.getAttribute("fill");
        const stroke = e.getAttribute("stroke");
        const sw = nada(stroke) ? 0 : num(e, "stroke-width", 1);
        const conRelleno = e.tagName !== "line" && (fill === null || !nada(fill));
        const soloTrazo = !conRelleno && sw > 0;
        const tr = transformDe(e);
        if (!clip) gem.setAttribute("transform", tr && tr.tras ? `translate(${tr.e} ${tr.f})` : "");
        if (e.tagName === "rect" && !num(e, "rx") && !num(e, "ry") && (!tr || tr.tras) && !(e.getAttribute("stroke-dasharray") || "").trim()) {
            const x = num(e, "x");
            const y = num(e, "y");
            const w = num(e, "width");
            const h = num(e, "height");
            const m = sw / 2;
            const ax = Math.round((x - m) / G) * G;
            const ay = Math.round((y - m) / G) * G;
            const bw = Math.max(G, Math.round((x + w + m) / G) * G - ax);
            const bh = Math.max(G, Math.round((y + h + m) / G) * G - ay);
            const caja2 = `M${ax} ${ay}h${bw}v${bh}h${-bw}z`;
            if (clip) {
                gem.setAttribute("d", w > 0 && h > 0 ? caja2 : "");
                return;
            }
            if (w <= 0 || h <= 0) {
                gem._relleno.setAttribute("d", "");
                gem._borde.setAttribute("d", "");
                return;
            }
            const conBorde = sw >= 1.4 && !nada(stroke) && conRelleno && bw > 2 * G && bh > 2 * G;
            gem._conBorde = conBorde || !conRelleno && sw > 0;
            gem._soloTrazo = !conRelleno && sw > 0;
            if (gem._soloTrazo) {
                gem._relleno.setAttribute("d", `${caja2}M${ax + G} ${ay + G}v${bh - 2 * G}h${bw - 2 * G}v${-(bh - 2 * G)}z`);
                gem._borde.setAttribute("d", "");
            } else if (conBorde) {
                gem._relleno.setAttribute("d", `M${ax + G} ${ay + G}h${bw - 2 * G}v${bh - 2 * G}h${-(bw - 2 * G)}z`);
                gem._borde.setAttribute("d", `${caja2}M${ax + G} ${ay + G}v${bh - 2 * G}h${bw - 2 * G}v${-(bh - 2 * G)}z`);
            } else {
                gem._relleno.setAttribute("d", caja2);
                gem._borde.setAttribute("d", "");
            }
            colores(e, gem, clip);
            return;
        }
        const dash = (e.getAttribute("stroke-dasharray") || "").trim();
        const cap = e.getAttribute("stroke-linecap") || "butt";
        const aplicar = r => {
            if (clip) {
                gem.setAttribute("d", r ? r.clipD : "");
                return;
            }
            gem._relleno.setAttribute("d", r ? r.relleno : "");
            gem._borde.setAttribute("d", r ? r.borde : "");
            if (r) {
                gem._conBorde = r.conBorde;
                gem._soloTrazo = r.soloTrazo;
                colores(e, gem, clip);
            }
        };
        const t = e.tagName;
        if ((t === "circle" || t === "ellipse") && (!tr || tr.tras)) {
            const rx = t === "circle" ? num(e, "r") : num(e, "rx");
            const ry = t === "circle" ? rx : num(e, "ry");
            const ox = Math.round(num(e, "cx") / G) * G + (tr ? tr.e : 0);
            const oy = Math.round(num(e, "cy") / G) * G + (tr ? tr.f : 0);
            gem.setAttribute("transform", `translate(${ox} ${oy})`);
            if (rx <= 0 || ry <= 0 || !conRelleno && sw <= 0) return aplicar(null);
            const clave = `${rx.toFixed(2)}|${ry.toFixed(2)}|${sw}|${dash}|${soloTrazo}|${clip}|${cap}`;
            let r = cache.get(clave);
            if (r === undefined) {
                r = raster(`M${-rx} 0a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0z`, {
                    x: -rx,
                    y: -ry,
                    w: 2 * rx,
                    h: 2 * ry
                }, null, sw, dash, soloTrazo, clip, cap);
                if (cache.size > 600) cache.clear();
                cache.set(clave, r);
            }
            return aplicar(r);
        }
        const d = caminoDe(e);
        const caja = d ? cajaDe(e) : null;
        if (!d || !caja || !conRelleno && sw <= 0) return aplicar(null);
        aplicar(raster(d, caja, tr, sw, dash, soloTrazo, clip, cap));
    };
    const raster = (d, caja, tr, sw, dash, soloTrazo, clip, cap) => {
        let bx0 = caja.x;
        let by0 = caja.y;
        let bx1 = caja.x + caja.w;
        let by1 = caja.y + caja.h;
        if (tr && !tr.tras) {
            const {a: a, b: b, c: c, d: dd, e: ee, f: f} = tr.m;
            const ps = [ [ bx0, by0 ], [ bx1, by0 ], [ bx0, by1 ], [ bx1, by1 ] ].map((([x, y]) => [ a * x + c * y + ee, b * x + dd * y + f ]));
            bx0 = Math.min(...ps.map((p => p[0])));
            bx1 = Math.max(...ps.map((p => p[0])));
            by0 = Math.min(...ps.map((p => p[1])));
            by1 = Math.max(...ps.map((p => p[1])));
        }
        const pad = sw / 2 + G;
        const x0 = Math.floor((bx0 - pad) / G) * G;
        const y0 = Math.floor((by0 - pad) / G) * G;
        const cols = Math.max(1, Math.min(420, Math.ceil((bx1 + pad - x0) / G)));
        const filas = Math.max(1, Math.min(320, Math.ceil((by1 + pad - y0) / G)));
        const c = canvas2d();
        if (lienzo.width < cols) lienzo.width = cols;
        if (lienzo.height < filas) lienzo.height = filas;
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(0, 0, cols, filas);
        c.setTransform(1 / G, 0, 0, 1 / G, -x0 / G, -y0 / G);
        if (tr && !tr.tras) c.transform(tr.m.a, tr.m.b, tr.m.c, tr.m.d, tr.m.e, tr.m.f);
        let p;
        try {
            p = new Path2D(d);
        } catch (err) {
            return null;
        }
        c.fillStyle = "#000";
        c.strokeStyle = "#000";
        c.lineJoin = "round";
        c.lineCap = cap;
        c.setLineDash(dash && dash !== "none" ? dash.split(/[\s,]+/).map(Number) : []);
        const punteado = !soloTrazo && !clip && sw > 0 && dash && dash !== "none";
        let trazoPunteado = null;
        if (punteado) {
            c.lineWidth = Math.max(sw, G * .95);
            c.stroke(p);
            const dt = c.getImageData(0, 0, cols, filas).data;
            trazoPunteado = new Uint8Array(cols * filas);
            for (let k = 0; k < cols * filas; k++) if (dt[k * 4 + 3] >= 110) trazoPunteado[k] = 1;
            c.save();
            c.setTransform(1, 0, 0, 1, 0, 0);
            c.clearRect(0, 0, cols, filas);
            c.restore();
            c.setLineDash([]);
        }
        if (soloTrazo) {
            c.lineWidth = Math.max(1, Math.round(sw / G)) * G;
            c.stroke(p);
        } else {
            c.fill(p);
            if (sw > 0 && !clip && !punteado) {
                c.lineWidth = sw;
                c.setLineDash([]);
                c.stroke(p);
            }
        }
        const datos = c.getImageData(0, 0, cols, filas).data;
        const on = new Uint8Array(cols * filas);
        let alguno = false;
        for (let k = 0; k < cols * filas; k++) if (datos[k * 4 + 3] >= 110) on[k] = 1, alguno = true;
        if (punteado) {
            for (let k = 0; k < cols * filas; k++) if (trazoPunteado[k]) on[k] = 1;
            const dentroP = new Uint8Array(cols * filas);
            for (let k = 0; k < cols * filas; k++) dentroP[k] = on[k] && !trazoPunteado[k] ? 1 : 0;
            return {
                conBorde: true,
                soloTrazo: false,
                relleno: corridas(on, cols, filas, x0, y0, G, dentroP),
                borde: corridas(on, cols, filas, x0, y0, G, trazoPunteado)
            };
        }
        if (!alguno && (soloTrazo || caja.w * caja.h > 0)) {
            const cxp = Math.floor(((bx0 + bx1) / 2 - x0) / G);
            const cyp = Math.floor(((by0 + by1) / 2 - y0) / G);
            if (cxp >= 0 && cxp < cols && cyp >= 0 && cyp < filas) on[cyp * cols + cxp] = 1;
        }
        if (clip) return {
            clipD: corridas(on, cols, filas, x0, y0, G)
        };
        const conBorde = !soloTrazo && sw >= 1.4;
        let borde = null;
        let dentro = null;
        if (conBorde) {
            borde = new Uint8Array(cols * filas);
            dentro = new Uint8Array(cols * filas);
            for (let j = 0; j < filas; j++) for (let i = 0; i < cols; i++) {
                const k = j * cols + i;
                if (!on[k]) continue;
                const afuera = i === 0 || j === 0 || i === cols - 1 || j === filas - 1 || !on[k - 1] || !on[k + 1] || !on[k - cols] || !on[k + cols];
                if (afuera) borde[k] = 1; else dentro[k] = 1;
            }
        }
        return {
            conBorde: conBorde,
            soloTrazo: soloTrazo,
            relleno: corridas(on, cols, filas, x0, y0, G, dentro),
            borde: conBorde ? corridas(on, cols, filas, x0, y0, G, borde) : ""
        };
    };
    const quitar = e => {
        const gem = gemelas.get(e);
        if (gem && gem.parentNode) gem.remove();
        gemelas.delete(e);
    };
    const recorrer = (n, fn) => {
        if (n.nodeType !== 1 || n.hasAttribute("data-px") || n.hasAttribute("data-sin-px")) return;
        if (FORMAS.has(n.tagName)) fn(n);
        for (const h of [ ...n.children ]) recorrer(h, fn);
    };
    const obs = new MutationObserver((recs => {
        const geom = new Set;
        const estilo = new Set;
        for (const r of recs) {
            if (r.type === "childList") {
                for (const n of r.removedNodes) if (n.nodeType === 1 && !n.hasAttribute("data-px")) recorrer(n, quitar);
                for (const n of r.addedNodes) if (n.isConnected && n.nodeType === 1 && !n.closest("[data-sin-px]")) recorrer(n, (e => geom.add(e)));
            } else if (r.type === "attributes") {
                const e = r.target;
                if (e.hasAttribute("data-px") || !FORMAS.has(e.tagName) || !e.isConnected || e.closest("[data-sin-px]")) continue;
                if (r.attributeName === "data-v") continue;
                if (GEOM.has(r.attributeName)) geom.add(e); else if (ESTILO.has(r.attributeName)) estilo.add(e);
            }
        }
        for (const e of geom) if (e.isConnected) pintar(e);
        for (const e of estilo) {
            if (geom.has(e)) continue;
            const gem = gemelas.get(e);
            if (gem && gem.isConnected) colores(e, gem, enClip(e)); else pintar(e);
        }
    }));
    recorrer(svg, pintar);
    obs.observe(svg, {
        subtree: true,
        childList: true,
        attributes: true
    });
    svg.classList.add("pixelada");
    return {
        parar() {
            obs.disconnect();
        }
    };
}
