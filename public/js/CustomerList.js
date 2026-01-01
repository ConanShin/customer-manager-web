// Supabase Config
const supabaseUrl = 'https://hooiszyapcowfyccwpoi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhvb2lzenlhcGNvd2Z5Y2N3cG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMzYwMDcsImV4cCI6MjA4MjYxMjAwN30.nc-Ri_Rh8anM4LhsvpWHxvUiyKj0Is7FJ438ptZOR-Q';
const { createClient } = supabase;
const _supabase = createClient(supabaseUrl, supabaseKey);

// Globals
// Globals
const columns = ["이름", "", "연락처", "주소"];
const repairColumns = ["이름", "", "연락처", "최근 수리내역"];
const yearColumns = ["이름", "", "연락처", "보청기 구입일", "모델명"];

let customerListTable = document.getElementById("customerList");
let repairCustomerListTable = document.getElementById("repairCustomerList");
let oneWeekTable = document.getElementById("oneWeek").getElementsByTagName("table")[0];
let threeWeekTable = document.getElementById("threeWeek").getElementsByTagName("table")[0];
let sevenWeekTable = document.getElementById("sevenWeek").getElementsByTagName("table")[0];
let oneYearTable = document.getElementById("oneYear").getElementsByTagName("table")[0];
let twoYearTable = document.getElementById("twoYear").getElementsByTagName("table")[0];
let fiveYearTable = document.getElementById("fiveYear").getElementsByTagName("table")[0];
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
function convertDate(inputFormat) {
    function pad(s) { return (s < 10) ? '0' + s : s; }
    var d = new Date(inputFormat);
    return [pad(d.getFullYear()), pad(d.getMonth() + 1), pad(d.getDate())].join('/');
}

let now = new Date();
let currentDate = convertDate(now);
let weekAgo = convertDate(new Date().setDate(now.getDate() - 7));
let threeWeeksAgo = convertDate(new Date().setDate(now.getDate() - 21));
let sevenWeeksAgo = convertDate(new Date().setDate(now.getDate() - 49));
let before1YearDate = convertDate(new Date().setFullYear(now.getFullYear() - 1));
let before2YearDate = convertDate(new Date().setFullYear(now.getFullYear() - 2));
let before5YearDate = convertDate(new Date().setFullYear(now.getFullYear() - 5));

let isNull = function (subject) {
    return subject == undefined || subject == "";
}

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

