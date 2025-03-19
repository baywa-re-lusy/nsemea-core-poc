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
  return 0
});

export const getText = vi.fn(function(fieldId) {
  this.fieldId = fieldId
  return ""
});

export const setValue = vi.fn(function(fieldId) {
  this.fieldId = fieldId
});

export const setText = vi.fn(function(fieldId) {
  this.fieldId = fieldId
});

export const getSubrecord = vi.fn(function(fieldId) {
});

export const getLineCount = vi.fn();
export const insertLine = vi.fn();
export const selectNewLine = vi.fn();
export const removeLine = vi.fn();

export const Type= vi.fn();
