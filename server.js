HOST = null; // localhost
PORT = 8001;

var fu = require("./fu"),
    sys = require("sys"),
    url = require("url"),
    qs = require("querystring");

var MESSAGE_BACKLOG = 200,
	ACTION_BACKLOG = 200,
    SESSION_TIMEOUT = 60 * 1000;

var channel = new function () {
  var messages = [],
      callbacks = [];

  this.appendMessage = function (nick, type, text) {
    var m = { nick: nick
            , type: type // "msg", "join", "part"
            , text: text
            , timestamp: (new Date()).getTime()
            };

    switch (type) {
      case "msg":
        sys.puts("<" + nick + "> " + text);
        break;
      case "join":
        sys.puts(nick + " join");
        break;
      case "part":
        sys.puts(nick + " part");
        break;
    }

    messages.push( m );

    while (callbacks.length > 0) {
      callbacks.shift().callback([m]);
    }

    while (messages.length > MESSAGE_BACKLOG)
      messages.shift();
  };

  this.query = function (since, callback) {
    var matching = [];
    for (var i = 0; i < messages.length; i++) {
      var message = messages[i];
      if (message.timestamp > since)
        matching.push(message)
    }

    if (matching.length != 0) {
      callback(matching);
    } else {
      callbacks.push({ timestamp: new Date(), callback: callback });
    }
  };

  // clear old callbacks
  // they can hang around for at most 30 seconds.
  setInterval(function () {
    var now = new Date();
    while (callbacks.length > 0 && now - callbacks[0].timestamp > 30*1000) {
      callbacks.shift().callback([]);
    }
  }, 1000);
};

array_difference = function(a, b) {
	// a should always be bigger.
	if (b.length > a.length) {
		var t = b;
		b = a;
		a = t;
	};
	
	var cp = a.slice(0);
	
	for (var i = 0; i < b.length; i++) {
		var el = b[i];
		if (cp.indexOf(el) != -1) {
			var ie = cp.indexOf(el);
			cp.splice(ie, 1);
		}
	}
	return cp;
}

shuffle = function(o) {
	for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
	return o;
};

card_ranks = {
	"2": 2,
	"3": 3,
	"4": 4,
	"5": 5,
	"6": 6,
	"7": 7,
	"8": 8,
	"9": 9,
	"10": 10,
	"J": 11,
	"Q": 12,
	"K": 13,
	"A": 14
}

