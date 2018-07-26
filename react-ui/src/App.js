import React, { Component } from 'react';
import { Route, Switch } from 'react-router-dom'
import { observer } from 'mobx-react';
import { DragDropContextProvider } from 'react-dnd'
import HTML5Backend from 'react-dnd-html5-backend'
import Board from './components/Board/Board'
import Home from './components/Home/Home'
import './App.css'

class App extends Component {
  constructor(props) {
    super(props)

  }
  shouldComponentUpdate(np, ns) {
    return true
  }
  render() {
    const { stores } = this.props
    return stores.server.connected ?
      (
        <DragDropContextProvider backend={HTML5Backend}>
          <Switch>
            <Route exact path='/'
              render={({ match }) => (
                <Home />
              )} />
            <Route path='/:name'
              render={({ match }) => (
                <Board {...this.props} match={match} />
              )} />
          </Switch>
        </DragDropContextProvider>
      ) : <div>Connecting to server</div>
  }
}

export default observer(App);
