/*
  KnockoutFire.js
  (c) Hiroshi Saito <hiroshi3110@gmail.com>
  CC BY 2.0

  Basic Usage Example:
    var firebaseRef = new Firebase("https://yourdb.firebaseio.com/items");
    var viewModel = {
      "items": KnockoutFire.observableArray(firebaseRef)
    };
    ko.applyBindings(viewModel, document.getElementById("items"));
*/
KnockoutFire = {};
/*
  KnockoutFire.observableArray(firebaseRef, options)

  Arguments:
    firebaseRef:
      The firebase reference or query.
    options:
  Options:
    reverseOrder: (true|false)
      Order the items in reverse order of their priority.
    itemExtendFunc: function(item, itemRef)
      Can be used to declare computed observable for each item
      Example:
      KnockoutFire.observableArray(firebaseRef, function(obj) {
        item.fullName = ko.computed(function() {
          return item.firstName() + " " + item.lastName();
        });
      });

  Tips:
    You can get the firebase reference for a knockout context with `ko.contextFor(DOM).$data[".ref"]`.
    Example:
    $(document).on("click", "a.remove", function() {
      var firebaseRef = ko.contextFor(this).$data[".ref"];
      firebaseRef.remove();
    });
*/
KnockoutFire.observableArray = function(firebaseRef, options) {
    var array = ko.observableArray([]);
    firebaseRef.on("child_added", function(addedSnap) {
        var item = KnockoutFire.observableProperties(addedSnap);
        if (options.itemExtendFunc) {
            options.itemExtendFunc(item, addedSnap.ref());
        }
        if (options.reverseOrder) {
            array.unshift(item);
        } else {
            array.push(item);
        }
    });
    firebaseRef.on("child_removed", function(removedSnap) {
        var name = removedSnap.name();
        array.remove(function(item) {
            return name == item()[".ref"].name();
        });
    });
    firebaseRef.on("child_moved", function(movedSnap, prevChildName) {
        var i, len = array().length, item = undefined;
        for (i=0; i < len; i++) {
            if (array()[i][".ref"].name() == movedSnap.name()) {
                item = array.splice(i, 1)[0];
                break;
            }
        }
        if (prevChildName) {
            for (i=0; i < len - 1; i++) {
                if (array()[i][".ref"].name() == prevChildName) {
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
    return array
};
/*
  KnockoutFire.observableProperties(snapshot)
*/
KnockoutFire.observableProperties = function(snapshot) {
    var ref = snapshot.ref();
    var val = {".ref": ref};
    for (var name in snapshot.val()) {
        val[name] = ko.observable(snapshot.val()[name]);
        val[name][".name"] = name;
        ref.child(name).on("value", function(valueSnap) {
            val[valueSnap.name()](valueSnap.val());
        });
        val[name].subscribe(function(newValue) {
            ref.child(this.target[".name"]).set(newValue);
        });
    }
    return val;
};
