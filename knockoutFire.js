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
// KnockoutFire.observablePrimitive = function(self, firebaseRef, map) {
//     var self = ko.observable();
//     self.extend({firebase: firebaseRef});
//     firebaseRef.on("value", function(valueSnap) {
//         self._remoteValue = valueSnap.val();
//         self(valueSnap.val());
//     });
//     self.subscribe(function(newValue) {
//         if (self._remoteValue != newValue) {
//             firebaseRef.set(newValue);
//         }
//     });
//     return self;
// };
// KnockoutFire.observableArray = function(self, firebaseRef, map) {
//     if (self) {
//         self([]);
//     } else {
//         self = ko.observableArray([]);
//     }
//     self.extend({firebase: firebaseRef});
//     var variableName = KnockoutFire.utils.firstMatchedProperty(map, /^\$/);
//     var childMap = map[variableName];
//     firebaseRef.on("child_added", function(addedSnap) {
//         if (childMap[".indexOf"]) {
//             var childPath =  childMap[".indexOf"].replace(variableName, addedSnap.name());
//             firebaseRef.root().child(childPath).once("value", function(valueSnap) {
//                 self.push(KnockoutFire._observable(null, valueSnap.ref(), childMap));
//             });
//         } else {
//             self.push(KnockoutFire._observable(null, addedSnap.ref(), childMap));
//         }
//     });
//     return self;
// };
/*
*/
// KnockoutFire._observable = function(self, firebaseRef, map) {
//     var childNames = KnockoutFire.utils.matchedProperties(map, /^[^\$\.][^\/]+$/);
//     // object (named children) or collection ($variable name) or primitive
//     if (childNames.length > 0) {
//         if (self) {
//             self({});
//         } else {
//             self = ko.observable({});
//         }
//         self.extend({firebase: firebaseRef});
//         childNames.forEach(function(name, i) {
//             self()[name] = KnockoutFire._observable(null, firebaseRef.child(name), map[name])
//         });
//     } else {
//         var variableName = KnockoutFire.utils.firstMatchedProperty(map, /^\$/);
//         if (variableName) {
//             self = KnockoutFire.observableArray(self, firebaseRef, map);
//         } else {
//             self = KnockoutFire.observablePrimitive(self, firebaseRef, map);
//         }
//     }
//     if (map[".extend"]) {
//         self.extend(map[".extend"]);
//     }
//     return self;
// };

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
    //console.log("knockoutFire: " + self._path);
};
/*
*/
// ko.extenders.firebasePrimitive = function(self, options) {
//     self.extend(firebase: options);
//     self._ref.on("value", function(valueSnap) {
//         self._remoteValue = valueSnap.val();
//         self(valueSnap.val());
//     });
//     self.subscribe(function(newValue) {
//         if (self._remoteValue != newValue) {
//             self._ref.set(newValue);
//         }
//     });
// };
/*
*/
ko.extenders.firebaseCollection = function(self, options) {
    self.extend({"firebase": options});
    var variableName = KnockoutFire.utils.firstMatchedProperty(self._map, /^\$/);
    var childMap = self._map[variableName];
    self._ref.on("child_added", function(addedSnap) {
        var priority = addedSnap.getPriority();
        if (childMap[".indexOf"]) {
            var childPath =  childMap[".indexOf"].replace(variableName, addedSnap.name());
            self._ref.root().child(childPath).once("value", function(valueSnap) {
                var child = KnockoutFire.observable(valueSnap.ref(), childMap);
                child._priority = priority;
                child().firebase.priority = priority;
                self.push(child);
            });
        } else {
            var child = KnockoutFire.observable(addedSnap.ref(), childMap);
            child._priority = priority;
            child().firebase.priority = priority;
            self.push(child);
        }
    });
};
/*
*/
ko.extenders.firebaseObject = function(self, options) {
    self.extend({"firebase": options});
    var childNames = KnockoutFire.utils.matchedProperties(self._map, /^[^\$\.][^\/]+$/);
    if (childNames.length > 0) {
        childNames.forEach(function(name, i) {
            self()[name] = KnockoutFire.observable(self._ref.child(name), self._map[name])
        });
    } else {
        //self(self._name);
        self._ref.on("value", function(valueSnap) {
            self._remoteValue = valueSnap.val();
            self(valueSnap.val());
        });
        self.subscribe(function(newValue) {
            if (self._remoteValue != newValue) {
                self._ref.set(newValue);
            }
        });
    }
};
/*
  In map you must specify every single child.
*/
KnockoutFire.observable = function(firebaseRef, map) {
    var self = null;
    // If map has key start with "$", it must be an array.
    var variableName = KnockoutFire.utils.firstMatchedProperty(map, /^\$/);
    if (variableName) {
        self = ko.observableArray([]);
        self.extend({"firebaseCollection": {"firebaseRef": firebaseRef, "map": map}});
        if (map[".extend"]) {
            self.extend(map[".extend"]);
        }
    } else {
        self = ko.observable({});
        if (map[".indexOf"] && map[".indexOf"].match("data()")) {
            //////
            var childNames = KnockoutFire.utils.matchedProperties(map, /^[^\$\.][^\/]+$/);
            if (childNames.length > 0) {
                childNames.forEach(function(name, i) {
                    self()[name] = ko.observable({});
                });
            }
            //////
            firebaseRef.on("value", function(valueSnap) {
                var path = map[".indexOf"].replace("data()", valueSnap.val());
                var ref = firebaseRef.root().child(path);
                self.extend({"firebase": {"firebaseRef": ref, "map": map}});
                childNames.forEach(function(name, i) {
                    self()[name].extend({"firebaseObject": {"firebaseRef": ref.child(name), "map": map[name]}});
                });
                if (map[".extend"]) {
                    self.extend(map[".extend"]);
                }
            });
        } else {
            self.extend({"firebaseObject": {"firebaseRef": firebaseRef, "map": map}});
            if (map[".extend"]) {
                self.extend(map[".extend"]);
            }
        }
    }
    return self;
}










