const oracledb = require('oracledb');
const fs = require('fs');
const path = require('path');
var ErrorLog = require('./../models/errorLogModel');
var ErrorQueryModel = require('./../models/errorQueryModel');

const logFilePath = path.join(__dirname, 'oracleError.log');

const logFilePathQuery = path.join(__dirname, 'oracle_query_logs.txt');


async function storeErrorQueries(errorQueries) {
  try {
    const errorQueryDocs = errorQueries.map(({ query, bindParams }) => ({
      query,
      bindParams
    }));
    await ErrorQueryModel.insertMany(errorQueryDocs);
    console.log('Error queries stored successfully.');
  } catch (error) {
    console.error('Error storing error queries:', error);
    throw error; // Throw error for handling at a higher level
  }
}


async function logErrorToLogFile(error, query, bindParams) {
  const logMessage = `${new Date().toISOString()}: ${error.message}\n`;
  const queryInfo = `Query: ${query}\n`;
  const bindParamsInfo = `Bind Parameters: ${JSON.stringify(bindParams)}\n`;
  const fullLogMessage = logMessage + queryInfo + bindParamsInfo;

  fs.appendFile(logFilePath, fullLogMessage, (err) => {
    if (err) {
      console.error('Error writing to log file:', err);
    }
  });
}

async function findJobNo(bindParams) {
  for (const key in bindParams) {
    if (key.includes('JOBNO') || key == 'jn' ) {
      return bindParams[key];
    }
  }
  return 'UnknownJobNo';
}

async function logSuccessToCreateRecords(result, query, bindParams) {
  try {
    const tableNameMatch = query.match(/INTO\s+(\w+)|UPDATE\s+(\w+)/i);
    const tableName = tableNameMatch ? (tableNameMatch[1] || tableNameMatch[2]) : 'UnknownTable';
    const jobNo = await findJobNo(bindParams);
    const isInsertOrUpdate = query.toLowerCase().includes('insert') || query.toLowerCase().includes('update');
    if (isInsertOrUpdate) {
      const errorLog = new ErrorLog({
        result: result,
        errorType: "Suceess",
        query: query,
        tableName: tableName,
        jobNo: jobNo,
        bindParams: bindParams,
      });
      await errorLog.save();
    }
  } catch (err) {
    console.error('Error logging to MongoDB:', err);
  }
}

const commonOracleConfig = {
  poolMax: 120,
  queueMax: 500,
  enableStatistics : true
};

const oracleConfig = {
  user: process.env.ORACLE_USER,
  password: process.env.ORACLE_PASSWORD,
  connectString: process.env.ORACLE_CONNECT_STRING,
  ...commonOracleConfig,
};

const oracleConfigIOT = {
  user: process.env.ORACLE_IOT_USER,
  password: process.env.ORACLE_IOT_PASSWORD,
  connectString: process.env.ORACLE_IOT_CONNECT_STRING
};

let pool;
let poolIOT;

async function initializeOracleConnectionPool() {
  try {
    await closeOracleConnectionPool();
    pool = await oracledb.createPool(oracleConfig);
    console.log('Oracle connection pool initialized!');
  } catch (err) {
    console.error('Error initializing Oracle connection pool:', err);
    throw err;
  }
}

async function initializeIOTOracleConnectionPool() {
  try {
    await closeIOTOracleConnectionPool();
    poolIOT = await oracledb.createPool(oracleConfigIOT);
    console.log('IOT Oracle connection pool initialized!');
  } catch (err) {
    console.error('Error initializing IOT Oracle connection pool:', err);
    throw err;
  }
}

async function closeOracleConnectionPool() {
  try {
    if (pool) {
      await pool.close();
      console.log('Oracle connection pool closed!');
    }
  } catch (err) {
    console.error('Error closing Oracle connection pool:', err);
  }
}

async function closeIOTOracleConnectionPool() {
  try {
    if (poolIOT) {
      await poolIOT.close();
      console.log('IOT Oracle connection pool closed!');
    }
  } catch (err) {
    console.error('Error closing IOT Oracle connection pool:', err);
  }
}

