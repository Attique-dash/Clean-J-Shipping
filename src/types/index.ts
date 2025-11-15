export interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
  description?: string;
}

export interface Invoice extends Omit<InvoiceData, 'items'> {
  _id?: string;
  items: InvoiceItem[];
  status?: 'draft' | 'sent' | 'paid' | 'overdue';
  createdAt?: Date;
  updatedAt?: Date;
}
