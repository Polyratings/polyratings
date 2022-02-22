import 'reflect-metadata'
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
// Polyfill for Safari
import 'form-request-submit-polyfill';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root'),
);
