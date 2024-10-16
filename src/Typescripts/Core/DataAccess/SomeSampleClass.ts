/**
 * NetSuite purchase order record
 */
import * as record from 'N/record'
import { TransactionBase } from './TransactionBase'
import {AutoGetSet, Nullable} from "./NSTypedRecord";
import { AddressBase } from "./AddressBase";
// import { Sublist, SublistFieldType, SublistLine } from '../Core/DataAccess/Sublist'
// import { AddressBase } from '../Core/DataAccess/AddressBase'

/**
 * Sublist 'item' on purchase orders
 */
// export class ItemSublist extends SublistLine {
//
//   @SublistFieldType.decimalnumber
//   amount: number
//
//   @SublistFieldType.select
//   class: number
//
//   @SublistFieldType.select
//   customer: number
//
//   @SublistFieldType.checkbox
//   deferrevrec: boolean
//
//   @SublistFieldType.select
//   department: number
//
//   @SublistFieldType.textarea
//   description: string
//
//   @SublistFieldType.date
//   expectedreceiptdate: Date
//
//   @SublistFieldType.checkbox
//   isclosed: boolean
//
//   @SublistFieldType.select
//   item: number
//
//   @SublistFieldType.select
//   location: Nullable<number>
//
//   @SublistFieldType.integernumber
//   leadtime: Nullable<number>
//
//   @SublistFieldType.float
//   quantity: number
//
//   @SublistFieldType.float
//   quantityreceived: number
//
//   @SublistFieldType.float
//   quantitybilled: number
//
//   @SublistFieldType.decimalnumber
//   rate: number
//
//   @SublistFieldType.select
//   units: number
//
//   // This is documented as `text` in the records browser
//   // but shows up as what appears to be vendor internal id on records.
//   @SublistFieldType.freeformtext
//   vendorname: string | number
// }

/**
 * NetSuite purchase order record
 */
export class SomeSampleClass extends TransactionBase {

  @AutoGetSet()
  accessor approvalstatus: number

  @AutoGetSet()
  accessor balance: Nullable<number>

  @AutoGetSet()
  accessor class: Nullable<number>

  @AutoGetSet()
  accessor createdfrom: Nullable<number>

  @AutoGetSet()
  accessor currency: number

  @AutoGetSet()
  accessor employee: Nullable<number>

  @AutoGetSet()
  accessor incoterm: Nullable<number>

  @AutoGetSet()
  accessor intercotransaction: Nullable<number>

  @AutoGetSet()
  accessor isbasecurrency: boolean

  @AutoGetSet()
  accessor shipdate: Date

  @AutoGetSet()
  accessor shipmethod: Nullable<number>

  @AutoGetSet()
  accessor shipto: Nullable<number>

  // @AutoGetSubRecord()
  // billingaddress: AddressBase

  // @FieldType.subrecord(AddressBase)
  // shippingaddress: AddressBase

  @AutoGetSet()
  accessor terms: Nullable<number>

  @AutoGetSet()
  accessor tobeemailed: Nullable<boolean>

  @AutoGetSet()
  accessor tobefaxed: Nullable<boolean>

  @AutoGetSet()
  accessor tobeprinted: Nullable<boolean>

  @AutoGetSet()
  accessor total: number

  @AutoGetSet()
  accessor unbilledorders: Nullable<number>

  //@FieldType.sublist(ItemSublist)
  //item: Sublist<ItemSublist>

  override recordType () { return record.Type.PURCHASE_ORDER }
}