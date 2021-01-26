import {
  createAttr,
  createEffect,
  createElement,
  createMatch,
  createText,
} from "@shimmer/core";
import { Cell, Choice, Reactive, Variants } from "@shimmer/reactive";
import { main, module } from "./context";
import { DOMReporter } from "./ui";

module("core rendering", (test) => {
  test("it can render text", async (ctx) => {
    let body = Cell.of("hello");
    await ctx.render(createText(body), () => ctx.assertHTML("hello"));

    ctx.step("updating cell");

    await ctx.update(
      () => {
        body.update(() => "goodbye");
      },
      () => {
        ctx.assertHTML("goodbye");
      }
    );
  });

  test("a simple element", async (ctx) => {
    let el = createElement({ tag: "div", modifiers: null, body: null });

    await ctx.render(el, () => {
      ctx.assertHTML("<div></div>");
    });
  });

  test("an element with attributes", async (ctx) => {
    let title = Cell.of("Tom");

    let el = createElement({
      tag: "div",
      modifiers: [createAttr("title", title)],
      body: null,
    });

    await ctx.render(el, () => ctx.assertHTML(`<div title="Tom"></div>`));

    await ctx.update(
      () => title.update(() => "Thomas"),
      () => ctx.assertHTML(`<div title="Thomas"></div>`)
    );
  });

  test("an element with classes", async (ctx) => {
    let classA = Cell.of("classa");
    let classB = Cell.of("classb");

    let el = createElement({
      tag: "div",
      modifiers: [createAttr("class", classA), createAttr("class", classB)],
      body: null,
    });

    await ctx.render(el, () =>
      ctx.assertHTML(`<div class="classa classb"></div>`)
    );

    await ctx.update(
      () => classA.update(() => "CLASSA"),
      () => ctx.assertHTML(`<div class="CLASSA classb"></div>`)
    );

    await ctx.update(
      () => classB.update(() => "CLASSB"),
      () => ctx.assertHTML(`<div class="CLASSA CLASSB"></div>`)
    );

    await ctx.update(
      () => {
        classA.update(() => "classa");
        classB.update(() => "classb");
      },
      () => ctx.assertHTML(`<div class="classa classb"></div>`)
    );
  });

  test("an element with a body", async (ctx) => {
    let body = Cell.of("hello");

    let el = createElement({
      tag: "div",
      modifiers: null,
      body: createText(body),
    });

    await ctx.inur(el, `<div>hello</div>`, {
      desc: "update cell",
      update: () => body.update(() => "goodbye"),
      expect: `<div>goodbye</div>`,
    });
  });

  test("a simple choice", async (ctx) => {
    type Bool = {
      true: Choice<"true">;
      false: Choice<"false">;
    };

    const Bool = Variants.define<Bool>();

    let bool = Bool.cell("true");

    let cond = createMatch(bool, {
      true: () => createText(Reactive.static("true")),
      false: () => createText(Reactive.static("false")),
    });

    return ctx.inur(
      cond,
      "true",
      {
        desc: "update cell",
        update: () => bool.update(() => ({ discriminant: "false" })),
        expect: "false",
      },
      {
        desc: "reset cell",
        update: () => {
          bool.update(() => ({ discriminant: "true" }));
        },
        expect: "true",
      }
    );
  });

  test("a choice with values", async (ctx) => {
    type Option = {
      some: Choice<"some", string>;
      none: Choice<"none">;
    };

    const Option = Variants.define<Option>();

    let tom = Cell.of("Tom");
    let tom2 = Cell.of("Tom");

    let person = Option.cell("some", tom);

    let match = createMatch(person, {
      some: ([person]) => createText(person),
      none: () => createText(Reactive.static("no person")),
    });

    return ctx.inur(
      match,
      "Tom",
      {
        desc: "update cell",
        update: () => person.update(() => Option.next("none")),
        expect: "no person",
      },
      {
        desc: "reset cell",
        update: () => person.update(() => Option.next("some", tom2)),
        expect: "Tom",
      },
      {
        desc: "update inner cell",
        update: () => tom2.update(() => "Thomas"),
        expect: "Thomas",
      },
      {
        desc: "reset to original cell",
        update: () => person.update(() => Option.next("some", tom)),
        expect: "Tom",
      },
      {
        desc: "reset to fresh cell",
        update: () => person.update(() => Option.next("some", Cell.of("Tom"))),
        expect: "Tom",
      }
    );
  });

  test("effects", async (ctx) => {
    let count = 0;
    let effectEl: Element | null = null;

    function gotEffect(el: Element) {
      count++;
      effectEl = el;
    }

    let el = createElement({
      tag: "div",
      modifiers: [
        createEffect((el, args: []) => gotEffect(el.asElement()))([]),
      ],
      body: createText(Reactive.static("hello world")),
    });

    await ctx.render(el, () => {
      ctx.assert(count === 1, "the effect was called");
      ctx.assertHTML("hello world", effectEl);
    });
  });
});

main(DOMReporter);
