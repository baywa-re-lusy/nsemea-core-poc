/**
 * Represents NetSuite sublists and their field access.
 */

import * as record from 'N/record'
import * as format from 'N/format'
import * as error from 'N/error'
import * as log from 'N/log'

import { NSTypedRecord } from "./Record";

// cf. documentation on typescript's distributive conditional types
export type NonFunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T];

/**
 * Base class for a sublist line.
 * Encapsulates -
 * 1. which sublist are we working with,
 * 2. on which record
 * 3. which line on the sublist does this instance represent
 *
 * You extend from this class (or a pre-existing subclass)
 * to define the fields to surface on the NetSuite sublist.
 * Class property names should be the netsuite field internal id.
 * By default, these fields surface the `value` of the field
 * To `get/setText()` instead, append the field name with `Text`.
 *
 * @example Surfaces the `price` field both as _value_ (numeric internal id) and _text_
 *       class SalesOrderItemSublist extends SublistLine {
 *         @SublistFieldType.select
 *         price:number
 *
 *         @SublistFieldType.freeformtext
 *         priceText:string
 *       }
 */
export abstract class SublistLine {
  /**
   * Class member representing the underlying netsuite record object
   */
  nsRecord: record.Record

  /**
   * If set to true, the field change and the secondary event is ignored.
   */
  ignoreFieldChange = false

  /**
   * If true, *and* in dynamic mode, this parameter can be used to alleviate
   * a timing situation that may occur in some browsers when fields are sourced.
   * For some browsers, some APIs are triggered without waiting for the field
   * sourcing to complete. For example, if forceSyncSourcing is set to false
   * when adding sublist lines, the lines aren't committed as expected.
   * Setting the parameter to true, forces synchronous sourcing.
   */
  forceSyncSourcing = false

  /**
   * If true, uses dynamic mode API calls to access sublist line field values.
   * If false, uses standard mode
   * The default behavior is to use dynamic mode if the record is in dynamic mode.
   * You can override this (force using 'standard mode' APIs even with a dynamic record)
   * by setting this value `false` prior to your code that manipulates the sublist line.
   */
  useDynamicModeAPI: boolean

  /**
   * Note that the sublistId and _line are used by the Sublist decorators to
   * actually implement functionality, even though they are not referenced directly
   * in this class. We mark them as not-enumerable because they are an implementation
   * detail and need not be exposed to the typical consumer
   * @param {string} sublistId netsuite internal id (string name) of the sublist
   * @param {Record} rec netsuite record on which the sublist exists
   * @param {number} _line the line number needed in decorator calls to underlying sublist.
   * That's also why this is public - so that the decorators have access to it.
   */
  constructor (public sublistId: string, rec: record.Record, public _line: number) {
    this.makeRecordProp(rec)
    // This has been logged as a WebStorm/PhpStorm bug
    // noinspection TypeScriptValidateTypes
    Object.defineProperty(this, 'sublistId', { enumerable: false })
    // This has been logged as a WebStorm/PhpStorm bug
    // noinspection TypeScriptValidateTypes
    Object.defineProperty(this, '_line', { enumerable: false })
    this.useDynamicModeAPI = rec.isDynamic
  }

  /**
   * Gets the subrecord for the given field name, handling both dynamic and standard mode.
   *
   * Normally you don't call this method directly. Instead, simply define a property
   * on your sublist class matching the field name for the subrecord and decorate it as a subrecord.
   * e.g.
   * ```
   * @FieldType.subrecord(AddressBase)
   * billingaddress: AddressBase
   * ```
   * @param fieldId the field that points to the subrecord
   */
  getSubRecord (fieldId: string) {
    if (this.useDynamicModeAPI) {
      this.nsRecord.selectLine({ sublistId: this.sublistId, line: this._line })
      return this.nsRecord.getCurrentSublistSubrecord({ fieldId: fieldId, sublistId: this.sublistId })
    } else {
      return this.nsRecord.getSublistSubrecord({ fieldId: fieldId, sublistId: this.sublistId, line: this._line })
    }
  }

