var events = require('events'),
	util = require('util'),
	slice = [].slice;

function bind(f, to) {
	if (!f) console.log("No function", f);
	return function () {
		return f.apply(to, arguments);
	};
}

function stop(cache) {
	if (cache.timer) {
		clearTimeout(cache.timer);
		cache.timer = false;
	}
}

function start(cache) {
	if (cache.options.interval > 0) {
		cache.timer = setTimeout(cache.clean, cache.options.interval * 1000);
		if (cache.options.unrefTimers && cache.timer.unref) {
			cache.timer.unref();
		}
	}
}

function fetch(cache, key) {
	var ttl = cache.ttls[key],
		now = ttl ? +(new Date) : 0;

	if (ttl && ttl < now) {
		cache.stats.keys--;
		delete cache.data[key];
		delete cache.ttls[key];
		cache.emit("expire", key);
		return;
	}

	return cache.data[key];
}


function Cache(options) {
	if (!(this instanceof Cache)) {
		return new Cache(options);
	}

	this.get = bind(this.get, this);
	this.mget = bind(this.mget, this);
	this.set = bind(this.set, this);
	this.del = bind(this.del, this);
	this.ttl = bind(this.ttl, this);
	this.flush = bind(this.flush, this);
	this.clean = bind(this.clean, this);

	this.timer = false;
	this.data = {};
	this.ttls = {};

	this.options = {
		ttl: 300,     			// Default TTL 5 minutes.
		interval: 60, 			// Clean every minute.
		unrefTimers: false	// Call .unref() on timer objects
	};

	if (options) {
		if (options.ttl) this.options.ttl = options.ttl;
		if (options.interval) this.options.interval = options.interval;
		if (options.unrefTimers) this.options.unrefTimers = options.unrefTimers;
	}

	this.stats = {
		hits: 0,
		misses: 0,
		keys: 0
	};

	start(this);
}

util.inherits(Cache, events.EventEmitter);


Cache.prototype.get = function (key) {
	var v = fetch(this, key);

	if ('undefined' !== typeof v) {
		this.stats.hits++;
		return v;
	}

	this.stats.misses++;
};

Cache.prototype.mget = function (keys) {
	var key, val, ret, i, len;

	if (!(keys instanceof Array)) {
		keys = slice.call(arguments);
	}

	ret = {};
	for (i = 0, len = keys.length; i < len; i++) {
		key = keys[i];
		val = fetch(this, key);
		if ('undefined' !== typeof val) {
			ret[key] = val;
			this.stats.hits++;
		}
		else {
			this.stats.misses++;
		}
	}

	return ret;
};

Cache.prototype.set = function (key, val, ttl) {
	var exists = fetch(this, key);

	if ('undefined' === typeof val) {
		this.del(key);
		return exists;
	}

	if (arguments.length < 3) {
		ttl = this.options.ttl;
	}

	this.data[key] = val;
	ttl && (this.ttls[key] = +(new Date) + ttl * 1000);

	('undefined' !== typeof exists) || this.stats.keys++;
	this.emit("set", key, val);

	return exists;
};

Cache.prototype.del = function (keys) {
	var c, key, val, i, len;

	if (!(keys instanceof Array)) {
		keys = slice.call(arguments);
	}

	c = 0;
	for (i = 0, len = keys.length; i < len; i++) {
		key = keys[i];
		val = fetch(this, key);
		if ('undefined' !== typeof val) {
			this.stats.keys--;
			c++;
			delete this.data[key];
			delete this.ttls[key];
			this.emit("del", key);
		}
	}
	return c;
};

Cache.prototype.ttl = function (key, ttl) {
	ttl || (ttl = this.options.ttl);

	if (!ttl || ttl <= 0) return this.del(key);

	if ('undefined' !== typeof fetch(this, key)) {
		this.ttls[key] = +(new Date) + ttl * 1000;
	}
};

Cache.prototype.flush = function () {
	stop(this);

	this.data = {};
	this.ttls = {};
	this.stats = {
		hits: 0,
		misses: 0,
		keys: 0
	};

	start(this);

	this.emit("flush");
};

Cache.prototype.clean = function () {
	stop(this);

	var data = this.data,
		now = +(new Date),
		key, ttl, c = 0;

	for (key in data) {
		if (data.hasOwnProperty(key)) {
			ttl = this.ttls[key]

			if (ttl && ttl < now) {
				this.stats.keys--;
				delete this.data[key];
				delete this.ttls[key];
				c++;
				this.emit("expire", key);
			}
		}
	}

	this.emit("clean", c);

	start(this);
	return c;
};

module.exports = Cache;

