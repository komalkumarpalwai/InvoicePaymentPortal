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

    @AuraEnabled
    public static String makePayment(Map<String, Object> paymentData) {
        try {
            System.debug('Payment data received: ' + JSON.serialize(paymentData));

            // Extract required fields from map
            String invoiceId = (String) paymentData.get('invoiceId');
            String customerId = (String) paymentData.get('customerId');
            String paymentMode = (String) paymentData.get('paymentMode');
            Decimal paymentAmount = getDecimalValue(paymentData.get('paymentAmount'));
            String paymentDate = (String) paymentData.get('paymentDate');
            String currencyCode = (String) paymentData.get('currencyIsoCode');
            String transactionId = (String) paymentData.get('transactionId');

            System.debug('Extracted fields - InvoiceId: ' + invoiceId + ', CustomerId: ' + customerId + ', Mode: ' + paymentMode);

            // Validate mandatory fields
            if (String.isBlank(invoiceId)) {
                throw new AuraHandledException('Invoice ID is missing.');
            }
            if (String.isBlank(customerId)) {
                throw new AuraHandledException('Customer ID is missing.');
            }
            if (String.isBlank(paymentMode)) {
                throw new AuraHandledException('Payment mode is required.');
            }
            if (paymentAmount == null || paymentAmount <= 0) {
                throw new AuraHandledException('Payment amount must be greater than 0.');
            }

            // Create payment record
            AMERP_Invoice_Payment__c payment = new AMERP_Invoice_Payment__c();
            payment.AMERP_Invoice__c = invoiceId;
            payment.AMERP_Customer__c = customerId;
            payment.AMERP_Payment_Amount__c = paymentAmount;
            
            // Parse payment date safely
            if (String.isNotBlank(paymentDate)) {
                try {
                    payment.AMERP_Payment_Date__c = Date.valueOf(paymentDate);
                } catch (Exception dateEx) {
                    System.debug('Date parsing error: ' + dateEx.getMessage());
                    payment.AMERP_Payment_Date__c = System.today();
                }
            } else {
                payment.AMERP_Payment_Date__c = System.today();
            }
            
            payment.AMERP_Payment_Mode__c = paymentMode;
            payment.AMERP_Payment_Status__c = 'Received';
            payment.AMERP_Transaction_Id__c = transactionId;
            if (String.isNotBlank(currencyCode)) {
                payment.CurrencyIsoCode = currencyCode;
            }

            System.debug('Payment record before mode-specific fields: ' + JSON.serialize(payment));

            // Set mode-specific fields
            if (paymentMode == 'UPI') {
                payment.AMERP_UPI_Id__c = (String) paymentData.get('upiId');
                payment.AMERP_UPI_App_Name__c = (String) paymentData.get('upiAppName');
                payment.AMERP_Name_On_Upi__c = (String) paymentData.get('nameOnUpi');
                System.debug('UPI fields set: UPI_Id=' + payment.AMERP_UPI_Id__c);
            } else if (paymentMode == 'Cash') {
                payment.AMERP_Cash_Receipt_Number__c = (String) paymentData.get('cashReceiptNumber');
                payment.AMERP_Cash_Received_By__c = (String) paymentData.get('cashReceivedBy');
                System.debug('Cash fields set: Receipt=' + payment.AMERP_Cash_Receipt_Number__c);
            } else if (paymentMode == 'Bank Transfer') {
                payment.AMERP_Bank_Name__c = (String) paymentData.get('bankName');
                payment.AMERP_Bank_Account_Number__c = (String) paymentData.get('bankAccountNumber');
                payment.AMERP_IFSC_Code__c = (String) paymentData.get('ifscCode');
                System.debug('Bank fields set: Bank=' + payment.AMERP_Bank_Name__c);
            } else if (paymentMode == 'Card') {
                payment.AMERP_Card_Type__c = (String) paymentData.get('cardType');
                payment.AMERP_Card_Holder_Name__c = (String) paymentData.get('cardHolderName');
                String cardNumber = (String) paymentData.get('cardNumber');
                // Store only last 4 digits for security
                if (String.isNotBlank(cardNumber) && cardNumber.length() >= 4) {
                    payment.AMERP_Card_Number__c = cardNumber.substring(cardNumber.length() - 4);
                }
                System.debug('Card fields set: CardType=' + payment.AMERP_Card_Type__c);
            }

            System.debug('Final payment record: ' + JSON.serialize(payment));

            // Insert record
            insert payment;
            System.debug('Payment record created with ID: ' + payment.Id);
            return payment.Id;
        } catch (AuraHandledException ahe) {
            System.debug('AuraHandledException: ' + ahe.getMessage());
            throw ahe;
        } catch (Exception ex) {
            System.debug('Error in makePayment: ' + ex.getMessage() + ' at line ' + ex.getLineNumber());
            System.debug('Stack trace: ' + ex.getStackTraceString());
            AuraHandledException e = new AuraHandledException('Payment processing failed: ' + ex.getMessage());
            e.setMessage('Payment processing failed: ' + ex.getMessage());
            throw e;
        }
    }

    // Helper method to safely convert Object to Decimal
    private static Decimal getDecimalValue(Object value) {
        if (value == null) return null;
        if (value instanceof Decimal) return (Decimal) value;
        if (value instanceof Double) return Decimal.valueOf((Double) value);
        if (value instanceof Integer) return Decimal.valueOf((Integer) value);
        if (value instanceof String) {
            String strValue = (String) value;
            if (String.isBlank(strValue)) return null;
            return Decimal.valueOf(strValue);
        }
        return null;
    }
}