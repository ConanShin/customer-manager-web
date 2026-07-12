// Mock Mode (development/testing): enable with ?mock=1
const MOCK_MODE = new URLSearchParams(location.search).get('mock') === '1';

// Supabase Config
const supabaseUrl = 'https://hooiszyapcowfyccwpoi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhvb2lzenlhcGNvd2Z5Y2N3cG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMzYwMDcsImV4cCI6MjA4MjYxMjAwN30.nc-Ri_Rh8anM4LhsvpWHxvUiyKj0Is7FJ438ptZOR-Q';
const { createClient } = supabase;
const _supabase = createClient(supabaseUrl, supabaseKey);

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyBGUqCm7BSA7NBuOK5XSZwd1imvfqec5x4",
    authDomain: "starkey.firebaseapp.com",
    databaseURL: "https://starkey.firebaseio.com",
    projectId: "starkey",
    storageBucket: "starkey.appspot.com",
    messagingSenderId: "425991075433",
    appId: "1:425991075433:web:9b9c9b9c9b9c9b9c" // Note: This App ID is a placeholder/inferred. It may need to be registered in Firebase Console for web.
};
firebase.initializeApp(firebaseConfig);
const _storage = firebase.storage();

// Globals
// Globals
const columns = ["이름", "사진", "", "연락처", "주소"];
const _storageBucketName = "starkey.appspot.com"; // from config but hardcoded for URL construction
let repairColumns = ["이름", "사진", "", "연락처", "최근 수리내역"];
const yearColumns = ["이름", "사진", "", "연락처", "보청기 구입일", "모델명"];

let customerListTable = document.getElementById("customerList");
let repairCustomerListTable = document.getElementById("repairCustomerList");
let oneWeekTable = document.getElementById("oneWeek").getElementsByTagName("table")[0];
let threeWeekTable = document.getElementById("threeWeek").getElementsByTagName("table")[0];
let sevenWeekTable = document.getElementById("sevenWeek").getElementsByTagName("table")[0];
let oneYearTable = document.getElementById("oneYear").getElementsByTagName("table")[0];
let twoYearTable = document.getElementById("twoYear").getElementsByTagName("table")[0];
let fiveYearTable = document.getElementById("fiveYear").getElementsByTagName("table")[0];
let fittingDueTable = document.getElementById("fittingDue").getElementsByTagName("table")[0];
let fittingOver5YearTable = document.getElementById("fittingOver5Year").getElementsByTagName("table")[0];
let newCustomerForm = $('.newCustomerForm');
let newRepairForm = $('.repairCustomerForm');

let btnBuyRepair = $("#btnBuyRepair input:radio");
let btnLogOut = document.getElementById("btnLogOut");
let btnNewCustomer = document.getElementById("btnNewCustomer");
let btnNewRepairCustomer = document.getElementById("btnNewRepairCustomer");
let btnReadCustomer = document.getElementById("btnReadCustomer");
// Global customers list
let allCustomers = [];
let btnAddCustomer = document.getElementById("btnAddCustomer");
let btnAddRepairCustomer = document.getElementById("btnAddRepairCustomer");
let btnDeleteCustomer = document.getElementById("btnDeleteCustomer");
let btnDeleteRepairCustomer = document.getElementById("btnDeleteRepairCustomer");
let btnCancelNewCustomer = document.getElementById("btnCancelNewCustomer");
let btnCancelRepairCustomer = document.getElementById("btnCancelRepairCustomer");
let btnSalesStats = document.getElementById("btnSalesStats");

let updateCustomerId = "";

// Auth Check
_supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        console.log("Welcome " + session.user.email);
    } else if (MOCK_MODE) {
        // Mock 모드에서는 로그인 리다이렉트를 건너뜁니다.
        console.log("MOCK MODE: skipping login redirect");
    } else {
        location.replace("/html/Login.html");
    }
});

// Date Utils
function convertDate(inputFormat, separator = '/') {
    function pad(s) { return (s < 10) ? '0' + s : s; }
    var d = new Date(inputFormat);
    return [pad(d.getFullYear()), pad(d.getMonth() + 1), pad(d.getDate())].join(separator);
}

let now = new Date();
let currentDate = convertDate(now, '/'); // For UI Display
let currentDbDate = convertDate(now, '-'); // For DB and <input type="date">
let weekAgo = convertDate(new Date().setDate(now.getDate() - 7));
let threeWeeksAgo = convertDate(new Date().setDate(now.getDate() - 21));
let sevenWeeksAgo = convertDate(new Date().setDate(now.getDate() - 49));
let before1YearDate = convertDate(new Date().setFullYear(now.getFullYear() - 1));
let before2YearDate = convertDate(new Date().setFullYear(now.getFullYear() - 2));
let before5YearDate = convertDate(new Date().setFullYear(now.getFullYear() - 5));

function isNull(subject) {
    return subject == undefined || subject == "";
}

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function formatDate(insertDate) {
    if (isNull(insertDate)) return "";
    // Handle YYYY-MM-DD or YYYY/MM/DD inputs
    let datePart = String(insertDate).replace(/-/g, "/");
    let parts = datePart.split("/");

    if (parts.length < 3) return insertDate; // Return original if not YYYY/MM/DD

    var insertYear = parts[0];
    var insertMonth = parts[1];
    var insertDay = parts[2];

    // If day part contains time, strip it (e.g. 30T12:00:00)
    if (insertDay.indexOf('T') > -1) {
        insertDay = insertDay.split('T')[0];
    }
    // Or if it has space
    if (insertDay.indexOf(' ') > -1) {
        insertDay = insertDay.split(' ')[0];
    }

    var formattedMonth = insertMonth.length < 2 ? "0" + insertMonth : insertMonth;
    var formattedDay = insertDay.length < 2 ? "0" + insertDay : insertDay;

    return insertYear + "/" + formattedMonth + "/" + formattedDay;
}

