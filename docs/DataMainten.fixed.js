(function () {
    var dmTable = null;
    var dmReqSeq = 0;
    var TAB_KEY = 'DataMainten_LastTab';

    function setLastTab(tag) {
        try { sessionStorage.setItem(TAB_KEY, tag); } catch (e) { }
    }
    function getLastTab() {
        try { return sessionStorage.getItem(TAB_KEY) || 'SmartTable'; } catch (e) { return 'SmartTable'; }
    }

    function getQuery(name) {
        var p = new URLSearchParams(window.location.search);
        return p.get(name);
    }

    function getActiveTab() {
        try {
            var href = ($('#myTab li.active a').attr('href') || '').trim();
            if (!href) return getLastTab();
            return href.replace('#', '').replace('Tag', '');
        } catch (e) {
            return getLastTab();
        }
    }

    function showTab(tag) {
        tag = (tag || '').trim();
        if (!tag) tag = 'SmartTable';

        var $a = $('#myTab a[href="#' + tag + 'Tag"]');
        if ($a.length) {
            $a.tab('show');
        } else {
            $('#myTab a[href="#SmartTableTag"]').tab('show');
            tag = 'SmartTable';
        }
        setLastTab(tag);
    }

    window.selectTag = function (tag) {
        try { showTab(String(tag || '')); } catch (e) { }
    };

    function inferInitTab() {
        var tab = (getQuery('tab') || '').trim();
        if (tab) return tab;

        var item = (getQuery('item') || '').trim().toUpperCase();
        if (item === 'SMT') return 'SmartTable';
        if (item === 'CLT') return 'CommonLookupTBL';
        if (item === 'SVC') return 'SiteVendorCode';
        if (item === 'UOM') return 'UOM';
        if (item === 'PRICETBLEXCLUDE') return 'PriceTBLExclude';

        return getLastTab() || 'SmartTable';
    }

    function $activePane() {
        return $('#myTabContent .tab-pane.active').first();
    }

    function $activeDmTable() {
        return $activePane().find('table#DataMaintenTable').first();
    }

    function closeLoadingOnly() {
        try {
            if (window.Swal && Swal.isLoading && Swal.isLoading()) Swal.close();
        } catch (e) { }
    }

    function showAlert(title, msg) {
        var t = (title || '').toUpperCase();
        if (typeof ErrorAlert === 'function' && t === 'ERROR') { ErrorAlert('Error', msg); return; }
        if (typeof WarningAlert === 'function' && t === 'WARNING') { WarningAlert('Warning', msg); return; }
        alert(msg);
    }

    function formatJsonDate(jsonDate) {
        if (typeof jsonDate !== 'string' || !jsonDate.startsWith('/Date(')) return jsonDate;
        try {
            var ms = parseInt(jsonDate.replace(/\/Date\((\d+)\)\//, '$1'), 10);
            var date = new Date(ms);
            var y = date.getFullYear();
            var m = ('0' + (date.getMonth() + 1)).slice(-2);
            var d = ('0' + date.getDate()).slice(-2);
            var hh = ('0' + date.getHours()).slice(-2);
            var mm = ('0' + date.getMinutes()).slice(-2);
            return y + '/' + m + '/' + d + ' ' + hh + ':' + mm;
        } catch (e) {
            return jsonDate;
        }
    }

    function escapeHtml(s) {
        return (s == null ? '' : String(s)).replace(/[&<>"']/g, function (c) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
        });
    }

    function tabToItem(tab) {
        tab = (tab || '').trim();
        if (tab === 'SmartTable') return 'SMT';
        if (tab === 'CommonLookupTBL') return 'CLT';
        if (tab === 'SiteVendorCode') return 'SVC';
        if (tab === 'UOM') return 'UOM';
        if (tab === 'PriceTBLExclude') return 'PriceTBLExclude';
        if (tab === 'PriceDataMainten') return 'PRICE';
        return 'SMT';
    }

    function getSubByTab(tab) {
        tab = tab || getActiveTab();
        if (tab === 'CommonLookupTBL') {
            return ($('#CommonLookupPick option:selected').text() || 'Item Category').trim();
        }
        if (tab === 'SiteVendorCode') {
            return ($('#VendorPick').val() || 'SupplierMaster').trim();
        }
        return '';
    }

    function getSupplierOuter() { return ($('#SupplierNumber').val() || '').trim(); }
    function getRecIdOuter() { return ($('#RecId').val() || '').trim(); }

    function isPriceTab() {
        return getActiveTab() === 'PriceDataMainten';
    }

    function buildListReq() {
        var tab = getActiveTab();
        var item = tabToItem(tab);

        if (item === 'PRICE') return null;

        var sub = getSubByTab(tab);

        var supplierNumber = '';
        var recId = '';

        if (item === 'SVC') {
            recId = getRecIdOuter();
            supplierNumber = getSupplierOuter();
            if (recId) supplierNumber = '';
        }

        return { item: item, sub: sub, supplierNumber: supplierNumber, recId: recId };
    }

    function getExcelTitle() {
        var tab = getActiveTab();
        var item = tabToItem(tab);
        var sub = getSubByTab(tab);

        if (item === 'SMT') return 'DataMainten_SmartTable__(Security C)';
        if (item === 'CLT') return 'DataMainten_CommonLookup_' + (sub || '') + '__(Security C)';
        if (item === 'SVC') return 'DataMainten_SiteVendor_' + (sub || '') + '__(Security C)';
        if (item === 'UOM') return 'DataMainten_UOM__(Security C)';
        if (item === 'PriceTBLExclude') return 'DataMainten_PriceTBLExclude__(Security C)';

        return 'DataMainten__(Security C)';
    }

    function destroyDmTable() {
        var $t = $activeDmTable();
        if ($t.length === 0) return;

        if ($.fn.DataTable && $.fn.DataTable.isDataTable($t[0])) {
            $t.DataTable().clear().destroy();
        }
        $t.find('thead tr').empty();
        $t.find('tbody').empty();
        dmTable = null;
    }


    function destroyAllDmTables() {
        $('#myTabContent table#DataMaintenTable').each(function () {
            var $t = $(this);
            try {
                if ($.fn.DataTable && $.fn.DataTable.isDataTable(this)) {
                    $t.DataTable().clear().destroy();
                }
            } catch (e) { }

            $t.find('thead tr').empty();
            $t.find('tbody').empty();
        });
        dmTable = null;
    }

    // 支援 SMT / CLT / SVC / UOM / PriceTBLExclude 的單筆 action
    function canRowAction() {
        var item = tabToItem(getActiveTab());
        return (item === 'SMT' || item === 'CLT' || item === 'SVC' || item === 'UOM' || item === 'PriceTBLExclude');
    }

    // 依 CLT 子功能定義 key 欄位
    function getCltKeyCols(sub) {
        var s = (sub || '').trim().toLowerCase();
        if (s === 'item category') return ['SOURCE_01', 'SOURCE_02', 'SOURCE_03'];
        if (s === 'buyer assignment') return ['SOURCE_01', 'SOURCE_02', 'SOURCE_03'];
        if (s === 'payment term') return ['SOURCE_01'];
        if (s === 'deliver-to location' || s === 'deliver to location') return ['SOURCE_01', 'TARGET_01'];
        if (s === 'price record day') return ['SOURCE_01', 'TARGET_01'];
        if (s === 'uom') return ['SOURCE_01', 'SOURCE_02', 'TARGET_01'];
        return [];
    }

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
            cols.forEach(function (x) {
                var v = read(x);
                k[x] = v ? v : 'NULL';
            });
            return k;
        }

        if (item === 'SVC') {
            ['GIS_REC_ID', 'SUPPLIER_NUMBER', 'SITE_CODE', 'FA_VENDOR_ID', 'VERSION_NUMBER'].forEach(function (x) {
                var v = read(x);
                if (v) k[x] = v;
            });
            return k;
        }

        // GIS_ITEM_BASED_UOM_TBL
        if (item === 'UOM') {
            k.ITEM_NUMBER = read('ITEM_NUMBER');
            k.FROM_UOM = read('FROM_UOM');
            k.TO_UOM = read('TO_UOM');
            return k;
        }

        // PRICE EXCLUDE
        if (item === 'PriceTBLExclude') {
            var lkp = read('LOOKUP_TYPE');
            if (lkp) k.LOOKUP_TYPE = lkp;
            k.EXCLUDE_TYPE = read('EXCLUDE_TYPE');
            k.EXCLUDE_VALUE = read('EXCLUDE_VALUE');
            return k;
        }

        return k;
    }

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

    function rebuildTable(columns, rows) {
        var $t = $activeDmTable();
        if ($t.length === 0) return;

        destroyDmTable();

        var $theadTr = $t.find('thead tr').empty();

        if (canRowAction()) $('<th/>').text('Action').appendTo($theadTr);
        (columns || []).forEach(function (c) { $('<th/>').text(c).appendTo($theadTr); });

        var $tbody = $t.find('tbody').empty();

        (rows || []).forEach(function (r) {
            var keyMap = {};
            Object.keys(r || {}).forEach(function (k) { keyMap[String(k).toUpperCase()] = k; });

            var $tr = $('<tr/>');

            if (canRowAction()) $('<td/>').html(buildActionCell(r)).appendTo($tr);

            (columns || []).forEach(function (c) {
                var realKey = keyMap[(c || '').toUpperCase()];
                var v = (realKey && r[realKey] != null) ? r[realKey] : '';
                $('<td/>').text(formatJsonDate(v)).appendTo($tr);
            });

            $tbody.append($tr);
        });

        var dtOpt = {
            processing: true,
            autoWidth: false,
            scrollX: true,
            scrollY: '60vh',
            scrollCollapse: true,
            deferRender: true,
            paging: true,
            searching: true,
            info: true,
            pageLength: 10,
            lengthMenu: [10, 25, 50, 100],
            order: []
        };

        if (canRowAction()) dtOpt.columnDefs = [{ targets: 0, orderable: false, searchable: false }];

        var hasLayout = !!($.fn.dataTable && $.fn.dataTable.defaults && $.fn.dataTable.defaults.layout);
        if (hasLayout) {
            dtOpt.layout = {
                topStart: 'pageLength',
                top2Start: {
                    buttons: [{
                        extend: 'excelHtml5',
                        title: getExcelTitle(),
                        text: '匯出至Excel'
                    }]
                }
            };
        } else {
            dtOpt.dom = 'lBfrtip';
            dtOpt.buttons = [{
                extend: 'excelHtml5',
                title: getExcelTitle(),
                text: '匯出至Excel'
            }];
        }

        dmTable = $t.DataTable(dtOpt);

        setTimeout(function () {
            try { dmTable.columns.adjust().draw(false); } catch (e) { }
        }, 0);
    }

    function loadData(req) {
        if (!req || isPriceTab()) return;

        var reqTab = getActiveTab();
        var reqSeq = ++dmReqSeq;

        // 避免切頁籤後殘留空 DataTable
        destroyAllDmTables();
        if (typeof Loading === 'function') Loading();

        $.ajax({
            url: window.__dmUrl,
            type: 'GET',
            data: req,
            success: function (res) {
                closeLoadingOnly();

                // 忽略舊請求或非當前頁籤回應
                if (reqSeq !== dmReqSeq) return;
                if (getActiveTab() !== reqTab) return;

                if (!res || res.success !== true) {
                    showAlert('ERROR', (res && res.message) ? res.message : 'Load failed');
                    return;
                }
                rebuildTable(res.columns, res.rows);
            },
            error: function (xhr) {
                closeLoadingOnly();

                if (reqSeq !== dmReqSeq) return;
                if (getActiveTab() !== reqTab) return;

                showAlert('ERROR', 'Load failed: ' + xhr.status);
            }
        });
    }

    function loadDataAuto() {
        if (isPriceTab()) return;

        var item = tabToItem(getActiveTab());
        if (item === 'SVC') return;
        loadData(buildListReq());
    }

    function loadDataByGo() {
        if (isPriceTab()) return;

        var item = tabToItem(getActiveTab());
        if (item !== 'SVC') return;

        var recId = getRecIdOuter();
        var sup = getSupplierOuter();

        if (!recId && !sup) {
            showAlert('WARNING', 'Please enter GIS REC ID or Supplier Number.');
            return;
        }
        loadData(buildListReq());
    }

    function applyDmNavLinks() {
        if (isPriceTab()) return;

        var tab = getActiveTab();
        var item = tabToItem(tab);
        var sub = getSubByTab(tab);

        var $pane = $activePane();

        ['#DataMaintenInsert', '#DataMaintenUpdate', '#DataMaintenDelete'].forEach(function (sel) {
            var $a = $pane.find(sel).first();
            if ($a.length === 0) return;

            var baseUrl = ($a.attr('data-base-url') || '').trim();
            var mode = ($a.attr('data-mode') || '').toUpperCase();
            if (!baseUrl || !mode) return;

            var u = new URL(baseUrl, window.location.origin);
            u.searchParams.set('mode', mode);
            u.searchParams.set('item', item);
            if (item !== 'SMT') u.searchParams.set('sub', sub || '');
            else u.searchParams.delete('sub');

            u.searchParams.set('tab', tab);

            if (item === 'SVC') {
                var recId = getRecIdOuter();
                var sup = getSupplierOuter();
                if (recId) {
                    u.searchParams.set('recId', recId);
                    u.searchParams.delete('supplierNumber');
                } else if (sup) {
                    u.searchParams.set('supplierNumber', sup);
                    u.searchParams.delete('recId');
                }
            }

            $a.attr('href', u.pathname + u.search);
        });
    }

    function goRowUpdate(keys) {
        var $pane = $activePane();
        var $btn = $pane.find('#DataMaintenUpdate').first();
        var baseUrl = ($btn.attr('data-base-url') || '').trim();
        if (!baseUrl) return;

        var tab = getActiveTab();
        var item = tabToItem(tab);
        var sub = getSubByTab(tab);

        var u = new URL(baseUrl, window.location.origin);
        u.searchParams.set('mode', 'UPDATE');
        u.searchParams.set('item', item);
        if (item !== 'SMT') u.searchParams.set('sub', sub || '');
        u.searchParams.set('tab', tab);
        u.searchParams.set('rowKey', JSON.stringify(keys || {}));

        if (item === 'SVC') {
            var recId = getRecIdOuter();
            var sup = getSupplierOuter();

            var rowRecId = (keys && keys.GIS_REC_ID) ? String(keys.GIS_REC_ID).trim() : '';
            var rowSup = (keys && keys.SUPPLIER_NUMBER) ? String(keys.SUPPLIER_NUMBER).trim() : '';

            if (recId) {
                u.searchParams.set('recId', recId);
                u.searchParams.delete('supplierNumber');
            } else if (rowRecId) {
                u.searchParams.set('recId', rowRecId);
                u.searchParams.delete('supplierNumber');
            } else if (sup) {
                u.searchParams.set('supplierNumber', sup);
            } else if (rowSup) {
                u.searchParams.set('supplierNumber', rowSup);
            }
        }

        window.location.href = u.pathname + u.search;
    }

    function doRowDelete(keys) {
        if (!window.__dmQuickDeleteUrl) return;

        var item = tabToItem(getActiveTab());
        if (item === 'SVC') return;

        if (!confirm('確定要刪除這筆資料嗎？')) return;

        $.ajax({
            url: window.__dmQuickDeleteUrl,
            type: 'POST',
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify({
                item: item,
                sub: getSubByTab(getActiveTab()),
                keys: keys
            }),
            success: function (res) {
                if (!res || res.success !== true) {
                    showAlert('ERROR', (res && res.message) ? res.message : 'Delete failed');
                    return;
                }
                loadData(buildListReq());
            },
            error: function (xhr) {
                showAlert('ERROR', 'Delete failed: ' + xhr.status);
            }
        });
    }

    function syncSvcUi() {
        var tab = getActiveTab();
        var isSVC = (tab === 'SiteVendorCode');

        $('#RecId').toggle(isSVC);
        $('#SupplierNumber').toggle(isSVC);
        $('#Query').toggle(isSVC);

        if (!isSVC) {
            $('#RecId').val('');
            $('#SupplierNumber').val('');
        }

        applyDmNavLinks();
    }

    function serializeForm($f) {
        var arr = $f.serializeArray();
        var obj = {};
        for (var i = 0; i < arr.length; i++) {
            var n = arr[i].name;
            var v = arr[i].value;
            if (obj[n] === undefined) obj[n] = v;
            else {
                if (!Array.isArray(obj[n])) obj[n] = [obj[n]];
                obj[n].push(v);
            }
        }
        return obj;
    }

    function getFormMode() {
        var v = ($('#Mode').val() || $('input[name="Mode"]').val() || '').toUpperCase();
        return v;
    }

    function confirmText(mode, cnt) {
        if (mode === 'UPDATE') return '確認要更新 ' + cnt + ' 筆資料嗎？';
        if (mode === 'DELETE') return '確認要刪除 ' + cnt + ' 筆資料嗎？';
        if (mode === 'ADD') return '確認要新增資料嗎？';
        return '確認要送出嗎？';
    }

    function noMatchText(mode) {
        if (mode === 'UPDATE') return '找不到符合 WHERE 條件的資料，未進行更新。';
        if (mode === 'DELETE') return '找不到符合 WHERE 條件的資料，未進行刪除。';
        return '找不到資料。';
    }

    function isFormPage() { return $('#myForm').length > 0; }
    function isListPage() { return $('#myTab').length > 0 && $('#myTabContent').length > 0; }

    function parseMultiValues(text) {
        if (!text) return [];
        var arr = text.split(/[\s,;]+/g);
        var out = [];
        for (var i = 0; i < arr.length; i++) {
            var v = (arr[i] || '').trim();
            if (!v) continue;
            out.push(v);
        }
        return out;
    }

    function applySmtDeleteRecIdList($form) {
        $form.find('input.js-recIdIn').remove();

        var $ta = $form.find('textarea[name="WhereValues[GIS_REC_ID_LIST]"]');
        if ($ta.length === 0) return;

        var list = parseMultiValues($ta.val());
        if (list.length === 0) return;

        for (var i = 0; i < list.length; i++) {
            $('<input/>', {
                type: 'hidden',
                name: 'WhereValues[GIS_REC_ID_IN_' + i + ']',
                value: list[i],
                'class': 'js-recIdIn'
            }).appendTo($form);
        }
    }

    function validateSvcSupplierRequiredOnForm() {
        var mode = getFormMode();
        if (mode !== 'UPDATE' && mode !== 'DELETE') return true;
        if (!isFormPage()) return true;

        var item = (($('input[name="Item"]').val() || '') + '').toUpperCase();
        if (item !== 'SVC') return true;

        function hasValueByName(name) {
            var ok = false;
            $('[name="' + name + '"]').each(function () {
                var v = (($(this).val() || '') + '').trim();
                if (!v) return;
                if (v.toUpperCase() === 'NULL') return;
                ok = true;
            });
            return ok;
        }

        var hasRecId = hasValueByName('WhereValues[GIS_REC_ID]');
        var hasSup = hasValueByName('WhereValues[SUPPLIER_NUMBER]');

        if (!hasRecId && !hasSup) {
            showAlert('WARNING', 'Site Vendor Code：WHERE 請至少輸入 GIS_REC_ID 或 SUPPLIER_NUMBER');
            return false;
        }
        return true;
    }

    function validateSmtDigitsOnlyOnForm($f) {
        var mode = getFormMode();
        if (mode !== 'ADD' && mode !== 'UPDATE' && mode !== 'DELETE') return true;

        var item = (($f.find('input[name="Item"]').val() || '') + '').toUpperCase();
        if (item !== 'SMT') return true;

        function isNullToken(v) { return String(v || '').trim().toUpperCase() === 'NULL'; }

        function check(name) {
            var $i = $f.find('[name="' + name + '"]');
            if ($i.length === 0) return true;

            var v = ($i.val() || '').trim();
            if (v.length === 0) return true;
            if (isNullToken(v)) return true;

            if (!/^\d+$/.test(v)) {
                var col = name.replace(/^.*\[/, '').replace(/\].*$/, '');
                alert('Invalid number for ' + col + ': ' + v);
                $i.focus();
                return false;
            }
            return true;
        }

        if (mode === 'ADD') {
            if (!check('InsertValues[RULE_SEQUENCE]')) return false;
            if (!check('InsertValues[SITE_PART_NUMBER_LENGTH]')) return false;
        }
        if (mode === 'UPDATE') {
            if (!check('SetValues[RULE_SEQUENCE]')) return false;
            if (!check('SetValues[SITE_PART_NUMBER_LENGTH]')) return false;
            if (!check('WhereValues[RULE_SEQUENCE]')) return false;
            if (!check('WhereValues[SITE_PART_NUMBER_LENGTH]')) return false;
        }
        if (mode === 'DELETE') {
            if (!check('WhereValues[RULE_SEQUENCE]')) return false;
            if (!check('WhereValues[SITE_PART_NUMBER_LENGTH]')) return false;
        }
        return true;
    }

    function validateCltKeysOnForm($f) {
        if (!$f || $f.length === 0) return true;

        var item = (($f.find('input[name="Item"]').val() || '')).toUpperCase();
        if (item !== 'CLT') return true;

        var mode = getFormMode();
        if (mode !== 'ADD') return true;

        var sub = ($f.find('input[name="Sub"]').val() || '').trim();
        var keys = getCltKeyCols(sub);
        if (!keys || keys.length === 0) return true;

        var any = false;
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            var $inp = $f.find('[name="InsertValues[' + k + ']"]');
            var v = ($inp.val() || '').trim();
            if (v && v.toUpperCase() !== 'NULL') any = true;
        }

        if (!any) {
            showAlert('WARNING', 'Common Lookup Table（' + sub + '）：至少需輸入一個 Key 欄位（' + keys.join('/') + '）');
            return false;
        }
        return true;
    }

    function dmSubmitCheck() {
        var $f = $('#myForm');
        if ($f.length === 0) return;

        if (!validateSvcSupplierRequiredOnForm()) return;
        if (!validateCltKeysOnForm($f)) return;
        if (!validateSmtDigitsOnlyOnForm($f)) return;

        var mode = getFormMode();

        if (mode !== 'UPDATE' && mode !== 'DELETE') {
            if (confirm(confirmText(mode, 1))) $f.trigger('submit');
            return;
        }

        var item = ($f.find('input[name="Item"]').val() || '').toUpperCase();
        if (mode === 'DELETE' && item === 'SMT') applySmtDeleteRecIdList($f);

        if (!window.__dmPreviewUrl) {
            if (confirm(confirmText(mode, '?'))) $f.trigger('submit');
            return;
        }

        if (typeof Loading === 'function') Loading();

        $.ajax({
            url: window.__dmPreviewUrl,
            type: 'POST',
            data: serializeForm($f),
            success: function (res) {
                closeLoadingOnly();

                if (!res || res.success !== true) {
                    showAlert('ERROR', (res && res.message) ? res.message : 'Preview failed');
                    return;
                }

                var cnt = parseInt(res.count || 0, 10);
                if (!cnt || cnt <= 0) {
                    showAlert('WARNING', noMatchText(mode));
                    return;
                }

                if (!confirm(confirmText(mode, cnt))) return;
                $f.trigger('submit');
            },
            error: function (xhr) {
                closeLoadingOnly();
                showAlert('ERROR', 'Preview failed: ' + xhr.status);
            }
        });
    }

    window.dmSubmitCheck = dmSubmitCheck;

    function safeReadKeys(el) {
        try { return JSON.parse($(el).attr('data-keys') || '{}'); }
        catch (e) { return {}; }
    }

    $(function () {
        if (isFormPage() && !isListPage()) return;
        if (!isListPage()) return;

        var initTab = inferInitTab();
        showTab(initTab);

        var qItem = (getQuery('item') || '').trim().toUpperCase();
        var qSub = (getQuery('sub') || '').trim();
        var qRecId = (getQuery('recId') || '').trim();
        var qSup = (getQuery('supplierNumber') || '').trim();

        if ((initTab === 'CommonLookupTBL') || (qItem === 'CLT')) {
            if (qSub) {
                var hit = false;
                $('#CommonLookupPick option').each(function () {
                    var $o = $(this);
                    if (($o.text() || '').trim() === qSub) { $('#CommonLookupPick').val($o.val()); hit = true; }
                });
                if (!hit) $('#CommonLookupPick').val(qSub);
            }
        }

        if ((initTab === 'SiteVendorCode') || (qItem === 'SVC')) {
            if (qSub) $('#VendorPick').val(qSub);
            if (qRecId) { $('#RecId').val(qRecId); $('#SupplierNumber').val(''); }
            else if (qSup) $('#SupplierNumber').val(qSup);
        }

        $('#myTab a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
            var href = $(e.target).attr('href');
            var tag = (href || '').replace('#', '').replace('Tag', '');
            setLastTab(tag);

            destroyAllDmTables();
            syncSvcUi();

            setTimeout(function () {
                if (getActiveTab() === 'SiteVendorCode') {
                    if (getRecIdOuter() || getSupplierOuter()) loadDataByGo();
                } else if (!isPriceTab()) {
                    loadDataAuto();
                }
            }, 0);

            try { if (typeof applyNavLinks === 'function') applyNavLinks(); } catch (err2) { }
        });

        $('#CommonLookupPick').on('change', function () {
            if (getActiveTab() !== 'CommonLookupTBL') return;
            applyDmNavLinks();
            loadDataAuto();
        });

        $('#VendorPick').on('change', function () {
            if (getActiveTab() !== 'SiteVendorCode') return;
            $('#SupplierNumber').val('');
            $('#RecId').val('');
            $('#SupplierNumber').focus();
            applyDmNavLinks();
            destroyDmTable();
        });

        $('#Query').on('click', function () {
            if (getActiveTab() !== 'SiteVendorCode') return;
            applyDmNavLinks();
            loadDataByGo();
        });

        $('#SupplierNumber').on('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); loadDataByGo(); }
        });
        $('#RecId').on('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); loadDataByGo(); }
        });

        $(document).on('click', '.js-dm-row-update', function (e) {
            e.preventDefault(); e.stopPropagation();
            goRowUpdate(safeReadKeys(this));
        });

        $(document).on('click', '.js-dm-row-delete', function (e) {
            e.preventDefault(); e.stopPropagation();
            doRowDelete(safeReadKeys(this));
        });

        syncSvcUi();
        if (getActiveTab() === 'SiteVendorCode') {
            if (getRecIdOuter() || getSupplierOuter()) loadDataByGo();
        } else if (!isPriceTab()) {
            loadDataAuto();
        }
    });
})();