  /**
   * Serialize lines to an array with properties shown
   */
  toJSON () {
    const result: any = {}
    for (const key in this) {
      // NetSuite will error if you try to serialize 'Text' fields on record *create*.
      // i.e. "Invalid API usage. You must use getSublistValue to return the value set with setSublistValue."
      // As a workaround, consider this record to be in 'create' mode if there is no _id_ assigned yet
      // then skip any '<fieldName>Text' fields.
      if (!this.nsRecord.id && (key.substring(key.length - 4) === 'Text')) {
        // Yes, this is a side effecting function inside a toJSON
        // but this is a painful enough NetSuite side effect to justify
        log.debug(`toJSON skipping field ${key}`, `workaround to avoid NS erroring on the getText() on a new record`)
      }
      // these fields aren't part of the NS data, they only effect behavior, so don't serialize them
      else if (key != 'ignoreFieldChange' && key != 'useDynamicModeAPI' && key != 'forceSyncSourcing') {
        result[key] = this[key]
      }
    }
    return result
  }

  /**
   * Defines a descriptor for nsRecord to prevent it from being enumerable. Conceptually only the
   * field properties defined on derived classes should be seen when enumerating
   * @param value
   */
  protected makeRecordProp (value) {
    // This has been logged as a WebStorm/PhpStorm bug
    // noinspection TypeScriptValidateTypes
    Object.defineProperty(this, 'nsRecord', {
      value: value,
      enumerable: false
    })
  }
}

/**
 * Creates a sublist whose lines are of type T
 */
export class Sublist<out T extends SublistLine> {
  /**
   * Class member representing the underlying netsuite record object
   */
  nsRecord: record.Record

  /**
   * Constructs a new array-like representation of a NS sublist.
   * @param sublistLineType the type (should be a class extending `SublistLine`)
   * to represent individual rows of this sublist
   * @param rec the NS native`record.Record` instance to manipulate
   * @param sublistId name of the sublist we're representing
   */
  constructor (readonly sublistLineType: { new (sublistId: string, nsrec: record.Record, line: number): T },
               rec: record.Record, public sublistId: string) {
    this.sublistLineType = sublistLineType
    this.makeRecordProp(rec)
    // usually if we have a record in 'dynamic mode' we want to use the dynamic mode API,
    // but there are exceptions where standard mode APIs work better even on a dynamic record instance
    // (e.g. `VendorPayment.apply` in a client script)
    this._useDynamicModeAPI = this.nsRecord.isDynamic
    this.rebuildArray()
  }

  private _useDynamicModeAPI: boolean

  // enforce 'array like' interaction through indexers
  [i: number]: T

  /**
   * If true **and** the underlying netsuite record is in dynamic mode,
   * uses the dynamic APIs to manipulate the sublist (e.g. `getCurrentSublistValue()`)
   * If false then uses 'standard mode' (e.g. `getSublistValue()`)
   * Defaults to true if the record is in dynamic mode. Set this to false prior to manipulating
   * the sublist in order to force standard mode API usage even if the record is in 'dynamic mode'
   */
  get useDynamicModeAPI (): boolean {
    return this._useDynamicModeAPI
  }

  set useDynamicModeAPI (value: boolean) {
    this._useDynamicModeAPI = value
    // Rebuild the array of line objects so the dynamic mode api setting gets applied to all lines.
    this.rebuildArray()
  }

  /**
   * Array-like length property (linecount)
   * @returns {number} number of lines in this list
   */
  get length () {
    return this.nsRecord.getLineCount({ sublistId: this.sublistId })
  }

  /**
   * Adds a new line to this sublist at the given line number.
   * @param ignoreRecalc set true to avoid line recalc
   * @param insertAt optionally set line # insertion point - defaults to insert
   * at the end of the sublist. If in dynamic mode this parameter is ignored
   * (dynamic mode uses selectNewLine()). The insertion point
   * should be <= length of the list
   */
  addLine (ignoreRecalc = true, insertAt: number = this.length): T {
    log.debug('inserting line', `sublist: ${this.sublistId} insert at line:${insertAt}`)
    if (insertAt > this.length) {
      throw error.create({
        message: `insertion index (${insertAt}) cannot be greater than sublist length (${this.length})`,
        name: 'NFT_INSERT_LINE_OUT_OF_BOUNDS'
      })
    }
    if (this._useDynamicModeAPI && this.nsRecord.isDynamic) {
      this.nsRecord.selectNewLine({ sublistId: this.sublistId })
    }
    else {
      this.nsRecord.insertLine({
        sublistId: this.sublistId,
        line: insertAt,
        ignoreRecalc: ignoreRecalc
      })
      this.rebuildArray()
    }
    log.debug('line count after adding', this.length)
    return (this._useDynamicModeAPI && this.nsRecord.isDynamic) ? this[this.length] : this[insertAt]
  }

