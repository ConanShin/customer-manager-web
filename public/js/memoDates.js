/* ============================================================
   메모 날짜 파서 — 웹 달력과 카카오 알림 스크립트가 함께 쓰는 단일 규칙.

   여기가 유일한 날짜 해석 지점이다. 달력에는 뜨는데 알림은 안 온다거나
   그 반대가 생기지 않도록, 규칙을 바꿀 일이 있으면 반드시 이 파일만 고친다.

   고객 메모(customers.note)는 자유 서식이라 날짜가 여러 모양으로 적힌다.
     - 연도가 붙은 완전한 날짜   2026/08/13, 2026-08-13, 2026년 8월 13일
     - 연도가 없는 짧은 날짜     8월 13일, 8/13, 8.13
     - 같은 줄 날짜 기준 상대 표현  3일 후, 내일, 다음주 화, 8월 말, 내년 3월

   연도가 없는 짧은 날짜는 주변 메모에서 연도를 추론한다(자세한 규칙은
   resolveYear 주석 참고). 추론된 항목은 estimated: true 로 표시되므로
   화면에서 확정 일정과 구분해 보여줄 수 있다.

   브라우저에서는 window.MemoDates, Node 에서는 module.exports 로 쓴다.
   ============================================================ */
(function (root, factory) {
    'use strict';
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.MemoDates = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    /* ---------------------------------------------------------
       날짜 유틸
       --------------------------------------------------------- */

    function pad2(n) { return n < 10 ? '0' + n : '' + n; }

    // Date → 'YYYY-MM-DD' (인덱스 키로 쓴다)
    function keyOf(dt) {
        return dt.getFullYear() + '-' + pad2(dt.getMonth() + 1) + '-' + pad2(dt.getDate());
    }

    // 존재하지 않는 날짜(2/30 등)는 null. month 는 1-based.
    function makeDate(year, month, day) {
        if (!(month >= 1 && month <= 12) || !(day >= 1 && day <= 31)) return null;
        const dt = new Date(year, month - 1, day);
        if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return null;
        return dt;
    }

    function startOfDay(dt) {
        return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    }

    // 'YYYY/MM/DD' · 'YYYY-MM-DD' · ISO 타임스탬프를 Date 로. 실패하면 null.
    function parseStoredDate(value) {
        if (!value) return null;
        const m = String(value).match(/(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
        if (!m) return null;
        return makeDate(+m[1], +m[2], +m[3]);
    }

    /* ---------------------------------------------------------
       한 줄에서 날짜 뽑기
       --------------------------------------------------------- */

    // 연도가 붙은 완전한 날짜
    const RE_FULL_DATE = /(\d{4})\s*[\/\-.년]\s*(\d{1,2})\s*[\/\-.월]\s*(\d{1,2})\s*일?(?!\d)/g;
    // 연도 없는 짧은 날짜: 8월 13일 / 8월13일
    const RE_SHORT_KO = /(\d{1,2})\s*월\s*(\d{1,2})\s*일?(?!\d)/g;
    // 연도 없는 짧은 날짜: 8/13, 8.13 — 앞뒤가 숫자·구분자면 제외(전화번호 오탐 방지)
    const RE_SHORT_SEP = /(^|[^\d.\/\-])(\d{1,2})\s*[\/.]\s*(\d{1,2})(?![\d.\/\-])/g;
    // 줄 안에 박혀 있는 연도 토큰
    const RE_YEAR_TOKEN = /20\d{2}/g;

    // 완전한 날짜를 뽑고, 뽑은 자리를 같은 길이의 공백으로 덮은 문자열을 함께 준다.
    // 짧은 날짜 스캔이 "2026/08/13"의 뒤쪽 "08/13"을 다시 잡는 걸 막기 위한 것.
    function extractFullDates(line) {
        const dates = [];
        let masked = line;
        let m;
        RE_FULL_DATE.lastIndex = 0;
        while ((m = RE_FULL_DATE.exec(line)) !== null) {
            const dt = makeDate(+m[1], +m[2], +m[3]);
            if (dt) dates.push(dt);
            masked = masked.slice(0, m.index)
                + ' '.repeat(m[0].length)
                + masked.slice(m.index + m[0].length);
        }
        return { dates: dates, masked: masked };
    }

    // 연도 없는 (월, 일) 쌍 목록
    function extractShortMonthDays(masked) {
        const out = [];
        const seen = {};
        const push = function (month, day) {
            if (!(month >= 1 && month <= 12) || !(day >= 1 && day <= 31)) return;
            const k = month + '-' + day;
            if (seen[k]) return;
            seen[k] = true;
            out.push({ month: month, day: day });
        };

        let m;
        RE_SHORT_KO.lastIndex = 0;
        while ((m = RE_SHORT_KO.exec(masked)) !== null) push(+m[1], +m[2]);

        RE_SHORT_SEP.lastIndex = 0;
        while ((m = RE_SHORT_SEP.exec(masked)) !== null) push(+m[2], +m[3]);

        return out;
    }

    const YOIL_MAP = { '일': 0, '월': 1, '화': 2, '수': 3, '목': 4, '금': 5, '토': 6 };

    // 상대 표현. 같은 줄의 완전한 날짜를 기준점으로 삼는다.
    function extractRelativeDates(line, baseDates) {
        if (!baseDates.length) return [];

        const rels = [];
        let m;

        m = line.match(/(\d+)일\s*[후뒤]/);
        if (m) rels.push({ type: 'day', val: +m[1] });

        if (/내일|명일/.test(line)) rels.push({ type: 'day', val: 1 });
        if (/모레/.test(line)) rels.push({ type: 'day', val: 2 });
        if (/한\s*달\s*[후뒤]/.test(line)) rels.push({ type: 'month', val: 1 });

        m = line.match(/(\d+)개월\s*[후뒤]/);
        if (m) rels.push({ type: 'month', val: +m[1] });

        m = line.match(/(\d+)주\s*[후뒤]/);
        if (m) rels.push({ type: 'day', val: +m[1] * 7 });

        m = line.match(/다음\s*주(?:에|에\s)?\s*(월|화|수|목|금|토|일)?/);
        if (m) rels.push({ type: 'next_week', yoil: m[1] });

        m = line.match(/다다음\s*주(?:에|에\s)?\s*(월|화|수|목|금|토|일)?/);
        if (m) rels.push({ type: 'next_next_week', yoil: m[1] });

        m = line.match(/이번\s*주(?:에|에\s)?\s*(월|화|수|목|금|토|일)/);
        if (m) rels.push({ type: 'this_week', yoil: m[1] });

        m = line.match(/(\d+)년\s*[후뒤]/);
        if (m) rels.push({ type: 'year', val: +m[1] });

        m = line.match(/내년\s*(\d{1,2})월/);
        if (m) rels.push({ type: 'next_year_month', month: +m[1] });
        else if (/내년/.test(line)) rels.push({ type: 'year', val: 1 });

        m = line.match(/(\d{1,2})월\s*말/);
        if (m) rels.push({ type: 'end_of_month', month: +m[1] });

        if (!rels.length) return [];

        const out = [];

        baseDates.forEach(function (baseDate) {
            rels.forEach(function (rel) {
                const d = new Date(baseDate.getTime());

                if (rel.type === 'day') {
                    d.setDate(d.getDate() + rel.val);
                } else if (rel.type === 'month') {
                    d.setMonth(d.getMonth() + rel.val);
                } else if (rel.type === 'year') {
                    d.setFullYear(d.getFullYear() + rel.val);
                } else if (rel.type === 'next_year_month') {
                    d.setFullYear(d.getFullYear() + 1);
                    d.setMonth(rel.month - 1, 1);
                } else if (rel.type === 'end_of_month') {
                    const mIdx = rel.month - 1;
                    if (mIdx < d.getMonth()) d.setFullYear(d.getFullYear() + 1);
                    d.setMonth(mIdx + 1, 0);
                } else if (rel.type === 'next_week' || rel.type === 'next_next_week') {
                    if (rel.yoil) {
                        const targetYoil = YOIL_MAP[rel.yoil];
                        const currentYoil = d.getDay();
                        const daysToNextMonday = currentYoil === 0 ? 1 : 8 - currentYoil;
                        let diff = daysToNextMonday + (targetYoil === 0 ? 6 : targetYoil - 1);
                        if (rel.type === 'next_next_week') diff += 7;
                        d.setDate(d.getDate() + diff);
                    } else {
                        d.setDate(d.getDate() + (rel.type === 'next_week' ? 7 : 14));
                    }
                } else if (rel.type === 'this_week') {
                    const targetIso = YOIL_MAP[rel.yoil] === 0 ? 7 : YOIL_MAP[rel.yoil];
                    const currentIso = d.getDay() === 0 ? 7 : d.getDay();
                    d.setDate(d.getDate() + (targetIso - currentIso));
                }

                out.push(startOfDay(d));
            });
        });

        return out;
    }

    /* ---------------------------------------------------------
       연도 추론
       --------------------------------------------------------- */

    // 앵커보다 이 정도까지 어긋나는 건 같은 시기로 본다.
    // (메모를 쓴 시점과 실제 일정이 며칠 앞뒤로 벌어지는 걸 허용하는 완충)
    const ANCHOR_GRACE_DAYS = 45;

    /**
     * 연도 없는 (월,일)에 연도를 붙인다.
     *
     * 앵커연도 -1 / 0 / +1 후보 중에서 고른다. 메모는 위에서 아래로 쌓이므로
     * 방향이 중요하다. 앵커가 윗줄이면 이 일정은 그 뒤(forward), 아랫줄이면
     * 그 앞(backward)일 가능성이 높다. 방향에 맞는 후보 중 앵커와 가장 가까운
     * 것을 고르고, 방향에 맞는 후보가 없으면 그냥 가장 가까운 것을 쓴다.
     */
    function resolveYear(monthDay, anchor, direction) {
        const forward = direction !== 'backward';

        const bound = new Date(anchor.getTime());
        bound.setDate(bound.getDate() + (forward ? -ANCHOR_GRACE_DAYS : ANCHOR_GRACE_DAYS));

        const candidates = [];
        for (let offset = -1; offset <= 1; offset++) {
            const cand = makeDate(anchor.getFullYear() + offset, monthDay.month, monthDay.day);
            if (cand) candidates.push(cand);
        }
        if (!candidates.length) return null;

        const aligned = candidates.filter(function (c) {
            return forward ? c.getTime() >= bound.getTime() : c.getTime() <= bound.getTime();
        });
        const pool = aligned.length ? aligned : candidates;

        return pool.reduce(function (best, c) {
            return Math.abs(c.getTime() - anchor.getTime()) < Math.abs(best.getTime() - anchor.getTime())
                ? c : best;
        });
    }

    /**
     * 고객 레코드에서 "가장 최근 활동일"을 뽑는다.
     * 메모에 연도 단서가 전혀 없을 때 쓰는 마지막 앵커.
     *
     * 웹(camelCase, mapCustomerFromDb 결과)과 Supabase 원본(snake_case)의
     * 필드명을 모두 훑는다. 한쪽만 지원하면 달력과 알림이 다른 앵커를 쓰게 된다.
     */
    function customerAnchorDate(customer) {
        if (!customer) return null;

        const candidates = [];
        const push = function (v) { const d = parseStoredDate(v); if (d) candidates.push(d); };

        [
            'updatedAt', 'updated_at',
            'registrationDate', 'registration_date',
            'batteryOrderDate', 'battery_order_date',
            'fittingTest1', 'fitting_test_1',
            'fittingTest2', 'fitting_test_2',
            'fittingTest3', 'fitting_test_3',
            'fittingTest4', 'fitting_test_4',
            'fittingTest5', 'fitting_test_5'
        ].forEach(function (k) { push(customer[k]); });

        [customer.hearingAid, customer.hearing_aids, customer.repairReport, customer.repairs]
            .forEach(function (list) {
                if (Array.isArray(list)) list.forEach(function (row) { if (row) push(row.date); });
            });

        if (!candidates.length) return null;
        return candidates.reduce(function (a, b) { return a.getTime() >= b.getTime() ? a : b; });
    }

    /* ---------------------------------------------------------
       표시용 텍스트
       --------------------------------------------------------- */

    // 메모 줄에서 맨 앞 날짜 토큰만 떼어낸다. 떼고 나서 비면 원문 유지.
    function stripLeadingDate(line) {
        const stripped = line.replace(
            /^\s*[-•*·]?\s*(?:\d{4}\s*[\/\-.년]\s*\d{1,2}\s*[\/\-.월]\s*\d{1,2}\s*일?|\d{1,2}\s*[\/.월]\s*\d{1,2}\s*일?)\s*(?:\([^)]*\))?\s*[)\]:\-~>·]?\s*/,
            ''
        ).trim();
        return stripped || line.trim();
    }

    /* ---------------------------------------------------------
       메모 한 건 파싱
       --------------------------------------------------------- */

    /**
     * @param {string} note 고객 메모 원문 (여러 줄)
     * @param {Date=} fallbackAnchor 메모에 연도 단서가 없을 때 쓸 앵커
     *        (보통 customerAnchorDate(customer) 결과)
     * @returns {Array<{key: string, date: Date, text: string, raw: string, estimated: boolean}>}
     */
    function parseNote(note, fallbackAnchor) {
        const rawLines = String(note || '').split('\n');
        if (!rawLines.length) return [];

        // 1차 패스 — 줄마다 연도가 확정된 날짜와 미확정 (월,일)을 분리해 둔다.
        const parsed = rawLines.map(function (line) {
            if (!line.trim()) return null;

            const full = extractFullDates(line);
            const yearTokens = (line.match(RE_YEAR_TOKEN) || []).map(Number);
            const shortMDs = extractShortMonthDays(full.masked);

            const confirmed = full.dates.slice();
            extractRelativeDates(line, full.dates).forEach(function (d) { confirmed.push(d); });

            // 같은 줄에 연도가 있으면 짧은 날짜는 그 연도로 확정한다(추론 아님).
            const pending = [];
            shortMDs.forEach(function (md) {
                if (yearTokens.length) {
                    yearTokens.forEach(function (y) {
                        const d = makeDate(y, md.month, md.day);
                        if (d) confirmed.push(d);
                    });
                } else {
                    pending.push(md);
                }
            });

            return { line: line, confirmed: confirmed, pending: pending };
        });

        // 2차 패스 — 미확정 (월,일)의 앵커를 찾는다.
        const results = [];
        const today = startOfDay(new Date());

        const nearestConfirmed = function (from, step) {
            for (let i = from; i >= 0 && i < parsed.length; i += step) {
                const p = parsed[i];
                if (p && p.confirmed.length) return p.confirmed[p.confirmed.length - 1];
            }
            return null;
        };

        parsed.forEach(function (p, i) {
            if (!p) return;
            const text = stripLeadingDate(p.line);
            const raw = p.line.trim();

            p.confirmed.forEach(function (d) {
                results.push({ key: keyOf(d), date: d, text: text, raw: raw, estimated: false });
            });

            if (!p.pending.length) return;

            // 앵커 우선순위: 윗줄 → 아랫줄 → 고객 최근 활동일 → 오늘.
            // 윗줄에서 물려받으면 이 일정은 그 뒤, 아랫줄에서면 그 앞으로 본다.
            let anchor = nearestConfirmed(i - 1, -1);
            let direction = 'forward';
            if (!anchor) {
                anchor = nearestConfirmed(i + 1, 1);
                if (anchor) direction = 'backward';
            }
            if (!anchor) anchor = fallbackAnchor || today;

            p.pending.forEach(function (md) {
                const d = resolveYear(md, anchor, direction);
                if (d) results.push({ key: keyOf(d), date: d, text: text, raw: raw, estimated: true });
            });
        });

        // 같은 줄이 같은 날짜를 두 경로로 만들어낼 수 있으므로 정리.
        const seen = {};
        return results.filter(function (r) {
            const k = r.key + ' ' + r.raw;
            if (seen[k]) return false;
            seen[k] = true;
            return true;
        });
    }

    /**
     * 고객 목록 전체를 날짜별 인덱스로 만든다.
     * @param {Array} customers name/note 를 가진 고객 배열 (웹·DB 형태 모두 가능)
     * @returns {Object} { 'YYYY-MM-DD': [{ customer, name, text, raw, estimated }, …] }
     */
    function indexCustomers(customers) {
        const index = {};
        (customers || []).forEach(function (customer) {
            if (!customer || !customer.note) return;
            const anchor = customerAnchorDate(customer);
            parseNote(customer.note, anchor).forEach(function (item) {
                if (!index[item.key]) index[item.key] = [];
                index[item.key].push({
                    customer: customer,
                    name: customer.name || '(이름 없음)',
                    text: item.text,
                    raw: item.raw,
                    estimated: item.estimated
                });
            });
        });
        return index;
    }

    return {
        parseNote: parseNote,
        indexCustomers: indexCustomers,
        customerAnchorDate: customerAnchorDate,
        stripLeadingDate: stripLeadingDate,
        keyOf: keyOf,
        pad2: pad2,
        makeDate: makeDate,
        startOfDay: startOfDay,
        parseStoredDate: parseStoredDate
    };
});