let formatDate = function (insertDate) {
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

let toDbDate = function (uiDate) {
    if (isNull(uiDate)) return null;
    return uiDate.replace(/\//g, "-");
}

let isInNextThreeDays = function (tableDate, purchaseDate) {
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
        address: dbCustomer.address,
        phoneNumber: dbCustomer.phone_number,
        mobilePhoneNumber: dbCustomer.mobile_phone_number,
        registrationDate: formatDate(dbCustomer.registration_date),
        note: dbCustomer.note,
        hearingAid: dbCustomer.hearing_aids ? dbCustomer.hearing_aids.map(ha => ({
            side: ha.side,
            model: ha.model,
            date: formatDate(ha.date)
        })) : [],
        repairReport: dbCustomer.repairs ? dbCustomer.repairs.map(r => ({
            date: formatDate(r.date),
            content: r.content
        })) : []
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
        address: uiCustomer.address,
        phone_number: uiCustomer.phoneNumber,
        mobile_phone_number: uiCustomer.mobilePhoneNumber,
        registration_date: toDbDate(uiCustomer.registrationDate),
        note: uiCustomer.note
    };
};

// Main Load Logic
async function loadCustomers() {
    let allData = [];
    let from = 0;
    let to = 999;
    let keepFetching = true;

    while (keepFetching) {
        const { data: customersDb, error } = await _supabase
            .from('customers')
            .select(`*, hearing_aids(*), repairs(*)`)
            .order('registration_date', { ascending: false })
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

    renderHeaders(oneWeekTable, yearColumns);
    renderHeaders(threeWeekTable, yearColumns);
    renderHeaders(sevenWeekTable, yearColumns);
    renderHeaders(oneYearTable, yearColumns);
    renderHeaders(twoYearTable, yearColumns);
    renderHeaders(fiveYearTable, yearColumns);

    const purchaseCustomers = customers.filter(c => c.hearingAid && c.hearingAid.length > 0);

    // Bucket Aggregation
    let buckets = {
        oneWeek: [],
        threeWeek: [],
        sevenWeek: [],
        oneYear: [],
        twoYear: [],
        fiveYear: []
    };

    purchaseCustomers.forEach(function (customerData) {
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
    });

    // Helper to render bucket items
    function renderBucketTable(tableBody, items) {
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

            // Icon
            let iconHtml = '<span class="ear-icon-container">';
            if (hasLeft) iconHtml += '<span class="ear-icon ear-left"></span>';
            if (hasRight) iconHtml += '<span class="ear-icon ear-right"></span>';
            iconHtml += '</span>';
            row.insertCell(1).innerHTML = iconHtml;
            row.cells[1].setAttribute('data-label', ''); // Icon needs no label or specific handling

            // Contact
            let contactInfo = "";
            if (customerData.phoneNumber) {
                contactInfo += '<div><i class="fa fa-phone"></i> ' + customerData.phoneNumber + '</div>';
            }
            if (customerData.mobilePhoneNumber) {
                contactInfo += '<div><i class="fa fa-mobile"></i> ' + customerData.mobilePhoneNumber + '</div>';
            }
            row.insertCell(2).innerHTML = contactInfo;
            row.cells[2].setAttribute('data-label', '연락처');

            // Date (Use first match)
            row.insertCell(3).innerHTML = aids[0].date || "";
            row.cells[3].setAttribute('data-label', '구입일');

            // Model (Join unique)
            let models = [...new Set(aids.map(ha => ha.model))].join(', ');
            row.insertCell(4).innerHTML = models;
            row.cells[4].setAttribute('data-label', '모델명');
        });
    }

    renderBucketTable(oneWeekTableBody, buckets.oneWeek);
    renderBucketTable(threeWeekTableBody, buckets.threeWeek);
    renderBucketTable(sevenWeekTableBody, buckets.sevenWeek);
    renderBucketTable(oneYearTableBody, buckets.oneYear);
    renderBucketTable(twoYearTableBody, buckets.twoYear);
    renderBucketTable(fiveYearTableBody, buckets.fiveYear);

    sorttable.makeSortable(customerListTable);
    $("#loader").hide();

    // Initial Render
    renderCustomerList();
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
            let iconHtml = '<span class="ear-icon-container">';
            if (hasLeft) iconHtml += '<span class="ear-icon ear-left"></span>';
            if (hasRight) iconHtml += '<span class="ear-icon ear-right"></span>';
            iconHtml += '</span>';



            bodyRow.insertCell(0).innerHTML = customerData.name;
            bodyRow.cells[0].setAttribute('data-label', '이름');

            bodyRow.insertCell(1).innerHTML = iconHtml;
            bodyRow.cells[1].setAttribute('data-label', '');

            // Removed Registration Date

            // Last repair content
            // Last repair content
            let contactInfo = "";
            if (customerData.phoneNumber) {
                contactInfo += '<div><i class="fa fa-phone"></i> ' + customerData.phoneNumber + '</div>';
            }
            if (customerData.mobilePhoneNumber) {
                contactInfo += '<div><i class="fa fa-mobile"></i> ' + customerData.mobilePhoneNumber + '</div>';
            }
            bodyRow.insertCell(2).innerHTML = contactInfo;
            bodyRow.cells[2].setAttribute('data-label', '연락처');

            // Last repair content
            let lastRepair = "";
            if (customerData.repairReport && customerData.repairReport.length > 0) {
                lastRepair = customerData.repairReport[customerData.repairReport.length - 1].content;
            }
            bodyRow.insertCell(3).innerHTML = lastRepair;
            bodyRow.cells[3].setAttribute('data-label', '최근 수리내역');
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
            let iconHtml = '<span class="ear-icon-container">';
            if (hasLeft) iconHtml += '<span class="ear-icon ear-left"></span>';
            if (hasRight) iconHtml += '<span class="ear-icon ear-right"></span>';
            iconHtml += '</span>';



            bodyRow.insertCell(0).innerHTML = customerData.name;
            bodyRow.cells[0].setAttribute('data-label', '이름');

            bodyRow.insertCell(1).innerHTML = iconHtml;
            bodyRow.cells[1].setAttribute('data-label', '');

            // Removed Registration Date
            let contactInfo = "";
            if (customerData.phoneNumber) {
                contactInfo += '<div><i class="fa fa-phone"></i> ' + customerData.phoneNumber + '</div>';
            }
            if (customerData.mobilePhoneNumber) {
                contactInfo += '<div><i class="fa fa-mobile"></i> ' + customerData.mobilePhoneNumber + '</div>';
            }
            bodyRow.insertCell(2).innerHTML = contactInfo;
            bodyRow.cells[2].setAttribute('data-label', '연락처');

            bodyRow.insertCell(3).innerHTML = customerData.address || "";
            bodyRow.cells[3].setAttribute('data-label', '주소');
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
        for (j = 0; j < 5; j++) {
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

    customerData.note = newCustomerForm.find('textarea').val();

    if (isNull(customerData.customerName)) {
        emptyMsg = "가입자 성함을 입력해 주세요";
    }

    if (!isNull(emptyMsg)) {
        alert(emptyMsg);
    } else {
        var uiCustomer = {
            name: customerData.customerName,
            birthDate: formatDate(customerData.birthDate), // Get birthDate from form
            sex: customerData.customerSex,
            batteryOrderDate: formatDate(customerData.batteryOrderDate),
            cardAvailability: customerData.cardYN,
            address: customerData.address,
            phoneNumber: customerData.phoneNumber,
            mobilePhoneNumber: customerData.mobilePhoneNumber,
            registrationDate: formatDate(customerData.registrationDate),
            note: customerData.note
        }

        let dbCustomer = mapCustomerToDb(uiCustomer);
        let cid = updateCustomerId;

        if (isNull(cid)) {
            // INSERT
            // Generate UUID for new customer
            cid = uuidv4();
            dbCustomer.id = cid;

            const { data, error } = await _supabase.from('customers').insert(dbCustomer).select();
            if (error) { alert("Error adding customer: " + error.message); return; }
        } else {
            // UPDATE
            const { error } = await _supabase.from('customers').update(dbCustomer).eq('id', cid);
            if (error) { alert("Error updating customer: " + error.message); return; }

            // Delete existing relations to re-insert
            await _supabase.from('hearing_aids').delete().eq('customer_id', cid);
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
        loadCustomers();
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
        // Minimal customer info from Repair Form
        var uiCustomer = {
            name: customerData.customerName,
            phoneNumber: customerData.phoneNumber,
            mobilePhoneNumber: customerData.mobilePhoneNumber,
            registrationDate: formatDate(customerData.registrationDate)
        };

        // We only update/insert these fields + repairs. 
        // CAUTION: If we update, we don't want to wipe other fields (address, etc.) if they are missing here.
        // We should fetch existing if updating.

        let cid = updateCustomerId;
        let dbCustomer = {};

        // Map available fields
        if (uiCustomer.name) dbCustomer.name = uiCustomer.name;
        if (uiCustomer.phoneNumber) dbCustomer.phone_number = uiCustomer.phoneNumber;
        if (uiCustomer.mobilePhoneNumber) dbCustomer.mobile_phone_number = uiCustomer.mobilePhoneNumber;
        if (uiCustomer.registrationDate) dbCustomer.registration_date = toDbDate(uiCustomer.registrationDate);

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
        loadCustomers();
    }
});

btnDeleteCustomer.addEventListener('click', async e => {
    var confirmVal = confirm("정말 삭제하시겠습니까?");
    if (confirmVal == true) {
        const { error } = await _supabase.from('customers').delete().eq('id', updateCustomerId);
        if (error) alert("Error deleting: " + error.message);
        else alert("삭제완료");
        loadCustomers();
    }
    resetUpdateStatus();
});

btnDeleteRepairCustomer.addEventListener('click', async e => {
    var confirmVal = confirm("정말 삭제하시겠습니까?");
    if (confirmVal == true) {
        // Deleting "Repair Customer" means deleting the customer? Or just repairs?
        // Original: `repairRef.child(updateCustomerId).remove()`.
        // This implies deleting the customer's repair record.
        // If we want to maintain same behavior, we might just want to delete the user? 
        // Or maybe just delete repairs?
        // Usually "Delete" button in a modal for a customer means delete the customer.
        const { error } = await _supabase.from('customers').delete().eq('id', updateCustomerId);
        if (error) alert("Error deleting: " + error.message);
        else alert("삭제완료");
        loadCustomers();
    }
    resetUpdateStatus();
});


// Load into Dialog
let updateCustomer = async function (customerId) {
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
            aidContent.find("input[name='hearingAidPurchaseDate']").val(ha.date);
        });
    }
    newCustomerForm.find("input[name='batteryOrderDate']").val(c.batteryOrderDate);
    let cardAvailabilityRadio = newCustomerForm.find("input:radio[name='cardYN']");
    c.cardAvailability == "Yes" ? cardAvailabilityRadio[0].checked = true : cardAvailabilityRadio[1].checked = true;

    newCustomerForm.find("input[name='address']").val(c.address);
    newCustomerForm.find("input[name='phoneNumber']").val(c.phoneNumber);
    newCustomerForm.find("input[name='mobilePhoneNumber']").val(c.mobilePhoneNumber);
    newCustomerForm.find("input[name='registrationDate']").val(c.registrationDate);
    newCustomerForm.find("textarea").val(c.note);
}