async function executeWithRetry(query, bindParams = {}, options = {}, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await executeOracleQuery(query, bindParams, options);
      return result;
    } catch (error) {
      if (shouldRetry(error, attempt, retries)) {
        console.log(`Retry attempt ${attempt}/${retries} for Oracle query:`, error.message);
        // if (!connection){
        //   await reinitializeOracleConnectionPool(); // Reinitialize the connection pool
        // }
        await new Promise(resolve => setTimeout(resolve, 10000)); // Adjust the delay as needed
      } else {
        throw error;
      }
    }
  }
}

async function enableOraclePoolStatistics() {
  try {
    if (!pool) {
      throw new Error('Oracle connection pool not initialized.');
    }
    await pool.logStatistics(5); // Log statistics every 5 seconds
    console.log('Oracle pool statistics logging enabled.');
  } catch (err) {
    console.error('Error enabling Oracle pool statistics logging:', err);
    throw err;
  }
}

async function disableOraclePoolStatistics() {
  try {
    if (!pool) {
      throw new Error('Oracle connection pool not initialized.');
    }
    await pool.logStatistics(false); // Disable statistics logging
    console.log('Oracle pool statistics logging disabled.');
  } catch (err) {
    console.error('Error disabling Oracle pool statistics logging:', err);
    throw err;
  }
}


function shouldRetry(error, attempt, maxRetries) {
  const isConnectionError = error && error.message && error.message.includes('DPI-1010');
  const isTimeoutError = error && error.message && error.message.includes('ORA-02049');
  const closeConnectionError = error && error.message && error.message.includes('DPI-1080');
  return (isConnectionError || isTimeoutError || closeConnectionError) && attempt < maxRetries;
}
function shouldRetrySession(error, attempt, maxRetries) {
  const isDrainingError = error && error.message && error.message.includes('pool is draining and cannot accept work');
  const isTimeoutError = error && error.message && error.message.includes('ORA-02391');
  const poolQueueMaxError = error && error.message && error.message.includes('NJS-076');
  return (isDrainingError || isTimeoutError || poolQueueMaxError) && attempt < maxRetries;
}

async function reinitializeOracleConnectionPool() {
  try {
    await closeOracleConnectionPool();
    await initializeOracleConnectionPool();
    await initializeIOTOracleConnectionPool();
    await closeIOTOracleConnectionPool();
    console.log('Oracle connection pool reinitialized!');
  } catch (err) {
    console.error('Error reinitializing Oracle connection pool:', err);
  }
}

function formatDateTime(date) {
  return date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour12: false }).replace(/, /, ' ').replace(/\//g, '-');
}

async function executeOracleQuery(query, bindParams = {}, options = {}) {
  let connection;
  const isInsertOrUpdate = query.toLowerCase().includes('insert') || query.toLowerCase().includes('update');
  const { tableName, action } = extractTableNameAndAction(query);
  try {
      logToFileSync(logFilePathQuery, `-------------------Start----------------------------------------------------`);
      const startTime = new Date();
      logToFileSync(logFilePathQuery, `Oracle query execution started for ${action} on table ${tableName || 'unknown'} at ${formatDateTime(startTime)}`);
    connection = await pool.getConnection();
      const currentTime = new Date();
      logToFileSync(logFilePathQuery, `Oracle connection acquired for ${action} on table ${tableName || 'unknown'} at ${formatDateTime(currentTime)}`);
    const result = await connection.execute(query, bindParams, options);
    if(isInsertOrUpdate){
      await connection.execute('COMMIT');
    }
      const completionTime = new Date();
      logToFileSync(logFilePathQuery, `Oracle query execution completed for ${action} on table ${tableName || 'unknown'} at ${formatDateTime(completionTime)}`);
    return result;
  } catch (err) {
    console.error('Error executing Oracle query:', err);
    logSuccessToCreateRecords(err, query, bindParams);
    // if (connection && isInsertOrUpdate) {
    //   await connection.execute('ROLLBACK');
    // }
    // if (shouldRetrySession(err, 1, 3)) { 
    //   console.log('Retry attempt 1/3 for Oracle query:', err.message);
    //   return executeWithRetry(query, bindParams, options);
    // }
    // if (shouldRetry(err, 1, 3)) { 
    //   console.log('Retry attempt 1/3 for Oracle query:', err.message);
    //   await reinitializeOracleConnectionPool();;
    //   return executeWithRetry(query, bindParams, options);
    // }
    logErrorToLogFile(err, query, bindParams);
    const errorResponse = {
      statusCode: 500,
      error: err,
      errorMessage: 'An error occurred during query execution.',
    };
    if (err.message) {
      errorResponse.errorMessage = err.message;
    }
    return errorResponse;
  } finally {
    if (connection) {
      try {
        await connection.close();
        const closedTime = new Date();
        logToFileSync(logFilePathQuery, `Oracle query closed at ${action} on table ${tableName || 'unknown'} at ${formatDateTime(closedTime)}`);
        logToFileSync(logFilePathQuery, `===================================End=========================================`);
      } catch (err) {
        console.error('Error closing Oracle connection:', err);
      }
    }
  }
}

