/**
 * @file Code.gs
 * @description Backend API using Google Apps Script to perform CRUD operations on a Google Sheet.
 * This script is deployed as a Web App.
 */

// --- CONFIGURATION ---
// No configuration needed here, the script works on the spreadsheet it is attached to.

/**
 * Handles HTTP GET requests.
 * This function acts as a router for read-only operations.
 * @param {Object} e - The event parameter containing request details.
 * @returns {ContentService.TextOutput} - JSON response.
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    let responseData;

    switch (action) {
      case 'getSheetNames':
        responseData = getSheetNames();
        break;
      case 'getData':
        const sheetName = e.parameter.sheetName;
        if (!sheetName) {
          throw new Error("El parámetro 'sheetName' es requerido.");
        }
        responseData = getDataFromSheet(sheetName);
        break;
      default:
        throw new Error("Acción no válida para la solicitud GET.");
    }
    
    return createJsonResponse({ status: 'success', data: responseData });
  } catch (error) {
    Logger.log(error.toString());
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

/**
 * Handles HTTP POST requests.
 * This function acts as a router for write operations (Create, Update, Delete).
 * @param {Object} e - The event parameter containing the POST body.
 * @returns {ContentService.TextOutput} - JSON response.
 */
function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    const { action, sheetName } = requestData;

    if (!action || !sheetName) {
      throw new Error("La 'acción' y 'sheetName' son requeridos en el cuerpo de la petición.");
    }
    
    let responseData;

    switch (action) {
      case 'create':
        responseData = appendDataToSheet(sheetName, requestData.rowData);
        break;
      case 'update':
        // Note: rowIndex from frontend is 1-based and refers to the data row, not the physical sheet row.
        responseData = updateDataInSheet(sheetName, requestData.rowIndex, requestData.rowData);
        break;
      case 'delete':
        // Note: rowIndex from frontend is 1-based and refers to the data row.
        responseData = deleteDataFromSheet(sheetName, requestData.rowIndex);
        break;
      default:
        throw new Error("Acción no válida para la solicitud POST.");
    }
    
    return createJsonResponse({ status: 'success', data: responseData });
  } catch (error) {
    Logger.log(error.toString());
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

/**
 * Creates a standard JSON response object for the web app.
 * @param {Object} data - The object to be stringified and returned.
 * @returns {ContentService.TextOutput} The JSON response.
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- HELPER FUNCTIONS ---

/**
 * Gets the names of all sheets in the spreadsheet.
 * @returns {string[]} An array of sheet names.
 */
function getSheetNames() {
  const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  return sheets.map(sheet => sheet.getName());
}

/**
 * Retrieves all data from a specified sheet.
 * Assumes the first row is headers.
 * @param {string} sheetName - The name of the sheet to get data from.
 * @returns {Object} An object containing headers and data rows.
 */
function getDataFromSheet(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`La hoja "${sheetName}" no fue encontrada.`);
  }
  const range = sheet.getDataRange();
  const values = range.getDisplayValues(); // Use getDisplayValues to respect date formatting
  
  if (values.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = values.shift() || []; // First row is headers
  // Map rows to objects {rowIndex, values} for easier handling in frontend
  const rows = values.map((row, index) => ({
      rowIndex: index + 1, // 1-based index for easier updates/deletes
      data: row
  }));

  return { headers, rows };
}

/**
 * Appends a new row of data to the specified sheet.
 * @param {string} sheetName - The name of the sheet.
 * @param {Array} rowData - An array of values for the new row.
 * @returns {Object} A success message.
 */
function appendDataToSheet(sheetName, rowData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`La hoja "${sheetName}" no fue encontrada.`);
  }
  sheet.appendRow(rowData);
  return { message: "Registro añadido correctamente." };
}

/**
 * Updates an existing row in the specified sheet.
 * @param {string} sheetName - The name of the sheet.
 * @param {number} rowIndex - The 1-based index of the data row to update.
 * @param {Array} rowData - The new data for the row.
 * @returns {Object} A success message.
 */
function updateDataInSheet(sheetName, rowIndex, rowData) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`La hoja "${sheetName}" no fue encontrada.`);
  }
  // Convert data row index to physical sheet row index (+1 for header row)
  const physicalRowIndex = parseInt(rowIndex) + 1;
  const range = sheet.getRange(physicalRowIndex, 1, 1, rowData.length);
  range.setValues([rowData]);
  return { message: "Registro actualizado correctamente." };
}

/**
 * Deletes a row from the specified sheet.
 * @param {string} sheetName - The name of the sheet.
 * @param {number} rowIndex - The 1-based index of the data row to delete.
 * @returns {Object} A success message.
 */
function deleteDataFromSheet(sheetName, rowIndex) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`La hoja "${sheetName}" no fue encontrada.`);
  }
  // Convert data row index to physical sheet row index (+1 for header row)
  const physicalRowIndex = parseInt(rowIndex) + 1;
  sheet.deleteRow(physicalRowIndex);
  return { message: "Registro eliminado correctamente." };
}
