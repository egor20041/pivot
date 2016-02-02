'use strict';

import { Class, Instance, isInstanceOf } from 'immutable-class';
import { $, Expression, ExpressionJS, Set, SetJS, ChainExpression, NotAction, InAction, TimeRange } from 'plywood';

export interface FilterClauseValue {
  expression: Expression;
  values: Set;
  exclude?: boolean;
  required?: boolean;
}

export interface FilterClauseJS {
  expression: ExpressionJS;
  values: SetJS;
  exclude?: boolean;
  required?: boolean;
}

var check: Class<FilterClauseValue, FilterClauseJS>;
export class FilterClause implements Instance<FilterClauseValue, FilterClauseJS> {

  static isFilterClause(candidate: any): boolean {
    return isInstanceOf(candidate, FilterClause);
  }

  static fromExpression(ex: Expression, required: boolean = false): FilterClause {
    var exclude = false;
    if (ex.lastAction() instanceof NotAction) {
      ex = ex.popAction();
      exclude = true;
    }
    var lastAction = ex.lastAction();
    if (lastAction instanceof InAction) {
      var val = lastAction.getLiteralValue();
      return new FilterClause({
        expression: ex.popAction(),
        values: TimeRange.isTimeRange(val) ? Set.fromJS([val]) : val,
        exclude,
        required: required
      });
    }
    throw new Error(`invalid expression ${ex.toString()}`);
  }

  static fromJS(parameters: FilterClauseJS): FilterClause {
    var value: FilterClauseValue = {
      expression: Expression.fromJS(parameters.expression),
      values: Set.fromJS(parameters.values),
      exclude: Boolean(parameters.exclude),
      required: Boolean(parameters.required)
    };
    return new FilterClause(value);
  }


  public expression: Expression;
  public values: Set;
  public exclude: boolean;
  public required: boolean;

  constructor(parameters: FilterClauseValue) {
    this.expression = parameters.expression;
    this.values = parameters.values;
    if (!Set.isSet(this.values)) throw new Error('must be a set');
    this.exclude = parameters.exclude || false;
    this.required = parameters.required || false;
  }

  public valueOf(): FilterClauseValue {
    return {
      expression: this.expression,
      values: this.values,
      exclude: this.exclude,
      required: this.required
    };
  }

  public toJS(): FilterClauseJS {
    var js: FilterClauseJS = {
      expression: this.expression.toJS(),
      values: this.values.toJS()
    };
    if (this.exclude) js.exclude = true;
    if (this.required) js.required = true;
    return js;
  }

  public toJSON(): FilterClauseJS {
    return this.toJS();
  }

  public toString(): string {
    return `[FilterClause: ${this.expression.toString()}]`;
  }

  public equals(other: FilterClause): boolean {
    return FilterClause.isFilterClause(other) &&
      this.expression.equals(other.expression) &&
      this.values.equals(other.values) &&
      this.exclude === other.exclude &&
      this.required === other.required;
  }

  public toExpression(): ChainExpression {
    var values = this.values;
    var ex = (values.size() === 1 && TimeRange.isTimeRange(values.elements[0])) ?
      this.expression.in(values.elements[0]) :
      this.expression.in(values);
    if (this.exclude) ex = ex.not();
    return ex;
  }

  public changeValues(values: Set) {
    var value = this.valueOf();
    value.values = values;
    value.required = this.required;
    return new FilterClause(value);
  }
}
check = FilterClause;
