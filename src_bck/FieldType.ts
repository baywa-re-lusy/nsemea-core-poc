import * as record from 'N/record'
import {FieldValue} from "N/record";
import {NSTypedRecord} from "./Record";
// import * as format from 'N/format'
import * as log from 'N/log'
import {Sublist, SublistLine} from "./Sublist";

/**
 * Returns a function for parsing property names from a declaration (e.g.
 * properties that end with 'Text' or 'Sublist' suffix per convention)
 * @param suffixToSearch string that may be at the end of a property name. this string will be strippped off
 * the end of the property name if it is present.
 * @returns function that takes a property name and returns a pair [flag indicating this field matched the suffix,
 * the stripped property name (with suffix removed)]
 */
function suffixParser (suffixToSearch: string): (propertyKey: string) => [boolean, string] {
  const suffixLength = suffixToSearch.length
  return function (propertyKey: string) {
    const endsWithSuffix = propertyKey.slice(-suffixLength) === suffixToSearch
    return [endsWithSuffix, endsWithSuffix ? propertyKey.slice(0, -suffixLength) : propertyKey]
  }
}

/**
 * Parses a property name from a declaration (supporting 'Text' suffix per our convention)
 * @param propertyKey original property name as declared on class
 * @returns pair consisting of a flag indicating this field wants 'text' behavior and the actual ns field name (with
 * Text suffix removed)
 */
const parseProp = suffixParser('Text')

/**
 * Parses a property name from a declaration (supporting 'Sublist' suffix per convention)
 * @param propertyKey original property name as declared on class
 * @returns pair consisting of a flag indicating this is actually a sublist and the actual ns sublist name (with
 * Sublist suffix removed)
 */
const parseSublistProp = suffixParser('Sublist')

/**
 * Generic decorator factory with basic default algorithm that exposes the field value directly with no
 * other processing. If the property name ends with "Text" then the property will use getText()/setText()
 *
 * @returns a decorator that returns a property descriptor to be used
 * with Object.defineProperty
 */
function defaultDescriptor<T extends NSTypedRecord> (target: T, propertyKey: string): void {
  const [isTextField, nsField] = parseProp(propertyKey)
  let value = target[propertyKey];
  const getter = () => {
    log.debug('field GET', `${nsField}, as text:${isTextField}`)
    if (isTextField) {
      return target.nsRecord.getText({ fieldId: nsField })
    } else {
      return target.nsRecord.getValue({ fieldId: nsField })
    }
  }
  const setter = (newVal: FieldValue) => {
    if (isTextField) {
      target.nsRecord.setText({fieldId: nsField, text: value as string})
    } else {
      target.nsRecord.setValue({fieldId: nsField, value: value})
    }
  };
  Object.defineProperty(target, propertyKey, {
    get: getter,
    set: setter,
    enumerable: true,
    configurable: true
  });
}

// function defaultDescriptor<T extends NSTypedRecord> (target: T, propertyKey: string) {
//   const [isTextField, nsField] = parseProp(propertyKey)
//   return {
//     get: function (this: NSTypedRecord) {
//       log.debug('field GET', `${nsField}, as text:${isTextField}`)
//       if (isTextField) {
//         return this.nsRecord.getText({ fieldId: nsField })
//       } else {
//         return this.nsRecord.getValue({ fieldId: nsField })
//       }
//     },
//     set: function (this: NSTypedRecord, value: FieldValue) {
//       // Ignore undefined values
//       if (value !== undefined) {
//         if (isTextField) {
//           this.nsRecord.setText({fieldId: nsField, text: value as string})
//         } else {
//           this.nsRecord.setValue({fieldId: nsField, value: value})
//         }
//       } else {
//         log.debug(`ignoring field [${propertyKey}]`, 'field value is undefined')
//       }
//     },
//     enumerable: true //default is false
//   }
// }

/**
 * Just like the default descriptor but calls Number() on the value. This exists for numeric types that
 * would blow up if you tried to assign number primitive values to a field.
 *
 * @returns an object property descriptor to be used
 * with Object.defineProperty
 */
function numericDescriptor<T extends NSTypedRecord> (target: T, propertyKey: string): void {
  const [isTextField, nsField] = parseProp(propertyKey)
  let value = target[propertyKey];
  const getter = () => {
    log.debug('field GET', `${nsField}, as text:${isTextField}`)
    if (isTextField) {
      return target.nsRecord.getText({ fieldId: nsField })
    } else {
      return target.nsRecord.getValue({ fieldId: nsField })
    }
  }
  const setter = (newVal: FieldValue) => {
    if (isTextField) {
      target.nsRecord.setText({fieldId: nsField, text: value as string})
    } else {
      target.nsRecord.setValue({fieldId: nsField, value: Number(value)})
    }
  };
  Object.defineProperty(target, propertyKey, {
    get: getter,
    set: setter,
    enumerable: true
  });
}
// function numericDescriptor<T extends NSTypedRecord> (target: T, propertyKey: string): unknown {
//   const [isTextField, nsField] = parseProp(propertyKey)
//   return {
//     get: function (this: NSTypedRecord) {
//       return isTextField ? this.nsRecord.getText({ fieldId: nsField })
//         : this.nsRecord.getValue({ fieldId: nsField })
//     },
//     set: function (this: NSTypedRecord, value: FieldValue) {
//       // Ignore undefined values
//       if (value !== undefined) {
//         if (isTextField) this.nsRecord.setText({ fieldId: nsField, text: value as string })
//         else this.nsRecord.setValue({ fieldId: nsField, value: Number(value) })
//       } else log.debug(`ignoring field [${propertyKey}]`, 'field value is undefined')
//     },
//     enumerable: true //default is false
//   }
// }

