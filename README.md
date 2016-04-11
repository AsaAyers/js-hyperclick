# js-hyperclick package

A [hyperclick][hyperclick] provider that lets you jump to where variables are defined.

![screenshot]( https://raw.githubusercontent.com/AsaAyers/js-hyperclick/master/screenshots/Selection_107.png)

This project was created primarily to assist navigating projects that use many
small modules. This project solves some of my problems and I share it in the
hope that it solves some of yours.

# FAQ

## Why doesn't `js-hyperclick` see my jsx files?

There is a setting in `js-hyperclick` to add additional extensions. My
configuration is `.js, .jsx, .coffee`

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
