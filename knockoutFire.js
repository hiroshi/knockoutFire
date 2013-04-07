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
KnockoutFire = {version: "0.0.2"}
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
ko.extenders.firebaseArray = function(array, options) {
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
ko.extenders.firebaseObject = function(target, options) {
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
                val[valueSnap.name()](valueSnap.val());
            });
            val[name].subscribe(function(newValue) {
                val._ref.child(this.target[".name"]).set(newValue);
            });
        }
    } else {
        val.val = ko.observable(snapshot.val());
    }
    return target;
};
