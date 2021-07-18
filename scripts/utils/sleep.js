/**
 * https://stackoverflow.com/a/39914235
 * @param ms    Number of milliseconds to wait.
 * @return {Promise<unknown>}
 */
const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

module.exports = sleep;
