import type { Modifiers } from "@shimmer/core";
import { defDSL, html } from "@shimmer/dsl";
import type { Reactive } from "@shimmer/reactive";
import { Classes, If } from "../../utils";

export default defDSL(
  ({
    args: { title, initial, isActive },
    attrs,
  }: {
    args: {
      title: Reactive<string>;
      initial: Reactive<string>;
      isActive: Reactive<boolean>;
    };
    attrs: Modifiers;
  }) => {
    return html.aside(
      attrs,
      html.div(
        { class: Classes("avatar", If(isActive, "is-active", null)), title },
        initial
      )
    );
  }
);
