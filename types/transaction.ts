export enum TransactionType {
  In = "IN",
  Out = "OUT",
}

export interface Transaction {
  UserID?: string;
  ID: string;
  Amount: number;
  CreatedAt: string;
  Type: TransactionType;
  Description: string;
}
