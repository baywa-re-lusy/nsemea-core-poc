/**
 * Reprensents a NetSuite records and their field access
 */
import * as record from 'N/record'
import * as log from "N/log";
// import * as log from 'N/log'

// Union type either a record.Record or record.ClientCurrentRecord
export type RecordLike = (record.Record | record.ClientCurrentRecord)

// Union type either a generic one or null
export type Nullable<T> = T | null;

export function isSavable(obj: record.Record | record.ClientCurrentRecord): obj is record.Record {
  return "save" in obj;
}

export abstract class NSTypedRecord {
  /**
   * Class member representing the underlying netsuite record object
   */
  _nsRecord : RecordLike

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
    // using the line below we can pull the recordType property from the derived class
    // and remove the need for derived classes to define a constructor to pass the
    // record type to super()
    const type: string = this.recordType() as string;

    if(!rec) {
      // No value passed so this means creating a new record
      log.debug(
        'Creating a new record',
        `type: ${type} isDynamic: ${isDynamic} defaultValues: ${JSON.stringify(defaultValues)}`
      )
      this._nsRecord = record.create({
        type: type,
        isDynamic: isDynamic,
        defaultValues: defaultValues}
      )

    } else if (typeof rec === 'object') {
      // Use existing record to create instance
      log.debug(
        'Using an existing record',
        `type: ${rec.type} id: ${rec.id}`
      )
      this._nsRecord = rec;
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
      this._nsRecord = record.load({
          type: type,
          id: rec,
          isDynamic: isDynamic ?? false,
          defaultValues: defaultValues
      })

      if (this._nsRecord.id !== null) {
        this._id = this._nsRecord.id;
      }
    }
    else {

      throw Error(`Invalid value argument rec: ${rec},
      Must be one of : null/undefined, an internal id or an existing record.`)

    }
  }

  /**
   * Returns NetSuite field metadata.
   * Useful for doing things like disabling a field on the form programmatically.
   * @param field field name for which you want to retrieve the NetSuite field object
   */
  getField (field: string) {
    return this._nsRecord.getField({
      fieldId: field
    })
  }

  getNSRecord(): RecordLike {
    return this._nsRecord;
  }

  /**
   * Get field text value
   * @param fieldId name of the field
   * @protected
   */
  getText(fieldId: string): string | string[] | undefined {
    if (fieldId.toLowerCase() === "id" && "id" in this._nsRecord) {
      return this._nsRecord.id?.toString()
    } else if (fieldId.toLowerCase() === "type" && "type" in this._nsRecord) {
      return this._nsRecord.type?.toString()
    } else {
      return this._nsRecord.getText(fieldId);
    }
  }

  /**
   * Get field text value
   * @param fieldId name of the field
   * @protected
   */
  getValue<T>(fieldId: string): T | null {
    if (fieldId.toLowerCase() === "id" && "id" in this._nsRecord) {
      return this._nsRecord.id as T;
    } else if (fieldId.toLowerCase() === "type" && "type" in this._nsRecord) {
      return this._nsRecord.type as T;
    } else {
      return (this._nsRecord.getValue(fieldId)?.valueOf() ?? null) as T | null;
    }
  }

  /**
   * Set text value for defined field
   * @param fieldId name of the field
   * @param value text value to be set
   * @protected
   */
  setText(fieldId: string, value: string): void {
    if (fieldId.toLowerCase() === "id" || fieldId.toLowerCase() === "type") {
      throw Error(`This field (ID: ${fieldId}) is readonly and cannot be modified.`)
    }
    this._nsRecord.setText(fieldId, value);
  }

  /**
   * Set text value for defined field
   * @param fieldId name of the field
   * @param value value to be set, either a date, a number or number[], a string or string[]
   * a boolean or null value
   * @protected
   */
  setValue<T extends record.FieldValue>(fieldId: string, value: T): void {
    if (fieldId.toLowerCase() === "id" || fieldId.toLowerCase() === "type") {
      throw Error(`This field (ID: ${fieldId}) is readonly and cannot be modified.`)
    }
    this._nsRecord.setValue(fieldId, value);
  }

  /**
   * Convenience function that saves the underlying NetSuite Record.
   * This function can only be used if the instance was initialized using a NetSuite Server-Side record.
   *
   * @param enableSourcing
   * @param ignoreMandatoryFields
   */
  save (enableSourcing?: boolean, ignoreMandatoryFields?: boolean) {

    if (!isSavable(this._nsRecord)) {
      throw Error(`This instance cannot be saved because the underlying record instance does not have a "save" function.
      This typically means it is a "current" record and will be saved by NetSuite.`)
    }

    const id = this._nsRecord.save({
      enableSourcing: enableSourcing,
      ignoreMandatoryFields: ignoreMandatoryFields,
    });
    this._id = id
    return id

  }

}

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
export type AutoGetSetDecorator = (accessor: ClassAccessorDecoratorTarget<any, any>, context: ClassAccessorDecoratorContext<NSTypedRecord, any>) => ClassAccessorDecoratorResult<any, any>;

export interface AutoGetSetOptions {
  /**
   * When set to true, the "getText" and "setText" methods will be used
   * on the underlying NetSuite Record API to get and set the values for
   * this property.
   * If false or omitted, the "getValue" and "setValue" methods will be used instead.
   */
  asText?: boolean;
}

export function AutoGetSet(options?: AutoGetSetOptions): AutoGetSetDecorator {
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  return function(accessor: ClassAccessorDecoratorTarget<any, any>, context: ClassAccessorDecoratorContext<NSTypedRecord, unknown>): ClassAccessorDecoratorResult<any, any> {
    const getter = function (this: NSTypedRecord) {
      return (options?.asText)
        ? this.getText(context.name.toString())
        : this.getValue(context.name.toString());
    };

    const setter = function (this: NSTypedRecord, value: record.FieldValue) {
      if (options?.asText) {
        this.setText(context.name.toString(), value as string);
      }

      else {
        this.setValue(context.name.toString(), value);
      }
    };

    return {
      get: getter,
      set: setter
    };
  };
}