function toDbDate(uiDate) {
    if (isNull(uiDate)) return null;
    return uiDate.replace(/\//g, "-");
}

function isInNextThreeDays(tableDate, purchaseDate) {
    if (isNull(purchaseDate)) return false;
    var tableDateYear = tableDate.split("/")[0];
    var tableDateMonth = tableDate.split("/")[1];
    var tableDateDay = tableDate.split("/")[2];
    var tDate = new Date(tableDateYear, tableDateMonth - 1, tableDateDay);

    var formattedPurchaseDate = formatDate(purchaseDate);
    var purchaseDateYear = formattedPurchaseDate.split("/")[0];
    var purchaseDateMonth = formattedPurchaseDate.split("/")[1];
    var purchaseDateDay = formattedPurchaseDate.split("/")[2];
    var pDate = new Date(purchaseDateYear, purchaseDateMonth - 1, purchaseDateDay);

    var threeDaysLater = new Date(tDate);
    threeDaysLater.setDate(tDate.getDate() + 3);

    return pDate >= tDate && pDate <= threeDaysLater;
}

let isEqualYearAndMonth = function (tableDate, purchaseDate) {
    if (isNull(purchaseDate)) return false;
    var tableDateYear = tableDate.split("/")[0];
    var tableDateMonth = tableDate.split("/")[1];

    var formattedPurchaseDate = formatDate(purchaseDate);
    var purchaseDateYear = formattedPurchaseDate.split("/")[0];
    var purchaseDateMonth = formattedPurchaseDate.split("/")[1];

    return (tableDateYear == purchaseDateYear && tableDateMonth == purchaseDateMonth);
}

let clearTableAndReturn = function (table) {
    var tableBody = table.getElementsByTagName("tbody")[0];
    if (tableBody) tableBody.innerHTML = "";
    return tableBody;
}

// Helper to render headers
function renderHeaders(table, cols) {
    let thead = table.getElementsByTagName("thead")[0];
    thead.innerHTML = "";
    let headerRow = thead.insertRow(0);
    cols.forEach(col => {
        let th = document.createElement("th");
        th.innerHTML = col;
        headerRow.appendChild(th);
    });
}

// Escape user data before interpolating into innerHTML (XSS-safe)
function escapeHtml(str) {
    if (str == null) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// 이름 기반 파스텔 아바타 색상 (부드러운 배경 + 읽기 쉬운 진한 글자색)
const AVATAR_PALETTE = [
    { bg: '#dbeafe', fg: '#1e40af' }, // blue
    { bg: '#dcfce7', fg: '#166534' }, // green
    { bg: '#fef3c7', fg: '#92400e' }, // amber
    { bg: '#fce7f3', fg: '#9d174d' }, // pink
    { bg: '#ede9fe', fg: '#5b21b6' }, // violet
    { bg: '#cffafe', fg: '#155e75' }, // cyan
    { bg: '#ffedd5', fg: '#9a3412' }, // orange
    { bg: '#e0e7ff', fg: '#3730a3' }  // indigo
];

// 이름의 문자 코드를 해싱해 항상 같은 색 조합을 돌려줍니다 (안정적/전문적).
function avatarColorFor(name) {
    let str = String(name == null ? '' : name);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    }
    return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

// 만 나이 ("YYYY/MM/DD" → 정수, 계산 불가 시 null)
function koreanAge(birthDate) {
    if (isNull(birthDate)) return null;
    let d = new Date(birthDate);
    if (isNaN(d.getTime())) return null;
    let today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    let m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return (age >= 0 && age < 150) ? age : null;
}

// 오늘까지의 경과 기간 → "N년 M개월" / "N년" / "N개월" / "N일" (0 단위 생략).
// Date 또는 날짜 문자열 허용; 무효/미래 날짜는 "" 반환.
function elapsedText(dateInput) {
    if (dateInput == null || dateInput === "") return "";
    let d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    let now = new Date();
    if (d > now) return "";
    let months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (now.getDate() < d.getDate()) months--;
    if (months <= 0) {
        let days = Math.floor((now - d) / 86400000);
        return days + "일";
    }
    let y = Math.floor(months / 12);
    let m = months % 12;
    if (y > 0 && m > 0) return y + "년 " + m + "개월";
    if (y > 0) return y + "년";
    return m + "개월";
}

// Build a lowercase search index string for a customer row (name, phones raw + digits-only, address, models, last repair)
function buildSearchIndex(customerData) {
    let parts = [];
    let digitsOnly = function (x) { return String(x == null ? "" : x).replace(/\D/g, ''); };

    if (customerData.name) parts.push(customerData.name);
    if (customerData.phoneNumber) {
        parts.push(customerData.phoneNumber);
        parts.push(digitsOnly(customerData.phoneNumber));
    }
    if (customerData.mobilePhoneNumber) {
        parts.push(customerData.mobilePhoneNumber);
        parts.push(digitsOnly(customerData.mobilePhoneNumber));
    }
    if (customerData.address) parts.push(customerData.address);
    if (customerData.hearingAid && customerData.hearingAid.length > 0) {
        customerData.hearingAid.forEach(function (ha) {
            if (ha.model) parts.push(ha.model);
        });
    }
    if (customerData.repairReport && customerData.repairReport.length > 0) {
        let lastRepair = customerData.repairReport[customerData.repairReport.length - 1];
        if (lastRepair && lastRepair.content) parts.push(lastRepair.content);
    }

    return parts.join(" ").toLowerCase();
}

// Data Mapping
const mapCustomerFromDb = (dbCustomer) => {
    let birthDate = formatDate(dbCustomer.birth_date);
    if ((birthDate == "" || birthDate == undefined) && dbCustomer.age) {
        // Try to parse age
        let ageNum = parseInt(dbCustomer.age.replace(/[^0-9]/g, ""));
        if (!isNaN(ageNum)) {
            let year = new Date().getFullYear() - ageNum;
            birthDate = year + "/01/01";
        }
    }

    return {
        key: dbCustomer.id,
        id: dbCustomer.id,
        name: dbCustomer.name,
        birthDate: birthDate,
        age: dbCustomer.age,
        sex: dbCustomer.sex,
        batteryOrderDate: formatDate(dbCustomer.battery_order_date),
        cardAvailability: dbCustomer.card_availability == 'Yes' ? 'Yes' : 'No', // Default check
        cochlearImplant: dbCustomer.cochlear_implant == 'Yes' ? 'Yes' : 'No',
        workersComp: dbCustomer.workers_comp == 'Yes' ? 'Yes' : 'No',
        address: dbCustomer.address,
        phoneNumber: dbCustomer.phone_number,
        mobilePhoneNumber: dbCustomer.mobile_phone_number,
        registrationDate: formatDate(dbCustomer.registration_date),
        fittingTest1: formatDate(dbCustomer.fitting_test_1),
        fittingTest2: formatDate(dbCustomer.fitting_test_2),
        fittingTest3: formatDate(dbCustomer.fitting_test_3),
        fittingTest4: formatDate(dbCustomer.fitting_test_4),
        fittingTest5: formatDate(dbCustomer.fitting_test_5),
        note: dbCustomer.note,
        hearingAid: dbCustomer.hearing_aids ? dbCustomer.hearing_aids.map(ha => ({
            side: ha.side,
            model: ha.model,
            date: formatDate(ha.date)
        })) : [],
        repairReport: dbCustomer.repairs ? dbCustomer.repairs.map(r => ({
            date: formatDate(r.date),
            content: r.content
        })) : [],
        updatedAt: dbCustomer.updated_at
    };
};

const mapCustomerToDb = (uiCustomer) => {
    return {
        name: uiCustomer.name,
        birth_date: toDbDate(uiCustomer.birthDate), // Save birth_date
        // age: uiCustomer.age, // We might not need to save age explicitly if birth_date is enough, but keeping it if UI calculates it? No UI handling for age now.
        sex: uiCustomer.sex,
        battery_order_date: toDbDate(uiCustomer.batteryOrderDate),
        card_availability: uiCustomer.cardAvailability, // check value
        cochlear_implant: uiCustomer.cochlearImplant,
        workers_comp: uiCustomer.workersComp,
        address: uiCustomer.address,
        phone_number: uiCustomer.phoneNumber,
        mobile_phone_number: uiCustomer.mobilePhoneNumber,
        registration_date: toDbDate(uiCustomer.registrationDate),
        fitting_test_1: toDbDate(uiCustomer.fittingTest1),
        fitting_test_2: toDbDate(uiCustomer.fittingTest2),
        fitting_test_3: toDbDate(uiCustomer.fittingTest3),
        fitting_test_4: toDbDate(uiCustomer.fittingTest4),
        fitting_test_5: toDbDate(uiCustomer.fittingTest5),
        note: uiCustomer.note,
        updated_at: new Date().toISOString() // Force timestamp update for cache busting
    };
};

// Main Load Logic
async function loadCustomers() {
    $("#loader h4").text("데이터 불러오는 중...");
    $("#loader").css("display", "flex");

    let customers;

    if (MOCK_MODE) {
        // Mock 모드: Supabase 대신 로컬 목 데이터 사용 (이미 UI 형태로 매핑됨)
        customers = getMockCustomers();
        allCustomers = customers;
        console.log("MOCK MODE: Loaded mock customers:", customers.length);
    } else {
        let allData = [];
        let from = 0;
        let to = 999;
        let keepFetching = true;

        while (keepFetching) {
            const { data: customersDb, error } = await _supabase
                .from('customers')
                .select(`*, hearing_aids(*), repairs(*)`)
                .order('updated_at', { ascending: false, nullsFirst: false })
                .range(from, to);

            if (error) {
                console.error("Error loading customers:", error);
                alert("Error loading data");
                $("#loader").hide();
                return;
            }

            if (customersDb.length === 0) {
                keepFetching = false;
            } else {
                allData = allData.concat(customersDb);
                from += 1000;
                to += 1000;
                // Optional: Break if fetched less than limit, meaning we reached the end
                if (customersDb.length < 1000) {
                    keepFetching = false;
                }
            }
        }

        // Use the accumulated data
        customers = allData.map(mapCustomerFromDb);
        allCustomers = customers; // Store correctly
        console.log("Fetched Total Customers:", allData.length);
        console.log("Mapped Customers:", customers);
    }

    // Customer List Table
    var customerListTableBody = customerListTable.getElementsByTagName("tbody")[0];
    customerListTableBody.innerHTML = "";
    // Populate Notice Tables (Always active, based on ALL data or just Purchase data? Usually Purchase)
    // Filter for Purchase Customers for Notice Tables
    var oneWeekTableBody = clearTableAndReturn(oneWeekTable);
    var threeWeekTableBody = clearTableAndReturn(threeWeekTable);
    var sevenWeekTableBody = clearTableAndReturn(sevenWeekTable);
    var oneYearTableBody = clearTableAndReturn(oneYearTable);
    var twoYearTableBody = clearTableAndReturn(twoYearTable);
    var fiveYearTableBody = clearTableAndReturn(fiveYearTable);
    var fittingDueTableBody = clearTableAndReturn(fittingDueTable);
    var fittingOver5YearTableBody = clearTableAndReturn(fittingOver5YearTable);

    renderHeaders(oneWeekTable, yearColumns);
    renderHeaders(threeWeekTable, yearColumns);
    renderHeaders(sevenWeekTable, yearColumns);
    renderHeaders(oneYearTable, yearColumns);
    renderHeaders(twoYearTable, yearColumns);
    renderHeaders(fiveYearTable, yearColumns);
    renderHeaders(fittingDueTable, ["이름", "사진", "", "연락처", "최근 적합검사일", "모델명"]);
    renderHeaders(fittingOver5YearTable, ["이름", "사진", "", "연락처", "1차 적합검사일", "모델명"]);

    const purchaseCustomers = customers.filter(c => c.hearingAid && c.hearingAid.length > 0);

    // Bucket Aggregation
    let buckets = {
        oneWeek: [],
        threeWeek: [],
        sevenWeek: [],
        oneYear: [],
        twoYear: [],
        fiveYear: [],
        fittingDue: [],
        fittingOver5Year: []
    };

    // 1차 적합검사(fittingTest1)가 오늘 기준 5년보다 이전인 고객 판별 기준일
    const fittingOver5YearThreshold = new Date();
    fittingOver5YearThreshold.setFullYear(fittingOver5YearThreshold.getFullYear() - 5);

    customers.forEach(function (customerData) {
        // 1. Hearing Aid Purchase Hits (Buckets: 1w, 3w, 7w, 1y, 2y, 5y)
        if (customerData.hearingAid && customerData.hearingAid.length > 0) {
            let hits = {
                oneWeek: [],
                threeWeek: [],
                sevenWeek: [],
                oneYear: [],
                twoYear: [],
                fiveYear: []
            };

            customerData.hearingAid.forEach(function (ha) {
                if (isInNextThreeDays(weekAgo, ha.date)) hits.oneWeek.push(ha);
                else if (isInNextThreeDays(threeWeeksAgo, ha.date)) hits.threeWeek.push(ha);
                else if (isInNextThreeDays(sevenWeeksAgo, ha.date)) hits.sevenWeek.push(ha);
                else if (isEqualYearAndMonth(before1YearDate, ha.date)) hits.oneYear.push(ha);
                else if (isEqualYearAndMonth(before2YearDate, ha.date)) hits.twoYear.push(ha);
                else if (isEqualYearAndMonth(before5YearDate, ha.date)) hits.fiveYear.push(ha);
            });

            // Push to main buckets
            for (let key in hits) {
                if (hits[key].length > 0) {
                    buckets[key].push({
                        customer: customerData,
                        aids: hits[key]
                    });
                }
            }
        }

        // 2. Fitting Test Check (Always run for all customers)
        const fittingDates = [
            customerData.fittingTest1,
            customerData.fittingTest2,
            customerData.fittingTest3,
            customerData.fittingTest4,
            customerData.fittingTest5
        ].filter(d => d).map(d => new Date(d));

        if (fittingDates.length > 0) {
            const latestFitting = new Date(Math.max(...fittingDates));
            const oneYearAgoTime = new Date();
            oneYearAgoTime.setFullYear(oneYearAgoTime.getFullYear() - 1);

            if (latestFitting < oneYearAgoTime) {
                const y = latestFitting.getFullYear();
                const m = String(latestFitting.getMonth() + 1).padStart(2, '0');
                const d = String(latestFitting.getDate()).padStart(2, '0');
                const formattedLatestDate = `${y}/${m}/${d}`;

                buckets.fittingDue.push({
                    customer: customerData,
                    date: formattedLatestDate,
                    aids: customerData.hearingAid || []
                });
            }
        }

        // 3. 1차 적합검사(fittingTest1)가 5년보다 이전인 고객
        if (!isNull(customerData.fittingTest1)) {
            let firstFittingDate = new Date(customerData.fittingTest1);
            if (!isNaN(firstFittingDate.getTime()) && firstFittingDate < fittingOver5YearThreshold) {
                buckets.fittingOver5Year.push({
                    customer: customerData,
                    date: customerData.fittingTest1,
                    aids: customerData.hearingAid || []
                });
            }
        }
    });

    // 5년 경과 고객: 1차 적합검사일 오름차순 (가장 오래된/도래한 순)
    buckets.fittingOver5Year.sort(function (a, b) {
        return new Date(a.date) - new Date(b.date);
    });

    // Helper to render bucket items
    function renderBucketTable(tableBody, items, dateLabel = "구입일", dateField = null) {
        items.forEach(item => {
            let customerData = item.customer;
            let aids = item.aids;
            let hasLeft = aids.some(ha => ha.side === 'left');
            let hasRight = aids.some(ha => ha.side === 'right');

            let row = tableBody.insertRow();
            row.setAttribute('onclick', 'showCustomerDetail(\'' + customerData.id + '\')');

            // Name
            row.insertCell(0).innerHTML = escapeHtml(customerData.name);
            row.cells[0].setAttribute('data-label', '이름');

            // Profile Picture
            let profileUrl = `https://firebasestorage.googleapis.com/v0/b/${_storageBucketName}/o/customer_profiles%2F${customerData.id}?alt=media&t=${customerData.updatedAt ? new Date(customerData.updatedAt).getTime() : ''}`;
            let imgHtml = `
            <div class="profile-wrapper" style="position:relative; width:40px; height:40px;">
                <img src="${profileUrl}" class="profile-avatar-small" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" style="display:block;"/>
                <div class="profile-avatar-placeholder-small" style="display:none; position:absolute; top:0; left:0; background-color:${avatarColorFor(customerData.name).bg}; color:${avatarColorFor(customerData.name).fg};">${escapeHtml([...(customerData.name || '')][0] || '?')}</div>
            </div>`;
            row.insertCell(1).innerHTML = imgHtml;
            row.cells[1].setAttribute('data-label', '사진');

            // Icon
            let iconHtml = "";
            if (hasLeft || hasRight) {
                iconHtml = '<span class="ear-icon-container">';
                if (hasLeft) iconHtml += '<span class="ear-icon ear-left"></span>';
                if (hasRight) iconHtml += '<span class="ear-icon ear-right"></span>';
                iconHtml += '</span>';
            }
            row.insertCell(2).innerHTML = iconHtml;
            row.cells[2].setAttribute('data-label', '');

            // Contact
            let contactInfo = "";
            if (customerData.phoneNumber) {
                contactInfo += '<div><i class="fa fa-phone"></i> <a href="tel:' + encodeURIComponent(customerData.phoneNumber) + '" onclick="event.stopPropagation()">' + escapeHtml(customerData.phoneNumber) + '</a></div>';
            }
            if (customerData.mobilePhoneNumber) {
                contactInfo += '<div><i class="fa fa-mobile"></i> <a href="tel:' + encodeURIComponent(customerData.mobilePhoneNumber) + '" onclick="event.stopPropagation()">' + escapeHtml(customerData.mobilePhoneNumber) + '</a></div>';
            }
            row.insertCell(3).innerHTML = contactInfo;
            row.cells[3].setAttribute('data-label', '연락처');

            // Date
            let displayDate = dateField ? item[dateField] : (aids[0] ? aids[0].date : "");
            row.insertCell(4).innerHTML = escapeHtml(displayDate);
            row.cells[4].setAttribute('data-label', dateLabel);

            // Model
            let models = [...new Set(aids.map(ha => ha.model))].join(', ');
            row.insertCell(5).innerHTML = escapeHtml(models);
            row.cells[5].setAttribute('data-label', '모델명');
        });
    }

    renderBucketTable(oneWeekTableBody, buckets.oneWeek);
    renderBucketTable(threeWeekTableBody, buckets.threeWeek);
    renderBucketTable(sevenWeekTableBody, buckets.sevenWeek);
    renderBucketTable(oneYearTableBody, buckets.oneYear);
    renderBucketTable(twoYearTableBody, buckets.twoYear);
    renderBucketTable(fiveYearTableBody, buckets.fiveYear);
    renderBucketTable(fittingDueTableBody, buckets.fittingDue, "최근 적합검사일", "date");
    renderBucketTable(fittingOver5YearTableBody, buckets.fittingOver5Year, "1차 적합검사일", "date");

    sorttable.makeSortable(customerListTable);

    // Initial Render
    renderCustomerList();

    // Update notice-section counts / empty states / mobile badge (idempotent)
    refreshNoticeSections();

    $("#loader").hide();
}


function renderCustomerList() {
    let filterType = $("input:radio[name='buyRepair']:checked").val();

    // Clear Main Tables
    var customerListTableBody = clearTableAndReturn(customerListTable);
    var repairCustomerListTableBody = clearTableAndReturn(repairCustomerListTable);

    let filteredCustomers = [];

    if (filterType == 'all') {
        filteredCustomers = allCustomers; // Show All
    } else if (filterType == 'buy') {
        filteredCustomers = allCustomers.filter(c => c.hearingAid && c.hearingAid.length > 0);
    } else if (filterType == 'repair') {
        filteredCustomers = allCustomers.filter(c => c.repairReport && c.repairReport.length > 0);
    }

    if (filterType == 'repair') {
        // Show Repair Table
        customerListTable.style.display = "none";
        renderHeaders(repairCustomerListTable, repairColumns);
        repairCustomerListTable.style.display = "table";

        filteredCustomers.forEach(function (customerData) {
            var bodyRow = repairCustomerListTableBody.insertRow(repairCustomerListTableBody.rows.length);
            bodyRow.setAttribute('onclick', 'showCustomerDetail(\'' + customerData.id + '\')');
            bodyRow.dataset.search = buildSearchIndex(customerData);
            var hasLeft = false;
            var hasRight = false;
            if (customerData.hearingAid && customerData.hearingAid.length > 0) {
                customerData.hearingAid.forEach(function (ha) {
                    if (ha.side === 'left') hasLeft = true;
                    if (ha.side === 'right') hasRight = true;
                });
            }
            let iconHtml = "";
            if (hasLeft || hasRight) {
                iconHtml = '<span class="ear-icon-container">';
                if (hasLeft) iconHtml += '<span class="ear-icon ear-left"></span>';
                if (hasRight) iconHtml += '<span class="ear-icon ear-right"></span>';
                iconHtml += '</span>';
            }

            bodyRow.insertCell(0).innerHTML = escapeHtml(customerData.name);
            bodyRow.cells[0].setAttribute('data-label', '이름');

            // Profile Picture (Constructed from ID)
            let profileUrl = `https://firebasestorage.googleapis.com/v0/b/${_storageBucketName}/o/customer_profiles%2F${customerData.id}?alt=media&t=${customerData.updatedAt ? new Date(customerData.updatedAt).getTime() : ''}`;
            let imgHtml = `
            <div class="profile-wrapper" style="position:relative; width:40px; height:40px;">
                <img src="${profileUrl}" class="profile-avatar-small" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" style="display:block;"/>
                <div class="profile-avatar-placeholder-small" style="display:none; position:absolute; top:0; left:0; background-color:${avatarColorFor(customerData.name).bg}; color:${avatarColorFor(customerData.name).fg};">${escapeHtml([...(customerData.name || '')][0] || '?')}</div>
            </div>`;
            bodyRow.insertCell(1).innerHTML = imgHtml;
            bodyRow.cells[1].setAttribute('data-label', '사진');

            bodyRow.insertCell(2).innerHTML = iconHtml;
            bodyRow.cells[2].setAttribute('data-label', '');

            // Removed Registration Date

            // Last repair content
            // Last repair content
            let contactInfo = "";
            if (customerData.phoneNumber) {
                contactInfo += '<div><i class="fa fa-phone"></i> <a href="tel:' + encodeURIComponent(customerData.phoneNumber) + '" onclick="event.stopPropagation()">' + escapeHtml(customerData.phoneNumber) + '</a></div>';
            }
            if (customerData.mobilePhoneNumber) {
                contactInfo += '<div><i class="fa fa-mobile"></i> <a href="tel:' + encodeURIComponent(customerData.mobilePhoneNumber) + '" onclick="event.stopPropagation()">' + escapeHtml(customerData.mobilePhoneNumber) + '</a></div>';
            }
            bodyRow.insertCell(3).innerHTML = contactInfo;
            bodyRow.cells[3].setAttribute('data-label', '연락처');

            // Last repair content
            let lastRepair = "";
            if (customerData.repairReport && customerData.repairReport.length > 0) {
                lastRepair = customerData.repairReport[customerData.repairReport.length - 1].content;
            }
            bodyRow.insertCell(4).innerHTML = escapeHtml(lastRepair);
            bodyRow.cells[4].setAttribute('data-label', '최근 수리내역');
        });
    } else {
        // Show Standard Table (All or Buy)
        customerListTable.style.display = "table";
        repairCustomerListTable.style.display = "none";
        renderHeaders(customerListTable, columns);

        filteredCustomers.forEach(function (customerData) {
            var bodyRow = customerListTableBody.insertRow(customerListTableBody.rows.length);
            bodyRow.setAttribute('onclick', 'showCustomerDetail(\'' + customerData.id + '\')');
            bodyRow.dataset.search = buildSearchIndex(customerData);
            var hasLeft = false;
            var hasRight = false;
            if (customerData.hearingAid && customerData.hearingAid.length > 0) {
                customerData.hearingAid.forEach(function (ha) {
                    if (ha.side === 'left') hasLeft = true;
                    if (ha.side === 'right') hasRight = true;
                });
            }
            let iconHtml = "";
            if (hasLeft || hasRight) {
                iconHtml = '<span class="ear-icon-container">';
                if (hasLeft) iconHtml += '<span class="ear-icon ear-left"></span>';
                if (hasRight) iconHtml += '<span class="ear-icon ear-right"></span>';
                iconHtml += '</span>';
            }

            bodyRow.insertCell(0).innerHTML = escapeHtml(customerData.name);
            bodyRow.cells[0].setAttribute('data-label', '이름');

            // Profile Picture (Constructed from ID)
            let profileUrl = `https://firebasestorage.googleapis.com/v0/b/${_storageBucketName}/o/customer_profiles%2F${customerData.id}?alt=media&t=${customerData.updatedAt ? new Date(customerData.updatedAt).getTime() : ''}`;
            let imgHtml = `
            <div class="profile-wrapper" style="position:relative; width:40px; height:40px;">
                <img src="${profileUrl}" class="profile-avatar-small" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" style="display:block;"/>
                <div class="profile-avatar-placeholder-small" style="display:none; position:absolute; top:0; left:0; background-color:${avatarColorFor(customerData.name).bg}; color:${avatarColorFor(customerData.name).fg};">${escapeHtml([...(customerData.name || '')][0] || '?')}</div>
            </div>`;
            bodyRow.insertCell(1).innerHTML = imgHtml;
            bodyRow.cells[1].setAttribute('data-label', '사진');

            bodyRow.insertCell(2).innerHTML = iconHtml;
            bodyRow.cells[2].setAttribute('data-label', '');

            // Removed Registration Date
            let contactInfo = "";
            if (customerData.phoneNumber) {
                contactInfo += '<div><i class="fa fa-phone"></i> <a href="tel:' + encodeURIComponent(customerData.phoneNumber) + '" onclick="event.stopPropagation()">' + escapeHtml(customerData.phoneNumber) + '</a></div>';
            }
            if (customerData.mobilePhoneNumber) {
                contactInfo += '<div><i class="fa fa-mobile"></i> <a href="tel:' + encodeURIComponent(customerData.mobilePhoneNumber) + '" onclick="event.stopPropagation()">' + escapeHtml(customerData.mobilePhoneNumber) + '</a></div>';
            }
            bodyRow.insertCell(3).innerHTML = contactInfo;
            bodyRow.cells[3].setAttribute('data-label', '연락처');

            bodyRow.insertCell(4).innerHTML = escapeHtml(customerData.address || "");
            bodyRow.cells[4].setAttribute('data-label', '주소');
        });
    }

    // Refresh Filter (Search Text) if any
    filterTable(); // This will re-apply text search on the newly rendered table

    // UI Button Visibility
    // btnNewRepairCustomer is removed from UI as per request. 
    // We keep btnNewCustomer always visible or handle logic if needed.
    if (btnNewCustomer) btnNewCustomer.style.display = "inline";
}


// Event Listeners & UI Logic
// Event Listeners related to filtering
let clearFilter = function () {
    let input = document.getElementById("filterInput");
    input.value = "";
    let wrap = input.closest('.search-input-wrap');
    if (wrap) wrap.classList.remove('has-text');
    filterTable();
}

let filterTable = function () {
    let q = document.getElementById("filterInput").value.trim().toLowerCase();
    let qDigits = q.replace(/\D/g, '');

    let filterType = $("input:radio[name='buyRepair']:checked").val();
    let listTable = filterType == 'repair' ? repairCustomerListTable : customerListTable;

    let tbody = listTable.getElementsByTagName("tbody")[0];
    let rows = tbody ? tbody.getElementsByTagName("tr") : [];
    let count = 0;

    for (let i = 0; i < rows.length; i++) {
        let row = rows[i];
        let index = row.dataset.search;

        let matched;
        if (q === "") {
            // Empty query matches every row (even rows without a search index)
            matched = true;
        } else if (index == null) {
            // Rows without dataset.search only match on empty query
            matched = false;
        } else {
            matched = index.includes(q) || (qDigits.length >= 3 && index.includes(qDigits));
        }

        if (matched) {
            row.style.display = "";
            count++;
            if (count % 10 == 0) {
                row.className = "highlight";
            } else {
                row.className = "";
            }
        } else {
            row.style.display = "none";
        }
    }
    $("#customerCount")[0].innerHTML = count;
}

// ── Notice sections & mobile navigation ──────────────────────────────
// Order matters only for readability; ids match the 8 notice sections.
const NOTICE_SECTION_IDS = [
    'fittingOver5Year', 'oneWeek', 'threeWeek', 'sevenWeek',
    'oneYear', 'twoYear', 'fiveYear', 'fittingDue'
];

// 모바일 칩 내비게이션용 짧은 섹션 제목
const NOTICE_SHORT_TITLES = {
    fittingOver5Year: '5년경과',
    oneWeek: '1주차',
    threeWeek: '3주차',
    sevenWeek: '7주차',
    oneYear: '1년차',
    twoYear: '2년차',
    fiveYear: '5년차',
    fittingDue: '적합검사'
};

// Count rows per notice section, write the count badge, toggle empty state,
// rebuild the mobile chip navigation, and update the "정기 관리" tab badge.
// Idempotent: safe to call after every loadCustomers().
function refreshNoticeSections() {
    let total = 0;
    let chipsHtml = '';
    NOTICE_SECTION_IDS.forEach(function (id) {
        let section = document.getElementById(id);
        if (!section) return;
        let tbody = section.getElementsByTagName('tbody')[0];
        let count = tbody ? tbody.rows.length : 0;
        total += count;

        let badge = section.querySelector('.notice-count-badge');
        if (badge) badge.textContent = count;

        section.classList.toggle('is-empty', count === 0);

        chipsHtml += '<button type="button" class="notice-chip'
            + (count === 0 ? ' is-zero' : '')
            + (section.classList.contains('urgent') ? ' is-urgent' : '')
            + '" onclick="scrollToNoticeSection(\'' + id + '\')">'
            + (NOTICE_SHORT_TITLES[id] || id)
            + ' <span class="chip-count">' + count + '</span></button>';
    });

    let chipBar = document.getElementById('noticeChipBar');
    if (chipBar) chipBar.innerHTML = chipsHtml;

    let tabBadge = document.getElementById('mobileNoticeBadge');
    if (tabBadge) {
        tabBadge.textContent = total;
        tabBadge.style.display = total > 0 ? '' : 'none';
    }
}

// 칩 탭 → 해당 섹션으로 스크롤 (접혀 있으면 먼저 펼침)
function scrollToNoticeSection(id) {
    let section = document.getElementById(id);
    if (!section) return;
    if (section.classList.contains('collapsed')) {
        section.classList.remove('collapsed');
        let header = section.querySelector('.notice-header');
        if (header) header.setAttribute('aria-expanded', 'true');
    }
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Collapse / expand a notice section (chevron rotates via CSS).
function toggleNoticeSection(headerEl) {
    let section = headerEl.closest('.notice-section');
    if (!section) return;
    let collapsed = section.classList.toggle('collapsed');
    headerEl.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
}

// Switch the visible column on mobile (<900px). No effect at desktop widths
// because the CSS rules that consume `mobile-show-notice` are media-scoped.
function switchMobileTab(tab) {
    document.body.classList.toggle('mobile-show-notice', tab === 'notice');
    document.querySelectorAll('#mobileTabBar .mobile-tab').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    window.scrollTo(0, 0);
}

// UI wiring for the search box + keyboard support for notice headers.
(function initUiEnhancements() {
    let input = document.getElementById('filterInput');
    if (input) {
        let wrap = input.closest('.search-input-wrap');
        let syncClear = function () {
            if (wrap) wrap.classList.toggle('has-text', input.value.length > 0);
        };
        input.addEventListener('input', syncClear);
        syncClear();
    }

    // Notice headers are keyboard-operable (Enter / Space) as button-like rows.
    document.querySelectorAll('.notice-header').forEach(function (header) {
        header.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                toggleNoticeSection(header);
            }
        });
    });
})();