function extractTableNameAndAction(query) {
  const insertMatch = query.match(/\binsert\s+into\s+([^\s;]+)/i);
  if (insertMatch) {
    return { tableName: insertMatch[1], action: 'insert' };
  }

  const updateMatch = query.match(/\bupdate\s+([^\s;]+)/i);
  if (updateMatch) {
    return { tableName: updateMatch[1], action: 'update' };
  }

  const selectMatch = query.match(/\bselect\s+.*?\bfrom\s+([^\s;]+)/i);
  if (selectMatch) {
    return { tableName: selectMatch[1], action: 'select' };
  }
  return { tableName: '', action: 'unknown' };
}


function logToFileSync(filePath, message) {
  fs.appendFileSync(filePath, `${message}\n`);
}


async function executeIOTOracleQuery(query, bindParams = {}, options = {}) {
  let connectionIOT;
  try {
    connectionIOT = await poolIOT.getConnection();
    const result = await connectionIOT.execute(query, bindParams, options);
    return result;
  } catch (err) {
    console.error('Error executing IOT Oracle query:', err);
    const errorResponse = {
      statusCode: 500,
      error: err,
      errorMessage: 'An error occurred during IOT Oracle query execution.',
    };
    return errorResponse;
  } finally {
    if (connectionIOT) {
      try {
        await connectionIOT.close();
      } catch (err) {
        console.error('Error closing IOT Oracle connection:', err);
      }
    }
  }
}

async function executeOracleQueryWithTransaction(queries, bindParamsList = []) {
  let connection;
  let errorQueries = [];
  try {
    connection = await pool.getConnection();
    for (let index = 0; index < queries.length; index++) {
      const query = queries[index];
      const bindParams = bindParamsList[index];
      try {
        const result = await connection.execute(query, bindParams, { autoCommit: false });
        //console.log("=======================result=====================",result)
      } catch (error) {
        console.log("===============error",error);
        logSuccessToCreateRecords(error, query, bindParams);
        const isConnectionError = error && error.message && error.message.includes('DPI-1010');
        const isTimeoutError = error && error.message && error.message.includes('ORA-02049');
        const isDrainingError = error && error.message && error.message.includes('pool is draining and cannot accept work');
        const poolQueueMaxError = error && error.message && error.message.includes('NJS-076');
        if (isConnectionError || isTimeoutError || isDrainingError || poolQueueMaxError) {
          console.error('Error executing query within transaction:', error);
          errorQueries.push({ query, bindParams });
          await connection.execute('ROLLBACK');
          return {
            statusCode: 500,
            error: error,
            errorMessage: 'An error occurred during query execution within the transaction.',
          };
        }

      }
    }
    await connection.execute('COMMIT');
    return { statusCode: 200, message: 'All queries executed successfully' };
  } catch (err) {
    console.error('Error starting Oracle transaction:', err);
    const errorResponse = {
      statusCode: 500,
      error: err,
      errorMessage: 'An error occurred while starting the transaction.',
    };
    return errorResponse;
  } finally {
    if (connection) {
      try {
        await connection.close();
        if (errorQueries.length > 0) {
          await storeErrorQueries(errorQueries);
        }
      } catch (err) {
        console.error('Error closing Oracle connection:', err);
      }
    }
  }
}


module.exports = {
  initializeOracleConnectionPool,
  initializeIOTOracleConnectionPool,
  closeOracleConnectionPool,
  closeIOTOracleConnectionPool,
  executeOracleQuery,
  executeIOTOracleQuery,
  executeOracleQueryWithTransaction,
  enableOraclePoolStatistics
};
