import { observable, decorate } from "mobx"
import io from 'socket.io-client'
const uuidv4 = require('uuid/v4');

const URL = `${window.location.origin}`
const SOCKET_IO_URL = process.env.NODE_ENV === 'development' ? 'http://localhost:8081' : URL

const socket = io(SOCKET_IO_URL, {
    path: '/socket.io'
});

socket.on('connect', function () {
    server.connected = true
    server.authenticated = false
})

socket.on('disconnect', function () {
    server.connected = false
})

socket.on('message', function (msg) {
    if (msg.action) {
        switch (msg.action) {
            case 'roomAccept':
                msg.users.forEach(user => {
                    if (user)
                        scrumblr.setUserName(user.user_name ? user.user_name : user.sid, user.sid)
                })
                scrumblr.addBoard(msg.room, new Board(msg.room, 600, 1000, [], msg.users ? msg.users.map(user => user.sid) : []))
                sendAction('initializeMe', { room: msg.room });
                break;
            case 'initCards':
                msg.cards && msg.cards.forEach((card) => {
                    scrumblr.addCard(msg.room, card.colour, card.text, card.x, card.y, card.rot, card.sticker, card.id, card.zindex)
                })
                break;
            case 'setBoardSize':
                scrumblr.boards[msg.room].height = msg.data.height
                scrumblr.boards[msg.room].width = msg.data.width
                break;
            case 'moveCard':
                scrumblr.cards[msg.data.id].move(msg.data.position.left, msg.data.position.top)
                break;
            case 'createCard':
                scrumblr.addCard(msg.data.room, msg.data.colour, msg.data.text, msg.data.x, msg.data.y, msg.data.rot, msg.data.sticker, msg.data.id)
                break;
            case 'editCard':
                scrumblr.cards[msg.data.id].text = msg.data.value
                break;
            case 'deleteCard':
                scrumblr.removeCard(msg.data.id, msg.data.room)
                break;
            case 'initColumns':
                msg.columns.forEach(col => {
                    scrumblr.boards[msg.room].addColumn(col)
                })
                break;
            case 'createColumn':
                scrumblr.boards[msg.data.room].columns.push(new Column(msg.data.text))
                break;
            case 'deleteColumn':
                if (scrumblr.boards[msg.room].columns.length > 0)
                    scrumblr.boards[msg.room].columns.pop()
                break;
            case 'updateColumns':
                const columns = msg.data.map(col =>
                    new Column(col)
                )
                scrumblr.boards[msg.room].columns = columns
                break;
            case 'nameChangeAnnounce':
                scrumblr.setUserName(msg.data.user_name, msg.data.sid)
                break;
            case 'join-announce':
                scrumblr.setUserName(msg.data.user_name ? msg.data.user_name : msg.data.sid, msg.data.sid)
                scrumblr.boards[msg.data.room].users.push(msg.data.sid)
                break;
            case 'leave-announce':
                scrumblr.boards[msg.data.room].users = scrumblr.boards[msg.data.room].users.filter(u => u != msg.data.sid)
                scrumblr.deleteUser(msg.data.sid)
                break;
            case 'addSticker':
                scrumblr.cards[msg.data.cardId].addSticker(msg.data.stickerId)
                break;
            case 'setzIndex':
                scrumblr.cards[msg.data.cardId].setzIndex(msg.data.zindex)
                break;
            case 'changeTheme':
                console.log('changeTheme not implemented')
                break;
            case 'cardStartEditing':
                scrumblr.cards[msg.data.cardId].editing = true
                scrumblr.cards[msg.data.cardId].editingBy = scrumblr.users[msg.data.sid] ? scrumblr.users[msg.data.sid].name : msg.data.sid
                break;
            case 'cardEndEditing':
                scrumblr.cards[msg.data.cardId].editing = false
                break;
            default:
                console.log('invalid action: ' + msg.action)
        }
    }

})

class ScrumblrStore {
    boards = {
    }

    cards = {

    }

    users = {

    }

    deleteUser(sid) {
        delete this.users[sid]
    }
    setUserName(name, sid) {
        const id = sid ? sid : socket.id
        this.users[id] = new User(id, name)
        return (room) => { sendAction('setUserName', { name: name, room: room }) }
    }
    getYourName() {
        return this.users[socket.id] ? this.users[socket.id].name : socket.id
    }

    joinRoom(id) {
        sendAction('joinRoom', id)
    }

    addBoard(id, board) {
        this.boards[id] = board
    }

    addCard(boardid, color, text, x, y, rot, sticker, id, zindex = 10) {
        const cardId = id ? id : uuidv4()
        const card = new Card(cardId, boardid, text, color, x, y, rot, sticker ? sticker : [], zindex)
        this.cards[cardId] = card
        this.boards[boardid].cards.push(cardId)
        this.boards[boardid].setMoves(zindex)
        return card
    }