btnBuyRepair.change(function () {
    renderCustomerList();
    updateCustomerId = "";
    // filterTable called inside renderCustomerList
});

// Init
(function Constructor() {
    // btnBuyRepair[0].click(); // Don't auto-click, let it default or set 'all'
    // Default is 'all' checked in HTML.

    // ... setup logic ...
    let setTableHeader = function (table) {
        var tableHeader = table.getElementsByTagName("thead")[0];
        if (!tableHeader.rows.length) {
            var tableTr = tableHeader.insertRow(0);
            yearColumns.forEach(function (columnName) {
                var th = document.createElement('th');
                th.innerHTML = columnName;
                tableTr.appendChild(th);
            });
        }
    }

    var customerListTableHeader = customerListTable.getElementsByTagName("thead")[0];
    if (!customerListTableHeader.rows.length) {
        var customerListTableTr = customerListTableHeader.insertRow(0);
        columns.forEach(function (columnName) {
            var th = document.createElement('th');
            th.innerHTML = columnName;
            customerListTableTr.appendChild(th);
        });
    }

    var repairCustomerListTableHeader = repairCustomerListTable.getElementsByTagName("thead")[0];
    if (!repairCustomerListTableHeader.rows.length) {
        var repairCustomerListTableTr = repairCustomerListTableHeader.insertRow(0);
        repairColumns.forEach(function (columnName) {
            var th = document.createElement('th');
            th.innerHTML = columnName;
            repairCustomerListTableTr.appendChild(th);
        });
    }

    setTableHeader(oneWeekTable);
    setTableHeader(threeWeekTable);
    setTableHeader(sevenWeekTable);
    setTableHeader(oneYearTable);
    setTableHeader(twoYearTable);
    setTableHeader(fiveYearTable);

    loadCustomers();
}());

