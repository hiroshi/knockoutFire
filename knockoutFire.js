/*
  KnockoutFire.js
  (c) Hiroshi Saito <hiroshi3110@gmail.com>
  CC BY 2.0

  Basic Usage Example:
    var firebaseRef = new Firebase("https://yourdb.firebaseio.com/items");
    var itemsViewModel = new KnockoutFireCollectionViewModel(firebaseRef);
    ko.applyBindings(viewModel, document.getElementById("items"));

  Arguments:
    firebaseRef:
      The firebase reference or query for collection.
    options:
  Options:
    reverseOrder: (true|false)
      Order the items in reverse order of their priority.
    collectionName:
      The name for data-bind="foreach: ..."
    objExtendFunc: function(obj, firebaseRef): obj is each value of the collection.
      Can be used to declare computed observable using ko.computed().
      Example:
      new KnockoutFireCollectionViewModel(firebaseRef, "people", function(obj) {
        obj.fullName = ko.computed(function() {
          return obj.firstName() + " " + obj.lastName();
        });
      });

  Tips:
    You can get the firebase reference for a knockout context with `ko.contextFor(DOM).$data[".ref"]`.
    Example:
    $(document).on("click", "a.remove", function() {
      var firebaseRef = ko.contextFor(this).$data[".ref"];
      firebaseRef.remove();
    });

  Todo:
    - 
*/
//function KnockoutFireCollectionViewModel(firebaseRef, collectionName, itemExtendFunc) {
function KnockoutFireCollectionViewModel(firebaseRef, options) {
    var self = this,
    options = options || {};
    var collectionName = options.collectionName || "items";
    var collection = self[collectionName] = ko.observableArray([]);
    var createItem = function(itemSnap) {
        var ref = itemSnap.ref();
        var item = {".ref": ref};
        for (var name in itemSnap.val()) {
            item[name] = ko.observable(itemSnap.val()[name]);
            item[name][".name"] = name;
            ref.child(name).on("value", function(valueSnap) {
                item[valueSnap.name()](valueSnap.val());
            });
            item[name].subscribe(function(newValue) {
                ref.child(this.target[".name"]).set(newValue);
            });
        }
        // TODO: Using inheritance or like, not to extend each object.
        if (options.objExtendFunc) {
            options.objExtendFunc(item, ref);
        }
        return item;
    }
    firebaseRef.on("child_added", function(addedSnap) {
        var item = createItem(addedSnap);
        if (options.reverseOrder) {
            collection.unshift(item);
        } else {
            collection.push(item);
        }
    });
    firebaseRef.on("child_removed", function(removedSnap) {
        var name = removedSnap.name();
        collection.remove(function(item) {
            return name == item()[".ref"].name();
        });
    });
    firebaseRef.on("child_moved", function(movedSnap, prevChildName) {
        var i, len = collection().length, item = undefined;
        for (i=0; i < len; i++) {
            if (collection()[i][".ref"].name() == movedSnap.name()) {
                item = collection.splice(i, 1)[0];
                break;
            }
        }
        if (prevChildName) {
            for (i=0; i < len - 1; i++) {
                if (collection()[i][".ref"].name() == prevChildName) {
                    break;
                }
            }
            if (options.reverseOrder) {
                collection.splice(i, 0, item);
            } else {
                collection.splice(i + 1, 0, item);
            }
        } else {
            if (options.reverseOrder) {
                collection.unshift(item);
            } else {
                collection.push(item);
            }
        }
    });
};
