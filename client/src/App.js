import React, { useState, useEffect, useCallback } from 'react'
import './App.css'
import { Card, Table } from 'react-casino'

const io = require('socket.io-client')
const socket = io()

const smallCard = { height: 120, width: 'auto' }
const handCard = { height: 140, width: 'auto'}
const stackCard = {
    height: 180,
    width: 'auto',
    marginLeft: -100,
    boxShadow: '2px 2px 6px black',
    borderRadius: 8,
    cursor: 'pointer'
}

function App() {
    let [idx] = window.location.pathname.split('/').splice(1)
    const [id, setId] = useState(idx)
    const [player, setPlayer] = useState(localStorage.getItem('player'))
    let [game, setGame] = useState()

    const [, updateState] = useState()
    const update = useCallback(() => updateState({}), [])

    socket.on('new-game', ({ game, player }) => {
        setPlayer(player)
        localStorage.setItem('player', player)
        window.location.assign(`/${game._id}`)
    })

    useEffect(() => {
        if (!player) setPlayer('B')
        socket.emit('find-game', id)
    }, [id])

    socket.on('join-game', game => {
        setGame(game)
    })

    socket.on('state', newGame => {
        if (game && (game.winner || game.turn !== newGame.turn || game.stack.length !== newGame.stack.length)) {
            game = newGame
            setGame(newGame)
        }
    })

    const magic = ['2', '7', '8', 'T']

    function getValue(card) {
        console.log('v', card)
        const { face } = card
        let value = Number(face)
        if (face === 'J') {
            value = 11
        }
        if (face === 'Q') {
            value = 12
        }
        if (face === 'K') {
            value = 13
        }
        if (face === 'A') {
            value = 14
        }
        if (magic.indexOf(face) !== -1) {
            value = 15
        }
        return value
    }

    function verifyPlay(card, topCard) {
        if (!topCard) {
            return true
        }
        if (magic.indexOf(topCard.face) === -1) {
            return getValue(card) >= getValue(topCard)
        }
        if (topCard.face === '2') {
            return true
        }
        if (topCard.face === '7') {
            return getValue(card) === 15 || getValue(card) <= 7
        }
        if (topCard.face == '8') {
            if (game.stack && (game.stack.length === 1 || game.stack.length === 0)) return true
            return verifyPlay(card, game.stack[game.stack.indexOf(topCard) + 1])
        }
    }

    function cardSelect(card) {
        if (game.turn !== player) return
        if (game.stage[player] === 1) {
            game.hands[player] = game.hands[player].filter(c => !(c.suit === card.suit && c.face === card.face))
            game.ups[player].push(card)
            setGame(game)
            update()
            if (game.ups[player].length === 3) {
                game.turn = (player === 'A' ? 'B' : 'A')
                game.stage[player] = 2
                socket.emit('end-turn', game)
            }
            return
        }
        if (game.stage[player] === 2 && verifyPlay(card, game.stack[0])) {
            game.hands[player] = game.hands[player].filter(c => {
                if (c.face === card.face) {
                    if (c.suit === card.suit) {
                        game.stack.unshift(card)
                        console.log(1)
                        return false
                    }
                    const result = window.confirm(`Play your ${c.face} of ${c.suit}?`)
                    if (result) {
                        game.stack.unshift(c)
                        console.log(2)

                        return false
                    }
                    return true
                }
                return true
            })

            while (game.deck.length && game.hands[player].length < 3) {
                game.hands[player] = game.hands[player].concat(game.deck.pop())
            }
            if (!game.deck.length && !game.hands[player].length) {
                game.stage[player] = game.ups[player].length ? 3 : game.downs[player].length ? 4 : 5
                if (game.stage[player] === 5) {
                    setTimeout(() => win(), 1000)
                }
            }
            game.turn = (player === 'A' ? 'B' : 'A')
            if (card.face === 'T') {
                game.turn = player
                setTimeout(() => clearStack(), 1000)
            }
            setGame(game)
            update()
            socket.emit('end-turn', game)
            return
        }
        if (game.stage[player] === 3 && verifyPlay(card, game.stack[0])) {
            game.ups[player] = game.ups[player].filter(c => {
                if (c.face === card.face) {
                    if (c.suit === card.suit) {
                        game.stack.unshift(card)
                        return false
                    }
                    const result = window.confirm(`Play your ${c.face} of ${c.suit}?`)
                    if (result) {
                        console.log('doing this')
                        game.stack.unshift(c)
                        return false
                    }
                    return true
                }
                return true
            })
            if (!game.ups[player].length) {
                game.stage[player] = 4
            }
            game.turn = (player === 'A' ? 'B' : 'A')
            if (card.face === 'T') {
                game.turn = player
                setTimeout(() => clearStack(), 1000)
            }
            setGame(game)
            update()
            socket.emit('end-turn', game)
            return
        }
        if (game.stage[player] === 4) {
            game.downs[player] = game.downs[player].filter(c => !(c.face === card.face && c.suit === card.suit))
            const topCard = game.stack[0]
            game.stack.unshift(card)
            setGame(game)
            update()
            socket.emit('end-turn', game)
            game.turn = (player === 'A' ? 'B' : 'A')
            if (!verifyPlay(card, topCard)) {
                setTimeout(() => drawStack(), 1000)
            } else if (!game.hands[player].length && !game.downs[player].length) {
                setTimeout(() => win(), 1000)
            } else if (card.face === 'T') {
                game.turn = player
                setTimeout(() => clearStack(), 1000)
            }
            setGame(game)
            update()
            socket.emit('end-turn', game)
        }
    }

    function drawStack() {
        game.hands[player] = game.hands[player].concat(game.stack)
        game.stack = []
        game.stage[player] = 2
        game.turn = (player === 'A' ? 'B' : 'A')
        setGame(game)
        update()
        socket.emit('end-turn', game)
    }

    function clearStack() {
        game.stack = []
        setGame(game)
        update()
        socket.emit('end-turn', game)
    }

    function win() {
        game.winner = player
        setGame(game)
        update()
        socket.emit('end-turn', game)
    }

    if (!game) {
        return (
            <div className="App">
                <Table>
                    <button
                        className="start-button"
                        onClick={() => socket.emit('start-game')}
                    >
                        Start Game?
                    </button>
                </Table>
            </div>
        )
    }

    if (game.winner) {
        localStorage.removeItem('player')
        return (
            <div className="App">
                <Table>
                    <h1> Player {game.winner} wins!!! </h1>
                    <button
                        className="start-button"
                        onClick={() => window.location.assign('/')}
                    >
                        Restart
                    </button>
                </Table>
            </div>
        )
    }

    return (
        <div className="App">
            <Table>
                <div className="info-box">
                    {game.turn !== player ? 'Waiting for player...' : 'Your turn!'}
                </div>
                <div className="downB">
                    {game.downs && game.downs[`${player === 'A' ? 'B' : 'A' }`].map(card => <Card style={smallCard}/>)}
                </div>
                <div className="upB">
                    {game.ups && game.ups[`${player === 'A' ? 'B' : 'A' }`].map(card => (
                        <Card
                            style={smallCard}
                            face={card.face}
                            suit={card.suit}
                        />
                    ))}
                </div>
                <div className="deck">
                    <Card style={stackCard}/>
                    { Boolean(game.stack && game.stack.length) &&
                        <>
                            {
                                game.stack.slice(0, Math.min(4, game.stack.length)).reverse().map(card => (
                                    <Card
                                        face={card.face}
                                        suit={card.suit}
                                        style={stackCard}
                                        onClick={() => drawStack()}
                                    />
                                ))
                            }
                        </>

                    }
                </div>

                {game.stage[player] < 3 ? (
                    <>
                        <div className="downA">
                            {game.downs && game.downs[player].map(card => <Card style={smallCard}/>)}
                        </div>
                        <div className="upA">
                            {game.ups && game.ups[player].map(card => (
                                <Card
                                    style={smallCard}
                                    face={card.face}
                                    suit={card.suit}
                                    onClick={(e, card) => cardSelect(card)}
                                />
                            ))}
                        </div>
                        <div className="hand">
                            {game.hands[player].map(card => (
                                <Card
                                    style={handCard}
                                    face={card.face}
                                    suit={card.suit}
                                    onClick={(e, card) => cardSelect(card)}
                                />
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="downA3">
                            {game.downs && game.downs[player].map((card, i) => (
                                <Card
                                    style={handCard}
                                    onClick={() => cardSelect(game.downs[player][i])}
                                />
                            ))}
                        </div>
                        <div className="upA3">
                            {game.ups && game.ups[player].map(card => (
                                <Card
                                    style={handCard}
                                    face={card.face}
                                    suit={card.suit}
                                    onClick={(e, card) => cardSelect(card)}
                                />
                            ))}
                        </div>
                    </>
                )}

            </Table>
        </div>
    );
}

export default App;
