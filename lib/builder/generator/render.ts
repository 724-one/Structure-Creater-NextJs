import Mustache from "mustache";

// Force alt delimiters to avoid collision with JSX {{}}
Mustache.tags = ["<%","%>"];

export function renderTemplate(tpl: string, view: any) {
  return Mustache.render(tpl, view);
}
