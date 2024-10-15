/**
 * Reprensents a NetSuite records and their field access
 */
import * as record from 'N/record'
import * as log from 'N/log'

// cf. documentation on typescript's distributive conditional types
export type NonFunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T];

// Typescripts type definition : union type either a generic one or null
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
  abstract recordType () : record.Type

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

    const type: string = this.recordType() as string;

    if(!rec) {

      // No value passed so this means creating a new record
      log.debug(
        'Creating a new record',
        `type: ${type} isDynamic: ${isDynamic} defaultValues: ${JSON.stringify(defaultValues)}`
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
          isDynamic: isDynamic ?? false,
          defaultValues: defaultValues
        })
      )
      if (this.nsRecord.id !== null) {
        this._id = this.nsRecord.id;
      }
    }
    else {

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
    const result = { id: this._id }
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
  private makeRecordProp = (value: unknown) => {
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