btnNewCustomer.addEventListener('click', e => {
    resetDialog();
    refreshFittingSlots();
    updateCustomerId = "";
    // Reset Profile Picture UI
    let preview = document.getElementById('profilePreview');
    preview.style.display = 'block';
    preview.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cccccc'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
    document.getElementById('profilePictureInput').value = "";
    btnDeleteCustomer.disabled = true;

    // Contextual Open
    let filterType = $("input:radio[name='buyRepair']:checked").val();
    if (filterType == 'repair') {
        // Open Repair Modal
        $('#newRepairCustomerDialog').modal('show');
    } else {
        // Open Standard Customer Modal
        $('#newCustomerDialog').modal('show');
    }
});

/*
btnNewRepairCustomer.addEventListener('click', e => {
    resetDialog();
    updateCustomerId = "";
    btnDeleteCustomer.disabled = true;
});
*/


let getFormObjectFromForm = function (form) {
    return form.find('input').serializeArray().reduce(function (obj, item) {
        obj[item.name] = item.value;
        return obj;
    }, {});
}

// Add/Update Customer
btnAddCustomer.addEventListener('click', async e => {
    if (MOCK_MODE) { alert("Mock 모드에서는 저장/삭제되지 않습니다"); return; }
    var customerData = getFormObjectFromForm(newCustomerForm);
    var emptyMsg = "";
    customerData.hearingAid = [];

    // Updated to iterate over dynamic items
    $(".hearing-aid-item").each(function () {
        var modelInput = $(this).find("input[name='hearingAidModel']");
        var dateInput = $(this).find("input[name='hearingAidPurchaseDate']");

        if (isNull(modelInput.val()) || isNull(dateInput.val())) {
            emptyMsg = "빈 값이 존재합니다";
        }
        customerData.hearingAid.push({
            "side": modelInput.attr("side"),
            "model": modelInput.val(),
            "date": formatDate(dateInput.val())
        });
    });

    customerData.note = newCustomerForm.find('textarea[name="note"]').val();

    if (isNull(customerData.customerName)) {
        emptyMsg = "가입자 성함을 입력해 주세요";
    }

    if (!isNull(emptyMsg)) {
        alert(emptyMsg);
    } else {
        $("#loader h4").text("저장 중...");
        $("#loader").css("display", "flex");
        try {
            var uiCustomer = {
                name: customerData.customerName,
                birthDate: formatDate(customerData.birthDate), // Get birthDate from form
                profilePictureUrl: null, // Will be set after upload
                sex: customerData.customerSex,
                batteryOrderDate: formatDate(customerData.batteryOrderDate),
                cardAvailability: customerData.cardYN,
                cochlearImplant: customerData.cochlearYN,
                workersComp: customerData.workersCompYN,
                address: customerData.address,
                phoneNumber: customerData.phoneNumber,
                mobilePhoneNumber: customerData.mobilePhoneNumber,
                registrationDate: formatDate(customerData.registrationDate),
                fittingTest1: formatDate(customerData.fittingTest1),
                fittingTest2: formatDate(customerData.fittingTest2),
                fittingTest3: formatDate(customerData.fittingTest3),
                fittingTest4: formatDate(customerData.fittingTest4),
                fittingTest5: formatDate(customerData.fittingTest5),
                note: customerData.note
            }

            let dbCustomer = mapCustomerToDb(uiCustomer);
            let cid = updateCustomerId;

            if (isNull(cid)) {
                // New Customer: INSERT first to get ID
                if (typeof uuidv4 !== 'undefined') {
                    cid = uuidv4();
                    dbCustomer.id = cid;
                }

                const { data, error } = await _supabase
                    .from('customers')
                    .insert([dbCustomer])
                    .select();

                if (error) {
                    alert("고객 추가 실패: " + error.message);
                    return;
                }
                if (!cid && data && data.length > 0) cid = data[0].id;
            } else {
                // Update
                const { error } = await _supabase
                    .from('customers')
                    .update(dbCustomer)
                    .eq('id', cid);

                if (error) {
                    alert("고객 수정 실패: " + error.message);
                    return;
                }
                // Delete existing relations to re-insert
                await _supabase.from('hearing_aids').delete().eq('customer_id', cid);
            }

            // Image Upload Logic (Post-Save using ID)
            const profileInput = document.getElementById('profilePictureInput');
            if (profileInput.files && profileInput.files.length > 0) {
                const file = profileInput.files[0];
                const fileName = `${cid}`; // Filename is the Customer ID

                // Firebase Storage Upload
                const storageRef = _storage.ref('customer_profiles/' + fileName);

                try {
                    await storageRef.put(file);
                } catch (error) {
                    console.error("Upload error:", error);
                    alert("이미지 업로드 실패 (고객 정보는 저장됨): " + error.message);
                }
            }

            // Handle Hearing Aids
            if (customerData.hearingAid.length > 0) {
                let haData = customerData.hearingAid.map(ha => ({
                    customer_id: cid,
                    side: ha.side,
                    model: ha.model,
                    date: toDbDate(ha.date)
                }));
                const { error: haError } = await _supabase.from('hearing_aids').insert(haData);
                if (haError) console.error("Error inserting hearing aids:", haError);
            }

            resetUpdateStatus();
            alert("반영완료");
            $("#newCustomerDialog").modal('hide');
            resetDialog();
            await loadCustomers();
        } finally {
            $("#loader").hide();
        }
    }
});

