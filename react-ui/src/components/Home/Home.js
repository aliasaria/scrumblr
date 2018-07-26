import React, { Component } from 'react'
import { Redirect, Link } from 'react-router-dom'
import { RIEInput } from '../REIK'
import Sticker from '../Sticker/Sticker'


class Home extends Component {
    constructor(props) {
        super(props)
        this.state = {
            value: '',
            redirect: false
        }
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }
    handleChange(event) {
        this.setState({ value: event.target.value });
    }
    handleSubmit(event) {
        event.preventDefault();
        this.setState({ redirect: true })
    }

    render() {
        return this.state.redirect ? <Redirect push to={`/${this.state.value}`} /> : <div>
            <div className='board-outline' width='300px' height='300px'>
                <div id='board'>
                    <div id='board-doodles' />
                    <div id='react-logo' />
                    <table id='board-table' className='board-table' >
                        <tbody>
                            <tr>
                                <td>
                                    <h1 className='home'>scrumblr</h1>

                                    <form className="home" onSubmit={this.handleSubmit}>
                                        <label>Name your board</label> <br />
                                        <input className="text" type="text" value={this.state.value} onChange={this.handleChange} />
                                        <button id='go' type='submit'>Go</button>
                                    </form>
                                    <p className='home'>Example board:&nbsp;<Link className='home' to='/demo'>Demo</Link></p>
                                    <p className='home small'>source code at <a href={process.env.REACT_APP_GITHUB_URL ? process.env.REACT_APP_GITHUB_URL : 'https://github.com/mannyhuerta/scrumblr'}>scrumblr</a></p>
                                    {/* TODO - parameterize the github repo */}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div className='stickers'>
                <Sticker color='red' canDrag />
                <Sticker color='blue' canDrag />
                <Sticker color='yellow' canDrag />
                <Sticker color='green' canDrag />
                <br />
                <Sticker color='pink' canDrag />
                <Sticker color='lightblue' canDrag />
                <Sticker color='orange' canDrag />
                <Sticker color='purple' canDrag />
                <br />
                <Sticker color='nosticker' canDrag />
            </div>

        </div>

    }
}

export default Home