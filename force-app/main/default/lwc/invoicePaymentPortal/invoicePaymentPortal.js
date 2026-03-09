import { LightningElement, track } from 'lwc';
import getInvoiceByNumber from '@salesforce/apex/InvoicePaymentPortal.getInvoiceByNumber';
import makePayment from '@salesforce/apex/InvoicePaymentPortal.makePayment';

export default class InvoicePaymentPortal extends LightningElement {
    @track invoiceNumber = '';
    @track invoiceRecord;
    @track isLoading = false;
    @track errorMessage = '';

    // Payment form properties
    @track showPaymentSection = false;
    @track showSuccessScreen = false;
    @track selectedPaymentMode = 'UPI';
    @track paymentAmount = 0;
    @track paymentDate = '';
    @track isPaymentLoading = false;
    @track paymentErrorMessage = '';
    @track newPaymentId = '';

    // Payment data object
    @track paymentData = {
        upiId: '',
        upiAppName: '',
        upiReferenceNumber: '',
        cashReceiptNumber: '',
        cashReceivedBy: '',
        bankName: '',
        bankAccountNumber: '',
        ifscCode: '',
        transactionReference: '',
        cardType: '',
        cardHolderName: '',
        cardNumber: '',
        transactionId: ''
    };

    handleInvoiceNumberChange(event) {
        this.invoiceNumber = event.target.value;
    }

