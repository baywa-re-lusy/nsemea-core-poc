import * as record from 'N/record'
import { NSTypedRecord } from "./Record";
// import * as format from 'N/format'
import * as log from 'N/log'
import { SublistLine } from "./Sublist";
import {FieldValue} from "N/record";

/**
 * Parses a property name from a declaration (supporting 'Text' suffix per our convention)
 * @param propertyKey original property name as declared on class
 * @returns pair consisting of a flag indicating this field wants 'text' behavior and the actual ns field name (with
 * Text suffix removed)
 */
function parseProp (propertyKey: string): [boolean, string] {
  const endsWithText = propertyKey.endsWith('Text')
  return [endsWithText, endsWithText ? propertyKey.replace('Text', '') : propertyKey]
}

/**
 * Handles setting sublist fields for any combination of setValue/setText and standard/dynamic record
 * @param fieldId scriptid/name of the field
 * @param value value this field should receive
 * @param isText should this value be set as text
 */
function setSublistValue (this: SublistLine, fieldId: string, value: FieldValue, isText: boolean) {

    const options = {
      sublistId: this.sublistId,
      fieldId: fieldId
    }

    if (this.useDynamicModeAPI && this.nsRecord.isDynamic) {
      this.nsRecord.selectLine({ sublistId: this.sublistId, line: this._line })
      if (isText) {
        this.nsRecord.setCurrentSublistText({
          ...options,
          ignoreFieldChange: this.ignoreFieldChange,
          forceSyncSourcing: this.forceSyncSourcing,
          text: value as string
        })
      } else {
        this.nsRecord.setCurrentSublistValue({
          ...options,
          ignoreFieldChange: this.ignoreFieldChange,
          forceSyncSourcing: this.forceSyncSourcing,
          value: value
        })
      }
    } else {
      if (isText) {
        this.nsRecord.setSublistText({ ...options, line: this._line, text: value as string })
      } else {
        this.nsRecord.setSublistValue({ ...options, line: this._line, value: value })
      }
    }
}

/**
 * Get sublist field value
 * @param fieldId scriptid/name of the field
 * @param isText should this value be extracted as text
 */
function getSublistValue (this: SublistLine, fieldId: string, isText: boolean) : Date | number | number[] | string | string[] | boolean | null
{
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
function defaultSublistDescriptor<T extends SublistLine> (target: T, propertyKey: string): unknown {
  log.debug('creating default descriptor', `field: ${propertyKey}`)
  const [isTextField, nsField] = parseProp(propertyKey)
  return {
    get: function (this: SublistLine) {
      return getSublistValue.call(this, nsField, isTextField) as Date | number | number[] | string | string[] | boolean | null
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
// function formattedSublistDescriptor (formatType: format.Type, target: any, propertyKey: string): any {
//   return {
//     get: function (this: SublistLine) {
//       log.debug( 'get', `getting formatted field [${propertyKey}]`)
//       const value = getSublistValue.call(this, propertyKey, false) as string // to satisfy typing for format.parse(value) below.
//       log.debug(`transforming field [${propertyKey}] of type [${formatType}]`, `with value ${value}`)
//       // ensure we don't return moments for null, undefined, etc.
//       // returns the 'raw' type which is a string or number for our purposes
//       return value ? format.parse({ type: formatType, value: value }) : value
//     },
//     set: function (this: SublistLine, value) {
//       let formattedValue: number | null
//       // allow null to flow through, but ignore undefined values
//       if (value !== undefined) {
//         switch (formatType) {
//           // ensure numeric typed fields get formatted to what netsuite needs
//           // in testing with 2016.1 fields like currency had to be a number formatted specifically (e.g. 1.00
//           // rather than 1 or 1.0 for them to be accepted without error
//           case format.Type.CURRENCY:
//           case format.Type.CURRENCY2:
//           case format.Type.FLOAT:
//           case format.Type.INTEGER:
//           case format.Type.NONNEGCURRENCY:
//           case format.Type.NONNEGFLOAT:
//           case format.Type.POSCURRENCY:
//           case format.Type.POSFLOAT:
//           case format.Type.POSINTEGER:
//           case format.Type.RATE:
//           case format.Type.RATEHIGHPRECISION:
//             formattedValue = Number(format.format({ type: formatType, value: value }))
//             break
//           default:
//             formattedValue = format.format({ type: formatType, value: value })
//         }
//         log.debug(`setting sublist field [${propertyKey}:${formatType}]`,
//           `to formatted value [${formattedValue}] (unformatted vale: ${value})`)
//         if (value === null) setSublistValue.call(this, propertyKey, null)
//         else setSublistValue.call(this, propertyKey, formattedValue)
//       } else log.debug(`not setting sublist ${propertyKey} field`, 'value was undefined')
//     },
//     enumerable: true //default is false
//   }
// }

/**
 * Decorator for sublist *subrecord* fields with the subrecord shape represented by T
 * (which defines the properties you want on the subrecord)
 * @param ctor Constructor for the subrecord class you want (e.g. `AddressBase`, `InventoryDetail`).
 */
function subrecordDescriptor<T extends NSTypedRecord> (ctor: new (rec: record.Record | Omit<record.Record, "save">) => T) {
  return function (target: unknown, propertyKey: string): unknown {
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
export const checkbox = defaultSublistDescriptor
export const currency = defaultSublistDescriptor
export const date = defaultSublistDescriptor
export const datetime = defaultSublistDescriptor
export const email = defaultSublistDescriptor
export const freeformtext = defaultSublistDescriptor
export const decimalnumber = defaultSublistDescriptor
export const float = defaultSublistDescriptor
export const hyperlink = defaultSublistDescriptor
export const image = defaultSublistDescriptor
export const inlinehtml = defaultSublistDescriptor
export const integernumber = defaultSublistDescriptor
export const longtext = defaultSublistDescriptor
export const multiselect = defaultSublistDescriptor

export const namevaluelist = defaultSublistDescriptor
export const percent = defaultSublistDescriptor

export const rate = defaultSublistDescriptor
export const select = defaultSublistDescriptor
export const textarea = defaultSublistDescriptor
export const subrecord = subrecordDescriptor
