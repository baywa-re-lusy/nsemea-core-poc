/**
 * NetSuite generic transaction record
 */

import { FieldTypeDecorator, NSTypedRecord } from './NSTypedRecord'
import { FieldValue } from "N/record";

/**
 * Fields common to all transactions in NS, and is the share base class for transaction types.
 * Note that when using this base class, pass an existing native NS record object to the constructor.
 * Attempting to create a new instance of this class from scratch
 * or load an existing transaction by internal id will fail
 * (since the record type cannot be ambiguous in those cases).
 *
 */
export class TransactionBase extends NSTypedRecord {

  override recordType () { return '' }

  @FieldTypeDecorator()
  accessor createddate: Date

  @FieldTypeDecorator()
  accessor customform: number

  @FieldTypeDecorator()
  accessor department: number

  /**
   * This field exists only if 'Use Deletion Reason' feature is enabled on the account
   */
  @FieldTypeDecorator()
  accessor deletionreason: number

  /**
   * This field exists only if 'Use Deletion Reason' feature is enabled on the account
   */
  @FieldTypeDecorator()
  accessor deletionreasonmemo: string

  @FieldTypeDecorator()
  accessor email: string

  @FieldTypeDecorator()
  accessor entity: number

  @FieldTypeDecorator()
  accessor externalid: string

  @FieldTypeDecorator()
  accessor istaxable: boolean

  @FieldTypeDecorator()
  accessor lastmodifieddate: Date

  @FieldTypeDecorator()
  accessor location: number

  @FieldTypeDecorator()
  accessor memo: string

  @FieldTypeDecorator()
  accessor orderstatus: number | string

  @FieldTypeDecorator()
  accessor otherrefnum: string

  @FieldTypeDecorator()
  accessor postingperiod: number

  @FieldTypeDecorator()
  accessor salesrep: number

  /**
   * Note unlike other identifiers in NetSuite,
   * this one is a string (e.g. 'Partially Fulfilled')
   */
  @FieldTypeDecorator()
  accessor status: string

  /**
   * Note unlike other references in NetSuite, this one is a set of
   * undocumented string keys (e.g. 'partiallyFulfilled')
   * The possible statusref values differ for each transaction type
   */
  @FieldTypeDecorator()
  accessor statusRef: string

  @FieldTypeDecorator()
  accessor subsidiary: number

  @FieldTypeDecorator()
  accessor tranid: string

  @FieldTypeDecorator()
  accessor trandate: Date

  /**
   * Locates line on the 'apply' sublist that corresponds to
   * the passed related record internal id expose this method in
   * derived classes that need dynamic access to the apply sublist
   * returns undefined
   * @deprecated - dynamic access to apply sublist should
   * generally work using normal collection oriented means
   */
  protected findApplyLine (docId: number): { apply: boolean, amount: number, line: number } | null {
    const rec = this._nsRecord
    if (!rec.isDynamic || !this.defaultValues)
      throw new Error('record must be in dynamic mode and have default values set to use this method')

    const line = rec.findSublistLineWithValue({
      sublistId: 'apply',
      fieldId: 'doc',
      value: docId.toString()
    })

    // helper function for adding a 'current sublist' getter/settor for the given property name on the applied sublist
    const addProp = (o: object, prop: PropertyKey) => {
      Object.defineProperty(o, prop, {
        get: function () {
          rec.selectLine({sublistId: 'apply', line: line})
          return rec.getCurrentSublistValue({sublistId: 'apply', fieldId: prop as string})
        },
        set: function (value: FieldValue) {
          rec.selectLine({sublistId: 'apply', line: line})
          rec.setCurrentSublistValue({sublistId: 'apply', fieldId: prop as string, value: value})
          rec.commitLine({sublistId: 'apply'})
        }
      })
    }

    if (line >= 0) {
      const newLine = {line: line}
      addProp(newLine, 'apply')
      addProp(newLine, 'amount')
      return newLine as { apply: boolean, amount: number, line: number }
    } else return null
  }
}