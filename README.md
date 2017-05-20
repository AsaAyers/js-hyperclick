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

## I configured {babel,eslint,flow,webpack,etc} to avoid '../' in my imports. How can I configure `js-hyperclick`?

First, I think it's a bad idea to do that and I never configure my projects this
way. In a twitter conversation to see if we could standardize this across
projects some good points were made:

> @nodkz the module loader is locked (in node anyways) so any feature additions should be rejected
>
> -[@evanhlucas](https://twitter.com/evanhlucas/status/771750602967703561)

and

> @nodkz @left_pad @izs @slicknet @zpao I think this is at odds with Node resolution mechanism so it likely won’t happen.
>
> -[@dan_abramov](https://twitter.com/dan_abramov/status/771741318129324032)

If you're still set on custom module directories, there is a way to configure
it. If you keep your common modules in `src/lib` you can add this to your
`package.json`:

```json
"moduleRoots": [ "src/lib" ],
```

With that in place `require('foo')` or `import 'foo'` with both locate your `src/lib/foo` module.

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
