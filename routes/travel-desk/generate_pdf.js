const fs = require("fs");
const PdfPrinter = require("pdfmake");
const moment = require("moment");
const path = require("path");
const { Session } = require("inspector/promises");
// const data = require("./data.json");
const baseURL = process.env.BASE_URL;

const generateTravelSummaryPDF = async (data) => {
  try {
    console.log(
      data,
      "================================== data ============================"
    );
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
    const { movement, employee, expenceDetails, tda } = travel;
    console.log(
      "=====================================================travel=================================================================",
      travel
    );
    console.log(
      expenceDetails,
      "============================ expenceDetails ======================="
    );
    const travelDates = {
      from: moment(movement.LVFRMDT).format("DD-MM-YYYY"),
      to: moment(movement.LVTODT).format("DD-MM-YYYY"),
      dep_from: moment(movement.DEPARTUREDT).format("DD-MM-YYYY"),
      dep_to: moment(movement.RETURNDT).format("DD-MM-YYYY"),
    };

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
      {text: `Departure Date: ${travelDates.dep_from}   Session - ${movement.FRMSESSION}`},
      {text: `Return Date: ${travelDates.dep_to}   Session - ${movement.TOSESSION}`},
      // {
      //   label: "Departure Date",
      //   value: `${travelDates.dep_from} (Session: ${movement.FRMSESSION})`,
      // },
      // {
      //   label: "Return Date",
      //   value: `${travelDates.dep_to} (Session: ${movement.TOSESSION})`,
      // },
    ];

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
      ].map((cell) => ({
        text: cell,
        alignment: "center",
        bold: true,
        fontSize: 9,
      })),
    ];

    let serial = 1;
    let grandTotal = 0;

    const sumAmount = (arr) =>
      Array.isArray(arr)
        ? arr.reduce((sum, item) => sum + (item?.amount || 0), 0)
        : 0;

    // const getTDAByDate = (date) => {
    //   const targetDate = moment.utc(date).startOf("day");
    //   const detail = expenceDetails.find((ed) =>
    //     ed.expenses.some((exp) =>
    //       moment.utc(exp.date).startOf("day").isSame(targetDate)
    //     )
    //   );

    //   if (!detail || !detail.expenseDeviationTDA) return 0;

    //   const tdaEntry = detail.expenseDeviationTDA.find((tda) =>
    //     moment.utc(tda.date).startOf("day").isSame(targetDate)
    //   );

    //   return (
    //     (tdaEntry?.COMPOSITE?.amount || 0) + (tdaEntry?.BOARDING?.amount || 0)
    //   );
    // };

    let allExpenses = expenceDetails.flatMap((d) => d.expenses);
    let totalRows = allExpenses.length;
    let globalIndex = 0; // Tracks index across all expense entries

    expenceDetails.forEach((detail) => {
      detail.expenses.forEach((exp) => {
        const isFirstRow = globalIndex === 0;
        const isLastRow = globalIndex === totalRows - 1;

        const formattedDate = moment(new Date(exp.date)).format("DD-MM-YYYY");

        const travelAmt = sumAmount(exp.TRAVEL?.amount);
        const compositeAmt = exp.COMPOSITE?.amount || 0;
        const boardingAmt = exp.BOARDING?.amount || 0;
        const lodgingAmt = exp.LODGING?.amount || 0;
        const conveyanceAmt = sumAmount(exp.CONVEYANCE?.amount);

        const TDAamt = detail.tda || 0;

        const totalAmt =
          travelAmt +
          compositeAmt +
          boardingAmt +
          (isFirstRow || isLastRow ? TDAamt : 0) + // Only include in total if showing
          lodgingAmt +
          conveyanceAmt;

        grandTotal += totalAmt;

        const row = [
          { text: serial++, alignment: "center", fontSize: 11 },
          { text: formattedDate, alignment: "center", fontSize: 11 },
          { text: travelAmt.toFixed(2), alignment: "center", fontSize: 11 },
          { text: compositeAmt.toFixed(2), alignment: "center", fontSize: 11 },
          { text: boardingAmt.toFixed(2), alignment: "center", fontSize: 11 },
          {
            text: isFirstRow || isLastRow ? TDAamt.toFixed(2) : 0,
            alignment: "center",
            fontSize: 11,
          },
          { text: lodgingAmt.toFixed(2), alignment: "center", fontSize: 11 },
          { text: conveyanceAmt.toFixed(2), alignment: "center", fontSize: 11 },
          { text: totalAmt.toFixed(2), alignment: "center", fontSize: 11 },
        ];

        tableBody.push(row);
        globalIndex++;
      });
    });

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
    };
    const dirPath = path.join(
      __dirname,
      "./../public/FINANCEDOCS",
      `${travel.employee.EMPNO}`,
      `${movement.MOVEMENTID}`
    );
    console.log(dirPath, "============== dirPath ==================");
    const filePath = path.join(
      dirPath,
      `${travel.employee.EMPNO}-${movement.MOVEMENTID}-${moment(
        expenceDetails[0].createdAt
      ).format("DD-MM-YYYY")}.pdf`
    );

    // Check if the directory exists, create it if not
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true }); // recursive: true ensures parent directories are created if needed
    }
    /*
  // Check if the file already exists
  if (fs.existsSync(filePath)) {
    console.log("File already exists:", filePath);
    return `https://smarthr.johnsonliftsltd.com:3001/api/public/${travel.employee.EMPNO}-${moment(
      expenceDetails[0].createdAt
    ).format("DD-MM-YYYY")}.pdf`;
  } else {
    // Now write the PDF
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    pdfDoc.pipe(fs.createWriteStream(filePath));
    pdfDoc.end(); // Ensure PDF is properly written
    console.log("PDF created successfully:", filePath);
    console.log(baseURL);
    return `https://smarthr.johnsonliftsltd.com:3001/api/public/${travel.employee.EMPNO}-${moment(
      expenceDetails[0].createdAt
    ).format("DD-MM-YYYY")}.pdf`;
  }
*/
    // Now write the PDF
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    pdfDoc.pipe(fs.createWriteStream(filePath));
    pdfDoc.end(); // Ensure PDF is properly written
    console.log("PDF created successfully:", filePath);
    console.log(baseURL);
    return `https://smarthr.johnsonliftsltd.com:3001/api/public/FINANCEDOCS/${
      travel.employee.EMPNO
    }/${movement.MOVEMENTID}/${travel.employee.EMPNO}-${
      movement.MOVEMENTID
    }-${moment(expenceDetails[0].createdAt).format("DD-MM-YYYY")}.pdf`;
  } catch (error) {
    console.log(
      error,
      "========================Error generating PDF==========="
    );
    return error;
  }
};

module.exports = { generateTravelSummaryPDF };
