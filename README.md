node-ttl-cache
==============

Simple in-memory object cache with TTL based per-item expiry

## Installation:

    npm install ttl-cache
    
## Usage:

    var Cache = require('ttl-cache'),
        cache = new Cache();
    
    old_value = cache.set(key, value); // Set a value (returns old)
    new_value = cache.get(key); // Get a value
    values = cache.mget(key1, key2); // Get multiple values at once
    cache.del(key1, key2); // Delete one or more values at once
    cache.ttl(key, 3); // Change the ttl of a value (in seconds)
    cache.flush(); // Wipe the lot

## Options:

    var cache({
            ttl: 300,       // Number of seconds to keep entries
            interval: 60    // Cleaning interval
        });

## License:

Project code is released under CC0 license:

<a rel="license" href="http://creativecommons.org/publicdomain/zero/1.0/">
<img src="http://i.creativecommons.org/p/zero/1.0/88x31.png" style="border-style: none;" alt="CC0" />
</a>
    
  
