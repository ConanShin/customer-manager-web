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
    const customers = allData.map(mapCustomerFromDb);
    allCustomers = customers; // Store correctly
    console.log("Fetched Total Customers:", allData.length);
    console.log("Mapped Customers:", customers);

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

    renderHeaders(oneWeekTable, yearColumns);
    renderHeaders(threeWeekTable, yearColumns);
    renderHeaders(sevenWeekTable, yearColumns);
    renderHeaders(oneYearTable, yearColumns);
    renderHeaders(twoYearTable, yearColumns);
    renderHeaders(fiveYearTable, yearColumns);
    renderHeaders(fittingDueTable, ["이름", "사진", "", "연락처", "최근 적합검사일", "모델명"]);

    const purchaseCustomers = customers.filter(c => c.hearingAid && c.hearingAid.length > 0);

    // Bucket Aggregation
    let buckets = {
        oneWeek: [],
        threeWeek: [],
        sevenWeek: [],
        oneYear: [],
        twoYear: [],
        fiveYear: [],
        fittingDue: []
    };

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
    });

    // Helper to render bucket items
    function renderBucketTable(tableBody, items, dateLabel = "구입일", dateField = null) {
        items.forEach(item => {
            let customerData = item.customer;
            let aids = item.aids;
            let hasLeft = aids.some(ha => ha.side === 'left');
            let hasRight = aids.some(ha => ha.side === 'right');

            let row = tableBody.insertRow();
            row.setAttribute('onclick', 'updateCustomer(\'' + customerData.id + '\')');

            // Name
            row.insertCell(0).innerHTML = customerData.name;
            row.cells[0].setAttribute('data-label', '이름');

            // Profile Picture
            let profileUrl = `https://firebasestorage.googleapis.com/v0/b/${_storageBucketName}/o/customer_profiles%2F${customerData.id}?alt=media&t=${customerData.updatedAt ? new Date(customerData.updatedAt).getTime() : ''}`;
            let imgHtml = `
            <div class="profile-wrapper" style="position:relative; width:40px; height:40px;">
                <img src="${profileUrl}" class="profile-avatar-small" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" style="display:block;"/>
                <div class="profile-avatar-placeholder-small" style="display:none; position:absolute; top:0; left:0;">${[...customerData.name][0] || '?'}</div>
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
                contactInfo += '<div><i class="fa fa-phone"></i> <a href="tel:' + customerData.phoneNumber + '" onclick="event.stopPropagation()">' + customerData.phoneNumber + '</a></div>';
            }
            if (customerData.mobilePhoneNumber) {
                contactInfo += '<div><i class="fa fa-mobile"></i> <a href="tel:' + customerData.mobilePhoneNumber + '" onclick="event.stopPropagation()">' + customerData.mobilePhoneNumber + '</a></div>';
            }
            row.insertCell(3).innerHTML = contactInfo;
            row.cells[3].setAttribute('data-label', '연락처');

            // Date
            let displayDate = dateField ? item[dateField] : (aids[0] ? aids[0].date : "");
            row.insertCell(4).innerHTML = displayDate;
            row.cells[4].setAttribute('data-label', dateLabel);

            // Model
            let models = [...new Set(aids.map(ha => ha.model))].join(', ');
            row.insertCell(5).innerHTML = models;
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

    sorttable.makeSortable(customerListTable);

    // Initial Render
    renderCustomerList();
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
            bodyRow.setAttribute('onclick', 'updateRepairCustomer(\'' + customerData.id + '\')');
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

            bodyRow.insertCell(0).innerHTML = customerData.name;
            bodyRow.cells[0].setAttribute('data-label', '이름');

            // Profile Picture (Constructed from ID)
            let profileUrl = `https://firebasestorage.googleapis.com/v0/b/${_storageBucketName}/o/customer_profiles%2F${customerData.id}?alt=media&t=${customerData.updatedAt ? new Date(customerData.updatedAt).getTime() : ''}`;
            let imgHtml = `
            <div class="profile-wrapper" style="position:relative; width:40px; height:40px;">
                <img src="${profileUrl}" class="profile-avatar-small" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" style="display:block;"/>
                <div class="profile-avatar-placeholder-small" style="display:none; position:absolute; top:0; left:0;">${[...customerData.name][0] || '?'}</div>
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
                contactInfo += '<div><i class="fa fa-phone"></i> <a href="tel:' + customerData.phoneNumber + '" onclick="event.stopPropagation()">' + customerData.phoneNumber + '</a></div>';
            }
            if (customerData.mobilePhoneNumber) {
                contactInfo += '<div><i class="fa fa-mobile"></i> <a href="tel:' + customerData.mobilePhoneNumber + '" onclick="event.stopPropagation()">' + customerData.mobilePhoneNumber + '</a></div>';
            }
            bodyRow.insertCell(3).innerHTML = contactInfo;
            bodyRow.cells[3].setAttribute('data-label', '연락처');

            // Last repair content
            let lastRepair = "";
            if (customerData.repairReport && customerData.repairReport.length > 0) {
                lastRepair = customerData.repairReport[customerData.repairReport.length - 1].content;
            }
            bodyRow.insertCell(4).innerHTML = lastRepair;
            bodyRow.cells[4].setAttribute('data-label', '최근 수리내역');
        });
    } else {
        // Show Standard Table (All or Buy)
        customerListTable.style.display = "table";
        repairCustomerListTable.style.display = "none";
        renderHeaders(customerListTable, columns);

        filteredCustomers.forEach(function (customerData) {
            var bodyRow = customerListTableBody.insertRow(customerListTableBody.rows.length);
            bodyRow.setAttribute('onclick', 'updateCustomer(\'' + customerData.id + '\')');
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

            bodyRow.insertCell(0).innerHTML = customerData.name;
            bodyRow.cells[0].setAttribute('data-label', '이름');

            // Profile Picture (Constructed from ID)
            let profileUrl = `https://firebasestorage.googleapis.com/v0/b/${_storageBucketName}/o/customer_profiles%2F${customerData.id}?alt=media&t=${customerData.updatedAt ? new Date(customerData.updatedAt).getTime() : ''}`;
            let imgHtml = `
            <div class="profile-wrapper" style="position:relative; width:40px; height:40px;">
                <img src="${profileUrl}" class="profile-avatar-small" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" style="display:block;"/>
                <div class="profile-avatar-placeholder-small" style="display:none; position:absolute; top:0; left:0;">${[...customerData.name][0] || '?'}</div>
            </div>`;
            bodyRow.insertCell(1).innerHTML = imgHtml;
            bodyRow.cells[1].setAttribute('data-label', '사진');

            bodyRow.insertCell(2).innerHTML = iconHtml;
            bodyRow.cells[2].setAttribute('data-label', '');

            // Removed Registration Date
            let contactInfo = "";
            if (customerData.phoneNumber) {
                contactInfo += '<div><i class="fa fa-phone"></i> <a href="tel:' + customerData.phoneNumber + '" onclick="event.stopPropagation()">' + customerData.phoneNumber + '</a></div>';
            }
            if (customerData.mobilePhoneNumber) {
                contactInfo += '<div><i class="fa fa-mobile"></i> <a href="tel:' + customerData.mobilePhoneNumber + '" onclick="event.stopPropagation()">' + customerData.mobilePhoneNumber + '</a></div>';
            }
            bodyRow.insertCell(3).innerHTML = contactInfo;
            bodyRow.cells[3].setAttribute('data-label', '연락처');

            bodyRow.insertCell(4).innerHTML = customerData.address || "";
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
    document.getElementById("filterInput").value = "";
    filterTable();
}

let filterTable = function () {
    let filter, tr, td, i, count, listTable;
    filter = document.getElementById("filterInput").value;

    let filterType = $("input:radio[name='buyRepair']:checked").val();
    listTable = filterType == 'repair' ? repairCustomerListTable : customerListTable;

    tr = listTable.getElementsByTagName("tr");
    count = 0;

    for (i = 0; i < tr.length; i++) {
        // Skip header
        if (tr[i].parentNode.tagName === 'THEAD') continue;

        let found = false;
        for (j = 0; j < 6; j++) {
            td = tr[i].getElementsByTagName("td")[j];
            if (td) {
                if (td.innerHTML.indexOf(filter) > -1) {
                    found = true;
                    break;
                }
            }
        }

        if (found) {
            tr[i].style.display = "";
            count++;
            if (count % 10 == 0) {
                tr[i].className = "highlight";
            } else {
                tr[i].className = "";
            }
        } else {
            tr[i].style.display = "none";
        }
    }
    $("#customerCount")[0].innerHTML = count;
}

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

        // We can fetch fresh or find in loaded list. Let's fetch fresh for safety.
        const { data, error } = await _supabase.from('customers').select('*, hearing_aids(*), repairs(*)').eq('id', customerId).single();
        if (error) { console.error(error); return; }

        let c = mapCustomerFromDb(data);

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

        const { data, error } = await _supabase.from('customers').select('*, hearing_aids(*), repairs(*)').eq('id', customerId).single();
        if (error) { console.error(error); return; }

        let c = mapCustomerFromDb(data);

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
            inputTag.value = currentDate;
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
                        <td style="padding: 12px;">${customer.name}</td>
                        <td style="padding: 12px; text-align: center;">
                            <span class="ha-badge ${badgeCls}" style="width: 25px; padding: 2px 4px; font-size: 0.7rem;">${sideKo}</span>
                        </td>
                        <td style="padding: 12px; font-size: 0.9rem;">${item.model || '-'}</td>
                        <td style="padding: 12px; font-size: 0.9rem;">${formatDate(item.date)}</td>
                    </tr>
                `);
                row.click(() => {
                    $('#salesStatisticsDialog').modal('hide');
                    updateCustomer(customer.id);
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
