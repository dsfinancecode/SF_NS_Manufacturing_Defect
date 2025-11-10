/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/ui/serverWidget'], (ui) => {

    const beforeLoad = (context) => {
        if (context.type !== context.UserEventType.VIEW) return;

        const form = context.form;
        form.clientScriptModulePath = 'SuiteScripts/Manufacturing_Defect/cs_man_defect.js';

        form.addButton({
            id: 'custpage_report_defect',
            label: 'Report Defect',
            functionName: 'onReportDefectClick'
        });
    };

    return { beforeLoad };
});
