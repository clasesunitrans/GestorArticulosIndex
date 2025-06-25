document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION ---
    // !!! IMPORTANTE: Pega aquí la URL de tu Web App de Google Apps Script !!!
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwAfh1KmSeHYgoRmJ9uUM54iSWl80YBtcQb0oWfR4TDcHLBLSFnY9yPw4iMcRopvUCJ/exec';

    // --- STATE ---
    let currentSheetName = '';
    let sheetHeaders = [];
    let sheetData = [];

    // --- DOM ELEMENTS ---
    const loader = document.getElementById('loader');
    const sheetTabsContainer = document.getElementById('sheet-tabs-container');
    const tableHead = document.querySelector('#data-table thead');
    const tableBody = document.querySelector('#data-table tbody');
    const addNewRecordBtn = document.getElementById('add-new-record-btn');
    
    // Form Modal elements
    const formModal = document.getElementById('form-modal');
    const modalTitle = document.getElementById('modal-title');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const recordForm = document.getElementById('record-form');
    const formFields = document.getElementById('form-fields');
    const recordIdInput = document.getElementById('record-id');

    // Confirm Modal elements
    const confirmModal = document.getElementById('confirm-modal');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
    const confirmOkBtn = document.getElementById('confirm-ok-btn');

    // --- UTILITY FUNCTIONS ---

    const showLoader = (show) => {
        loader.style.display = show ? 'flex' : 'none';
    };

    const showToast = (message, type = 'success') => {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 4000);
    };

    const callAppsScript = async (endpoint, method = 'GET', params = {}) => {
        showLoader(true);
        try {
            let response;
            if (method === 'GET') {
                const url = new URL(endpoint);
                url.search = new URLSearchParams(params).toString();
                response = await fetch(url);
            } else {
                response = await fetch(endpoint, {
                    method: 'POST',
                    mode: 'cors',
                    cache: 'no-cache',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(params),
                    redirect: 'follow'
                });
            }

            if (!response.ok) {
                throw new Error(`Error en la red: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.status === 'error') {
                throw new Error(`Error en el script: ${result.message}`);
            }
            
            return result.data;

        } catch (error) {
            console.error('Error al llamar a Apps Script:', error);
            showToast(error.message, 'error');
            return null;
        } finally {
            showLoader(false);
        }
    };


    // --- RENDERING FUNCTIONS ---

    const renderSheetTabs = (sheetNames) => {
        sheetTabsContainer.innerHTML = '';
        sheetNames.forEach(name => {
            const tab = document.createElement('button');
            tab.className = 'sheet-tab';
            tab.textContent = name;
            tab.dataset.sheetName = name;
            sheetTabsContainer.appendChild(tab);
        });

        if (sheetNames.length > 0) {
            const firstTab = sheetTabsContainer.querySelector('.sheet-tab');
            firstTab.classList.add('active');
            currentSheetName = sheetNames[0];
            fetchAndRenderData(currentSheetName);
        }
    };

    const renderTable = () => {
        // Render headers for desktop
        tableHead.innerHTML = '';
        const headerRow = document.createElement('tr');
        sheetHeaders.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });
        const actionsTh = document.createElement('th');
        actionsTh.textContent = 'Acciones';
        headerRow.appendChild(actionsTh);
        tableHead.appendChild(headerRow);

        // Render rows
        tableBody.innerHTML = '';
        sheetData.forEach(rowObject => {
            const tr = document.createElement('tr');
            tr.dataset.rowIndex = rowObject.rowIndex;

            rowObject.data.forEach((cellData, index) => {
                const td = document.createElement('td');
                // *** CHANGE: Add data-label attribute for responsive view ***
                td.dataset.label = sheetHeaders[index];
                
                if (typeof cellData === 'string' && cellData.match(/^\d{4}-\d{2}-\d{2}T/)) {
                    td.textContent = new Date(cellData).toLocaleDateString();
                } else {
                    td.textContent = cellData;
                }
                tr.appendChild(td);
            });
            
            const actionsTd = document.createElement('td');
            actionsTd.className = 'actions-cell';
            actionsTd.innerHTML = `
                <div>
                    <button class="btn btn-edit">Editar</button>
                    <button class="btn btn-delete">Eliminar</button>
                </div>
            `;
            tr.appendChild(actionsTd);
            tableBody.appendChild(tr);
        });
    };

    const renderFormFields = (data = []) => {
        formFields.innerHTML = '';
        sheetHeaders.forEach((header, index) => {
            const value = data[index] || '';
            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';
            
            const isDate = header.toLowerCase().includes('fecha');
            const inputType = isDate ? 'date' : 'text';

            let fieldValue = value;
            if (isDate && value) {
                try {
                    const dateObj = new Date(value);
                    if (!isNaN(dateObj.getTime())) {
                       const timezoneOffset = dateObj.getTimezoneOffset() * 60000;
                       fieldValue = new Date(dateObj.getTime() - timezoneOffset).toISOString().split('T')[0];
                    } else {
                       fieldValue = value;
                    }
                } catch(e) {
                    console.warn("Could not parse date:", value);
                    fieldValue = value;
                }
            }

            formGroup.innerHTML = `
                <label for="field-${index}">${header}</label>
                <input type="${inputType}" id="field-${index}" name="${header}" value="${fieldValue}" required>
            `;
            formFields.appendChild(formGroup);
        });
    };

    // --- DATA FETCHING & MANIPULATION ---

    const fetchSheetNames = async () => {
        if (WEB_APP_URL === 'URL_DE_TU_WEB_APP_AQUI') {
            showToast('Por favor, edita script.js y configura la WEB_APP_URL.', 'error');
            return;
        }
        const data = await callAppsScript(WEB_APP_URL, 'GET', { action: 'getSheetNames' });
        if (data) {
            renderSheetTabs(data);
        }
    };
    
    const fetchAndRenderData = async (sheetName) => {
        const data = await callAppsScript(WEB_APP_URL, 'GET', { action: 'getData', sheetName });
        if (data) {
            sheetHeaders = data.headers;
            sheetData = data.rows;
            renderTable();
        } else {
            sheetHeaders = [];
            sheetData = [];
            renderTable();
        }
    };

    const handleFormSubmit = async (event) => {
        event.preventDefault();
        const formData = new FormData(recordForm);
        const rowData = sheetHeaders.map(header => formData.get(header));
        const recordId = recordIdInput.value;

        const action = recordId ? 'update' : 'create';
        const payload = {
            action,
            sheetName: currentSheetName,
            rowData
        };
        if (action === 'update') {
            payload.rowIndex = recordId;
        }

        const result = await callAppsScript(WEB_APP_URL, 'POST', payload);

        if (result) {
            showToast(result.message || 'Operación completada.');
            closeFormModal();
            fetchAndRenderData(currentSheetName);
        }
    };
    
    // --- MODAL LOGIC ---

    const openFormModal = (mode = 'create', rowIndex = null) => {
        if (mode === 'edit' && rowIndex) {
            modalTitle.textContent = 'Editar Registro';
            recordIdInput.value = rowIndex;
            const rowObject = sheetData.find(r => r.rowIndex == rowIndex);
            renderFormFields(rowObject.data);
        } else {
            modalTitle.textContent = 'Añadir Nuevo Registro';
            recordIdInput.value = '';
            renderFormFields();
        }
        formModal.style.display = 'flex';
        setTimeout(() => formModal.classList.add('visible'), 10);
    };

    const closeFormModal = () => {
        formModal.classList.remove('visible');
        setTimeout(() => {
            formModal.style.display = 'none';
            recordForm.reset();
        }, 300);
    };

    const showConfirmModal = (message, onConfirm) => {
        confirmMessage.textContent = message;
        confirmModal.style.display = 'flex';
        setTimeout(() => confirmModal.classList.add('visible'), 10);

        const newOkBtn = confirmOkBtn.cloneNode(true);
        confirmOkBtn.parentNode.replaceChild(newOkBtn, confirmOkBtn);
        
        newOkBtn.addEventListener('click', () => {
            onConfirm();
            closeConfirmModal();
        });
    };

    const closeConfirmModal = () => {
        confirmModal.classList.remove('visible');
        setTimeout(() => {
            confirmModal.style.display = 'none';
        }, 300);
    };

    // --- EVENT LISTENERS ---

    sheetTabsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('sheet-tab')) {
            document.querySelector('.sheet-tab.active')?.classList.remove('active');
            e.target.classList.add('active');
            currentSheetName = e.target.dataset.sheetName;
            fetchAndRenderData(currentSheetName);
        }
    });
    
    addNewRecordBtn.addEventListener('click', () => openFormModal('create'));

    tableBody.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        
        const row = target.closest('tr');
        if (!row) return;

        const rowIndex = row.dataset.rowIndex;

        if (target.classList.contains('btn-edit')) {
            openFormModal('edit', rowIndex);
        }

        if (target.classList.contains('btn-delete')) {
            showConfirmModal('¿Estás seguro de que quieres eliminar este registro? Esta acción no se puede deshacer.', async () => {
                const result = await callAppsScript(WEB_APP_URL, 'POST', {
                    action: 'delete',
                    sheetName: currentSheetName,
                    rowIndex: rowIndex
                });
                if(result) {
                    showToast(result.message || 'Registro eliminado.');
                    fetchAndRenderData(currentSheetName);
                }
            });
        }
    });

    recordForm.addEventListener('submit', handleFormSubmit);
    closeModalBtn.addEventListener('click', closeFormModal);
    cancelBtn.addEventListener('click', closeFormModal);
    formModal.addEventListener('click', (e) => {
        if (e.target === formModal) {
            closeFormModal();
        }
    });

    confirmCancelBtn.addEventListener('click', closeConfirmModal);
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
            closeConfirmModal();
        }
    });
    
    // --- INITIALIZATION ---
    fetchSheetNames();
});
