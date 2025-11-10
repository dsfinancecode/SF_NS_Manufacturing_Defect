/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/currentRecord', 'N/https', 'N/url', 'N/ui/dialog'], (currentRecord, https, url, dialog) => {

    const onReportDefectClick = async () => {
        try {
            const rec = currentRecord.get();
            const poId = rec.id;

            const suiteletUrl = url.resolveScript({
                scriptId: 'customscript_po_report_defect_sl',
                deploymentId: 'customdeploy_po_report_defect_sl',
                returnExternalUrl: false
            });

            // Send POST request to Suitelet
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

    return { onReportDefectClick };
});