KnockoutFire.__observable = function(firebaseRefOrSnap, map) {
    var isPrimitive = true;
    var self = null;
    var ref = null;
    var snap = null;
    map = map || {}
    // primitive or object?
    if (firebaseRefOrSnap.val) {
        isPrimitive = (typeof(firebaseRefOrSnap.val()) != "object");
        ref = firebaseRefOrSnap.ref();
        snap = firebaseRefOrSnap;
    } else {
        ref = firebaseRefOrSnap;
        if (KnockoutFire.utils.firstMatchedProperty(map, /^[^\/\.]+$/)) {
            isPrimitive = false;
        }
        // for (var k in map) {
        //     if (k.match(/^[^\/\.]+$/)) {
        //         isPrimitive = false;
        //         break;
        //     }
        // }
    }
    if (isPrimitive) {
        var val = snap ? snap.val() : null;
        self = ko.observable(val);
        ref.on("value", function(valueSnap) {
            self._remoteValue = valueSnap.val();
            self(valueSnap.val());
        });
        self.subscribe(function(newValue) {
            if (self._remoteValue != newValue) {
                self._ref.set(newValue);
            }
        });
    } else {
        self = ko.observableArray([]);
        ref.on("child_added", function(childSnap) {
            var name = childSnap.name();
            // parent map has a key start with "$"
            var variableKey = KnockoutFire.utils.firstMatchedProperty(map, /^\$/);
            var childMap = (variableKey ? map[variableKey] : map[name]) || {};
            if (variableKey && childMap[".indexOf"]) {
                var childPath =  childMap[".indexOf"].replace(variableKey, name);
                ref.root().child(childPath).once("value", function(valueSnap) {
                    var child = KnockoutFire.observable(valueSnap, childMap);
                    self.push(child);
                    self()[name] = child;
                });
            } else {
                if (childMap[".indexOf"]) {
                    var childPath = childMap[".indexOf"].replace("data()", childSnap.val());
                    var child = KnockoutFire.observable(ref.root().child(childPath), childMap);
                    self.push(child);
                    self()[name] = child;
                } else {
                    var child = KnockoutFire.observable(childSnap, childMap);
                    self.push(child);
                    self()[name] = child;
                }
            }
        });
    }
    // for (var k in map) {
    //     self[k] = map[k];
    // }
    self._ref = ref;
    self()._path = ref.path.toString();
    if (ref.name) { // Query has no name()
        self()._name = ref.name();
    }
    if (snap) {
        self()._priority = snap.getPriority();
    }
    if (map[".extend"]) {
        //console.log(map[".extend"]);
        self.extend(map[".extend"]);
    }
    return self;
}


