import { observable, computed, action } from 'mobx';

const transduce = (items, mapper, reducer, initial) =>
  items.reduce((acc, item, index) =>
    reducer(acc, mapper(item, index), index)
  , initial);

class ReportStore {
  @observable sideNavOpen = false;
  @observable showPassed = true;
  @observable showFailed = true;
  @observable showPending = true;
  @observable showSkipped = false;
  @observable showHooks = 'failed';

  constructor(data = {}) {
    this.data = data;
    this.showHooksOptions = [ 'failed', 'always', 'never', 'context' ];
  }

  @computed get suites() {
    return this._getFilteredTests(this.allSuites);
  }

  @action openSideNav() {
    this.sideNavOpen = true;
  }

  @action closeSideNav() {
    this.sideNavOpen = false;
  }

  @action toggleFilter(prop) {
    this[prop] = !this[prop];
  }

  @action setShowHooks(prop) {
    if (this._isValidShowHookOption(prop)) {
      this.showHooks = prop;
    }
  }

  _mapHook = hook => (
      ((this.showHooks === 'always')
      || (this.showHooks === 'failed' && hook.fail)
      || (this.showHooks === 'context' && hook.context))
      && hook
  )

  _mapTest = test => (
      ((this.showPassed && test.pass)
      || (this.showFailed && test.fail)
      || (this.showPending && test.pending)
      || (this.showSkipped && test.skipped))
      && test
  )

  _mapSuite = suite => {
    const suites = suite.suites.length
      ? this._getFilteredTests(suite.suites)
      : [];
    const tests = transduce(suite.tests, this._mapTest, this._reduceItem, []);
    const beforeHooks = transduce(suite.beforeHooks, this._mapHook, this._reduceItem, []);
    const afterHooks = transduce(suite.afterHooks, this._mapHook, this._reduceItem, []);

    return (beforeHooks.length || afterHooks.length || tests.length || suites.length)
      ? Object.assign({}, suite, { suites, beforeHooks, afterHooks, tests })
      : null;
  }

  _reduceItem = (acc, item) => {
    if (item) {
      acc.push(item);
    }
    return acc;
  }

  _getFilteredTests = suite => (
    transduce(suite, this._mapSuite, this._reduceItem, [])
  )

  _isValidOption = (property, options, selection) => {
    const isValid = options.indexOf(selection) >= 0;
    if (!isValid) {
      console.error(`Warning: '${selection}' is not a valid option for property: '${property}'. Valid options are: ${options.join(', ')}`); // eslint-disable-line
    }
    return isValid;
  };

  _isValidShowHookOption = option => (
    this._isValidOption('showHooks', this.showHooksOptions, option)
  );

  _getShowHooks = ({ showHooks }) => {
    if (!showHooks) {
      return this.showHooks;
    }
    return this._isValidShowHookOption(showHooks) ? showHooks : this.showHooks;
  };

  setInitialData({ data, config }) {
    const reportTitle = config.reportTitle || data.reportTitle;
    const showHooks = this._getShowHooks(config);

    Object.assign(this, { data, ...config, reportTitle, showHooks });
    this.allSuites = [ data.suites ];
    this.stats = data.stats;
    this.enableChart = !!config.enableCharts;
    this.devMode = !!config.dev;
  }
}

const reportStore = new ReportStore();
window.reportStore = reportStore;
export default reportStore;

export { ReportStore };