let updateRepairCustomer = async function (customerId) {
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
    newRepairForm.find("input[name='registrationDate']").val(c.registrationDate);

    if (c.repairReport) {
        c.repairReport.forEach(function (r) {
            var repairReportContent = $(addNewRepairReport());
            repairReportContent.find("input[name='repairDate']").val(r.date);
            repairReportContent.find("textarea").val(r.content);
        });
    }
}

// UI Helpers
let deleteDynamicItem = function (btn) {
    $(btn).closest('.dynamic-item').remove();
}

let addEarAid = function (side) {
    let side_ko = side == "left" ? "좌측" : "우측";
    let text_class = side == "left" ? "text-primary" : "text-danger";

    let html = `
    <div class="dynamic-item hearing-aid-item modal-form-grid">
        <div class="form-group" style="flex:1;">
            <label class="${text_class}">모델명 (${side_ko})</label>
            <input class="form-control" type="text" name="hearingAidModel" side="${side}"/>
        </div>
        <div class="form-group" style="width:140px;">
            <label>구입날짜</label>
            <input class="form-control" type="text" name="hearingAidPurchaseDate" value="${currentDate}" side="${side}"/>
        </div>
        <div class="form-group" style="width:30px; justify-content:flex-end; padding-bottom:1px;">
             <label style="opacity:0">삭제</label>
             <button class="btn btn-default btn-grid-close" onclick="deleteDynamicItem(this)">X</button>
        </div>
    </div>`;

    $("#hearingAidList").append(html);
    return $("#hearingAidList").children().last(); // Return for value setting in update
}

let addNewRepairReport = function () {
    let html = `
    <div class="dynamic-item repair-report-item modal-form-grid">
        <div class="form-group" style="width:140px;">
            <label>수리일</label>
            <input type="text" name="repairDate" class="form-control" value="${currentDate}"/>
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
        if (inputTag.name == "customerSex" || inputTag.name == "cardYN") {
            if (inputTag.value == "Male") inputTag.checked = true;
            if (inputTag.value == "Female") inputTag.checked = false;
            if (inputTag.value == "Yes") inputTag.checked = true;
            if (inputTag.value == "No") inputTag.checked = false;
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