/*
  firebaseArray observable array extender

  This extender bind the target observableArray with firebase as an array.

  Options:
    firebase: [REQUIRED]
      The firebase reference or query.
    reverseOrder: (true|false)
      Order the items in reverse order of their priority.
    itemExtendFunc: function(item, itemRef)
      Can be used to declare computed observable for each item
      Example:
      ko.observableArray().extend({firebaseArray: {firebase: firebaseRef, itemExtendFunc: function(obj) {
        item.fullName = ko.computed(function() {
          return item.firstName() + " " + item.lastName();
        });
      }}});

  Tips:
    You can get the firebase reference for a knockout context with `ko.contextFor(DOM).$data._ref`.
    Example:
    $(document).on("click", "a.remove", function() {
      var firebaseRef = ko.contextFor(this).$data._ref;
      firebaseRef.remove();
    });
*/
ko.extenders._firebaseArray = function(array, options) {
    var firebaseRef = options.firebase;
    firebaseRef.on("child_added", function(addedSnap) {
        var addItem = function(snap) {
            var item = ko.observable({}).extend({firebaseObject: {snapshot: snap, excludes: options.excludes}})();
            if (options.itemExtendFunc) {
                options.itemExtendFunc(item, snap.ref());
            }
            if (options.reverseOrder) {
                array.unshift(item);
            } else {
                array.push(item);
            }
        };
        if (options.reference) {
            options.reference.child(addedSnap.name()).once("value", function(valueSnap) {
                addItem(valueSnap);
            });
        } else {
            addItem(addedSnap);
        }
    });
    firebaseRef.on("child_removed", function(removedSnap) {
        var name = removedSnap.name();
        array.remove(function(item) {
            return name == item._ref.name();
        });
    });
    firebaseRef.on("child_moved", function(movedSnap, prevChildName) {
        var i, len = array().length, item = undefined;
        for (i=0; i < len; i++) {
            if (array()[i]._ref.name() == movedSnap.name()) {
                item = array.splice(i, 1)[0];
                break;
            }
        }
        if (prevChildName) {
            for (i=0; i < len - 1; i++) {
                if (array()[i]._ref.name() == prevChildName) {
                    break;
                }
            }
            if (options.reverseOrder) {
                array.splice(i, 0, item);
            } else {
                array.splice(i + 1, 0, item);
            }
        } else {
            if (options.reverseOrder) {
                array.unshift(item);
            } else {
                array.push(item);
            }
        }
    });
    return array;
};
/*
  firebaseObject observable object extender

  This extender bind properties of the target with firebase as an object.

  Options:
    snapshot: [REQUIRED]
      The firebase snapshot
*/
ko.extenders._firebaseObject = function(target, options) {
    var snapshot = options.snapshot;
    var excludes = options.excludes || [];
    var val = target();
    val._ref = snapshot.ref();
    val._name = snapshot.name();
    val._priority = snapshot.getPriority();
    if (typeof(snapshot.val()) == "object") {
        for (var name in snapshot.val()) {
            if (excludes.indexOf(name) > -1) {
                continue;
            }
            val[name] = ko.observable(snapshot.val()[name]);
            val[name][".name"] = name;
            val._ref.child(name).on("value", function(valueSnap) {
                var prop = val[valueSnap.name()];
                prop._remoteValue = valueSnap.val();
                prop(valueSnap.val());
            });
            val[name].subscribe(function(newValue) {
                var prop = this.target;
                if (prop._remoteValue != newValue) {
                    val._ref.child(prop[".name"]).set(newValue);
                }
            });
        }
    } else {
        val.val = ko.observable(snapshot.val());
    }
    return target;
};
