export interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
  description?: string;
}

export interface Invoice extends Omit<InvoiceItem, 'quantity' | 'price' | 'total'> {
  _id?: string;
  items: InvoiceItem[];
  status?: 'draft' | 'sent' | 'paid' | 'overdue';
  createdAt?: Date;
  updatedAt?: Date;
}
