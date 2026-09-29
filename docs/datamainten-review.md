# DataMainten.js 修正建議（依你補充的實際欄位）

## 先說結論（上一版為什麼不對）

你說得完全正確：

- **Common Lookup Table 的 UOM** 不是靠 `GIS_REC_ID`。
- **PriceTBLExclude** 也不是靠 `GIS_REC_ID`。

所以 row action 的 key 規則不能用「優先 GIS_REC_ID」那套 fallback，要改成**依功能別固定鍵值欄位**。

---

## 你要的行為：像 SMT 一樣有單筆 Update/Delete

### 1) 讓 UOM / PriceTBLExclude 也顯示 Action 欄位

```js
function canRowAction() {
    var item = tabToItem(getActiveTab());
    return (
        item === 'SMT' ||
        item === 'CLT' ||
        item === 'SVC' ||
        item === 'UOM' ||
        item === 'PriceTBLExclude'
    );
}
```

---

### 2) CLT key 規則改成「依 sub 決定必填鍵」

> 用你提供的欄位定義：
> - Deliver-to Location：`SOURCE_01` + `TARGET_01`
> - Price Record Day：`SOURCE_01` + `TARGET_01`（`LOOKUP_TYPE` 若有就帶）
> - CLT UOM：`SOURCE_01` + `SOURCE_02` + `TARGET_01`（`LOOKUP_TYPE` 若有就帶）

```js
function getCltKeyCols(sub) {
    var s = (sub || '').trim().toLowerCase();

    if (s === 'item category') return ['SOURCE_01', 'SOURCE_02', 'SOURCE_03'];
    if (s === 'buyer assignment') return ['SOURCE_01', 'SOURCE_02', 'SOURCE_03'];
    if (s === 'payment term') return ['SOURCE_01'];

    // 新增你提到的三種
    if (s === 'deliver-to location' || s === 'deliver to location') return ['SOURCE_01', 'TARGET_01'];
    if (s === 'price record day') return ['SOURCE_01', 'TARGET_01'];
    if (s === 'uom') return ['SOURCE_01', 'SOURCE_02', 'TARGET_01'];

    return [];
}
```

---

### 3) UOM tab 與 PriceTBLExclude tab 的 key 要用固定欄位

> 依你提供的 table 結構：
> - `GIS_ITEM_BASED_UOM_TBL`：`ITEM_NUMBER + FROM_UOM + TO_UOM`（必要時可加 `CONVERSION_RATE`）
> - `PRICE EXCLUDE`：`EXCLUDE_TYPE + EXCLUDE_VALUE`（若有 `LOOKUP_TYPE` 就一併帶上）

```js
function buildRowKey(row) {
    row = row || {};
    var item = tabToItem(getActiveTab());
    var sub = getSubByTab(getActiveTab());

    var keyMap = {};
    Object.keys(row).forEach(function (k) { keyMap[String(k).toUpperCase()] = k; });

    function read(col) {
        var real = keyMap[col];
        return real ? String(row[real] || '').trim() : '';
    }

    var k = {};

    if (item === 'SMT') {
        k.GIS_REC_ID = read('GIS_REC_ID');
        return k;
    }

    if (item === 'CLT') {
        var lt = read('LOOKUP_TYPE');
        if (!lt) lt = (sub || '').trim();
        if (lt) k.LOOKUP_TYPE = lt;

        var cols = getCltKeyCols(sub);
        cols.forEach(function (x) { k[x] = read(x); });
        return k;
    }

    if (item === 'SVC') {
        ['GIS_REC_ID', 'SUPPLIER_NUMBER', 'SITE_CODE', 'FA_VENDOR_ID', 'VERSION_NUMBER'].forEach(function (x) {
            var v = read(x);
            if (v) k[x] = v;
        });
        return k;
    }

    // GIS_ITEM_BASED_UOM_TBL（你提供：ITEM_NUMBER/FROM_UOM/TO_UOM 必填）
    if (item === 'UOM') {
        k.ITEM_NUMBER = read('ITEM_NUMBER');
        k.FROM_UOM = read('FROM_UOM');
        k.TO_UOM = read('TO_UOM');
        return k;
    }

    // PRICE EXCLUDE（你提供：EXCLUDE_TYPE/EXCLUDE_VALUE 必填）
    if (item === 'PriceTBLExclude') {
        var lkp = read('LOOKUP_TYPE');
        if (lkp) k.LOOKUP_TYPE = lkp;
        k.EXCLUDE_TYPE = read('EXCLUDE_TYPE');
        k.EXCLUDE_VALUE = read('EXCLUDE_VALUE');
        return k;
    }

    return k;
}
```

