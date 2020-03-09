import Web3 from "web3";
import {Contract} from "web3-eth-contract";
import {AbiItem} from "web3-utils";
import {Observable} from "rxjs";
import {LogsOptions, TransactionConfig, } from "web3-core";
import {BlockTransactionObject} from "web3-eth";

export default class Subspace {
  constructor(web3: Web3, options?: SubspaceOptions);
  async init(): void;
  contract(contractInstance: Contract | ContractLike): Contract;
  clearDB(collection: string) : void;
  trackProperty(contractInstance: Contract, propName: string, methodArgs?: any[], callArgs?: TransactionConfig): Observable<any>;
  trackLogs(options?: LogsOptions, inputsABI?: AbiItem): Observable<any>;
  trackEvent(contractInstance: Contract, eventName: string, filterConditions: any): Observable<object>;
  trackBalance(address: string, erc20Address?: string): Observable<string>;
  trackBlockNumber(): Observable<number>;
  trackBlock(): Observable<BlockTransactionObject>;
  trackGasPrice(): Observable<string>;
  trackAverageBlocktime(): Observable<number>;
  close(): void;
}

export interface ContractLike {
  address?: string;
  deployedAddress?: string;
  abi?: AbiItem[];
  abiDefinition?: AbiItem[];
  from?: string;
  defaultAddress?: string;
  gas?: string | number;
}

export interface SubspaceOptions {
  dbFilename?: string;
  callInterval?: number;
  refreshLastNBlocks?: number;
  disableSubscriptions?: boolean;
}