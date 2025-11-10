/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/record'], (record) => {

    const onRequest = (context) => {
        if (context.request.method === 'POST') {
            try {
                const data = JSON.parse(context.request.body);
                const poId = data.poId;

                const defectRec = record.create({
                    type: 'customrecord_manufacturing_defect',
                    isDynamic: true
                });

                defectRec.setValue({
                    fieldId: 'custrecord_related_po',
                    value: poId
                });

                const defectId = defectRec.save();

                context.response.write(JSON.stringify({
                    success: true,
                    recordId: defectId
                }));
            } catch (e) {
                context.response.write(JSON.stringify({
                    success: false,
                    message: e.message
                }));
            }
        } else {
            context.response.write('Use POST method');
        }
    };

    return { onRequest };
});
