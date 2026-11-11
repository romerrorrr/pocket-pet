/**
 * album.js
 * =========
 * v50: el album de stickers. Cada lugar de Hangzhou tiene su sticker
 * (assets/stickers/sticker_<id>.png, tools/stickers_lugares.py). Se gana
 * al sellar el lugar, asi que no guarda nada propio: lo que tiene sale de
 * los lugares sellados. Los stickers ganados tambien van a la camara y al
 * decorador del diario (grupo "Places").
 */

export const SECCIONES_ALBUM = [
  { id: "lago", nombre: "THE LAKE", lugares: ["westlake", "leifeng", "baidi", "sudi", "santan", "huxinting", "baochu", "huagang", "liulang"] },
  { id: "te", nombre: "TEA", lugares: ["longjing", "meijiawu", "teamuseum"] },
  { id: "templos", nombre: "TEMPLES", lugares: ["lingyin", "yuefei", "jingci", "faxi"] },
  { id: "naturaleza", nombre: "NATURE", lugares: ["jiuxi", "hupao", "liuhe", "zoo", "botanico", "huanglong", "xixi", "xianghu"] },
  { id: "ciudad", nombre: "CITY", lugares: ["hefang", "wushan", "yujie", "hubin", "wulin", "gongchen", "teatro"] },
  { id: "museos", nombre: "MUSEUMS & HILLS", lugares: ["gushan", "museozj", "museohz"] },
];

export const LUGARES_CON_STICKER = new Set(SECCIONES_ALBUM.flatMap((s) => s.lugares));
export const TOTAL_ALBUM = LUGARES_CON_STICKER.size;
export const srcStickerLugar = (id) => `stickers/sticker_${id}.png`;
export const tieneSticker = (id) => LUGARES_CON_STICKER.has(id);

/** Cuantos tiene (de los lugares sellados). */
export const cuantosTiene = (sellados) => [...LUGARES_CON_STICKER].filter((id) => sellados.has(id)).length;