    handleSearch() {
        if (!this.invoiceNumber || this.invoiceNumber.trim() === '') {
            this.errorMessage = 'Please enter an invoice number.';
            this.invoiceRecord = null;
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';
        this.invoiceRecord = null;

        console.log('Searching for:', JSON.stringify(this.invoiceNumber));

        getInvoiceByNumber({ invoiceNumber: this.invoiceNumber.trim() })
            .then((result) => {
                console.log('Result received:', JSON.stringify(result));
                this.invoiceRecord = result;
                this.errorMessage = '';
                this.isLoading = false;
            })
            .catch((error) => {
                console.error('Error full object:', JSON.stringify(error));
                console.error('Error body:', JSON.stringify(error?.body));
                console.error('Error message:', error?.body?.message);

                if (error?.body?.message) {
                    this.errorMessage = error.body.message;
                } else if (error?.message) {
                    this.errorMessage = error.message;
                } else {
                    this.errorMessage = 'An error occurred. Please try again.';
                }

                this.invoiceRecord = null;
                this.isLoading = false;
            });
    }

    handleKeyPress(event) {
        if (event.keyCode === 13) {
            this.handleSearch();
        }
    }

    handleClear() {
        this.invoiceNumber = '';
        this.invoiceRecord = null;
        this.errorMessage = '';
        this.showPaymentSection = false;
        this.showSuccessScreen = false;
    }

    formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    formatCurrency(amount) {
        if (amount === null || amount === undefined) return 'N/A';
        const currency = this.invoiceRecord?.CurrencyIsoCode || 'INR';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    get formattedInvoiceDate() {
        return this.formatDate(this.invoiceRecord?.AMERP_Invoice_Date__c);
    }

    get formattedDueDate() {
        return this.formatDate(this.invoiceRecord?.AMERP_Due_Date__c);
    }

    get formattedInvoiceAmount() {
        return this.formatCurrency(this.invoiceRecord?.AMERP_Invoice_Amount__c);
    }

    get formattedTotalAmount() {
        return this.formatCurrency(this.invoiceRecord?.AMERP_Total_Amount__c);
    }

    get formattedPaidAmount() {
        return this.formatCurrency(this.invoiceRecord?.AMERP_Total_Paid_Amount__c);
    }

    get formattedOutstandingAmount() {
        return this.formatCurrency(this.invoiceRecord?.AMERP_Outstanding_Amount__c);
    }

    get formattedBalanceAmount() {
        return this.formatCurrency(this.invoiceRecord?.Balance_Amount__c);
    }

    get formattedPaymentAmount() {
        return this.formatCurrency(this.paymentAmount);
    }

    get formattedPaymentDate() {
        return this.formatDate(this.paymentDate);
    }

    get paymentStatusClass() {
        const status = this.invoiceRecord?.AMERP_Payment_Status__c?.toLowerCase();
        if (status === 'paid') return 'status-badge status-paid';
        if (status === 'overdue') return 'status-badge status-overdue';
        if (status === 'partial') return 'status-badge status-partial';
        return 'status-badge status-pending';
    }

    get invoiceStatusClass() {
        const status = this.invoiceRecord?.AMERP_Status__c?.toLowerCase();
        if (status === 'active') return 'status-badge status-paid';
        if (status === 'cancelled') return 'status-badge status-overdue';
        return 'status-badge status-pending';
    }

    get hasOutstanding() {
        return this.invoiceRecord && this.invoiceRecord.AMERP_Outstanding_Amount__c > 0;
    }

    handleMakePayment() {
        this.showPaymentSection = true;
        this.paymentAmount = this.invoiceRecord.AMERP_Outstanding_Amount__c;
        this.paymentDate = new Date().toISOString().split('T')[0];
        this.paymentErrorMessage = '';
        
        // Scroll to payment section after render
        setTimeout(() => {
            const paymentSection = this.template.querySelector('.payment-section');
            if (paymentSection) {
                paymentSection.scrollIntoView({ behavior: 'smooth' });
            }
        }, 100);
    }

    handlePaymentModeSelect(event) {
        this.selectedPaymentMode = event.currentTarget.dataset.mode;
        // Reset form fields when mode changes
        this.paymentData = {
            upiId: '',
            upiAppName: '',
            upiReferenceNumber: '',
            cashReceiptNumber: '',
            cashReceivedBy: '',
            bankName: '',
            bankAccountNumber: '',
            ifscCode: '',
            transactionReference: '',
            cardType: '',
            cardHolderName: '',
            cardNumber: '',
            transactionId: ''
        };
        this.paymentErrorMessage = '';
    }

    handlePaymentFieldChange(event) {
        const fieldName = event.target.dataset.field;
        const value = event.target.value;
        
        if (fieldName === 'paymentAmount') {
            this.paymentAmount = value ? parseFloat(value) : 0;
        } else if (fieldName === 'paymentDate') {
            this.paymentDate = value;
        } else {
            this.paymentData = {
                ...this.paymentData,
                [fieldName]: value
            };
        }
    }

    validatePaymentFields() {
        // Check common required fields
        if (!this.paymentAmount || this.paymentAmount <= 0) {
            this.paymentErrorMessage = 'Payment amount must be greater than 0.';
            return false;
        }

        if (this.paymentAmount > this.invoiceRecord.AMERP_Outstanding_Amount__c) {
            this.paymentErrorMessage = 'Payment amount cannot exceed outstanding amount.';
            return false;
        }

        if (!this.paymentDate) {
            this.paymentErrorMessage = 'Payment date is required.';
            return false;
        }

        // Validate mode-specific fields
        if (this.selectedPaymentMode === 'UPI') {
            if (!this.paymentData.upiId || !this.paymentData.upiId.trim()) {
                this.paymentErrorMessage = 'UPI ID is required.';
                return false;
            }
            if (!this.paymentData.upiAppName) {
                this.paymentErrorMessage = 'UPI App Name is required.';
                return false;
            }
            if (!this.paymentData.upiReferenceNumber || !this.paymentData.upiReferenceNumber.trim()) {
                this.paymentErrorMessage = 'UPI Reference Number is required.';
                return false;
            }
        } else if (this.selectedPaymentMode === 'Cash') {
            if (!this.paymentData.cashReceiptNumber || !this.paymentData.cashReceiptNumber.trim()) {
                this.paymentErrorMessage = 'Cash Receipt Number is required.';
                return false;
            }
            if (!this.paymentData.cashReceivedBy || !this.paymentData.cashReceivedBy.trim()) {
                this.paymentErrorMessage = 'Cash Received By is required.';
                return false;
            }
        } else if (this.selectedPaymentMode === 'Bank Transfer') {
            if (!this.paymentData.bankName || !this.paymentData.bankName.trim()) {
                this.paymentErrorMessage = 'Bank Name is required.';
                return false;
            }
            if (!this.paymentData.bankAccountNumber || !this.paymentData.bankAccountNumber.trim()) {
                this.paymentErrorMessage = 'Bank Account Number is required.';
                return false;
            }
            if (!this.paymentData.ifscCode || !this.paymentData.ifscCode.trim()) {
                this.paymentErrorMessage = 'IFSC Code is required.';
                return false;
            }
            if (!this.paymentData.transactionReference || !this.paymentData.transactionReference.trim()) {
                this.paymentErrorMessage = 'Transaction Reference is required.';
                return false;
            }
        } else if (this.selectedPaymentMode === 'Card') {
            if (!this.paymentData.cardType) {
                this.paymentErrorMessage = 'Card Type is required.';
                return false;
            }
            if (!this.paymentData.cardHolderName || !this.paymentData.cardHolderName.trim()) {
                this.paymentErrorMessage = 'Card Holder Name is required.';
                return false;
            }
            if (!this.paymentData.cardNumber || !this.paymentData.cardNumber.trim()) {
                this.paymentErrorMessage = 'Card Number is required.';
                return false;
            }
            if (!this.paymentData.transactionId || !this.paymentData.transactionId.trim()) {
                this.paymentErrorMessage = 'Transaction ID is required.';
                return false;
            }
        }

        return true;
    }

    handlePayNow() {
        this.paymentErrorMessage = '';

        if (!this.validatePaymentFields()) {
            return;
        }

        this.isPaymentLoading = true;

        // Build payment data map
        const paymentPayload = {
            invoiceId: this.invoiceRecord.Id,
            customerId: this.invoiceRecord.AMERP_Customer__c,
            paymentMode: this.selectedPaymentMode,
            paymentAmount: this.paymentAmount,
            paymentDate: this.paymentDate,
            currencyIsoCode: this.invoiceRecord.CurrencyIsoCode,
            ...this.paymentData
        };

        console.log('Payment payload:', JSON.stringify(paymentPayload));

        makePayment({ paymentData: paymentPayload })
            .then((result) => {
                console.log('Payment successful, ID:', result);
                this.newPaymentId = result;
                this.showPaymentSection = false;
                this.showSuccessScreen = true;
                this.isPaymentLoading = false;
                
                // Refresh invoice details to show updated payment information
                this.refreshInvoiceData();
            })
            .catch((error) => {
                console.error('Payment error:', JSON.stringify(error));
                if (error?.body?.message) {
                    this.paymentErrorMessage = error.body.message;
                } else if (error?.message) {
                    this.paymentErrorMessage = error.message;
                } else {
                    this.paymentErrorMessage = 'Payment processing failed. Please try again.';
                }
                this.isPaymentLoading = false;
            });
    }

    refreshInvoiceData() {
        if (!this.invoiceNumber || !this.invoiceNumber.trim()) {
            return;
        }

        console.log('Refreshing invoice data for:', this.invoiceNumber);

        getInvoiceByNumber({ invoiceNumber: this.invoiceNumber.trim() })
            .then((result) => {
                console.log('Invoice refreshed:', JSON.stringify(result));
                this.invoiceRecord = result;
            })
            .catch((error) => {
                console.error('Error refreshing invoice:', JSON.stringify(error));
                // Don't show error during refresh, just log it
            });
    }

    handleCancelPayment() {
        this.showPaymentSection = false;
        this.paymentErrorMessage = '';
        this.paymentData = {
            upiId: '',
            upiAppName: '',
            upiReferenceNumber: '',
            cashReceiptNumber: '',
            cashReceivedBy: '',
            bankName: '',
            bankAccountNumber: '',
            ifscCode: '',
            transactionReference: '',
            cardType: '',
            cardHolderName: '',
            cardNumber: '',
            transactionId: ''
        };
    }

    handleSearchAnother() {
        this.invoiceNumber = '';
        this.invoiceRecord = null;
        this.errorMessage = '';
        this.showPaymentSection = false;
        this.showSuccessScreen = false;
        this.selectedPaymentMode = 'UPI';
        this.paymentData = {
            upiId: '',
            upiAppName: '',
            upiReferenceNumber: '',
            cashReceiptNumber: '',
            cashReceivedBy: '',
            bankName: '',
            bankAccountNumber: '',
            ifscCode: '',
            transactionReference: '',
            cardType: '',
            cardHolderName: '',
            cardNumber: '',
            transactionId: ''
        };
        this.newPaymentId = null;
    }

    get upiAppOptions() {
        return [
            { label: 'GPay', value: 'GPay' },
            { label: 'PhonePe', value: 'PhonePe' },
            { label: 'Paytm', value: 'Paytm' },
            { label: 'BHIM', value: 'BHIM' },
            { label: 'Other', value: 'Other' }
        ];
    }

    get cardTypeOptions() {
        return [
            { label: 'Visa', value: 'Visa' },
            { label: 'Mastercard', value: 'Mastercard' },
            { label: 'Amex', value: 'Amex' },
            { label: 'Rupay', value: 'Rupay' }
        ];
    }

    get isUPIMode() {
        return this.selectedPaymentMode === 'UPI';
    }

    get isCashMode() {
        return this.selectedPaymentMode === 'Cash';
    }

    get isBankMode() {
        return this.selectedPaymentMode === 'Bank Transfer';
    }

    get isCardMode() {
        return this.selectedPaymentMode === 'Card';
    }

    get upiTabClass() {
        const baseClass = 'payment-tab';
        return this.selectedPaymentMode === 'UPI' ? `${baseClass} active` : baseClass;
    }

    get cashTabClass() {
        const baseClass = 'payment-tab';
        return this.selectedPaymentMode === 'Cash' ? `${baseClass} active` : baseClass;
    }

    get bankTabClass() {
        const baseClass = 'payment-tab';
        return this.selectedPaymentMode === 'Bank Transfer' ? `${baseClass} active` : baseClass;
    }

    get cardTabClass() {
        const baseClass = 'payment-tab';
        return this.selectedPaymentMode === 'Card' ? `${baseClass} active` : baseClass;
    }

    getPaymentModeTabClass(mode) {
        const baseClass = 'payment-tab';
        return this.selectedPaymentMode === mode ? `${baseClass} active` : baseClass;
    }
}