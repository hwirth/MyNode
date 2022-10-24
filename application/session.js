// session.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// SPIELWIESE - copy(l)eft 2022 - https://spielwiese.centra-dogma.at
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

const { DEBUG, COLORS, color_log } = require( '../server/debug.js' );
const { REASONS                  } = require( './constants.js' );


module.exports = function SessionHandler (persistent_data) {
	const self = this;


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// PROTOCOL DEFINITION
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// HELPERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function log_persistent_data () {
		if (DEBUG.PROTOCOLS_PERSISTENT_DATA) color_log(
			COLORS.PROTOCOL,
			'<session>',
			'persistent_data:',
			persistent_data
		);

	} // log_persistent_data


	function respond_success (client, command, reason, status = true) {
		client.send({
			session: {
				[command]: {
					success   : status,
					reason    : reason,
				},
			},
		});

	} // respond_success


	function respond_failure (client, command, reason) {
		respond_success( client, command, reason, false );

	} // respond_failure


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// COMMAND HANDLERS
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/


	this.requestHandlers = {};

	this.requestHandlers.login = function (client, parameters) {
		color_log(
			COLORS.PROTOCOL,
			'<session.login>',
			'client:',
			client,
		);


		if (client.login) {
			respond_failure( client, 'login', 'Already logged in' );
			return;
		}

		if (! parameters.username) {
			respond_failure( client, 'login', 'username undefined' );
			return;
		}

		if (! parameters.password) {
			respond_failure( client, 'login', 'password undefined' );
			return;
		}

		const user_record = persistent_data.session.accounts[ parameters.username ];

		if (! user_record) {
			respond_failure( client, 'login', 'User "' + parameters.username + '" unknown' );

		} else {
			const password_correct = (user_record.password === parameters.password);

			if (password_correct) {
				client.login = {
					userName : parameters.username,
					groups   : (user_record.groups) ? user_record.groups : [],
				};
				respond_success( client, 'login', 'Login succeeded' );

			} else {
				respond_failure( client, 'login', 'Login failed' );
			}
		}

	}; // login


	this.requestHandlers.logout = function (client, parameters) {
		if (client.login) {
			client.login = false;
			respond_success( client, 'logout', 'Logged out' );
		} else {
			respond_failure( client, 'logout', 'Not logged in' );
		}

	}; // logout


	function find_client_by_username (username) {
		const client_address = Object.keys( persistent_data.session.clients ).find( (address)=>{
			const client = persistent_data.session.clients[ address ];
			return (client.login && (client.login.userName == username));
		});
		return (client_address) ? persistent_data.session.clients[ client_address ] : null;

	} // find_client_by_username


	this.requestHandlers.kick = function (client, parameters) {
		if (! client.inGroup( 'admin' )) {
			respond_failure( client, 'kick', REASONS.INSUFFICIENT_PERMS );
			return;
		}

		let target_client = null;
		if (parameters.address) {
			target_client = persistent_data.session.clients[ parameters.address ];
		}
		else if (parameters.username) {
			//const client = find_client_by_username( parameters.username );
			/*
			const client_address = Object.keys( persistent_data.session.clients ).find( (key)=>{
				const client = persistent_data.session.clients[ key ];
				return (client.login && (client.login.userName == parameters.username));
			});
			if (client_address) target_client = persistent_data.session.clients[ client_address ];
			*/
			target_client = find_client_by_username( parameters.username );
		}

		if (! target_client) {
			if (parameters.address) {
				respond_failure( client, 'kick', REASONS.INVALID_ADDRESS );
			}
			else if (parameters.username) {
				respond_failure( client, 'kick', REASONS.INVALID_USERNAME );
			}
			else {
				respond_failure( client, 'kick', REASONS.INVALID_ADDRESS_OR_USERNAME );
			}
			return;
		}

		if (DEBUG.PROTOCOLS_PERSISTENT_DATA) color_log(
			COLORS.SESSION,
			'<session.kick>',
			'Terminating connection to ',
			target_client,
		);

		target_client.send({
			session: {
				status: {
					connection : 'terminating',
					reason     : REASONS.KICKED_BY + client.login.userName,
				},
			},
		});

		//... This timeout should not be neccessary, but apparently is;
		//... Without it, the previous message may not arrive at the client.
		setTimeout( ()=>{
			target_client.closeSocket();
		}, 1000);

		target_client.login = false;

	}; // kick


	this.requestHandlers.status = function (client, parameters) {
		if (parameters.persistent && client.login) {
			if (client.inGroup('admin')) {
				client.send({
					session: {   //... Move to a debug protocol
						status: {
							persistent: persistent_data,
						},
					},
				});
			} else {
				//respond_failure( client, 'status.persistent', REASONS.INSUFFICIENT_PERMS );
				client.send({
					session: {
						status: {
							persistent: {
								success : false,
								reason  : REASONS.INSUFFICIENT_PERMS,
							},
						},
					},
				});
			}
		} else {
			//respond_failure( client, 'status', REASONS.INSUFFICIENT_PERMS );
			client.send({
				session: {
					status: {
						client: client,
					},
				},
			});
		}

	}; // status


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// CONSTRUCTOR
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	function load_data () {
		color_log( COLORS.SESSION, 'SessionHandler', 'save_data' );

		return {
			accounts: {
				hmw: {
					password: 'pass1',
					groups: [
						'admin',
					],
				},
				sec: {
					password: 'pass2',
				},
			}, // accounts
			clients: {
			}, // clients
		};

	} // load_data


	function save_data () {
		color_log( COLORS.SESSION, 'SessionHandler', 'save_data' );

	} // save_data


	function init () {
		if (DEBUG.TRACE_INIT) color_log( COLORS.TRACE_INIT, 'SessionHandler.init' );

		if (persistent_data.session === null) {
			// "Load from database"
			persistent_data.session = load_data();
		 /*
			const data = load_data();
			Object.keys( data ).forEach( (key)=>{
				persistent_data.session[key] = data[key];
			});
		*/

		}

		return Promise.resolve();

	}; // init


	// Initialize the object asynchronously
	// Makes sure, a reference to this instance is returned to  const protocol = await new Protocol();
	init().then( ()=>self );

}; // SessionHandler


//EOF
