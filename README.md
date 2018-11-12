# js-hyperclick package

A [hyperclick][hyperclick] provider that lets you jump to where variables are defined.

![screenshot]( https://raw.githubusercontent.com/AsaAyers/js-hyperclick/master/screenshots/Selection_107.png)

This project was created primarily to assist navigating projects that use many
small modules. This project solves some of my problems and I share it in the
hope that it solves some of yours.

# FAQ

## What is js-hyperclick?

js-hyperclick is a scanner that integrates with [hyperclick][hyperclick]. It does not have
any keyboard shortcuts or commands. It does not have any user interface. All of that
is managed by [hyperclick][hyperclick].

js-hyperclick uses Babylon (Babel) to parse JavaScript. It scans for all
imports, exports, requires, identifiers (variables), and scopes. Using this
information it can locate the origin of any identifier. It does not and will not
track properties (ex. `identifier.property`), see below for more info.

## moduleRoots

If you have configured your project to avoid `../` in your imports, you can
configure js-hyperclick using `moduleRoots` in your `package.json`. The
configuration belongs there and not in Atom because it is specific to your
project.

For most use cases, you just need to specify the folders to search.
If you want `import 'foo'` to resolve to `src/lib/foo`, just drop this in your `package.json`.

```json
"moduleRoots": [ "src/lib" ],
```

If you're using something more advanced like module aliases you can implement
your own custom resolver. Instead of pointing `moduleRoots` to a folder, just
point it to a JavaScript file and `js-hyperclick` will `require()` and use it [*][security].

While `js-hyperclick` doesn't use these kinds of features in practice, I have
configured them as an example and to validate functionality.

1. moduleRoots configuration in [package.json][moduleRoots]
2. [custom-resolver.js][custom-resolver.js]
3. [spec/fixtures/moduleRoots.js][fixture-moduleRoots]

## Custom Resolver Security

Custom resolvers run inside Atom and extend the functionality of
`js-hyperclick`. This means there is some risk that you could checkout a project
that contains a malicious custom resolver. In order to mitigate this risk, when
`js-hyperclick` encounters a new resolver it will open it and ask if you want to
trust it. Whether you trust or distrust the resolver, `js-hyperclick` stores
that hash so you don't get prompted when switching between branches of a
project, or if you have use the exact same resolver code across multiple
projects.

![trust-resolver](https://raw.githubusercontent.com/AsaAyers/js-hyperclick/master/screenshots/trust-resolver.png)

## Why does `require('./otherfile')` open `otherfile.js` instead of `otherfile.jsx`?

There is a setting in `js-hyperclick` to add additional extensions. My
configuration is `.js, .jsx, .coffee`. This does not cause js-hyperclick to scan
CoffeeScript. This will just locate them if you require the file without the
extension.

## Can you add support for `this.doSomething()`?

No, There is no way to know for sure what `this` is or what properties it might
have. Instead of trying to pick some set of patterns to support and get partly
right, I'm just not going to support that at all.

If you want this you might look into http://ternjs.net/, or if you'll switch to
writing Flow instead of standard JavaScript [Nuclide has jump to definition
support](http://nuclide.io/docs/languages/flow/#jump-to-definition)

## Will you support AMD?

I just don't see a future in AMD, so I won't invest time in supporting it. I
used RequireJS for years

[hyperclick]: https://atom.io/packages/hyperclick
[code-links]: https://atom.io/packages/code-links
[resolve]: https://www.npmjs.com/package/resolvehttps://www.npmjs.com/package/resolve
[webpack-config]: http://webpack.github.io/docs/configuration.html#resolve-modulesdirectories
[moduleRoots]: https://github.com/AsaAyers/js-hyperclick/blob/master/package.json#L8-L11
[custom-resolver.js]: https://github.com/AsaAyers/js-hyperclick/blob/master/custom-resolver.js
[fixture-moduleRoots]: https://github.com/AsaAyers/js-hyperclick/blob/master/spec/fixtures/moduleRoots.js
[security]:https://github.com/AsaAyers/js-hyperclick#custom-resolver-security
