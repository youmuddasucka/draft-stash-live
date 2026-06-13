#!/usr/bin/env python3
"""Validate every pick file against the template for its declared rules.type.

Strategy: build an allowed-key map from each template, keyed by a "path
signature" (object paths with array indices collapsed to []). Then walk every
real pick file and report any key whose path isn't present in its type's
template. Also flags the documented-but-template-less top-level `pool` field
separately so it isn't reported as noise."""
import json, os, glob, re
from collections import defaultdict

def load_template(fp):
    txt = open(fp).read()
    # templates use bare placeholder values (YYYY, R) that aren't valid JSON
    txt = re.sub(r':\s*YYYY', ': 0', txt)
    txt = re.sub(r':\s*R\b', ': 0', txt)
    return json.loads(txt)

TEAMS = "public/pick-data/teams"
TEMPLATES = "public/pick-data/templates"

# template filename -> rules.type value
TEMPLATE_FILES = {
    "unprotected_pick.json": "unprotected",
    "unpro_swap.json": "unpro_swap",
    "pro_swap.json": "pro_swap",
    "pro_pick.json": "pro_pick",
    "triple_swap.json": "triple_swap",
    "pro_triple_swap.json": "pro_triple_swap",
    "nested_swap.json": "nested_swap",
    "unpro_backup.json": "unpro_backup",
    "cond_alloc_swap.json": "cond_alloc_swap",
    "pro_backup.json": "pro_backup",
    "pro_backup_branched.json": "pro_backup_branched",
}

# Documented optional `pool` overlay (a sibling of `rules`) — see
# templates/pool_overlay.json. Legal alongside any base type, so we register
# `pool` as an allowed top-level key plus its sub-schema for every type.
POOL_ALLOWED_KEYS = {
    "": {"pool"},
    "pool": {"pool_id", "enters_pool_if", "pool_resolution"},
    "pool.enters_pool_if": {"resolves_to", "range"},
    "pool.pool_resolution": {"rank", "to"},
}

def sig(path):
    """collapse a concrete path into a signature: indices -> []"""
    out = []
    for p in path:
        out.append("[]" if isinstance(p, int) else p)
    return ".".join(out)

def collect_allowed(node, path, allowed):
    """Record the set of keys legal at each object path-signature."""
    if isinstance(node, dict):
        s = sig(path)
        allowed[s] |= set(node.keys())
        for k, v in node.items():
            collect_allowed(v, path + [k], allowed)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            collect_allowed(v, path + [i], allowed)

def check(node, path, allowed, problems):
    """Report keys in the real file whose path-sig isn't in allowed."""
    if isinstance(node, dict):
        s = sig(path)
        legal = allowed.get(s)
        if legal is not None:
            for k in node.keys():
                if k not in legal:
                    problems.append(f"unknown key: {s + '.' if s else ''}{k}")
        # if s not in allowed at all, the parent already flagged the branch
        for k, v in node.items():
            check(v, path + [k], allowed, problems)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            check(v, path + [i], allowed, problems)

# Build allowed-key maps per type
type_allowed = {}
for fn, typ in TEMPLATE_FILES.items():
    tmpl = load_template(os.path.join(TEMPLATES, fn))
    allowed = defaultdict(set)
    collect_allowed(tmpl, [], allowed)
    # merge in the optional pool sub-schema for every type
    for k, v in POOL_ALLOWED_KEYS.items():
        allowed[k] |= v
    type_allowed[typ] = allowed

# Walk all pick files
files = sorted(glob.glob(f"{TEAMS}/**/*.json", recursive=True))
by_type = defaultdict(list)
deviations = []          # (path, type, [problems])
special_files = []
missing_type = []

for fp in files:
    try:
        data = json.load(open(fp))
    except Exception as e:
        deviations.append((fp, "PARSE_ERROR", [str(e)]))
        continue
    rules = data.get("rules", {})
    typ = rules.get("type")
    if typ is None:
        missing_type.append(fp)
        continue
    by_type[typ].append(fp)
    if typ == "special":
        special_files.append(fp)
        continue
    allowed = type_allowed.get(typ)
    if allowed is None:
        deviations.append((fp, typ, [f"no template for type '{typ}'"]))
        continue
    problems = []
    check(data, [], allowed, problems)
    if problems:
        deviations.append((fp, typ, sorted(set(problems))))

print(f"Total files: {len(files)}")
print("Counts by type:", dict(sorted(((k, len(v)) for k, v in by_type.items()))))
print(f"\n=== SPECIAL ({len(special_files)}) — expected, no template ===")
for f in special_files:
    print("  ", f.replace(TEAMS + "/", ""))
if missing_type:
    print(f"\n=== MISSING rules.type ({len(missing_type)}) ===")
    for f in missing_type:
        print("  ", f.replace(TEAMS + "/", ""))

print(f"\n=== DEVIATIONS from template ({len(deviations)} files) ===")
for fp, typ, probs in deviations:
    print(f"\n {fp.replace(TEAMS + '/', '')}  [type={typ}]")
    for p in probs:
        print(f"    - {p}")
