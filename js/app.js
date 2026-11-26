document.addEventListener("DOMContentLoaded", function () {
  initAuthenticatedUserInfo();

  initDynamicFields();
  initStagesTable();
  initPaymentsTable();
  initDeliveryBlock();

  initDownloadWordButton();
  initValidationReset();
  initDraftAutosave(); // має бути останнім
});

/* ================================
   HELPERS
================================ */

function getRadioValue(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : "";
}

function getValue(id) {
  const element = document.getElementById(id);
  return element ? element.value.trim() : "";
}

function showElementById(id, shouldShow) {
  const element = document.getElementById(id);

  if (!element) {
    console.warn("Element not found:", id);
    return;
  }

  if (shouldShow) {
    element.classList.remove("hidden");
  } else {
    element.classList.add("hidden");
  }
}

function parseNumber(value) {
  const n = parseFloat(String(value).replace(/\s/g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}

async function initAuthenticatedUserInfo() {
  try {
    const response = await fetch("/.auth/me");

    if (!response.ok) {
      console.warn("Cannot load authenticated user info");
      return;
    }

    const authData = await response.json();

    if (!authData || !authData.clientPrincipal) {
      console.warn("No authenticated user found");
      return;
    }

    const userEmail = authData.clientPrincipal.userDetails || "";
    const managerEmailInput = document.getElementById("managerEmail");

    if (managerEmailInput && userEmail) {
      managerEmailInput.value = userEmail;
    }
  } catch (error) {
    console.error("Failed to get authenticated user info:", error);
  }
}

/* ================================
   DYNAMIC FIELDS
================================ */

function initDynamicFields() {
  // Який документ потрібно підготувати -> Інше
  document
    .querySelectorAll('input[name="documentType"]')
    .forEach(function (radio) {
      radio.addEventListener("change", function () {
        showElementById(
          "documentOtherRow",
          getRadioValue("documentType") === "Інше",
        );
      });
    });

  // Юридична особа
  document
    .querySelectorAll('input[name="legalEntity"]')
    .forEach(function (radio) {
      radio.addEventListener("change", function () {
        const value = getRadioValue("legalEntity");

        showElementById("fopNameRow", value === "Внутрішній ФОП");
        showElementById("legalOtherRow", value === "Інше");

        const needReason =
          value === "ТОВ «СЕРВІС ХАБ»" ||
          value === "ТОВ «АДВЕЙС ЛІДЕР»" ||
          value === "Внутрішній ФОП";

        showElementById("nonFrontAgencyReasonRow", needReason);
      });
    });

  // Чи працювали з підрядником раніше
  document
    .querySelectorAll('input[name="workedBefore"]')
    .forEach(function (radio) {
      radio.addEventListener("change", function () {
        showElementById(
          "workedBeforeDetailsRow",
          getRadioValue("workedBefore") === "Так",
        );
      });
    });

  // Чи працює у Вчасно
  document.querySelectorAll('input[name="vchasno"]').forEach(function (radio) {
    radio.addEventListener("change", function () {
      showElementById("vchasnoEmailRow", getRadioValue("vchasno") === "Так");
    });
  });

  // Чи є макет Товару
  document
    .querySelectorAll('input[name="hasMockup"]')
    .forEach(function (radio) {
      radio.addEventListener("change", function () {
        showElementById(
          "mockupFileRow",
          getRadioValue("hasMockup") === "Так",
        );
      });
    });

  // ПДВ -> заголовок «Сума з ПДВ» у порядку оплати
  document
    .querySelectorAll('input[name="contractorVat"]')
    .forEach(function (radio) {
      radio.addEventListener("change", updateVatHeaders);
    });

  updateVatHeaders();
}

function updateVatHeaders() {
  const header = document.getElementById("paymentAmountHeader");
  if (!header) return;

  const isVatPayer = getRadioValue("contractorVat") === "Так";
  header.textContent = isVatPayer ? "Сума з ПДВ" : "Сума";
}

/* ================================
   DELIVERY: TOTALS
================================ */

function initDeliveryBlock() {
  const stagesTable = document.getElementById("stagesTable");

  if (stagesTable) {
    stagesTable.addEventListener("input", recalcDelivery);
  }

  document
    .querySelectorAll('input[name="contractorVat"]')
    .forEach(function (radio) {
      radio.addEventListener("change", recalcDelivery);
    });

  recalcDelivery();
}

function recalcDelivery() {
  const VAT_RATE = 0.2;
  const isVatPayer = getRadioValue("contractorVat") === "Так";

  let totalNoVat = 0;
  let totalWithVat = 0;

  // Колонка «Вартість з ПДВ» видима лише для платників ПДВ
  document.querySelectorAll("#stagesTable .vat-col").forEach(function (cell) {
    cell.classList.toggle("hidden", !isVatPayer);
  });

  document.querySelectorAll("#stagesTable tbody tr").forEach(function (row) {
    const qty = parseNumber(
      row.querySelector('[name="deliverAmount[]"]')?.value,
    );
    const priceEl = row.querySelector('[name="deliverCost[]"]');
    const noVatEl = row.querySelector('[name="deliverVart[]"]');
    const withVatEl = row.querySelector('[name="deliverVatCost[]"]');

    if (!priceEl || !noVatEl || !withVatEl) return;

    let noVat;
    let withVat;

    if (isVatPayer) {
      // Платник ПДВ: вводять «Вартість з ПДВ», решта рахується
      noVatEl.readOnly = true;
      noVatEl.placeholder = "Авто";
      withVat = parseNumber(withVatEl.value);
      noVat = withVat / (1 + VAT_RATE);
      noVatEl.value = noVat ? noVat.toFixed(2) : "";
    } else {
      // Не платник ПДВ: вводять «Вартість без ПДВ», ціна рахується
      noVatEl.readOnly = false;
      noVatEl.placeholder = "Вартість";
      noVat = parseNumber(noVatEl.value);
      withVat = noVat * (1 + VAT_RATE);
    }

    // Ціна за одиницю без ПДВ завжди рахується автоматично
    priceEl.value = qty && noVat ? (noVat / qty).toFixed(2) : "";

    totalNoVat += noVat;
    totalWithVat += withVat;
  });

  document.getElementById("totalNoVat").value = totalNoVat
    ? totalNoVat.toFixed(2)
    : "";

  document.getElementById("totalVat").value =
    isVatPayer && totalNoVat ? (totalWithVat - totalNoVat).toFixed(2) : "";

  document.getElementById("totalWithVat").value =
    isVatPayer && totalWithVat ? totalWithVat.toFixed(2) : "";

  showElementById("totalVatRow", isVatPayer);
  showElementById("totalWithVatRow", isVatPayer);
}

/* ================================
   STAGES TABLE (УМОВИ ПОСТАВКИ)
================================ */

function initStagesTable() {
  const addStageBtn = document.getElementById("addStageBtn");
  const stagesTable = document.getElementById("stagesTable");

  if (!addStageBtn || !stagesTable) {
    console.warn("Stages elements not found");
    return;
  }

  addStageBtn.addEventListener("click", function () {
    addStageRow();
  });

  stagesTable.addEventListener("click", function (event) {
    if (event.target.classList.contains("remove-row")) {
      const row = event.target.closest("tr");

      if (row) {
        row.remove();
        renumberStages();
        recalcDelivery();
      }
    }
  });
}

function addStageRow() {
  const tbody = document.querySelector("#stagesTable tbody");

  if (!tbody) {
    console.warn("Stages tbody not found");
    return;
  }

  const row = document.createElement("tr");

  row.innerHTML = `
        <td class="stage-number"></td>
        <td>
            <textarea name="deliverName[]" placeholder="Найменування"></textarea>
        </td>
        <td>
            <input name="deliverAmount[]" type="text" placeholder="шт">
        </td>
        <td>
            <input name="deliverCountry[]" type="text" placeholder="Україна">
        </td>
        <td>
            <input name="deliverCode[]" type="text" placeholder="Код">
        </td>
        <td>
            <input name="deliverCost[]" type="text" readonly placeholder="Авто">
        </td>
        <td>
            <input name="deliverVart[]" type="text" placeholder="Вартість">
        </td>
        <td class="vat-col hidden">
            <input name="deliverVatCost[]" type="text" placeholder="З ПДВ">
        </td>
        <td>
            <button type="button" class="icon-button remove-row">×</button>
        </td>
    `;

  tbody.appendChild(row);
  renumberStages();
  recalcDelivery();
}

function renumberStages() {
  const numbers = document.querySelectorAll("#stagesTable .stage-number");

  numbers.forEach(function (cell, index) {
    cell.textContent = index + 1;
  });
}

/* ================================
   PAYMENTS TABLE
================================ */

function initPaymentsTable() {
  const addPaymentBtn = document.getElementById("addPaymentBtn");
  const paymentsTable = document.getElementById("paymentsTable");

  if (!addPaymentBtn || !paymentsTable) {
    console.warn("Payments elements not found");
    return;
  }

  addPaymentBtn.addEventListener("click", function () {
    addPaymentRow();
  });

  paymentsTable.addEventListener("click", function (event) {
    if (event.target.classList.contains("remove-row")) {
      const row = event.target.closest("tr");

      if (row) {
        row.remove();
        renumberPayments();
      }
    }
  });
}

function addPaymentRow() {
  const tbody = document.querySelector("#paymentsTable tbody");

  if (!tbody) {
    console.warn("Payments tbody not found");
    return;
  }

  const row = document.createElement("tr");

  row.innerHTML = `
        <td class="payment-number"></td>
        <td>
            <input name="paymentAmount[]" type="text" placeholder="10000">
        </td>
        <td>
            <input name="paymentDate[]" type="date">
        </td>
        <td>
            <textarea name="paymentComment[]" placeholder="Коментар"></textarea>
        </td>
        <td>
            <button type="button" class="icon-button remove-row">×</button>
        </td>
    `;

  tbody.appendChild(row);
  renumberPayments();
}

function renumberPayments() {
  const numbers = document.querySelectorAll("#paymentsTable .payment-number");

  numbers.forEach(function (cell, index) {
    cell.textContent = index + 1;
  });
}

/* ================================
   COLLECT DATA
================================ */

function collectBriefData() {
  return {
    general: {
      managerName: getValue("managerName"),
      managerEmail: getValue("managerEmail"),
      clientName: getValue("clientName"),
      projectName: getValue("projectName"),
      documentType: getDocumentType(),
    },

    legal: {
      legalEntity: getLegalEntity(),
      fopName: getValue("fopName"),
      legalOther: getValue("legalOther"),
      nonFrontAgencyReason: getValue("nonFrontAgencyReason"),
      legalEntityType: getRadioValue("legalEntity"),
    },

    contractor: {
      contractorName: getValue("contractorName"),
      contractorVat: getRadioValue("contractorVat"),
      worksectionLink: getValue("worksectionLink"),
      contractorEmail: getValue("contractorEmail"),
      contractorPhone: getValue("contractorPhone"),
      workedBefore: getRadioValue("workedBefore"),
      workedBeforeDetails: getValue("workedBeforeDetails"),
      vchasno: getRadioValue("vchasno"),
      vchasnoEmail: getValue("vchasnoEmail"),
    },

    items: collectItems(),

    delivery: {
      totalNoVat: getValue("totalNoVat"),
      totalVat: getValue("totalVat"),
      totalWithVat: getValue("totalWithVat"),
      techSpecs: getValue("techSpecs"),
      deliveryTerm: getValue("deliveryTerm"),
      deliveryPlace: getRadioValue("deliveryPlace"),
      deliveryAddress: getValue("deliveryAddress"),
    },

    payments: collectPayments(),

    risks: {
      riskConditions: getValue("riskConditions"),
    },

    files: {
      hasMockup: getRadioValue("hasMockup"),
      mockupFiles: Array.from(
        document.getElementById("mockupFile")?.files || [],
      ).map(function (file) {
        return file.name;
      }),
    },
  };
}

function getDocumentType() {
  const value = getRadioValue("documentType");

  if (value === "Інше") {
    return getValue("documentOther");
  }

  return value;
}

function getLegalEntity() {
  const value = getRadioValue("legalEntity");

  if (value === "Внутрішній ФОП") {
    return "Внутрішній ФОП: " + getValue("fopName");
  }

  if (value === "Інше") {
    return getValue("legalOther");
  }

  return value;
}

function collectItems() {
  const rows = document.querySelectorAll("#stagesTable tbody tr");

  return Array.from(rows).map(function (row, index) {
    const get = function (name) {
      return row.querySelector(`[name="${name}[]"]`)?.value.trim() || "";
    };

    return {
      itemNo: index + 1,
      name: get("deliverName"),
      amount: get("deliverAmount"),
      country: get("deliverCountry"),
      code: get("deliverCode"),
      price: get("deliverCost"),
      total: get("deliverVart"),
      totalWithVat: get("deliverVatCost"),
    };
  });
}

function collectPayments() {
  const rows = document.querySelectorAll("#paymentsTable tbody tr");

  return Array.from(rows).map(function (row, index) {
    return {
      paymentNo: index + 1,
      amount: row.querySelector('[name="paymentAmount[]"]')?.value.trim() || "",
      payDate: row.querySelector('[name="paymentDate[]"]')?.value || "",
      comment:
        row.querySelector('[name="paymentComment[]"]')?.value.trim() || "",
    };
  });
}

/* ================================
   DOWNLOAD WORD
================================ */

function initDownloadWordButton() {
  const button = document.getElementById("downloadWordBtn");

  if (!button) {
    console.warn("downloadWordBtn not found");
    return;
  }

  button.addEventListener("click", function () {
    if (!validateForm()) {
      return;
    }

    const data = collectBriefData();
    const html = buildWordDocumentHtml(data);

    downloadWordDocument(html, data);
  });
}

/* ================================
   VALIDATION (усі видимі поля обов'язкові)
================================ */

function isVisible(el) {
  return !el.closest(".hidden");
}

function validateForm() {
  const form = document.getElementById("briefForm");
  const errors = [];

  form.querySelectorAll(".field-error").forEach(function (el) {
    el.classList.remove("field-error");
  });

  // Текстові поля, textarea, дати, email
  form.querySelectorAll("input, textarea, select").forEach(function (el) {
    if (["radio", "checkbox", "button", "file", "hidden"].includes(el.type)) {
      return;
    }

    // Автоматичні (readonly) поля не перевіряємо
    if (el.readOnly || el.disabled || el.dataset.optional === "true") return;
    if (!isVisible(el)) return;

    const emptyValue = !el.value.trim();
    const badEmail = el.type === "email" && el.value && !el.checkValidity();

    if (emptyValue || badEmail) {
      el.classList.add("field-error");
      errors.push(el);
    }
  });

  // Радіокнопки: має бути обрано один варіант
  const radioNames = new Set();

  form.querySelectorAll('input[type="radio"]').forEach(function (radio) {
    radioNames.add(radio.name);
  });

  radioNames.forEach(function (name) {
    const radios = Array.from(
      form.querySelectorAll(`input[type="radio"][name="${name}"]`),
    );

    if (!radios.some(isVisible)) return;

    if (
      !radios.some(function (r) {
        return r.checked;
      })
    ) {
      const box = radios[0].closest(".radio-group") || radios[0];
      box.classList.add("field-error");
      errors.push(box);
    }
  });

  if (errors.length > 0) {
    alert(
      "Заповніть усі обов'язкові поля. Не заповнено: " +
        errors.length +
        ". Незаповнені поля підсвічено червоним.",
    );

    errors[0].scrollIntoView({ behavior: "smooth", block: "center" });

    if (typeof errors[0].focus === "function") {
      errors[0].focus({ preventScroll: true });
    }

    return false;
  }

  return true;
}

function initValidationReset() {
  const form = document.getElementById("briefForm");

  // Червоне підсвічування зникає, щойно поле змінили
  form.addEventListener("input", function (event) {
    event.target.classList.remove("field-error");
  });

  form.addEventListener("change", function (event) {
    event.target.classList.remove("field-error");

    const group = event.target.closest(".radio-group");
    if (group) group.classList.remove("field-error");
  });
}

/* ================================
   AUTOSAVE (збереження чернетки)
   Дані не пропадають при оновленні сторінки
   (зокрема при "pull-to-refresh" на телефоні)
================================ */

const DRAFT_KEY =
  "brief_supply_basic_draft_v1:" + location.host + location.pathname;

const DRAFT_TABLES = [
  { id: "stagesTable", addRow: addStageRow, renumber: renumberStages },
  { id: "paymentsTable", addRow: addPaymentRow, renumber: renumberPayments },
];

function collectDraft() {
  const form = document.getElementById("briefForm");
  const state = { fields: {}, radios: {}, tables: {} };

  Array.from(form.elements).forEach(function (el) {
    if (el.closest("table") || el.type === "file" || el.type === "button") {
      return;
    }

    if (el.type === "radio") {
      if (el.checked) state.radios[el.name] = el.value;
    } else if (el.id) {
      state.fields[el.id] = el.value;
    }
  });

  DRAFT_TABLES.forEach(function (table) {
    const rows = document.querySelectorAll("#" + table.id + " tbody tr");

    state.tables[table.id] = Array.from(rows).map(function (row) {
      const values = {};

      row.querySelectorAll("input, textarea").forEach(function (el) {
        values[el.name] = el.value;
      });

      return values;
    });
  });

  return state;
}

function saveDraft() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(collectDraft()));
  } catch (error) {
    console.warn("Cannot save draft:", error);
  }
}

