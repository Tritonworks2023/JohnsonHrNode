const moment = require("moment");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const PdfPrinter = require("pdfmake");

// Convert image URL to Base64
const getBase64FromUrl = async (url) => {
  try {
    const resp = await axios.get(url, { responseType: "arraybuffer" });
    const mime = resp.headers["content-type"];
    const b64 = Buffer.from(resp.data, "binary").toString("base64");
    return `data:${mime};base64,${b64}`;
  } catch {
    return null;
  }
};

const generateTravelDetailSummaryPDF = async (data) => {
  const fonts = {
    Roboto: {
      normal: "Helvetica",
      bold: "Helvetica-Bold",
      italics: "Helvetica-Oblique",
      bolditalics: "Helvetica-BoldOblique",
    },
  };
  const printer = new PdfPrinter(fonts);
  const { movement, employee, expenceDetails, tda } = data;

  // Helper to safely uppercase text
  const up = (txt) => (txt ? txt.toString().toUpperCase() : "");

  // === HEADER TABLE ===
  const headerRows =
    movement && employee
      ? [
          ["SEQ NO", { text: up(movement.MOVEMENTID), alignment: "left" }],
          ["EMP NO", { text: up(employee.EMPNO), alignment: "left" }],
          ["BRANCH CODE", { text: up(employee.BRCODE), alignment: "left" }],
          ["EMP NAME", { text: up(employee.ENAME), alignment: "left" }],
          ["GRADE", { text: up(employee.GRADE), alignment: "left" }],
          ["FROM DATE", { text: up(movement.LVFRMDT), alignment: "left" }],
          ["TO DATE", { text: up(movement.LVTODT), alignment: "left" }],
          [
            "JOURNEY MODE",
            { text: up(movement.JOURNEYMODE), alignment: "left" },
          ],
          ["TRAVEL MODE", { text: up(movement.TRAVELMODE), alignment: "left" }],
          [
            "ADVANCE AMOUNT",
            {
              text: movement.ADVANCEAMT?.toFixed(2) || "--",
              alignment: "left",
            },
          ],
          ["FROM LOCATION", { text: up(movement.FROMLOC), alignment: "left" }],
          ["TO LOCATION", { text: up(movement.TOLOC), alignment: "left" }],
        ]
      : [];

  const content = [
    {
      table: {
        widths: ["auto", "*"],
        body: headerRows,
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => "#aaa",
        vLineColor: () => "#aaa",
        paddingTop: () => 5,
        paddingBottom: () => 5,
      },
      margin: [0, 0, 0, 20],
    },
  ];

  // === EXPENSE DETAIL TABLE ===
  const detailTableBody = [
    [
      { text: "S.NO", bold: true, fontSize: 9, alignment: "left" },
      { text: "DATE", bold: true, fontSize: 9, alignment: "left" },
      { text: "TYPE", bold: true, fontSize: 9, alignment: "left" },
      { text: "FROM", bold: true, fontSize: 9, alignment: "left" },
      { text: "TO", bold: true, fontSize: 9, alignment: "left" },
      { text: "DESCRIPTION", bold: true, fontSize: 9, alignment: "left" },
      { text: "AMOUNT", bold: true, fontSize: 9, alignment: "right" },
    ],
  ];

  const dateSerialMap = {};
  let serialCounter = 1;
  let grandTotal = 0;
  const allReceipts = [];
  let previousType = null;
  let rowSpanCounter = 1;
  let firstRowIndex = 0;

  for (const detail of expenceDetails || []) {
    for (const exp of detail.expenses || []) {
      const dt = exp.date
        ? moment(exp.date, "DD-MM-YYYY").format("DD-MM-YYYY")
        : "";

      let currentSno;
      if (dateSerialMap[dt]) {
        currentSno = dateSerialMap[dt];
      } else {
        currentSno = serialCounter++;
        dateSerialMap[dt] = currentSno;
      }

      const tempRows = [];
      let firstDateRowIndex = null;
      let rowCountForDate = 0;

      for (const type of [
        "TRAVEL",
        "COMPOSITE",
        "BOARDING",
        "LODGING",
        "CONVEYANCE",
      ]) {
        const obj = exp[type];
        const description = up(obj?.description || "");

        // Handle amount as array or number
        let amountArray = [];
        if (Array.isArray(obj?.amount)) {
          amountArray = obj.amount;
        } else if (typeof obj?.amount === "number") {
          amountArray = [obj.amount];
        }

        if (amountArray.length > 0) {
          amountArray.forEach((amtObj, idx) => {
            let fromLoc = "",
              toLoc = "",
              amount = 0;

            if (typeof amtObj === "object") {
              fromLoc = up(amtObj?.fromLoc || "");
              toLoc = up(amtObj?.toLoc || "");
              amount = amtObj?.modified_amount ?? amtObj?.amount ?? 0;
            } else {
              amount = amtObj;
            }

            if (type === previousType) {
              rowSpanCounter++;
              tempRows[firstRowIndex][2] = {
                text: up(type),
                fontSize: 8,
                rowSpan: rowSpanCounter,
                alignment: "left",
                verticalAlignment: "middle",
              };
              tempRows[firstRowIndex][5] = {
                text: description,
                fontSize: 8,
                rowSpan: rowSpanCounter,
                alignment: "left",
                verticalAlignment: "middle",
              };

              tempRows.push([
                "", // empty because merged below
                "", // empty because merged below
                "", // spanned from above
                { text: fromLoc, fontSize: 8, alignment: "left" },
                { text: toLoc, fontSize: 8, alignment: "left" },
                "", // spanned from above
                { text: amount.toFixed(2), fontSize: 8, alignment: "right" },
              ]);
            } else {
              previousType = type;
              rowSpanCounter = 1;
              firstRowIndex = tempRows.length;
              tempRows.push([
                { text: currentSno, fontSize: 8, alignment: "left" }, // will be merged later
                { text: up(dt), fontSize: 8, alignment: "left" }, // will be merged later
                { text: up(type), fontSize: 8, alignment: "left" },
                { text: fromLoc, fontSize: 8, alignment: "left" },
                { text: toLoc, fontSize: 8, alignment: "left" },
                { text: description, fontSize: 8, alignment: "left" },
                { text: amount.toFixed(2), fontSize: 8, alignment: "right" },
              ]);
            }
            grandTotal += amount;
            rowCountForDate++;
          });
        } else {
          if (type === previousType) {
            rowSpanCounter++;
            tempRows[firstRowIndex][2] = {
              text: up(type),
              fontSize: 8,
              rowSpan: rowSpanCounter,
              alignment: "left",
              verticalAlignment: "middle",
            };
            tempRows[firstRowIndex][5] = {
              text: description,
              fontSize: 8,
              rowSpan: rowSpanCounter,
              alignment: "left",
              verticalAlignment: "middle",
            };

            tempRows.push([
              "", // merged above
              "", // merged above
              "", // spanned from above
              { text: "", fontSize: 8, alignment: "left" },
              { text: "", fontSize: 8, alignment: "left" },
              "", // spanned from above
              { text: "0.00", fontSize: 8, alignment: "right" },
            ]);
            rowCountForDate++;
          } else {
            previousType = type;
            rowSpanCounter = 1;
            firstRowIndex = tempRows.length;
            tempRows.push([
              { text: currentSno, fontSize: 8, alignment: "left" }, // will be merged later
              { text: up(dt), fontSize: 8, alignment: "left" }, // will be merged later
              { text: up(type), fontSize: 8, alignment: "left" },
              { text: "", fontSize: 8, alignment: "left" },
              { text: "", fontSize: 8, alignment: "left" },
              { text: description, fontSize: 8, alignment: "left" },
              { text: "0.00", fontSize: 8, alignment: "right" },
            ]);
            rowCountForDate++;
          }
        }

        if (obj?.receipt) {
          allReceipts.push({
            date: dt,
            type: type,
            receipts: Array.isArray(obj.receipt) ? obj.receipt : [obj.receipt],
          });
        }
      }

      // Merge S.NO and Date cells vertically by setting rowSpan on the first row for this date group:
      if (tempRows.length > 0) {
        tempRows[0][0] = {
          text: currentSno,
          fontSize: 8,
          alignment: "left",
          rowSpan: rowCountForDate,
          verticalAlignment: "middle",
        };
        tempRows[0][1] = {
          text: up(dt),
          fontSize: 8,
          alignment: "left",
          rowSpan: rowCountForDate,
          verticalAlignment: "middle",
        };

        for (let i = 1; i < rowCountForDate; i++) {
          tempRows[i][0] = "";
          tempRows[i][1] = "";
        }
      }

      // TDA row
      const tdaAmount = detail?.tda || 0;
      tempRows.push([
        "", // merged above for S.NO and Date, so empty here
        "",
        { text: "TDA", fontSize: 8, alignment: "left" },
        { text: "", fontSize: 8, alignment: "left" },
        { text: "", fontSize: 8, alignment: "left" },
        { text: "", fontSize: 8, alignment: "left" },
        { text: tdaAmount.toFixed(2), fontSize: 8, alignment: "right" },
      ]);
      grandTotal += tdaAmount;
      previousType = null;

      detailTableBody.push(...tempRows);
    }
  }

  // Grand total row
  detailTableBody.push([
    {
      text: "GRAND TOTAL",
      colSpan: 6,
      alignment: "right",
      bold: true,
      fontSize: 9,
      margin: [0, 5, 0, 5],
    },
    "",
    "",
    "",
    "",
    "",
    {
      text: grandTotal.toFixed(2),
      alignment: "right",
      bold: true,
      fontSize: 9,
      margin: [0, 5, 0, 5],
    },
  ]);

  content.push({
    text: "EXPENSE DETAILS",
    style: "subheader",
    margin: [0, 0, 0, 8],
  });
  content.push({
    table: {
      headerRows: 1,
      widths: [25, 50, 60, 60, 60, "*", 60],
      body: detailTableBody,
    },
    layout: {
      fillColor: (i) => (i === 0 ? "#d3d3d3" : i % 2 === 0 ? "#f9f9f9" : null),
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => "#aaa",
      vLineColor: () => "#aaa",
      paddingTop: () => 5,
      paddingBottom: () => 5,
    },
  });

  // === ADD RECEIPTS SECTION ===
  if (allReceipts.length > 0) {
    const validReceipts = allReceipts.filter(
      (group) => Array.isArray(group.receipts) && group.receipts.length > 0
    );

    if (validReceipts.length > 0) {
      content.push({
        text: "RECEIPTS",
        style: "subheader",
        margin: [0, 20, 0, 10],
      });

      for (const receiptGroup of validReceipts) {
        content.push({
          text: `${up(receiptGroup.type)} - ${up(receiptGroup.date)}`,
          style: "receiptHeader",
          margin: [0, 10, 0, 5],
        });

        // Parallel fetching of images for speed
        const imagePromises = receiptGroup.receipts.map((url) =>
          getBase64FromUrl(url)
        );
        const b64Images = await Promise.all(imagePromises);

        const imageColumns = b64Images.filter(Boolean).map((b64) => ({
          image: b64,
          width: 160,
          margin: [0, 0, 10, 10],
          alignment: "center",
        }));

        for (let i = 0; i < imageColumns.length; i += 3) {
          const row = imageColumns.slice(i, i + 3);
          content.push({
            columns: row,
            columnGap: 10,
          });
        }
      }
    }
  }

  // === WRITE PDF ===
  const docDef = {
    content,
    styles: {
      subheader: {
        fontSize: 12,
        bold: true,
        alignment: "center",
        margin: [0, 0, 0, 10],
      },
      receiptHeader: {
        fontSize: 11,
        bold: true,
        color: "#444",
        alignment: "center",
        margin: [0, 5, 0, 5],
      },
    },
  };

  const dir = path.resolve(
    __dirname,
    "../public/FINANCEDOCS",
    employee.EMPNO,
    movement.MOVEMENTID
  );

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filename = `${employee.EMPNO}-${movement.MOVEMENTID}-${moment().format(
    "DD-MM-YYYY"
  )}(1).pdf`;
  const filepath = path.join(dir, filename);

  const pdfDoc = printer.createPdfKitDocument(docDef);

  await new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(filepath);
    pdfDoc.pipe(writeStream);
    pdfDoc.end();

    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });

  return `https://smarthr.johnsonliftsltd.com:3001/api/public/FINANCEDOCS/${employee.EMPNO}/${movement.MOVEMENTID}/${filename}`;
};

module.exports = { generateTravelDetailSummaryPDF };