  /**
   * Removes all existing lines of this sublist, leaving effectively an empty array
   * @param ignoreRecalc passed through to nsRecord.removeLine
   * (ignores firing recalc event as each line is removed )
   */
  removeAllLines (ignoreRecalc: boolean = true) {
    while (this.length > 0) {
      const lineNum = this.length - 1
      this.removeLine(lineNum, ignoreRecalc)
      log.debug('removed line', lineNum)
    }
    this.rebuildArray()
    return this
  }

  /**
   * Commits the currently selected line on this sublist. When adding new lines in standard mode
   * you don't need to call this method
   */
  commitLine () {
    if (!this.nsRecord.isDynamic) {
      throw error.create({
        message: 'do not call commitLine() on records in standard mode, commitLine() is only needed in dynamic mode',
        name: 'NFT_COMMITLINE_BUT_NOT_DYNAMIC_MODE_RECORD'
      })
    }
    log.debug('committing line', `sublist: ${this.sublistId}`)
    this.nsRecord.commitLine({ sublistId: this.sublistId })
    this.rebuildArray()
  }

  /**
   * Selects the given line on this sublist
   * @param line line number
   */
  selectLine (line: number) {
    log.debug('selecting line', line)
    this.nsRecord.selectLine({ sublistId: this.sublistId, line: line })
  }

  /**
   * Removes a line at the given index. Note this causes the array to rebuild.
   * @param line
   * @param ignoreRecalc
   */
  removeLine (line: number, ignoreRecalc = false) {
    this.nsRecord.removeLine({ line: line, sublistId: this.sublistId, ignoreRecalc: ignoreRecalc })
    this.rebuildArray()
  }

  /**
   * Gets the NetSuite metadata for the given sublist field. Useful when you want to do things like disable
   * a sublist field or other operations on the field itself (rather than the field value/text)
   * Note: this uses the first sublist line (0) when retrieving field data
   * @param field name of the desired sublist field
   */
  getField (field: keyof T) {
    return this.nsRecord.getSublistField({
      fieldId: field as string,
      sublistId: this.sublistId,
      line: 0
    })
  }

  /**
   * upserts the indexed props (array-like structure) This is called once at construction, but also
   * as needed when a user dynamically works with sublist rows.
   */
  protected rebuildArray () {
    log.debug('rebuildArray', 'deleting existing numeric properties')
    Object.getOwnPropertyNames(this).filter(key => !isNaN(+key)).forEach(key => delete this[key], this)
    log.debug('sublist after deleting properties', this)
    log.debug('building sublist', `type:${this.sublistId}, linecount:${this.length}`)
    // create a sublist line indexed property of type T for each member of the underlying sublist
    for (let i = 0; i < this.length; i++) {
      const line = new this.sublistLineType(this.sublistId, this.nsRecord, i)
      line.useDynamicModeAPI = this._useDynamicModeAPI
      this[i] = line
    }
    // if dynamic mode we always have an additional ready-to-fill out line at the end of the list,
    // but note that `this.length` does not include this line because it's not committed. This mirrors the
    // actual behavior NetSuite shows - e.g. in dynamic mode, native getLineCount() returns zero until the first
    // line is actually committed.
    // This allows normal NSDAL object access to sublist properties even on the uncommitted line currently
    // being edited. This is most useful in client scripts e.g. on `fieldChanged()` of a fresh line.
    if (this.nsRecord.isDynamic) {
      Object.defineProperty(this, this.length, {
        value: new this.sublistLineType(this.sublistId, this.nsRecord, this.length),
        // mark this phantom line as non-enumerable so toJSON() doesn't try to render it as it's not really there
        enumerable: false,
        writable: true,
        configurable: true // so prop can be deleted
      })
    }
  }

