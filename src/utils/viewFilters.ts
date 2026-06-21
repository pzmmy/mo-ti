import type { VaultEntry, ViewDefinition, FilterGroup, FilterNode, FilterCondition, VaultPropertyValue } from '../types'
import { toDateFilterTimestamp } from './filterDates'
import { compileSafeUserRegex } from './safeRegex'
import { evaluateArrayFieldCondition, type ViewFilterArrayKind } from './viewFilterArrayFields'

type FieldScalar = string | number | boolean | null
type ResolvedField =
  | { kind: 'scalar'; value: FieldScalar }
  | { kind: 'array'; values: string[]; arrayKind: ViewFilterArrayKind }
type BuiltInFieldReader = (entry: VaultEntry) => ResolvedField
type TextOp = FilterCondition['op']

/** Built-in field readers for commonly-used vault entry fields. */
const BUILT_IN_FIELD_READERS = new Map<string, BuiltInFieldReader>([
  ['type', (entry) => scalarField(entry.isA)],
  ['isa', (entry) => scalarField(entry.isA)],
  ['status', (entry) => scalarField(entry.status)],
  ['title', (entry) => scalarField(entry.title)],
  ['filename', (entry) => scalarField(entry.filename)],
  ['archived', (entry) => scalarField(entry.archived)],
  ['favorite', (entry) => scalarField(entry.favorite)],
  ['body', (entry) => scalarField(entry.snippet)],
])

/** Evaluate a view's filters against a list of entries, returning only matches. */
export function evaluateView(definition: ViewDefinition, entries: VaultEntry[]): VaultEntry[] {
  return entries.filter((e) => !e.archived && evaluateGroup(definition.filters, e))
}

/** Recursively evaluate a filter group (all/any) against an entry. */
function evaluateGroup(group: FilterGroup, entry: VaultEntry): boolean {
  if ('all' in group) return group.all.every((node) => evaluateNode(node, entry))
  if ('any' in group) return group.any.some((node) => evaluateNode(node, entry))
  return true
}

/** Type guard: check if a filter node is a nested group. */
function isFilterGroup(node: FilterNode): node is FilterGroup {
  return 'all' in node || 'any' in node
}

/** Evaluate a single filter node (group or condition) against an entry. */
function evaluateNode(node: FilterNode, entry: VaultEntry): boolean {
  if (isFilterGroup(node)) return evaluateGroup(node, entry)
  return evaluateCondition(node as FilterCondition, entry)
}

/** Case-insensitive key lookup in a record. */
function findCaseInsensitiveKey(record: Record<string, unknown>, lower: string): string | undefined {
  return Object.keys(record).find((k) => k.toLowerCase() === lower)
}

function scalarField(value: FieldScalar): ResolvedField {
  return { kind: 'scalar', value }
}

function arrayField(values: string[], arrayKind: ViewFilterArrayKind): ResolvedField {
  return { kind: 'array', values, arrayKind }
}

function propertyField(value: VaultPropertyValue): ResolvedField {
  if (Array.isArray(value)) return arrayField(value.map(toFilterString), 'property')
  return scalarField(value)
}

/** Resolve a relationship field from the entry's relationship map. */
function resolveRelationshipField(entry: VaultEntry, lower: string): ResolvedField | null {
  const relKey = findCaseInsensitiveKey(entry.relationships, lower)
  return relKey ? arrayField(Reflect.get(entry.relationships, relKey) as string[], 'relationship') : null
}

/** Resolve a custom property field from the entry's properties map. */
function resolvePropertyField(entry: VaultEntry, lower: string): ResolvedField | null {
  const propKey = findCaseInsensitiveKey(entry.properties, lower)
  return propKey ? propertyField(Reflect.get(entry.properties, propKey) as VaultPropertyValue) : null
}

/** Resolve a field value (built-in, relationship, property, or null) for filtering. */
function resolveField(entry: VaultEntry, field: string): ResolvedField {
  const lower = field.toLowerCase()
  return BUILT_IN_FIELD_READERS.get(lower)?.(entry)
    ?? resolveRelationshipField(entry, lower)
    ?? resolvePropertyField(entry, lower)
    ?? scalarField(null)
}

function toFilterString(v: unknown): string {
  if (v == null) return ''