// This is the shape of SublistLine class constructor
export type LineConstructor<T extends SublistLine> = new (s: string, r: record.Record, n: number) => T

/**
 * Decorator for adding sublists with each line of the sublist represented by a type T which
 * defines the properties you want on the sublist
 * @param ctor Constructor for the type that has the properties you want from each sublist line.
 * e.g. SalesOrder.ItemSublistLine
 */
function sublistDescriptor<T extends SublistLine> (ctor: LineConstructor<T>) {
  return function (target: unknown, propertyKey: string): unknown {
    const [, nsSublist] = parseSublistProp(propertyKey)
    const privateProp = `_${nsSublist}`
    return {
      enumerable: true,
      // Sublist is read only for now - if we have a use case where this should be assigned then tackle it
      get: function (this: NSTypedRecord) {

        if (!this[privateProp]) {
          log.debug('initializing sublist', `sublist property named ${propertyKey}, sublist id ${nsSublist}`)
          // Using defineProperty() here defaults to making the property non-enumerable which is what we want
          // for this 'private' property it doesn't appear on serialization (e.g. JSON.stringify())
          Object.defineProperty(this, privateProp, { value: new Sublist(ctor, this.nsRecord as record.Record, nsSublist) })
        }
        return this[privateProp] as unknown
      },
    }
  }
}

/**
 * Decorator for *subrecord* fields with the subrecord shape represented by T (which
 * defines the properties you want on the subrecord)
 * @param ctor Constructor for the type that has the properties you want from the subrecord.
 * e.g. AssemblyBuild.InventoryDetail
 */
function subrecordDescriptor<T extends NSTypedRecord> (ctor: new (rec: record.Record | Omit<record.Record, "save">) => T) {
  return function (target: unknown, propertyKey: string): unknown {
    return {
      enumerable: true,
      // Subrecord is read only for now - if we have a use case where this should be assigned then tackle it
      get: function (this: NSTypedRecord) {
        return new ctor(this.nsRecord.getSubrecord({
          fieldId: propertyKey
        }))
      },
    }
  }
}

/**
 * Generic property descriptor with algorithm for values that need to go through the NS format module on field
 * write. Returns plain getValue() on reads
 * note: does not take into account timezone
 * This decorator applies to record properties only (i.e. not for use on sublists).
 * @param {string} formatType the NS field type (e.g. 'date')
 * @param target
 * @param propertyKey
 * @returns  an object property descriptor to be used
 * with decorators
 */
// function formattedDescriptor<T extends NSTypedRecord> (formatType: format.Type, target: T, propertyKey: string): any {
//   return {
//     get: function () {
//       return this.nsRecord.getValue({ fieldId: propertyKey })
//     },
//     set: function (value) {
//       // Allow null to flow through, but ignore undefined values
//       if (value !== undefined) {
//         let formattedValue = format.format({ type: formatType, value: value })
//         log.debug(
//           `setting field [${propertyKey}:${formatType}]`,
//           `to formatted value [${formattedValue}] javascript type:${typeof formattedValue}`
//         )
//         if (value === null) {
//           this.nsRecord.setValue({ fieldId: propertyKey, value: null })
//         }
//         else {
//           this.nsRecord.setValue({ fieldId: propertyKey, value: formattedValue })
//         }
//       } else {
//         log.debug(
//           `not setting ${propertyKey} field`,
//           'value was undefined'
//         )
//       }
//     },
//     enumerable: true //default is false
//   }
// }

/**
 *  Netsuite field types - decorate your model properties with these to tie netsuite field types to your
 *  model's field type.
 *  To get 'Text' rather than field value, suffix your property name with 'Text' e.g. 'afieldText' for the
 *  field 'afield'.
 */

/**
* use for ns  _address_ field type
*/
export const address = defaultDescriptor
/**
 * use for NS _checkbox_ field type - surfaces as `boolean` in TypeScript
 */
export const checkbox = defaultDescriptor
export const date = defaultDescriptor
export const currency = numericDescriptor
export const datetime = defaultDescriptor
export const document = defaultDescriptor
export const email = defaultDescriptor
export const freeformtext = defaultDescriptor

export const float = numericDescriptor
export const decimalnumber = float
export const hyperlink = defaultDescriptor
export const inlinehtml = defaultDescriptor
export const image = defaultDescriptor
export const integernumber = numericDescriptor
export const longtext = defaultDescriptor
export const multiselect = defaultDescriptor
export const percent = defaultDescriptor
export const radio = defaultDescriptor

/**
 * NetSuite 'Select' field type.
 */
export const select = defaultDescriptor
export const textarea = defaultDescriptor
/**
 * This isn't a native NS 'field' type, but rather is used to indicate a property should represent a NS sub-list.
 * Pass a type derived from SublistLine that describes the sublist fields you want. e.g. SalesOrder.ItemSublistLine
 * @example
 * class MySublistLine extends SalesOrder.ItemSublistLine { custcol_foo:string }
 * class SalesOrder {
 * @FieldType.sublist(MySublistLine)
 * item: SublistLine<MySublistLine>
 * }
 */
export const sublist = sublistDescriptor
/**
 * NetSuite _SubRecord_ field type (reference to a subrecord object, usually described as 'summary' in the
 * records browser.
 * Pass in the (TypeScript) type that matches the subrecord this property points to
 * @example the `assemblybuild.inventorydetail` property
 * ```typescript
 * import { InventoryDetail } from './DataAceess/InventoryDetail'
 *
 * class AssemblyBuild {
 *    @FieldType.subrecord(InventoryDetail)
 *    inventorydetail: InventoryDetail
 * }
 * ```
 */
export const subrecord = subrecordDescriptor
