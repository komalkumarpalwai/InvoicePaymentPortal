public without sharing class InvoicePaymentPortal {
    @AuraEnabled  // removed cacheable=true
    public static AMERP_Custom_Invoice__c getInvoiceByNumber(String invoiceNumber) {
        if (String.isBlank(invoiceNumber)) {
            AuraHandledException e = new AuraHandledException('Please enter an invoice number.');
            e.setMessage('Please enter an invoice number.');
            throw e;
        }

        String searchTerm = invoiceNumber.trim().toUpperCase();
        System.debug('Searching for invoice: ' + searchTerm);

        List<AMERP_Custom_Invoice__c> invoices = [
            SELECT
                Id,
                Name,
                AMERP_Customer__c,
                AMERP_Customer__r.Name,
                AMERP_Vendor__c,
                AMERP_Vendor__r.Name,
                Contact__c,
                Contact__r.Name,
                AMERP_Invoice_Date__c,
                AMERP_Due_Date__c,
                AMERP_Invoice_Amount__c,
                AMERP_Total_Amount__c,
                AMERP_Total_Paid_Amount__c,
                AMERP_Outstanding_Amount__c,
                Balance_Amount__c,
                AMERP_Payment_Status__c,
                AMERP_Status__c,
                AMERP_Order__c,
                AMERP_Order__r.Name,
                AMERP_Purchase_Order__c,
                AMERP_Purchase_Order__r.Name,
                AMERP_GRN__c,
                AMERP_GRN__r.Name,
                AMERP_Site__c,
                AMERP_Site__r.Name,
                AMERP_Remarks__c,
                CurrencyIsoCode
            FROM AMERP_Custom_Invoice__c
            WHERE Name = :searchTerm
            LIMIT 1
        ];

        System.debug('Records found: ' + invoices.size());

        if (invoices.isEmpty()) {
            AuraHandledException e = new AuraHandledException('Invoice not found. Please check the invoice number and try again.');
            e.setMessage('Invoice not found. Please check the invoice number and try again.');
            throw e;
        }

        return invoices[0];
    }
}