/**
 * Reprensents a NetSuite sublist-line object
 */

import * as record from 'N/record'

/**
 * Base class for a sublist line.
 * Encapsulates
 * 1. which sublist are we working with
 * 2. on which record
 * 3. which line on the sublist does this instance represent
 *
 * You extend from this class (or a pre-existing subclass) to define the fields to surface on the NetSuite sublist.
 * Class property names should be the netsuite field internal id.
 */
export abstract class NSSubListLine {

  /**
   * Holds Netsuite internal id (string name) of the sublist
   */
  _subListId: string

  /**
   * The line number needed in decorator calls to underlying sublist
   */
  _line: number

  /**
   * Class member representing the underlying netsuite record object
   */
  _nsRecord: record.Record

  /**
   * If set to true, the field change and the secondary event is ignored.
   */
  ignoreFieldChange = false

  /**
   * If true, *and* in dynamic mode, this parameter can be used to alleviate a timing situation that may occur in some
   * browsers when fields are sourced. For some browsers, some APIs are triggered without waiting for the field
   * sourcing to complete. For example, if forceSyncSourcing is set to false when adding sublist lines, the lines
   * aren't committed as expected. Setting the parameter to true, forces synchronous sourcing.
   */
  forceSyncSourcing = false

  /**
   * If true, uses dynamic mode API calls to access sublist line field values.
   * If false, uses standard mode
   * The default behavior is to use dynamic mode if the record is in dynamic mode. You can override this
   * (force using 'standard mode' APIs even with a dynamic record) by setting this value `false` prior to
   * your code that manipulates the sublist line.
   */
  useDynamicModeAPI: boolean
  /**
   * Note that the sublistId and _line are used by the Sublist decorators to actually implement functionality, even
   * though they are not referenced directly in this class. We mark them as not-enumerable because they are an implementation
   * detail and need not be exposed to the typical consumer
   * @param {string} subListId netsuite internal id (string name) of the sublist
   * @param {Record} rec netsuite record on which the sublist exists
   * @param {number} line the line number needed in decorator calls to underlying sublist
   */
  constructor (subListId: string, rec: record.Record, line: number) {
    this._nsRecord = rec
    this._subListId = subListId
    this._line = line
    this.useDynamicModeAPI = rec.isDynamic
  }

  /**
   * Gets the subrecord for the given field name, handling both dynamic and standard mode.
   *
   * Normally you don't call this method directly. Instead, simply define a property
   * on your sublist class matching the field name for the subrecord and decorate it as a subrecord.
   * e.g.
   * ```
   * @SubRecordDecorator(AddressBase)
   * billingaddress: AddressBase
   * ```
   * @param fieldId the field that points to the subrecord
   */
  getSubRecord (fieldId: string) {
    if (this.useDynamicModeAPI) {
      this._nsRecord.selectLine({ sublistId: this._subListId, line: this._line })
      return this._nsRecord.getCurrentSublistSubrecord({ fieldId: fieldId, sublistId: this._subListId })
    } else {
      return this._nsRecord.getSublistSubrecord({ fieldId: fieldId, sublistId: this._subListId, line: this._line })
    }
  }

}
