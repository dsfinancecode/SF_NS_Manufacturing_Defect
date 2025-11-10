/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @description This Suitelet presents a custom HTML form (styled with Tailwind) to create
 * a new Manufacturing Defect record. It pre-populates PO info as read-only headers
 * and lists the PO items for the user to select one. It also includes a dropdown
 * for "Fault Issue" loaded from a custom list.
 *
 * It expects a 'poId' parameter in the URL for the GET request.
 */
define(['N/record', 'N/redirect', 'N/log', 'N/search'],
    (record, redirect, log, search) => {

        /**
         * Main function that handles both GET and POST requests.
         * @param {Object} context - The Suitelet context.
         */
        const onRequest = (context) => {
            // *** NEW DEBUGGING ***
            // Log the entire request context to see all parameters, URL, and method
            log.debug({
                title: 'onRequest Entry',
                details: {
                    method: context.request.method,
                    url: context.request.url,
                    parameters: context.request.parameters
                }
            });
            // *** END NEW ***

            try {
                if (context.request.method === 'GET') {
                    // log.debug('Request Received', 'GET'); // No longer needed, covered by above
                    handleGet(context);
                } else if (context.request.method === 'POST') {
                    // log.debug('Request Received', 'POST'); // No longer needed, covered by above
                    handlePost(context);
                }
            } catch (e) {
                log.error('onRequest Error', e.message);
                context.response.write(`<html><body><h1>Error</h1><p>${e.message}</p></body></html>`);
            }
        };

        /**
         * Handles the GET request. Fetches PO data and builds the HTML form.
         * @param {Object} context - The Suitelet context.
         */
        const handleGet = (context) => {
            try {
                // *** NEW DEBUGGING ***
                // Log all received GET parameters *before* trying to access them.
                // This will show you if 'poId' is missing, misspelled, or has the wrong case.
                log.debug({
                    title: 'handleGet Received Parameters',
                    details: context.request.parameters
                });
                // *** END NEW ***


                // *** NEW: Get Fault Issue Options via Search ***
                log.debug('GET: Getting fault issue options');
                let issueOptions = [];
                try {
                    const customListScriptId = 'customlist2123';
                    log.debug('GET: Searching for custom list values', `List Script ID: ${customListScriptId}`);

                    const listSearch = search.create({
                        type: customListScriptId,
                        filters: [
                            ['isinactive', 'is', 'F'] // only active values
                        ],
                        columns: [
                            'name' // The text of the option
                        ]
                    });

                    listSearch.run().each(result => {
                        issueOptions.push({
                            value: result.id, // The internal ID of the list value
                            text: result.getValue('name') // The name/text of the list value
                        });
                        return true; // continue iteration
                    });

                    log.debug('GET: Loaded issue options via search', issueOptions.length);

                } catch (e) {
                    log.error('GET: Failed to get issue options via search', e.message);
                    // Don't throw, we can continue without it, but log the error
                }
                // *** END NEW ***

                // 1. Get the Purchase Order ID from the URL parameters
                const poId = context.request.parameters.poId;
                // log.debug('GET: URL Parameter "poId"', poId); // This is good, but the log above is more comprehensive

                if (!poId) {
                    log.audit('GET: Missing Parameter', 'Purchase Order ID (poId) was not provided.');
                    // The log above this will show what *was* provided instead.
                    throw new Error('Purchase Order ID (poId) was not provided as a URL parameter.');
                }

                // 2. Load the Purchase Order record
                log.debug('GET: Loading PO', `ID: ${poId}`);
                const poRec = record.load({
                    type: record.Type.PURCHASE_ORDER,
                    id: poId,
                    isDynamic: false
                });
                log.debug('GET: PO Loaded Successfully');

                // 3. Get PO header values
                const supplierId = poRec.getValue('entity');
                const supplierText = poRec.getText('entity'); // Use this as a fallback
                let companyName = supplierText; // Default to the fallback

                if (supplierId) {
                    try {
                        log.debug('GET: Looking up supplier company name', `ID: ${supplierId}`);
                        const supplierLookup = search.lookupFields({
                            type: search.Type.VENDOR, // The entity on a PO is a Vendor
                            id: supplierId,
                            columns: ['companyname']
                        });

                        // Check if companyname was returned and has a value
                        if (supplierLookup.companyname) {
                            companyName = supplierLookup.companyname;
                            log.debug('GET: Found company name', companyName);
                        } else {
                            log.debug('GET: Company name field was empty, using fallback text', supplierText);
                        }
                    } catch (e) {
                        log.error('GET: Supplier company name lookup failed, using fallback text', e.message);
                        // companyName is already set to the fallback, so no action needed
                    }
                }

                const poInfo = {
                    poId: poId,
                    tranId: poRec.getValue('tranid'),
                    supplier: companyName, // Use the new looked-up value
                    supplierId: supplierId, // This was already correct
                    plot: poRec.getText('cseg_sf_plot'),
                    plotId: poRec.getValue('cseg_sf_plot'),
                    department: poRec.getText('department'),
                    departmentId: poRec.getValue('department'),
                    location: poRec.getText('location'),
                    locationId: poRec.getValue('location')
                };
                log.debug('GET: PO Header Info', poInfo);

                // 4. Get PO item values
                const poItems = [];
                const lineCount = poRec.getLineCount({ sublistId: 'item' });
                log.debug('GET: Item Sublist Line Count', lineCount);

                for (let i = 0; i < lineCount; i++) {
                    poItems.push({
                        line: i,
                        itemId: poRec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i }),
                        itemName: poRec.getSublistText({ sublistId: 'item', fieldId: 'item', line: i }),
                        quantity: (poRec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i }) || '0').toString(),
                        description: poRec.getSublistValue({ sublistId: 'item', fieldId: 'description', line: i }),
                        // *** NEW FIELDS ***
                        width: (poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_sf_width', line: i }) || '').toString(),
                        length: (poRec.getSublistValue({ sublistId: 'item', fieldId: 'custcol_sf_length', line: i }) || '').toString(),
                        amount: (poRec.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: i }) || '0').toString()
                    });
                }
                log.debug('GET: PO Items', poItems);


                // 5. Build and send the HTML response
                const html = buildHtmlForm(poInfo, poItems, issueOptions); // Removed context.request.url
                context.response.write(html);

            } catch (e) {
                log.error('handleGet Error', e.message);
                context.response.write(`<html><body><h1>Error</h1><p>Could not load the defect creation form: ${e.message}</p></body></html>`);
            }
        };

        /**
         * Handles the POST request. Receives form data, creates the new record, and redirects.
         * @param {Object} context - The Suitelet context.
         */
        const handlePost = (context) => {
            // *** NEW LOG ***
            log.debug({
                title: 'handlePost: Save Button Pressed',
                details: 'Form submitted. Starting POST processing.'
            });
            // *** END NEW ***

            try {
                // 1. Get all parameters from the POST body
                const params = context.request.parameters;
                log.debug('POST: Received parameters', JSON.stringify(params || {}));

                const poId = params.custpage_po_id;
                const supplierId = params.custpage_supplier_id;
                const plotId = params.custpage_plot_id;
                const departmentId = params.custpage_department_id;
                const locationId = params.custpage_location_id;
                const faultIssueId = params.custpage_fault_issue;

                // *** NEW: Parse selected item data from JSON string ***
                const selectedItemParam = params.custpage_selected_item;
                log.debug('POST: Raw selected item parameter', selectedItemParam);

                if (!selectedItemParam) {
                    log.audit('POST: Validation Failed', 'No item was selected (parameter is missing).');
                    throw new Error('You must select a defective item to continue.');
                }

                let selectedItemData;
                try {
                    // NetSuite's request object automatically un-escapes the &quot; back to "
                    selectedItemData = JSON.parse(selectedItemParam);
                } catch (e) {
                    log.error('POST: Failed to parse selected item JSON', e.message);
                    throw new Error('The selected item data was malformed. Please go back and try again.');
                }
                log.debug('POST: Parsed selected item data', selectedItemData);

                // Extract data for clarity
                const selectedItemId = selectedItemData.itemId;
                const selectedItemQty = selectedItemData.quantity;
                const selectedItemWidth = selectedItemData.width;
                const selectedItemLength = selectedItemData.length;
                const selectedItemAmount = selectedItemData.amount;
                // *** END NEW ***

                // 2. Validate that an item was selected
                if (!selectedItemId) { // Check the value *inside* the JSON
                    log.audit('POST: Validation Failed', 'No item ID found in selected item data.');
                    throw new Error('You must select a defective item to continue.');
                }
                // *** NEW: Validate fault issue ***
                if (!faultIssueId) {
                    log.audit('POST: Validation Failed', 'No fault issue was selected.');
                    throw new Error('You must select a fault issue to continue.');
                }
                // *** END NEW ***

                // *** NEW LOG ***
                // Log the data object that will be used to create the record
                const defectData = {
                    custrecordman_defect_purchaseorder: poId,
                    custrecordman_defect_supplier: supplierId,
                    custrecord_man_defect_plot: plotId,
                    custrecord_man_defect_department: departmentId,
                    custrecord_man_defect_location: locationId,
                    custrecord_man_defect_issue: faultIssueId,
                    // --- Item fields ---
                    custrecord_man_defect_item: selectedItemId,
                    custrecord_man_defect_width: selectedItemWidth,
                    custrecord_man_defect_length: selectedItemLength,
                    custrecord_man_defect_quantity: selectedItemQty,
                    custrecord_man_defect_cost: selectedItemAmount
                };
                log.debug({
                    title: 'POST: Data for New Defect Record',
                    details: defectData
                });
                // *** END NEW ***

                // 3. Create the new Manufacturing Defect record
                log.debug('POST: Creating new defect record', 'Type: customrecord_manufacturing_defect');
                const newDefectRec = record.create({
                    type: 'customrecord_manufacturing_defect',
                    isDynamic: true
                });

                // 4. Set field values from the form
                newDefectRec.setValue({ fieldId: 'custrecordman_defect_purchaseorder', value: poId });
                newDefectRec.setValue({ fieldId: 'custrecordman_defect_supplier', value: supplierId });
                newDefectRec.setValue({ fieldId: 'custrecord_man_defect_plot', value: plotId });
                newDefectRec.setValue({ fieldId: 'custrecord_man_defect_department', value: departmentId });
                newDefectRec.setValue({ fieldId: 'custrecord_man_defect_location', value: locationId });
                newDefectRec.setValue({ fieldId: 'custrecord_man_defect_issue', value: faultIssueId });

                // *** NEW: Set item line fields ***
                newDefectRec.setValue({ fieldId: 'custrecord_man_defect_item', value: selectedItemId });
                newDefectRec.setValue({ fieldId: 'custrecord_man_defect_width', value: selectedItemWidth });
                newDefectRec.setValue({ fieldId: 'custrecord_man_defect_length', value: selectedItemLength });
                newDefectRec.setValue({ fieldId: 'custrecord_man_defect_quantity', value: selectedItemQty });
                newDefectRec.setValue({ fieldId: 'custrecord_man_defect_cost', value: selectedItemAmount });

                // 5. Save the new record
                // *** NEW LOG ***
                log.debug('POST: Attempting to save new defect record...');
                // *** END NEW ***
                const newRecordId = newDefectRec.save();
                log.debug('POST: New defect record created successfully', `ID: ${newRecordId}`);

                // 6. Redirect back to the Purchase Order
                redirect.toRecord({
                    type: record.Type.PURCHASE_ORDER,
                    id: poId,
                    isEditMode: false
                });

            } catch (e) {
                log.error('handlePost Error', e.message);
                // If the save fails, show the error to the user
                context.response.write(`<html><body><h1>Error</h1><p>Could not save the new defect record: ${e.message}</p><p><a href="javascript:history.back()">Go Back</a></p></body></html>`);
            }
        };

        // ... (buildHtmlForm, createInfoField, and createItemRadio functions remain unchanged) ...
        // [Scroll Down] - No changes were made to the HTML-building helper functions
        
        /**
         * Builds the HTML form using Tailwind CSS for styling.
         * @param {Object} poInfo - Header info from the PO.
         * @param {Array} poItems - Item lines from the PO.
         * @param {Array} issueOptions - Array of {value, text} for the fault issue dropdown.
         * @param {string} postUrl - The URL to post the form to.
         * @returns {string} The complete HTML for the form page.
         */
        const buildHtmlForm = (poInfo, poItems, issueOptions) => { // Removed postUrl
            let html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Manufacturing Defect</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    /* Simple loading spinner */
                    .loader {
                        border: 4px solid #f3f3f3;
                        border-top: 4px solid #3498db;
                        border-radius: 50%;
                        width: 40px;
                        height: 40px;
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    /* Custom style for radio */
                    input[type="radio"]:checked + label {
                        background-color: #eff6ff; /* blue-50 */
                        border-color: #3b82f6; /* blue-500 */
                    }
                </style>
            </head>
            <body class="bg-gray-100 font-sans min-h-screen">
                <div id="loading-overlay" class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 hidden">
                    <div class="bg-white p-8 rounded-lg shadow-xl flex flex-col items-center">
                        <div class="loader"></div>
                        <span class="mt-4 text-lg font-medium text-gray-700">Saving Defect...</span>
                    </div>
                </div>

                <div class="container mx-auto p-4 md:p-8 max-w-4xl">
                    <form id="defect-form" method="POST" action="">
                        <div class="bg-white shadow-xl rounded-lg overflow-hidden">
                            
                            <div class="flex justify-between items-center text-white p-6" style="background-color: #435969;">
                                <div>
                                    <h1 class="text-3xl font-bold">Manufacturing Defect</h1>
                                    <p class="text-gray-300 mt-1">${poInfo.tranId}</p>
                                </div>
                                <div>
                                    <img src="https://6548935.app.netsuite.com/core/media/media.nl?id=12904734&c=6548935&h=lTRR7c30QxWFNVKbRyFb33OSd6KKQTdFVchouUxSK4Am28ls" 
                                         alt="Company Logo" 
                                         class="h-12 object-contain"> </div>
                            </div>
                            <div class="p-6 border-b border-gray-200">
                                <h2 class="text-xl font-semibold text-gray-700 mb-4"></h2>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">    
                                    ${createInfoField('Supplier', poInfo.supplier)}
                                    ${createInfoField('Plot', poInfo.plot)}
                                    ${createInfoField('Location', poInfo.location)}
                                    ${createInfoField('Department', poInfo.department)}
                                </div>
                            </div>

                            <input type="hidden" name="custpage_po_id" value="${poInfo.poId}">
                            <input type="hidden" name="custpage_supplier_id" value="${poInfo.supplierId}">
                            <input type="hidden" name="custpage_plot_id" value="${poInfo.plotId}">
                            <input type="hidden" name="custpage_department_id" value="${poInfo.departmentId}">
                            <input type="hidden" name="custpage_location_id" value="${poInfo.locationId}">

                            
                            <div class="p-6 border-b border-gray-200">
                                
                                <div class="max-w-md">
                                    <label for="custpage_fault_issue" class="block text-sm font-medium text-gray-700 mb-1">
                                        Fault Issue <span class="text-red-500">*</span>
                                    </label>
                                    <select id="custpage_fault_issue" name="custpage_fault_issue" required
                                        class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm">
                                        <option value="">Please select a fault issue...</option>
                                        ${issueOptions.map(opt => `<option value="${opt.value}">${opt.text}</option>`).join('')}
                                    </select>
                                </div>
                            </div>

                            <div class="p-6">
                                <h2 class="text-xl font-semibold text-gray-700 mb-1">Select Defective Item</h2>
                                <p class="text-sm text-gray-500 mb-4"></p>
                                <div class="space-y-3">
                                    ${poItems.map(item => createItemRadio(item)).join('')}
                                </div>
                                <div id="item-error" class="text-red-600 text-sm mt-2 hidden">Please select one item.</div>
                            </div>

                            <div class="bg-gray-50 p-6 flex justify-end space-x-3">
                                <button type="button" onclick="window.history.back()"
                                        class="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                                    Cancel
                                </button>
                                <button type="submit" id="submit-button"
                                        class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                    Save
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                <script>
                    document.getElementById('defect-form').addEventListener('submit', function(e) {
                        // Client-side validation for radio button
                        const selectedItem = document.querySelector('input[name="custpage_selected_item"]:checked');
                        const itemError = document.getElementById('item-error');
                        if (!selectedItem) {
                            e.preventDefault(); // Stop form submission
                            itemError.classList.remove('hidden');
                            // Scroll to the item list
                            document.querySelector('#item-error').scrollIntoView({ behavior: 'smooth', block: 'center' });
                        } else {
                            itemError.classList.add('hidden');
                            // Show loading spinner
                            document.getElementById('loading-overlay').classList.remove('hidden');
                        }

                        // Client-side validation for select (redundant with 'required' but good practice)
                        const faultIssue = document.getElementById('custpage_fault_issue').value;
                        if (!faultIssue) {
                            e.preventDefault(); // Stop form submission
                            document.getElementById('loading-overlay').classList.add('hidden');
                            document.getElementById('custpage_fault_issue').focus();
                            // We don't show a specific error message here as the browser's 'required' tooltip will handle it.
                        }
                    });
                </script>
            </body>
            </html>
            `;
            return html;
        };

        /**
         * Helper function to create a read-only info field.
         * @param {string} label - The label for the field.
         * @param {string} value - The value for the field.
         * @returns {string} HTML for the info field.
         */
        const createInfoField = (label, value) => `
            <div>
                <span class="block text-sm font-medium text-gray-500">${label}</span>
                <span class="text-lg text-gray-900">${value || 'N/A'}</span>
            </div>
        `;

        /**
         * Helper function to create a radio button for a PO item.
         * @param {Object} item - The PO item object.
         * @returns {string} HTML for the radio button list item.
         */
        const createItemRadio = (item) => {
            // Create the data object to be passed in the radio button's value
            const itemData = {
                itemId: item.itemId,
                quantity: item.quantity,
                width: item.width,
                length: item.length,
                amount: item.amount
            };

            // Stringify and escape for use in the HTML value attribute
            const itemDataString = JSON.stringify(itemData)
                .replace(/"/g, '&quot;'); // Escape quotes

            return `
            <div class="relative">
                <input type="radio" name="custpage_selected_item" id="item_${item.itemId}_${item.line}" value="${itemDataString}" class="absolute h-4 w-4 top-5 left-4 opacity-0" required>
                <label for="item_${item.itemId}_${item.line}" 
                       class="block border border-gray-200 rounded-lg p-4 cursor-pointer transition-all hover:bg-gray-50">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <span class="inline-flex items-center justify-center h-6 w-6 rounded-full border border-gray-300 bg-white transition-all">
                                <span class="h-3 w-3 rounded-full bg-blue-600 opacity-0 transition-all"></span>
                            </span>
                        </div>
                        <div class="ml-4">
                            <p class="text-md font-semibold text-blue-800">${item.itemName}</p>
                            <p class="text-sm text-gray-600">${item.description || 'No description'}</p>
                            <p class="text-sm text-gray-500 mt-1">Quantity: ${item.quantity}</p>
                            <p class="text-xs text-gray-500 mt-1">
                                W: ${item.width || 'N/A'} | L: ${item.length || 'N/A'} | Cost: £${item.amount}
                            </p>
                        </div>
                    </div>
                </label>
            </div>
            
            <style>
                #item_${item.itemId}_${item.line}:checked + label {
                    background-color: #eff6ff; /* blue-50 */
                    border-color: #2563eb; /* blue-600 */
                }
                #item_${item.itemId}_${item.line}:checked + label span:first-child {
                     border-color: #2563eb; /* blue-600 */
                }
                 #item_${item.itemId}_${item.line}:checked + label span span {
                     opacity: 1;
                 }
            </style>
        `;
        };

        return { onRequest };
    });