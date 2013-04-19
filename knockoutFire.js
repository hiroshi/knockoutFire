/*
  KnockoutFire.js
  (c) Hiroshi Saito <hiroshi3110@gmail.com>
  CC BY 2.0

  Basic Usage Example:
    var firebaseRef = new Firebase("https://yourdb.firebaseio.com/items");
    var viewModel = {
      "items": ko.observableArray().extend{firebaseArray:{firebaase: firebaseRef}})
    };
    ko.applyBindings(viewModel, document.getElementById("items"));
*/
KnockoutFire = {version: "0.0.3"}
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
                if (item._name == prevChildName) {
                    index = i;
                    return true;
                }
            });
            self.splice(reverse ? index : index + 1, 0, child);
        } else {
            if (reverse) {
                self.unshift(child);
            } else {
                self.push(child);
            }
        }
    };
    self().last = ko.observable();
    firebaseRef.on("child_added", function(childSnap, prevChildName) {
        var child = KnockoutFire.observable(childSnap.ref(), map[childVariable]);
        self.insert(child, prevChildName, map[".reverse"]);
        self().last(child());
    });
    firebaseRef.on("child_removed", function(childSnap) {
        self.remove(function(item) {
            return childSnap.name() == item._name;
        });
    });
    firebaseRef.on("child_moved", function(childSnap, prevChildName) {
        var child = self.remove(function(item) {
            return childSnap.name() == item._name;
        })[0];
        self.insert(child, prevChildName, map[".reverse"]);
    });
};
/*

*/
ko.extenders.firebasePrimitive = function(self, options) {
    var firebaseRef = options.firebaseRef;
    firebaseRef.on("value", function(valueSnap) {
        self._remoteValue = valueSnap.val();
        self(valueSnap.val());
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
    self().firebase = firebase;
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
    self.extend({firebase: {firebaseRef: firebaseRef, map: map}});
    // user extender
    if (map[".extend"]) {
        self.extend(map[".extend"]);
    }
};
