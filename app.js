
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const compression = require("compression");
const responseMiddleware = require("./middlewares/response.middleware");

console.log("====process.env", process.env.NODE_ENV);

const dotenv = require("dotenv");
const environment = process.env.NODE_ENV || "production";
const envPath = path.resolve(__dirname, `.env.${environment}`);
dotenv.config({ path: envPath });
const baseURL = process.env.BASE_URL;
const apiURL = `${baseURL}/api`;
console.log("====__dirname", __dirname);
console.log("====envPath", envPath);
console.log("===baseURL", baseURL);
console.log("===apiURL", apiURL);
/*Database connectivity*/

//const { initializeMainOracleConnectionPool, initializeIOTOracleConnectionPool, closeMainOracleConnectionPool, closeIOTOracleConnectionPool } = require('./config/oracle');
const {
  closeOracleConnectionPool,
  closeIOTOracleConnectionPool,
} = require("./config/oracle");

// Function to gracefully shut down the application
async function shutdown() {
  try {
    // close main oracle connection pool
    await closeOracleConnectionPool();
    console.log("main oracle connection pool closed successfully");
    // close iot oracle connection pool
    await closeIOTOracleConnectionPool();
    console.log("iot oracle connection pool closed successfully");
    // you can add other shutdown tasks here
    process.exit(0); // exit the process after successfully closing the connection pools
  } catch (err) {
    console.error("error during shutdown:", err);
    process.exit(1);
  }
}

// Register the shutdown function to handle process termination signals
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);


// HR MODULE CRON END

// Oracle Repush Failed Jobs
// const oracle_repush = require("./routes/oracle_repush.routes");
// const cronJobs = require("./routes/cronJobs");

//Admin
// const mrReportRoutes = require("./routes/admin/mrReportRoutes");
// const oracleReports = require("./routes/admin/oracleReports");
// const oracleRepushReports = require("./routes/admin/oracle_repush_reports");

// HR MODULES
const employeeRoutes = require("./routes/hr-admin/employeeRoutes");
const employeeMobileRoutes = require("./routes/hr-admin/employeeMobileRoutes");
const oracleSyncRoutes = require("./routes/hr-admin/oracleSyncRoutes");
const branchRoutes = require("./routes/hr-admin/branchRoutes");
const holidayRoutes = require("./routes/hr-admin/holidayRoutes");
const testCronRoutes = require("./routes/hr-admin/testCronRoutes");
const pushNotificationRoutes = require("./routes/hr-admin/pushNotificationRoutes");
const employeeTrackingRoutes = require("./routes/hr-admin/employeeTrackingRoutes");

// TRAVEL DESK
const movementRoutes = require("./routes/travel-desk/movementRoutes");
const travelRoutes = require("./routes/travel-desk/travelRoutes");

const movementAdminRoutes = require("./routes/travel-desk/movementAdminRoutes");
const travelAdminRoutes = require("./routes/travel-desk/travelAdminRoutes");

const app = express();

app.use(fileUpload());
app.use(responseMiddleware());

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");
app.set("view engine", "pug");

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(compression());

/*Response settings*/

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers,X-Access-Token,XKey,Authorization"
  );
  next();
});

app.post("/test", async (req, res) => {
  try {
    res.json({
      Status: "Success",
      Message: "API test",
      Data: {},
      Code: 200,
    });
  } catch (error) {
    res.json({
      Status: "Failed",
      Message: "No File Found",
      Data: {},
      Code: 404,
    });
  }
});


app.post("/hrModule/fileUpload", async (req, res) => {
  try {
    var sampleFile = req.files.sampleFile;
    if (!sampleFile) {
      return res.json({
        Status: "Failed",
        Message: "No File Found",
        Data: {},
        Code: 404,
      });
    }
    var exten = sampleFile.name.split(".");
    var filetype = exten[exten.length - 1];
    var name = `${new Date().getTime()}.${filetype}`;

    var uploadPath = path.join(__dirname, "/public/HR_IMAGES", name);
    var Finalpath = `${apiURL}/HR_IMAGES/${name}`;

    await sampleFile.mv(uploadPath);

    res.json({
      Status: "Success",
      Message: "File upload success",
      Data: Finalpath,
      Code: 200,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Data: {},
      Code: 500,
    });
  }
});

