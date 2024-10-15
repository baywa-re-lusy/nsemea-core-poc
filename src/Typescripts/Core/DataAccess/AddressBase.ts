import { AutoGetSet, NSTypedRecord } from './NSTypedRecord'
import {Type} from "N/record";

/**
 * The addressbook 'subrecord'. In SS2.x this is mostly treated as a normal record,
 * but you can't create or load one from scratch. Typically just reference this type
 * on the appropriate address subrecord property. For example,
 *
 * @example - a Customer instance can refer to the first address's subrecord simply as:
 *
 * customer.addressbook[0].addressbookaddress.addr1
 *
 *
 * @example - defining custom addressbook subrecord fields.

 ```typescript

 // define custom fields on address subrecord (optional)
 export class MyCustomAddressClass extends AddressBase {
 // ... define custom address subrecord fields here
 }

 // tell the customer address sublist to use our custom subrecord class
 export class MyAddressSublist extends CustomerAddressSublist {
 @SublistFieldType.subrecord(MyCustomAddressClass)
 addressbookaddress: MyCustomAddressClass
 }
 ```
 */
export class AddressBase extends NSTypedRecord {

  @AutoGetSet()
  accessor addr1: string

  @AutoGetSet()
  accessor addr2: string

  @AutoGetSet()
  accessor addr3: string

  @AutoGetSet()
  accessor addressee: string

  /**
   * Note this field name differs from the 'records browser' documentation
   */
  @AutoGetSet()
  accessor addrphone: string

  @AutoGetSet()
  accessor addrtext: string

  @AutoGetSet()
  accessor attention: string

  @AutoGetSet()
  accessor city: string

  /**
   * Unlike other `select` fields which take a numeric internal id value,
   * this one requires the country abbreviation as the key (e.g. 'US')
   */
  @AutoGetSet()
  accessor country: string

  @AutoGetSet()
  accessor state: string

  @AutoGetSet()
  accessor zip: string

  @AutoGetSet()
  accessor override: boolean

  override recordType () { return Type.SALES_ORDER }
}