// Add/Update Repair Customer
// This originally targeted a separate `repairRef`. Now we treat it as modifying the `customers` table and `repairs` relation.
// IMPORTANT: If we are "Adding Repair Customer", are we creating a NEW customer or viewing an existing one?
// The original code was `repairRef.push()`.
// This implies it was separate. But now we want integration.
// If the user clicks "New Repair Customer", they probably want to record a repair for a customer?
// But the form asks for Name, Phone, Registration Date.
// If we treat it as "Create/Update Customer + Add Repair", we need to coordinate.
// If it's a new customer, we create customer.
// If it's existing, we update.
// The `repairRef` logic in `updateCustomer` used `repairRef.child(customerId)`.
// It seems the IDs were shared or it was just a separate 'view' of the same data?
// Given `updateRepairCustomer` fetched by `customerId`, it implies the same ID.
// So, "Repair Customer" is just a Customer with a focus on repairs.

btnAddRepairCustomer.addEventListener('click', async e => {
    if (MOCK_MODE) { alert("Mock 모드에서는 저장/삭제되지 않습니다"); return; }
    var customerData = getFormObjectFromForm(newRepairForm);
    var emptyMsg = "";
    customerData.repairList = [];

    $(".repair-report-item").each(function () {
        var dateVal = $(this).find("input[name='repairDate']").val();
        var contentVal = $(this).find("textarea").val();

        customerData.repairList.push({ "date": dateVal, "content": contentVal });
    });

    if (isNull(customerData.customerName)) {
        emptyMsg = "가입자 성함을 입력해 주세요";
    }

    if (!isNull(emptyMsg)) {
        alert(emptyMsg);
    } else {
        $("#loader h4").text("저장 중...");
        $("#loader").css("display", "flex");
        try {
            // Minimal customer info from Repair Form
            var uiCustomer = {
                name: customerData.customerName,
                phoneNumber: customerData.phoneNumber,
                mobilePhoneNumber: customerData.mobilePhoneNumber,
                registrationDate: formatDate(customerData.registrationDate)
            };

            let cid = updateCustomerId;
            let dbCustomer = {};

            // Map available fields
            if (uiCustomer.name) dbCustomer.name = uiCustomer.name;
            if (uiCustomer.phoneNumber) dbCustomer.phone_number = uiCustomer.phoneNumber;
            if (uiCustomer.mobilePhoneNumber) dbCustomer.mobile_phone_number = uiCustomer.mobilePhoneNumber;
            if (uiCustomer.registrationDate) dbCustomer.registration_date = toDbDate(uiCustomer.registrationDate);
            dbCustomer.updated_at = new Date().toISOString(); // Force timestamp update for cache busting

            if (isNull(cid)) {
                // Generate UUID
                cid = uuidv4();
                dbCustomer.id = cid;

                const { data, error } = await _supabase.from('customers').insert(dbCustomer).select();
                if (error) { alert("Error adding customer: " + error.message); return; }
            } else {
                const { error } = await _supabase.from('customers').update(dbCustomer).eq('id', cid);
                if (error) { alert("Error updating customer: " + error.message); return; }

                await _supabase.from('repairs').delete().eq('customer_id', cid);
            }

            // Handle Repairs
            if (customerData.repairList.length > 0) {
                let rData = customerData.repairList.map(r => ({
                    customer_id: cid,
                    date: toDbDate(r.date),
                    content: r.content
                }));
                const { error: rError } = await _supabase.from('repairs').insert(rData);
                if (rError) console.error("Error inserting repairs:", rError);
            }

            resetUpdateStatus();
            alert("반영완료");
            await loadCustomers();
        } finally {
            $("#loader").hide();
        }
    }
});

btnDeleteCustomer.addEventListener('click', async e => {
    if (MOCK_MODE) { alert("Mock 모드에서는 저장/삭제되지 않습니다"); return; }
    var confirmVal = confirm("정말 삭제하시겠습니까?");
    if (confirmVal == true) {
        $("#loader h4").text("삭제 중...");
        $("#loader").css("display", "flex");
        try {
            const { error } = await _supabase.from('customers').delete().eq('id', updateCustomerId);
            if (error) {
                alert("Error deleting: " + error.message);
            } else {
                // Delete from Firebase Storage if exists
                try {
                    await _storage.ref('customer_profiles/' + updateCustomerId).delete();
                    console.log("Profile picture deleted successfully");
                } catch (e) {
                    console.log("Storage object not found or could not be deleted:", e);
                }
                alert("삭제완료");
            }
            await loadCustomers();
        } finally {
            $("#loader").hide();
        }
    }
    resetUpdateStatus();
});

btnDeleteRepairCustomer.addEventListener('click', async e => {
    if (MOCK_MODE) { alert("Mock 모드에서는 저장/삭제되지 않습니다"); return; }
    var confirmVal = confirm("정말 삭제하시겠습니까?");
    if (confirmVal == true) {
        $("#loader h4").text("삭제 중...");
        $("#loader").css("display", "flex");
        try {
            const { error } = await _supabase.from('customers').delete().eq('id', updateCustomerId);
            if (error) {
                alert("Error deleting: " + error.message);
            } else {
                // Delete from Firebase Storage if exists
                try {
                    await _storage.ref('customer_profiles/' + updateCustomerId).delete();
                    console.log("Profile picture deleted successfully");
                } catch (e) {
                    console.log("Storage object not found or could not be deleted:", e);
                }
                alert("삭제완료");
            }
            await loadCustomers();
        } finally {
            $("#loader").hide();
        }
    }
    resetUpdateStatus();
});


// Load into Dialog
let updateCustomer = async function (customerId) {
    $("#loader h4").text("정보 불러오는 중...");
    $("#loader").css("display", "flex");
    try {
        resetDialog();
        // btnNewCustomer.click(); // This is risky if logic changes
        $('#newCustomerDialog').modal('show'); // Open directly
        btnDeleteCustomer.disabled = false;
        updateCustomerId = customerId;

        let c;
        if (MOCK_MODE) {
            // Mock 모드: allCustomers에서 이미 UI 형태로 매핑된 고객을 찾습니다.
            c = allCustomers.find(cust => cust.id === customerId);
            if (!c) { console.error("Mock customer not found:", customerId); return; }
        } else {
            // We can fetch fresh or find in loaded list. Let's fetch fresh for safety.
            const { data, error } = await _supabase.from('customers').select('*, hearing_aids(*), repairs(*)').eq('id', customerId).single();
            if (error) { console.error(error); return; }
            c = mapCustomerFromDb(data);
        }

        newCustomerForm.find("input[name='customerName']").val(c.name);

        // Profile Picture Preview
        // Profile Picture Preview (Update Mode)
        // Try to load from standard URL
        let profileUrl = `https://firebasestorage.googleapis.com/v0/b/${_storageBucketName}/o/customer_profiles%2F${c.id}?alt=media&t=${c.updatedAt ? new Date(c.updatedAt).getTime() : ''}`;
        // We need to check if it exists? Image onerror can handle display.
        let preview = document.getElementById('profilePreview');
        preview.style.display = 'block';
        preview.src = profileUrl;
        preview.onerror = function () {
            // On error (404), show placeholder
            this.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cccccc'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
            // Reset handler to prevent infinite loop if placeholder fails (unlikely for data uri)
            this.onerror = null;
        };
        document.getElementById('profilePictureInput').value = ""; // Clear input so new files can be selected

        // newCustomerForm.find("input[name='customerAge']").val(c.age); // Removed age input
        // Set birthDate if exists
        if (c.birthDate) {
            // UI expects YYYY-MM-DD for date input? 
            // toDbDate converts YYYY/MM/DD to YYYY-MM-DD which works for <input type="date"> value
            newCustomerForm.find("input[name='birthDate']").val(toDbDate(c.birthDate));
        }
        let customerSexRadio = newCustomerForm.find("input:radio[name='customerSex']");
        if (c.sex == "Male") customerSexRadio[0].checked = true;
        else if (c.sex == "Female") customerSexRadio[1].checked = true;
        else customerSexRadio[0].checked = true;

        if (c.hearingAid) {
            c.hearingAid.forEach(function (ha) {
                var aidContent = $(addEarAid(ha.side));
                aidContent.find("input[name='hearingAidModel']").val(ha.model);
                aidContent.find("input[name='hearingAidPurchaseDate']").val(toDbDate(ha.date));
            });
        }
        newCustomerForm.find("input[name='batteryOrderDate']").val(toDbDate(c.batteryOrderDate));
        let cardAvailabilityRadio = newCustomerForm.find("input:radio[name='cardYN']");
        c.cardAvailability == "Yes" ? cardAvailabilityRadio[0].checked = true : cardAvailabilityRadio[1].checked = true;

        let cochlearRadio = newCustomerForm.find("input:radio[name='cochlearYN']");
        c.cochlearImplant == "Yes" ? cochlearRadio[0].checked = true : cochlearRadio[1].checked = true;

        let workersCompRadio = newCustomerForm.find("input:radio[name='workersCompYN']");
        c.workersComp == "Yes" ? workersCompRadio[0].checked = true : workersCompRadio[1].checked = true;

        newCustomerForm.find("input[name='address']").val(c.address);
        newCustomerForm.find("input[name='phoneNumber']").val(c.phoneNumber);
        newCustomerForm.find("input[name='mobilePhoneNumber']").val(c.mobilePhoneNumber);
        newCustomerForm.find("input[name='registrationDate']").val(toDbDate(c.registrationDate));
        newCustomerForm.find("input[name='fittingTest1']").val(toDbDate(c.fittingTest1));
        newCustomerForm.find("input[name='fittingTest2']").val(toDbDate(c.fittingTest2));
        newCustomerForm.find("input[name='fittingTest3']").val(toDbDate(c.fittingTest3));
        newCustomerForm.find("input[name='fittingTest4']").val(toDbDate(c.fittingTest4));
        newCustomerForm.find("input[name='fittingTest5']").val(toDbDate(c.fittingTest5));
        newCustomerForm.find("textarea[name='note']").val(c.note);
        refreshFittingSlots();
    } finally {
        $("#loader").hide();
    }
}

let updateRepairCustomer = async function (customerId) {
    $("#loader h4").text("정보 불러오는 중...");
    $("#loader").css("display", "flex");
    try {
        resetDialog();
        // btnNewRepairCustomer.click(); // Removed button
        $('#newRepairCustomerDialog').modal('show'); // Open directly
        // Also enable delete button for repair customer? 
        // Usually btnDeleteCustomer targets the main customer. 
        // btnDeleteRepairCustomer targets repair customer.
        // We should enable the right one.
        if (document.getElementById("btnDeleteRepairCustomer")) document.getElementById("btnDeleteRepairCustomer").disabled = false;
        updateCustomerId = customerId;

        let c;
        if (MOCK_MODE) {
            // Mock 모드: allCustomers에서 이미 UI 형태로 매핑된 고객을 찾습니다.
            c = allCustomers.find(cust => cust.id === customerId);
            if (!c) { console.error("Mock customer not found:", customerId); return; }
        } else {
            const { data, error } = await _supabase.from('customers').select('*, hearing_aids(*), repairs(*)').eq('id', customerId).single();
            if (error) { console.error(error); return; }
            c = mapCustomerFromDb(data);
        }

        newRepairForm.find("input[name='customerName']").val(c.name);
        newRepairForm.find("input[name='phoneNumber']").val(c.phoneNumber);
        newRepairForm.find("input[name='mobilePhoneNumber']").val(c.mobilePhoneNumber);
        newRepairForm.find("input[name='registrationDate']").val(toDbDate(c.registrationDate));

        if (c.repairReport) {
            c.repairReport.forEach(function (r) {
                var repairReportContent = $(addNewRepairReport());
                repairReportContent.find("input[name='repairDate']").val(toDbDate(r.date));
                repairReportContent.find("textarea").val(r.content);
            });
        }
    } finally {
        $("#loader").hide();
    }
}

