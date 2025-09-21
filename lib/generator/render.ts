import Mustache from "mustache";

// Avoid JSX {{}} collision by using alternate delimiters
Mustache.tags = ["<%","%>"];

export function renderTemplate(tpl: string, view: any) {
  return Mustache.render(tpl, view);
}
