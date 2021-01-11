// type IntoReactiveRecord<T> = Reac

import "tracked-built-ins";
import { isObject } from "../utils/predicates";
import { IntoReactive, Reactive } from "./cell";

export type ReactiveObjectSpec = {
  [P in string]: ReactiveObjectSpec | unknown;
};

export type ReactiveObject<
  O extends ReactiveObjectSpec = ReactiveObjectSpec
> = {
  [P in keyof O]: O[P] extends ReactiveObjectSpec
    ? ReactiveObject<O[P]>
    : Reactive<O[P]>;
};

export type IntoReactiveObject<O extends ReactiveObjectSpec> = {
  [P in keyof O]: O[P] extends ReactiveObjectSpec
    ? IntoReactiveObject<O[P]>
    : IntoReactive<O[P]>;
};

type Deref<
  T extends ReactiveObjectSpec,
  K extends keyof T
> = T[K] extends Reactive<infer U>
  ? U
  : T[K] extends ReactiveObjectSpec
  ? ReactiveRecord<T[K]>
  : never;

declare const OBJECT_PROXY: unique symbol;

export type Dict<T extends ReactiveObjectSpec> = {
  [P in keyof T]: DerefProxy<T, P>;
} & { [OBJECT_PROXY]: true };

type DerefProxy<
  T extends ReactiveObjectSpec,
  K extends keyof T
> = T[K] extends Reactive<infer U>
  ? U
  : T[K] extends ReactiveObjectSpec
  ? Dict<T[K]>
  : never;

export class ReactiveRecord<T extends ReactiveObjectSpec> {
  static is(value: unknown): value is ReactiveRecord<ReactiveObjectSpec> {
    return isObject(value) && value instanceof ReactiveRecord;
  }

  static of<T extends ReactiveObjectSpec>(
    object: ReactiveObject<T>
  ): ReactiveRecord<T> {
    return new ReactiveRecord(object);
  }

  #object: ReactiveObject<T>;

  constructor(object: ReactiveObject<T>) {
    this.#object = object;
  }

  get<K extends keyof T>(key: K): Deref<T, K> {
    let value = this.#object[key];

    if (Reactive.is(value)) {
      return value.now as Deref<T, K>;
    } else {
      return new ReactiveRecord(
        value as ReactiveObject<ReactiveObjectSpec>
      ) as Deref<T, K>;
    }
  }
}

export const IS_REACTIVE_PROXY = new WeakSet();

export function isReactiveProxy(value: unknown): value is Dict<ReactiveObject> {
  return isObject(value) && IS_REACTIVE_PROXY.has(value);
}

export function ReactiveProxy<O extends ReactiveObjectSpec>(
  record: ReactiveRecord<O>
): Dict<O> {
  let proxy = new Proxy(
    { record },
    {
      get(target, prop) {
        if (typeof prop === "string") {
          let value = target.record.get(prop);

          if (ReactiveRecord.is(value)) {
            return ReactiveProxy(value);
          } else {
            return value;
          }
        }
      },
    }
  );

  IS_REACTIVE_PROXY.add(proxy);

  return proxy as any;
}
