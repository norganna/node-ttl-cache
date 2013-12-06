var events = require('events'),
	util = require('util'),
	slice = [].slice;

function bind(f, to) {
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
	if (cache.options.clean_interval > 0) {
		cache.timer = setTimeout(cache.clean, cache.options.clean_interval * 1000);
	}
}

function fetch(cache, key) {
	var ttl = cache.ttls[key],
		now = ttl ? +(new Date) : 0;

	if (ttl && ttl < now) {
		this.stats.keys--;
		delete cache.data[key];
		cache.emit("expired", key);
		return;
	}

	return this.data[key];
}


function Cache(options) {
	this.options = options || {};

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
		ttl: 300,           // Default TTL 5 minutes.
		clean_interval: 60  // Clean every minute.
	};

	options.forEach(function(v,k) {
		if (this.options.hasOwnProperty(k))
			this.options[k] = v;
	});

	this.stats = {
		hits: 0,
		misses: 0,
		keys: 0
	};

	this.check_data();
}

util.inherits(Cache, events.EventEmitter);


Cache.prototype.get = function (key) {
	var v = this.check(key);

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
		del(key);
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
			ttl = cache.ttls[key]

			if (ttl && ttl < now) {
				this.stats.keys--;
				delete cache.data[key];
				delete cache.ttls[key];
				c++;
				cache.emit("expired", key);
			}
		}
	}

	this.emit("clean", c);

	start(this);
	return c;
};

module.exports = Cache;

