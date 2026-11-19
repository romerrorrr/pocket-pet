export const SECCIONES_ALBUM = [ {
    id: "lago",
    nombre: "THE LAKE",
    lugares: [ "westlake", "leifeng", "baidi", "sudi", "santan", "huxinting", "baochu", "huagang", "liulang" ]
}, {
    id: "te",
    nombre: "TEA",
    lugares: [ "longjing", "meijiawu", "teamuseum" ]
}, {
    id: "templos",
    nombre: "TEMPLES",
    lugares: [ "lingyin", "yuefei", "jingci", "faxi" ]
}, {
    id: "naturaleza",
    nombre: "NATURE",
    lugares: [ "jiuxi", "hupao", "liuhe", "zoo", "botanico", "huanglong", "xixi", "xianghu" ]
}, {
    id: "ciudad",
    nombre: "CITY",
    lugares: [ "hefang", "wushan", "yujie", "hubin", "wulin", "gongchen", "teatro" ]
}, {
    id: "museos",
    nombre: "MUSEUMS & HILLS",
    lugares: [ "gushan", "museozj", "museohz" ]
} ];

export const LUGARES_CON_STICKER = new Set(SECCIONES_ALBUM.flatMap((s => s.lugares)));

export const TOTAL_ALBUM = LUGARES_CON_STICKER.size;

export const srcStickerLugar = id => `stickers/sticker_${id}.png`;

export const tieneSticker = id => LUGARES_CON_STICKER.has(id);

export const cuantosTiene = sellados => [ ...LUGARES_CON_STICKER ].filter((id => sellados.has(id))).length;
