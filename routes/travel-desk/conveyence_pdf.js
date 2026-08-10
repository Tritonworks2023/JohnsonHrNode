const fs = require("fs");
const PdfPrinter = require("pdfmake");
const moment = require("moment");
const path = require("path");

const generateconveyanceSummaryPDF = async (data) => {
  try {
    const fonts = {
      Roboto: {
        normal: "Helvetica",
        bold: "Helvetica-Bold",
        italics: "Helvetica-Oblique",
        bolditalics: "Helvetica-BoldOblique",
      },
    };

    const printer = new PdfPrinter(fonts);

    const travel = data;
    const { movement, employee, expenceDetails } = travel;

    let conveyanceRows = [];

    expenceDetails.forEach((detail) => {
      detail.expenses.forEach((exp) => {
        if (
          exp.CONVEYANCE &&
          Array.isArray(exp.CONVEYANCE.amount) &&
          exp.CONVEYANCE.amount.length > 0
        ) {
          exp.CONVEYANCE.amount.forEach((item) => {
            if (item.amount > 0 || item.fromLoc || item.toLoc) {
              conveyanceRows.push({
                date: exp.date,
                from: item.fromLoc || "--",
                to: item.toLoc || "--",
                amount: item.amount || 0,
              });
            }
          });
        }
      });
    });

    conveyanceRows.sort((a, b) => new Date(a.date) - new Date(b.date));

    // NO DATA PDF
    if (conveyanceRows.length === 0) {
      const docDefinition = {
        pageMargins: [30, 40, 30, 40],

        content: [
          {
            text: "CONVEYANCE CLAIM SUMMARY",
            style: "header",
            alignment: "center",
            margin: [0, 0, 0, 20],
          },

          // TOP DETAILS
          {
            columns: [
              [
                {
                  text: [
                    { text: "EMP NO : ", bold: true },
                    { text: employee.EMPNO || "--" },
                  ],
                  fontSize: 11,
                  alignment: "left",
                },
              ],

              [
                {
                  text: [
                    { text: "MOVEMENT ID : ", bold: true },
                    { text: movement.MOVEMENTID || "--" },
                  ],
                  fontSize: 11,
                  alignment: "center",
                },
              ],

              [
                {
                  text: [
                    { text: "EMP NAME : ", bold: true },
                    { text: employee.ENAME || "--" },
                  ],
                  fontSize: 11,
                  alignment: "right",
                },
              ],
            ],

            margin: [0, 0, 0, 25],
          },

          {
            text: "No conveyance data found for this period",
            alignment: "center",
            fontSize: 12,
            bold: true,
            margin: [0, 50, 0, 0],
          },
        ],

        styles: {
          header: {
            fontSize: 16,
            bold: true,
          },
        },

        footer: (currentPage, pageCount) => {
          return {
            text: `Page ${currentPage} of ${pageCount}`,
            alignment: "center",
            fontSize: 9,
          };
        },
      };

      const dirPath = path.join(
        __dirname,
        "./../public/FINANCEDOCS",
        `${employee.EMPNO}`,
        `${movement.MOVEMENTID}`
      );

      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      const fileName = `${employee.EMPNO}-${movement.MOVEMENTID}-CONVEYANCE.pdf`;
      const filePath = path.join(dirPath, fileName);

      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      pdfDoc.pipe(fs.createWriteStream(filePath));
      pdfDoc.end();

      return `https://smarthr.johnsonliftsltd.com:3001/api/public/FINANCEDOCS/${employee.EMPNO}/${movement.MOVEMENTID}/${fileName}`;
    }

    let grandTotal = 0;

    const tableBody = [
      [
        {
          text: "S.No",
          bold: true,
          alignment: "center",
          fillColor: "#e6e6e6",
          margin: [0, 8, 0, 8],
        },
        {
          text: "Date",
          bold: true,
          alignment: "center",
          fillColor: "#e6e6e6",
          margin: [0, 8, 0, 8],
        },
        {
          text: "From Location",
          bold: true,
          alignment: "center",
          fillColor: "#e6e6e6",
          margin: [0, 8, 0, 8],
        },
        {
          text: "To Location",
          bold: true,
          alignment: "center",
          fillColor: "#e6e6e6",
          margin: [0, 8, 0, 8],
        },
        {
          text: "Amount",
          bold: true,
          alignment: "center",
          fillColor: "#e6e6e6",
          margin: [0, 8, 0, 8],
        },
      ],
    ];

    conveyanceRows.forEach((item, index) => {
      grandTotal += Number(item.amount);

      tableBody.push([
        {
          text: index + 1,
          alignment: "center",
          fontSize: 10,
          margin: [0, 6, 0, 6],
        },
        {
          text: moment(item.date, "DD-MM-YYYY").format("DD-MM-YYYY"),
          alignment: "center",
          fontSize: 10,
          margin: [0, 6, 0, 6],
        },
        {
          text: item.from,
          alignment: "left",
          fontSize: 10,
          margin: [6, 6, 0, 6],
        },
        {
          text: item.to,
          alignment: "left",
          fontSize: 10,
          margin: [6, 6, 0, 6],
        },
        {
          text: Number(item.amount).toFixed(2),
          alignment: "right",
          fontSize: 10,
          margin: [0, 6, 6, 6],
        },
      ]);
    });

    // GRAND TOTAL ROW
    tableBody.push([
      {
        text: "Grand Total",
        colSpan: 4,
        alignment: "right",
        bold: true,
        fillColor: "#f2f2f2",
        margin: [0, 8, 10, 8],
      },
      {},
      {},
      {},
      {
        text: `${grandTotal.toFixed(2)}`,
        alignment: "right",
        bold: true,
        fillColor: "#f2f2f2",
        margin: [0, 8, 6, 8],
      },
    ]);

    const docDefinition = {
      pageMargins: [30, 40, 30, 40],

      content: [
        // TITLE
        {
          text: "CONVEYANCE CLAIM SUMMARY",
          style: "header",
          alignment: "center",
          margin: [0, 0, 0, 20],
        },

        // TOP DETAILS
        {
          columns: [
            [
              {
                text: [
                  { text: "EMP NO : ", bold: true },
                  { text: employee.EMPNO || "--" },
                ],
                fontSize: 11,
                alignment: "left",
              },
            ],

            [
              {
                text: [
                  { text: "Seq No : ", bold: true },
                  { text: movement.MOVEMENTID || "--" },
                ],
                fontSize: 11,
                alignment: "center",
              },
            ],

            [
              {
                text: [
                  { text: "EMP NAME : ", bold: true },
                  { text: employee.ENAME || "--" },
                ],
                fontSize: 11,
                alignment: "right",
              },
            ],
          ],

          margin: [0, 0, 0, 20],
        },

        // MAIN TABLE
        {
          table: {
            headerRows: 1,
            widths: [45, 90, "*", "*", 90],
            body: tableBody,
          },

          layout: {
            hLineWidth: () => 0.7,
            vLineWidth: () => 0.7,
            hLineColor: () => "#c5c5c5",
            vLineColor: () => "#c5c5c5",

            paddingLeft: () => 4,
            paddingRight: () => 4,
            paddingTop: () => 2,
            paddingBottom: () => 2,
          },
        },
      ],

      styles: {
        header: {
          fontSize: 16,
          bold: true,
        },
      },

      footer: (currentPage, pageCount) => {
        return {
          text: `Page ${currentPage} of ${pageCount}`,
          alignment: "center",
          fontSize: 9,
        };
      },
    };

    const dirPath = path.join(
      __dirname,
      "./../public/FINANCEDOCS",
      `${employee.EMPNO}`,
      `${movement.MOVEMENTID}`
    );

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const fileName = `${employee.EMPNO}-${movement.MOVEMENTID}-CONVEYANCE.pdf`;
    const filePath = path.join(dirPath, fileName);

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    pdfDoc.pipe(fs.createWriteStream(filePath));
    pdfDoc.end();

    return `https://smarthr.johnsonliftsltd.com:3001/api/public/FINANCEDOCS/${employee.EMPNO}/${movement.MOVEMENTID}/${fileName}`;
  } catch (error) {
    console.log(error, "PDF Error");
    return error;
  }
};

module.exports = { generateconveyanceSummaryPDF };