  /**
   * Defines a descriptor for nsRecord to prevent it from being enumerable.
   * Conceptually only the field properties defined on derived classes should
   * be seen when enumerating
   * @param value
   */
  private makeRecordProp (value) {
    Object.defineProperty(this, 'nsRecord', {
      value: value,
      enumerable: false
    })
  }

  // serialize only the numeric properties of this object into a real array
  toJSON () {
    return Object.keys(this).filter(k => !isNaN(+k)).map(key => this[key])
  }

}

/**
 * Parses a property name from a declaration (supporting 'Text' suffix per our convention)
 * @param propertyKey original property name as declared on class
 * @returns pair consisting of a flag indicating this field wants 'text' behavior and the actual ns field name (with
 * Text suffix removed)
 */
function parseProp (propertyKey: string): [boolean, string] {
  let endsWithText = propertyKey.slice(-4) === 'Text'
  return [endsWithText, endsWithText ? propertyKey.replace('Text', '') : propertyKey]
}

/**
 * Handles setting sublist fields for any combination of setValue/setText and standard/dynamic record
 * @param fieldId scriptid/name of the field
 * @param value value this field should receive
 * @param isText should this value be set as text
 */
function setSublistValue (this: SublistLine, fieldId: string, value: any, isText: boolean) {
  // ignore undefined values
  if (value !== undefined) {

    const options = {
      sublistId: this.sublistId,
      fieldId: fieldId
    }

    if (this.useDynamicModeAPI && this.nsRecord.isDynamic) {
      this.nsRecord.selectLine({ sublistId: this.sublistId, line: this._line })
      isText ? this.nsRecord.setCurrentSublistText({
          ...options,
          ignoreFieldChange: this.ignoreFieldChange,
          forceSyncSourcing: this.forceSyncSourcing,
          text: value
        })
        : this.nsRecord.setCurrentSublistValue({
          ...options,
          ignoreFieldChange: this.ignoreFieldChange,
          forceSyncSourcing: this.forceSyncSourcing,
          value: value
        })
    } else {
      isText ? this.nsRecord.setSublistText({ ...options, line: this._line, text: value })
        : this.nsRecord.setSublistValue({ ...options, line: this._line, value: value })
    }
  } else log.debug(`ignoring field [${fieldId}]`, 'field value is undefined')
}

/**
 * Get sublist field value
 * @param fieldId scriptid/name of the field
 * @param isText should this value be extracted as text
 */
function getSublistValue (this: SublistLine, fieldId: string, isText: boolean) {
  const options = {
    sublistId: this.sublistId,
    fieldId: fieldId,
  }
  log.debug(`getting sublist ${isText ? 'text' : 'value'}`, options)
  if (this.useDynamicModeAPI && this.nsRecord.isDynamic) {
    this.nsRecord.selectLine({ sublistId: this.sublistId, line: this._line })
    return isText ? this.nsRecord.getCurrentSublistText(options)
      : this.nsRecord.getCurrentSublistValue(options)
  } else {
    return isText ? this.nsRecord.getSublistText({ ...options, line: this._line })
      : this.nsRecord.getSublistValue({ ...options, line: this._line })
  }
}

/**
 * Generic property descriptor with basic default algorithm that exposes the
 * field value directly with no other processing. If the target field name ends
 * with 'Text' it uses NetSuite `getText()/setText()` otherwise (default)
 * uses `getValue()/setValue()`
 * Apply this decorator (or its aliases) to properties on SublistLine subtypes
 * @returns an object property descriptor to be used
 * with Object.defineProperty
 */
function defaultSublistDescriptor<T extends SublistLine> (target: T, propertyKey: string): any {
  log.debug('creating default descriptor', `field: ${propertyKey}`)
  const [isTextField, nsField] = parseProp(propertyKey)
  return {
    get: function (this: SublistLine) {
      return getSublistValue.call(this, nsField, isTextField)
    },
    set: function (this: SublistLine, value) {
      setSublistValue.call(this, nsField, value, isTextField)
    },
    enumerable: true //default is false
  }
}

