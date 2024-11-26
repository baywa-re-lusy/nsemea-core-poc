/**
 * Reprensents a NetSuite sublist object
 */
import { NSSubListLine } from './NSSubListLine';
import * as record from 'N/record';
// import * as log from 'N/log';
import { FieldValue } from 'N/record';

export class NSSubList<T extends NSSubListLine> {
  /**
   * Holds Netsuite internal id (string name) of the sublist
   */
  // @NonEnumerableDecorator
  _subListId: string;

  /**
   * Class member representing the underlying netsuite record object
   */
  // @NonEnumerableDecorator
  _nsRecord: record.Record;

  /**
   * If true, uses dynamic mode API calls to access sublist line field values.
   * If false, uses standard mode
   * The default behavior is to use dynamic mode if the record is in dynamic mode. You can override this
   * (force using 'standard mode' APIs even with a dynamic record) by setting this value `false` prior to
   * your code that manipulates the sublist line.
   */
  private _useDynamicModeAPI: boolean;

  // enforce 'array like' interaction through indexers
  [i: number]: T;

  /**
   * Class member representing an array containing the entries of a sublist
   */
  entries: T[];

  /**
   * Constructs a new array-like representation of a NS sublist.
   * @param subListLineType the type (should be a class extending `SublistLine`) to represent individual rows
   * of this sublist
   * @param nsRec the NS native`record.Record` instance to manipulate
   * @param subListId name of the sublist we're representing
   */
  constructor(
    readonly subListLineType: new (
      subListId: string,
      rec: record.Record,
      line: number,
    ) => T,
    nsRec: record.Record,
    subListId: string,
  ) {

    nonenumerable(this, 'subListLineType');
    nonenumerable(this, '_useDynamicModeAPI');
    nonenumerable(this, '_nsRecord');
    nonenumerable(this, '_subListId');
    nonenumerable(this, 'entries');

    this.subListLineType = subListLineType;
    this._subListId = subListId;
    this._nsRecord = nsRec;

    // usually if we have a record in 'dynamic mode' we want to use the dynamic mode API, but there are exceptions
    // where standard mode APIs work better even on a dynamic record instance
    // (e.g. `VendorPayment.apply` in a client script)
    this._useDynamicModeAPI = this._nsRecord.isDynamic;
    this.rebuildArray();
  }

  /**
   * If true **and** the underlying netsuite record is in dynamic mode, uses the dynamic APIs to manipulate
   * the sublist (e.g. `getCurrentSublistValue()`) otherwise uses 'standard mode' (e.g. `getSublistValue()`)
   * Defaults to true if the record is in dynamic mode. Set this to false prior to manipulating the sublist in order
   * to force standard mode API usage even if the record is in 'dynamic mode'
   */
  get useDynamicModeAPI(): boolean {
    return this._useDynamicModeAPI;
  }

  set useDynamicModeAPI(value: boolean) {
    this._useDynamicModeAPI = value;
    // rebuild the array of line objects so the dynamic mode api setting gets applied to all lines.
    this.rebuildArray();
  }

  /**
   * array-like length property (linecount)
   * @returns {number} number of lines in this list
   */
  get length() {
    return this._nsRecord.getLineCount({ sublistId: this._subListId });
  }

  /**
   * adds a new line to this sublist at the given line number.
   * @param ignoreRecalc set true to avoid line recalc
   * @param insertAt optionally set line # insertion point - defaults to insert at the end of the sublist. If
   * in dynamic mode this parameter is ignored (dynamic mode uses selectNewLine()). The insertion point
   * should be <= length of the list
   */
  addLine(ignoreRecalc = true, insertAt: number = this.length): T {
    // log.debug(
    //   'Inserting line',
    //   `sublist: ${this._subListId} insert at line:${insertAt}`,
    // );
    if (insertAt > this.length) {
      throw Error(
        `Insertion index (${insertAt}) cannot be greater than sublist length (${this.length})`,
      );
    }
    if (this._useDynamicModeAPI && this._nsRecord.isDynamic) {
      this._nsRecord.selectNewLine({ sublistId: this._subListId });
    } else {
      this._nsRecord.insertLine({
        sublistId: this._subListId,
        line: insertAt,
        ignoreRecalc: ignoreRecalc,
      });
      this.rebuildArray();
    }
    // log.debug('Line count after adding', this.length);
    return this._useDynamicModeAPI && this._nsRecord.isDynamic
      ? this[this.length]
      : this[insertAt];
  }