---

### 4) Action 按鈕 disabled 規則要改（不要再看 GIS_REC_ID）

```js
function hasNonEmpty(v) { return !!String(v || '').trim(); }

function isValidRowKey(item, sub, keys) {
    if (!keys) return false;

    if (item === 'SMT') return hasNonEmpty(keys.GIS_REC_ID);

    if (item === 'CLT') {
        var req = getCltKeyCols(sub);
        if (!req || req.length === 0) return false;
        for (var i = 0; i < req.length; i++) {
            if (!hasNonEmpty(keys[req[i]])) return false;
        }
        return true;
    }

    if (item === 'SVC') return hasNonEmpty(keys.GIS_REC_ID);

    if (item === 'UOM') {
        return hasNonEmpty(keys.ITEM_NUMBER) && hasNonEmpty(keys.FROM_UOM) && hasNonEmpty(keys.TO_UOM);
    }

    if (item === 'PriceTBLExclude') {
        return hasNonEmpty(keys.EXCLUDE_TYPE) && hasNonEmpty(keys.EXCLUDE_VALUE);
    }

    return false;
}

function buildActionCell(row) {
    var item = tabToItem(getActiveTab());
    var sub = getSubByTab(getActiveTab());
    var keys = buildRowKey(row);

    var disabled = isValidRowKey(item, sub, keys) ? '' : 'disabled';
    var payload = escapeHtml(JSON.stringify(keys));

    if (item === 'SVC') {
        return '' +
            '<div style="display:flex; gap:6px; align-items:center;">' +
            '<button type="button" class="btn btn-xs btn-primary js-dm-row-update" data-keys="' + payload + '" ' + disabled + '>Update</button>' +
            '</div>';
    }

    return '' +
        '<div style="display:flex; gap:6px; align-items:center;">' +
        '<button type="button" class="btn btn-xs btn-primary js-dm-row-update" data-keys="' + payload + '" ' + disabled + '>Update</button>' +
        '<button type="button" class="btn btn-xs btn-danger js-dm-row-delete" data-keys="' + payload + '" ' + disabled + '>Delete</button>' +
        '</div>';
}
```

---

### 5) click handler 補防呆（避免壞 JSON 直接炸）

```js
function safeReadKeys(el) {
    try { return JSON.parse($(el).attr('data-keys') || '{}'); }
    catch (e) { return {}; }
}

$(document).on('click', '.js-dm-row-update', function (e) {
    e.preventDefault();
    e.stopPropagation();
    goRowUpdate(safeReadKeys(this));
});

$(document).on('click', '.js-dm-row-delete', function (e) {
    e.preventDefault();
    e.stopPropagation();
    doRowDelete(safeReadKeys(this));
});
```

---

## 為什麼你原本 800+ 行，我只給 100+ 行？

因為我前一版是用「**最小可套用 patch**」的寫法：

- 只列出要改的函式（例如 `canRowAction`、`getCltKeyCols`、`buildRowKey`、`buildActionCell`、click handler）
- 其他 700+ 行（載入、tab 切換、datatable 初始化、ajax）維持你原本程式

所以看起來行數少很多，但**不是要你把整支 JS 砍掉重寫**，而是「在原檔中替換幾個關鍵函式」。

如果你要的是「可直接覆蓋的完整 800+ 行版本」，我可以下一步直接幫你輸出完整檔（保留原流程，只改上述幾段）。

---

## 套用方式（避免誤會）

請在你原本 800+ 行檔案中，**只替換以下函式**：

1. `canRowAction`
2. `getCltKeyCols`
3. `buildRowKey`
4. `buildActionCell`（含 `isValidRowKey` / `hasNonEmpty`）
5. row-action click handlers（改用 `safeReadKeys`）

其餘函式與流程不動。


## 補充（避免後端 delete/update 對不到）

1. **CLT 的 rowKey 最好固定送出你後端 where clause 真正需要的欄位**（不是「有就帶」）。
2. **PriceTBLExclude** 若後端實際還要 `LOOKUP_TYPE` 才能唯一定位，請把 `isValidRowKey` 也改成必填。
3. 你提到「參考 SMT 的刪除 action」，核心就是：
   - 前端 action key 要「穩定且唯一」
   - `doRowDelete` 發送的 `keys` 必須和後端 delete API 完全對齊

