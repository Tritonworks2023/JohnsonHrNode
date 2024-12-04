// error-handler.js
const fs = require('fs');
const path = require('path');

// Define a function to log errors with line numbers
function logErrorWithLineNumber(error, req) {
  const errorLog = `Timestamp: ${new Date().toISOString()}\n`;
  errorLog += `URL: ${req.originalUrl}\n`;
  errorLog += `Method: ${req.method}\n`;
  errorLog += `Error Message: ${error.message}\n`;

  // Capture the line number where the error occurre
  const stackLines = error.stack.split('\n');
  if (stackLines.length >= 2) {
    const line = stackLines[1].trim();
    errorLog += `Line: ${line}\n`;
  }

  errorLog += '\n';

  // Append the error log to a file (e.g., error.log)
  console.log("====__dirname",__dirname);
  const logFilePath = path.join(__dirname, 'error.log');
  fs.appendFile(logFilePath, errorLog, (err) => {
    if (err) {
      console.error('Error writing to error log file:', err);
    } else {
      console.log('Error logged successfully.');
    }
  });
  
  
}

// Define an error handling middleware
function errorHandler(err, req, res, next) {
  // Log the error with line number
  logErrorWithLineNumber(err, req);

  // Respond with an error message (customize as needed)
  res.status(500).json({ error: 'An error occurred. Please try again later.' });
}

module.exports = errorHandler;
