knockoutFire
============

KnockoutFire map [Firebase](https://www.firebase.com) json structure into HTML structure using [KnockoutJs](http://knockoutjs.com).

[Live demo at jsFiddle](http://jsfiddle.net/4E8nh/).

How to use
----------

### Github pages as CDN

[Latest release](http://hiroshi.github.io/knockoutFire/knockoutfire.js) may have breaking changes.

I recommend to use versioned release, like [0.0.5](http://hiroshi.github.io/knockoutFire/knockoutfire-0.0.5.js) instead.

    <script type="text/javascript" src="//hiroshi.github.io/knockoutFire/knockoutfire-0.0.5.js"></script>

Also see [CHANGELOG](https://github.com/hiroshi/knockoutFire/blob/master/CHANGELOG.md).

### Using bower

In bower.json or component.json.

    "dependencies": {
      ...
      "knockoutfire": "git://github.com/hiroshi/knockoutFire.git"
    }

This will fetch latest tag.


Example
-------

### Firebase

```javascript
items: {
  -XXX: {
    content: "Hello"
  }
  -YYY: {
    content: "World."
  }
}
```

### HTML

```html
<div id="viewModel">
  <ul data-bind="foreach: items">
    <li data-bind="text: content"></li>
  </ul>
</div>
```

### Javascript

```javascript
var firebase = new Firebase("https://knockoutFire-README-example.firebaseio-demo.com");
var viewModel = KnockoutFire.observable(firebase, {
  items: {
    "$item": {
      content: true,
    }
  }
});
ko.applyBindings(viewModel, document.getElementById("viewModel"));
```

API Reference
-------------

### KnockoutFire.observable(firebaseRef, map)

#### The map option

The notation resembles to [Firebase Security Rule](https://www.firebase.com/docs/security/security-rules.html).

##### `Named propertiy`

You need to specify which properties are used as observable properties of view models. KnockoutFire will retrieve only what specified in the map.

- Each properties will be a `ko.observable()` and synchronized with the corresponding value in Firebase.

```javascript
person: {
  firstName: true,
  lastName: true
}
```

##### `$Variables` and `.reverse`

If you use a property name start with `$`, the parent property will be `ko.observableArray()`.

```javascript
users: {
  "$user": {
    nickname: true,
  }
}
```

For add/remove/move operations, you should use [Firebase API](https://www.firebase.com/docs/javascript/firebase/index.html) instead of manipulating observable array directly.

```javascript
users()[1]().firebase.remove();
```

If you need reverse order;

```javascript
comments: {
  ".reverse": true,
  "$comment": {
    content: true
  }
}
```

##### `.startAt`, `.endAt`, `.limit`

```javascript
comments: {
  ".startAt": 0,
  ".endAt": {
    ".priority": 100,
    ".name": "foo"
  },
  ".limit": 20
}
```

[Querying and Limiting Data in Firebase | Firebase Documentation](https://www.firebase.com/docs/queries.html)


##### `.newItem` and `.priority`

`.newItem` adds additional sub viewModel to an observable array.

```javascript
comments: {
  ".newItem": true,
  "$comment": {
    content: true
  }
}
```

```html
<div data-bind="with: comments.newItem">
  <form data-bind="submit: create">
    <input type="text" data-bind="value: content">
    <input type="submit">
  </form>
</div>
```

If you need a `priority` to be set;

```javascript
".newItem": {
  ".priority": function() { return Date.now() }
}
```

If you need a default value rather than from a data-bind;

```javascript
".newItem": {
  isdone: function(){ return false; }
}
```

If you need a callback on success;

```javascript
".newItem": {
  ".on_success": function(){ do_someting(); }
}
```

##### `.indexOf`

To use [Denormalized data](https://www.firebase.com/blog/2013-04-12-denormalizing-is-normal.html) use `.indexOf`.

```javascript
members: {
  "$user": {
    ".indexOf": "/users/$user",
    "nickName": true
  }
}
```

You can access nickName like this:

```javascript
members()[0]().nickName()
```

##### `.extend`

You can use [Knockout extender](http://knockoutjs.com/documentation/extenders.html).

```javascript
ko.extenders.person = function(self, option) {
  self.fullName = ko.computed(function() {
    return this.firstName() + " " + this.lastName();
  });
};
```

Then specify the extender by name:

```javascript
person: {
  firstName: true,
  lastName: true,
  ".extend": {person: true}
}
```