// ══ 고객 상세 보기 (read-only) ═══════════════════════════════════════
// 고객 클릭 시 수정 폼 대신 파생 정보가 정리된 상세 화면을 먼저 보여줍니다.
// "정보 수정" / "관리" 버튼으로 기존 수정 폼(updateCustomer 등)에 진입합니다.
let detailCustomerId = "";

let showCustomerDetail = async function (customerId) {
    $("#loader h4").text("정보 불러오는 중...");
    $("#loader").css("display", "flex");
    try {
        let c;
        if (MOCK_MODE) {
            c = allCustomers.find(cust => cust.id === customerId);
            if (!c) { console.error("Mock customer not found:", customerId); return; }
        } else {
            const { data, error } = await _supabase.from('customers').select('*, hearing_aids(*), repairs(*)').eq('id', customerId).single();
            if (error) { console.error(error); return; }
            c = mapCustomerFromDb(data);
        }
        renderCustomerDetail(c);
        $('#customerDetailDialog').modal('show');
    } finally {
        $("#loader").hide();
    }
}

// 상세 → 수정 폼 (상세 모달이 완전히 닫힌 뒤 열어 backdrop 중첩 방지)
function editFromDetail() {
    let id = detailCustomerId;
    $('#customerDetailDialog').one('hidden.bs.modal', function () {
        updateCustomer(id);
    });
    $('#customerDetailDialog').modal('hide');
}

// 상세 → 수리 이력 관리 폼
function repairFromDetail() {
    let id = detailCustomerId;
    $('#customerDetailDialog').one('hidden.bs.modal', function () {
        updateRepairCustomer(id);
    });
    $('#customerDetailDialog').modal('hide');
}

// 데이터가 있는 섹션만 렌더링합니다 (빈 섹션은 표시하지 않음).
function renderCustomerDetail(c) {
    detailCustomerId = c.id;
    let html = '';

    let card = function (title, inner, headerExtra) {
        return '<div class="detail-card"><div class="detail-card-header">'
            + '<span class="detail-card-title">' + title + '</span>'
            + (headerExtra || '')
            + '</div>' + inner + '</div>';
    };

    // 1. Identity header
    let profileUrl = `https://firebasestorage.googleapis.com/v0/b/${_storageBucketName}/o/customer_profiles%2F${c.id}?alt=media&t=${c.updatedAt ? new Date(c.updatedAt).getTime() : ''}`;
    let av = avatarColorFor(c.name);
    let initial = escapeHtml([...(c.name || '')][0] || '?');

    let sub = [];
    let age = koreanAge(c.birthDate);
    if (age != null) sub.push('만 ' + age + '세');
    if (c.sex === 'Male') sub.push('남');
    else if (c.sex === 'Female') sub.push('여');
    if (!isNull(c.registrationDate)) {
        let regYear = String(c.registrationDate).split('/')[0];
        if (regYear && regYear.length === 4) sub.push('가입 ' + regYear + '년');
    }

    let chips = '';
    if (c.cardAvailability === 'Yes') chips += '<span class="detail-chip chip-blue">복지카드</span>';
    if (c.cochlearImplant === 'Yes') chips += '<span class="detail-chip chip-violet">인공와우</span>';
    if (c.workersComp === 'Yes') chips += '<span class="detail-chip chip-orange">산재보험</span>';

    html += '<div class="detail-identity">'
        + '<div class="detail-avatar">'
        + '<img src="' + profileUrl + '" loading="lazy" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\';" />'
        + '<div class="detail-avatar-fallback" style="display:none; background-color:' + av.bg + '; color:' + av.fg + ';">' + initial + '</div>'
        + '</div>'
        + '<div class="detail-identity-text">'
        + '<div class="detail-name">' + escapeHtml(c.name) + '</div>'
        + (sub.length ? '<div class="detail-subline">' + sub.join(' · ') + '</div>' : '')
        + (chips ? '<div class="detail-chips">' + chips + '</div>' : '')
        + '</div></div>';

    // 2. Status banner (최대 1개, 앰버)
    let banner = '';
    if (!isNull(c.fittingTest1)) {
        let first = new Date(c.fittingTest1);
        let fiveYearsAgo = new Date();
        fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
        if (!isNaN(first.getTime()) && first < fiveYearsAgo) {
            banner = '1차 적합검사 후 ' + elapsedText(c.fittingTest1) + ' 경과했습니다';
        }
    }
    let allFittings = [c.fittingTest1, c.fittingTest2, c.fittingTest3, c.fittingTest4, c.fittingTest5]
        .filter(d => !isNull(d)).map(d => new Date(d)).filter(d => !isNaN(d.getTime()));
    let latestFitting = allFittings.length ? new Date(Math.max.apply(null, allFittings)) : null;
    if (!banner && latestFitting) {
        let oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        if (latestFitting < oneYearAgo) {
            banner = '마지막 적합검사 후 ' + elapsedText(latestFitting) + ' 경과 — 재검사가 필요합니다';
        }
    }
    if (banner) {
        html += '<div class="detail-banner"><i class="fa fa-exclamation-circle"></i><span>' + banner + '</span></div>';
    }

    // 3. 연락처
    let telRow = function (icon, label, number) {
        return '<a class="detail-row detail-row-link" href="tel:' + encodeURIComponent(number) + '">'
            + '<i class="fa ' + icon + ' detail-row-icon"></i>'
            + '<div class="detail-row-main">'
            + '<div class="detail-row-label">' + label + '</div>'
            + '<div class="detail-row-value">' + escapeHtml(number) + '</div>'
            + '</div>'
            + '<i class="fa fa-phone detail-row-action"></i>'
            + '</a>';
    };
    let contactRows = '';
    if (!isNull(c.mobilePhoneNumber)) contactRows += telRow('fa-mobile', '핸드폰', c.mobilePhoneNumber);
    if (!isNull(c.phoneNumber)) contactRows += telRow('fa-phone', '집전화', c.phoneNumber);
    if (!isNull(c.address)) {
        contactRows += '<div class="detail-row">'
            + '<i class="fa fa-map-marker detail-row-icon"></i>'
            + '<div class="detail-row-main">'
            + '<div class="detail-row-label">주소</div>'
            + '<div class="detail-row-value">' + escapeHtml(c.address) + '</div>'
            + '</div></div>';
    }
    if (contactRows) html += card('연락처', contactRows);

    // 4. 보청기
    let aidRows = '';
    if (c.hearingAid && c.hearingAid.length > 0) {
        c.hearingAid.forEach(function (ha) {
            let side_ko = ha.side === 'left' ? '좌측' : '우측';
            let cls = ha.side === 'left' ? 'left' : 'right';
            let subParts = [];
            if (!isNull(ha.date)) {
                subParts.push(escapeHtml(ha.date) + ' 구입');
                let used = elapsedText(ha.date);
                if (used) subParts.push(used + ' 사용');
            }
            aidRows += '<div class="detail-row">'
                + '<span class="ha-badge ' + cls + '">' + side_ko + '</span>'
                + '<div class="detail-row-main">'
                + '<div class="detail-row-value">' + escapeHtml(ha.model || '-') + '</div>'
                + (subParts.length ? '<div class="detail-row-sub">' + subParts.join(' · ') + '</div>' : '')
                + '</div></div>';
        });
    }
    if (!isNull(c.batteryOrderDate)) {
        let ago = elapsedText(c.batteryOrderDate);
        aidRows += '<div class="detail-row">'
            + '<i class="fa fa-battery-half detail-row-icon"></i>'
            + '<div class="detail-row-main">'
            + '<div class="detail-row-label">배터리 구입</div>'
            + '<div class="detail-row-value">' + escapeHtml(c.batteryOrderDate)
            + (ago ? ' <span class="detail-muted">· ' + ago + ' 전</span>' : '')
            + '</div></div></div>';
    }
    if (aidRows) html += card('보청기', aidRows);

    // 5. 적합검사 (기록된 차수만, 최신 검사 강조)
    let tests = [];
    [c.fittingTest1, c.fittingTest2, c.fittingTest3, c.fittingTest4, c.fittingTest5].forEach(function (d, i) {
        if (!isNull(d)) {
            let dd = new Date(d);
            if (!isNaN(dd.getTime())) tests.push({ n: i + 1, dateStr: d, d: dd });
        }
    });
    if (tests.length > 0) {
        let latest = tests.reduce((a, b) => (a.d > b.d ? a : b));
        let oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        let ok = latest.d >= oneYearAgo;
        let statusLine = '<div class="detail-status ' + (ok ? 'ok' : 'due') + '"><span class="status-dot"></span>'
            + (ok ? '최근 1년 내 검사 완료'
                : '재검사 필요 · 마지막 검사 후 ' + elapsedText(latest.d) + ' 경과')
            + '</div>';
        let list = '';
        tests.forEach(function (t) {
            let ago = elapsedText(t.d);
            list += '<div class="detail-test-row' + (t === latest ? ' latest' : '') + '">'
                + t.n + '차 · ' + escapeHtml(t.dateStr) + (ago ? ' · ' + ago + ' 전' : '')
                + '</div>';
        });
        html += card('적합검사', statusLine + list);
    }

    // 6. 수리 이력 (최신순)
    if (c.repairReport && c.repairReport.length > 0) {
        let repairs = c.repairReport.slice().sort(function (a, b) {
            return new Date(b.date) - new Date(a.date);
        });
        let rows = '';
        repairs.forEach(function (r) {
            rows += '<div class="detail-repair-row">'
                + '<span class="detail-repair-date">' + escapeHtml(r.date || '') + '</span>'
                + '<span class="detail-repair-content">' + escapeHtml(r.content || '') + '</span>'
                + '</div>';
        });
        html += card('수리 이력', rows,
            '<button type="button" class="btn detail-manage-btn" onclick="repairFromDetail()">관리</button>');
    }

    // 7. 메모
    if (!isNull(c.note)) {
        html += card('메모', '<div class="detail-note">' + escapeHtml(c.note) + '</div>');
    }

    document.getElementById('customerDetailBody').innerHTML = html;
}

// ══ 수정 폼: 적합검사 슬롯 점진 노출 ════════════════════════════════
// 값이 있는 차수 + 첫 빈 슬롯만 보여주고 "+ 추가"로 확장합니다 (최대 5).
// input name은 그대로라 저장 로직은 영향받지 않습니다.
function refreshFittingSlots() {
    let lastFilled = 0;
    for (let i = 1; i <= 5; i++) {
        if (!isNull(newCustomerForm.find("input[name='fittingTest" + i + "']").val())) lastFilled = i;
    }
    let visible = Math.min(lastFilled + 1, 5);
    for (let i = 1; i <= 5; i++) {
        let item = newCustomerForm.find("input[name='fittingTest" + i + "']").closest('.fitting-item');
        item.toggle(i <= visible);
    }
    $('#btnAddFittingSlot').toggle(visible < 5);
}

function addFittingSlot() {
    let hiddenItems = newCustomerForm.find('.fitting-item').filter(function () {
        return this.style.display === 'none';
    });
    if (hiddenItems.length > 0) $(hiddenItems[0]).show();
    if (hiddenItems.length <= 1) $('#btnAddFittingSlot').hide();
}

// UI Helpers
let deleteDynamicItem = function (btn) {
    $(btn).closest('.dynamic-item').remove();
}

