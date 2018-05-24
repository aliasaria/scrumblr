import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import queryString from 'query-string'
import App from './App';
import stores from './stores'

const redirectUri = `${window.location.protocol}//${window.location.hostname}:${window.location.port}${window.location.pathname}`
const code = queryString.parse(window.location.search).code

stores.server.connected = false
stores.server.code = code
stores.server.redirectUri = redirectUri

ReactDOM.render(<Router><App stores={stores} /></Router>, document.getElementById('root'));
