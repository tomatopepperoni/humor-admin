/**
 * Week 7: the simple create/read/update/delete pages (terms, generation
 * examples, LLM models, LLM providers, signup domains, whitelisted e-mails)
 * share one table page, one form and one pair of server actions, driven by
 * these definitions. The actions only touch tables listed here and only the
 * fields listed here; RLS (supabase/week7_observability.sql) is the real lock.
 *
 * Plain data only, so the definitions can be passed to client components.
 */

export type Option = { value: string; label: string };

export type Field = {
  name: string;
  label: string;
  kind: "text" | "textarea" | "number" | "bool" | "select";
  required?: boolean;
  placeholder?: string;
  help?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
  mono?: boolean;
  /** select: fixed options, or options loaded from a table */
  options?: Option[] | "chains" | "providers";
  /** select: label of the empty option (only when not required) */
  emptyLabel?: string;
  /** number/select stored as a number (FK ids) */
  numeric?: boolean;
  /** text: lowercased and trimmed before saving */
  lowercase?: boolean;
  /** text: strip a leading "@" (domains) */
  stripAt?: boolean;
  /** default for the create form */
  defaultValue?: string | number | boolean;
  /** half-width in the form grid */
  half?: boolean;
};

export type Column = {
  field: string;
  label: string;
  kind?: "text" | "long" | "mono" | "bool" | "date" | "option" | "number";
  className?: string;
};

export type Resource = {
  key: ResourceKey;
  table: string;
  path: string;
  title: string;
  singular: string;
  intro: string;
  fields: Field[];
  columns: Column[];
  order: { column: string; ascending: boolean }[];
  /** columns searched by the ?q= box */
  search: string[];
  /** friendly text for Postgres errors (unique / FK / check) */
  errors?: Partial<Record<"unique" | "fk" | "check", string>>;
};

export type ResourceKey = "terms" | "examples" | "models" | "providers" | "domains" | "whitelist";

const CATEGORY_OPTIONS: Option[] = [
  { value: "subway", label: "Subway" },
  { value: "nyc", label: "NYC" },
  { value: "campus", label: "Campus" },
  { value: "slang", label: "Slang" },
];

const SOURCE_OPTIONS: Option[] = [
  { value: "admin", label: "Written by an admin" },
  { value: "top-voted", label: "Top-voted caption" },
  { value: "seed", label: "Seed (voice sample)" },
];

