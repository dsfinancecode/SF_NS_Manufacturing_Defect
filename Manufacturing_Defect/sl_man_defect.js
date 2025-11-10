/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @description This Suitelet redirects a user to a new Manufacturing Defect record,
 * pre-populating fields based on a source Purchase Order.
 * It expects a 'poId' parameter in the URL.
 */
define(['N/record', 'N/redirect', 'N/log'], (record, redirect, log) => {

    const onRequest = (context) => {
        log.debug('Suitelet Execution Started', `Method: ${context.request.method}`);

        // This pattern now expects a GET request
        if (context.request.method === 'GET') {
            try {
                // 1. Get the Purchase Order ID from the URL parameters
                const poId = context.request.parameters.poId;
                log.debug('URL Parameter "poId"', poId);

                if (!poId) {
                    log.warn('Missing Parameter', 'Purchase Order ID (poId) was not provided.');
                    throw new Error('Purchase Order ID (poId) was not provided as a URL parameter.');
                }

                // 2. Load the Purchase Order record to get values from it
                log.debug('Loading Purchase Order', `ID: ${poId}`);
                const poRec = record.load({
                    type: record.Type.PURCHASE_ORDER,
                    id: poId,
                    isDynamic: false // We are only reading values, so no need for dynamic mode
                });
                log.debug('Purchase Order Loaded Successfully');

                // 3. Get the required values from the Purchase Order
                const supplier = poRec.getValue('entity');
                const plot = poRec.getValue('cseg_sf_plot');
                const department = poRec.getValue('department');
                const location = poRec.getValue('location');

                log.debug('Values Retrieved from PO', JSON.stringify({
                    supplier: supplier,
                    plot: plot,
                    department: department,
                    location: location
                }));

                // 4. Prepare the parameters for the new record
                // The keys in this object are the *field IDs* on the target record
                const newRecordParams = {
                    'custrecordman_defect_supplier': supplier,
                    'custrecordman_defect_purchaseorder': poId,
                    'custrecord_man_defect_plot': plot,
                    'custrecord_man_defect_department': department,
                    'custrecord_man_defect_location': location
                };

                log.debug('New Record Parameters Prepared', JSON.stringify(newRecordParams));

                // 5. Redirect the user to a new record in edit mode
                // This opens the new record page in the user's browser,
                // fills the fields, but does *not* save the record.
                log.debug('Redirecting user...', 'Type: customrecord_manufacturing_defect');
                redirect.toRecord({
                    type: 'customrecord_manufacturing_defect',
                    isEditMode: true, // This is what shows the record in "edit mode"
                    parameters: newRecordParams
                });

            } catch (e) {
                log.error('Error Redirecting to New Defect Record', e.message);
                // Write a user-friendly error message to the screen if something goes wrong
                context.response.write(`<html><body><h1>Error</h1><p>Could not create the new defect record: ${e.message}</p></body></html>`);
            }
        } else {
            // Handle other methods (like POST) if they are not expected
            log.audit('Unsupported Method', `Received a ${context.request.method} request. This Suitelet only supports GET.`);
            context.response.write('This Suitelet should be accessed via a GET request (e.g., from a button).');
        }
    };

    return { onRequest };
});