let addEarAid = function (side) {
    let side_ko = side == "left" ? "좌측" : "우측";
    let badge_cls = side == "left" ? "left" : "right";

    let html = `
    <div class="dynamic-item ha-compact-item hearing-aid-item">
        <span class="ha-badge ${badge_cls}">${side_ko}</span>
        <input class="ha-input-date" type="date" name="hearingAidPurchaseDate" value="${currentDbDate}" side="${side}" style="width:100px;"/>
        <input class="ha-input-model" type="text" name="hearingAidModel" placeholder="모델명" side="${side}"/>
        <i class="fa fa-times btn-remove-mini" onclick="deleteDynamicItem(this)"></i>
    </div>`;

    $("#hearingAidList").append(html);
    return $("#hearingAidList").children().last();
}

let addNewRepairReport = function () {
    let html = `
    <div class="dynamic-item repair-report-item modal-form-grid">
        <div class="form-group" style="width:140px;">
            <label>수리일</label>
            <input type="date" name="repairDate" class="form-control" value="${currentDbDate}"/>
        </div>
        <div class="form-group" style="flex:1; margin-top:0;">
            <label>수리내역</label>
            <textarea rows="1" class="form-control"></textarea>
        </div>
        <div class="form-group" style="width:30px; justify-content:flex-end; padding-bottom:1px;">
             <label style="opacity:0">삭제</label>
             <button class="btn btn-default btn-grid-close" onclick="deleteDynamicItem(this)">X</button>
        </div>
    </div>`;

    $("#repairReportListContainer").append(html);
    return $("#repairReportListContainer").children().last();
}

let resetDialog = function () {
    $(".dynamic-item").remove();

    $.each($('.modal-body input, .modal-body textarea'), function (index, inputTag) {
        if (inputTag.name == "customerSex" || inputTag.name == "cardYN" || inputTag.name == "cochlearYN" || inputTag.name == "workersCompYN") {
            if (inputTag.value == "Male") inputTag.checked = true;
            if (inputTag.value == "Female") inputTag.checked = false;
            if (inputTag.value == "Yes") inputTag.checked = (inputTag.name == "cardYN"); // Default cardYN to Yes, others to No
            if (inputTag.value == "No") inputTag.checked = (inputTag.name != "cardYN");
        } else if (inputTag.name == "hearingAidPurchaseDate" || inputTag.name == "batteryOrderDate" || inputTag.name == "registrationDate" || inputTag.name == "birthDate") {
            inputTag.value = currentDbDate;
        } else {
            inputTag.value = "";
        }
    });
}

let resetUpdateStatus = function () {
    btnCancelNewCustomer.click();
    btnCancelRepairCustomer.click();
    updateCustomerId = "";
}

// Logout
btnLogOut.addEventListener('click', async e => {
    const { error } = await _supabase.auth.signOut();
    if (error) console.log(error);
    location.replace("/html/Login.html");
});

// Bootstrap 3 hardening: hiding one modal while another is already open
// (실적 → 고객 클릭) removes `modal-open` from <body> after the 300ms
// fade-out, which kills modal scrolling. Restore it if a modal is still open.
$(document).on('hidden.bs.modal', '.modal', function () {
    if (document.querySelector('.modal.in')) document.body.classList.add('modal-open');
});

// Profile Picture Preview Listener
if (document.getElementById('profilePictureInput')) {
    document.getElementById('profilePictureInput').addEventListener('change', function (e) {
        if (e.target.files && e.target.files[0]) {
            let reader = new FileReader();
            reader.onload = function (e) {
                let preview = document.getElementById('profilePreview');
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
            reader.readAsDataURL(e.target.files[0]);
        }
    });
}

// Sales Statistics Logic
let currentStatsView = 'yearly';
let selectedStatsYear = null;
let selectedStatsMonth = null;
let salesChart = null;

if (btnSalesStats) {
    btnSalesStats.addEventListener('click', () => {
        renderSalesStatsYearly();
        $('#salesStatisticsDialog').modal('show');
    });
}

const btnBackStats = document.getElementById('btnBackStats');
if (btnBackStats) {
    btnBackStats.addEventListener('click', () => {
        if (currentStatsView === 'monthly') {
            renderSalesStatsYearly();
        } else if (currentStatsView === 'customers') {
            renderSalesStatsMonthly(selectedStatsYear);
        }
    });
}

function updateStatsHeader(title, showBack) {
    $('#salesStatsTitle').text(title);
    if (showBack) $('#btnBackStats').show();
    else $('#btnBackStats').hide();
}

async function fetchAllHearingAids(filterGte = null, filterLt = null) {
    let allAids = [];
    let from = 0;
    let to = 999;
    let keepFetching = true;

    while (keepFetching) {
        let query = _supabase
            .from('hearing_aids')
            .select(`
                date,
                side,
                model,
                customers (
                    id,
                    name,
                    phone_number,
                    mobile_phone_number
                )
            `)
            .order('date', { ascending: false })
            .range(from, to);

        if (filterGte) query = query.gte('date', filterGte);
        if (filterLt) query = query.lt('date', filterLt);

        const { data, error } = await query;

        if (error) {
            console.error("Error fetching hearing aids:", error);
            throw error;
        }

        if (data.length === 0) {
            keepFetching = false;
        } else {
            allAids = allAids.concat(data);
            if (data.length < 1000) {
                keepFetching = false;
            } else {
                from += 1000;
                to += 1000;
            }
        }
    }
    return allAids;
}

async function renderSalesStatsYearly() {
    currentStatsView = 'yearly';
    updateStatsHeader('년도별 판매 실적 (개수)', false);
    $('#salesChartContainer').hide();
    $('#salesStatsContainer').show();

    $("#loader h4").text("실적 집계 중...");
    $("#loader").css("display", "flex");

    try {
        const hearingAids = await fetchAllHearingAids();

        const stats = {};
        hearingAids.forEach(ha => {
            if (ha.date) {
                const year = ha.date.split('-')[0];
                if (year && year.length === 4) {
                    stats[year] = (stats[year] || 0) + 1;
                }
            }
        });

        const sortedYears = Object.keys(stats).sort((a, b) => b - a);
        const tbody = $('#salesStatisticsTable tbody');
        const thead = $('#salesStatisticsTable thead');

        thead.empty().append('<tr><th style="text-align: center;">년도</th><th style="text-align: center;">판매 개수</th></tr>');
        tbody.empty();

        if (sortedYears.length === 0) {
            tbody.append('<tr><td colspan="2">데이터가 없습니다.</td></tr>');
        } else {
            sortedYears.forEach(year => {
                const row = $(`
                    <tr style="cursor: pointer;">
                        <td style="padding: 12px;">${year}년</td>
                        <td style="padding: 12px; font-weight: bold; color: var(--primary-color);">${stats[year]}개</td>
                    </tr>
                `);
                row.click(() => renderSalesStatsMonthly(year));
                tbody.append(row);
            });
        }
    } catch (error) {
        console.error('Error fetching stats:', error);
        alert('실적을 불러오는 중 오류가 발생했습니다: ' + error.message);
    } finally {
        $("#loader").hide();
    }
}

async function renderSalesStatsMonthly(year) {
    currentStatsView = 'monthly';
    selectedStatsYear = year;
    updateStatsHeader(`${year}년 월별 실적 (개수)`, true);

    $("#loader h4").text("월별 실적 집계 중...");
    $("#loader").css("display", "flex");

    try {
        const hearingAids = await fetchAllHearingAids(`${year}-01-01`, `${parseInt(year) + 1}-01-01`);

        $('#salesChartContainer').show();
        $('#salesStatsContainer').hide(); // Hide table in monthly view as requested
        const stats = {};
        for (let i = 1; i <= 12; i++) {
            stats[i] = 0;
        }

        hearingAids.forEach(ha => {
            if (ha.date) {
                const month = parseInt(ha.date.split('-')[1]);
                if (month >= 1 && month <= 12) {
                    stats[month]++;
                }
            }
        });

        const tbody = $('#salesStatisticsTable tbody');
        const thead = $('#salesStatisticsTable thead');

        thead.empty().append('<tr><th style="text-align: center;">월</th><th style="text-align: center;">판매 개수</th></tr>');
        tbody.empty();

        const chartLabels = [];
        const chartData = [];

        for (let month = 1; month <= 12; month++) {
            chartLabels.push(`${month}월`);
            chartData.push(stats[month]);
        }

        renderMonthlySalesChart(year, chartLabels, chartData);
        $('#salesChartContainer').show();

        for (let month = 12; month >= 1; month--) {
            if (stats[month] > 0) {
                const row = $(`
                    <tr style="cursor: pointer;">
                        <td style="padding: 12px;">${month}월</td>
                        <td style="padding: 12px; font-weight: bold; color: var(--primary-color);">${stats[month]}개</td>
                    </tr>
                `);
                row.click(() => renderSalesStatsCustomers(year, month));
                tbody.append(row);
            }
        }
    } catch (error) {
        console.error('Error fetching monthly stats:', error);
    } finally {
        $("#loader").hide();
    }
}

async function renderSalesStatsCustomers(year, month) {
    currentStatsView = 'customers';
    selectedStatsMonth = month;
    const formattedMonth = month < 10 ? '0' + month : month;
    $('#salesChartContainer').hide();
    $('#salesStatsContainer').show();

    let nextYear = year;
    let nextMonth = month + 1;
    if (nextMonth > 12) {
        nextMonth = 1;
        nextYear = parseInt(year) + 1;
    }
    const formattedNextMonth = nextMonth < 10 ? '0' + nextMonth : nextMonth;

    updateStatsHeader(`${year}년 ${month}월 구매 고객`, true);

    $("#loader h4").text("고객 리스트 불러오는 중...");
    $("#loader").css("display", "flex");

    try {
        const hearingAids = await fetchAllHearingAids(`${year}-${formattedMonth}-01`, `${nextYear}-${formattedNextMonth}-01`);

        const tbody = $('#salesStatisticsTable tbody');
        const thead = $('#salesStatisticsTable thead');

        thead.empty().append('<tr><th style="text-align: center;">이름</th><th style="text-align: center;">구분</th><th style="text-align: center;">모델명</th><th style="text-align: center;">날짜</th></tr>');
        tbody.empty();

        if (!hearingAids || hearingAids.length === 0) {
            tbody.append('<tr><td colspan="4">데이터가 없습니다.</td></tr>');
        } else {
            // Sort by date descending
            hearingAids.sort((a, b) => new Date(b.date) - new Date(a.date));

            hearingAids.forEach(item => {
                const customer = item.customers;
                if (!customer) return;

                const sideKo = item.side === 'left' ? '좌' : '우';
                const badgeCls = item.side === 'left' ? 'left' : 'right';

                const row = $(`
                    <tr style="cursor: pointer;">
                        <td style="padding: 12px;">${escapeHtml(customer.name)}</td>
                        <td style="padding: 12px; text-align: center;">
                            <span class="ha-badge ${badgeCls}" style="width: 25px; padding: 2px 4px; font-size: 0.7rem;">${sideKo}</span>
                        </td>
                        <td style="padding: 12px; font-size: 0.9rem;">${item.model ? escapeHtml(item.model) : '-'}</td>
                        <td style="padding: 12px; font-size: 0.9rem;">${escapeHtml(formatDate(item.date))}</td>
                    </tr>
                `);
                row.click(() => {
                    $('#salesStatisticsDialog').modal('hide');
                    showCustomerDetail(customer.id);
                });
                tbody.append(row);
            });
        }
    } finally {
        $("#loader").hide();
    }
}

function renderMonthlySalesChart(year, labels, data) {
    const ctx = document.getElementById('salesMonthlyChart').getContext('2d');

    if (salesChart) {
        salesChart.destroy();
    }

    salesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '판매 개수',
                data: data,
                backgroundColor: 'rgba(37, 99, 235, 0.7)',
                borderColor: 'rgba(37, 99, 235, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const month = index + 1;
                    renderSalesStatsCustomers(year, month);
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return context.raw + '개';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grace: '10%', // Add padding at the top to prevent label clipping
                    ticks: {
                        stepSize: 1,
                        font: {
                            size: 14
                        }
                    },
                    grid: {
                        display: true,
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        },
        plugins: [{
            id: 'datalabels',
            afterDraw: (chart) => {
                const { ctx, data } = chart;
                ctx.save();
                ctx.fillStyle = '#1f2937';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.font = 'bold 14px Inter';

                chart.data.datasets.forEach((dataset, i) => {
                    chart.getDatasetMeta(i).data.forEach((bar, index) => {
                        const val = dataset.data[index];
                        if (val > 0) {
                            ctx.fillText(val, bar.x, bar.y - 5);
                        }
                    });
                });
                ctx.restore();
            }
        }]
    });
}

