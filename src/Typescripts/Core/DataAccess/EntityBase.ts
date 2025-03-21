import { FieldTypeDecorator, NSTypedRecord } from './NSTypedRecord';

/**
 * NetSuite generic Entity used as a common base class for 'entity-like' records,
 * This is meant to be inherited by concrete record types to avoid duplicating effort on fields.
 * Note that this inheritance hierarchy emerged empirically - it's not documented by NetSuite.
 *
 * It contains fields common to all 'entity' records in NS
 */
export abstract class EntityBase extends NSTypedRecord {

  @FieldTypeDecorator()
  accessor accountnumber: string

  @FieldTypeDecorator()
  accessor altemail: string

  @FieldTypeDecorator()
  accessor altphone: string

  @FieldTypeDecorator()
  accessor balance: number

  @FieldTypeDecorator()
  accessor billpay: boolean

  @FieldTypeDecorator()
  accessor category: number

  @FieldTypeDecorator()
  accessor comments: string

  @FieldTypeDecorator()
  accessor companyname: string

  @FieldTypeDecorator()
  accessor currency: number

  @FieldTypeDecorator()
  accessor customform: number

  @FieldTypeDecorator()
  accessor datecreated: Date

  @FieldTypeDecorator()
  accessor email: string

  @FieldTypeDecorator()
  accessor entityid: string

  @FieldTypeDecorator()
  accessor entitystatus: number

  @FieldTypeDecorator()
  accessor externalid: string

  @FieldTypeDecorator()
  accessor fax: string

  @FieldTypeDecorator()
  accessor firstname: string

  @FieldTypeDecorator()
  accessor isinactive: boolean

  @FieldTypeDecorator()
  accessor isperson: 'T' | 'F' | null

  @FieldTypeDecorator()
  accessor lastmodifieddate: Date

  @FieldTypeDecorator()
  accessor language: number

  @FieldTypeDecorator()
  accessor lastname: string

  @FieldTypeDecorator()
  accessor parent: number

  @FieldTypeDecorator()
  accessor phone: string

  @FieldTypeDecorator()
  accessor subsidiary: number

  @FieldTypeDecorator()
  accessor taxitem: number

  @FieldTypeDecorator()
  accessor terms: number

  override recordType() {
    return '';
  }

}