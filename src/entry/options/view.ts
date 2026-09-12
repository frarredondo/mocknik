/** Anything that can be appended to an element created by {@link el}. */
export type Child = Node | string | null | undefined | false;

/** Declarative properties for {@link el}. */
export interface ElProps {
  class?: string;
  id?: string;
  text?: string;
  attrs?: Readonly<Record<string, string>>;
  on?: Readonly<Record<string, (event: Event) => void>>;
}

/** Creates an HTML element with text, attributes, listeners, and children. */
export function el(tag: string, props?: ElProps, ...children: Child[]): HTMLElement {
  const node = document.createElement(tag);
  if (props?.class !== undefined) node.className = props.class;
  if (props?.id !== undefined) node.id = props.id;
  if (props?.text !== undefined) node.textContent = props.text;
  if (props?.attrs) {
    for (const [name, value] of Object.entries(props.attrs)) {
      node.setAttribute(name, value);
    }
  }
  if (props?.on) {
    for (const [type, listener] of Object.entries(props.on)) {
      node.addEventListener(type, listener);
    }
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child);
  }
  return node;
}

/** Removes every child of an element. */
export function clear(node: HTMLElement): void {
  node.replaceChildren();
}

/** Finds the first element matching `[data-field="name"]` under `root`. */
export function field(root: ParentNode, name: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-field="${name}"]`);
}

/** Finds the first element matching `[data-action="name"]` under `root`. */
export function action(root: ParentNode, name: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-action="${name}"]`);
}
