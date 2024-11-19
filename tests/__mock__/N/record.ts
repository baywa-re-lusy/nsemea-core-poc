import { vi } from "vitest";
import * as record from 'N/record';

export const create= vi.fn( function ({type, isDynamic, defaultValues} ) {
  this.type = type
  this.isDynamic = isDynamic
  this.defaultValues = defaultValues
  return this
});

export const load = vi.fn(function({type, id, isDynamic, defaultValues}) {
  this.type = type
  this.id = id
  this.isDynamic = isDynamic
  this.defaultValues = defaultValues
  return this
});

export const getField = vi.fn(function({fieldId}) {
  this.fieldId = fieldId
});

export const getValue = vi.fn(function(fieldId) {
  this.fieldId = fieldId
  return 123
});

export const getText = vi.fn(function(fieldId) {
  this.fieldId = fieldId
  return "ABC"
});

export const Type= vi.fn();