function restoreDraft() {
  let state;

  try {
    state = JSON.parse(localStorage.getItem(DRAFT_KEY));
  } catch (error) {
    return;
  }

  if (!state) return;

  // Звичайні поля
  Object.keys(state.fields || {}).forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.value = state.fields[id];
  });

  // Радіокнопки (change запускає показ/приховування залежних полів)
  Object.keys(state.radios || {}).forEach(function (name) {
    document
      .querySelectorAll(`input[type="radio"][name="${name}"]`)
      .forEach(function (radio) {
        if (radio.value === state.radios[name]) {
          radio.checked = true;
          radio.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
  });

  // Таблиці
  DRAFT_TABLES.forEach(function (table) {
    const savedRows = (state.tables || {})[table.id];
    if (!savedRows || savedRows.length === 0) return;

    const tbody = document.querySelector("#" + table.id + " tbody");

    while (tbody.rows.length < savedRows.length) {
      table.addRow();
    }

    while (tbody.rows.length > savedRows.length) {
      tbody.deleteRow(tbody.rows.length - 1);
    }

    savedRows.forEach(function (values, index) {
      const row = tbody.rows[index];

      Object.keys(values).forEach(function (name) {
        const el = row.querySelector(`[name="${name}"]`);
        if (el) el.value = values[name];
      });
    });

    table.renumber();
  });

  // Перерахунок після відновлення значень
  recalcDelivery();
  updateVatHeaders();
}

function initDraftAutosave() {
  const form = document.getElementById("briefForm");
  if (!form) return;

  restoreDraft();

  let timer = null;
  const scheduleSave = function () {
    clearTimeout(timer);
    timer = setTimeout(saveDraft, 300);
  };

  form.addEventListener("input", scheduleSave);
  form.addEventListener("change", scheduleSave);

  // Додавання / видалення рядків таблиць
  form.addEventListener("click", function (event) {
    if (event.target.closest(".remove-row, .secondary-button")) {
      scheduleSave();
    }
  });

  const clearBtn = document.getElementById("clearDraftBtn");

  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      if (confirm("Очистити всі введені дані?")) {
        localStorage.removeItem(DRAFT_KEY);
        location.reload();
      }
    });
  }
}