var game = new function() {
	var actions = [],
		game_callbacks = [];
	
	this.deck = [],
	this.finished_tricks = [],
	this.cards_played = 0,
	this.current_player = null,
	this.current_trick = [],
	this.players = [],
	this.hands = {},
	this.trump = null;
	
	this.dealFive = function() {
		suits = ["h", "d", "s", "c"]
		faces = ["J", "Q", "K", "A"]
		deck = []
		for(rank = 2; rank <= 14; rank++) {
			if (rank > 10) {
				rnk = faces[rank - 11]
			} else {
				rnk = rank
			}
			for(i = 0; i <= 3; i++) {
				suit = suits[i];
				deck.push(rnk + suit)
			}
		}
		this.deck = shuffle(deck);
		this.current_player = this.players[0];
		this.hands[this.players[0]] = this.deck.slice(0, 5)
		this.hands[this.players[1]] = this.deck.slice(5, 10)
		this.hands[this.players[2]] = this.deck.slice(10, 15)
		this.hands[this.players[3]] = this.deck.slice(15, 20)
	}

	this.dealRest = function() {
		var cards_left = this.deck.slice(20, 52);
		this.hands[this.players[0]] = this.hands[this.players[0]].concat(cards_left.slice(0, 8));
		this.hands[this.players[1]] = this.hands[this.players[1]].concat(cards_left.slice(8, 16));
		this.hands[this.players[2]] = this.hands[this.players[2]].concat(cards_left.slice(16, 24));
		this.hands[this.players[3]] = this.hands[this.players[3]].concat(cards_left.slice(24, 32));
	}
	
	this.decideTrick = function(trick) {
		var first_card = trick[0][0];
		var first_crd = first_card.split("");
		var lead_suit = first_crd.pop();
		var winning = [card_ranks[first_crd.join("")], lead_suit, first_card, trick[0][1]];
		for (i in [1, 2, 3]) {
			var i = parseInt(i) + 1;
			var card = trick[i][0];
			var plyr = trick[i][1];
			var crd = card.split("");
			var suit = crd.pop();
			var rank = card_ranks[crd.join("")];
			if (suit == this.trump && winning[1] != this.trump) {
				winning = [rank, suit, card, plyr];
				continue;
			} else if (suit == this.trump && winning[1] == this.trump) {
				if (rank > winning[0]) {
					winning = [rank, suit, card, plyr];
					continue;
				} else {
					continue;
				}
			} else if (suit != this.trump && winning[1] == this.trump) {
				continue;
			} else if (suit != this.trump && winning[1] != this.trump) {
				if (suit != lead_suit) {
					continue;
				} else {
					if (rank > winning[0]) {
						winning = [rank, suit, card, plyr];
						continue;
					} else {
						continue;
					}
				}
			}
		}
		return [winning[2], winning[3]]
	}
	
	this.playCard = function(plyr, card) {
		//TODO: assert that current_player = plyr;
		this.hands[plyr].splice(this.hands[plyr].indexOf(card), 1); // rm card from player hand.
		this.cards_played += 1;
		this.current_trick.push([card, plyr]);
		if (this.current_trick.length == 4) {
			this.finished_tricks.push({"trick": this.current_trick, "winner": this.decideTrick(this.current_trick)});
			this.current_trick = [];
		};
		this.current_player = this.players[(this.players.indexOf(this.current_player) + 1) % 4];
	};
	
	this.appendAction = function (uid, type, content) {
	  var a = { uid: uid
	          , type: type // "deal_five", "deal_rest", "choose_trump", "play_card"
	          , content: content
	          , timestamp: (new Date()).getTime()
	          };
    
	  // TODO: error & sanity checking on the basic game functions.
	  switch (type) {
	    case "join":
		  game.players.push(uid);
	      break;
	    case "deal_five":
		  this.dealFive();
	      break;
		case "choose_trump":
		  this.dealRest();
		  this.trump = content;
		  break;
		case "play_card":
		  this.playCard(uid, content);
		  break;
	    case "part":
		  game.players.splice(game.players.indexOf(uid), 1);
	      break;
	  }
	
	  sys.puts("<" + uid + "> triggered the " + type + " action.");
    
	  actions.push( a );
    
	  while (game_callbacks.length > 0) {
	    game_callbacks.shift().callback([a]);
	  }
    
	  while (actions.length > ACTION_BACKLOG)
	    action.shift();
	};
    
	this.query = function (since, callback) {
	  var matching = [];
	  for (var i = 0; i < actions.length; i++) {
	    var action = actions[i];
	    if (action.timestamp > since)
	      matching.push(action)
	  }

	  if (matching.length != 0) {
	    callback(matching);
	  } else {
	    game_callbacks.push({ timestamp: new Date(), callback: callback });
	  }
	};
    
	// clear old callbacks
	// they can hang around for at most 30 seconds.
	setInterval(function () {
	  var now = new Date();
	  while (game_callbacks.length > 0 && now - game_callbacks[0].timestamp > 30*1000) {
	    game_callbacks.shift().callback([]);
	  }
	}, 1000);
}

var sessions = {};

function createSession (nick) {
  if (nick.length > 50) return null;
  if (/[^\w_\-^!]/.exec(nick)) return null;

  for (var i in sessions) {
    var session = sessions[i];
    if (session && session.nick === nick) return null;
  }

  var session = { 
    nick: nick, 
    id: Math.floor(Math.random()*99999999999).toString(),
    timestamp: new Date(),

    poke: function () {
      session.timestamp = new Date();
    },

    destroy: function () {
      channel.appendMessage(session.nick, "part");
	  game.appendAction(session.id, "part", null);
      delete sessions[session.id];
    }
  };

  sessions[session.id] = session;
  return session;
}

