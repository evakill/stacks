var express = require('express')
var app = express()
const path = require('path')
var server = require('http').createServer(app)
var io = require('socket.io')(server)
const port = process.env.PORT || 4001
const mongoose = require('mongoose')
const Game = require('./schemas.js')

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })

mongoose.connection.on('connected', () => {
    console.log('Connected to MongoDb!')
})

app.use(express.static(path.join(__dirname, 'client/build')))
app.use('/:id', express.static(path.join(__dirname, 'client/build')))

function shuffle(deck) {
    for (let i in deck) {
        i = deck.length - i - 1
        const j = Math.floor(Math.random() * i)
        const temp = deck[i]
        deck[i] = deck[j]
        deck[j] = temp
    }
    return deck
}

function newDeck() {
    const suits = ['S', 'D', 'C', 'H']
    const faces = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K']
    const deck = []
    for (const i in suits) {
        for (const j in faces) {
            deck.push({
                suit: suits[i],
                face: faces[j]
            })
        }
    }
    return deck
}

io.on('connection', async (socket) => {
    console.log('Connected')

    socket.on('start-game', async () => {
        let deck = newDeck()
        deck = shuffle(deck)
        deck.splice(0, 30)
        game = new Game({
            hands: {
                A: deck.splice(0, 6),
                B: deck.splice(0, 6)
            },
            downs: {
                A: deck.splice(0, 3),
                B: deck.splice(0, 3)
            },
            ups: {
                A: [],
                B: []
            },
            turn: 'A',
            deck,
            stage: {
                A: 1,
                B: 1
            }
        })
        game = await game.save()
        socket.emit('new-game', { player: 'A', game })
    })

    socket.on('find-game', async (id) => {
        const game = await Game.findById(id)
        await game.save()
        this.game = game
        socket.emit('join-game', game)
    })

    socket.on('end-turn', async game => {
        this.game = await Game.findByIdAndUpdate(game._id, game, { new: true })
    })

    setInterval(async () => {
        if (this.game) {
            socket.emit('state', this.game)
        }
    }, 2000)


})

server.listen(port, () => {
    console.log(`Listening on ${port}`)
})