/* ================================
   WORD DOCUMENT
================================ */

function buildWordDocumentHtml(data) {
  const isVatPayer = data.contractor.contractorVat === "Так";

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">

    <style>
        body {
            font-family: "Segoe UI", Arial, sans-serif;
            font-size: 11pt;
            color: #222222;
            line-height: 1.35;
        }

        h1 {
            text-align: center;
            font-size: 20pt;
            margin-bottom: 24px;
            color: #263339;
        }

        h2 {
            background: #E6D9B9;
            color: #263339;
            padding: 8px;
            font-size: 14pt;
            margin-top: 24px;
            margin-bottom: 10px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
        }

        th,
        td {
            border: 1px solid #888888;
            padding: 6px;
            vertical-align: top;
        }

        th {
            background: #465F64;
            color: #ffffff;
            font-weight: bold;
        }

        .label {
            width: 35%;
            font-weight: bold;
            background: #F3F3F3;
        }

        .value {
            width: 65%;
        }

        p {
            margin: 6px 0 12px 0;
        }
    </style>
</head>

<body>

    <h1>Бриф на договір / додаток поставки з підрядником</h1>

    <h2>1. Загальна інформація</h2>

    <table>
        <tr>
            <td class="label">Менеджер</td>
            <td class="value">${escapeHtml(data.general.managerName)}</td>
        </tr>

        <tr>
            <td class="label">Email менеджера</td>
            <td class="value">${escapeHtml(data.general.managerEmail)}</td>
        </tr>

        <tr>
            <td class="label">Клієнт</td>
            <td class="value">${escapeHtml(data.general.clientName)}</td>
        </tr>

        <tr>
            <td class="label">Назва та номер проєкту</td>
            <td class="value">${escapeHtml(data.general.projectName)}</td>
        </tr>

        <tr>
            <td class="label">Який документ потрібно підготувати</td>
            <td class="value">${escapeHtml(data.general.documentType)}</td>
        </tr>
    </table>

    <table>
        <tr>
            <td class="label">Юридична особа зі сторони Adsapience</td>
            <td class="value">${escapeHtml(data.legal.legalEntity)}</td>
        </tr>

        ${
          ["ТОВ «СЕРВІС ХАБ»", "ТОВ «АДВЕЙС ЛІДЕР»", "Внутрішній ФОП"].includes(
            data.legal.legalEntityType,
          )
            ? `
        <tr>
            <td class="label">Причина закриття не на фронтальне агентство</td>
            <td class="value">${escapeHtml(data.legal.nonFrontAgencyReason)}</td>
        </tr>
        `
            : ""
        }

    </table>

    <h2>2. Інформація про підрядника</h2>

    <table>
        <tr>
            <td class="label">Повна юридична назва підрядника / ПІБ ФОП</td>
            <td class="value">${escapeHtml(data.contractor.contractorName)}</td>
        </tr>

        <tr>
            <td class="label">Чи є підрядник платником ПДВ</td>
            <td class="value">${escapeHtml(data.contractor.contractorVat)}</td>
        </tr>

        <tr>
            <td class="label">№ перевірки СБ</td>
            <td class="value">${escapeHtml(data.contractor.worksectionLink)}</td>
        </tr>

        <tr>
            <td class="label">Контактний Email підрядника</td>
            <td class="value">${escapeHtml(data.contractor.contractorEmail)}</td>
        </tr>

        <tr>
            <td class="label">Контактний телефон підрядника</td>
            <td class="value">${escapeHtml(data.contractor.contractorPhone)}</td>
        </tr>

        <tr>
            <td class="label">Чи працювали з підрядником раніше</td>
            <td class="value">
                ${
                  data.contractor.workedBefore === "Так"
                    ? "Так: " + escapeHtml(data.contractor.workedBeforeDetails)
                    : escapeHtml(data.contractor.workedBefore)
                }
            </td>
        </tr>

        <tr>
            <td class="label">Чи працює підрядник у Вчасно</td>
            <td class="value">
                ${
                  data.contractor.vchasno === "Так"
                    ? "Так: " + escapeHtml(data.contractor.vchasnoEmail)
                    : escapeHtml(data.contractor.vchasno)
                }
            </td>
        </tr>
    </table>

    <h2>3. Умови поставки</h2>

    ${buildItemsWordTable(data.items, isVatPayer)}

    <table>
        <tr>
            <td class="label">Всього без ПДВ</td>
            <td class="value">${escapeHtml(data.delivery.totalNoVat)}</td>
        </tr>

        ${
          isVatPayer
            ? `
        <tr>
            <td class="label">ПДВ 20%</td>
            <td class="value">${escapeHtml(data.delivery.totalVat)}</td>
        </tr>

        <tr>
            <td class="label">Всього з ПДВ</td>
            <td class="value">${escapeHtml(data.delivery.totalWithVat)}</td>
        </tr>
        `
            : ""
        }

        <tr>
            <td class="label">Технічні характеристики</td>
            <td class="value">${escapeHtml(data.delivery.techSpecs)}</td>
        </tr>

        <tr>
            <td class="label">Термін поставки</td>
            <td class="value">${escapeHtml(data.delivery.deliveryTerm)}</td>
        </tr>

        <tr>
            <td class="label">Місце поставки</td>
            <td class="value">${escapeHtml(data.delivery.deliveryPlace)}</td>
        </tr>

        <tr>
            <td class="label">Адреса поставки</td>
            <td class="value">${escapeHtml(data.delivery.deliveryAddress)}</td>
        </tr>
    </table>

    <h2>4. Порядок оплати</h2>

    ${buildPaymentsWordTable(data.payments, isVatPayer)}

    <h2>5. Додаткові та ризикові умови</h2>

    <table>
        <tr>
            <td class="label">Будь-які домовленості з підрядником, які обов’язково потрібно включити в документ</td>
            <td class="value">${escapeHtml(data.risks.riskConditions)}</td>
        </tr>
    </table>

    <h2>6. Файли та посилання</h2>

    <table>
        <tr>
            <td class="label">Чи є макет Товару?</td>
            <td class="value">
                ${escapeHtml(data.files.hasMockup)}
                ${
                  data.files.hasMockup === "Так"
                    ? (data.files.mockupFiles.length
                        ? "<br>Файли: " +
                          escapeHtml(data.files.mockupFiles.join(", "))
                        : "") +
                      "<br><b>Прохання додати макет при відправці брифу</b>"
                    : ""
                }
            </td>
        </tr>
    </table>

</body>
</html>
    `;
}

function buildItemsWordTable(items, isVatPayer) {
  if (!items || items.length === 0) {
    return "<p>Позиції не заповнені.</p>";
  }

  let rows = "";

  items.forEach(function (item) {
    rows += `
            <tr>
                <td>${escapeHtml(item.itemNo)}</td>
                <td>${escapeHtml(item.name)}</td>
                <td>${escapeHtml(item.amount)}</td>
                <td>${escapeHtml(item.country)}</td>
                <td>${escapeHtml(item.code)}</td>
                <td>${escapeHtml(item.price)}</td>
                <td>${escapeHtml(item.total)}</td>
                ${isVatPayer ? `<td>${escapeHtml(item.totalWithVat)}</td>` : ""}
            </tr>
        `;
  });

  return `
        <table>
            <thead>
                <tr>
                    <th>№</th>
                    <th>Найменування</th>
                    <th>Кіл-ть, шт.</th>
                    <th>В якій країні виготовлений Товар</th>
                    <th>Код УКТЗЕД</th>
                    <th>Ціна за од. без ПДВ, грн.</th>
                    <th>Вартість без ПДВ, грн.</th>
                    ${isVatPayer ? "<th>Вартість з ПДВ, грн.</th>" : ""}
                </tr>
            </thead>

            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}

function buildPaymentsWordTable(payments, isVatPayer) {
  if (!payments || payments.length === 0) {
    return "<p>Графік оплат не заповнений.</p>";
  }

  let rows = "";

  payments.forEach(function (payment) {
    rows += `
            <tr>
                <td>${escapeHtml(payment.paymentNo)}</td>
                <td>${escapeHtml(payment.amount)}</td>
                <td>${escapeHtml(payment.payDate)}</td>
                <td>${escapeHtml(payment.comment)}</td>
            </tr>
        `;
  });

  return `
        <table>
            <thead>
                <tr>
                    <th>№</th>
                    <th>${isVatPayer ? "Сума з ПДВ" : "Сума"}</th>
                    <th>Дата</th>
                    <th>Коментар</th>
                </tr>
            </thead>

            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
    .replaceAll("\n", "<br>");
}

function downloadWordDocument(html, data) {
  const projectName = data.general.projectName || "Brief";

  const safeFileName = makeSafeFileName("Brief_" + projectName + ".doc");

  const blob = new Blob(["\ufeff", html], {
    type: "application/msword;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = safeFileName;

  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function makeSafeFileName(fileName) {
  return fileName.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_");
}
