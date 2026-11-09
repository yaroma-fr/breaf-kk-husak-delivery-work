document.addEventListener("DOMContentLoaded", function () {
  // Прибрати required з усіх полів форми
  document
    .querySelectorAll("#briefForm [required]")
    .forEach(function (el) {
      el.removeAttribute("required");
    });

  initAuthenticatedUserInfo();
  initAuthenticatedUserInfo();
  
  initDynamicFields();
  initStagesTable();
  initPaymentsTable();

  initExclusiveCheckboxGroup(
    "ipItems",
    "Ні, нічого з цього",
    handleIpDetailsVisibility,
  );

  initExclusiveCheckboxGroup("fileLinks", "Відсутній");

  handleIpDetailsVisibility();

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

function collectCheckedValues(name) {
  const checked = document.querySelectorAll(`input[name="${name}"]:checked`);

  return Array.from(checked).map(function (item) {
    return item.value;
  });
}

function validateCheckboxGroup(groupName, message) {
  const checkedItems = document.querySelectorAll(
    `input[name="${groupName}"]:checked`,
  );

  if (checkedItems.length === 0) {
    alert(message);
    return false;
  }

  return true;
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

    const user = authData.clientPrincipal;
    const userEmail = user.userDetails || "";

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
        const value = getRadioValue("documentType");

        showElementById("documentOtherRow", value === "Інше");
      });
    });

  // Місце реєстрації підрядника + ПДВ -> поля вартості
      document
        .querySelectorAll('input[name="contractorCountry"], input[name="contractorVat"]')
        .forEach(function (radio) {
          radio.addEventListener("change", updateCostFields);
        });

      updateCostFields();

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
        const value = getRadioValue("workedBefore");

        showElementById("workedBeforeDetailsRow", value === "Так");
      });
    });

  // Чи працює у Вчасно
  document.querySelectorAll('input[name="vchasno"]').forEach(function (radio) {
    radio.addEventListener("change", function () {
      const value = getRadioValue("vchasno");

      showElementById("vchasnoEmailRow", value === "Так" || value === "Інше");
    });
  });

  // Формат виконання -> Інше
  document
    .querySelectorAll('input[name="timingFormat"]')
    .forEach(function (radio) {
      radio.addEventListener("change", function () {
        const value = getRadioValue("timingFormat");

        // Поле для варіанту "Інше"
        showElementById("timingFormatOtherRow", value === "Інше");
        // Блок етапів робіт
        showElementById(
          "section-stages",
          value === "Кілька етапів і окремий акт по кожному етапу",
        );
      });
    });
}

function getCostLabel() {
  const country = getRadioValue("contractorCountry");
  const vat = getRadioValue("contractorVat");

  if (country === "Інша країна") {
    return "Повна сума до сплати";
  }

  if (country === "Україна" && vat === "Так") {
    return "Загальна вартість з ПДВ";
  }

  if (country === "Україна" && vat === "Ні") {
    return "Загальна вартість без ПДВ";
  }

  return ""; // ще не обрано достатньо відповідей
}

function updateCostFields() {
  const label = getCostLabel();
  const labelElement = document.getElementById("costAmountLabel");

  showElementById("costBlock", label !== "");

  if (labelElement && label) {
    labelElement.textContent = label;
  }

  if (!label) {
    document.getElementById("costAmount").value = "";
    document.getElementById("currency").value = "";
  }
}

function initExclusiveCheckboxGroup(groupName, noneValue, afterChange) {
  const checkboxes = document.querySelectorAll(`input[name="${groupName}"]`);

  checkboxes.forEach(function (checkbox) {
    checkbox.addEventListener("change", function () {
      const isNoneOption = checkbox.value === noneValue;

      if (isNoneOption && checkbox.checked) {
        checkboxes.forEach(function (item) {
          if (item.value !== noneValue) {
            item.checked = false;
          }
        });
      }

      if (!isNoneOption && checkbox.checked) {
        checkboxes.forEach(function (item) {
          if (item.value === noneValue) {
            item.checked = false;
          }
        });
      }

      if (typeof afterChange === "function") {
        afterChange();
      }
    });
  });
}

function handleIpDetailsVisibility() {
  const selectedIpItems = collectCheckedValues("ipItems");

  const shouldShowDetails =
    selectedIpItems.length > 0 &&
    !selectedIpItems.includes("Ні, нічого з цього");

  showElementById("ipDetailsBlock", shouldShowDetails);

  if (!shouldShowDetails) {
    const ipDescription = document.getElementById("ipDescription");
    const usageRestrictions = document.getElementById("usageRestrictions");
    const clientRights = document.getElementById("clientRights");

    if (ipDescription) {
      ipDescription.value = "";
    }

    if (usageRestrictions) {
      usageRestrictions.value = "";
    }

    if (clientRights) {
      clientRights.value = "";
    }
  }
}

