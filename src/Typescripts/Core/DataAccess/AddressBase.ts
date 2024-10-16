import { FieldTypeDecorator, NSTypedRecord } from './NSTypedRecord'
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

  @FieldTypeDecorator()
  accessor addr1: string

  @FieldTypeDecorator()
  accessor addr2: string

  @FieldTypeDecorator()
  accessor addr3: string

  @FieldTypeDecorator()
  accessor addressee: string

  /**
   * Note this field name differs from the 'records browser' documentation
   */
  @FieldTypeDecorator()
  accessor addrphone: string

  @FieldTypeDecorator()
  accessor addrtext: string

  @FieldTypeDecorator()
  accessor attention: string

  @FieldTypeDecorator()
  accessor city: string

  /**
   * Unlike other `select` fields which take a numeric internal id value,
   * this one requires the country abbreviation as the key (e.g. 'US')
   */
  @FieldTypeDecorator()
  accessor country: string

  @FieldTypeDecorator()
  accessor state: string

  @FieldTypeDecorator()
  accessor zip: string

  @FieldTypeDecorator()
  accessor override: boolean

  override recordType () { return ''}
}