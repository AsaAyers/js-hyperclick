## `master`

## 1.10.0

* New feature: Jump through intermediate links. See [#45](https://github.com/AsaAyers/js-hyperclick/issues/45)
* Most of the code was moved to [js-hyperclick-core](https://www.npmjs.com/package/js-hyperclick-core) and is now has automated tests.
* The scanner is able to create more links
* Fixed [#48](https://github.com/AsaAyers/js-hyperclick/issues/48)

## 1.9.0

* Upgrade to Babylon@6 (Babel@6)

## 1.8.1

* Delay error notifications until the user clicks the link.

## 1.8.0

* Show Atom Error Notifications when the file can't be parsed.
* Fixed #21 Improved startup time.
  * TimeCop was reporting it took over 600ms to load on my machine. Now it's under 5ms to load.

## 1.7.0

* Closed #34 Jump to import option
  * Following an imported variable takes you to the import statement instead of leaving the current file. You can still use the import statement to navigate between files.

## 1.6.2

* Fixed #38 Fix support for identifiers containing a `$`

## 1.6.0
* Add path navigation for exports [#35](https://github.com/AsaAyers/js-hyperclick/pull/35)
  * `export * from './foo';`
  * `export { x, y } from './bar';`
  * `export default from './baz'`

## 1.5.0
* Add configuration to enable pending panes
* Add configuration for custom module roots.
  * This is configured in your `package.json` because it is project-specific.

## 1.4.0
* Add configuration for alternate file extensions. Use this to make `require(./foo)` pick up `./foo.jsx`

## 1.3.0
* Allow linking to relative files that don't exist yet
* Fixed #6 prevent throwing when a module doesn't resolve

## 1.2.0
* Fixed #2 Make import/require paths into links

## 1.1.5 - function declarations
* Fixed #5: Function declaration parameters weren't linkable

## 1.1.4 - identifiers
* Fixed #4: include `$` as a valid identifier

## 1.1.0 - Imports / Requires
* Jump through `import` / `require()` to where the variable was exported from

## 1.0.0 - First Release
* Link to variables defined in the same file
