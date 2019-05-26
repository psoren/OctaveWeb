let fetch = require('node-fetch');
const Room = require('../models/room');

module.exports = (app) => {
    app.post('/getCreatorPlayback', async (req, res, next) => {

        //1. Find the room
        Room.findById(req.body.roomId, async (err, room) => {
            if (err) { console.log('(getCreatorPlayback) Error finding room'); }
            else {
                //2. Get the creator playback informatoin
                let creatorInfoRes = await fetch('https://api.spotify.com/v1/me/player', {
                    headers: { 'Authorization': 'Bearer ' + room.creator.accessToken }
                });
                if (creatorInfoRes.status === 200) {
                    let creatorInfoResJSON = await creatorInfoRes.json();
                    let currentSong = creatorInfoResJSON.item.uri;
                    let currentPosition = creatorInfoResJSON.progress_ms;
                    let isPlaying = creatorInfoResJSON.is_playing;

                    //2. Return that information to the listener
                    //Need to return:
                    // currentSong is the spotifyURI of the creators current song
                    // currentPosition is the current position of the creator in the track
                    // isPlaying is whether or not the creator is playing a song
                    res.json({
                        success: true,
                        currentSong: currentSong,
                        currentPosition: currentPosition,
                        isPlaying: isPlaying
                    });
                }
                else {
                    console.log('(getCreatorPlayback) There was an issue when getting playback');
                    res.json({ success: false });
                }
            }
        });
    });
}