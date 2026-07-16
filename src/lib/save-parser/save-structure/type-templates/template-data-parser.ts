import { ParseIterator, UnparseIterator } from "../../parser";
import { TypeTemplates } from "../../save-structure/type-templates";
import { parseByType, unparseByType } from "./type-data-parser";

export interface TemplateParser {
  parseByTemplate<T>(templateName: string): ParseIterator<T>;
}
export interface TemplateUnparser {
  unparseByTemplate<T>(templateName: string, value: T): UnparseIterator;
}

// Cache a name -> template map per templates array. The lookup previously did a
// linear `templates.find` on every behavior and every collection element, which
// is O(objects * templates) per parse/unparse pass. The map makes it O(1).
const templateIndexCache = new WeakMap<
  TypeTemplates,
  Map<string, TypeTemplates[number]>
>();

function findTemplate(templates: TypeTemplates, templateName: string) {
  let index = templateIndexCache.get(templates);
  if (!index) {
    index = new Map();
    for (const template of templates) {
      if (!index.has(template.name)) {
        index.set(template.name, template);
      }
    }
    templateIndexCache.set(templates, index);
  }
  return index.get(templateName);
}

export function* parseByTemplate<T>(
  templates: TypeTemplates,
  templateName: string,
): ParseIterator<T> {
  const template = findTemplate(templates, templateName);
  if (!template) {
    throw new Error(`Template "${templateName}" not found.`);
  }

  const result: any = {};

  for (const field of template.fields) {
    const { name, type } = field;
    const value = yield* parseByType(type, templates);
    result[name] = value;
  }

  for (const prop of template.properties) {
    const { name, type } = prop;
    const value = yield* parseByType(type, templates);
    result[name] = value;
  }

  return result;
}

export function* unparseByTemplate<T>(
  templates: TypeTemplates,
  templateName: string,
  obj: T,
): UnparseIterator {
  const template = findTemplate(templates, templateName);
  if (!template) {
    throw new Error(`Template "${templateName}" not found.`);
  }

  for (const field of template.fields) {
    const { name, type } = field;
    const value = (obj as any)[name];
    yield* unparseByType(value, type, templates);
  }

  for (const prop of template.properties) {
    const { name, type } = prop;
    const value = (obj as any)[name];
    yield* unparseByType(value, type, templates);
  }
}
