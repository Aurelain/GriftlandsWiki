/**
 * When placed inside a module, tries to run the actuator if it was invoked as the second process parameter.
 * In other words, allows the module to be a function and a runner at the same time.
 * Alternative to `scripts: {"foo": "node -e \"require('./foo.js')()\""}`.
 */
const attemptSelfRun = (actuator) => {
    const secondParameter = process.argv[1] || '';
    const invokedName = (secondParameter.match(/([^\\\/]*).js$/) || [])[1];
    if (invokedName === actuator.name) {
        actuator.apply(null, process.argv.slice(2));
    }
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
module.exports = attemptSelfRun;