    removeCard(id, board) {
        const index = this.boards[board].cards.indexOf(id)
        if (index > -1) {
            this.boards[board].cards.splice(index, 1)
            delete this.cards.id
            const data = {
                room: board,
                id: id
            }
            return () => { sendAction('deleteCard', data) }
        }
    }
    setMoves(boardid, number) {
        if (number > this.boards[boardid].moves)
            this.boards[boardid].setMoves(number)
    }
    getMoves(boardid) {
        return this.boards[boardid].getMoves()
    }
}
decorate(ScrumblrStore, {
    boards: observable,
    cards: observable,
    users: observable
})

class Board {
    constructor(id, height, width, cards, users) {
        this.id = id
        this.height = height
        this.width = width
        this.cards = cards
        this.users = users
    }
    id
    height
    width
    cards = []
    columns = []
    users = []
    moves = 10

    updateSize(height, width) {
        return () => { sendAction('setBoardSize', { room: this.id, height: height, width: width }) }
    }
    addColumn(text) {
        this.columns.push(new Column(text))
        return () => {
            sendAction('createColumn', { room: this.id, text: text })
        }
    }
    removeColumn() {
        this.columns.pop()
        return () => {
            sendAction('deleteColumn', { room: this.id })
        }
    }
    updateColumn(idx, text) {
        this.columns[idx] = new Column(text)
        return () => {
            sendAction('updateColumns', { columns: this.columns.map(col => col.text), room: this.id })
        }
    }
    setMoves(number) {
        if (number > this.moves)
            this.moves = number
    }
    getMoves() {
        return this.moves
    }


}
decorate(Board, {
    height: observable,
    width: observable,
    cards: observable,
    columns: observable,
    users: observable,
    moves: observable
})

class Column {
    constructor(text) {
        this.text = text
    }
    text
}
decorate(Column, {
    text: observable
})

class Card {
    constructor(id, board, text, color, x, y, rot, sticker = [], zindex = 10) {
        this.id = id
        this.board = board
        this.text = text
        this.color = color
        this.x = x
        this.y = y
        this.rot = rot
        this.sticker = sticker
        this.prevX = this.x
        this.prevY = this.y
        this.zindex = zindex
    }
    id
    board
    content
    color
    x
    y
    rot
    sticker = []
    prevX
    prevY
    editing
    editingBy
    zindex

    create() {
        sendAction('createCard', {
            id: this.id,
            room: this.board,
            text: this.text,
            x: this.x,
            y: this.y,
            rot: this.rot,
            colour: this.color,
            zindex: this.zindex
        })
    }
    move(x, y) {
        const data = {
            id: this.id,
            room: this.board,
            position: { left: x ? x : this.x, top: y ? y : this.y },
            oldposition: { left: this.x ? this.x : x, top: this.y ? this.y : y },
        }
        this.prevX = this.x
        this.prevY = this.y
        this.x = x
        this.y = y

        return () => { sendAction('moveCard', data) };
    }
    updateText(text) {
        this.text = text
        const data = {
            id: this.id,
            value: text,
            room: this.board
        }
        return () => { sendAction('editCard', data) }
    }
    startEditing() {
        sendAction('startEditingCard', { room: this.board, cardId: this.id })
    }
    endEditing() {
        sendAction('endEditingCard', { room: this.board, cardId: this.id })
    }
    addSticker(id) {
        if (id === 'nosticker')
            this.sticker = []
        else
            !this.sticker.includes(id) && this.sticker.push(id)

        return () => { sendAction('addSticker', { room: this.board, cardId: this.id, stickerId: id }) }

    }
    removeSticker(id) {
        this.sticker = this.sticker.filter(s => s !== id)
    }
    setzIndex(zindex) {
        this.zindex = zindex
        return () => {
            sendAction('setzIndex', { room: this.board, cardId: this.id, zindex: zindex })
        }
    }
}
decorate(Card, {
    id: observable,
    board: observable,
    text: observable,
    color: observable,
    x: observable,
    y: observable,
    rot: observable,
    sticker: observable,
    prevX: observable,
    prevY: observable,
    zindex: observable,
    editing: observable,
    editingBy: observable
})

class User {
    constructor(id, name) {
        this.id = id
        this.name = name
    }
    id
    name
}

class Server {
    constructor() {
    }
    connected
    URL
    authenticated
    redirectUri
    code
}
decorate(Server, {
    connected: observable,
    names: observable
})

function sendAction(a, d) {
    var message = {
        action: a,
        data: d
    };

    socket.json.send(message);
}

const scrumblr = new ScrumblrStore()
const server = new Server()

export default { scrumblr, server }