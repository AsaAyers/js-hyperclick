// @flow
/* eslint-disable no-unused-vars */

declare var atom: Object;

declare class Subscription {
  dispose(): void;
}

declare module 'atom' {
    declare var Range: any;
    declare class CompositeDisposable{
      add(observable: Subscription): void;
      dispose(): void;
    }
}

declare module 'shell' {
    declare var openExternal: (string) => void
}
