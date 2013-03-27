/*
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
*/
//function KnockoutFireCollectionViewModel(firebaseRef, collectionName, objExtendFunc) {
function KnockoutFireCollectionViewModel(firebaseRef, options) {
    var self = this,
    options = options || {};
    var collectionName = options.collectionName || "items";
    var collection = self[collectionName] = ko.observableArray([]);
    firebaseRef.on("child_added", function(addedSnap) {
        var ref = addedSnap.ref();
        var obj = ko.observable({
            ".ref": ref
        });
        for (var name in addedSnap.val()) {
            obj()[name] = ko.observable(addedSnap.val()[name]);
            ref.child(name).on("value", function(valueSnap) {
                obj()[valueSnap.name()](valueSnap.val());
            });
            obj()[name].subscribe(function(newValue) {
               ref.update({name: newValue});
            });
        }
        // TODO: Use inheritance and not to extend each object
        if (options.objExtendFunc) {
            options.objExtendFunc(obj(), ref);
        }
        if (options.reverseOrder) {
            collection.unshift(obj);
        } else {
            collection.push(obj);
        }
    });
};
