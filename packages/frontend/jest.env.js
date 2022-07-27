require("isomorphic-fetch");
require("@testing-library/react");
require("@testing-library/jest-dom");
require("fake-indexeddb/auto");

// Define to stop tests from erroring
window.scrollTo = () => {};
window.scroll = () => {};
