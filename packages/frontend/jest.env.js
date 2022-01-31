require('isomorphic-fetch');
require('@testing-library/react');
require('@testing-library/jest-dom');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Storage = require('dom-storage');

global.localStorage = new Storage(null, { strict: true });
global.sessionStorage = new Storage(null, { strict: true });

// Define to stop tests from erroring
window.scrollTo = () => {};
window.scroll = () => {};