// ============================================================
// Mock Data (?mock=1) — UI 형태(mapCustomerFromDb 결과)로 직접 생성
// 날짜는 페이지 로드 시점(new Date())을 기준으로 계산되어 모든 버킷이 채워집니다.
// ============================================================
function getMockCustomers() {
    // n일 전 날짜를 "YYYY/MM/DD"로 반환
    function daysAgo(n) {
        let d = new Date();
        d.setDate(d.getDate() - n);
        return convertDate(d, '/');
    }
    // n년 전 날짜를 "YYYY/MM/DD"로 반환 (같은 월 유지)
    function yearsAgo(n) {
        let d = new Date();
        d.setFullYear(d.getFullYear() - n);
        return convertDate(d, '/');
    }
    // 기본값 + override 로 목 고객 생성
    function mock(overrides) {
        return Object.assign({
            key: "",
            id: "",
            name: "",
            birthDate: "",
            age: "",
            sex: "Male",
            batteryOrderDate: "",
            cardAvailability: "No",
            cochlearImplant: "No",
            workersComp: "No",
            address: "",
            phoneNumber: "",
            mobilePhoneNumber: "",
            registrationDate: "",
            fittingTest1: "",
            fittingTest2: "",
            fittingTest3: "",
            fittingTest4: "",
            fittingTest5: "",
            note: "",
            hearingAid: [],
            repairReport: [],
            updatedAt: ""
        }, overrides);
    }

    return [
        // 1주차 버킷 (구입일 5일 전) x2
        mock({
            key: "mock-0001", id: "mock-0001", name: "김민수", birthDate: "1955/03/12", sex: "Male",
            cardAvailability: "Yes", address: "서울시 강남구 테헤란로 123",
            phoneNumber: "02-345-6789", mobilePhoneNumber: "010-1234-5678",
            registrationDate: yearsAgo(1), fittingTest1: daysAgo(30),
            hearingAid: [{ side: "left", model: "Genesis AI 24", date: daysAgo(5) }]
        }),
        mock({
            key: "mock-0002", id: "mock-0002", name: "이영희", birthDate: "1948/07/25", sex: "Female",
            address: "부산시 해운대구 우동 456",
            phoneNumber: "051-555-1212", mobilePhoneNumber: "010-2345-6789",
            registrationDate: daysAgo(6), note: "양측 착용, 적응 잘함",
            hearingAid: [
                { side: "left", model: "Evolv AI 1200", date: daysAgo(5) },
                { side: "right", model: "Evolv AI 1200", date: daysAgo(5) }
            ]
        }),

        // 3주차 버킷 (구입일 19일 전)
        mock({
            key: "mock-0003", id: "mock-0003", name: "박철수", birthDate: "1962/11/03", sex: "Male",
            address: "대구시 수성구 범어동 789",
            phoneNumber: "053-777-8888", mobilePhoneNumber: "010-3456-7890",
            registrationDate: daysAgo(20), fittingTest1: daysAgo(18),
            hearingAid: [{ side: "right", model: "Livio Edge AI", date: daysAgo(19) }]
        }),

        // 7주차 버킷 (구입일 47일 전)
        mock({
            key: "mock-0004", id: "mock-0004", name: "정순자", birthDate: "1951/02/14", sex: "Female",
            cardAvailability: "Yes", address: "인천시 남동구 구월동 12",
            phoneNumber: "032-411-2233", mobilePhoneNumber: "010-4567-8901",
            registrationDate: daysAgo(50), fittingTest1: daysAgo(46),
            hearingAid: [{ side: "left", model: "Genesis AI 16", date: daysAgo(47) }]
        }),

        // 1년차 버킷 (구입일 1년 전, 같은 달)
        mock({
            key: "mock-0005", id: "mock-0005", name: "최동욱", birthDate: "1959/09/09", sex: "Male",
            address: "광주시 서구 화정동 34",
            phoneNumber: "062-222-3344", mobilePhoneNumber: "010-5678-9012",
            registrationDate: yearsAgo(1), fittingTest1: daysAgo(60),
            hearingAid: [
                { side: "left", model: "Evolv AI 2400", date: yearsAgo(1) },
                { side: "right", model: "Evolv AI 2400", date: yearsAgo(1) }
            ]
        }),

        // 2년차 버킷 (구입일 2년 전, 같은 달)
        mock({
            key: "mock-0006", id: "mock-0006", name: "강미경", birthDate: "1966/05/18", sex: "Female",
            cardAvailability: "Yes", address: "대전시 유성구 봉명동 56",
            phoneNumber: "042-611-7788", mobilePhoneNumber: "010-6789-0123",
            registrationDate: yearsAgo(2), fittingTest1: daysAgo(90),
            hearingAid: [{ side: "left", model: "Muse iQ", date: yearsAgo(2) }]
        }),

        // 5년차 버킷 (구입일 5년 전, 같은 달)
        mock({
            key: "mock-0007", id: "mock-0007", name: "윤재호", birthDate: "1944/12/30", sex: "Male",
            cochlearImplant: "Yes", address: "경기도 성남시 분당구 정자동 78",
            phoneNumber: "031-711-9900", mobilePhoneNumber: "010-7890-1234",
            registrationDate: yearsAgo(5), fittingTest1: daysAgo(120),
            hearingAid: [{ side: "right", model: "Halo iQ", date: yearsAgo(5) }]
        }),

        // 적합검사 1년 도래 버킷 (최근 적합검사가 1년 초과) x2
        mock({
            key: "mock-0008", id: "mock-0008", name: "임선영", birthDate: "1953/08/08", sex: "Female",
            address: "서울시 종로구 세종대로 90",
            phoneNumber: "02-733-1010", mobilePhoneNumber: "010-8901-2345",
            registrationDate: yearsAgo(3), fittingTest1: daysAgo(550),
            hearingAid: [{ side: "left", model: "Genesis AI 24", date: yearsAgo(3) }]
        }),
        mock({
            key: "mock-0009", id: "mock-0009", name: "한지훈", birthDate: "1970/01/21", sex: "Male",
            address: "서울시 마포구 월드컵로 21",
            phoneNumber: "02-333-4545", mobilePhoneNumber: "010-9012-3456",
            registrationDate: yearsAgo(4), fittingTest1: daysAgo(500), fittingTest2: daysAgo(400),
            hearingAid: [
                { side: "left", model: "Livio AI", date: yearsAgo(4) },
                { side: "right", model: "Livio AI", date: yearsAgo(4) }
            ]
        }),

        // 1차 적합검사 5년 경과 버킷 x3 (다른 버킷과 겹칠 수 있음 - 현실적)
        mock({
            key: "mock-0010", id: "mock-0010", name: "오현주", birthDate: "1949/04/04", sex: "Female",
            cardAvailability: "Yes", address: "경기도 수원시 팔달구 인계동 43",
            phoneNumber: "031-255-6677", mobilePhoneNumber: "010-1010-2020",
            registrationDate: yearsAgo(6), fittingTest1: daysAgo(2008),
            hearingAid: [{ side: "left", model: "Genesis AI 24", date: yearsAgo(6) }]
        }),
        mock({
            key: "mock-0011", id: "mock-0011", name: "서광호", birthDate: "1958/06/16", sex: "Male",
            address: "서울시 송파구 올림픽로 65",
            phoneNumber: "02-421-8080", mobilePhoneNumber: "010-3030-4040",
            registrationDate: yearsAgo(6), fittingTest1: yearsAgo(6),
            hearingAid: [{ side: "right", model: "Evolv AI 1200", date: yearsAgo(6) }]
        }),
        mock({
            key: "mock-0012", id: "mock-0012", name: "남기석", birthDate: "1941/10/10", sex: "Male",
            workersComp: "Yes", address: "부산시 부산진구 부전동 87",
            phoneNumber: "051-808-9090", mobilePhoneNumber: "010-5050-6060",
            registrationDate: yearsAgo(8), fittingTest1: yearsAgo(8),
            hearingAid: [{ side: "left", model: "Muse iQ", date: yearsAgo(8) }]
        }),

        // 수리 전용 고객 x2 (보청기 없음)
        // 집전화만 있고 핸드폰 없음
        mock({
            key: "mock-0013", id: "mock-0013", name: "배정미", birthDate: "1960/03/30", sex: "Female",
            address: "서울시 노원구 상계동 9",
            phoneNumber: "02-950-1234", mobilePhoneNumber: "",
            registrationDate: yearsAgo(2),
            repairReport: [{ date: daysAgo(10), content: "보청기 음질 저하 수리" }]
        }),
        // 핸드폰만 있고 집전화 없음
        mock({
            key: "mock-0014", id: "mock-0014", name: "문상철", birthDate: "1975/12/01", sex: "Male",
            address: "경기도 고양시 일산동구 백석동 10",
            phoneNumber: "", mobilePhoneNumber: "010-7070-8080",
            registrationDate: yearsAgo(1),
            repairReport: [{ date: daysAgo(40), content: "이어팁 교체 및 청소" }]
        }),

        // 일반 고객 (보청기 보유, 특정 버킷 없음)
        mock({
            key: "mock-0015", id: "mock-0015", name: "신혜란", birthDate: "1968/02/28", sex: "Female",
            cardAvailability: "No", address: "대구시 중구 동성로 11",
            phoneNumber: "053-431-2211", mobilePhoneNumber: "010-9090-1212",
            registrationDate: yearsAgo(3), fittingTest1: daysAgo(200), note: "정기 점검 필요",
            hearingAid: [
                { side: "left", model: "Livio Edge AI", date: yearsAgo(3) },
                { side: "right", model: "Livio Edge AI", date: yearsAgo(3) }
            ]
        }),
        mock({
            key: "mock-0016", id: "mock-0016", name: "조은비", birthDate: "1982/07/07", sex: "Female",
            address: "서울시 영등포구 여의도동 12",
            phoneNumber: "02-780-3434", mobilePhoneNumber: "010-1313-2424",
            registrationDate: daysAgo(400), fittingTest1: daysAgo(150),
            hearingAid: [{ side: "left", model: "Genesis AI 16", date: yearsAgo(3) }]
        })
    ];
}
