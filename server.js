const express = require('express')
const cors = require('cors')
const axios = require('axios')

const app = express()
const PORT = 3000

app.use(cors())
app.use(express.json())

const errorHandler = (error) => {
    console.error('Ошибка при запросе к API:', error.message)
    if (error.response) {
        return res.status(error.response.status).json({
            error: 'Ошибка от API',
            details: error.response.data,
        })
    }
    return res.status(500).json({error: 'Не удалось подключиться к API'})
}

app.get('/api/tournaments', async (req, res) => {
    const {token} = req.query
    if (!token) {
        return res.status(400).json({error: 'Токен не предоставлен'})
    }
    const setData = (item) => ({
        id: item.id,
        name: item.name,
        location: item.locationName,
        ended: item.ended,
        players: item.checkedInPlayers,
        numTickets: item.numTickets,
        gameSystemName: item.gameSystemName,
        numberOfRounds: item.numberOfRounds,
        owner: `${item.ownerFirstName} ${item.ownerLastName}`,
        eventDate: item.eventDate,
        eventEndDate: item.eventEndDate,
        currentRound: item.currentRound
    })
    try {
        const response = await axios.get(
            'https://newprod-api.bestcoastpairings.com/v1/events?limit=100&playerEvents=true',
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'client-id': 'web-app'
                }
            }
        )
        const tournaments = response.data.data.map(setData)
        return res.json(tournaments)
    } catch (error) {
        errorHandler(error)
    }
})

app.get('/api/lists', async (req, res) => {
    const {id, token} = req.query
    if (!token) {
        return res.status(400).json({error: 'Токен не предоставлен'})
    }

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

    const getListId = (player) => player.listId

    const setData = (item) => ({
        name: `${item.user.lastName} ${item.user.firstName}`,
        faction: item.army?.name,
        list: item.armyListText
    })

    try {
        const response = await axios.get(
            `https://newprod-api.bestcoastpairings.com/v1/players?limit=100&eventId=${id}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'client-id': 'web-app'
                }
            }
        )
        const listIds = response.data.data
            .map(getListId)
            .filter(listId => listId)
        await delay(3000)
        const rosters = []
        for (const listId of listIds) {
            try {
                const roster = await axios.get(`https://newprod-api.bestcoastpairings.com/v1/armylists/${listId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'client-id': 'web-app'
                    }
                })
                rosters.push(setData(roster.data))
            } catch (error) {
                console.error(`Ошибка при загрузке listId ${listId}:`, error.message);
            }
            await delay(3000)
        }
        return res.json(rosters)
    } catch (error) {
        errorHandler(error)
    }
})

app.get('/api/round', async (req, res) => {
    const {token, tournamentId, round} = req.query
    if (!token) {
        return res.status(400).json({ error: 'Токен не предоставлен' })
    }
    const setPairing = (item) => ({
        id: item.id,
        table: item.table,
        firstPlayer: `${item.player1?.user?.lastName} ${item.player1?.user?.firstName}`,
        firstPlayerFaction: item.player1?.faction,
        firstPlayerPoints: item.player1Game?.points || 0,
        secondPlayer: `${item.player2?.user?.lastName} ${item.player2?.user?.firstName}`,
        secondPlayerFaction: item.player2?.faction,
        secondPlayerPoints: item.player2Game?.points || 0,
    })
    try {
        const response = await axios.get(
            `https://newprod-api.bestcoastpairings.com/v1/events/${tournamentId}/pairings?eventId=${tournamentId}&round=${round}&pairingType=Pairing`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'client-id': 'web-app'
                }
            }
        )
        const pairings = response.data.active.map(setPairing)
        return res.json(pairings)
    } catch (error) {
        errorHandler(error)
    }
})

app.listen(PORT, () => {
  console.log(`✅ Прокси-сервер запущен на http://localhost:${PORT}`)
})