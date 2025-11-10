/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/ui/serverWidget', 'N/ui/message', 'N/runtime', 'N/log'], 
    (ui, message, runtime, log) => {

    /**
     * @param {Object} context
     */
    const beforeLoad = (context) => {
        
        // --- Run only on View mode in the UI ---
        if (context.type !== context.UserEventType.VIEW || 
            runtime.executionContext !== runtime.ContextType.USER_INTERFACE) {
            return;
        }

        const form = context.form;

        // --- Existing Logic: Add Button & Client Script ---
        form.clientScriptModulePath = 'SuiteScripts/Manufacturing_Defect/cs_man_defect.js';

        form.addButton({
            id: 'custpage_report_defect',
            label: 'Report Defect',
            functionName: 'onReportDefectClick'
        });

        // --- NEW SNIPPET START: Show success message on redirect ---
        try {
            const request = context.request;

            // Check if the request object and its parameters exist
            if (request && request.parameters) {
                
                // Check for the "signal" parameters we set in the Suitelet
                const defectSaved = request.parameters.custpage_defect_saved;
                const newDefectId = request.parameters.new_defect_id;

                // If the signal is present, show the success message
                if (defectSaved === 'T' && newDefectId) {
                    log.debug('PO beforeLoad', 'Defect success signal received. ID: ' + newDefectId);

                    const successMessage = `Successfully created Manufacturing Defect record (ID: ${newDefectId}).`;

                    // Display a green confirmation banner at the top of the page
                    form.addPageInitMessage({
                        type: message.Type.CONFIRMATION, // This makes the banner green
                        title: 'Success!',
                        message: successMessage,
                        duration: 10000 // Show the message for 10 seconds
                    });
                }
            }
        } catch (e) {
            log.error('PO Defect Message UE Error', e.message);
            // Don't crash the PO load if the message fails
        }
        // --- NEW SNIPPET END ---
    };

    return { beforeLoad };
});