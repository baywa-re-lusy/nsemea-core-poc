/**
 * Reprensents a NetSuite records and their field access
 */
import * as record from 'N/record'
import * as format from 'N/format'
import * as log from 'N/log'
import {Sublist, SublistLine} from "./Sublist";

// cf. documentation on typescript's distributive conditional types
export type NonFunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T];

// Typescript type definition : union type either a generic one or null
export type Nullable<T> = T | null;

export abstract class NSTypedRecord {
  /**
   * Class member representing the underlying netsuite record object
   */
  nsRecord : record.Record | record.ClientCurrentRecord;

  /**
   * Netsuite's internal id of this record
   * @type {number}
   */
  protected _id: number
  get id () {
    return this._id
  }

  /**
   * The netsuite record type (constant string) - this is declared here and overridden in derived classes
   */
  static recordType (): string | record.Type {
    // The base class version of this method should never be invoked.
    return 'NetSuiteCurrentRecord:recordType not implemented. Did you forget to define a static recordType() method on your derived class?'
  }

  /**
   * Loads an existing NetSuite record with the given internal id
   * @param id record internal id to load
   * @param isDynamic set true if you want to load the record in dynamic mode
   */
  constructor (id: NonNullable<number | string>, isDynamic?: boolean)

  /**
   * Creates an instance of NSTypedRecord from an existing NetSuite record
   * The record will not be load.
   * @param rec an existing netsuite record
   */
  constructor (rec: NonNullable<record.Record |record.ClientCurrentRecord>)

  /**
   * Creates a new NetSuite record
   * @param unused either null or leave the parameter out
   * @param isDynamic set true if you want to load the record in dynamic mode
   * @param defaultvalues optional `defaultvalues` object - specific to certain records that
   * allow initializing a new NetSuite record
   */
  constructor (unused?: Nullable<string| number>, isDynamic?: boolean, defaultvalues?: object)

  constructor (rec?: null | number | string | record.Record | record.ClientCurrentRecord,
               isDynamic?: boolean,
               protected defaultValues?: object) {
    // Since the context of this.constructor is the derived class we're instantiating,
    // using the line below we can pull the 'static' recordType from the derived class
    // and remove the need for derived classes to define a constructor to pass the
    // record type to super()
    let type = Object.getPrototypeOf(this).constructor.recordType();

    if(!rec) {

      // No value passed so this means creating a new record
      log.debug(
        'Creating a new record',
        `type: ${type} isDynamic: ${isDynamic} defaultValues: ${defaultValues}`
      )
      this.makeRecordProp(
        record.create({
          type: type,
          isDynamic: isDynamic,
          defaultValues: defaultValues}
        )
      )

    } else if (typeof rec === 'object') {

      // Use existing record to create instance
      log.debug(
        'Using an existing record',
        `type: ${rec.type} id: ${rec.id}`
      )
      this.makeRecordProp(rec);
      if (rec.id !== null) {
        this._id = rec.id;
      }

    } else if (typeof rec === 'number' || +rec) {
      // If rec is a number or rec is a string containing a number
      // +rec tries to convert the string to a number

      // Load existing record by id
      log.debug(
        'Load an existing record',
        `type: ${type} id: ${rec}`
      )
      // make properties
      this.makeRecordProp(
        record.load({
          type: type,
          id: rec,
          isDynamic: isDynamic || false,
          defaultValues: defaultValues
        })
      )
      if (this.nsRecord.id !== null) {
        this._id = this.nsRecord.id;
      }
    } else {

      throw Error(`Invalid value argument rec: ${rec}, 
      Must be one of : null/undefined, an internal id or an existing record.`);

    }
  }

  /**
   * Returns NetSuite field metadata.
   * Useful for doing things like disabling a field on the form programmatically.
   * @param field field name for which you want to retrieve the NetSuite field object
   */
  getField (field: NonFunctionPropertyNames<this>) {
    return this.nsRecord.getField({
      fieldId: field as string
    })
  }

  /**
   * Surface inherited properties on a new object so JSON.stringify() sees them all
   */
  toJSON () {
    const result: any = { id: this._id }
    for (const key in this) {
      // NetSuite will error if you try to serialize 'Text' fields on record *create*.
      // i.e. "Invalid API usage. You must use getSublistValue to return the value set with setSublistValue."
      // As a workaround, consider this record to be in 'create' mode if there is no _id_ assigned yet
      // then skip any '<fieldName>Text' fields.
      if (!this._id && (key.substring(key.length - 4) === 'Text')) {
        // Yes, this is a side effecting function inside a toJSON
        // but this is a painful enough NetSuite side effect to justify
        log.debug(`toJSON skipping field ${key}`, `workaround to avoid NS erroring on the getText() on a new record`)
      } else result[key] = this[key]
    }
    return result
  }

  /**
   * Defines a descriptor for nsRecord to prevent it from being enumerable. Conceptually only the
   * field properties defined on derived classes should be seen when enumerating
   * @param value
   */
  private makeRecordProp = (value) => {
    // This has been logged as a WebStorm/PhpStorm bug
    // noinspection TypeScriptValidateTypes
    return Object.defineProperty(this, 'nsRecord', { value: value })
  }

