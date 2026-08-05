/* ============================================================
   일정 달력 (Calendar)

   고객 메모(customers.note)에 적힌 날짜를 월간 달력에 표시하고, 날짜를 눌러
   그 날 일정을 보거나 새 일정을 메모에 추가한다.

   날짜 해석은 전부 public/js/memoDates.js 가 담당한다. 카카오 알림
   스크립트(scripts/*.js)도 같은 모듈을 쓰므로 달력에 뜨는 일정과 알림으로
   나가는 일정은 항상 같다. 해석 규칙을 바꿀 일이 있으면 여기가 아니라
   memoDates.js 를 고쳐야 한다.
   ============================================================ */
(function () {
    'use strict';

    const MD = (typeof MemoDates !== 'undefined') ? MemoDates : window.MemoDates;
    const keyOf = MD.keyOf;
    const pad2 = MD.pad2;

    const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];
    const MOBILE_BREAKPOINT = 900;

    function escapeHtml(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }


    /* ---------------------------------------------------------
       인덱스 — 전체 고객 → { 'YYYY-MM-DD': [항목, …] }
       --------------------------------------------------------- */

    let scheduleIndex = {};   // 날짜별 일정
    let customerIndex = [];   // 일정 추가용 고객 검색 대상

    function rebuild(customers) {
        // 날짜 인덱싱은 알림 스크립트와 같은 함수를 쓴다.
        scheduleIndex = MD.indexCustomers(customers);

        Object.keys(scheduleIndex).forEach(function (k) {
            scheduleIndex[k].sort(function (a, b) {
                return a.name.localeCompare(b.name, 'ko');
            });
        });

        // 일정 추가 폼의 고객 검색용 색인 (달력에만 필요)
        customerIndex = (customers || []).map(function (customer) {
            return {
                id: customer.id,
                name: customer.name || '(이름 없음)',
                phone: customer.mobilePhoneNumber || customer.phoneNumber || '',
                haystack: [
                    customer.name,
                    customer.mobilePhoneNumber,
                    String(customer.mobilePhoneNumber || '').replace(/\D/g, ''),
                    customer.phoneNumber,
                    String(customer.phoneNumber || '').replace(/\D/g, '')
                ].join(' ').toLowerCase()
            };
        });

        if (activeMount) render();
    }

    function itemsOn(key) { return scheduleIndex[key] || []; }

    function countInMonth(year, month /* 0-based */) {
        const prefix = year + '-' + pad2(month + 1) + '-';
        let total = 0;
        Object.keys(scheduleIndex).forEach(function (k) {
            if (k.indexOf(prefix) === 0) total += scheduleIndex[k].length;
        });
        return total;
    }

    /* ---------------------------------------------------------
       화면 상태
       --------------------------------------------------------- */

    const now = new Date();
    let viewYear = now.getFullYear();
    let viewMonth = now.getMonth();      // 0-based
    let selectedKey = keyOf(now);
    let activeMount = null;              // 지금 달력이 그려져 있는 컨테이너
    let addFormOpen = false;
    let addPickedCustomer = null;

    function isMobile() { return window.innerWidth < MOBILE_BREAKPOINT; }

    function closeAddForm() {
        addFormOpen = false;
        addPickedCustomer = null;
    }

    // 달을 옮길 때 선택일도 따라 옮긴다. 그 달에 오늘이 있으면 오늘,
    // 아니면 일정이 있는 첫 날, 그것도 없으면 1일.
    function pickDefaultDayOfMonth() {
        const today = new Date();
        if (today.getFullYear() === viewYear && today.getMonth() === viewMonth) return keyOf(today);

        const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
        for (let d = 1; d <= lastDay; d++) {
            const k = viewYear + '-' + pad2(viewMonth + 1) + '-' + pad2(d);
            if (itemsOn(k).length) return k;
        }
        return viewYear + '-' + pad2(viewMonth + 1) + '-01';
    }

    function goToMonth(deltaMonths) {
        const d = new Date(viewYear, viewMonth + deltaMonths, 1);
        viewYear = d.getFullYear();
        viewMonth = d.getMonth();
        closeAddForm();
        selectedKey = pickDefaultDayOfMonth();
        render();
    }

    function goToToday() {
        const today = new Date();
        viewYear = today.getFullYear();
        viewMonth = today.getMonth();
        selectedKey = keyOf(today);
        closeAddForm();
        render();
    }

    function selectDay(key) {
        if (key === selectedKey) return;
        selectedKey = key;
        closeAddForm();
        // 다른 달의 날짜를 눌렀으면 그 달로 넘어간다.
        const parts = key.split('-');
        const y = +parts[0], m = +parts[1] - 1;
        if (y !== viewYear || m !== viewMonth) { viewYear = y; viewMonth = m; }
        render();
    }

    /* ---------------------------------------------------------
       렌더
       --------------------------------------------------------- */

    function buildGridHtml() {
        const todayK = keyOf(new Date());
        const first = new Date(viewYear, viewMonth, 1);
        const leading = first.getDay();                       // 1일 앞에 채울 칸 수
        const gridStart = new Date(viewYear, viewMonth, 1 - leading);

        let html = '<div class="cal-weekdays" aria-hidden="true">';
        WEEKDAY_KO.forEach(function (w, i) {
            html += '<span class="cal-weekday dow-' + i + '">' + w + '</span>';
        });
        html += '</div><div class="cal-grid" role="grid">';

        // 달마다 높이가 튀지 않도록 항상 6주(42칸)를 그린다.
        for (let i = 0; i < 42; i++) {
            const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
            const key = keyOf(d);
            const count = itemsOn(key).length;
            const isOther = d.getMonth() !== viewMonth;
            const isToday = key === todayK;
            const isSelected = key === selectedKey;
            const isPast = key < todayK;

            let cls = 'cal-day dow-' + d.getDay();
            if (isOther) cls += ' is-other';
            if (isToday) cls += ' is-today';
            if (isSelected) cls += ' is-selected';
            if (count) cls += ' has-events';
            if (isPast) cls += ' is-past';

            const label = (d.getMonth() + 1) + '월 ' + d.getDate() + '일 '
                + WEEKDAY_KO[d.getDay()] + '요일'
                + (count ? ', 일정 ' + count + '건' : ', 일정 없음');

            html += '<button type="button" class="' + cls + '" role="gridcell"'
                + ' data-key="' + key + '"'
                + ' tabindex="' + (isSelected ? '0' : '-1') + '"'
                + ' aria-selected="' + (isSelected ? 'true' : 'false') + '"'
                + ' aria-label="' + label + '">'
                + '<span class="cal-day-num">' + d.getDate() + '</span>'
                + (count ? '<span class="cal-day-count">' + count + '</span>' : '<span class="cal-day-count is-blank"></span>')
                + '</button>';
        }

        html += '</div>';
        return html;
    }

    function buildPanelHtml() {
        const parts = selectedKey.split('-');
        const sel = new Date(+parts[0], +parts[1] - 1, +parts[2]);
        const items = itemsOn(selectedKey);
        const todayK = keyOf(new Date());

        let title = (sel.getMonth() + 1) + '월 ' + sel.getDate() + '일 (' + WEEKDAY_KO[sel.getDay()] + ')';
        if (selectedKey === todayK) title += ' · 오늘';

        let html = '<div class="cal-panel">'
            + '<div class="cal-panel-head">'
            + '<h4 class="cal-panel-title">' + escapeHtml(title)
            + '<span class="cal-panel-count">' + items.length + '건</span></h4>'
            + '<button type="button" class="btn cal-add-open" data-action="open-add">'
            + '<i class="fa fa-plus" aria-hidden="true"></i> 일정 추가</button>'
            + '</div>';

        html += '<div class="cal-panel-body">';

        if (!items.length && !addFormOpen) {
            html += '<div class="cal-empty">'
                + '<i class="fa fa-calendar-o" aria-hidden="true"></i>'
                + '<p>이 날에는 등록된 일정이 없습니다</p>'
                + '</div>';
        }

        items.forEach(function (item, idx) {
            html += '<button type="button" class="cal-item" data-action="open-customer"'
                + ' data-customer-id="' + escapeHtml(item.customer.id) + '"'
                + ' data-idx="' + idx + '">'
                + '<span class="cal-item-name">' + escapeHtml(item.name) + '</span>'
                + '<span class="cal-item-text">' + escapeHtml(item.text) + '</span>'
                + (item.estimated ? '<span class="cal-item-est" title="메모에 연도가 없어 주변 내용으로 추정한 날짜입니다">추정</span>' : '')
                + '<i class="fa fa-chevron-right cal-item-chevron" aria-hidden="true"></i>'
                + '</button>';
        });

        if (addFormOpen) html += buildAddFormHtml();

        html += '</div></div>';
        return html;
    }

    function buildAddFormHtml() {
        const parts = selectedKey.split('-');
        const dateLabel = parts[0] + '/' + parts[1] + '/' + parts[2];

        let html = '<div class="cal-add" role="group" aria-label="일정 추가">'
            + '<div class="cal-add-date">' + escapeHtml(dateLabel) + ' 일정 추가</div>';

        if (addPickedCustomer) {
            html += '<div class="cal-add-picked">'
                + '<span class="cal-add-chip">' + escapeHtml(addPickedCustomer.name)
                + (addPickedCustomer.phone ? ' <small>' + escapeHtml(addPickedCustomer.phone) + '</small>' : '')
                + '<button type="button" class="cal-add-chip-x" data-action="clear-customer" aria-label="고객 선택 해제">&times;</button>'
                + '</span></div>';
        } else {
            html += '<div class="cal-add-search">'
                + '<input type="text" id="calAddSearch" class="form-control" autocomplete="off"'
                + ' placeholder="고객 이름 또는 연락처 검색" />'
                + '<div class="cal-add-results" id="calAddResults"></div>'
                + '</div>';
        }

        html += '<input type="text" id="calAddText" class="form-control cal-add-text"'
            + ' placeholder="일정 내용 (예: 배터리 방문, 적합검사 예약)" autocomplete="off" />'
            + '<div class="cal-add-actions">'
            + '<button type="button" class="btn btn-default" data-action="cancel-add">취소</button>'
            + '<button type="button" class="btn btn-primary" data-action="save-add">저장</button>'
            + '</div>'
            + '<p class="cal-add-hint">고객 메모 맨 아래에 <code>' + escapeHtml(dateLabel) + ' 내용</code> 형식으로 한 줄 추가됩니다.</p>'
            + '</div>';

        return html;
    }

    function buildCalendarHtml() {
        const monthCount = countInMonth(viewYear, viewMonth);

        return '<div class="cal-root">'
            + '<div class="cal-main">'
            + '<div class="cal-head">'
            + '<button type="button" class="cal-nav" data-action="prev" aria-label="이전 달">'
            + '<i class="fa fa-chevron-left" aria-hidden="true"></i></button>'
            + '<div class="cal-head-title">'
            + '<strong>' + viewYear + '년 ' + (viewMonth + 1) + '월</strong>'
            + '<span class="cal-head-sub">' + (monthCount ? '일정 ' + monthCount + '건' : '일정 없음') + '</span>'
            + '</div>'
            + '<button type="button" class="cal-nav" data-action="next" aria-label="다음 달">'
            + '<i class="fa fa-chevron-right" aria-hidden="true"></i></button>'
            + '<button type="button" class="cal-today" data-action="today">오늘</button>'
            + '</div>'
            + buildGridHtml()
            + '</div>'
            + buildPanelHtml()
            + '</div>';
    }

    function render() {
        if (!activeMount) return;
        activeMount.innerHTML = buildCalendarHtml();
        if (addFormOpen) {
            const focusTarget = activeMount.querySelector(addPickedCustomer ? '#calAddText' : '#calAddSearch');
            if (focusTarget) focusTarget.focus();
        }
    }

    /* ---------------------------------------------------------
       일정 추가 — 고객 검색 / 저장
       --------------------------------------------------------- */

    function searchCustomers(term) {
        const q = String(term || '').trim().toLowerCase();
        if (!q) return [];
        const digits = q.replace(/\D/g, '');
        return customerIndex.filter(function (c) {
            return c.haystack.indexOf(q) !== -1 || (digits && c.haystack.indexOf(digits) !== -1);
        }).slice(0, 8);
    }

    function renderSearchResults(term) {
        const box = activeMount && activeMount.querySelector('#calAddResults');
        if (!box) return;
        const hits = searchCustomers(term);
        if (!hits.length) {
            box.innerHTML = term.trim()
                ? '<div class="cal-add-noresult">검색 결과가 없습니다</div>'
                : '';
            return;
        }
        box.innerHTML = hits.map(function (c) {
            return '<button type="button" class="cal-add-result" data-action="pick-customer"'
                + ' data-customer-id="' + escapeHtml(c.id) + '">'
                + '<span class="cal-add-result-name">' + escapeHtml(c.name) + '</span>'
                + '<span class="cal-add-result-phone">' + escapeHtml(c.phone) + '</span>'
                + '</button>';
        }).join('');
    }

    async function saveNewSchedule() {
        const textEl = activeMount.querySelector('#calAddText');
        const text = textEl ? textEl.value.trim() : '';

        if (!addPickedCustomer) { alert('고객을 먼저 선택해 주세요.'); return; }
        if (!text) { alert('일정 내용을 입력해 주세요.'); return; }

        const parts = selectedKey.split('-');
        const newLine = parts[0] + '/' + parts[1] + '/' + parts[2] + ' ' + text;
        const customerId = addPickedCustomer.id;

        const local = (typeof allCustomers !== 'undefined' ? allCustomers : [])
            .filter(function (c) { return c.id === customerId; })[0];

        try {
            $('#loader h4').text('일정 저장 중...');
            $('#loader').css('display', 'flex');

            let baseNote;
            if (typeof MOCK_MODE !== 'undefined' && MOCK_MODE) {
                baseNote = local ? local.note : '';
            } else {
                // 다른 탭에서 고친 메모를 덮어쓰지 않도록 저장 직전에 다시 읽는다.
                const res = await _supabase.from('customers').select('note').eq('id', customerId).single();
                if (res.error) throw res.error;
                baseNote = res.data ? res.data.note : '';
            }

            const trimmed = String(baseNote || '').replace(/\s+$/, '');
            const nextNote = trimmed ? trimmed + '\n' + newLine : newLine;

            if (!(typeof MOCK_MODE !== 'undefined' && MOCK_MODE)) {
                const upd = await _supabase.from('customers').update({ note: nextNote }).eq('id', customerId);
                if (upd.error) throw upd.error;
            }

            if (local) local.note = nextNote;

            closeAddForm();
            rebuild(typeof allCustomers !== 'undefined' ? allCustomers : []);
        } catch (err) {
            console.error('일정 저장 실패:', err);
            alert('일정 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            $('#loader').hide();
        }
    }

    /* ---------------------------------------------------------
       이벤트 — 컨테이너 하나에 위임
       --------------------------------------------------------- */

    function moveSelectionByKeyboard(deltaDays) {
        const parts = selectedKey.split('-');
        const d = new Date(+parts[0], +parts[1] - 1, +parts[2] + deltaDays);
        selectDay(keyOf(d));
        const cell = activeMount && activeMount.querySelector('.cal-day.is-selected');
        if (cell) cell.focus();
    }

    function wireContainer(container) {
        container.addEventListener('click', function (e) {
            const dayCell = e.target.closest('.cal-day');
            if (dayCell) { selectDay(dayCell.dataset.key); return; }

            const actionEl = e.target.closest('[data-action]');
            if (!actionEl) return;

            switch (actionEl.dataset.action) {
                case 'prev': goToMonth(-1); break;
                case 'next': goToMonth(1); break;
                case 'today': goToToday(); break;
                case 'open-add':
                    addFormOpen = true;
                    render();
                    break;
                case 'cancel-add':
                    closeAddForm();
                    render();
                    break;
                case 'save-add':
                    saveNewSchedule();
                    break;
                case 'pick-customer': {
                    const id = actionEl.dataset.customerId;
                    addPickedCustomer = customerIndex.filter(function (c) { return c.id === id; })[0] || null;
                    render();
                    break;
                }
                case 'clear-customer':
                    addPickedCustomer = null;
                    render();
                    break;
                case 'open-customer': {
                    const id = actionEl.dataset.customerId;
                    if (typeof showCustomerDetail === 'function') {
                        if (!isMobile()) $('#calendarDialog').modal('hide');
                        showCustomerDetail(id);
                    }
                    break;
                }
            }
        });

        container.addEventListener('input', function (e) {
            if (e.target.id === 'calAddSearch') renderSearchResults(e.target.value);
        });

        container.addEventListener('keydown', function (e) {
            if (e.target.classList && e.target.classList.contains('cal-day')) {
                const map = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
                if (map[e.key] !== undefined) { e.preventDefault(); moveSelectionByKeyboard(map[e.key]); }
                return;
            }
            if (e.key === 'Enter' && (e.target.id === 'calAddText' || e.target.id === 'calAddSearch')) {
                e.preventDefault();
                if (e.target.id === 'calAddText') saveNewSchedule();
            }
        });

        // 모바일 좌우 스와이프로 달 이동
        let touchX = null, touchY = null;
        container.addEventListener('touchstart', function (e) {
            if (!e.target.closest('.cal-main')) { touchX = null; return; }
            touchX = e.touches[0].clientX;
            touchY = e.touches[0].clientY;
        }, { passive: true });
        container.addEventListener('touchend', function (e) {
            if (touchX === null) return;
            const dx = e.changedTouches[0].clientX - touchX;
            const dy = e.changedTouches[0].clientY - touchY;
            touchX = null;
            if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) goToMonth(dx < 0 ? 1 : -1);
        }, { passive: true });
    }

    /* ---------------------------------------------------------
       진입점
       --------------------------------------------------------- */

    function mountMobile() {
        const el = document.getElementById('calendarMountMobile');
        if (!el) return;
        activeMount = el;
        render();
    }

    function openDesktopModal() {
        const el = document.getElementById('calendarMount');
        if (!el) return;
        activeMount = el;
        render();
        $('#calendarDialog').modal('show');
    }

    function open() {
        closeAddForm();
        if (isMobile()) {
            if (typeof switchMobileTab === 'function') switchMobileTab('calendar');
            else mountMobile();
        } else {
            openDesktopModal();
        }
    }

    function init() {
        const desktopMount = document.getElementById('calendarMount');
        const mobileMount = document.getElementById('calendarMountMobile');
        if (desktopMount) wireContainer(desktopMount);
        if (mobileMount) wireContainer(mobileMount);

        const btn = document.getElementById('btnCalendar');
        if (btn) btn.addEventListener('click', open);

        // 모달을 닫으면 마운트를 놓아준다 — 백그라운드 재렌더 방지
        $('#calendarDialog').on('hidden.bs.modal', function () {
            if (activeMount === desktopMount) activeMount = null;
            closeAddForm();
        });

        // 창 크기가 경계를 넘나들 때 달력이 갇히지 않게 정리한다.
        let wasMobile = isMobile();
        window.addEventListener('resize', function () {
            const nowMobile = isMobile();
            if (nowMobile === wasMobile) return;
            wasMobile = nowMobile;

            if (nowMobile) {
                // 데스크탑 모달이 열려 있었으면 모바일 달력 탭으로 넘긴다.
                if (activeMount === desktopMount) {
                    $('#calendarDialog').modal('hide');
                    if (typeof switchMobileTab === 'function') switchMobileTab('calendar');
                }
            } else if (document.body.classList.contains('mobile-show-calendar')) {
                // 모바일 달력 탭에서 넓어졌으면 고객 리스트로 돌리고 모달로 띄운다.
                if (typeof switchMobileTab === 'function') switchMobileTab('list');
                openDesktopModal();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.CalendarModule = {
        rebuild: rebuild,
        open: open,
        mountMobile: mountMobile,
        // 콘솔 검증용
        _index: function () { return scheduleIndex; }
    };
})();
