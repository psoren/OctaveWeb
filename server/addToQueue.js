const Room = require('../models/room');

module.exports = (app) => {
    app.post('/addToQueue', (req, res) => {
        //The type of request (song, playlist, songs)
        let type = req.body.type;

        //The data to be added
        let data = req.body.data;

        //Find the room and update it
        Room.findById(req.body.roomId, (err, room) => {
            if (err) {
                console.error(err);
                console.error('(addToQueue) Could not find the room.');
            }
            if (room) {
                if (type === 'song') {
                    if (room.currentSong.spotifyURI === data.spotifyURI) {
                        res.json({
                            success: false,
                            message: 'A song can only be added once'
                        });
                    }
                    else {
                        let songAlreadyAdded = false;
                        room.upcomingSongs.forEach(song => {
                            if (song.spotifyURI === data.spotifyURI) {
                                songAlreadyAdded = true;
                            }
                        });
                        if (songAlreadyAdded) {
                            res.json({
                                success: false,
                                message: 'A song can only be added once'
                            });
                        }
                        else {
                            room.upcomingSongs.push(data);
                            room.save((err, room) => {
                                if (err) {
                                    console.error('(addToQueue) saving room');
                                    console.error(err);
                                }
                                else {
                                    if (room) {
                                        res.json({
                                            success: true,
                                            nextSongs: room.upcomingSongs
                                        });
                                    }
                                } 
                            });
                        }

                    }
                }

                //The songs part is different from the playlist part because with songs
                //we are not replacing the upcomings songs
                else if (type === 'songs') {

                    let songs = [];
                    data.forEach(songObject => {
                        /*
                        Currently, the songs we are getting from the client are saved in the form
                         * { title, artist, album, imgSrc, uri}
                        They need to be in the form
                         * {name, artist, album, spotifyURI, albumArtSrc}
                         */
                        let newSong = {
                            name: songObject.props.title,
                            artist: songObject.props.artist,
                            album: songObject.props.album,
                            spotifyURI: songObject.props.uri,
                            albumArtSrc: songObject.props.imgSrc
                        }
                        songs.push(newSong);
                    });
                    room.upcomingSongs = room.upcomingSongs.concat(songs);
                    room.save((err, room) => {
                        if (err) {
                            console.error('(addToQueue) playlistSaveError: ' + err);
                            res.json({
                                success: false,
                                message: 'Sorry, we could not add play that playlist'
                            });
                        }
                        if (room) {
                            res.json({
                                success: true,
                                nextSongs: room.upcomingSongs,
                                message: ''
                            });
                        }
                    });
                }
                //Replace all songs with the playlist
                else if (type === 'playlist') {
                    let playlistSongs = [];
                    data.forEach(songObject => {
                        /*
                        Currently, the songs we are getting from the client are saved in the form
                         * { title, artist, album, imgSrc, uri}
                        They need to be in the form
                         * {name, artist, album, spotifyURI, albumArtSrc}
                         */
                        let newSong = {
                            name: songObject.props.title,
                            artist: songObject.props.artist,
                            album: songObject.props.album,
                            spotifyURI: songObject.props.uri,
                            albumArtSrc: songObject.props.imgSrc
                        }
                        playlistSongs.push(newSong);
                    });
                    room.upcomingSongs = playlistSongs;
                    room.save((err, room) => {
                        if (err) {
                            console.error('(addToQueue) playlistSaveError: ' + err);
                            res.json({
                                success: false,
                                message: 'Sorry, we could not add play that playlist'
                            });
                        }
                        if (room) {
                            res.json({
                                success: true,
                                nextSongs: room.upcomingSongs
                            });
                        }
                    });
                }
                //They did not specify the correct type, send an error
                else {
                    res.json({
                        success: false,
                        message: 'Not the correct data type'
                    });
                }
            }
        });
    });
}