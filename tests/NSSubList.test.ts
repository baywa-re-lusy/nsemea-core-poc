import {describe, it, expect, vi} from "vitest";
import { TransactionBase } from '../src/Typescripts/Core/DataAccess/TransactionBase';

import * as nsRecord from 'N/record';
import * as record from './__mock__/N/record';

import {NSSubListLine} from "../src/Typescripts/Core/DataAccess/NSSubListLine";
import {NSSubList, SubListFieldTypeDecorator} from "../src/Typescripts/Core/DataAccess/NSSubList";
import {SubListDecorator} from "../src/Typescripts/Core/DataAccess/NSTypedRecord";
import {getLineCount, isDynamic} from "./__mock__/N/record";

describe('NSSubList get length property', () => {
  it('should return a numeric value representing the total number of lines', () => {

    class fakeSublist extends NSSubListLine {
      @SubListFieldTypeDecorator()
      accessor fakeNumber: number;
    }

    class fakeTran extends TransactionBase {

      @SubListDecorator(fakeSublist)
      accessor fSubList: NSSubList<fakeSublist>;

      override recordType() {
        return 'fakeRec';
      }
    }

    const fRec = new fakeTran(1);
    const nbrOfLines = fRec.fSubList.length;

    // Is called twice, first time in the constructor method rebuildArray
    // and the second time when calling the length property
    expect(record.getLineCount).toHaveBeenCalledTimes(2);

  });
});

describe('NSSubList adding a new line', () => {
  it('should throw an error when insertAt is higher than length', () => {

    class fakeSublist extends NSSubListLine {
      @SubListFieldTypeDecorator()
      accessor fakeNumber: number;
    }

    class fakeTran extends TransactionBase {

      @SubListDecorator(fakeSublist)
      accessor fSubList: NSSubList<fakeSublist>;

      override recordType() {
        return 'fakeRec';
      }
    }

    record.getLineCount.mockReturnValue(3);

    const fRec = new fakeTran(1);
    expect(() => fRec.fSubList.addLine(true, 4)).toThrow(Error);

  });

  it('should add a new line in standard mode', () => {

    class fakeSublist extends NSSubListLine {
      @SubListFieldTypeDecorator()
      accessor fakeNumber: number;
    }

    class fakeTran extends TransactionBase {

      @SubListDecorator(fakeSublist)
      accessor fSubList: NSSubList<fakeSublist>;

      override recordType() {
        return 'fakeRec';
      }
    }

    // Create a record in standard mode by passing the second parameter isDynamic
    const fRec = new fakeTran(1, false);

    fRec.fSubList.addLine();
    expect(record.insertLine).toHaveBeenCalledTimes(1);

  });

  it('should add a new line in dynamic mode', () => {

    class fakeSublist extends NSSubListLine {
      @SubListFieldTypeDecorator()
      accessor fakeNumber: number;
    }

    class fakeTran extends TransactionBase {

      @SubListDecorator(fakeSublist)
      accessor fSubList: NSSubList<fakeSublist>;

      override recordType() {
        return 'fakeRec';
      }
    }

    // Create a record in dynamic mode by passing the second parameter isDynamic
    const fRec = new fakeTran(1, true);

    fRec.fSubList.addLine();

    expect(record.selectNewLine).toHaveBeenCalledTimes(1);

  });
});

describe('NSSubList removing lines', () => {
  it('should remove all lines from a given sublist', () => {

    class fakeSublist extends NSSubListLine {
      @SubListFieldTypeDecorator()
      accessor fakeNumber: number;
    }

    class fakeTran extends TransactionBase {

      @SubListDecorator(fakeSublist)
      accessor fSubList: NSSubList<fakeSublist>;

      override recordType() {
        return 'fakeRec';
      }
    }

    record.getLineCount.mockReturnValue(3);

    const fRec = new fakeTran(1);
    console.log('length', fRec.fSubList.length);
    fRec.fSubList.removeAllLines();

    expect(record.removeLine).toHaveBeenCalledTimes(3);

  });

  it('should remove a given line from a given sublist', () => {

    class fakeSublist extends NSSubListLine {
      @SubListFieldTypeDecorator()
      accessor fakeNumber: number;
    }

    class fakeTran extends TransactionBase {

      @SubListDecorator(fakeSublist)
      accessor fSubList: NSSubList<fakeSublist>;

      override recordType() {
        return 'fakeRec';
      }
    }

    record.getLineCount.mockReturnValue(3);

    const fRec = new fakeTran(1);
    console.log('length', fRec.fSubList.length);
    fRec.fSubList.removeLine(2);

    expect(record.removeLine).toHaveBeenCalledTimes(1);
    expect(record.removeLine).toBeCalledWith({
      line: 2,
      sublistId: 'fSubList',
      ignoreRecalc: false
    });

  });
});

describe('NSSubList get field value', () => {
  it('should return a numeric value for a given field', () => {

    class fakeSublist extends NSSubListLine {
      @SubListFieldTypeDecorator()
      accessor fakeNumber: number;
    }

    class fakeTran extends TransactionBase {

      @SubListDecorator(fakeSublist)
      accessor fSubList: NSSubList<fakeSublist>;

      override recordType() {
        return 'fakeRec';
      }
    }

    new fakeTran(1);


  });
});