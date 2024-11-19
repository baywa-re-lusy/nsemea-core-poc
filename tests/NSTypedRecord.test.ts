import {describe, it, expect } from "vitest";
import { TransactionBase } from '../src/Typescripts/Core/DataAccess/TransactionBase';
import * as nsRecord from 'N/record';

import * as record from './__mock__/N/record';
import {FieldTypeDecorator} from "../src/Typescripts/Core/DataAccess/NSTypedRecord";

describe('NSTypedRecord constructor', () => {
  it('should create and return an instance of a new record of type x when no argument is passed', () => {
    class fakeTran extends TransactionBase {
      override recordType() {
        return 'fakeRec';
      }
    }
    new fakeTran();
    expect(record.create).toHaveBeenCalledTimes(1);
    expect(record.create).toBeCalledWith({type: 'fakeRec'});
  });

  it('should create and return an instance of a new record of type x when null argument for id is passed', () => {
    class fakeTran extends TransactionBase {
      override recordType() {
        return 'fakeRec';
      }
    }
    new fakeTran();
    expect(record.create).toHaveBeenCalledTimes(1);
    expect(record.create).toBeCalledWith({type: 'fakeRec'});
  });

  it('should load and return an instance of a record when the record or current record is passed as argument', () => {
    const fakeRec:nsRecord.Record  = record.create({type: 'fake'});
    class fakeTran extends TransactionBase {
      override recordType() {
        return 'fakeRec';
      }
    }
    const fTran = new fakeTran(fakeRec);
    expect(fTran._nsRecord).toBe(fakeRec);
  });

  it('should load and return an instance of a record when the internalid is passed as numeric argument', () => {
    class fakeTran extends TransactionBase {
      override recordType() {
        return 'fakeRec';
      }
    }
    new fakeTran(1);
    expect(record.load).toHaveBeenCalledTimes(1);
    expect(record.load).toBeCalledWith({type: "fakeRec", id: 1, isDynamic: false});
  });

  it('should load and return an instance of a record when the internalid is passed as numeric string argument', () => {
    class fakeTran extends TransactionBase {
      override recordType() {
        return 'fakeRec';
      }
    }
    new fakeTran("1");
    expect(record.load).toHaveBeenCalledTimes(1);
    expect(record.load).toBeCalledWith({type: "fakeRec", id: "1", isDynamic: false});
  });

  it('should load and return an instance of a record when the internalid is passed as non-numeric string argument', () => {
    class fakeTran extends TransactionBase {
      override recordType() {
        return 'fakeRec';
      }
    }
    expect(() => new fakeTran("a")).toThrow(Error);
  });


});

describe('NSTypedRecord get record field', () => {
  it('should return a field object when passing a field id/name', () => {
    class fakeTran extends TransactionBase {
      @FieldTypeDecorator()
      accessor someNumericField: number;

      override recordType() {
        return 'fakeRec';
      }
    }

    const fRec = new fakeTran(1);
    const field = fRec.getField('someNumericField');

    expect(record.getField).toHaveBeenCalledTimes(1);
    expect(record.getField).toBeCalledWith({fieldId: 'someNumericField'});
  });
});

describe('NSTypedRecord get field value', () => {
  it('should return a numeric value for a given field', () => {
    class fakeTran extends TransactionBase {
      @FieldTypeDecorator()
      accessor someNumericField: number;

      override recordType() {
        return 'fakeRec';
      }
    }

    const fRec = new fakeTran(1);
    const value = fRec.someNumericField;

    expect(record.getValue).toHaveBeenCalledTimes(1);
    expect(record.getValue).toBeCalledWith('someNumericField');
    expect(value).toBe(123);

  });

  it('should return a string/text value for a given field', () => {
    class fakeTran extends TransactionBase {
      @FieldTypeDecorator({ fieldId: 'someStringField', asText: true })
      accessor someStringField: string;

      override recordType() {
        return 'fakeRec';
      }
    }

    const fRec = new fakeTran(1);
    const value = fRec.someStringField;
    console.log(value);

    expect(record.getText).toHaveBeenCalledTimes(1);
    expect(record.getText).toBeCalledWith('someStringField');
    expect(value).toBe("ABC");

  });
});