/** Minimal structural view of `chrome.action`. */
export interface ChromeActionLike {
  onClicked: { addListener(listener: (tab: unknown) => void): void };
}

/** Wires the toolbar button click to a fill-all action. */
export function createAction(action: ChromeActionLike, onFillAll: () => void): void {
  action.onClicked.addListener(() => {
    onFillAll();
  });
}
