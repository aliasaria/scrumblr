import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import registerServiceWorker from './registerServiceWorker';
import stores from './stores'

stores.server.connected = false

ReactDOM.render(<Router><App stores={stores} /></Router>, document.getElementById('root'));
registerServiceWorker();