  /**
   *
   * @param enableSourcing
   * @param ignoreMandatoryFields
   */
  save (enableSourcing?: boolean, ignoreMandatoryFields?: boolean) {
    if ("save" in this.nsRecord) {
      const id = this.nsRecord.save({
        enableSourcing: enableSourcing,
        ignoreMandatoryFields: ignoreMandatoryFields,
      });
      this._id = id
      return id
    } else {
      throw Error(`Invalid method save on existing record.`);
    }

  }

}

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
export function defaultDescriptor<T extends NSTypedRecord> (target: T, propertyKey: string): any {
  const [isTextField, nsField] = parseProp(propertyKey)
  return {
    get: function () {
      log.debug('field GET', `${nsField}, as text:${isTextField}`)
      return isTextField ? this.nsRecord.getText({ fieldId: nsField })
        : this.nsRecord.getValue({ fieldId: nsField })
    },
    set: function (value) {
      // Ignore undefined values
      if (value !== undefined) {
        if (isTextField) this.nsRecord.setText({ fieldId: nsField, text: value })
        else this.nsRecord.setValue({ fieldId: nsField, value: value })
      } else log.debug(`ignoring field [${propertyKey}]`, 'field value is undefined')
    },
    enumerable: true //default is false
  }
}

/**
 * Just like the default descriptor but calls Number() on the value. This exists for numeric types that
 * would blow up if you tried to assign number primitive values to a field.
 *
 * @returns an object property descriptor to be used
 * with Object.defineProperty
 */
export function numericDescriptor<T extends NSTypedRecord> (target: T, propertyKey: string): any {
  const [isTextField, nsField] = parseProp(propertyKey)
  return {
    get: function () {
      return isTextField ? this.nsRecord.getText({ fieldId: nsField })
        : this.nsRecord.getValue({ fieldId: nsField })
    },
    set: function (value) {
      // Ignore undefined values
      if (value !== undefined) {
        if (isTextField) this.nsRecord.setText({ fieldId: nsField, text: value })
        else this.nsRecord.setValue({ fieldId: nsField, value: Number(value) })
      } else log.debug(`ignoring field [${propertyKey}]`, 'field value is undefined')
    },
    enumerable: true //default is false
  }
}

// This is the shape of SublistLine class constructor
export type LineConstructor<T extends SublistLine> = new (s: string, r: record.Record, n: number) => T

/**
 * Decorator for adding sublists with each line of the sublist represented by a type T which
 * defines the properties you want on the sublist
 * @param ctor Constructor for the type that has the properties you want from each sublist line.
 * e.g. SalesOrder.ItemSublistLine
 */
function sublistDescriptor<T extends SublistLine> (ctor: LineConstructor<T>) {
  return function (target: any, propertyKey: string): any {
    const [, nsSublist] = parseSublistProp(propertyKey)
    const privateProp = `_${nsSublist}`
    return {
      enumerable: true,
      // Sublist is read only for now - if we have a use case where this should be assigned then tackle it
      get: function () {

        if (!this[privateProp]) {
          log.debug('initializing sublist', `sublist property named ${propertyKey}, sublist id ${nsSublist}`)
          // Using defineProperty() here defaults to making the property non-enumerable which is what we want
          // for this 'private' property it doesn't appear on serialization (e.g. JSON.stringify())
          Object.defineProperty(this, privateProp, { value: new Sublist(ctor, this.nsRecord, nsSublist) })
        }
        return this[privateProp]
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
function subrecordDescriptor<T extends NSTypedRecord> (ctor: new (rec: record.Record) => T) {
  return function (target: any, propertyKey: string): any {
    return {
      enumerable: true,
      // Subrecord is read only for now - if we have a use case where this should be assigned then tackle it
      get: function () {
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
function formattedDescriptor<T extends NSTypedRecord> (formatType: format.Type, target: T, propertyKey: string): any {
  return {
    get: function () {
      return this.nsRecord.getValue({ fieldId: propertyKey })
    },
    set: function (value) {
      // Allow null to flow through, but ignore undefined values
      if (value !== undefined) {
        let formattedValue = format.format({ type: formatType, value: value })
        log.debug(
          `setting field [${propertyKey}:${formatType}]`,
          `to formatted value [${formattedValue}] javascript type:${typeof formattedValue}`
        )
        if (value === null) {
          this.nsRecord.setValue({ fieldId: propertyKey, value: null })
        }
        else {
          this.nsRecord.setValue({ fieldId: propertyKey, value: formattedValue })
        }
      } else {
        log.debug(
          `not setting ${propertyKey} field`,
          'value was undefined'
        )
      }
    },
    enumerable: true //default is false
  }
}

/**
 *  Netsuite field types - decorate your model properties with these to tie netsuite field types to your
 *  model's field type.
 *  To get 'Text' rather than field value, suffix your property name with 'Text' e.g. 'afieldText' for the
 *  field 'afield'.
 */
export namespace FieldType {
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
  export var select = defaultDescriptor
  export var textarea = defaultDescriptor
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
  export var sublist = sublistDescriptor
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
  export var subrecord = subrecordDescriptor
}