export const RESOURCES: Record<ResourceKey, Resource> = {
  terms: {
    key: "terms",
    table: "terms",
    path: "/terms",
    title: "Terms",
    singular: "term",
    intro:
      "NYC, subway and campus vocabulary. Every caption run puts up to 10 active terms (picked at random) into the prompt's Vocabulary step.",
    fields: [
      { name: "term", label: "Term", kind: "text", required: true, maxLength: 80, placeholder: "Bodega cat", half: true },
      { name: "category", label: "Category", kind: "select", options: CATEGORY_OPTIONS, required: true, defaultValue: "nyc", half: true },
      { name: "definition", label: "What it means", kind: "textarea", required: true, maxLength: 300, placeholder: "The cat that lives in the bodega and outranks the customers." },
      { name: "is_active", label: "Active (used in prompts)", kind: "bool", defaultValue: true },
    ],
    columns: [
      { field: "term", label: "Term", className: "font-semibold" },
      { field: "definition", label: "Definition", kind: "long" },
      { field: "category", label: "Category", kind: "option" },
      { field: "is_active", label: "Active", kind: "bool" },
      { field: "updated_at", label: "Updated", kind: "date" },
    ],
    order: [{ column: "category", ascending: true }, { column: "term", ascending: true }],
    search: ["term", "definition"],
    errors: { unique: "That term already exists." },
  },

  examples: {
    key: "examples",
    table: "generation_examples",
    path: "/examples",
    title: "AI generation examples",
    singular: "example",
    intro:
      "Few-shot examples. Each run shows Gemini up to 3 active examples for its voice (plus any marked “Every voice”) as a tone reference. Promote a caption from its page to add it here.",
    fields: [
      { name: "chain_id", label: "Voice", kind: "select", options: "chains", numeric: true, emptyLabel: "Every voice", half: true },
      { name: "source", label: "Source", kind: "select", options: SOURCE_OPTIONS, required: true, defaultValue: "admin", half: true },
      { name: "moment", label: "The moment", kind: "text", required: true, maxLength: 200, placeholder: "Waited 45 minutes in line for one cookie" },
      { name: "caption", label: "Caption", kind: "textarea", required: true, maxLength: 300 },
      { name: "is_active", label: "Active (shown to the model)", kind: "bool", defaultValue: true },
    ],
    columns: [
      { field: "chain_id", label: "Voice", kind: "option" },
      { field: "moment", label: "Moment", kind: "long" },
      { field: "caption", label: "Caption", kind: "long", className: "font-medium" },
      { field: "source", label: "Source", kind: "option" },
      { field: "is_active", label: "Active", kind: "bool" },
    ],
    order: [{ column: "chain_id", ascending: true }, { column: "created_at", ascending: false }],
    search: ["moment", "caption"],
  },

  models: {
    key: "models",
    table: "llm_models",
    path: "/models",
    title: "LLM models",
    singular: "model",
    intro:
      "The models both apps try, lowest priority number first. If one is overloaded or returns unusable output, the next one is tried. Inactive models are skipped.",
    fields: [
      { name: "model_id", label: "API model name", kind: "text", required: true, maxLength: 100, mono: true, placeholder: "gemini-3.6-flash", half: true },
      { name: "display_name", label: "Display name", kind: "text", required: true, maxLength: 80, placeholder: "Gemini 3.6 Flash", half: true },
      { name: "provider_id", label: "Provider", kind: "select", options: "providers", numeric: true, required: true, half: true },
      { name: "priority", label: "Priority (lower runs first)", kind: "number", required: true, min: 0, max: 1000, step: 1, defaultValue: 100, half: true },
      { name: "temperature", label: "Temperature", kind: "number", required: true, min: 0, max: 2, step: 0.05, defaultValue: 1, half: true },
      { name: "max_output_tokens", label: "Max output tokens", kind: "number", required: true, min: 256, max: 65536, step: 1, defaultValue: 8192, half: true, help: "Thinking tokens count toward this. Below ~4000, answers get cut off." },
      { name: "notes", label: "Notes", kind: "textarea", maxLength: 500 },
      { name: "is_active", label: "Active", kind: "bool", defaultValue: true },
    ],
    columns: [
      { field: "priority", label: "Priority", kind: "number" },
      { field: "model_id", label: "Model", kind: "mono", className: "font-medium" },
      { field: "display_name", label: "Name" },
      { field: "provider_id", label: "Provider", kind: "option" },
      { field: "temperature", label: "Temp", kind: "number" },
      { field: "max_output_tokens", label: "Max tokens", kind: "number" },
      { field: "is_active", label: "Active", kind: "bool" },
    ],
    order: [{ column: "priority", ascending: true }, { column: "id", ascending: true }],
    search: ["model_id", "display_name", "notes"],
    errors: { unique: "A model with that API name already exists.", check: "Temperature must be 0–2 and max output tokens 256–65536." },
  },

  providers: {
    key: "providers",
    table: "llm_providers",
    path: "/providers",
    title: "LLM providers",
    singular: "provider",
    intro:
      "Who serves the models. API keys never live in the database, only the name of the environment variable that holds one. The apps have an adapter for the “google” provider; models of other providers are skipped.",
    fields: [
      { name: "slug", label: "Slug", kind: "text", required: true, maxLength: 40, mono: true, lowercase: true, placeholder: "google", half: true, help: "Lowercase letters, numbers and dashes." },
      { name: "name", label: "Name", kind: "text", required: true, maxLength: 80, placeholder: "Google Gemini", half: true },
      { name: "base_url", label: "Base URL", kind: "text", maxLength: 300, mono: true, placeholder: "https://generativelanguage.googleapis.com/v1beta" },
      { name: "api_key_env", label: "API key environment variable", kind: "text", maxLength: 80, mono: true, placeholder: "GEMINI_API_KEY", half: true },
      { name: "is_active", label: "Active", kind: "bool", defaultValue: true },
      { name: "notes", label: "Notes", kind: "textarea", maxLength: 500 },
    ],
    columns: [
      { field: "slug", label: "Slug", kind: "mono", className: "font-medium" },
      { field: "name", label: "Name" },
      { field: "base_url", label: "Base URL", kind: "mono" },
      { field: "api_key_env", label: "Key env var", kind: "mono" },
      { field: "is_active", label: "Active", kind: "bool" },
    ],
    order: [{ column: "slug", ascending: true }],
    search: ["slug", "name"],
    errors: {
      unique: "A provider with that slug already exists.",
      fk: "This provider still has models. Delete them or move them to another provider first.",
      check: "The slug can only use lowercase letters, numbers and dashes.",
    },
  },

  domains: {
    key: "domains",
    table: "allowed_signup_domains",
    path: "/domains",
    title: "Allowed signup domains",
    singular: "domain",
    intro:
      "New accounts on Captioned NYC must use one of these e-mail domains (subdomains count: cs.columbia.edu matches columbia.edu) or a whitelisted address. Existing members are never locked out.",
    fields: [
      { name: "domain", label: "Domain", kind: "text", required: true, maxLength: 120, mono: true, lowercase: true, stripAt: true, placeholder: "columbia.edu", half: true },
      { name: "note", label: "Note", kind: "text", maxLength: 200, placeholder: "Columbia", half: true },
    ],
    columns: [
      { field: "domain", label: "Domain", kind: "mono", className: "font-medium" },
      { field: "note", label: "Note" },
      { field: "created_at", label: "Added", kind: "date" },
    ],
    order: [{ column: "domain", ascending: true }],
    search: ["domain", "note"],
    errors: { unique: "That domain is already allowed.", check: "That doesn't look like a domain (e.g. columbia.edu)." },
  },

  whitelist: {
    key: "whitelist",
    table: "whitelisted_emails",
    path: "/whitelist",
    title: "Whitelisted e-mail addresses",
    singular: "address",
    intro:
      "Single addresses allowed to sign up even though their domain isn't on the list (a PM's Gmail, a guest grader).",
    fields: [
      { name: "email", label: "E-mail address", kind: "text", required: true, maxLength: 200, mono: true, lowercase: true, placeholder: "someone@gmail.com", half: true },
      { name: "note", label: "Note", kind: "text", maxLength: 200, placeholder: "Feedback group PM", half: true },
    ],
    columns: [
      { field: "email", label: "Address", kind: "mono", className: "font-medium" },
      { field: "note", label: "Note" },
      { field: "created_at", label: "Added", kind: "date" },
    ],
    order: [{ column: "email", ascending: true }],
    search: ["email", "note"],
    errors: { unique: "That address is already whitelisted.", check: "That doesn't look like an e-mail address." },
  },
};

export function isResourceKey(k: string): k is ResourceKey {
  return k in RESOURCES;
}