  /**
   * Removes all existing lines of this sublist, leaving effectively an empty array
   * @param ignoreRecalc passed through to nsrecord.removeLine (ignores firing recalc event as each line is removed )
   */
  removeAllLines(ignoreRecalc = true) {
    while (this.length > 0) {
      const lineNum = this.length - 1;
      this.removeLine(lineNum, ignoreRecalc);
      // log.debug('Removed line', lineNum);
    }
    this.rebuildArray();
    return this;
  }

  /**
   * Removes a line at the given index. Note this causes the array to rebuild.
   * @param line
   * @param ignoreRecalc
   */
  removeLine(line: number, ignoreRecalc = false) {
    this._nsRecord.removeLine({
      line: line,
      sublistId: this._subListId,
      ignoreRecalc: ignoreRecalc,
    });
    this.rebuildArray();
  }

  /**
   * Commits the currently selected line on this sublist. When adding new lines in standard mode
   * you don't need to call this method
   */
  commitLine() {
    if (!this._nsRecord.isDynamic) {
      throw Error(
        'Do not call commitLine() on records in standard mode, commitLine() is only needed in dynamic mode',
      );
    }
    // log.debug('Committing line', `sublist: ${this._subListId}`);
    this._nsRecord.commitLine({ sublistId: this._subListId });
    this.rebuildArray();
  }

  /**
   * Selects the given line on this sublist
   * @param line line number
   */
  selectLine(line: number) {
    // log.debug('Selecting line', line);
    this._nsRecord.selectLine({ sublistId: this._subListId, line: line });
  }

  /**
   * Gets the NetSuite metadata for the given sublist field. Useful when you want to do things like disable
   * a sublist field or other operations on the field itself (rather than the field value/text)
   * Note: this uses the first sublist line (0) when retrieving field data
   * @param field name of the desired sublist field
   */
  getField(field: keyof T) {
    return this._nsRecord.getSublistField({
      fieldId: field as string,
      sublistId: this._subListId,
      line: 0,
    });
  }

  /**
   * Upserts the indexed props (array-like structure) This is called once at construction, but also
   * as needed when a user dynamically works with sublist rows.
   */
  protected rebuildArray() {
    // log.debug('Sublist rebuild array', 'Deleting existing numeric properties');
    Object.getOwnPropertyNames(this)
      .filter((key) => !isNaN(+key))
      .forEach((key) => delete this[key], this);
    // log.debug('Sublist after deleting properties', this);
    // log.debug(
    //   'Building sublist',
    //   `type:${this._subListId}, linecount:${this.length}`,
    // );
    this.entries = <T[]>[];

    // Create a sublist line indexed property of type T for each member of the underlying sublist
    for (let i = 0; i < this.length; i++) {
      const line = new this.subListLineType(this._subListId, this._nsRecord, i);
      line.useDynamicModeAPI = this._useDynamicModeAPI;
      this[i] = line;
      this.entries.push(line);
    }

    // If dynamic mode we always have an additional ready-to-fill out line at the end of the list,
    // but note that `this.length` does not include this line because it's not committed. This mirrors the
    // actual behavior NetSuite shows - e.g. in dynamic mode, native getLineCount() returns zero until the first
    // line is actually committed.
    // This allows us to access sublist properties even on the uncommitted line currently
    // being edited. This is most useful in client scripts e.g. on `fieldChanged()` of a fresh line.
    if (this._nsRecord.isDynamic) {
      Object.defineProperty(this, this.length, {
        value: new this.subListLineType(
          this._subListId,
          this._nsRecord,
          this.length,
        ),
        // mark this phantom line as non-enumerable so toJSON() doesn't try to render it as it's not really there
        enumerable: false,
        writable: true,
        configurable: true, // so prop can be deleted
      });
    }
  }
}