/**
 * Generic property descriptor with algorithm for values that need to go through the NS format module
 * note: does not take into account timezone
 * @param {string} formatType the NS field type (e.g. 'date')
 * @param target
 * @param propertyKey
 * @returns  an object property descriptor to be used
 * with decorators
 */
export function formattedSublistDescriptor (formatType: format.Type, target: any, propertyKey: string): any {
  return {
    get: function (this: SublistLine) {
      log.debug( 'get', `getting formatted field [${propertyKey}]`)
      const value = getSublistValue.call(this, propertyKey, false) as string // to satisfy typing for format.parse(value) below.
      log.debug(`transforming field [${propertyKey}] of type [${formatType}]`, `with value ${value}`)
      // ensure we don't return moments for null, undefined, etc.
      // returns the 'raw' type which is a string or number for our purposes
      return value ? format.parse({ type: formatType, value: value }) : value
    },
    set: function (this: SublistLine, value) {
      let formattedValue: number | null
      // allow null to flow through, but ignore undefined values
      if (value !== undefined) {
        switch (formatType) {
          // ensure numeric typed fields get formatted to what netsuite needs
          // in testing with 2016.1 fields like currency had to be a number formatted specifically (e.g. 1.00
          // rather than 1 or 1.0 for them to be accepted without error
          case format.Type.CURRENCY:
          case format.Type.CURRENCY2:
          case format.Type.FLOAT:
          case format.Type.INTEGER:
          case format.Type.NONNEGCURRENCY:
          case format.Type.NONNEGFLOAT:
          case format.Type.POSCURRENCY:
          case format.Type.POSFLOAT:
          case format.Type.POSINTEGER:
          case format.Type.RATE:
          case format.Type.RATEHIGHPRECISION:
            formattedValue = Number(format.format({ type: formatType, value: value }))
            break
          default:
            formattedValue = format.format({ type: formatType, value: value })
        }
        log.debug(`setting sublist field [${propertyKey}:${formatType}]`,
          `to formatted value [${formattedValue}] (unformatted vale: ${value})`)
        if (value === null) setSublistValue.call(this, propertyKey, null)
        else setSublistValue.call(this, propertyKey, formattedValue)
      } else log.debug(`not setting sublist ${propertyKey} field`, 'value was undefined')
    },
    enumerable: true //default is false
  }
}

/**
 * Decorator for sublist *subrecord* fields with the subrecord shape represented by T
 * (which defines the properties you want on the subrecord)
 * @param ctor Constructor for the subrecord class you want (e.g. `AddressBase`, `InventoryDetail`).
 */
export function subrecordDescriptor<T extends NSTypedRecord> (ctor: new (rec: record.Record | Omit<record.Record, "save">) => T) {
  return function (target: any, propertyKey: string): any {
    return {
      enumerable: true,
      // sublist is read only for now - if we have a use case where this should be assigned then tackle it
      get: function (this: SublistLine) {
        return new ctor(this.getSubRecord(propertyKey))
      }
    }
  }
}

/**
 * Decorators for sublist fields.
 * Adorn your class properties with these to bind your class property name with
 * the specific behavior for the type of field it represents in NetSuite.
 */
export namespace SublistFieldType {
  export var checkbox = defaultSublistDescriptor
  export var currency = defaultSublistDescriptor
  export var date = defaultSublistDescriptor
  export var datetime = defaultSublistDescriptor
  export var email = defaultSublistDescriptor
  export var freeformtext = defaultSublistDescriptor
  export var decimalnumber = defaultSublistDescriptor
  export var float = defaultSublistDescriptor
  export var hyperlink = defaultSublistDescriptor
  export var image = defaultSublistDescriptor
  export var inlinehtml = defaultSublistDescriptor
  export var integernumber = defaultSublistDescriptor
  export var longtext = defaultSublistDescriptor
  export var multiselect = defaultSublistDescriptor

  export var namevaluelist = defaultSublistDescriptor
  export var percent = defaultSublistDescriptor

  export const rate = defaultSublistDescriptor
  export var select = defaultSublistDescriptor
  export var textarea = defaultSublistDescriptor
  export const subrecord = subrecordDescriptor
}