// interval to kill off old sessions
setInterval(function () {
  var now = new Date();
  for (var id in sessions) {
    if (!sessions.hasOwnProperty(id)) continue;
    var session = sessions[id];

    if (now - session.timestamp > SESSION_TIMEOUT) {
      session.destroy();
    }
  }
}, 1000);

fu.listen(PORT, HOST);

fu.get("/", fu.staticHandler("index.html"));
fu.get("/style.css", fu.staticHandler("style.css"));
fu.get("/cards.css", fu.staticHandler("cards.css"));
fu.get("/client.js", fu.staticHandler("client.js"));
fu.get("/cards.js", fu.staticHandler("cards.js"));
fu.get("/jquery-1.4.2.min.js", fu.staticHandler("jquery-1.4.2.min.js"));
fu.get("/jquery-ui.js", fu.staticHandler("jquery-ui.js"));
fu.get("/images/jack.gif", fu.staticHandler("images/jack.gif"));
fu.get("/images/cardback.gif", fu.staticHandler("images/cardback.gif"));
fu.get("/images/king.gif", fu.staticHandler("images/king.gif"));
fu.get("/images/queen.gif", fu.staticHandler("images/queen.gif"));

fu.get("/who", function (req, res) {
  var nicks = [];
  for (var id in sessions) {
    if (!sessions.hasOwnProperty(id)) continue;
    var session = sessions[id];
    nicks.push(session.nick);
  }
  res.simpleJSON(200, { nicks: nicks });
});

fu.get("/join", function (req, res) {
  var nick = qs.parse(url.parse(req.url).query).nick;
  if (nick == null || nick.length == 0) {
    res.simpleJSON(400, {error: "Bad nick."});
    return;
  }
  var session = createSession(nick);
  if (session == null) {
    res.simpleJSON(400, {error: "Nick in use"});
    return;
  }

  //sys.puts("connection: " + nick + "@" + res.connection.remoteAddress);

  channel.appendMessage(session.nick, "join");
  game.appendAction(session.id, "join", null); //TODO: allow reconnects, etc.
  res.simpleJSON(200, { id: session.id, nick: session.nick});
});

fu.get("/part", function (req, res) {
  var id = qs.parse(url.parse(req.url).query).id;
  var session;
  if (id && sessions[id]) {
    session = sessions[id];
    session.destroy();
  }
  res.simpleJSON(200, { });
});

fu.get("/recv", function (req, res) {
  if (!qs.parse(url.parse(req.url).query).since) {
    res.simpleJSON(400, { error: "Must supply since parameter" });
    return;
  }
  var id = qs.parse(url.parse(req.url).query).id;
  var session;
  if (id && sessions[id]) {
    session = sessions[id];
    session.poke();
  }

  var since = parseInt(qs.parse(url.parse(req.url).query).since, 10);

  channel.query(since, function (messages) {
    if (session) session.poke();
    res.simpleJSON(200, { messages: messages });
  });

  game.query(since, function (actions) {
    if (session) session.poke();
    res.simpleJSON(200, { actions: actions, game: game });
  });

  
});

fu.get("/send", function (req, res) {
  var id = qs.parse(url.parse(req.url).query).id;
  var text = qs.parse(url.parse(req.url).query).text;

  var session = sessions[id];
  if (!session || !text) {
    res.simpleJSON(400, { error: "No such session id" });
    return; 
  }

  session.poke();

  channel.appendMessage(session.nick, "msg", text);
  res.simpleJSON(200, {});
});

fu.get("/act", function (req, res) {
  var uid = qs.parse(url.parse(req.url).query).uid;
  var type = qs.parse(url.parse(req.url).query).type;
  var content = qs.parse(url.parse(req.url).query).content;
  sys.puts(type);

  var session = sessions[uid];
  if (!session || !type) {
    res.simpleJSON(400, { error: "No such session id" });
    return; 
  }

  session.poke();

  game.appendAction(uid, type, content);
  res.simpleJSON(200, {});
});
