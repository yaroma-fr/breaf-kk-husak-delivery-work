document.addEventListener("DOMContentLoaded", function () {
  initAuthenticatedUserInfo();

  initDynamicFields();
  initStagesTable();
  initPaymentsTable();
  initDeliveryBlock();

  initDownloadWordButton();
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
  let total = 0;

  document.querySelectorAll("#stagesTable tbody tr").forEach(function (row) {
    const qty = parseNumber(
      row.querySelector('[name="deliverAmount[]"]')?.value,
    );
    const price = parseNumber(
      row.querySelector('[name="deliverCost[]"]')?.value,
    );
    const sum = qty * price;
    const out = row.querySelector('[name="deliverVart[]"]');

    if (out) {
      out.value = sum ? sum.toFixed(2) : "";
    }

    total += sum;
  });

  const isVatPayer = getRadioValue("contractorVat") === "Так";
  const vat = total * 0.2;

  document.getElementById("totalNoVat").value = total ? total.toFixed(2) : "";
  document.getElementById("totalVat").value =
    isVatPayer && total ? vat.toFixed(2) : "";
  document.getElementById("totalWithVat").value =
    isVatPayer && total ? (total + vat).toFixed(2) : "";

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
            <input name="deliverCost[]" type="text" placeholder="Ціна">
        </td>
        <td>
            <input name="deliverVart[]" type="text" readonly placeholder="Авто">
        </td>
        <td>
            <button type="button" class="icon-button remove-row">×</button>
        </td>
    `;

  tbody.appendChild(row);
  renumberStages();
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
    const data = collectBriefData();
    const html = buildWordDocumentHtml(data);

    downloadWordDocument(html, data);
  });
}

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

    ${buildItemsWordTable(data.items)}

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

    ${buildPaymentsWordTable(data.payments)}

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

function buildItemsWordTable(items) {
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
                </tr>
            </thead>

            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}

function buildPaymentsWordTable(payments) {
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
                    <th>Сума</th>
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