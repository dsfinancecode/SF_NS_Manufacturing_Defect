/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/currentRecord', 'N/https', 'N/url', 'N/ui/dialog'], 
    (currentRecord, https, url, dialog) => {

    // Required entry point (even if empty)
    const pageInit = (context) => {};

    // Custom button handler
    const onReportDefectClick = async () => {
        try {
            const rec = currentRecord.get();
            const poId = rec.id;

            const suiteletUrl = url.resolveScript({
                scriptId: 'customscript2142',
                deploymentId: 'customdeploy1',
                returnExternalUrl: false
            });

            const response = https.post({
                url: suiteletUrl,
                body: JSON.stringify({ poId })
            });

            const result = JSON.parse(response.body);

            if (result.success) {
                dialog.alert({
                    title: 'Defect Reported',
                    message: `Defect record created (ID: ${result.recordId})`
                });
            } else {
                dialog.alert({
                    title: 'Error',
                    message: `Failed to create defect record: ${result.message}`
                });
            }

        } catch (e) {
            dialog.alert({
                title: 'Error',
                message: `Unexpected error: ${e.message}`
            });
        }
    };

    return { pageInit, onReportDefectClick };
});
