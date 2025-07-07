export enum TransactionType {
  In = "IN",
  Out = "OUT",
}

export interface Transaction {
  UserID?: string;
  ID: string;
  Amount: number;
  Description: string;
  Type: TransactionType;
  CreatedAt: string;
}