app.post("/travelDesk/fileUpload", async (req, res) => {
  try {
    console.log("=====req.body====", req.body);
    console.log("=====req.body====", req.files);
    var sampleFile = req.files.image;
    if (!sampleFile) {
      return res.json({
        Status: "Failed",
        Message: "No File Found",
        Data: {},
        Code: 404,
      });
    }
    var exten = sampleFile.name.split(".");
    var filetype = exten[exten.length - 1];
    var name = `${new Date().getTime()}.${filetype}`;

    var uploadPath = path.join(__dirname, "/public/TRAVELDESK_IMAGES", name);
    var Finalpath = `${apiURL}/TRAVELDESK_IMAGES/${name}`;

    await sampleFile.mv(uploadPath);

    res.json({
      Status: "Success",
      Message: "File upload success",
      Data: Finalpath,
      Code: 200,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({
      Status: "Failed",
      Message: "Internal Server Error",
      Data: {},
      Code: 500,
    });
  }
});

app.post("/travelUpload", async function (req, res) {
  console.log("req.body", req.body);
  console.log("req.files", req.files);
  const uploadedMedia = [];
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({
      Status: "Failure",
      Code: "400",
      Data: [],
      Message: "No files were uploaded.",
    });
  }
  const medias = Array.isArray(req.files.medias)
    ? req.files.medias
    : [req.files.medias];
  for (const sampleFile of medias) {
    if (!sampleFile || !sampleFile.name) {
      return res.status(400).json({
        Status: "Failure",
        Code: "400",
        Data: [],
        Message: "Invalid file upload",
      });
    }

    const exten = sampleFile.name.split(".");
    const filetype = exten[exten.length - 1];
    let name = `${new Date().getTime()}.${filetype}`;
    let uploadPath = path.join(__dirname, "/public/TRAVELDESK_IMAGES/", name);
    console.log("Uploaded", uploadPath);
    const fileUrl = `${apiURL}/TRAVELDESK_IMAGES/${name}`;
    uploadedMedia.push(fileUrl);
    await sampleFile.mv(uploadPath);
  }
  res.json({
    Status: "Success",
    Message: "file upload success",
    Data: uploadedMedia,
    BaseUrl: baseURL,
    Code: 200,
  });
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use("/api/", express.static(path.join(__dirname, "public")));
app.use("/api/", express.static(path.join(__dirname, "routes")));
app.use("/api/", express.static(path.join(__dirname, "Gad_Drawing")));

//JIC SERVICE MODULE
//app.use ('/api/joininspection-elevator', joinInspectionElevatorRouter);

// Oracle Repush Failed Jobs
// app.use("/api/oracle_repush", oracle_repush);
// app.use("/api/cron", cronJobs);

// Admin New API
// app.use("/api/admin/mr-report", mrReportRoutes);
// app.use("/api/admin/oracle-report", oracleReports);
// app.use("/api/admin/oracle-repush-report", oracleRepushReports);

// HR MODULES
app.use("/api/hr-module/employee-admin", employeeRoutes);
app.use("/api/hr-module/employee", employeeMobileRoutes);
app.use("/api/hr-module/oracle-sync", oracleSyncRoutes);
app.use("/api/hr-module/branch", branchRoutes);
app.use("/api/hr-module/holiday", holidayRoutes);
app.use("/api/hr-module/test-cron", testCronRoutes);
app.use("/api/hr-module/push-notication", pushNotificationRoutes);
app.use("/api/hr-module/employee-tracking", employeeTrackingRoutes);

// TRAVEL DESK
app.use("/api/travel-desk/movement", movementRoutes);
app.use("/api/travel-desk/travel", travelRoutes);

app.use("/api/travel-desk/movement-admin", movementAdminRoutes);
app.use("/api/travel-desk/travel-admin", travelAdminRoutes);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  // next(createError(404));
  res.status(404).end("Page Not Found");
});

// app.use(errorHandler);

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
