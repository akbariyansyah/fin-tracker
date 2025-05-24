export enum TransactionType {
  In = "IN",
  Out = "OUT",
}


export interface Transaction {
    ID: string;
    Amount: number;
    Timestamp: string;
    Type: TransactionType;
    Description:string;
}
