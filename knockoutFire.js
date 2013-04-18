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
    self().last = ko.observable();
    firebaseRef.on("child_added", function(childSnap) {
        var child = KnockoutFire.observable(childSnap.ref(), map[childVariable]);
        self.push(child);
        self().last(child());
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
    var firebase = {
        ref: options.firebaseRef,
        path: options.firebaseRef.path.toString(),
        map: options.map
    };
    self._ref = options.firebaseRef;
    self._path = options.firebaseRef.path.toString();
    self._map = options.map;
    // query has no name
    if (self._ref.name) {
        self._name = self._ref.name();
        firebase.name = self._ref.name();
    }
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





// ko.extenders._firebaseArray = function(array, options) {
//     var firebaseRef = options.firebase;
//     firebaseRef.on("child_added", function(addedSnap) {
//         var addItem = function(snap) {
//             var item = ko.observable({}).extend({firebaseObject: {snapshot: snap, excludes: options.excludes}})();
//             if (options.itemExtendFunc) {
//                 options.itemExtendFunc(item, snap.ref());
//             }
//             if (options.reverseOrder) {
//                 array.unshift(item);
//             } else {
//                 array.push(item);
//             }
//         };
//         if (options.reference) {
//             options.reference.child(addedSnap.name()).once("value", function(valueSnap) {
//                 addItem(valueSnap);
//             });
//         } else {
//             addItem(addedSnap);
//         }
//     });
//     firebaseRef.on("child_removed", function(removedSnap) {
//         var name = removedSnap.name();
//         array.remove(function(item) {
//             return name == item._ref.name();
//         });
//     });
//     firebaseRef.on("child_moved", function(movedSnap, prevChildName) {
//         var i, len = array().length, item = undefined;
//         for (i=0; i < len; i++) {
//             if (array()[i]._ref.name() == movedSnap.name()) {
//                 item = array.splice(i, 1)[0];
//                 break;
//             }
//         }
//         if (prevChildName) {
//             for (i=0; i < len - 1; i++) {
//                 if (array()[i]._ref.name() == prevChildName) {
//                     break;
//                 }
//             }
//             if (options.reverseOrder) {
//                 array.splice(i, 0, item);
//             } else {
//                 array.splice(i + 1, 0, item);
//             }
//         } else {
//             if (options.reverseOrder) {
//                 array.unshift(item);
//             } else {
//                 array.push(item);
//             }
//         }
//     });
//     return array;
// };

// ko.extenders.__firebaseObject = function(target, options) {
//     var snapshot = options.snapshot;
//     var excludes = options.excludes || [];
//     var val = target();
//     val._ref = snapshot.ref();
//     val._name = snapshot.name();
//     val._priority = snapshot.getPriority();
//     if (typeof(snapshot.val()) == "object") {
//         for (var name in snapshot.val()) {
//             if (excludes.indexOf(name) > -1) {
//                 continue;
//             }
//             val[name] = ko.observable(snapshot.val()[name]);
//             val[name][".name"] = name;
//             val._ref.child(name).on("value", function(valueSnap) {
//                 var prop = val[valueSnap.name()];
//                 prop._remoteValue = valueSnap.val();
//                 prop(valueSnap.val());
//             });
//             val[name].subscribe(function(newValue) {
//                 var prop = this.target;
//                 if (prop._remoteValue != newValue) {
//                     val._ref.child(prop[".name"]).set(newValue);
//                 }
//             });
//         }
//     } else {
//         val.val = ko.observable(snapshot.val());
//     }
//     return target;
// };