/**
 * Handles setting sublist fields for any combination of setValue/setText and standard/dynamic record
 * @param fieldId name of the column/fields you want to set a value
 * @param value value that should be set
 * @param isText should this value be handled as text
 */
function setSublistValue(
  this: NSSubListLine,
  fieldId: string,
  value: FieldValue,
  isText: boolean,
) {
  const options = {
    sublistId: this._subListId,
    fieldId: fieldId,
  };

  if (this.useDynamicModeAPI && this._nsRecord.isDynamic) {
    this._nsRecord.selectLine({ sublistId: this._subListId, line: this._line });

    if (isText) {
      this._nsRecord.setCurrentSublistText({
        ...options,
        ignoreFieldChange: this.ignoreFieldChange,
        forceSyncSourcing: this.forceSyncSourcing,
        text: value as string,
      });
    } else {
      this._nsRecord.setCurrentSublistValue({
        ...options,
        ignoreFieldChange: this.ignoreFieldChange,
        forceSyncSourcing: this.forceSyncSourcing,
        value: value,
      });
    }
  } else {
    if (isText) {
      this._nsRecord.setSublistText({
        ...options,
        line: this._line,
        text: value as string,
      });
    } else {
      this._nsRecord.setSublistValue({
        ...options,
        line: this._line,
        value: value,
      });
    }
  }
}

/**
 * Handles getting sublist fields values
 * @param fieldId name of the column/fields you want to get the value from
 * @param isText should this value be retrieved as text
 */
function getSublistValue(
  this: NSSubListLine,
  fieldId: string,
  isText: boolean,
) {
  const options = {
    sublistId: this._subListId,
    fieldId: fieldId,
  };
  // log.debug(`Getting sublist ${isText ? 'text' : 'value'}`, options);
  if (this.useDynamicModeAPI && this._nsRecord.isDynamic) {
    this._nsRecord.selectLine({ sublistId: this._subListId, line: this._line });
    return isText
      ? this._nsRecord.getCurrentSublistText(options)
      : this._nsRecord.getCurrentSublistValue(options);
  } else {
    return isText
      ? this._nsRecord.getSublistText({ ...options, line: this._line })
      : this._nsRecord.getSublistValue({ ...options, line: this._line });
  }
}

/**
 * Returns the line number of the currently selected line.
 * Note that line indexing begins at 0
 */
function getCurrentSublistIndex () {
  return this._nsRecord.getCurrentSublistIndex({ sublistId: this._subListId });
}

export interface SubListTypeOptions {
  fieldId?: string;
  asText?: boolean;
}
export function SubListFieldTypeDecorator(options?: SubListTypeOptions) {
  return function <T extends NSSubListLine, V extends FieldValue>(
    accessor: { get: (this: T) => V; set: (this: T, v: V) => void },
    context: ClassAccessorDecoratorContext<T, V>,
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  ): ClassAccessorDecoratorResult<any, any> {
    const isText = options?.asText ? options.asText : false;
    const fieldId = options?.fieldId
      ? options.fieldId
      : context.name.toString();
    const getter = function (this: T) {
      return getSublistValue.call(this, fieldId, isText) as FieldValue;
    };
    const setter = function (this: T, value: V) {
      setSublistValue.call(this, fieldId, value, isText);
    };
    return {
      get: getter,
      set: setter,
    };
  };
}

export function nonenumerable (target: any, propertyKey: string) {
  let descriptor = Object.getOwnPropertyDescriptor(target, propertyKey) || {};
  if (descriptor.enumerable !== false) {
    descriptor.enumerable = false;
    descriptor.writable = true;
    descriptor.configurable = true;
    Object.defineProperty(target, propertyKey, descriptor)
  }
}
