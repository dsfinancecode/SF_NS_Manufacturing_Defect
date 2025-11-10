/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @description This Suitelet provides a custom HTML/Tailwind UI to create a Manufacturing Defect record.
 * It pre-populates data from a source Purchase Order and allows the user
 * to select one item from the PO to link to the new defect record.
 *
 * It expects a 'poId' parameter in the URL for the GET request.
 */
define(['N/record', 'N/redirect', 'N/log'],
    (record, redirect, log) => {

        /**
         * Main Suitelet function.
         * @param {Object} context - The context of the Suitelet request
         */
        const onRequest = (context) => {
            log.debug('Suitelet Execution Started', `Method: ${context.request.method}`);

            if (context.request.method === 'GET') {
                handleGet(context);
            } else if (context.request.method === 'POST') {
                handlePost(context);
            } else {
                log.audit('Unsupported Method', `Received a ${context.request.method} request.`);
                context.response.write('This Suitelet only supports GET and POST requests.');
            }
        };

        /**
         * Handles the GET request to build and display the HTML form.
         * @param {Object} context - The context of the Suitelet request
         */
        const handleGet = (context) => {
            try {
                // 1. Get the Purchase Order ID from the URL parameters
                const poId = context.request.parameters.poId;
                log.debug('GET: URL Parameter "poId"', poId);

                if (!poId) {
                    log.warn('GET: Missing Parameter', 'Purchase Order ID (poId) was not provided.');
                    throw new Error('Purchase Order ID (poId) was not provided as a URL parameter.');
                }

                // 2. Load the Purchase Order record
                log.debug('GET: Loading Purchase Order', `ID: ${poId}`);
                const poRec = record.load({
                    type: record.Type.PURCHASE_ORDER,
                    id: poId,
                    isDynamic: false
                });
                log.debug('GET: Purchase Order Loaded Successfully');

                // 3. Get values for display and for hidden fields
                const supplierId = poRec.getValue('entity');
                const supplierText = poRec.getText('entity');
                const plotId = poRec.getValue('cseg_sf_plot');
                const plotText = poRec.getText('cseg_sf_plot') || 'N/A';
                const departmentId = poRec.getValue('department');
                const departmentText = poRec.getText('department') || 'N/A';
                const locationId = poRec.getValue('location');
                const locationText = poRec.getText('location') || 'N/A';
                const poName = poRec.getValue('tranid');

                // 4. Get PO Items
                const items = [];
                const lineCount = poRec.getLineCount({ sublistId: 'item' });
                log.debug('GET: Item line count', lineCount);
                for (let i = 0; i < lineCount; i++) {
                    const itemId = poRec.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                    const itemName = poRec.getSublistText({ sublistId: 'item', fieldId: 'item', line: i });
                    const itemDesc = poRec.getSublistValue({ sublistId: 'item', fieldId: 'description', line: i });
                    const itemQty = poRec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });

                    if (itemId && itemName) {
                        const optionText = `${itemName} (Qty: ${itemQty}) ${itemDesc ? '- ' + itemDesc : ''}`;
                        items.push({
                            id: itemId,
                            text: optionText
                        });
                    }
                }
                log.debug('GET: Found items', items.length);

                if (items.length === 0) {
                    throw new Error('This Purchase Order has no items to select.');
                }

                // 5. Build the HTML page
                const html = buildHtmlForm({
                    poId,
                    poName,
                    supplierId,
                    supplierText,
                    plotId,
                    plotText,
                    departmentId,
                    departmentText,
                    locationId,
                    locationText,
                    items
                });

                // 6. Write the HTML to the response
                context.response.write(html);

            } catch (e) {
                log.error('GET: Error Building Form', e.message);
                context.response.write(`<html><body><h1>Error</h1><p>Could not load the defect creation form: ${e.message}</p></body></html>`);
            }
        };

        /**
         * Builds the custom HTML form string using Tailwind CSS.
         * @param {Object} data - Data from the PO to pre-populate the form
         * @returns {string} - The complete HTML page
         */
        const buildHtmlForm = (data) => {
            // Helper function to build radio items
            const itemRadios = data.items.map((item, index) => `
                <label for="item_${item.id}" class="flex items-center p-4 bg-white border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                    <input type="radio" id="item_${item.id}" name="custpage_selected_item" value="${item.id}" class="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" ${index === 0 ? 'checked' : ''}>
                    <span class="ml-3 block text-sm font-medium text-gray-700">${item.text}</span>
                </label>
            `).join('');

            return `
                <!DOCTYPE html>
                <html lang="en" class="h-full bg-gray-100">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Create Manufacturing Defect</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                        body { font-family: 'Inter', sans-serif; }
                    </style>
                </head>
                <body class="h-full">
                    <div class="min-h-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                        <div class="max-w-2xl w-full space-y-8">
                            
                            <div class="bg-white rounded-lg shadow-md overflow-hidden">
                                <div class="bg-gray-50 border-b border-gray-200 px-6 py-5">
                                    <h1 class="text-2xl font-semibold text-gray-900">Create Manufacturing Defect</h1>
                                    <p class="text-sm text-gray-500">From Purchase Order: ${data.poName}</p>
                                </div>

                                <form method="POST">
                                    <div class="p-6">
                                        <!-- Header Info Section -->
                                        <h2 class="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">Source Information</h2>
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                            <div>
                                                <label class="block text-sm font-medium text-gray-500">Supplier</label>
                                                <p class="text-base font-medium text-gray-800">${data.supplierText}</p>
                                            </div>
                                            <div>
                                                <label class="block text-sm font-medium text-gray-500">Plot</label>
                                                <p class="text-base font-medium text-gray-800">${data.plotText}</p>
                                            </div>
                                            <div>
                                                <label class="block text-sm font-medium text-gray-500">Department</label>
                                                <p class="text-base font-medium text-gray-800">${data.departmentText}</p>
                                            </div>
                                            <div>
                                                <label class="block text-sm font-medium text-gray-500">Location</label>
                                                <p class="text-base font-medium text-gray-800">${data.locationText}</p>
                                            </div>
                                        </div>

                                        <!-- Item Selection Section -->
                                        <h2 class="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4 mt-8">Select Defective Item</h2>
                                        <fieldset class="mt-4">
                                            <legend class="sr-only">Defective Item</legend>
                                            <div class="space-y-3">
                                                ${itemRadios}
                                            </div>
                                        </fieldset>

                                        <!-- Hidden fields to pass IDs to POST -->
                                        <input type="hidden" name="custpage_po_id" value="${data.poId}">
                                        <input type="hidden" name="custpage_supplier_id" value="${data.supplierId}">
                                        <input type="hidden" name="custpage_plot_id" value="${data.plotId}">
                                        <input type="hidden" name="custpage_dept_id" value="${data.departmentId}">
                                        <input type="hidden" name="custpage_loc_id" value="${data.locationId}">
                                    </div>
                                    
                                    <!-- Form Footer / Submit -->
                                    <div class="bg-gray-50 px-6 py-4 text-right">
                                        <button type="submit" class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                            Create Defect Record
                                        </button>
                                    </div>
                                </form>
                            </div>

                        </div>
                    </div>
                </body>
                </html>
            `;
        };


        /**
         * Handles the POST request to create the new record.
         * (This logic is identical to the previous version)
         * @param {Object} context - The context of the Suitelet request
         */
        const handlePost = (context) => {
            let newRecordId;
            try {
                log.debug('POST: Processing form submission');
                const params = context.request.parameters;

                // 1. Get all parameters from the form
                const supplierId = params.custpage_supplier_id;
                const poId = params.custpage_po_id;
                const plotId = params.custpage_plot_id;
                const deptId = params.custpage_dept_id;
                const locId = params.custpage_loc_id;
                const selectedItemId = params.custpage_selected_item;

                log.debug('POST: Received Parameters', JSON.stringify({
                    supplierId, poId, plotId, deptId, locId, selectedItemId
                }));

                // 2. Validate that an item was selected
                if (!selectedItemId) {
                    log.warn('POST: Validation Failed', 'No item was selected.');
                    throw new Error('You must select a defective item to continue.');
                }

                // 3. Create the new Manufacturing Defect record
                log.debug('POST: Creating new defect record');
                const defectRec = record.create({
                    type: 'customrecord_manufacturing_defect',
                    isDynamic: true
                });

                // 4. Set all the values on the new record
                defectRec.setValue({ fieldId: 'custrecordman_defect_supplier', value: supplierId });
                defectRec.setValue({ fieldId: 'custrecordman_defect_purchaseorder', value: poId });
                defectRec.setValue({ fieldId: 'custrecord_man_defect_item', value: selectedItemId });

                // Set non-mandatory fields only if they have a value
                if (plotId && plotId !== 'null') {
                    defectRec.setValue({ fieldId: 'custrecord_man_defect_plot', value: plotId });
                }
                if (deptId && deptId !== 'null') {
                    defectRec.setValue({ fieldId: 'custrecord_man_defect_department', value: deptId });
                }
                if (locId && locId !== 'null') {
                    defectRec.setValue({ fieldId: 'custrecord_man_defect_location', value: locId });
                }

                // 5. Save the record
                newRecordId = defectRec.save();
                log.debug('POST: Record Created Successfully', `ID: ${newRecordId}`);

                // 6. Redirect the user back to the Purchase Order
                redirect.toRecord({
                    type: record.Type.PURCHASE_ORDER,
                    id: poId
                });

            } catch (e)
            {
                log.error('POST: Error Saving Record', e.message);
                // If save fails, show a user-friendly error
                context.response.write(`<html><body class="bg-gray-100 p-10"><div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6"><h1 class="text-xl font-bold text-red-600">Error</h1><p class="text-gray-700 mt-2">Could not save the defect record: ${e.message}</p><p class="mt-4"><a href="javascript:history.back()" class="text-blue-500 hover:underline">&laquo; Go Back</a></p></div><script src="https://cdn.tailwindcss.com"></script></body></html>`);
            }
        };

        return { onRequest };
    });