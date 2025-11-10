/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @description Client script for the "Report Defect" button on a Purchase Order.
 * This script calls a Suitelet to open a new, pre-populated defect record.
 */
define(['N/currentRecord', 'N/url', 'N/ui/dialog'], 
    (currentRecord, url, dialog) => {

    // Required entry point (even if empty)
    const pageInit = (context) => {
        // This function is triggered when the page loads.
        // No action needed here for this use case.
    };

    /**
     * Function to be executed when the "Report Defect" button is clicked.
     * This function navigates the user to a Suitelet, passing the current
     * PO ID as a parameter. The Suitelet then redirects to a new
     * pre-populated record.
     */
    const onReportDefectClick = () => {
        try {
            // 1. Get the current Purchase Order ID
            const rec = currentRecord.get();
            const poId = rec.id;

            if (!poId) {
                throw new Error('Could not get the Purchase Order ID.');
            }

            // 2. Resolve the URL for the Suitelet
            // Note: The scriptId and deploymentId must match your Suitelet.
            const suiteletUrl = url.resolveScript({
                scriptId: 'customscript2142',       // Make sure this is your Suitelet's Script ID
                deploymentId: 'customdeploy1',   // Make sure this is your Suitelet's Deployment ID
                returnExternalUrl: false // We are navigating internally
            });

            // 3. Build the final URL with the poId as a parameter
            const finalUrl = suiteletUrl + '&poId=' + poId;

            // 4. Navigate the browser to the Suitelet
            // This performs a GET request. The browser will then follow the
            // redirect response from the Suitelet.
            window.location.href = finalUrl;

        } catch (e) {
            // Show an error message if anything goes wrong
            dialog.alert({
                title: 'Error',
                message: `Unexpected error: ${e.message}`
            });
        }
    };

    return {
        pageInit: pageInit,
        onReportDefectClick: onReportDefectClick
    };
});