/* ================================
   STAGES TABLE
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
            <textarea name="deliverName[]" placeholder="Назва"></textarea>
        </td>
        <td>
            <input name="deliverAmount[]" type="text" placeholder="штук">
        </td>
        <td>
            <input name="deliverCountry[]" type="text" placeholder="Країна">
        </td>
        <td>
            <input name="deliverCode[]" type="text" placeholder="Код">
        </td>
         <td>
            <input name="deliverCost[]" type="text" placeholder="Ціна">
        </td>
         <td>
            <input name="deliverVart[]" type="text" placeholder="Вартість">
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
      documentPurpose: getRadioValue("documentPurpose"),
      legalEntityType: getRadioValue("legalEntity"),
    },

    contractor: {
      activityName: getValue("activityName"),
      activityLocation: getValue("activityLocation"),
      activityDate: getValue("activityDate"),
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

    services: {
      serviceShortName: getValue("serviceShortName"),
      serviceDescription: getValue("serviceDescription"),
      clientContractReference: getValue("clientContractReference"),
      serviceExtation: getValue("serviceExtation"),
    },

    timing: {
      startDate: getValue("startDate"),
      finishDate: getValue("finishDate"),
      timingFormat: getTimingFormat(),
    },

    stages: collectStages(),

    cost: {
      country: getRadioValue("contractorCountry"),
      amountLabel: getCostLabel(),
      amount: getValue("costAmount"),
      currency: getValue("currency"),
    },

    payments: collectPayments(),

    intellectualProperty: {
      ipItems: collectCheckedValues("ipItems"),
      ipDescription: getValue("ipDescription"),
      usageRestrictions: getValue("usageRestrictions"),
      clientRights: getValue("clientRights"),
    },

    risks: {
      riskConditions: getValue("riskConditions"),
    },

    files: {
      fileLinks: collectCheckedValues("fileLinks"),
      additionalLinks: getValue("additionalLinks"),
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

function getTimingFormat() {
  const value = getRadioValue("timingFormat");

  if (value === "Інше") {
    return getValue("timingFormatOther");
  }

  return value;
}

function collectStages() {
  const timingFormat = getRadioValue("timingFormat");

  if (timingFormat !== "Кілька етапів і окремий акт по кожному етапу") {
    return [];
  }

  const rows = document.querySelectorAll("#stagesTable tbody tr");

  return Array.from(rows).map(function (row, index) {
    return {
      stageNo: index + 1,
      delName: row.querySelector('[name="deliverName[]"]')?.value.trim() || "",
      delAmount: row.querySelector('[name="deliverAmount[]"]')?.value.trim() || "",
      delCountry: row.querySelector('[name="deliverCountry[]"]')?.value.trim() || "",
      delCode: row.querySelector('[name="deliverCode[]"]')?.value.trim() || "",
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

function initDownloadWordButton() {
  const button = document.getElementById("downloadWordBtn");
  const form = document.getElementById("briefForm");

  if (!button) {
    console.warn("downloadWordBtn not found");
    return;
  }

  if (!form) {
    console.warn("briefForm not found");
    return;
  }

  button.addEventListener("click", function () {
    // 1. Перевірка стандартних required-полів
    // if (!form.checkValidity()) {
    //   alert("Заповніть усі обов'язкові поля перед завантаженням Word.");

    //   // Показує стандартні браузерні підказки біля незаповнених полів
    //   form.reportValidity();

    //   return;
    // }

    // 2. Перевірка обов'язкових checkbox-груп
    // if (
    //   !validateCheckboxGroup(
    //     "ipItems",
    //     "Оберіть варіант у блоці «Інтелектуальна власність».",
    //   )
    // ) {
    //   return;
    // }

    // if (
    //   !validateCheckboxGroup(
    //     "fileLinks",
    //     "Оберіть варіант у блоці «Файли та посилання».",
    //   )
    // ) {
    //   return;
    // }

    // 3. Якщо все заповнено, формуємо Word
    const data = collectBriefData();
    const html = buildWordDocumentHtml(data);

    downloadWordDocument(html, data);
  });
}

function buildWordDocumentHtml(data) {
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

    <h1>Бриф для договору з підрядником</h1>

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
          data.legal.fopName
            ? `
                <tr>
                    <td class="label">Назва ФОП</td>
                    <td class="value">${escapeHtml(data.legal.fopName)}</td>
                </tr>
        `
            : ""
        }
        ${
          data.legal.legalOther
            ? `
        <tr>
            <td class="label">Інша юридична особа</td>
            <td class="value">${escapeHtml(data.legal.legalOther)}</td>
        </tr>
         `
            : ""
        }

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
     

        <tr>
            <td class="label">Мета послуг за документом</td>
            <td class="value">${escapeHtml(data.legal.documentPurpose)}</td>
        </tr>
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

    <h2>3. Що саме має зробити підрядник</h2>

    <table>
        <tr>
            <td class="label">Коротка назва послуг / робіт</td>
            <td class="value">${escapeHtml(data.services.serviceShortName)}</td>
        </tr>

        <tr>
            <td class="label">Детальний опис послуг / робіт</td>
            <td class="value">${escapeHtml(data.services.serviceDescription)}</td>
        </tr>

    </table>

    <h2>4. ТЗ/Замовлення Клієнта/Додаток</h2>

    <table>
        <tr>
            <td class="label">За яким ТЗ/Додатком/Замовлення плануємо закриватись (у разі наявності інформації)</td>
            <td class="value">${escapeHtml(data.services.serviceExtation)}</td>
        </tr>
    </table>

    <h2>5. Строки виконання</h2>

    <table>
        <tr>
            <td class="label">Дата початку</td>
            <td class="value">${escapeHtml(data.timing.startDate)}</td>
        </tr>

        <tr>
            <td class="label">Дата завершення</td>
            <td class="value">${escapeHtml(data.timing.finishDate)}</td>
        </tr>

        <tr>
            <td class="label">Формат виконання</td>
            <td class="value">${escapeHtml(data.timing.timingFormat)}</td>
        </tr>
    </table>

    ${
      data.stages && data.stages.length > 0
        ? `
        <h2>Етапи робіт</h2>
        ${buildStagesWordTable(data.stages)}
    `
        : ""
    }

        <h2>6. Вартість і порядок оплати</h2>

    <table>
        <tr>
            <td class="label">6.1. Місце реєстрації підрядника</td>
            <td class="value">${escapeHtml(data.cost.country)}</td>
        </tr>

        ${
          data.cost.amountLabel
            ? `
        <tr>
            <td class="label">6.2. ${escapeHtml(data.cost.amountLabel)}</td>
            <td class="value">${escapeHtml(data.cost.amount)}</td>
        </tr>

        <tr>
            <td class="label">Валюта</td>
            <td class="value">${escapeHtml(data.cost.currency)}</td>
        </tr>
        `
            : ""
        }
    </table>

    ${buildPaymentsWordTable(data.payments)}

    <h2>7. Інтелектуальна власність</h2>

    <table>
        <tr>
            <td class="label">Підрядник створює</td>
            <td class="value">${escapeHtml(data.intellectualProperty.ipItems.join(", "))}</td>
        </tr>

     ${
       data.intellectualProperty.ipItems.length > 0 &&
       !data.intellectualProperty.ipItems.includes("Ні, нічого з цього")
         ? `
        <tr>
            <td class="label">Якщо так, що саме створюється?</td>
            <td class="value">${escapeHtml(data.intellectualProperty.ipDescription)}</td>
        </tr>

        <tr>
            <td class="label">Чи є обмеження щодо використання результату</td>
            <td class="value">${escapeHtml(data.intellectualProperty.usageRestrictions)}</td>
        </tr>

        <tr>
            <td class="label">Чи потрібні авторські права клієнту (банку)</td>
            <td class="value">${escapeHtml(data.intellectualProperty.clientRights)}</td>
        </tr>
    `
         : ""
     }
    </table>

    <h2>8. Додаткові та ризикові умови</h2>

    <table>
        <tr>
            <td class="label">Будь-які домовленості з підрядником, 
            які обов’язково потрібно включити в документ</td>
            <td class="value">${escapeHtml(data.risks.riskConditions)}</td>
        </tr>
    </table>

    <h2>9. Файли та посилання</h2>

    <table>
        <tr>
            <td class="label">Чи наявний будь-який документ з підрядником, 
            що описує або деталізує послугу? </td>
            <td class="value">${escapeHtml(data.files.fileLinks.join(", "))}</td>
        </tr>

        <tr>
            <td class="label">Посилання / коментарі</td>
            <td class="value">${escapeHtml(data.files.additionalLinks)}</td>
        </tr>
    </table>

</body>
</html>
    `;
}

function buildStagesWordTable(stages) {
  if (!stages || stages.length === 0) {
    return "<p>Етапи не заповнені.</p>";
  }

  let rows = "";

  stages.forEach(function (stage) {
    rows += `
            <tr>
                <td>${escapeHtml(stage.stageNo)}</td>
                <td>${escapeHtml(stage.delName)}</td>
                <td>${escapeHtml(stage.delAmount)}</td>
                <td>${escapeHtml(stage.delCountry)}</td>
                <td>${escapeHtml(stage.delCode)}</td>
                <td>${escapeHtml(stage.delCost)}</td>
                <td>${escapeHtml(stage.delVart)}</td>
            </tr>
        `;
  });

  return `
        <table>
            <thead>
                <tr>
                    <th>Етап</th>
                    <th>Що виконується</th>
                    <th>Період</th>
                    <th>Сума</th>
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
