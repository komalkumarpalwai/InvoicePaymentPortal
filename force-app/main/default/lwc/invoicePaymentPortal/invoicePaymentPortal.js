import { LightningElement, track } from 'lwc';
import getInvoiceByNumber from '@salesforce/apex/InvoicePaymentPortal.getInvoiceByNumber';

export default class InvoicePaymentPortal extends LightningElement {
    @track invoiceNumber = '';
    @track invoiceRecord;
    @track isLoading = false;
    @track errorMessage = '';

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
}