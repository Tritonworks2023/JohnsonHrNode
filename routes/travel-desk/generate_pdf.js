const fs = require("fs");
const PdfPrinter = require("pdfmake");
const moment = require("moment");
const path = require("path");
const baseURL = process.env.BASE_URL;

const generateTravelSummaryPDF = async (data) => {
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

    const travelDates = {
      from: moment(movement.LVFRMDT).format("DD-MM-YYYY"),
      to: moment(movement.LVTODT).format("DD-MM-YYYY"),
      dep_from: moment(movement.DEPARTUREDT).format("DD-MM-YYYY"),
      dep_to: moment(movement.RETURNDT).format("DD-MM-YYYY"),
    };

    const qrCode = movement?.qrcode || null;

    const header = [
      { text: `SEQ NO: ${movement.MOVEMENTID}` },
      { text: `EMP NO: ${employee.EMPNO}` },
      { text: `EMP GRADE: ${employee.GRADE}` },
      { text: `Branch Code: ${employee.BRCODE}` },
      { text: `EMP Name: ${employee.ENAME}` },
      { text: `From Date: ${travelDates.from}` },
      { text: `To Date: ${travelDates.to}` },
      { text: `Journey Mode: ${movement.JOURNEYMODE}` },
      { text: `Travel Mode: ${movement.TRAVELMODE}` },
      { text: `Advanced Amount: ${movement.ADVANCEAMT || "--"}` },
      { text: `From Location: ${movement.FROMLOC}` },
      { text: `To Location: ${movement.TOLOC}` },
      { text: `Departure Date: ${travelDates.dep_from}   Session - ${movement.FRMSESSION}` },
      { text: `Return Date: ${travelDates.dep_to}   Session - ${movement.TOSESSION}` },
    ];

    // Helper to sum amounts
    const sumAmount = (arr) =>
      Array.isArray(arr)
        ? arr.reduce((sum, item) => sum + (item?.amount || 0), 0)
        : 0;

    // Flatten all expenses and include TDA
    let allExpenses = expenceDetails.flatMap((detail) =>
      detail.expenses.map((exp) => ({
        ...exp,
        tda: detail.tda || 0,
      }))
    );

    // Sort by date ascending
    allExpenses.sort((a, b) => new Date(a.date) - new Date(b.date));

    let grandTotal = 0;

    // Table header
    const tableBody = [
      [
        "S.No",
        "Date",
        "TRAVEL",
        "COMPOSITE",
        "BOARDING",
        "TDA",
        "LODGING",
        "CONVEYANCE",
        "TOTAL AMOUNT",
      ].map((cell) => ({ text: cell, alignment: "center", bold: true, fontSize: 9 })),
    ];

    // Build table rows from sorted expenses
    allExpenses.forEach((exp, index) => {
      const formattedDate = moment(new Date(exp.date)).format("DD-MM-YYYY");

      const travelAmt = sumAmount(exp.TRAVEL?.amount);
      const compositeAmt = exp.COMPOSITE?.amount || 0;
      const boardingAmt = exp.BOARDING?.amount || 0;
      const lodgingAmt = exp.LODGING?.amount || 0;
      const conveyanceAmt = sumAmount(exp.CONVEYANCE?.amount);
      const TDAamt = exp.tda || 0;

      const totalAmt =
        travelAmt + compositeAmt + boardingAmt + TDAamt + lodgingAmt + conveyanceAmt;

      grandTotal += totalAmt;

      tableBody.push([
        { text: index + 1, alignment: "center", fontSize: 11 },
        { text: formattedDate, alignment: "center", fontSize: 11 },
        { text: travelAmt.toFixed(2), alignment: "center", fontSize: 11 },
        { text: compositeAmt.toFixed(2), alignment: "center", fontSize: 11 },
        { text: boardingAmt.toFixed(2), alignment: "center", fontSize: 11 },
        { text: TDAamt.toFixed(2), alignment: "center", fontSize: 11 },
        { text: lodgingAmt.toFixed(2), alignment: "center", fontSize: 11 },
        { text: conveyanceAmt.toFixed(2), alignment: "center", fontSize: 11 },
        { text: totalAmt.toFixed(2), alignment: "center", fontSize: 11 },
      ]);
    });

    // Add grand total row
    tableBody.push([
      { text: "Total", colSpan: 8, alignment: "right", bold: true },
      {},
      {},
      {},
      {},
      {},
      {},
      {},
      { text: grandTotal.toFixed(2), alignment: "center", bold: true },
    ]);

    // PDF definition
    const docDefinition = {
      content: [
        {
          table: {
            widths: ["auto", "*"],
            body: header.map((item) => [
              { text: item.text.split(":")[0], bold: true },
              { text: item.text.split(":")[1] || "", alignment: "left" },
            ]),
          },
          layout: {
            fillColor: (rowIndex) => (rowIndex === 0 ? "#f2f2f2" : null),
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            paddingLeft: () => 6,
            paddingRight: () => 6,
            paddingTop: () => 4,
            paddingBottom: () => 4,
          },
          margin: [0, 0, 0, 10],
        },
        { text: "Amount Details", style: "sectionHeader" },
        {
          table: {
            headerRows: 1,
            widths: [25, 60, 40, 60, 55, 40, 50, 50, 60],
            body: tableBody,
          },
          layout: {
            fillColor: (rowIndex) =>
              rowIndex === 0
                ? "#cccccc"
                : rowIndex % 2 === 0
                ? "#f9f9f9"
                : null,
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            paddingLeft: () => 6,
            paddingRight: () => 6,
            paddingTop: () => 4,
            paddingBottom: () => 4,
          },
          margin: [0, 10, 0, 10],
        },
      ],
      styles: {
        sectionHeader: { fontSize: 12, bold: true, decoration: "underline" },
      },
      footer: (currentPage, pageCount) => {
        const nowIST = new Date().toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        });
        return {
          text: `Printed on : ${nowIST}`,
          alignment: "right",
          fontSize: 9,
          margin: [0, 5, 20, 0],
        };
      },
    };

    // Add QR code if exists
    if (qrCode) {
      docDefinition.content.unshift({
        image: qrCode, // base64 image
        width: 100,
        height: 100,
        absolutePosition: { x: 450, y: 25 },
        alignment: "right",
      });
    }

    // PDF file path
    const dirPath = path.join(
      __dirname,
      "./../public/FINANCEDOCS",
      `${travel.employee.EMPNO}`,
      `${movement.MOVEMENTID}`
    );

    const filePath = path.join(
      dirPath,
      `${travel.employee.EMPNO}-${movement.MOVEMENTID}-${moment(
        expenceDetails[0].createdAt
      ).format("DD-MM-YYYY")}.pdf`
    );

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    pdfDoc.pipe(fs.createWriteStream(filePath));
    pdfDoc.end();

    return `https://smarthr.johnsonliftsltd.com:3001/api/public/FINANCEDOCS/${
      travel.employee.EMPNO
    }/${movement.MOVEMENTID}/${travel.employee.EMPNO}-${
      movement.MOVEMENTID
    }-${moment(expenceDetails[0].createdAt).format("DD-MM-YYYY")}.pdf`;
  } catch (error) {
    console.log(error, "Error generating PDF");
    return error;
  }
};

module.exports = { generateTravelSummaryPDF };
