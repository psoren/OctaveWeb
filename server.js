require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const morgan = require('morgan');
let mongoose = require('mongoose');

const mongoURI = 'mongodb+srv://parker:SyncifyTesting9@cluster0-qrjhy.mongodb.net/test?retryWrites=true';
mongoose.connect(mongoURI, { useNewUrlParser: true });

const port = process.env.PORT || 5000;
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//logging
//app.use(morgan("tiny"));

//Custom middleware
require('./server/joinRoom.js')(app, io);
require('./server/socketio/setup')(io);
require('./server/socketio/nextSong.js')(io);
require('./server/socketio/previousSong.js')(io);
require('./server/socketio/togglePlayback.js')(io);
require('./server/socketio/toggleShuffle.js')(io);
require('./server/socketio/changeRoomName.js')(io);
require('./server/socketio/leaveRoom.js')(io);
require('./server/socketio/storeDate.js')(io);
require('./server/getRooms')(app);
require('./server/updateTokens')(app);
require('./server/sendInitData')(app);
require('./server/createRoom')(app);
require('./server/addToQueue')(app);
require('./server/getCreatorId')(app);
require('./server/getCreatorPlayback')(app);
require('./server/getPlaybackInfo')(app);
require('./server/updateCreatorAccessToken')(app);
require('./server/checkRoomsForDeletion')(app);
require('./server/checkForRoom')(app);

//Production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(__dirname + 'client/build'));
    app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'client/build/index.html')));
}
//Development
else {
    app.use(express.static(__dirname + 'client/public'));
    app.get('*', (req, res) => res.sendFile(path.join(__dirname, '/client/public/index.html')));
}

server.listen(port, () => console.log(`Listening on port ${port}`));