/**
 * This module provides a lazy, functional processing approach to working with
 * NetSuite SuiteQL queries. It automatically handles paging behind the scenes
 * allowing the developer to focus on 'per result' business logic.
 *
 * Use `LazyQuery.from()` to get started.
 * Turn query results into plain objects using `nsQueryResult2obj()`
 */

import * as query from 'N/query';
import * as log from 'N/log';

/**
 * Makes a NetSuite query an ES2015 style Iterator. That is, it follows the Iterator Protocol for iterating
 * over query results in a forward-only fashion. The result can be passed to any library
 * that accepts Iterators (such as ImmutableJS)
 * to provide easy chainable logic for arbitrary length result sets.
 */
export class LazyQuery {

  protected mappedData: query.QueryResultMap[];

  /**
   * Not meant to be used directly, use factory methods such as `load` or `from`
   * @param q object of query and parameters
   * @param pageSize pagesize, can be up to 1000
   * @param pagedQuery boolean, should query be executed as paged query or not
   */
  private constructor (q: { query: string, params?: Array<string | number | boolean> }, pageSize = 500, pagedQuery = true) {

    this.mappedData = [];

    if (pagedQuery) {
      if (pageSize > 1000) throw new Error('page size must be <= 1000');

      let pagedData: query.PagedData;

      if(!q.params) {
        pagedData = query.runSuiteQLPaged({ query: q.query, pageSize: pageSize});
      } else {
        pagedData = query.runSuiteQLPaged({ query: q.query, params: q.params, pageSize: pageSize});
      }

      for (let i = 0; i < pagedData.pageRanges.length; i++) {
        const currentPage = pagedData.fetch({index: i});
        this.mappedData = this.mappedData.concat(currentPage.data.asMappedResults());
      }

      log.debug(`lazy query `,
        `using page size ${pagedData.pageSize}, record count ${pagedData.count}`);
    } else {
      let queryResults: query.ResultSet;
      if(!q.params) {
        queryResults = query.runSuiteQL({query: q.query});
      } else {
        queryResults = query.runSuiteQL({query: q.query, params: q.params});
      }
      this.mappedData = this.mappedData.concat(queryResults.asMappedResults());
    }
  }

  /**
   * Creates a lazy query from an existing NS .
   * @param q the SQL query and optional query parameters
   * @param pageSize optional pagesize, can be up to 1000. Default is 500
   * @returns Lazy Seq ready for processing
   */
  static from (q: {query: string, params?: Array<string | number | boolean>}, pageSize?: number) {
    let result: LazyQuery;
    if (typeof(pageSize) !== 'undefined') {
      result = new LazyQuery(q, pageSize, true);
    } else {
      result = new LazyQuery(q, pageSize, false);
    }
    return result;
  }
}