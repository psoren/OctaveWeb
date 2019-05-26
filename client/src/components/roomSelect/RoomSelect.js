import React from 'react';
import ScreenTop from './screenTop/ScreenTop';
import ScreenBottom from './screenBottom/ScreenBottom';
import updateTokens from './functions/updateTokens.js';
import querystring from 'querystring';

const main = {
	display: 'flex',
	flexDirection: 'column'
}

export default class extends React.Component {
	//Note: all of the script stuff is getting attached to the window
	appendScript = async () => {
		//If this is the first time the user is logging in
		if (!localStorage.getItem('accessToken') ||
			!localStorage.getItem('refreshToken') ||
			!localStorage.getItem('name')) {
			let currentURL = new URL(window.location.href);
			let code = currentURL.searchParams.get('code');
			let state = currentURL.searchParams.get('state');
			if (code == null) {
				console.log('code is null');
			}
			if (state == null) {
				console.log('state is null');
			}
			let res = await fetch('/sendInitdata', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					code: code,
					state: state
				})
			});

			//Something was wrong with the auth code
			if (res.statusCode === 400) {
				console.log('something was wrong with the auth code')
			}

			let resJSON = await res.json();
			let { accessToken, refreshToken } = resJSON;
			localStorage.setItem('accessToken', accessToken);
			localStorage.setItem('refreshToken', refreshToken);

			const script = document.createElement("script");
			document.head.appendChild(script);
			script.src = "https://sdk.scdn.co/spotify-player.js";
			script.onload = this.createPlayer();
		}
		else {
			const script = document.createElement("script");
			document.head.appendChild(script);
			script.src = "https://sdk.scdn.co/spotify-player.js";
			script.onload = this.createPlayer();
		}
	}

	createPlayer = () => {
		window.onSpotifyWebPlaybackSDKReady = () => {

			console.log('sdk is ready');

			this.player = new window.Spotify.Player({
				name: 'Syncify',
				getOAuthToken: cb => { cb(localStorage.getItem('accessToken')) }
			});

			this.player.connect();
			this.createErrorHandlers();
			this.createReadyHandler();
			this.createStateChangeHandler();
			this.props.setWebPlayer(this.player);
		}
	}

	createErrorHandlers = () => {
		this.player.on('initialization_error', e => console.error(e));
		this.player.on('authentication_error', e => console.error(e));
		this.player.on('account_error', e => console.error(e));
		this.player.on('playback_error', e => console.error(e));
	}

	createReadyHandler = () => {
		this.player.on('ready', data => {
			this.setState({ deviceID: data.device_id });
			this.transferPlaybackToBrowser();
		});
	}

	createStateChangeHandler = () => {
		this.player.on('player_state_changed', state => {
			//If the user is not currently playing music
			if (!state) {
				this.setState({ playing: false });
			}
			else {
				let songArtists = '';
				state.track_window.current_track.artists.forEach((artist, i) => {
					i === 0 ? songArtists += artist.name :
						songArtists += ', ' + artist.name;
				});

				this.setState({
					playing: true,
					paused: state.paused,
					songName: state.track_window.current_track.name,
					songArtists: songArtists,
					albumArt: state.track_window.current_track.album.images[0].url
				});
			}
		});
	}

	transferPlaybackToBrowser = async () => {

		console.log('transferPlaybackToBrowser called');

		//Get the user's name
		let userInfoRes = await fetch('https://api.spotify.com/v1/me', {
			headers: { 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }
		});
		let userInfoResJSON = await userInfoRes.json();
		localStorage.setItem('name', userInfoResJSON.display_name);

		//Play the most recent song
		let recentURI = '';
		let recentSongsRes = await fetch('https://api.spotify.com/v1/me/player/recently-played', {
			headers: { 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }
		});
		let recentSongsResJSON = await recentSongsRes.json();
		if (recentSongsResJSON.items &&
			recentSongsResJSON.items.length > 0) {
			recentURI = recentSongsResJSON.items[0].track.uri;
		}
		else {
			//Play SOS by Avicii if the user has no recent songs
			recentURI = 'spotify:track:6nDKrPlXdpomGBgAlO7UdP';
		}

		//Play the most recent song
		let params = querystring.stringify({ device_id: this.state.deviceID });
		//Play the most recent song

		console.log('about to play the most recent song');

		let playRecentSongRes = await fetch('https://api.spotify.com/v1/me/player/play?' + params, {
			method: 'PUT',
			headers: { 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') },
			body: JSON.stringify({ uris: [recentURI] })
		});
		if (playRecentSongRes.status !== 204) {
			console.error('There was an error playing the most recent song');
		}
		else {
			console.log('most recent song should be playing');
		}


	}

	constructor(props) {
		super(props);
		updateTokens();
		this.state = {
			loading: true,
			currentRooms: []
		};
		this.playerCheckInterval = null;
	}

	componentDidMount() {

		//Create method to update token every 15 minutes
		let refreshInterval = 1000 * 20;
		this.refreshTokenIntervalId = setInterval(updateTokens, refreshInterval);

		//Check for current rooms every tenth of a second
		let checkForRoomInterval = 100;
		this.checkForRoomIntervalId = setInterval(this.checkForRooms, checkForRoomInterval);

		//If we previously created a player, we do not need to create a new one
		if (this.props.appPlayer) {
			this.player = this.props.appPlayer;

			//Set the state
			this.player.getCurrentState().then(state => {
				if (!state) { this.setState({ playing: false }); }
				else {
					let { current_track } = state.track_window;

					let songArtists = '';
					current_track.artists.forEach((artist, i) => {
						i === 0 ? songArtists += artist.name :
							songArtists += ', ' + artist.name;
					});

					this.setState({
						playing: true,
						songName: current_track.name,
						songArtists: songArtists,
						albumArt: current_track.album.images[0].url,
						paused: false,
						loading: false
					});
				}
			});
		}
		//Create the new player
		else {
			this.setState({ loading: true });
			this.appendScript();
			this.setState({ loading: false });
		}
	}

	checkForRooms = async () => {
		let currentRoomsRes = await fetch('/getRooms');
		let currentRoomsResJSON = await currentRoomsRes.json();
		this.setState({ currentRooms: currentRoomsResJSON });
	}

	componentWillUnmount = () => {
		clearInterval(this.refreshTokenIntervalId);
		clearInterval(this.checkForRoomIntervalId);
		if (this.player) {
			this.player.removeListener('player_state_changed');
		}
	}

	render() {
		if (this.state.loading) {
			return (
				<div style={main}>
					<ScreenTop />
					<ScreenBottom />
				</div>
			);
		}
		else {
			return (
				<div style={main}>
					<ScreenTop
						playing={this.state.playing}
						songName={this.state.songName}
						songArtists={this.state.songArtists}
						albumArt={this.state.albumArt}
						paused={this.state.paused}
					/>
					<ScreenBottom
						currentRooms={this.state.currentRooms}
					/>
				</div>
			);
		}
	}
}