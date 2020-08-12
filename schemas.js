const mongoose = require('mongoose')

const gameSchema = mongoose.Schema({
    deck: {
        type: Object,
        required: true
    },
    stack: {
        type: Array,
        required: true
    },
    hands: {
        type: Object,
        required: true
    },
    ups: {
        type: Object,
        required: true
    },
    downs: {
        type: Object,
        required: true
    },
    turn: {
        type: String,
        required: true
    },
    stage: {
        type: Object,
        required: true
    },
    winner: {
        type: String,
        required: false
    }
})

module.exports = mongoose.model('Game', gameSchema)
