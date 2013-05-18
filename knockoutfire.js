/*
  KnockoutFire.js
  (c) Hiroshi Saito <hiroshi3110@gmail.com>
  CC BY 2.0
*/
(function() {

KnockoutFire = {version: "0.0.5"}

// http://www.matteoagosti.com/blog/2013/02/24/writing-javascript-modules-for-both-browser-and-node/
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = KnockoutFire;
} else if (typeof define === 'function' && define.amd) {
    define([], function() {
      return KnockoutFire;
    });
} else {
    window.KnockoutFire = KnockoutFire;
}

if (typeof ko === "undefined") {
  ko = require("knockout");
}


/*
  
*/
KnockoutFire.utils = {
    "firstMatchedProperty": function(obj, regexp) {
        for (var k in obj) {
            if (k.match(regexp)) {
                return k;
            }
        }
    },
    "matchedProperties": function(obj, regexp) {
        var props = [];
        for (var k in obj) {
            if (k.match(regexp)) {
                props.push(k);
            }
        }
        return props;
    },
    "emptyVal": function(val) {
        if (val == undefined || val == null) {
            return true;
        } else if (typeof(val) == "object") {
            var empty = true;
            for (k in val) {
                if (!KnockoutFire.utils.emptyVal(val[k])) {
                    empty = false;
                }
            }
            return empty;
        }
        return false;
    }
}
/*
  
*/
KnockoutFire.observable = function(firebaseRef, map) {
    var self = KnockoutFire.mapObservable(map);
    self.extend({firebaseObject: {firebaseRef: firebaseRef, map: map}});
    return self;
};
/*
  
*/
KnockoutFire.mapObservable = function(map) {
    var self = null;
    map = (typeof(map) == "object") ? map : {};
    var childVariable = KnockoutFire.utils.firstMatchedProperty(map, /^\$/);
    var childNames = KnockoutFire.utils.matchedProperties(map, /^[^\$\.][^\/]+$/);
    if (childVariable) {
        self = ko.observableArray([]);
    } else {
        if (childNames.length > 0) {
            self = ko.observable({});
            childNames.forEach(function(childName, i) {
                self()[childName] = KnockoutFire.mapObservable(map[childName]);
            });
        } else {
            self = ko.observable("");
        }
    }
    return self;
};
/*

*/
ko.extenders.firebaseArray = function(self, options) {
    var firebaseRef = options.firebaseRef;
    var map = options.map;
    var childVariable = KnockoutFire.utils.firstMatchedProperty(map, /^\$/);
    self.insert = function(child, prevChildName, reverse) {
        var self = this;
        var index = 0;
        if (prevChildName) {
            self().some(function(item, i) {
                if (item.firebase.name() == prevChildName) {
                    index = i;
                    return true;
                }
            });
            self.splice(reverse ? index : index + 1, 0, child);
        } else {
            if (reverse) {
                self.push(child);
            } else {
                self.unshift(child);
            }
        }
    };
    self().last = ko.observable();
    if (map[".limit"] > 0) {
        firebaseRef = firebaseRef.limit(map[".limit"])
    }    
    if (map.hasOwnProperty(".startAt")) {
        if (map[".startAt"] instanceof Object) {
            firebaseRef = firebaseRef.startAt(map[".startAt"][".priority"], map[".startAt"][".name"])
        } else if (map[".startAt"] === undefined) {
            firebaseRef = firebaseRef.startAt()
        } else {
            firebaseRef = firebaseRef.startAt(map[".startAt"])
        }
    }
    if (map.hasOwnProperty(".endAt")) {
        if (map[".endAt"] instanceof Object) {
            firebaseRef = firebaseRef.endAt(map[".endAt"][".priority"], map[".endAt"][".name"])
        } else if (map[".endAt"] === undefined) {
            firebaseRef = firebaseRef.endAt()
        } else {
            firebaseRef = firebaseRef.endAt(map[".endAt"])
        }
    }
    firebaseRef.on("child_added", function(childSnap, prevChildName) {
        //var child = KnockoutFire.observable(childSnap.ref(), map[childVariable]);
        var childMap = map[childVariable];
        var child = KnockoutFire.mapObservable(childMap);
        if (childSnap.getPriority()) {
            child()[".priority"] = childSnap.getPriority();
        }
        child.extend({firebaseObject: {firebaseRef: childSnap.ref(), map: childMap}});
        //console.log(childSnap.ref().path.toString() + ":" + child().firebase);
        self.insert(child, prevChildName, map[".reverse"]);
        self().last(child());
    });
    firebaseRef.on("child_removed", function(childSnap) {
        self.remove(function(item) {
            return childSnap.name() == item.firebase.name();
        });
    });
    firebaseRef.on("child_moved", function(childSnap, prevChildName) {
        var child = self.remove(function(item) {
            return childSnap.name() == item.firebase.name();
        })[0];
        if (childSnap.getPriority()) {
            child()[".priority"] = childSnap.getPriority();
        }
        self.insert(child, prevChildName, map[".reverse"]);
    });
    // newItem
    if (map[".newItem"]) {
        self.newItem = {"_name": ko.observable()};
        (function() {
            var childVariable = KnockoutFire.utils.firstMatchedProperty(map, /^\$/);
            var childNames = KnockoutFire.utils.matchedProperties(map[childVariable], /^[^\$\.][^\/]+$/);
            childNames.forEach(function(childName, i) {
                self.newItem[childName] = ko.observable();
            });
        }());
        self.newItem.create = function() {
            var val = {};
            var childVariable = KnockoutFire.utils.firstMatchedProperty(map, /^\$/);
            var childNames = KnockoutFire.utils.matchedProperties(map[childVariable], /^[^\$\.][^\/]+$/);
            childNames.forEach(function(childName, i) {
                // try defaults
                if (typeof(map[".newItem"][childName]) == "function") {
                    val[childName] = map[".newItem"][childName]();
                } else {
                    val[childName] = self.newItem[childName]();
                }
            });
            // If val is empty in firebase, push will be ignored. Set true instead.
            if (!name && KnockoutFire.utils.emptyVal(val)) {
                val = true;
            }
            if (typeof(map[".newItem"][".priority"]) == "function") {
                var priority = map[".newItem"][".priority"]();
                if (typeof(val) != "object") {
                    val = {".value": val};
                }
                val[".priority"] = priority;
            }
            var name = self.newItem["_name"]();
            var callback = function(error) {
                if (!error) {
                    childNames.forEach(function(childName, i) {
                        self.newItem[childName]("");
                    });
                    if ( typeof(map[".newItem"][".on_success"]) == "function" ) {
                        map[".newItem"][".on_success"]() ;
                    }
                }
            };
            if (name) {
                self.firebase.child(name).set(val, callback);
            } else {
                self.firebase.push(val, callback);
            }
        };
    }
};
/*

*/
ko.extenders.firebasePrimitive = function(self, options) {
    var firebaseRef = options.firebaseRef;
    firebaseRef.on("value", function(valueSnap) {
        self._remoteValue = valueSnap.val();
        self(valueSnap.val());
        if (valueSnap.getPriority()) {
            self()[".priority"] = valueSnap.getPriority();
        }
        //console.log(firebaseRef.path.toString() + ":" + firebaseRef);
    });
    self.subscribe(function(newValue) {
        if (self._remoteValue != newValue) {
            firebaseRef.set(newValue);
        }
    });
};
/*

*/
ko.extenders.firebase = function(self, options) {
    var firebase = options.firebaseRef;
    self.firebase = firebase;
    if (self() instanceof Object) {
        self().firebase = firebase;
    }
};
/*
  
*/
ko.extenders.firebaseObject = function(self, options) {
    var firebaseRef = options.firebaseRef;
    var map = options.map;
    if (map[".indexOf"] && map[".indexOf"].match(/\$/)) {
        var path = map[".indexOf"].replace(/\$[^\/]+/, firebaseRef.name());
        firebaseRef = firebaseRef.root().child(path);
    }
    if (map[".indexOf"] && map[".indexOf"].match(/data\(\)/)) {
        firebaseRef.once("value", function(valueSnap) {
            var path = map[".indexOf"].replace("data()", valueSnap.val());
            var ref = firebaseRef.root().child(path);
            self.extend({_firebaseObject: {firebaseRef: ref, map: map}});
        });
    } else {
        self.extend({_firebaseObject: {firebaseRef: firebaseRef, map: map}});
    }    
}
/*
  
*/
ko.extenders._firebaseObject = function(self, options) {
    var firebaseRef = options.firebaseRef;
    var map = options.map;
    var childVariable = KnockoutFire.utils.firstMatchedProperty(map, /^\$/);
    var childNames = KnockoutFire.utils.matchedProperties(map, /^[^\$\.][^\/]+$/);
    if (childVariable) {
        self.extend({firebaseArray: {firebaseRef: firebaseRef, map: map}});
    } else if (childNames.length > 0) {
        childNames.forEach(function(childName, i) {
            var childOptions = {firebaseRef: firebaseRef.child(childName), map: map[childName]};
            self()[childName].extend({firebaseObject: childOptions});
        });
    } else {
        self.extend({firebasePrimitive: {firebaseRef: firebaseRef}});
    }
    //console.log("  firebaseRef: " + firebaseRef);
    self.extend({firebase: {firebaseRef: firebaseRef, map: map}});
    // user extender
    if (map[".extend"]) {
        self.extend(map[".extend"]);
    }
};
})();
