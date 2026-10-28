import { createRequire } from "node:module";
var __defProp = Object.defineProperty;
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __exportCjs = (target, getters, setters) => {
  for (var name in getters)
    __defProp(target, name, {
      get: getters[name],
      set: setters[name],
      enumerable: true,
      configurable: true
    });
};
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// node_modules/yaml/dist/nodes/identity.js
var require_identity = __commonJS(function(exports) {
  var ALIAS = Symbol.for("yaml.alias");
  var DOC = Symbol.for("yaml.document");
  var MAP = Symbol.for("yaml.map");
  var PAIR = Symbol.for("yaml.pair");
  var SCALAR = Symbol.for("yaml.scalar");
  var SEQ = Symbol.for("yaml.seq");
  var NODE_TYPE = Symbol.for("yaml.node.type");
  var isAlias = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === ALIAS;
  var isDocument = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === DOC;
  var isMap = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === MAP;
  var isPair = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === PAIR;
  var isScalar = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SCALAR;
  var isSeq = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SEQ;
  function isCollection(node) {
    if (node && typeof node === "object")
      switch (node[NODE_TYPE]) {
        case MAP:
        case SEQ:
          return true;
      }
    return false;
  }
  function isNode(node) {
    if (node && typeof node === "object")
      switch (node[NODE_TYPE]) {
        case ALIAS:
        case MAP:
        case SCALAR:
        case SEQ:
          return true;
      }
    return false;
  }
  var hasAnchor = (node) => (isScalar(node) || isCollection(node)) && !!node.anchor;
  exports.ALIAS = ALIAS;
  exports.DOC = DOC;
  exports.MAP = MAP;
  exports.NODE_TYPE = NODE_TYPE;
  exports.PAIR = PAIR;
  exports.SCALAR = SCALAR;
  exports.SEQ = SEQ;
  exports.hasAnchor = hasAnchor;
  exports.isAlias = isAlias;
  exports.isCollection = isCollection;
  exports.isDocument = isDocument;
  exports.isMap = isMap;
  exports.isNode = isNode;
  exports.isPair = isPair;
  exports.isScalar = isScalar;
  exports.isSeq = isSeq;
});

// node_modules/yaml/dist/visit.js
var require_visit = __commonJS(function(exports) {
  var identity = require_identity();
  var BREAK = Symbol("break visit");
  var SKIP = Symbol("skip children");
  var REMOVE = Symbol("remove node");
  function visit(node, visitor) {
    const visitor_ = initVisitor(visitor);
    if (identity.isDocument(node)) {
      const cd = visit_(null, node.contents, visitor_, Object.freeze([node]));
      if (cd === REMOVE)
        node.contents = null;
    } else
      visit_(null, node, visitor_, Object.freeze([]));
  }
  visit.BREAK = BREAK;
  visit.SKIP = SKIP;
  visit.REMOVE = REMOVE;
  function visit_(key, node, visitor, path) {
    const ctrl = callVisitor(key, node, visitor, path);
    if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
      replaceNode(key, path, ctrl);
      return visit_(key, ctrl, visitor, path);
    }
    if (typeof ctrl !== "symbol") {
      if (identity.isCollection(node)) {
        path = Object.freeze(path.concat(node));
        for (let i = 0;i < node.items.length; ++i) {
          const ci = visit_(i, node.items[i], visitor, path);
          if (typeof ci === "number")
            i = ci - 1;
          else if (ci === BREAK)
            return BREAK;
          else if (ci === REMOVE) {
            node.items.splice(i, 1);
            i -= 1;
          }
        }
      } else if (identity.isPair(node)) {
        path = Object.freeze(path.concat(node));
        const ck = visit_("key", node.key, visitor, path);
        if (ck === BREAK)
          return BREAK;
        else if (ck === REMOVE)
          node.key = null;
        const cv = visit_("value", node.value, visitor, path);
        if (cv === BREAK)
          return BREAK;
        else if (cv === REMOVE)
          node.value = null;
      }
    }
    return ctrl;
  }
  async function visitAsync(node, visitor) {
    const visitor_ = initVisitor(visitor);
    if (identity.isDocument(node)) {
      const cd = await visitAsync_(null, node.contents, visitor_, Object.freeze([node]));
      if (cd === REMOVE)
        node.contents = null;
    } else
      await visitAsync_(null, node, visitor_, Object.freeze([]));
  }
  visitAsync.BREAK = BREAK;
  visitAsync.SKIP = SKIP;
  visitAsync.REMOVE = REMOVE;
  async function visitAsync_(key, node, visitor, path) {
    const ctrl = await callVisitor(key, node, visitor, path);
    if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
      replaceNode(key, path, ctrl);
      return visitAsync_(key, ctrl, visitor, path);
    }
    if (typeof ctrl !== "symbol") {
      if (identity.isCollection(node)) {
        path = Object.freeze(path.concat(node));
        for (let i = 0;i < node.items.length; ++i) {
          const ci = await visitAsync_(i, node.items[i], visitor, path);
          if (typeof ci === "number")
            i = ci - 1;
          else if (ci === BREAK)
            return BREAK;
          else if (ci === REMOVE) {
            node.items.splice(i, 1);
            i -= 1;
          }
        }
      } else if (identity.isPair(node)) {
        path = Object.freeze(path.concat(node));
        const ck = await visitAsync_("key", node.key, visitor, path);
        if (ck === BREAK)
          return BREAK;
        else if (ck === REMOVE)
          node.key = null;
        const cv = await visitAsync_("value", node.value, visitor, path);
        if (cv === BREAK)
          return BREAK;
        else if (cv === REMOVE)
          node.value = null;
      }
    }
    return ctrl;
  }
  function initVisitor(visitor) {
    if (typeof visitor === "object" && (visitor.Collection || visitor.Node || visitor.Value)) {
      return Object.assign({
        Alias: visitor.Node,
        Map: visitor.Node,
        Scalar: visitor.Node,
        Seq: visitor.Node
      }, visitor.Value && {
        Map: visitor.Value,
        Scalar: visitor.Value,
        Seq: visitor.Value
      }, visitor.Collection && {
        Map: visitor.Collection,
        Seq: visitor.Collection
      }, visitor);
    }
    return visitor;
  }
  function callVisitor(key, node, visitor, path) {
    if (typeof visitor === "function")
      return visitor(key, node, path);
    if (identity.isMap(node))
      return visitor.Map?.(key, node, path);
    if (identity.isSeq(node))
      return visitor.Seq?.(key, node, path);
    if (identity.isPair(node))
      return visitor.Pair?.(key, node, path);
    if (identity.isScalar(node))
      return visitor.Scalar?.(key, node, path);
    if (identity.isAlias(node))
      return visitor.Alias?.(key, node, path);
    return;
  }
  function replaceNode(key, path, node) {
    const parent = path[path.length - 1];
    if (identity.isCollection(parent)) {
      parent.items[key] = node;
    } else if (identity.isPair(parent)) {
      if (key === "key")
        parent.key = node;
      else
        parent.value = node;
    } else if (identity.isDocument(parent)) {
      parent.contents = node;
    } else {
      const pt = identity.isAlias(parent) ? "alias" : "scalar";
      throw new Error(`Cannot replace node with ${pt} parent`);
    }
  }
  exports.visit = visit;
  exports.visitAsync = visitAsync;
});

// node_modules/yaml/dist/doc/directives.js
var require_directives = __commonJS(function(exports) {
  var identity = require_identity();
  var visit = require_visit();
  var escapeChars = {
    "!": "%21",
    ",": "%2C",
    "[": "%5B",
    "]": "%5D",
    "{": "%7B",
    "}": "%7D"
  };
  var escapeTagName = (tn) => tn.replace(/[!,[\]{}]/g, (ch) => escapeChars[ch]);

  class Directives {
    constructor(yaml, tags) {
      this.docStart = null;
      this.docEnd = false;
      this.yaml = Object.assign({}, Directives.defaultYaml, yaml);
      this.tags = Object.assign({}, Directives.defaultTags, tags);
    }
    clone() {
      const copy = new Directives(this.yaml, this.tags);
      copy.docStart = this.docStart;
      return copy;
    }
    atDocument() {
      const res = new Directives(this.yaml, this.tags);
      switch (this.yaml.version) {
        case "1.1":
          this.atNextDocument = true;
          break;
        case "1.2":
          this.atNextDocument = false;
          this.yaml = {
            explicit: Directives.defaultYaml.explicit,
            version: "1.2"
          };
          this.tags = Object.assign({}, Directives.defaultTags);
          break;
      }
      return res;
    }
    add(line, onError) {
      if (this.atNextDocument) {
        this.yaml = { explicit: Directives.defaultYaml.explicit, version: "1.1" };
        this.tags = Object.assign({}, Directives.defaultTags);
        this.atNextDocument = false;
      }
      const parts = line.trim().split(/[ \t]+/);
      const name = parts.shift();
      switch (name) {
        case "%TAG": {
          if (parts.length !== 2) {
            onError(0, "%TAG directive should contain exactly two parts");
            if (parts.length < 2)
              return false;
          }
          const [handle, prefix] = parts;
          this.tags[handle] = prefix;
          return true;
        }
        case "%YAML": {
          this.yaml.explicit = true;
          if (parts.length !== 1) {
            onError(0, "%YAML directive should contain exactly one part");
            return false;
          }
          const [version] = parts;
          if (version === "1.1" || version === "1.2") {
            this.yaml.version = version;
            return true;
          } else {
            const isValid = /^\d+\.\d+$/.test(version);
            onError(6, `Unsupported YAML version ${version}`, isValid);
            return false;
          }
        }
        default:
          onError(0, `Unknown directive ${name}`, true);
          return false;
      }
    }
    tagName(source, onError) {
      if (source === "!")
        return "!";
      if (source[0] !== "!") {
        onError(`Not a valid tag: ${source}`);
        return null;
      }
      if (source[1] === "<") {
        const verbatim = source.slice(2, -1);
        if (verbatim === "!" || verbatim === "!!") {
          onError(`Verbatim tags aren't resolved, so ${source} is invalid.`);
          return null;
        }
        if (source[source.length - 1] !== ">")
          onError("Verbatim tags must end with a >");
        return verbatim;
      }
      const [, handle, suffix] = source.match(/^(.*!)([^!]*)$/s);
      if (!suffix)
        onError(`The ${source} tag has no suffix`);
      const prefix = this.tags[handle];
      if (prefix) {
        try {
          return prefix + decodeURIComponent(suffix);
        } catch (error) {
          onError(String(error));
          return null;
        }
      }
      if (handle === "!")
        return source;
      onError(`Could not resolve tag: ${source}`);
      return null;
    }
    tagString(tag) {
      for (const [handle, prefix] of Object.entries(this.tags)) {
        if (tag.startsWith(prefix))
          return handle + escapeTagName(tag.substring(prefix.length));
      }
      return tag[0] === "!" ? tag : `!<${tag}>`;
    }
    toString(doc) {
      const lines = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [];
      const tagEntries = Object.entries(this.tags);
      let tagNames;
      if (doc && tagEntries.length > 0 && identity.isNode(doc.contents)) {
        const tags = {};
        visit.visit(doc.contents, (_key, node) => {
          if (identity.isNode(node) && node.tag)
            tags[node.tag] = true;
        });
        tagNames = Object.keys(tags);
      } else
        tagNames = [];
      for (const [handle, prefix] of tagEntries) {
        if (handle === "!!" && prefix === "tag:yaml.org,2002:")
          continue;
        if (!doc || tagNames.some((tn) => tn.startsWith(prefix)))
          lines.push(`%TAG ${handle} ${prefix}`);
      }
      return lines.join(`
`);
    }
  }
  Directives.defaultYaml = { explicit: false, version: "1.2" };
  Directives.defaultTags = { "!!": "tag:yaml.org,2002:" };
  exports.Directives = Directives;
});

// node_modules/yaml/dist/doc/anchors.js
var require_anchors = __commonJS(function(exports) {
  var identity = require_identity();
  var visit = require_visit();
  function anchorIsValid(anchor) {
    if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
      const sa = JSON.stringify(anchor);
      const msg = `Anchor must not contain whitespace or control characters: ${sa}`;
      throw new Error(msg);
    }
    return true;
  }
  function anchorNames(root) {
    const anchors = new Set;
    visit.visit(root, {
      Value(_key, node) {
        if (node.anchor)
          anchors.add(node.anchor);
      }
    });
    return anchors;
  }
  function findNewAnchor(prefix, exclude) {
    for (let i = 1;; ++i) {
      const name = `${prefix}${i}`;
      if (!exclude.has(name))
        return name;
    }
  }
  function createNodeAnchors(doc, prefix) {
    const aliasObjects = [];
    const sourceObjects = new Map;
    let prevAnchors = null;
    return {
      onAnchor: (source) => {
        aliasObjects.push(source);
        prevAnchors ?? (prevAnchors = anchorNames(doc));
        const anchor = findNewAnchor(prefix, prevAnchors);
        prevAnchors.add(anchor);
        return anchor;
      },
      setAnchors: () => {
        for (const source of aliasObjects) {
          const ref = sourceObjects.get(source);
          if (typeof ref === "object" && ref.anchor && (identity.isScalar(ref.node) || identity.isCollection(ref.node))) {
            ref.node.anchor = ref.anchor;
          } else {
            const error = new Error("Failed to resolve repeated object (this should not happen)");
            error.source = source;
            throw error;
          }
        }
      },
      sourceObjects
    };
  }
  exports.anchorIsValid = anchorIsValid;
  exports.anchorNames = anchorNames;
  exports.createNodeAnchors = createNodeAnchors;
  exports.findNewAnchor = findNewAnchor;
});

// node_modules/yaml/dist/doc/applyReviver.js
var require_applyReviver = __commonJS(function(exports) {
  function applyReviver(reviver, obj, key, val) {
    if (val && typeof val === "object") {
      if (Array.isArray(val)) {
        for (let i = 0, len = val.length;i < len; ++i) {
          const v0 = val[i];
          const v1 = applyReviver(reviver, val, String(i), v0);
          if (v1 === undefined)
            delete val[i];
          else if (v1 !== v0)
            val[i] = v1;
        }
      } else if (val instanceof Map) {
        for (const k of Array.from(val.keys())) {
          const v0 = val.get(k);
          const v1 = applyReviver(reviver, val, k, v0);
          if (v1 === undefined)
            val.delete(k);
          else if (v1 !== v0)
            val.set(k, v1);
        }
      } else if (val instanceof Set) {
        for (const v0 of Array.from(val)) {
          const v1 = applyReviver(reviver, val, v0, v0);
          if (v1 === undefined)
            val.delete(v0);
          else if (v1 !== v0) {
            val.delete(v0);
            val.add(v1);
          }
        }
      } else {
        for (const [k, v0] of Object.entries(val)) {
          const v1 = applyReviver(reviver, val, k, v0);
          if (v1 === undefined)
            delete val[k];
          else if (v1 !== v0)
            val[k] = v1;
        }
      }
    }
    return reviver.call(obj, key, val);
  }
  exports.applyReviver = applyReviver;
});

// node_modules/yaml/dist/nodes/toJS.js
var require_toJS = __commonJS(function(exports) {
  var identity = require_identity();
  function toJS(value, arg, ctx) {
    if (Array.isArray(value))
      return value.map((v, i) => toJS(v, String(i), ctx));
    if (value && typeof value.toJSON === "function") {
      if (!ctx || !identity.hasAnchor(value))
        return value.toJSON(arg, ctx);
      const data = { aliasCount: 0, count: 1, res: undefined };
      ctx.anchors.set(value, data);
      ctx.onCreate = (res) => {
        data.res = res;
        delete ctx.onCreate;
      };
      const res = value.toJSON(arg, ctx);
      if (ctx.onCreate)
        ctx.onCreate(res);
      return res;
    }
    if (typeof value === "bigint" && !ctx?.keep)
      return Number(value);
    return value;
  }
  exports.toJS = toJS;
});

// node_modules/yaml/dist/nodes/Node.js
var require_Node = __commonJS(function(exports) {
  var applyReviver = require_applyReviver();
  var identity = require_identity();
  var toJS = require_toJS();

  class NodeBase {
    constructor(type) {
      Object.defineProperty(this, identity.NODE_TYPE, { value: type });
    }
    clone() {
      const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
      if (this.range)
        copy.range = this.range.slice();
      return copy;
    }
    toJS(doc, { mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
      if (!identity.isDocument(doc))
        throw new TypeError("A document argument is required");
      const ctx = {
        anchors: new Map,
        doc,
        keep: true,
        mapAsMap: mapAsMap === true,
        mapKeyWarned: false,
        maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
      };
      const res = toJS.toJS(this, "", ctx);
      if (typeof onAnchor === "function")
        for (const { count, res } of ctx.anchors.values())
          onAnchor(res, count);
      return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
    }
  }
  exports.NodeBase = NodeBase;
});

// node_modules/yaml/dist/nodes/Alias.js
var require_Alias = __commonJS(function(exports) {
  var anchors = require_anchors();
  var visit = require_visit();
  var identity = require_identity();
  var Node = require_Node();
  var toJS = require_toJS();

  class Alias extends Node.NodeBase {
    constructor(source) {
      super(identity.ALIAS);
      this.source = source;
      Object.defineProperty(this, "tag", {
        set() {
          throw new Error("Alias nodes cannot have tags");
        }
      });
    }
    resolve(doc, ctx) {
      if (ctx?.maxAliasCount === 0)
        throw new ReferenceError("Alias resolution is disabled");
      let nodes;
      if (ctx?.aliasResolveCache) {
        nodes = ctx.aliasResolveCache;
      } else {
        nodes = [];
        visit.visit(doc, {
          Node: (_key, node) => {
            if (identity.isAlias(node) || identity.hasAnchor(node))
              nodes.push(node);
          }
        });
        if (ctx)
          ctx.aliasResolveCache = nodes;
      }
      let found = undefined;
      for (const node of nodes) {
        if (node === this)
          break;
        if (node.anchor === this.source)
          found = node;
      }
      if (found && ctx) {
        const { anchors, doc, maxAliasCount } = ctx;
        let data = anchors.get(found);
        if (!data) {
          toJS.toJS(found, null, ctx);
          data = anchors.get(found);
        }
        if (data?.res === undefined) {
          const msg = "This should not happen: Alias anchor was not resolved?";
          throw new ReferenceError(msg);
        }
        if (maxAliasCount >= 0) {
          data.count += 1;
          if (data.aliasCount === 0)
            data.aliasCount = getAliasCount(doc, found, anchors);
          if (data.count * data.aliasCount > maxAliasCount) {
            const msg = "Excessive alias count indicates a resource exhaustion attack";
            throw new ReferenceError(msg);
          }
        }
      }
      return found;
    }
    toJSON(_arg, ctx) {
      if (!ctx)
        return { source: this.source };
      const source = this.resolve(ctx.doc, ctx);
      if (!source) {
        const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
        throw new ReferenceError(msg);
      }
      return ctx.anchors.get(source).res;
    }
    toString(ctx, _onComment, _onChompKeep) {
      const src = `*${this.source}`;
      if (ctx) {
        anchors.anchorIsValid(this.source);
        if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
          const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
          throw new Error(msg);
        }
        if (ctx.implicitKey)
          return `${src} `;
      }
      return src;
    }
  }
  function getAliasCount(doc, node, anchors) {
    if (identity.isAlias(node)) {
      const source = node.resolve(doc);
      const anchor = anchors && source && anchors.get(source);
      return anchor ? anchor.count * anchor.aliasCount : 0;
    } else if (identity.isCollection(node)) {
      let count = 0;
      for (const item of node.items) {
        const c = getAliasCount(doc, item, anchors);
        if (c > count)
          count = c;
      }
      return count;
    } else if (identity.isPair(node)) {
      const kc = getAliasCount(doc, node.key, anchors);
      const vc = getAliasCount(doc, node.value, anchors);
      return Math.max(kc, vc);
    }
    return 1;
  }
  exports.Alias = Alias;
});

// node_modules/yaml/dist/nodes/Scalar.js
var require_Scalar = __commonJS(function(exports) {
  var identity = require_identity();
  var Node = require_Node();
  var toJS = require_toJS();
  var isScalarValue = (value) => !value || typeof value !== "function" && typeof value !== "object";

  class Scalar extends Node.NodeBase {
    constructor(value) {
      super(identity.SCALAR);
      this.value = value;
    }
    toJSON(arg, ctx) {
      return ctx?.keep ? this.value : toJS.toJS(this.value, arg, ctx);
    }
    toString() {
      return String(this.value);
    }
  }
  Scalar.BLOCK_FOLDED = "BLOCK_FOLDED";
  Scalar.BLOCK_LITERAL = "BLOCK_LITERAL";
  Scalar.PLAIN = "PLAIN";
  Scalar.QUOTE_DOUBLE = "QUOTE_DOUBLE";
  Scalar.QUOTE_SINGLE = "QUOTE_SINGLE";
  exports.Scalar = Scalar;
  exports.isScalarValue = isScalarValue;
});

// node_modules/yaml/dist/doc/createNode.js
var require_createNode = __commonJS(function(exports) {
  var Alias = require_Alias();
  var identity = require_identity();
  var Scalar = require_Scalar();
  var defaultTagPrefix = "tag:yaml.org,2002:";
  function findTagObject(value, tagName, tags) {
    if (tagName) {
      const match = tags.filter((t) => t.tag === tagName);
      const tagObj = match.find((t) => !t.format) ?? match[0];
      if (!tagObj)
        throw new Error(`Tag ${tagName} not found`);
      return tagObj;
    }
    return tags.find((t) => t.identify?.(value) && !t.format);
  }
  function createNode(value, tagName, ctx) {
    if (identity.isDocument(value))
      value = value.contents;
    if (identity.isNode(value))
      return value;
    if (identity.isPair(value)) {
      const map = ctx.schema[identity.MAP].createNode?.(ctx.schema, null, ctx);
      map.items.push(value);
      return map;
    }
    if (value instanceof String || value instanceof Number || value instanceof Boolean || typeof BigInt !== "undefined" && value instanceof BigInt) {
      value = value.valueOf();
    }
    const { aliasDuplicateObjects, onAnchor, onTagObj, schema, sourceObjects } = ctx;
    let ref = undefined;
    if (aliasDuplicateObjects && value && typeof value === "object") {
      ref = sourceObjects.get(value);
      if (ref) {
        ref.anchor ?? (ref.anchor = onAnchor(value));
        return new Alias.Alias(ref.anchor);
      } else {
        ref = { anchor: null, node: null };
        sourceObjects.set(value, ref);
      }
    }
    if (tagName?.startsWith("!!"))
      tagName = defaultTagPrefix + tagName.slice(2);
    let tagObj = findTagObject(value, tagName, schema.tags);
    if (!tagObj) {
      if (value && typeof value.toJSON === "function") {
        value = value.toJSON();
      }
      if (!value || typeof value !== "object") {
        const node = new Scalar.Scalar(value);
        if (ref)
          ref.node = node;
        return node;
      }
      tagObj = value instanceof Map ? schema[identity.MAP] : (Symbol.iterator in Object(value)) ? schema[identity.SEQ] : schema[identity.MAP];
    }
    if (onTagObj) {
      onTagObj(tagObj);
      delete ctx.onTagObj;
    }
    const node = tagObj?.createNode ? tagObj.createNode(ctx.schema, value, ctx) : typeof tagObj?.nodeClass?.from === "function" ? tagObj.nodeClass.from(ctx.schema, value, ctx) : new Scalar.Scalar(value);
    if (tagName)
      node.tag = tagName;
    else if (!tagObj.default)
      node.tag = tagObj.tag;
    if (ref)
      ref.node = node;
    return node;
  }
  exports.createNode = createNode;
});

// node_modules/yaml/dist/nodes/Collection.js
var require_Collection = __commonJS(function(exports) {
  var createNode = require_createNode();
  var identity = require_identity();
  var Node = require_Node();
  function collectionFromPath(schema, path, value) {
    let v = value;
    for (let i = path.length - 1;i >= 0; --i) {
      const k = path[i];
      if (typeof k === "number" && Number.isInteger(k) && k >= 0) {
        const a = [];
        a[k] = v;
        v = a;
      } else {
        v = new Map([[k, v]]);
      }
    }
    return createNode.createNode(v, undefined, {
      aliasDuplicateObjects: false,
      keepUndefined: false,
      onAnchor: () => {
        throw new Error("This should not happen, please report a bug.");
      },
      schema,
      sourceObjects: new Map
    });
  }
  var isEmptyPath = (path) => path == null || typeof path === "object" && !!path[Symbol.iterator]().next().done;

  class Collection extends Node.NodeBase {
    constructor(type, schema) {
      super(type);
      Object.defineProperty(this, "schema", {
        value: schema,
        configurable: true,
        enumerable: false,
        writable: true
      });
    }
    clone(schema) {
      const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
      if (schema)
        copy.schema = schema;
      copy.items = copy.items.map((it) => identity.isNode(it) || identity.isPair(it) ? it.clone(schema) : it);
      if (this.range)
        copy.range = this.range.slice();
      return copy;
    }
    addIn(path, value) {
      if (isEmptyPath(path))
        this.add(value);
      else {
        const [key, ...rest] = path;
        const node = this.get(key, true);
        if (identity.isCollection(node))
          node.addIn(rest, value);
        else if (node === undefined && this.schema)
          this.set(key, collectionFromPath(this.schema, rest, value));
        else
          throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
      }
    }
    deleteIn(path) {
      const [key, ...rest] = path;
      if (rest.length === 0)
        return this.delete(key);
      const node = this.get(key, true);
      if (identity.isCollection(node))
        return node.deleteIn(rest);
      else
        throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
    }
    getIn(path, keepScalar) {
      const [key, ...rest] = path;
      const node = this.get(key, true);
      if (rest.length === 0)
        return !keepScalar && identity.isScalar(node) ? node.value : node;
      else
        return identity.isCollection(node) ? node.getIn(rest, keepScalar) : undefined;
    }
    hasAllNullValues(allowScalar) {
      return this.items.every((node) => {
        if (!identity.isPair(node))
          return false;
        const n = node.value;
        return n == null || allowScalar && identity.isScalar(n) && n.value == null && !n.commentBefore && !n.comment && !n.tag;
      });
    }
    hasIn(path) {
      const [key, ...rest] = path;
      if (rest.length === 0)
        return this.has(key);
      const node = this.get(key, true);
      return identity.isCollection(node) ? node.hasIn(rest) : false;
    }
    setIn(path, value) {
      const [key, ...rest] = path;
      if (rest.length === 0) {
        this.set(key, value);
      } else {
        const node = this.get(key, true);
        if (identity.isCollection(node))
          node.setIn(rest, value);
        else if (node === undefined && this.schema)
          this.set(key, collectionFromPath(this.schema, rest, value));
        else
          throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
      }
    }
  }
  exports.Collection = Collection;
  exports.collectionFromPath = collectionFromPath;
  exports.isEmptyPath = isEmptyPath;
});

// node_modules/yaml/dist/stringify/stringifyComment.js
var require_stringifyComment = __commonJS(function(exports) {
  var stringifyComment = (str) => str.replace(/^(?!$)(?: $)?/gm, "#");
  function indentComment(comment, indent) {
    if (/^\n+$/.test(comment))
      return comment.substring(1);
    return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
  }
  var lineComment = (str, indent, comment) => str.endsWith(`
`) ? indentComment(comment, indent) : comment.includes(`
`) ? `
` + indentComment(comment, indent) : (str.endsWith(" ") ? "" : " ") + comment;
  exports.indentComment = indentComment;
  exports.lineComment = lineComment;
  exports.stringifyComment = stringifyComment;
});

// node_modules/yaml/dist/stringify/foldFlowLines.js
var require_foldFlowLines = __commonJS(function(exports) {
  var FOLD_FLOW = "flow";
  var FOLD_BLOCK = "block";
  var FOLD_QUOTED = "quoted";
  function foldFlowLines(text, indent, mode = "flow", { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
    if (!lineWidth || lineWidth < 0)
      return text;
    if (lineWidth < minContentWidth)
      minContentWidth = 0;
    const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
    if (text.length <= endStep)
      return text;
    const folds = [];
    const escapedFolds = {};
    let end = lineWidth - indent.length;
    if (typeof indentAtStart === "number") {
      if (indentAtStart > lineWidth - Math.max(2, minContentWidth))
        folds.push(0);
      else
        end = lineWidth - indentAtStart;
    }
    let split = undefined;
    let prev = undefined;
    let overflow = false;
    let i = -1;
    let escStart = -1;
    let escEnd = -1;
    if (mode === FOLD_BLOCK) {
      i = consumeMoreIndentedLines(text, i, indent.length);
      if (i !== -1)
        end = i + endStep;
    }
    for (let ch;ch = text[i += 1]; ) {
      if (mode === FOLD_QUOTED && ch === "\\") {
        escStart = i;
        switch (text[i + 1]) {
          case "x":
            i += 3;
            break;
          case "u":
            i += 5;
            break;
          case "U":
            i += 9;
            break;
          default:
            i += 1;
        }
        escEnd = i;
      }
      if (ch === `
`) {
        if (mode === FOLD_BLOCK)
          i = consumeMoreIndentedLines(text, i, indent.length);
        end = i + indent.length + endStep;
        split = undefined;
      } else {
        if (ch === " " && prev && prev !== " " && prev !== `
` && prev !== "\t") {
          const next = text[i + 1];
          if (next && next !== " " && next !== `
` && next !== "\t")
            split = i;
        }
        if (i >= end) {
          if (split) {
            folds.push(split);
            end = split + endStep;
            split = undefined;
          } else if (mode === FOLD_QUOTED) {
            while (prev === " " || prev === "\t") {
              prev = ch;
              ch = text[i += 1];
              overflow = true;
            }
            const j = i > escEnd + 1 ? i - 2 : escStart - 1;
            if (escapedFolds[j])
              return text;
            folds.push(j);
            escapedFolds[j] = true;
            end = j + endStep;
            split = undefined;
          } else {
            overflow = true;
          }
        }
      }
      prev = ch;
    }
    if (overflow && onOverflow)
      onOverflow();
    if (folds.length === 0)
      return text;
    if (onFold)
      onFold();
    let res = text.slice(0, folds[0]);
    for (let i = 0;i < folds.length; ++i) {
      const fold = folds[i];
      const end = folds[i + 1] || text.length;
      if (fold === 0)
        res = `
${indent}${text.slice(0, end)}`;
      else {
        if (mode === FOLD_QUOTED && escapedFolds[fold])
          res += `${text[fold]}\\`;
        res += `
${indent}${text.slice(fold + 1, end)}`;
      }
    }
    return res;
  }
  function consumeMoreIndentedLines(text, i, indent) {
    let end = i;
    let start = i + 1;
    let ch = text[start];
    while (ch === " " || ch === "\t") {
      if (i < start + indent) {
        ch = text[++i];
      } else {
        do {
          ch = text[++i];
        } while (ch && ch !== `
`);
        end = i;
        start = i + 1;
        ch = text[start];
      }
    }
    return end;
  }
  exports.FOLD_BLOCK = FOLD_BLOCK;
  exports.FOLD_FLOW = FOLD_FLOW;
  exports.FOLD_QUOTED = FOLD_QUOTED;
  exports.foldFlowLines = foldFlowLines;
});

// node_modules/yaml/dist/stringify/stringifyString.js
var require_stringifyString = __commonJS(function(exports) {
  var Scalar = require_Scalar();
  var foldFlowLines = require_foldFlowLines();
  var getFoldOptions = (ctx, isBlock) => ({
    indentAtStart: isBlock ? ctx.indent.length : ctx.indentAtStart,
    lineWidth: ctx.options.lineWidth,
    minContentWidth: ctx.options.minContentWidth
  });
  var containsDocumentMarker = (str) => /^(%|---|\.\.\.)/m.test(str);
  function lineLengthOverLimit(str, lineWidth, indentLength) {
    if (!lineWidth || lineWidth < 0)
      return false;
    const limit = lineWidth - indentLength;
    const strLen = str.length;
    if (strLen <= limit)
      return false;
    for (let i = 0, start = 0;i < strLen; ++i) {
      if (str[i] === `
`) {
        if (i - start > limit)
          return true;
        start = i + 1;
        if (strLen - start <= limit)
          return false;
      }
    }
    return true;
  }
  function doubleQuotedString(value, ctx) {
    const json = JSON.stringify(value);
    if (ctx.options.doubleQuotedAsJSON)
      return json;
    const { implicitKey } = ctx;
    const minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
    const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
    let str = "";
    let start = 0;
    for (let i = 0, ch = json[i];ch; ch = json[++i]) {
      if (ch === " " && json[i + 1] === "\\" && json[i + 2] === "n") {
        str += json.slice(start, i) + "\\ ";
        i += 1;
        start = i;
        ch = "\\";
      }
      if (ch === "\\")
        switch (json[i + 1]) {
          case "u":
            {
              str += json.slice(start, i);
              const code = json.substr(i + 2, 4);
              switch (code) {
                case "0000":
                  str += "\\0";
                  break;
                case "0007":
                  str += "\\a";
                  break;
                case "000b":
                  str += "\\v";
                  break;
                case "001b":
                  str += "\\e";
                  break;
                case "0085":
                  str += "\\N";
                  break;
                case "00a0":
                  str += "\\_";
                  break;
                case "2028":
                  str += "\\L";
                  break;
                case "2029":
                  str += "\\P";
                  break;
                default:
                  if (code.substr(0, 2) === "00")
                    str += "\\x" + code.substr(2);
                  else
                    str += json.substr(i, 6);
              }
              i += 5;
              start = i + 1;
            }
            break;
          case "n":
            if (implicitKey || json[i + 2] === '"' || json.length < minMultiLineLength) {
              i += 1;
            } else {
              str += json.slice(start, i) + `

`;
              while (json[i + 2] === "\\" && json[i + 3] === "n" && json[i + 4] !== '"') {
                str += `
`;
                i += 2;
              }
              str += indent;
              if (json[i + 2] === " ")
                str += "\\";
              i += 1;
              start = i + 1;
            }
            break;
          default:
            i += 1;
        }
    }
    str = start ? str + json.slice(start) : json;
    return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_QUOTED, getFoldOptions(ctx, false));
  }
  function singleQuotedString(value, ctx) {
    if (ctx.options.singleQuote === false || ctx.implicitKey && value.includes(`
`) || /[ \t]\n|\n[ \t]/.test(value))
      return doubleQuotedString(value, ctx);
    const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
    const res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&
${indent}`) + "'";
    return ctx.implicitKey ? res : foldFlowLines.foldFlowLines(res, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
  }
  function quotedString(value, ctx) {
    const { singleQuote } = ctx.options;
    let qs;
    if (singleQuote === false)
      qs = doubleQuotedString;
    else {
      const hasDouble = value.includes('"');
      const hasSingle = value.includes("'");
      if (hasDouble && !hasSingle)
        qs = singleQuotedString;
      else if (hasSingle && !hasDouble)
        qs = doubleQuotedString;
      else
        qs = singleQuote ? singleQuotedString : doubleQuotedString;
    }
    return qs(value, ctx);
  }
  var blockEndNewlines;
  try {
    blockEndNewlines = new RegExp(`(^|(?<!
))
+(?!
|$)`, "g");
  } catch {
    blockEndNewlines = /\n+(?!\n|$)/g;
  }
  function blockString({ comment, type, value }, ctx, onComment, onChompKeep) {
    const { blockQuote, commentString, lineWidth } = ctx.options;
    if (!blockQuote || /\n[\t ]+$/.test(value)) {
      return quotedString(value, ctx);
    }
    const indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? "  " : "");
    const literal = blockQuote === "literal" ? true : blockQuote === "folded" || type === Scalar.Scalar.BLOCK_FOLDED ? false : type === Scalar.Scalar.BLOCK_LITERAL ? true : !lineLengthOverLimit(value, lineWidth, indent.length);
    if (!value)
      return literal ? `|
` : `>
`;
    let chomp;
    let endStart;
    for (endStart = value.length;endStart > 0; --endStart) {
      const ch = value[endStart - 1];
      if (ch !== `
` && ch !== "\t" && ch !== " ")
        break;
    }
    let end = value.substring(endStart);
    const endNlPos = end.indexOf(`
`);
    if (endNlPos === -1) {
      chomp = "-";
    } else if (value === end || endNlPos !== end.length - 1) {
      chomp = "+";
      if (onChompKeep)
        onChompKeep();
    } else {
      chomp = "";
    }
    if (end) {
      value = value.slice(0, -end.length);
      if (end[end.length - 1] === `
`)
        end = end.slice(0, -1);
      end = end.replace(blockEndNewlines, `$&${indent}`);
    }
    let startWithSpace = false;
    let startEnd;
    let startNlPos = -1;
    for (startEnd = 0;startEnd < value.length; ++startEnd) {
      const ch = value[startEnd];
      if (ch === " ")
        startWithSpace = true;
      else if (ch === `
`)
        startNlPos = startEnd;
      else
        break;
    }
    let start = value.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);
    if (start) {
      value = value.substring(start.length);
      start = start.replace(/\n+/g, `$&${indent}`);
    }
    const indentSize = indent ? "2" : "1";
    let header = (startWithSpace ? indentSize : "") + chomp;
    if (comment) {
      header += " " + commentString(comment.replace(/ ?[\r\n]+/g, " "));
      if (onComment)
        onComment();
    }
    if (!literal) {
      const foldedValue = value.replace(/\n+/g, `
$&`).replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${indent}`);
      let literalFallback = false;
      const foldOptions = getFoldOptions(ctx, true);
      if (blockQuote !== "folded" && type !== Scalar.Scalar.BLOCK_FOLDED) {
        foldOptions.onOverflow = () => {
          literalFallback = true;
        };
      }
      const body = foldFlowLines.foldFlowLines(`${start}${foldedValue}${end}`, indent, foldFlowLines.FOLD_BLOCK, foldOptions);
      if (!literalFallback)
        return `>${header}
${indent}${body}`;
    }
    value = value.replace(/\n+/g, `$&${indent}`);
    return `|${header}
${indent}${start}${value}${end}`;
  }
  function plainString(item, ctx, onComment, onChompKeep) {
    const { type, value } = item;
    const { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
    if (implicitKey && value.includes(`
`) || inFlow && /[[\]{},]/.test(value)) {
      return quotedString(value, ctx);
    }
    if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) {
      return implicitKey || inFlow || !value.includes(`
`) ? quotedString(value, ctx) : blockString(item, ctx, onComment, onChompKeep);
    }
    if (!implicitKey && !inFlow && type !== Scalar.Scalar.PLAIN && value.includes(`
`)) {
      return blockString(item, ctx, onComment, onChompKeep);
    }
    if (containsDocumentMarker(value)) {
      if (indent === "") {
        ctx.forceBlockIndent = true;
        return blockString(item, ctx, onComment, onChompKeep);
      } else if (implicitKey && indent === indentStep) {
        return quotedString(value, ctx);
      }
    }
    const str = value.replace(/\n+/g, `$&
${indent}`);
    if (actualString) {
      const test = (tag) => tag.default && tag.tag !== "tag:yaml.org,2002:str" && tag.test?.test(str);
      const { compat, tags } = ctx.doc.schema;
      if (tags.some(test) || compat?.some(test))
        return quotedString(value, ctx);
    }
    return implicitKey ? str : foldFlowLines.foldFlowLines(str, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
  }
  function stringifyString(item, ctx, onComment, onChompKeep) {
    const { implicitKey, inFlow } = ctx;
    const ss = typeof item.value === "string" ? item : Object.assign({}, item, { value: String(item.value) });
    let { type } = item;
    if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
      if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value))
        type = Scalar.Scalar.QUOTE_DOUBLE;
    }
    const _stringify = (_type) => {
      switch (_type) {
        case Scalar.Scalar.BLOCK_FOLDED:
        case Scalar.Scalar.BLOCK_LITERAL:
          return implicitKey || inFlow ? quotedString(ss.value, ctx) : blockString(ss, ctx, onComment, onChompKeep);
        case Scalar.Scalar.QUOTE_DOUBLE:
          return doubleQuotedString(ss.value, ctx);
        case Scalar.Scalar.QUOTE_SINGLE:
          return singleQuotedString(ss.value, ctx);
        case Scalar.Scalar.PLAIN:
          return plainString(ss, ctx, onComment, onChompKeep);
        default:
          return null;
      }
    };
    let res = _stringify(type);
    if (res === null) {
      const { defaultKeyType, defaultStringType } = ctx.options;
      const t = implicitKey && defaultKeyType || defaultStringType;
      res = _stringify(t);
      if (res === null)
        throw new Error(`Unsupported default string type ${t}`);
    }
    return res;
  }
  exports.stringifyString = stringifyString;
});

// node_modules/yaml/dist/stringify/stringify.js
var require_stringify = __commonJS(function(exports) {
  var anchors = require_anchors();
  var identity = require_identity();
  var stringifyComment = require_stringifyComment();
  var stringifyString = require_stringifyString();
  function createStringifyContext(doc, options) {
    const opt = Object.assign({
      blockQuote: true,
      commentString: stringifyComment.stringifyComment,
      defaultKeyType: null,
      defaultStringType: "PLAIN",
      directives: null,
      doubleQuotedAsJSON: false,
      doubleQuotedMinMultiLineLength: 40,
      falseStr: "false",
      flowCollectionPadding: true,
      indentSeq: true,
      lineWidth: 80,
      minContentWidth: 20,
      nullStr: "null",
      simpleKeys: false,
      singleQuote: null,
      trailingComma: false,
      trueStr: "true",
      verifyAliasOrder: true
    }, doc.schema.toStringOptions, options);
    let inFlow;
    switch (opt.collectionStyle) {
      case "block":
        inFlow = false;
        break;
      case "flow":
        inFlow = true;
        break;
      default:
        inFlow = null;
    }
    return {
      anchors: new Set,
      doc,
      flowCollectionPadding: opt.flowCollectionPadding ? " " : "",
      indent: "",
      indentStep: typeof opt.indent === "number" ? " ".repeat(opt.indent) : "  ",
      inFlow,
      options: opt
    };
  }
  function getTagObject(tags, item) {
    if (item.tag) {
      const match = tags.filter((t) => t.tag === item.tag);
      if (match.length > 0)
        return match.find((t) => t.format === item.format) ?? match[0];
    }
    let tagObj = undefined;
    let obj;
    if (identity.isScalar(item)) {
      obj = item.value;
      let match = tags.filter((t) => t.identify?.(obj));
      if (match.length > 1) {
        const testMatch = match.filter((t) => t.test);
        if (testMatch.length > 0)
          match = testMatch;
      }
      tagObj = match.find((t) => t.format === item.format) ?? match.find((t) => !t.format);
    } else {
      obj = item;
      tagObj = tags.find((t) => t.nodeClass && obj instanceof t.nodeClass);
    }
    if (!tagObj) {
      const name = obj?.constructor?.name ?? (obj === null ? "null" : typeof obj);
      throw new Error(`Tag not resolved for ${name} value`);
    }
    return tagObj;
  }
  function stringifyProps(node, tagObj, { anchors: anchors$1, doc }) {
    if (!doc.directives)
      return "";
    const props = [];
    const anchor = (identity.isScalar(node) || identity.isCollection(node)) && node.anchor;
    if (anchor && anchors.anchorIsValid(anchor)) {
      anchors$1.add(anchor);
      props.push(`&${anchor}`);
    }
    const tag = node.tag ?? (tagObj.default ? null : tagObj.tag);
    if (tag)
      props.push(doc.directives.tagString(tag));
    return props.join(" ");
  }
  function stringify(item, ctx, onComment, onChompKeep) {
    if (identity.isPair(item))
      return item.toString(ctx, onComment, onChompKeep);
    if (identity.isAlias(item)) {
      if (ctx.doc.directives)
        return item.toString(ctx);
      if (ctx.resolvedAliases?.has(item)) {
        throw new TypeError(`Cannot stringify circular structure without alias nodes`);
      } else {
        if (ctx.resolvedAliases)
          ctx.resolvedAliases.add(item);
        else
          ctx.resolvedAliases = new Set([item]);
        item = item.resolve(ctx.doc);
      }
    }
    let tagObj = undefined;
    const node = identity.isNode(item) ? item : ctx.doc.createNode(item, { onTagObj: (o) => tagObj = o });
    tagObj ?? (tagObj = getTagObject(ctx.doc.schema.tags, node));
    const props = stringifyProps(node, tagObj, ctx);
    if (props.length > 0)
      ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1;
    const str = typeof tagObj.stringify === "function" ? tagObj.stringify(node, ctx, onComment, onChompKeep) : identity.isScalar(node) ? stringifyString.stringifyString(node, ctx, onComment, onChompKeep) : node.toString(ctx, onComment, onChompKeep);
    if (!props)
      return str;
    return identity.isScalar(node) || str[0] === "{" || str[0] === "[" ? `${props} ${str}` : `${props}
${ctx.indent}${str}`;
  }
  exports.createStringifyContext = createStringifyContext;
  exports.stringify = stringify;
});

// node_modules/yaml/dist/stringify/stringifyPair.js
var require_stringifyPair = __commonJS(function(exports) {
  var identity = require_identity();
  var Scalar = require_Scalar();
  var stringify = require_stringify();
  var stringifyComment = require_stringifyComment();
  function stringifyPair({ key, value }, ctx, onComment, onChompKeep) {
    const { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx;
    let keyComment = identity.isNode(key) && key.comment || null;
    if (simpleKeys) {
      if (keyComment) {
        throw new Error("With simple keys, key nodes cannot have comments");
      }
      if (identity.isCollection(key) || !identity.isNode(key) && typeof key === "object") {
        const msg = "With simple keys, collection cannot be used as a key value";
        throw new Error(msg);
      }
    }
    let explicitKey = !simpleKeys && (!key || keyComment && value == null && !ctx.inFlow || identity.isCollection(key) || (identity.isScalar(key) ? key.type === Scalar.Scalar.BLOCK_FOLDED || key.type === Scalar.Scalar.BLOCK_LITERAL : typeof key === "object"));
    ctx = Object.assign({}, ctx, {
      allNullValues: false,
      implicitKey: !explicitKey && (simpleKeys || !allNullValues),
      indent: indent + indentStep
    });
    let keyCommentDone = false;
    let chompKeep = false;
    let str = stringify.stringify(key, ctx, () => keyCommentDone = true, () => chompKeep = true);
    if (!explicitKey && !ctx.inFlow && str.length > 1024) {
      if (simpleKeys)
        throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
      explicitKey = true;
    }
    if (ctx.inFlow) {
      if (allNullValues || value == null) {
        if (keyCommentDone && onComment)
          onComment();
        return str === "" ? "?" : explicitKey ? `? ${str}` : str;
      }
    } else if (allNullValues && !simpleKeys || value == null && explicitKey) {
      str = `? ${str}`;
      if (keyComment && !keyCommentDone) {
        str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
      } else if (chompKeep && onChompKeep)
        onChompKeep();
      return str;
    }
    if (keyCommentDone)
      keyComment = null;
    if (explicitKey) {
      if (keyComment)
        str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
      str = `? ${str}
${indent}:`;
    } else {
      str = `${str}:`;
      if (keyComment)
        str += stringifyComment.lineComment(str, ctx.indent, commentString(keyComment));
    }
    let vsb, vcb, valueComment;
    if (identity.isNode(value)) {
      vsb = !!value.spaceBefore;
      vcb = value.commentBefore;
      valueComment = value.comment;
    } else {
      vsb = false;
      vcb = null;
      valueComment = null;
      if (value && typeof value === "object")
        value = doc.createNode(value);
    }
    ctx.implicitKey = false;
    if (!explicitKey && !keyComment && identity.isScalar(value))
      ctx.indentAtStart = str.length + 1;
    chompKeep = false;
    if (!indentSeq && indentStep.length >= 2 && !ctx.inFlow && !explicitKey && identity.isSeq(value) && !value.flow && !value.tag && !value.anchor) {
      ctx.indent = ctx.indent.substring(2);
    }
    let valueCommentDone = false;
    const valueStr = stringify.stringify(value, ctx, () => valueCommentDone = true, () => chompKeep = true);
    let ws = " ";
    if (keyComment || vsb || vcb) {
      ws = vsb ? `
` : "";
      if (vcb) {
        const cs = commentString(vcb);
        ws += `
${stringifyComment.indentComment(cs, ctx.indent)}`;
      }
      if (valueStr === "" && !ctx.inFlow) {
        if (ws === `
` && valueComment)
          ws = `

`;
      } else {
        ws += `
${ctx.indent}`;
      }
    } else if (!explicitKey && identity.isCollection(value)) {
      const vs0 = valueStr[0];
      const nl0 = valueStr.indexOf(`
`);
      const hasNewline = nl0 !== -1;
      const flow = ctx.inFlow ?? value.flow ?? value.items.length === 0;
      if (hasNewline || !flow) {
        let hasPropsLine = false;
        if (hasNewline && (vs0 === "&" || vs0 === "!")) {
          let sp0 = valueStr.indexOf(" ");
          if (vs0 === "&" && sp0 !== -1 && sp0 < nl0 && valueStr[sp0 + 1] === "!") {
            sp0 = valueStr.indexOf(" ", sp0 + 1);
          }
          if (sp0 === -1 || nl0 < sp0)
            hasPropsLine = true;
        }
        if (!hasPropsLine)
          ws = `
${ctx.indent}`;
      }
    } else if (valueStr === "" || valueStr[0] === `
`) {
      ws = "";
    }
    str += ws + valueStr;
    if (ctx.inFlow) {
      if (valueCommentDone && onComment)
        onComment();
    } else if (valueComment && !valueCommentDone) {
      str += stringifyComment.lineComment(str, ctx.indent, commentString(valueComment));
    } else if (chompKeep && onChompKeep) {
      onChompKeep();
    }
    return str;
  }
  exports.stringifyPair = stringifyPair;
});

// node_modules/yaml/dist/log.js
var require_log = __commonJS(function(exports) {
  var node_process = __require("process");
  function debug(logLevel, ...messages) {
    if (logLevel === "debug")
      console.log(...messages);
  }
  function warn(logLevel, warning) {
    if (logLevel === "debug" || logLevel === "warn") {
      if (typeof node_process.emitWarning === "function")
        node_process.emitWarning(warning);
      else
        console.warn(warning);
    }
  }
  exports.debug = debug;
  exports.warn = warn;
});

// node_modules/yaml/dist/schema/yaml-1.1/merge.js
var require_merge = __commonJS(function(exports) {
  var identity = require_identity();
  var Scalar = require_Scalar();
  var MERGE_KEY = "<<";
  var merge = {
    identify: (value) => value === MERGE_KEY || typeof value === "symbol" && value.description === MERGE_KEY,
    default: "key",
    tag: "tag:yaml.org,2002:merge",
    test: /^<<$/,
    resolve: () => Object.assign(new Scalar.Scalar(Symbol(MERGE_KEY)), {
      addToJSMap: addMergeToJSMap
    }),
    stringify: () => MERGE_KEY
  };
  var isMergeKey = (ctx, key) => (merge.identify(key) || identity.isScalar(key) && (!key.type || key.type === Scalar.Scalar.PLAIN) && merge.identify(key.value)) && ctx?.doc.schema.tags.some((tag) => tag.tag === merge.tag && tag.default);
  function addMergeToJSMap(ctx, map, value) {
    const source = resolveAliasValue(ctx, value);
    if (identity.isSeq(source))
      for (const it of source.items)
        mergeValue(ctx, map, it);
    else if (Array.isArray(source))
      for (const it of source)
        mergeValue(ctx, map, it);
    else
      mergeValue(ctx, map, source);
  }
  function mergeValue(ctx, map, value) {
    const source = resolveAliasValue(ctx, value);
    if (!identity.isMap(source))
      throw new Error("Merge sources must be maps or map aliases");
    const srcMap = source.toJSON(null, ctx, Map);
    for (const [key, value] of srcMap) {
      if (map instanceof Map) {
        if (!map.has(key))
          map.set(key, value);
      } else if (map instanceof Set) {
        map.add(key);
      } else if (!Object.prototype.hasOwnProperty.call(map, key)) {
        Object.defineProperty(map, key, {
          value,
          writable: true,
          enumerable: true,
          configurable: true
        });
      }
    }
    return map;
  }
  function resolveAliasValue(ctx, value) {
    return ctx && identity.isAlias(value) ? value.resolve(ctx.doc, ctx) : value;
  }
  exports.addMergeToJSMap = addMergeToJSMap;
  exports.isMergeKey = isMergeKey;
  exports.merge = merge;
});

// node_modules/yaml/dist/nodes/addPairToJSMap.js
var require_addPairToJSMap = __commonJS(function(exports) {
  var log = require_log();
  var merge = require_merge();
  var stringify = require_stringify();
  var identity = require_identity();
  var toJS = require_toJS();
  function addPairToJSMap(ctx, map, { key, value }) {
    if (identity.isNode(key) && key.addToJSMap)
      key.addToJSMap(ctx, map, value);
    else if (merge.isMergeKey(ctx, key))
      merge.addMergeToJSMap(ctx, map, value);
    else {
      const jsKey = toJS.toJS(key, "", ctx);
      if (map instanceof Map) {
        map.set(jsKey, toJS.toJS(value, jsKey, ctx));
      } else if (map instanceof Set) {
        map.add(jsKey);
      } else {
        const stringKey = stringifyKey(key, jsKey, ctx);
        const jsValue = toJS.toJS(value, stringKey, ctx);
        if (stringKey in map)
          Object.defineProperty(map, stringKey, {
            value: jsValue,
            writable: true,
            enumerable: true,
            configurable: true
          });
        else
          map[stringKey] = jsValue;
      }
    }
    return map;
  }
  function stringifyKey(key, jsKey, ctx) {
    if (jsKey === null)
      return "";
    if (typeof jsKey !== "object")
      return String(jsKey);
    if (identity.isNode(key) && ctx?.doc) {
      const strCtx = stringify.createStringifyContext(ctx.doc, {});
      strCtx.anchors = new Set;
      for (const node of ctx.anchors.keys())
        strCtx.anchors.add(node.anchor);
      strCtx.inFlow = true;
      strCtx.inStringifyKey = true;
      const strKey = key.toString(strCtx);
      if (!ctx.mapKeyWarned) {
        let jsonStr = JSON.stringify(strKey);
        if (jsonStr.length > 40)
          jsonStr = jsonStr.substring(0, 36) + '..."';
        log.warn(ctx.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`);
        ctx.mapKeyWarned = true;
      }
      return strKey;
    }
    return JSON.stringify(jsKey);
  }
  exports.addPairToJSMap = addPairToJSMap;
});

// node_modules/yaml/dist/nodes/Pair.js
var require_Pair = __commonJS(function(exports) {
  var createNode = require_createNode();
  var stringifyPair = require_stringifyPair();
  var addPairToJSMap = require_addPairToJSMap();
  var identity = require_identity();
  function createPair(key, value, ctx) {
    const k = createNode.createNode(key, undefined, ctx);
    const v = createNode.createNode(value, undefined, ctx);
    return new Pair(k, v);
  }

  class Pair {
    constructor(key, value = null) {
      Object.defineProperty(this, identity.NODE_TYPE, { value: identity.PAIR });
      this.key = key;
      this.value = value;
    }
    clone(schema) {
      let { key, value } = this;
      if (identity.isNode(key))
        key = key.clone(schema);
      if (identity.isNode(value))
        value = value.clone(schema);
      return new Pair(key, value);
    }
    toJSON(_, ctx) {
      const pair = ctx?.mapAsMap ? new Map : {};
      return addPairToJSMap.addPairToJSMap(ctx, pair, this);
    }
    toString(ctx, onComment, onChompKeep) {
      return ctx?.doc ? stringifyPair.stringifyPair(this, ctx, onComment, onChompKeep) : JSON.stringify(this);
    }
  }
  exports.Pair = Pair;
  exports.createPair = createPair;
});

// node_modules/yaml/dist/stringify/stringifyCollection.js
var require_stringifyCollection = __commonJS(function(exports) {
  var identity = require_identity();
  var stringify = require_stringify();
  var stringifyComment = require_stringifyComment();
  function stringifyCollection(collection, ctx, options) {
    const flow = ctx.inFlow ?? collection.flow;
    const stringify = flow ? stringifyFlowCollection : stringifyBlockCollection;
    return stringify(collection, ctx, options);
  }
  function stringifyBlockCollection({ comment, items }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
    const { indent, options: { commentString } } = ctx;
    const itemCtx = Object.assign({}, ctx, { indent: itemIndent, type: null });
    let chompKeep = false;
    const lines = [];
    for (let i = 0;i < items.length; ++i) {
      const item = items[i];
      let comment = null;
      if (identity.isNode(item)) {
        if (!chompKeep && item.spaceBefore)
          lines.push("");
        addCommentBefore(ctx, lines, item.commentBefore, chompKeep);
        if (item.comment)
          comment = item.comment;
      } else if (identity.isPair(item)) {
        const ik = identity.isNode(item.key) ? item.key : null;
        if (ik) {
          if (!chompKeep && ik.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
        }
      }
      chompKeep = false;
      let str = stringify.stringify(item, itemCtx, () => comment = null, () => chompKeep = true);
      if (comment)
        str += stringifyComment.lineComment(str, itemIndent, commentString(comment));
      if (chompKeep && comment)
        chompKeep = false;
      lines.push(blockItemPrefix + str);
    }
    let str;
    if (lines.length === 0) {
      str = flowChars.start + flowChars.end;
    } else {
      str = lines[0];
      for (let i = 1;i < lines.length; ++i) {
        const line = lines[i];
        str += line ? `
${indent}${line}` : `
`;
      }
    }
    if (comment) {
      str += `
` + stringifyComment.indentComment(commentString(comment), indent);
      if (onComment)
        onComment();
    } else if (chompKeep && onChompKeep)
      onChompKeep();
    return str;
  }
  function stringifyFlowCollection({ items }, ctx, { flowChars, itemIndent }) {
    const { indent, indentStep, flowCollectionPadding: fcPadding, options: { commentString } } = ctx;
    itemIndent += indentStep;
    const itemCtx = Object.assign({}, ctx, {
      indent: itemIndent,
      inFlow: true,
      type: null
    });
    let reqNewline = false;
    let linesAtValue = 0;
    const lines = [];
    for (let i = 0;i < items.length; ++i) {
      const item = items[i];
      let comment = null;
      if (identity.isNode(item)) {
        if (item.spaceBefore)
          lines.push("");
        addCommentBefore(ctx, lines, item.commentBefore, false);
        if (item.comment)
          comment = item.comment;
      } else if (identity.isPair(item)) {
        const ik = identity.isNode(item.key) ? item.key : null;
        if (ik) {
          if (ik.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, ik.commentBefore, false);
          if (ik.comment)
            reqNewline = true;
        }
        const iv = identity.isNode(item.value) ? item.value : null;
        if (iv) {
          if (iv.comment)
            comment = iv.comment;
          if (iv.commentBefore)
            reqNewline = true;
        } else if (item.value == null && ik?.comment) {
          comment = ik.comment;
        }
      }
      if (comment)
        reqNewline = true;
      let str = stringify.stringify(item, itemCtx, () => comment = null);
      reqNewline || (reqNewline = lines.length > linesAtValue || str.includes(`
`));
      if (i < items.length - 1) {
        str += ",";
      } else if (ctx.options.trailingComma) {
        if (ctx.options.lineWidth > 0) {
          reqNewline || (reqNewline = lines.reduce((sum, line) => sum + line.length + 2, 2) + (str.length + 2) > ctx.options.lineWidth);
        }
        if (reqNewline) {
          str += ",";
        }
      }
      if (comment)
        str += stringifyComment.lineComment(str, itemIndent, commentString(comment));
      lines.push(str);
      linesAtValue = lines.length;
    }
    const { start, end } = flowChars;
    if (lines.length === 0) {
      return start + end;
    } else {
      if (!reqNewline) {
        const len = lines.reduce((sum, line) => sum + line.length + 2, 2);
        reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
      }
      if (reqNewline) {
        let str = start;
        for (const line of lines)
          str += line ? `
${indentStep}${indent}${line}` : `
`;
        return `${str}
${indent}${end}`;
      } else {
        return `${start}${fcPadding}${lines.join(" ")}${fcPadding}${end}`;
      }
    }
  }
  function addCommentBefore({ indent, options: { commentString } }, lines, comment, chompKeep) {
    if (comment && chompKeep)
      comment = comment.replace(/^\n+/, "");
    if (comment) {
      const ic = stringifyComment.indentComment(commentString(comment), indent);
      lines.push(ic.trimStart());
    }
  }
  exports.stringifyCollection = stringifyCollection;
});

// node_modules/yaml/dist/nodes/YAMLMap.js
var require_YAMLMap = __commonJS(function(exports) {
  var stringifyCollection = require_stringifyCollection();
  var addPairToJSMap = require_addPairToJSMap();
  var Collection = require_Collection();
  var identity = require_identity();
  var Pair = require_Pair();
  var Scalar = require_Scalar();
  function findPair(items, key) {
    const k = identity.isScalar(key) ? key.value : key;
    for (const it of items) {
      if (identity.isPair(it)) {
        if (it.key === key || it.key === k)
          return it;
        if (identity.isScalar(it.key) && it.key.value === k)
          return it;
      }
    }
    return;
  }

  class YAMLMap extends Collection.Collection {
    static get tagName() {
      return "tag:yaml.org,2002:map";
    }
    constructor(schema) {
      super(identity.MAP, schema);
      this.items = [];
    }
    static from(schema, obj, ctx) {
      const { keepUndefined, replacer } = ctx;
      const map = new this(schema);
      const add = (key, value) => {
        if (typeof replacer === "function")
          value = replacer.call(obj, key, value);
        else if (Array.isArray(replacer) && !replacer.includes(key))
          return;
        if (value !== undefined || keepUndefined)
          map.items.push(Pair.createPair(key, value, ctx));
      };
      if (obj instanceof Map) {
        for (const [key, value] of obj)
          add(key, value);
      } else if (obj && typeof obj === "object") {
        for (const key of Object.keys(obj))
          add(key, obj[key]);
      }
      if (typeof schema.sortMapEntries === "function") {
        map.items.sort(schema.sortMapEntries);
      }
      return map;
    }
    add(pair, overwrite) {
      let _pair;
      if (identity.isPair(pair))
        _pair = pair;
      else if (!pair || typeof pair !== "object" || !("key" in pair)) {
        _pair = new Pair.Pair(pair, pair?.value);
      } else
        _pair = new Pair.Pair(pair.key, pair.value);
      const prev = findPair(this.items, _pair.key);
      const sortEntries = this.schema?.sortMapEntries;
      if (prev) {
        if (!overwrite)
          throw new Error(`Key ${_pair.key} already set`);
        if (identity.isScalar(prev.value) && Scalar.isScalarValue(_pair.value))
          prev.value.value = _pair.value;
        else
          prev.value = _pair.value;
      } else if (sortEntries) {
        const i = this.items.findIndex((item) => sortEntries(_pair, item) < 0);
        if (i === -1)
          this.items.push(_pair);
        else
          this.items.splice(i, 0, _pair);
      } else {
        this.items.push(_pair);
      }
    }
    delete(key) {
      const it = findPair(this.items, key);
      if (!it)
        return false;
      const del = this.items.splice(this.items.indexOf(it), 1);
      return del.length > 0;
    }
    get(key, keepScalar) {
      const it = findPair(this.items, key);
      const node = it?.value;
      return (!keepScalar && identity.isScalar(node) ? node.value : node) ?? undefined;
    }
    has(key) {
      return !!findPair(this.items, key);
    }
    set(key, value) {
      this.add(new Pair.Pair(key, value), true);
    }
    toJSON(_, ctx, Type) {
      const map = Type ? new Type : ctx?.mapAsMap ? new Map : {};
      if (ctx?.onCreate)
        ctx.onCreate(map);
      for (const item of this.items)
        addPairToJSMap.addPairToJSMap(ctx, map, item);
      return map;
    }
    toString(ctx, onComment, onChompKeep) {
      if (!ctx)
        return JSON.stringify(this);
      for (const item of this.items) {
        if (!identity.isPair(item))
          throw new Error(`Map items must all be pairs; found ${JSON.stringify(item)} instead`);
      }
      if (!ctx.allNullValues && this.hasAllNullValues(false))
        ctx = Object.assign({}, ctx, { allNullValues: true });
      return stringifyCollection.stringifyCollection(this, ctx, {
        blockItemPrefix: "",
        flowChars: { start: "{", end: "}" },
        itemIndent: ctx.indent || "",
        onChompKeep,
        onComment
      });
    }
  }
  exports.YAMLMap = YAMLMap;
  exports.findPair = findPair;
});

// node_modules/yaml/dist/schema/common/map.js
var require_map = __commonJS(function(exports) {
  var identity = require_identity();
  var YAMLMap = require_YAMLMap();
  var map = {
    collection: "map",
    default: true,
    nodeClass: YAMLMap.YAMLMap,
    tag: "tag:yaml.org,2002:map",
    resolve(map, onError) {
      if (!identity.isMap(map))
        onError("Expected a mapping for this tag");
      return map;
    },
    createNode: (schema, obj, ctx) => YAMLMap.YAMLMap.from(schema, obj, ctx)
  };
  exports.map = map;
});

// node_modules/yaml/dist/nodes/YAMLSeq.js
var require_YAMLSeq = __commonJS(function(exports) {
  var createNode = require_createNode();
  var stringifyCollection = require_stringifyCollection();
  var Collection = require_Collection();
  var identity = require_identity();
  var Scalar = require_Scalar();
  var toJS = require_toJS();

  class YAMLSeq extends Collection.Collection {
    static get tagName() {
      return "tag:yaml.org,2002:seq";
    }
    constructor(schema) {
      super(identity.SEQ, schema);
      this.items = [];
    }
    add(value) {
      this.items.push(value);
    }
    delete(key) {
      const idx = asItemIndex(key);
      if (typeof idx !== "number")
        return false;
      const del = this.items.splice(idx, 1);
      return del.length > 0;
    }
    get(key, keepScalar) {
      const idx = asItemIndex(key);
      if (typeof idx !== "number")
        return;
      const it = this.items[idx];
      return !keepScalar && identity.isScalar(it) ? it.value : it;
    }
    has(key) {
      const idx = asItemIndex(key);
      return typeof idx === "number" && idx < this.items.length;
    }
    set(key, value) {
      const idx = asItemIndex(key);
      if (typeof idx !== "number")
        throw new Error(`Expected a valid index, not ${key}.`);
      const prev = this.items[idx];
      if (identity.isScalar(prev) && Scalar.isScalarValue(value))
        prev.value = value;
      else
        this.items[idx] = value;
    }
    toJSON(_, ctx) {
      const seq = [];
      if (ctx?.onCreate)
        ctx.onCreate(seq);
      let i = 0;
      for (const item of this.items)
        seq.push(toJS.toJS(item, String(i++), ctx));
      return seq;
    }
    toString(ctx, onComment, onChompKeep) {
      if (!ctx)
        return JSON.stringify(this);
      return stringifyCollection.stringifyCollection(this, ctx, {
        blockItemPrefix: "- ",
        flowChars: { start: "[", end: "]" },
        itemIndent: (ctx.indent || "") + "  ",
        onChompKeep,
        onComment
      });
    }
    static from(schema, obj, ctx) {
      const { replacer } = ctx;
      const seq = new this(schema);
      if (obj && Symbol.iterator in Object(obj)) {
        let i = 0;
        for (let it of obj) {
          if (typeof replacer === "function") {
            const key = obj instanceof Set ? it : String(i++);
            it = replacer.call(obj, key, it);
          }
          seq.items.push(createNode.createNode(it, undefined, ctx));
        }
      }
      return seq;
    }
  }
  function asItemIndex(key) {
    let idx = identity.isScalar(key) ? key.value : key;
    if (idx && typeof idx === "string")
      idx = Number(idx);
    return typeof idx === "number" && Number.isInteger(idx) && idx >= 0 ? idx : null;
  }
  exports.YAMLSeq = YAMLSeq;
});

// node_modules/yaml/dist/schema/common/seq.js
var require_seq = __commonJS(function(exports) {
  var identity = require_identity();
  var YAMLSeq = require_YAMLSeq();
  var seq = {
    collection: "seq",
    default: true,
    nodeClass: YAMLSeq.YAMLSeq,
    tag: "tag:yaml.org,2002:seq",
    resolve(seq, onError) {
      if (!identity.isSeq(seq))
        onError("Expected a sequence for this tag");
      return seq;
    },
    createNode: (schema, obj, ctx) => YAMLSeq.YAMLSeq.from(schema, obj, ctx)
  };
  exports.seq = seq;
});

// node_modules/yaml/dist/schema/common/string.js
var require_string = __commonJS(function(exports) {
  var stringifyString = require_stringifyString();
  var string = {
    identify: (value) => typeof value === "string",
    default: true,
    tag: "tag:yaml.org,2002:str",
    resolve: (str) => str,
    stringify(item, ctx, onComment, onChompKeep) {
      ctx = Object.assign({ actualString: true }, ctx);
      return stringifyString.stringifyString(item, ctx, onComment, onChompKeep);
    }
  };
  exports.string = string;
});

// node_modules/yaml/dist/schema/common/null.js
var require_null = __commonJS(function(exports) {
  var Scalar = require_Scalar();
  var nullTag = {
    identify: (value) => value == null,
    createNode: () => new Scalar.Scalar(null),
    default: true,
    tag: "tag:yaml.org,2002:null",
    test: /^(?:~|[Nn]ull|NULL)?$/,
    resolve: () => new Scalar.Scalar(null),
    stringify: ({ source }, ctx) => typeof source === "string" && nullTag.test.test(source) ? source : ctx.options.nullStr
  };
  exports.nullTag = nullTag;
});

// node_modules/yaml/dist/schema/core/bool.js
var require_bool = __commonJS(function(exports) {
  var Scalar = require_Scalar();
  var boolTag = {
    identify: (value) => typeof value === "boolean",
    default: true,
    tag: "tag:yaml.org,2002:bool",
    test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
    resolve: (str) => new Scalar.Scalar(str[0] === "t" || str[0] === "T"),
    stringify({ source, value }, ctx) {
      if (source && boolTag.test.test(source)) {
        const sv = source[0] === "t" || source[0] === "T";
        if (value === sv)
          return source;
      }
      return value ? ctx.options.trueStr : ctx.options.falseStr;
    }
  };
  exports.boolTag = boolTag;
});

// node_modules/yaml/dist/stringify/stringifyNumber.js
var require_stringifyNumber = __commonJS(function(exports) {
  function stringifyNumber({ format, minFractionDigits, tag, value }) {
    if (typeof value === "bigint")
      return String(value);
    const num = typeof value === "number" ? value : Number(value);
    if (!isFinite(num))
      return isNaN(num) ? ".nan" : num < 0 ? "-.inf" : ".inf";
    let n = Object.is(value, -0) ? "-0" : JSON.stringify(value);
    if (!format && minFractionDigits && (!tag || tag === "tag:yaml.org,2002:float") && /^-?\d/.test(n) && !n.includes("e")) {
      let i = n.indexOf(".");
      if (i < 0) {
        i = n.length;
        n += ".";
      }
      let d = minFractionDigits - (n.length - i - 1);
      while (d-- > 0)
        n += "0";
    }
    return n;
  }
  exports.stringifyNumber = stringifyNumber;
});

// node_modules/yaml/dist/schema/core/float.js
var require_float = __commonJS(function(exports) {
  var Scalar = require_Scalar();
  var stringifyNumber = require_stringifyNumber();
  var floatNaN = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
    resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
    stringify: stringifyNumber.stringifyNumber
  };
  var floatExp = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    format: "EXP",
    test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
    resolve: (str) => parseFloat(str),
    stringify(node) {
      const num = Number(node.value);
      return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
    }
  };
  var float = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
    resolve(str) {
      const node = new Scalar.Scalar(parseFloat(str));
      const dot = str.indexOf(".");
      if (dot !== -1 && str[str.length - 1] === "0")
        node.minFractionDigits = str.length - dot - 1;
      return node;
    },
    stringify: stringifyNumber.stringifyNumber
  };
  exports.float = float;
  exports.floatExp = floatExp;
  exports.floatNaN = floatNaN;
});

// node_modules/yaml/dist/schema/core/int.js
var require_int = __commonJS(function(exports) {
  var stringifyNumber = require_stringifyNumber();
  var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
  var intResolve = (str, offset, radix, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str.substring(offset), radix);
  function intStringify(node, radix, prefix) {
    const { value } = node;
    if (intIdentify(value) && value >= 0)
      return prefix + value.toString(radix);
    return stringifyNumber.stringifyNumber(node);
  }
  var intOct = {
    identify: (value) => intIdentify(value) && value >= 0,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "OCT",
    test: /^0o[0-7]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 8, opt),
    stringify: (node) => intStringify(node, 8, "0o")
  };
  var int = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    test: /^[-+]?[0-9]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
    stringify: stringifyNumber.stringifyNumber
  };
  var intHex = {
    identify: (value) => intIdentify(value) && value >= 0,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "HEX",
    test: /^0x[0-9a-fA-F]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
    stringify: (node) => intStringify(node, 16, "0x")
  };
  exports.int = int;
  exports.intHex = intHex;
  exports.intOct = intOct;
});

// node_modules/yaml/dist/schema/core/schema.js
var require_schema = __commonJS(function(exports) {
  var map = require_map();
  var _null = require_null();
  var seq = require_seq();
  var string = require_string();
  var bool = require_bool();
  var float = require_float();
  var int = require_int();
  var schema = [
    map.map,
    seq.seq,
    string.string,
    _null.nullTag,
    bool.boolTag,
    int.intOct,
    int.int,
    int.intHex,
    float.floatNaN,
    float.floatExp,
    float.float
  ];
  exports.schema = schema;
});

// node_modules/yaml/dist/schema/json/schema.js
var require_schema2 = __commonJS(function(exports) {
  var Scalar = require_Scalar();
  var map = require_map();
  var seq = require_seq();
  function intIdentify(value) {
    return typeof value === "bigint" || Number.isInteger(value);
  }
  var stringifyJSON = ({ value }) => JSON.stringify(value);
  var jsonScalars = [
    {
      identify: (value) => typeof value === "string",
      default: true,
      tag: "tag:yaml.org,2002:str",
      resolve: (str) => str,
      stringify: stringifyJSON
    },
    {
      identify: (value) => value == null,
      createNode: () => new Scalar.Scalar(null),
      default: true,
      tag: "tag:yaml.org,2002:null",
      test: /^null$/,
      resolve: () => null,
      stringify: stringifyJSON
    },
    {
      identify: (value) => typeof value === "boolean",
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^true$|^false$/,
      resolve: (str) => str === "true",
      stringify: stringifyJSON
    },
    {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^-?(?:0|[1-9][0-9]*)$/,
      resolve: (str, _onError, { intAsBigInt }) => intAsBigInt ? BigInt(str) : parseInt(str, 10),
      stringify: ({ value }) => intIdentify(value) ? value.toString() : JSON.stringify(value)
    },
    {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
      resolve: (str) => parseFloat(str),
      stringify: stringifyJSON
    }
  ];
  var jsonError = {
    default: true,
    tag: "",
    test: /^/,
    resolve(str, onError) {
      onError(`Unresolved plain scalar ${JSON.stringify(str)}`);
      return str;
    }
  };
  var schema = [map.map, seq.seq].concat(jsonScalars, jsonError);
  exports.schema = schema;
});

// node_modules/yaml/dist/schema/yaml-1.1/binary.js
var require_binary = __commonJS(function(exports) {
  var node_buffer = __require("buffer");
  var Scalar = require_Scalar();
  var stringifyString = require_stringifyString();
  var binary = {
    identify: (value) => value instanceof Uint8Array,
    default: false,
    tag: "tag:yaml.org,2002:binary",
    resolve(src, onError) {
      if (typeof node_buffer.Buffer === "function") {
        return node_buffer.Buffer.from(src, "base64");
      } else if (typeof atob === "function") {
        const str = atob(src.replace(/[\n\r]/g, ""));
        const buffer = new Uint8Array(str.length);
        for (let i = 0;i < str.length; ++i)
          buffer[i] = str.charCodeAt(i);
        return buffer;
      } else {
        onError("This environment does not support reading binary tags; either Buffer or atob is required");
        return src;
      }
    },
    stringify({ comment, type, value }, ctx, onComment, onChompKeep) {
      if (!value)
        return "";
      const buf = value;
      let str;
      if (typeof node_buffer.Buffer === "function") {
        str = buf instanceof node_buffer.Buffer ? buf.toString("base64") : node_buffer.Buffer.from(buf.buffer).toString("base64");
      } else if (typeof btoa === "function") {
        let s = "";
        for (let i = 0;i < buf.length; ++i)
          s += String.fromCharCode(buf[i]);
        str = btoa(s);
      } else {
        throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
      }
      type ?? (type = Scalar.Scalar.BLOCK_LITERAL);
      if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
        const lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth);
        const n = Math.ceil(str.length / lineWidth);
        const lines = new Array(n);
        for (let i = 0, o = 0;i < n; ++i, o += lineWidth) {
          lines[i] = str.substr(o, lineWidth);
        }
        str = lines.join(type === Scalar.Scalar.BLOCK_LITERAL ? `
` : " ");
      }
      return stringifyString.stringifyString({ comment, type, value: str }, ctx, onComment, onChompKeep);
    }
  };
  exports.binary = binary;
});

// node_modules/yaml/dist/schema/yaml-1.1/pairs.js
var require_pairs = __commonJS(function(exports) {
  var identity = require_identity();
  var Pair = require_Pair();
  var Scalar = require_Scalar();
  var YAMLSeq = require_YAMLSeq();
  function resolvePairs(seq, onError) {
    if (identity.isSeq(seq)) {
      for (let i = 0;i < seq.items.length; ++i) {
        let item = seq.items[i];
        if (identity.isPair(item))
          continue;
        else if (identity.isMap(item)) {
          if (item.items.length > 1)
            onError("Each pair must have its own sequence indicator");
          const pair = item.items[0] || new Pair.Pair(new Scalar.Scalar(null));
          if (item.commentBefore)
            pair.key.commentBefore = pair.key.commentBefore ? `${item.commentBefore}
${pair.key.commentBefore}` : item.commentBefore;
          if (item.comment) {
            const cn = pair.value ?? pair.key;
            cn.comment = cn.comment ? `${item.comment}
${cn.comment}` : item.comment;
          }
          item = pair;
        }
        seq.items[i] = identity.isPair(item) ? item : new Pair.Pair(item);
      }
    } else
      onError("Expected a sequence for this tag");
    return seq;
  }
  function createPairs(schema, iterable, ctx) {
    const { replacer } = ctx;
    const pairs = new YAMLSeq.YAMLSeq(schema);
    pairs.tag = "tag:yaml.org,2002:pairs";
    let i = 0;
    if (iterable && Symbol.iterator in Object(iterable))
      for (let it of iterable) {
        if (typeof replacer === "function")
          it = replacer.call(iterable, String(i++), it);
        let key, value;
        if (Array.isArray(it)) {
          if (it.length === 2) {
            key = it[0];
            value = it[1];
          } else
            throw new TypeError(`Expected [key, value] tuple: ${it}`);
        } else if (it && it instanceof Object) {
          const keys = Object.keys(it);
          if (keys.length === 1) {
            key = keys[0];
            value = it[key];
          } else {
            throw new TypeError(`Expected tuple with one key, not ${keys.length} keys`);
          }
        } else {
          key = it;
        }
        pairs.items.push(Pair.createPair(key, value, ctx));
      }
    return pairs;
  }
  var pairs = {
    collection: "seq",
    default: false,
    tag: "tag:yaml.org,2002:pairs",
    resolve: resolvePairs,
    createNode: createPairs
  };
  exports.createPairs = createPairs;
  exports.pairs = pairs;
  exports.resolvePairs = resolvePairs;
});

// node_modules/yaml/dist/schema/yaml-1.1/omap.js
var require_omap = __commonJS(function(exports) {
  var identity = require_identity();
  var toJS = require_toJS();
  var YAMLMap = require_YAMLMap();
  var YAMLSeq = require_YAMLSeq();
  var pairs = require_pairs();

  class YAMLOMap extends YAMLSeq.YAMLSeq {
    constructor() {
      super();
      this.add = YAMLMap.YAMLMap.prototype.add.bind(this);
      this.delete = YAMLMap.YAMLMap.prototype.delete.bind(this);
      this.get = YAMLMap.YAMLMap.prototype.get.bind(this);
      this.has = YAMLMap.YAMLMap.prototype.has.bind(this);
      this.set = YAMLMap.YAMLMap.prototype.set.bind(this);
      this.tag = YAMLOMap.tag;
    }
    toJSON(_, ctx) {
      if (!ctx)
        return super.toJSON(_);
      const map = new Map;
      if (ctx?.onCreate)
        ctx.onCreate(map);
      for (const pair of this.items) {
        let key, value;
        if (identity.isPair(pair)) {
          key = toJS.toJS(pair.key, "", ctx);
          value = toJS.toJS(pair.value, key, ctx);
        } else {
          key = toJS.toJS(pair, "", ctx);
        }
        if (map.has(key))
          throw new Error("Ordered maps must not include duplicate keys");
        map.set(key, value);
      }
      return map;
    }
    static from(schema, iterable, ctx) {
      const pairs$1 = pairs.createPairs(schema, iterable, ctx);
      const omap = new this;
      omap.items = pairs$1.items;
      return omap;
    }
  }
  YAMLOMap.tag = "tag:yaml.org,2002:omap";
  var omap = {
    collection: "seq",
    identify: (value) => value instanceof Map,
    nodeClass: YAMLOMap,
    default: false,
    tag: "tag:yaml.org,2002:omap",
    resolve(seq, onError) {
      const pairs$1 = pairs.resolvePairs(seq, onError);
      const seenKeys = [];
      for (const { key } of pairs$1.items) {
        if (identity.isScalar(key)) {
          if (seenKeys.includes(key.value)) {
            onError(`Ordered maps must not include duplicate keys: ${key.value}`);
          } else {
            seenKeys.push(key.value);
          }
        }
      }
      return Object.assign(new YAMLOMap, pairs$1);
    },
    createNode: (schema, iterable, ctx) => YAMLOMap.from(schema, iterable, ctx)
  };
  exports.YAMLOMap = YAMLOMap;
  exports.omap = omap;
});

// node_modules/yaml/dist/schema/yaml-1.1/bool.js
var require_bool2 = __commonJS(function(exports) {
  var Scalar = require_Scalar();
  function boolStringify({ value, source }, ctx) {
    const boolObj = value ? trueTag : falseTag;
    if (source && boolObj.test.test(source))
      return source;
    return value ? ctx.options.trueStr : ctx.options.falseStr;
  }
  var trueTag = {
    identify: (value) => value === true,
    default: true,
    tag: "tag:yaml.org,2002:bool",
    test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
    resolve: () => new Scalar.Scalar(true),
    stringify: boolStringify
  };
  var falseTag = {
    identify: (value) => value === false,
    default: true,
    tag: "tag:yaml.org,2002:bool",
    test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
    resolve: () => new Scalar.Scalar(false),
    stringify: boolStringify
  };
  exports.falseTag = falseTag;
  exports.trueTag = trueTag;
});

// node_modules/yaml/dist/schema/yaml-1.1/float.js
var require_float2 = __commonJS(function(exports) {
  var Scalar = require_Scalar();
  var stringifyNumber = require_stringifyNumber();
  var floatNaN = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
    resolve: (str) => str.slice(-3).toLowerCase() === "nan" ? NaN : str[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
    stringify: stringifyNumber.stringifyNumber
  };
  var floatExp = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    format: "EXP",
    test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
    resolve: (str) => parseFloat(str.replace(/_/g, "")),
    stringify(node) {
      const num = Number(node.value);
      return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
    }
  };
  var float = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
    resolve(str) {
      const node = new Scalar.Scalar(parseFloat(str.replace(/_/g, "")));
      const dot = str.indexOf(".");
      if (dot !== -1) {
        const f = str.substring(dot + 1).replace(/_/g, "");
        if (f[f.length - 1] === "0")
          node.minFractionDigits = f.length;
      }
      return node;
    },
    stringify: stringifyNumber.stringifyNumber
  };
  exports.float = float;
  exports.floatExp = floatExp;
  exports.floatNaN = floatNaN;
});

// node_modules/yaml/dist/schema/yaml-1.1/int.js
var require_int2 = __commonJS(function(exports) {
  var stringifyNumber = require_stringifyNumber();
  var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
  function intResolve(str, offset, radix, { intAsBigInt }) {
    const sign = str[0];
    if (sign === "-" || sign === "+")
      offset += 1;
    str = str.substring(offset).replace(/_/g, "");
    if (intAsBigInt) {
      switch (radix) {
        case 2:
          str = `0b${str}`;
          break;
        case 8:
          str = `0o${str}`;
          break;
        case 16:
          str = `0x${str}`;
          break;
      }
      const n = BigInt(str);
      return sign === "-" ? BigInt(-1) * n : n;
    }
    const n = parseInt(str, radix);
    return sign === "-" ? -1 * n : n;
  }
  function intStringify(node, radix, prefix) {
    const { value } = node;
    if (intIdentify(value)) {
      const str = value.toString(radix);
      return value < 0 ? "-" + prefix + str.substr(1) : prefix + str;
    }
    return stringifyNumber.stringifyNumber(node);
  }
  var intBin = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "BIN",
    test: /^[-+]?0b[0-1_]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 2, opt),
    stringify: (node) => intStringify(node, 2, "0b")
  };
  var intOct = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "OCT",
    test: /^[-+]?0[0-7_]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 1, 8, opt),
    stringify: (node) => intStringify(node, 8, "0")
  };
  var int = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    test: /^[-+]?[0-9][0-9_]*$/,
    resolve: (str, _onError, opt) => intResolve(str, 0, 10, opt),
    stringify: stringifyNumber.stringifyNumber
  };
  var intHex = {
    identify: intIdentify,
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "HEX",
    test: /^[-+]?0x[0-9a-fA-F_]+$/,
    resolve: (str, _onError, opt) => intResolve(str, 2, 16, opt),
    stringify: (node) => intStringify(node, 16, "0x")
  };
  exports.int = int;
  exports.intBin = intBin;
  exports.intHex = intHex;
  exports.intOct = intOct;
});

// node_modules/yaml/dist/schema/yaml-1.1/set.js
var require_set = __commonJS(function(exports) {
  var identity = require_identity();
  var Pair = require_Pair();
  var YAMLMap = require_YAMLMap();

  class YAMLSet extends YAMLMap.YAMLMap {
    constructor(schema) {
      super(schema);
      this.tag = YAMLSet.tag;
    }
    add(key) {
      let pair;
      if (identity.isPair(key))
        pair = key;
      else if (key && typeof key === "object" && "key" in key && "value" in key && key.value === null)
        pair = new Pair.Pair(key.key, null);
      else
        pair = new Pair.Pair(key, null);
      const prev = YAMLMap.findPair(this.items, pair.key);
      if (!prev)
        this.items.push(pair);
    }
    get(key, keepPair) {
      const pair = YAMLMap.findPair(this.items, key);
      return !keepPair && identity.isPair(pair) ? identity.isScalar(pair.key) ? pair.key.value : pair.key : pair;
    }
    set(key, value) {
      if (typeof value !== "boolean")
        throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
      const prev = YAMLMap.findPair(this.items, key);
      if (prev && !value) {
        this.items.splice(this.items.indexOf(prev), 1);
      } else if (!prev && value) {
        this.items.push(new Pair.Pair(key));
      }
    }
    toJSON(_, ctx) {
      return super.toJSON(_, ctx, Set);
    }
    toString(ctx, onComment, onChompKeep) {
      if (!ctx)
        return JSON.stringify(this);
      if (this.hasAllNullValues(true))
        return super.toString(Object.assign({}, ctx, { allNullValues: true }), onComment, onChompKeep);
      else
        throw new Error("Set items must all have null values");
    }
    static from(schema, iterable, ctx) {
      const { replacer } = ctx;
      const set = new this(schema);
      if (iterable && Symbol.iterator in Object(iterable))
        for (let value of iterable) {
          if (typeof replacer === "function")
            value = replacer.call(iterable, value, value);
          set.items.push(Pair.createPair(value, null, ctx));
        }
      return set;
    }
  }
  YAMLSet.tag = "tag:yaml.org,2002:set";
  var set = {
    collection: "map",
    identify: (value) => value instanceof Set,
    nodeClass: YAMLSet,
    default: false,
    tag: "tag:yaml.org,2002:set",
    createNode: (schema, iterable, ctx) => YAMLSet.from(schema, iterable, ctx),
    resolve(map, onError) {
      if (identity.isMap(map)) {
        if (map.hasAllNullValues(true))
          return Object.assign(new YAMLSet, map);
        else
          onError("Set items must all have null values");
      } else
        onError("Expected a mapping for this tag");
      return map;
    }
  };
  exports.YAMLSet = YAMLSet;
  exports.set = set;
});

// node_modules/yaml/dist/schema/yaml-1.1/timestamp.js
var require_timestamp = __commonJS(function(exports) {
  var stringifyNumber = require_stringifyNumber();
  function parseSexagesimal(str, asBigInt) {
    const sign = str[0];
    const parts = sign === "-" || sign === "+" ? str.substring(1) : str;
    const num = (n) => asBigInt ? BigInt(n) : Number(n);
    const res = parts.replace(/_/g, "").split(":").reduce((res, p) => res * num(60) + num(p), num(0));
    return sign === "-" ? num(-1) * res : res;
  }
  function stringifySexagesimal(node) {
    let { value } = node;
    let num = (n) => n;
    if (typeof value === "bigint")
      num = (n) => BigInt(n);
    else if (isNaN(value) || !isFinite(value))
      return stringifyNumber.stringifyNumber(node);
    let sign = "";
    if (value < 0) {
      sign = "-";
      value *= num(-1);
    }
    const _60 = num(60);
    const parts = [value % _60];
    if (value < 60) {
      parts.unshift(0);
    } else {
      value = (value - parts[0]) / _60;
      parts.unshift(value % _60);
      if (value >= 60) {
        value = (value - parts[0]) / _60;
        parts.unshift(value);
      }
    }
    return sign + parts.map((n) => String(n).padStart(2, "0")).join(":").replace(/000000\d*$/, "");
  }
  var intTime = {
    identify: (value) => typeof value === "bigint" || Number.isInteger(value),
    default: true,
    tag: "tag:yaml.org,2002:int",
    format: "TIME",
    test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
    resolve: (str, _onError, { intAsBigInt }) => parseSexagesimal(str, intAsBigInt),
    stringify: stringifySexagesimal
  };
  var floatTime = {
    identify: (value) => typeof value === "number",
    default: true,
    tag: "tag:yaml.org,2002:float",
    format: "TIME",
    test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
    resolve: (str) => parseSexagesimal(str, false),
    stringify: stringifySexagesimal
  };
  var timestamp = {
    identify: (value) => value instanceof Date,
    default: true,
    tag: "tag:yaml.org,2002:timestamp",
    test: RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})" + "(?:" + "(?:t|T|[ \\t]+)" + "([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)" + "(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?" + ")?$"),
    resolve(str) {
      const match = str.match(timestamp.test);
      if (!match)
        throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
      const [, year, month, day, hour, minute, second] = match.map(Number);
      const millisec = match[7] ? Number((match[7] + "00").substr(1, 3)) : 0;
      let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec);
      const tz = match[8];
      if (tz && tz !== "Z") {
        let d = parseSexagesimal(tz, false);
        if (Math.abs(d) < 30)
          d *= 60;
        date -= 60000 * d;
      }
      return new Date(date);
    },
    stringify: ({ value }) => value?.toISOString().replace(/(T00:00:00)?\.000Z$/, "") ?? ""
  };
  exports.floatTime = floatTime;
  exports.intTime = intTime;
  exports.timestamp = timestamp;
});

// node_modules/yaml/dist/schema/yaml-1.1/schema.js
var require_schema3 = __commonJS(function(exports) {
  var map = require_map();
  var _null = require_null();
  var seq = require_seq();
  var string = require_string();
  var binary = require_binary();
  var bool = require_bool2();
  var float = require_float2();
  var int = require_int2();
  var merge = require_merge();
  var omap = require_omap();
  var pairs = require_pairs();
  var set = require_set();
  var timestamp = require_timestamp();
  var schema = [
    map.map,
    seq.seq,
    string.string,
    _null.nullTag,
    bool.trueTag,
    bool.falseTag,
    int.intBin,
    int.intOct,
    int.int,
    int.intHex,
    float.floatNaN,
    float.floatExp,
    float.float,
    binary.binary,
    merge.merge,
    omap.omap,
    pairs.pairs,
    set.set,
    timestamp.intTime,
    timestamp.floatTime,
    timestamp.timestamp
  ];
  exports.schema = schema;
});

// node_modules/yaml/dist/schema/tags.js
var require_tags = __commonJS(function(exports) {
  var map = require_map();
  var _null = require_null();
  var seq = require_seq();
  var string = require_string();
  var bool = require_bool();
  var float = require_float();
  var int = require_int();
  var schema = require_schema();
  var schema$1 = require_schema2();
  var binary = require_binary();
  var merge = require_merge();
  var omap = require_omap();
  var pairs = require_pairs();
  var schema$2 = require_schema3();
  var set = require_set();
  var timestamp = require_timestamp();
  var schemas = new Map([
    ["core", schema.schema],
    ["failsafe", [map.map, seq.seq, string.string]],
    ["json", schema$1.schema],
    ["yaml11", schema$2.schema],
    ["yaml-1.1", schema$2.schema]
  ]);
  var tagsByName = {
    binary: binary.binary,
    bool: bool.boolTag,
    float: float.float,
    floatExp: float.floatExp,
    floatNaN: float.floatNaN,
    floatTime: timestamp.floatTime,
    int: int.int,
    intHex: int.intHex,
    intOct: int.intOct,
    intTime: timestamp.intTime,
    map: map.map,
    merge: merge.merge,
    null: _null.nullTag,
    omap: omap.omap,
    pairs: pairs.pairs,
    seq: seq.seq,
    set: set.set,
    timestamp: timestamp.timestamp
  };
  var coreKnownTags = {
    "tag:yaml.org,2002:binary": binary.binary,
    "tag:yaml.org,2002:merge": merge.merge,
    "tag:yaml.org,2002:omap": omap.omap,
    "tag:yaml.org,2002:pairs": pairs.pairs,
    "tag:yaml.org,2002:set": set.set,
    "tag:yaml.org,2002:timestamp": timestamp.timestamp
  };
  function getTags(customTags, schemaName, addMergeTag) {
    const schemaTags = schemas.get(schemaName);
    if (schemaTags && !customTags) {
      return addMergeTag && !schemaTags.includes(merge.merge) ? schemaTags.concat(merge.merge) : schemaTags.slice();
    }
    let tags = schemaTags;
    if (!tags) {
      if (Array.isArray(customTags))
        tags = [];
      else {
        const keys = Array.from(schemas.keys()).filter((key) => key !== "yaml11").map((key) => JSON.stringify(key)).join(", ");
        throw new Error(`Unknown schema "${schemaName}"; use one of ${keys} or define customTags array`);
      }
    }
    if (Array.isArray(customTags)) {
      for (const tag of customTags)
        tags = tags.concat(tag);
    } else if (typeof customTags === "function") {
      tags = customTags(tags.slice());
    }
    if (addMergeTag)
      tags = tags.concat(merge.merge);
    return tags.reduce((tags, tag) => {
      const tagObj = typeof tag === "string" ? tagsByName[tag] : tag;
      if (!tagObj) {
        const tagName = JSON.stringify(tag);
        const keys = Object.keys(tagsByName).map((key) => JSON.stringify(key)).join(", ");
        throw new Error(`Unknown custom tag ${tagName}; use one of ${keys}`);
      }
      if (!tags.includes(tagObj))
        tags.push(tagObj);
      return tags;
    }, []);
  }
  exports.coreKnownTags = coreKnownTags;
  exports.getTags = getTags;
});

// node_modules/yaml/dist/schema/Schema.js
var require_Schema = __commonJS(function(exports) {
  var identity = require_identity();
  var map = require_map();
  var seq = require_seq();
  var string = require_string();
  var tags = require_tags();
  var sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;

  class Schema {
    constructor({ compat, customTags, merge, resolveKnownTags, schema, sortMapEntries, toStringDefaults }) {
      this.compat = Array.isArray(compat) ? tags.getTags(compat, "compat") : compat ? tags.getTags(null, compat) : null;
      this.name = typeof schema === "string" && schema || "core";
      this.knownTags = resolveKnownTags ? tags.coreKnownTags : {};
      this.tags = tags.getTags(customTags, this.name, merge);
      this.toStringOptions = toStringDefaults ?? null;
      Object.defineProperty(this, identity.MAP, { value: map.map });
      Object.defineProperty(this, identity.SCALAR, { value: string.string });
      Object.defineProperty(this, identity.SEQ, { value: seq.seq });
      this.sortMapEntries = typeof sortMapEntries === "function" ? sortMapEntries : sortMapEntries === true ? sortMapEntriesByKey : null;
    }
    clone() {
      const copy = Object.create(Schema.prototype, Object.getOwnPropertyDescriptors(this));
      copy.tags = this.tags.slice();
      return copy;
    }
  }
  exports.Schema = Schema;
});

// node_modules/yaml/dist/stringify/stringifyDocument.js
var require_stringifyDocument = __commonJS(function(exports) {
  var identity = require_identity();
  var stringify = require_stringify();
  var stringifyComment = require_stringifyComment();
  function stringifyDocument(doc, options) {
    const lines = [];
    let hasDirectives = options.directives === true;
    if (options.directives !== false && doc.directives) {
      const dir = doc.directives.toString(doc);
      if (dir) {
        lines.push(dir);
        hasDirectives = true;
      } else if (doc.directives.docStart)
        hasDirectives = true;
    }
    if (hasDirectives)
      lines.push("---");
    const ctx = stringify.createStringifyContext(doc, options);
    const { commentString } = ctx.options;
    if (doc.commentBefore) {
      if (lines.length !== 1)
        lines.unshift("");
      const cs = commentString(doc.commentBefore);
      lines.unshift(stringifyComment.indentComment(cs, ""));
    }
    let chompKeep = false;
    let contentComment = null;
    if (doc.contents) {
      if (identity.isNode(doc.contents)) {
        if (doc.contents.spaceBefore && hasDirectives)
          lines.push("");
        if (doc.contents.commentBefore) {
          const cs = commentString(doc.contents.commentBefore);
          lines.push(stringifyComment.indentComment(cs, ""));
        }
        ctx.forceBlockIndent = !!doc.comment;
        contentComment = doc.contents.comment;
      }
      const onChompKeep = contentComment ? undefined : () => chompKeep = true;
      let body = stringify.stringify(doc.contents, ctx, () => contentComment = null, onChompKeep);
      if (contentComment)
        body += stringifyComment.lineComment(body, "", commentString(contentComment));
      if ((body[0] === "|" || body[0] === ">") && lines[lines.length - 1] === "---") {
        lines[lines.length - 1] = `--- ${body}`;
      } else
        lines.push(body);
    } else {
      lines.push(stringify.stringify(doc.contents, ctx));
    }
    if (doc.directives?.docEnd) {
      if (doc.comment) {
        const cs = commentString(doc.comment);
        if (cs.includes(`
`)) {
          lines.push("...");
          lines.push(stringifyComment.indentComment(cs, ""));
        } else {
          lines.push(`... ${cs}`);
        }
      } else {
        lines.push("...");
      }
    } else {
      let dc = doc.comment;
      if (dc && chompKeep)
        dc = dc.replace(/^\n+/, "");
      if (dc) {
        if ((!chompKeep || contentComment) && lines[lines.length - 1] !== "")
          lines.push("");
        lines.push(stringifyComment.indentComment(commentString(dc), ""));
      }
    }
    return lines.join(`
`) + `
`;
  }
  exports.stringifyDocument = stringifyDocument;
});

// node_modules/yaml/dist/doc/Document.js
var require_Document = __commonJS(function(exports) {
  var Alias = require_Alias();
  var Collection = require_Collection();
  var identity = require_identity();
  var Pair = require_Pair();
  var toJS = require_toJS();
  var Schema = require_Schema();
  var stringifyDocument = require_stringifyDocument();
  var anchors = require_anchors();
  var applyReviver = require_applyReviver();
  var createNode = require_createNode();
  var directives = require_directives();

  class Document {
    constructor(value, replacer, options) {
      this.commentBefore = null;
      this.comment = null;
      this.errors = [];
      this.warnings = [];
      Object.defineProperty(this, identity.NODE_TYPE, { value: identity.DOC });
      let _replacer = null;
      if (typeof replacer === "function" || Array.isArray(replacer)) {
        _replacer = replacer;
      } else if (options === undefined && replacer) {
        options = replacer;
        replacer = undefined;
      }
      const opt = Object.assign({
        intAsBigInt: false,
        keepSourceTokens: false,
        logLevel: "warn",
        prettyErrors: true,
        strict: true,
        stringKeys: false,
        uniqueKeys: true,
        version: "1.2"
      }, options);
      this.options = opt;
      let { version } = opt;
      if (options?._directives) {
        this.directives = options._directives.atDocument();
        if (this.directives.yaml.explicit)
          version = this.directives.yaml.version;
      } else
        this.directives = new directives.Directives({ version });
      this.setSchema(version, options);
      this.contents = value === undefined ? null : this.createNode(value, _replacer, options);
    }
    clone() {
      const copy = Object.create(Document.prototype, {
        [identity.NODE_TYPE]: { value: identity.DOC }
      });
      copy.commentBefore = this.commentBefore;
      copy.comment = this.comment;
      copy.errors = this.errors.slice();
      copy.warnings = this.warnings.slice();
      copy.options = Object.assign({}, this.options);
      if (this.directives)
        copy.directives = this.directives.clone();
      copy.schema = this.schema.clone();
      copy.contents = identity.isNode(this.contents) ? this.contents.clone(copy.schema) : this.contents;
      if (this.range)
        copy.range = this.range.slice();
      return copy;
    }
    add(value) {
      if (assertCollection(this.contents))
        this.contents.add(value);
    }
    addIn(path, value) {
      if (assertCollection(this.contents))
        this.contents.addIn(path, value);
    }
    createAlias(node, name) {
      if (!node.anchor) {
        const prev = anchors.anchorNames(this);
        node.anchor = !name || prev.has(name) ? anchors.findNewAnchor(name || "a", prev) : name;
      }
      return new Alias.Alias(node.anchor);
    }
    createNode(value, replacer, options) {
      let _replacer = undefined;
      if (typeof replacer === "function") {
        value = replacer.call({ "": value }, "", value);
        _replacer = replacer;
      } else if (Array.isArray(replacer)) {
        const keyToStr = (v) => typeof v === "number" || v instanceof String || v instanceof Number;
        const asStr = replacer.filter(keyToStr).map(String);
        if (asStr.length > 0)
          replacer = replacer.concat(asStr);
        _replacer = replacer;
      } else if (options === undefined && replacer) {
        options = replacer;
        replacer = undefined;
      }
      const { aliasDuplicateObjects, anchorPrefix, flow, keepUndefined, onTagObj, tag } = options ?? {};
      const { onAnchor, setAnchors, sourceObjects } = anchors.createNodeAnchors(this, anchorPrefix || "a");
      const ctx = {
        aliasDuplicateObjects: aliasDuplicateObjects ?? true,
        keepUndefined: keepUndefined ?? false,
        onAnchor,
        onTagObj,
        replacer: _replacer,
        schema: this.schema,
        sourceObjects
      };
      const node = createNode.createNode(value, tag, ctx);
      if (flow && identity.isCollection(node))
        node.flow = true;
      setAnchors();
      return node;
    }
    createPair(key, value, options = {}) {
      const k = this.createNode(key, null, options);
      const v = this.createNode(value, null, options);
      return new Pair.Pair(k, v);
    }
    delete(key) {
      return assertCollection(this.contents) ? this.contents.delete(key) : false;
    }
    deleteIn(path) {
      if (Collection.isEmptyPath(path)) {
        if (this.contents == null)
          return false;
        this.contents = null;
        return true;
      }
      return assertCollection(this.contents) ? this.contents.deleteIn(path) : false;
    }
    get(key, keepScalar) {
      return identity.isCollection(this.contents) ? this.contents.get(key, keepScalar) : undefined;
    }
    getIn(path, keepScalar) {
      if (Collection.isEmptyPath(path))
        return !keepScalar && identity.isScalar(this.contents) ? this.contents.value : this.contents;
      return identity.isCollection(this.contents) ? this.contents.getIn(path, keepScalar) : undefined;
    }
    has(key) {
      return identity.isCollection(this.contents) ? this.contents.has(key) : false;
    }
    hasIn(path) {
      if (Collection.isEmptyPath(path))
        return this.contents !== undefined;
      return identity.isCollection(this.contents) ? this.contents.hasIn(path) : false;
    }
    set(key, value) {
      if (this.contents == null) {
        this.contents = Collection.collectionFromPath(this.schema, [key], value);
      } else if (assertCollection(this.contents)) {
        this.contents.set(key, value);
      }
    }
    setIn(path, value) {
      if (Collection.isEmptyPath(path)) {
        this.contents = value;
      } else if (this.contents == null) {
        this.contents = Collection.collectionFromPath(this.schema, Array.from(path), value);
      } else if (assertCollection(this.contents)) {
        this.contents.setIn(path, value);
      }
    }
    setSchema(version, options = {}) {
      if (typeof version === "number")
        version = String(version);
      let opt;
      switch (version) {
        case "1.1":
          if (this.directives)
            this.directives.yaml.version = "1.1";
          else
            this.directives = new directives.Directives({ version: "1.1" });
          opt = { resolveKnownTags: false, schema: "yaml-1.1" };
          break;
        case "1.2":
        case "next":
          if (this.directives)
            this.directives.yaml.version = version;
          else
            this.directives = new directives.Directives({ version });
          opt = { resolveKnownTags: true, schema: "core" };
          break;
        case null:
          if (this.directives)
            delete this.directives;
          opt = null;
          break;
        default: {
          const sv = JSON.stringify(version);
          throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${sv}`);
        }
      }
      if (options.schema instanceof Object)
        this.schema = options.schema;
      else if (opt)
        this.schema = new Schema.Schema(Object.assign(opt, options));
      else
        throw new Error(`With a null YAML version, the { schema: Schema } option is required`);
    }
    toJS({ json, jsonArg, mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
      const ctx = {
        anchors: new Map,
        doc: this,
        keep: !json,
        mapAsMap: mapAsMap === true,
        mapKeyWarned: false,
        maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
      };
      const res = toJS.toJS(this.contents, jsonArg ?? "", ctx);
      if (typeof onAnchor === "function")
        for (const { count, res } of ctx.anchors.values())
          onAnchor(res, count);
      return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
    }
    toJSON(jsonArg, onAnchor) {
      return this.toJS({ json: true, jsonArg, mapAsMap: false, onAnchor });
    }
    toString(options = {}) {
      if (this.errors.length > 0)
        throw new Error("Document with errors cannot be stringified");
      if ("indent" in options && (!Number.isInteger(options.indent) || Number(options.indent) <= 0)) {
        const s = JSON.stringify(options.indent);
        throw new Error(`"indent" option must be a positive integer, not ${s}`);
      }
      return stringifyDocument.stringifyDocument(this, options);
    }
  }
  function assertCollection(contents) {
    if (identity.isCollection(contents))
      return true;
    throw new Error("Expected a YAML collection as document contents");
  }
  exports.Document = Document;
});

// node_modules/yaml/dist/errors.js
var require_errors = __commonJS(function(exports) {
  class YAMLError extends Error {
    constructor(name, pos, code, message) {
      super();
      this.name = name;
      this.code = code;
      this.message = message;
      this.pos = pos;
    }
  }

  class YAMLParseError extends YAMLError {
    constructor(pos, code, message) {
      super("YAMLParseError", pos, code, message);
    }
  }

  class YAMLWarning extends YAMLError {
    constructor(pos, code, message) {
      super("YAMLWarning", pos, code, message);
    }
  }
  var prettifyError = (src, lc) => (error) => {
    if (error.pos[0] === -1)
      return;
    error.linePos = error.pos.map((pos) => lc.linePos(pos));
    const { line, col } = error.linePos[0];
    error.message += ` at line ${line}, column ${col}`;
    let ci = col - 1;
    let lineStr = src.substring(lc.lineStarts[line - 1], lc.lineStarts[line]).replace(/[\n\r]+$/, "");
    if (ci >= 60 && lineStr.length > 80) {
      const trimStart = Math.min(ci - 39, lineStr.length - 79);
      lineStr = "…" + lineStr.substring(trimStart);
      ci -= trimStart - 1;
    }
    if (lineStr.length > 80)
      lineStr = lineStr.substring(0, 79) + "…";
    if (line > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
      let prev = src.substring(lc.lineStarts[line - 2], lc.lineStarts[line - 1]);
      if (prev.length > 80)
        prev = prev.substring(0, 79) + `…
`;
      lineStr = prev + lineStr;
    }
    if (/[^ ]/.test(lineStr)) {
      let count = 1;
      const end = error.linePos[1];
      if (end?.line === line && end.col > col) {
        count = Math.max(1, Math.min(end.col - col, 80 - ci));
      }
      const pointer = " ".repeat(ci) + "^".repeat(count);
      error.message += `:

${lineStr}
${pointer}
`;
    }
  };
  exports.YAMLError = YAMLError;
  exports.YAMLParseError = YAMLParseError;
  exports.YAMLWarning = YAMLWarning;
  exports.prettifyError = prettifyError;
});

// node_modules/yaml/dist/compose/resolve-props.js
var require_resolve_props = __commonJS(function(exports) {
  function resolveProps(tokens, { flow, indicator, next, offset, onError, parentIndent, startOnNewline }) {
    let spaceBefore = false;
    let atNewline = startOnNewline;
    let hasSpace = startOnNewline;
    let comment = "";
    let commentSep = "";
    let hasNewline = false;
    let reqSpace = false;
    let tab = null;
    let anchor = null;
    let tag = null;
    let newlineAfterProp = null;
    let comma = null;
    let found = null;
    let start = null;
    for (const token of tokens) {
      if (reqSpace) {
        if (token.type !== "space" && token.type !== "newline" && token.type !== "comma")
          onError(token.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
        reqSpace = false;
      }
      if (tab) {
        if (atNewline && token.type !== "comment" && token.type !== "newline") {
          onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
        }
        tab = null;
      }
      switch (token.type) {
        case "space":
          if (!flow && (indicator !== "doc-start" || next?.type !== "flow-collection") && token.source.includes("\t")) {
            tab = token;
          }
          hasSpace = true;
          break;
        case "comment": {
          if (!hasSpace)
            onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
          const cb = token.source.substring(1) || " ";
          if (!comment)
            comment = cb;
          else
            comment += commentSep + cb;
          commentSep = "";
          atNewline = false;
          break;
        }
        case "newline":
          if (atNewline) {
            if (comment)
              comment += token.source;
            else if (!found || indicator !== "seq-item-ind")
              spaceBefore = true;
          } else
            commentSep += token.source;
          atNewline = true;
          hasNewline = true;
          if (anchor || tag)
            newlineAfterProp = token;
          hasSpace = true;
          break;
        case "anchor":
          if (anchor)
            onError(token, "MULTIPLE_ANCHORS", "A node can have at most one anchor");
          if (token.source.endsWith(":"))
            onError(token.offset + token.source.length - 1, "BAD_ALIAS", "Anchor ending in : is ambiguous", true);
          anchor = token;
          start ?? (start = token.offset);
          atNewline = false;
          hasSpace = false;
          reqSpace = true;
          break;
        case "tag": {
          if (tag)
            onError(token, "MULTIPLE_TAGS", "A node can have at most one tag");
          tag = token;
          start ?? (start = token.offset);
          atNewline = false;
          hasSpace = false;
          reqSpace = true;
          break;
        }
        case indicator:
          if (anchor || tag)
            onError(token, "BAD_PROP_ORDER", `Anchors and tags must be after the ${token.source} indicator`);
          if (found)
            onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.source} in ${flow ?? "collection"}`);
          found = token;
          atNewline = indicator === "seq-item-ind" || indicator === "explicit-key-ind";
          hasSpace = false;
          break;
        case "comma":
          if (flow) {
            if (comma)
              onError(token, "UNEXPECTED_TOKEN", `Unexpected , in ${flow}`);
            comma = token;
            atNewline = false;
            hasSpace = false;
            break;
          }
        default:
          onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.type} token`);
          atNewline = false;
          hasSpace = false;
      }
    }
    const last = tokens[tokens.length - 1];
    const end = last ? last.offset + last.source.length : offset;
    if (reqSpace && next && next.type !== "space" && next.type !== "newline" && next.type !== "comma" && (next.type !== "scalar" || next.source !== "")) {
      onError(next.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
    }
    if (tab && (atNewline && tab.indent <= parentIndent || next?.type === "block-map" || next?.type === "block-seq"))
      onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
    return {
      comma,
      found,
      spaceBefore,
      comment,
      hasNewline,
      anchor,
      tag,
      newlineAfterProp,
      end,
      start: start ?? end
    };
  }
  exports.resolveProps = resolveProps;
});

// node_modules/yaml/dist/compose/util-contains-newline.js
var require_util_contains_newline = __commonJS(function(exports) {
  function containsNewline(key) {
    if (!key)
      return null;
    switch (key.type) {
      case "alias":
      case "scalar":
      case "double-quoted-scalar":
      case "single-quoted-scalar":
        if (key.source.includes(`
`))
          return true;
        if (key.end) {
          for (const st of key.end)
            if (st.type === "newline")
              return true;
        }
        return false;
      case "flow-collection":
        for (const it of key.items) {
          for (const st of it.start)
            if (st.type === "newline")
              return true;
          if (it.sep) {
            for (const st of it.sep)
              if (st.type === "newline")
                return true;
          }
          if (containsNewline(it.key) || containsNewline(it.value))
            return true;
        }
        return false;
      default:
        return true;
    }
  }
  exports.containsNewline = containsNewline;
});

// node_modules/yaml/dist/compose/util-flow-indent-check.js
var require_util_flow_indent_check = __commonJS(function(exports) {
  var utilContainsNewline = require_util_contains_newline();
  function flowIndentCheck(indent, fc, onError) {
    if (fc?.type === "flow-collection") {
      const end = fc.end[0];
      if (end.indent === indent && (end.source === "]" || end.source === "}") && utilContainsNewline.containsNewline(fc)) {
        const msg = "Flow end indicator should be more indented than parent";
        onError(end, "BAD_INDENT", msg, true);
      }
    }
  }
  exports.flowIndentCheck = flowIndentCheck;
});

// node_modules/yaml/dist/compose/util-map-includes.js
var require_util_map_includes = __commonJS(function(exports) {
  var identity = require_identity();
  function mapIncludes(ctx, items, search) {
    const { uniqueKeys } = ctx.options;
    if (uniqueKeys === false)
      return false;
    const isEqual = typeof uniqueKeys === "function" ? uniqueKeys : (a, b) => a === b || identity.isScalar(a) && identity.isScalar(b) && a.value === b.value;
    return items.some((pair) => isEqual(pair.key, search));
  }
  exports.mapIncludes = mapIncludes;
});

// node_modules/yaml/dist/compose/resolve-block-map.js
var require_resolve_block_map = __commonJS(function(exports) {
  var Pair = require_Pair();
  var YAMLMap = require_YAMLMap();
  var resolveProps = require_resolve_props();
  var utilContainsNewline = require_util_contains_newline();
  var utilFlowIndentCheck = require_util_flow_indent_check();
  var utilMapIncludes = require_util_map_includes();
  var startColMsg = "All mapping items must start at the same column";
  function resolveBlockMap({ composeNode, composeEmptyNode }, ctx, bm, onError, tag) {
    const NodeClass = tag?.nodeClass ?? YAMLMap.YAMLMap;
    const map = new NodeClass(ctx.schema);
    if (ctx.atRoot)
      ctx.atRoot = false;
    let offset = bm.offset;
    let commentEnd = null;
    for (const collItem of bm.items) {
      const { start, key, sep, value } = collItem;
      const keyProps = resolveProps.resolveProps(start, {
        indicator: "explicit-key-ind",
        next: key ?? sep?.[0],
        offset,
        onError,
        parentIndent: bm.indent,
        startOnNewline: true
      });
      const implicitKey = !keyProps.found;
      if (implicitKey) {
        if (key) {
          if (key.type === "block-seq")
            onError(offset, "BLOCK_AS_IMPLICIT_KEY", "A block sequence may not be used as an implicit map key");
          else if ("indent" in key && key.indent !== bm.indent)
            onError(offset, "BAD_INDENT", startColMsg);
        }
        if (!keyProps.anchor && !keyProps.tag && !sep) {
          commentEnd = keyProps.end;
          if (keyProps.comment) {
            if (map.comment)
              map.comment += `
` + keyProps.comment;
            else
              map.comment = keyProps.comment;
          }
          continue;
        }
        if (keyProps.newlineAfterProp || utilContainsNewline.containsNewline(key)) {
          onError(key ?? start[start.length - 1], "MULTILINE_IMPLICIT_KEY", "Implicit keys need to be on a single line");
        }
      } else if (keyProps.found?.indent !== bm.indent) {
        onError(offset, "BAD_INDENT", startColMsg);
      }
      ctx.atKey = true;
      const keyStart = keyProps.end;
      const keyNode = key ? composeNode(ctx, key, keyProps, onError) : composeEmptyNode(ctx, keyStart, start, null, keyProps, onError);
      if (ctx.schema.compat)
        utilFlowIndentCheck.flowIndentCheck(bm.indent, key, onError);
      ctx.atKey = false;
      if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
        onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
      const valueProps = resolveProps.resolveProps(sep ?? [], {
        indicator: "map-value-ind",
        next: value,
        offset: keyNode.range[2],
        onError,
        parentIndent: bm.indent,
        startOnNewline: !key || key.type === "block-scalar"
      });
      offset = valueProps.end;
      if (valueProps.found) {
        if (implicitKey) {
          if (value?.type === "block-map" && !valueProps.hasNewline)
            onError(offset, "BLOCK_AS_IMPLICIT_KEY", "Nested mappings are not allowed in compact mappings");
          if (ctx.options.strict && keyProps.start < valueProps.found.offset - 1024)
            onError(keyNode.range, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit block mapping key");
        }
        const valueNode = value ? composeNode(ctx, value, valueProps, onError) : composeEmptyNode(ctx, offset, sep, null, valueProps, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bm.indent, value, onError);
        offset = valueNode.range[2];
        const pair = new Pair.Pair(keyNode, valueNode);
        if (ctx.options.keepSourceTokens)
          pair.srcToken = collItem;
        map.items.push(pair);
      } else {
        if (implicitKey)
          onError(keyNode.range, "MISSING_CHAR", "Implicit map keys need to be followed by map values");
        if (valueProps.comment) {
          if (keyNode.comment)
            keyNode.comment += `
` + valueProps.comment;
          else
            keyNode.comment = valueProps.comment;
        }
        const pair = new Pair.Pair(keyNode);
        if (ctx.options.keepSourceTokens)
          pair.srcToken = collItem;
        map.items.push(pair);
      }
    }
    if (commentEnd && commentEnd < offset)
      onError(commentEnd, "IMPOSSIBLE", "Map comment with trailing content");
    map.range = [bm.offset, offset, commentEnd ?? offset];
    return map;
  }
  exports.resolveBlockMap = resolveBlockMap;
});

// node_modules/yaml/dist/compose/resolve-block-seq.js
var require_resolve_block_seq = __commonJS(function(exports) {
  var YAMLSeq = require_YAMLSeq();
  var resolveProps = require_resolve_props();
  var utilFlowIndentCheck = require_util_flow_indent_check();
  function resolveBlockSeq({ composeNode, composeEmptyNode }, ctx, bs, onError, tag) {
    const NodeClass = tag?.nodeClass ?? YAMLSeq.YAMLSeq;
    const seq = new NodeClass(ctx.schema);
    if (ctx.atRoot)
      ctx.atRoot = false;
    if (ctx.atKey)
      ctx.atKey = false;
    let offset = bs.offset;
    let commentEnd = null;
    for (const { start, value } of bs.items) {
      const props = resolveProps.resolveProps(start, {
        indicator: "seq-item-ind",
        next: value,
        offset,
        onError,
        parentIndent: bs.indent,
        startOnNewline: true
      });
      if (!props.found) {
        if (props.anchor || props.tag || value) {
          if (value?.type === "block-seq")
            onError(props.end, "BAD_INDENT", "All sequence items must start at the same column");
          else
            onError(offset, "MISSING_CHAR", "Sequence item without - indicator");
        } else {
          commentEnd = props.end;
          if (props.comment)
            seq.comment = props.comment;
          continue;
        }
      }
      const node = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, start, null, props, onError);
      if (ctx.schema.compat)
        utilFlowIndentCheck.flowIndentCheck(bs.indent, value, onError);
      offset = node.range[2];
      seq.items.push(node);
    }
    seq.range = [bs.offset, offset, commentEnd ?? offset];
    return seq;
  }
  exports.resolveBlockSeq = resolveBlockSeq;
});

// node_modules/yaml/dist/compose/resolve-end.js
var require_resolve_end = __commonJS(function(exports) {
  function resolveEnd(end, offset, reqSpace, onError) {
    let comment = "";
    if (end) {
      let hasSpace = false;
      let sep = "";
      for (const token of end) {
        const { source, type } = token;
        switch (type) {
          case "space":
            hasSpace = true;
            break;
          case "comment": {
            if (reqSpace && !hasSpace)
              onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
            const cb = source.substring(1) || " ";
            if (!comment)
              comment = cb;
            else
              comment += sep + cb;
            sep = "";
            break;
          }
          case "newline":
            if (comment)
              sep += source;
            hasSpace = true;
            break;
          default:
            onError(token, "UNEXPECTED_TOKEN", `Unexpected ${type} at node end`);
        }
        offset += source.length;
      }
    }
    return { comment, offset };
  }
  exports.resolveEnd = resolveEnd;
});

// node_modules/yaml/dist/compose/resolve-flow-collection.js
var require_resolve_flow_collection = __commonJS(function(exports) {
  var identity = require_identity();
  var Pair = require_Pair();
  var YAMLMap = require_YAMLMap();
  var YAMLSeq = require_YAMLSeq();
  var resolveEnd = require_resolve_end();
  var resolveProps = require_resolve_props();
  var utilContainsNewline = require_util_contains_newline();
  var utilMapIncludes = require_util_map_includes();
  var blockMsg = "Block collections are not allowed within flow collections";
  var isBlock = (token) => token && (token.type === "block-map" || token.type === "block-seq");
  function resolveFlowCollection({ composeNode, composeEmptyNode }, ctx, fc, onError, tag) {
    const isMap = fc.start.source === "{";
    const fcName = isMap ? "flow map" : "flow sequence";
    const NodeClass = tag?.nodeClass ?? (isMap ? YAMLMap.YAMLMap : YAMLSeq.YAMLSeq);
    const coll = new NodeClass(ctx.schema);
    coll.flow = true;
    const atRoot = ctx.atRoot;
    if (atRoot)
      ctx.atRoot = false;
    if (ctx.atKey)
      ctx.atKey = false;
    let offset = fc.offset + fc.start.source.length;
    for (let i = 0;i < fc.items.length; ++i) {
      const collItem = fc.items[i];
      const { start, key, sep, value } = collItem;
      const props = resolveProps.resolveProps(start, {
        flow: fcName,
        indicator: "explicit-key-ind",
        next: key ?? sep?.[0],
        offset,
        onError,
        parentIndent: fc.indent,
        startOnNewline: false
      });
      if (!props.found) {
        if (!props.anchor && !props.tag && !sep && !value) {
          if (i === 0 && props.comma)
            onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
          else if (i < fc.items.length - 1)
            onError(props.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${fcName}`);
          if (props.comment) {
            if (coll.comment)
              coll.comment += `
` + props.comment;
            else
              coll.comment = props.comment;
          }
          offset = props.end;
          continue;
        }
        if (!isMap && ctx.options.strict && utilContainsNewline.containsNewline(key))
          onError(key, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
      }
      if (i === 0) {
        if (props.comma)
          onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
      } else {
        if (!props.comma)
          onError(props.start, "MISSING_CHAR", `Missing , between ${fcName} items`);
        if (props.comment) {
          let prevItemComment = "";
          loop:
            for (const st of start) {
              switch (st.type) {
                case "comma":
                case "space":
                  break;
                case "comment":
                  prevItemComment = st.source.substring(1);
                  break loop;
                default:
                  break loop;
              }
            }
          if (prevItemComment) {
            let prev = coll.items[coll.items.length - 1];
            if (identity.isPair(prev))
              prev = prev.value ?? prev.key;
            if (prev.comment)
              prev.comment += `
` + prevItemComment;
            else
              prev.comment = prevItemComment;
            props.comment = props.comment.substring(prevItemComment.length + 1);
          }
        }
      }
      if (!isMap && !sep && !props.found) {
        const valueNode = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, sep, null, props, onError);
        coll.items.push(valueNode);
        offset = valueNode.range[2];
        if (isBlock(value))
          onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
      } else {
        ctx.atKey = true;
        const keyStart = props.end;
        const keyNode = key ? composeNode(ctx, key, props, onError) : composeEmptyNode(ctx, keyStart, start, null, props, onError);
        if (isBlock(key))
          onError(keyNode.range, "BLOCK_IN_FLOW", blockMsg);
        ctx.atKey = false;
        const valueProps = resolveProps.resolveProps(sep ?? [], {
          flow: fcName,
          indicator: "map-value-ind",
          next: value,
          offset: keyNode.range[2],
          onError,
          parentIndent: fc.indent,
          startOnNewline: false
        });
        if (valueProps.found) {
          if (!isMap && !props.found && ctx.options.strict) {
            if (sep)
              for (const st of sep) {
                if (st === valueProps.found)
                  break;
                if (st.type === "newline") {
                  onError(st, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
                  break;
                }
              }
            if (props.start < valueProps.found.offset - 1024)
              onError(valueProps.found, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key");
          }
        } else if (value) {
          if ("source" in value && value.source?.[0] === ":")
            onError(value, "MISSING_CHAR", `Missing space after : in ${fcName}`);
          else
            onError(valueProps.start, "MISSING_CHAR", `Missing , or : between ${fcName} items`);
        }
        const valueNode = value ? composeNode(ctx, value, valueProps, onError) : valueProps.found ? composeEmptyNode(ctx, valueProps.end, sep, null, valueProps, onError) : null;
        if (valueNode) {
          if (isBlock(value))
            onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
        } else if (valueProps.comment) {
          if (keyNode.comment)
            keyNode.comment += `
` + valueProps.comment;
          else
            keyNode.comment = valueProps.comment;
        }
        const pair = new Pair.Pair(keyNode, valueNode);
        if (ctx.options.keepSourceTokens)
          pair.srcToken = collItem;
        if (isMap) {
          const map = coll;
          if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
            onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
          map.items.push(pair);
        } else {
          const map = new YAMLMap.YAMLMap(ctx.schema);
          map.flow = true;
          map.items.push(pair);
          const endRange = (valueNode ?? keyNode).range;
          map.range = [keyNode.range[0], endRange[1], endRange[2]];
          coll.items.push(map);
        }
        offset = valueNode ? valueNode.range[2] : valueProps.end;
      }
    }
    const expectedEnd = isMap ? "}" : "]";
    const [ce, ...ee] = fc.end;
    let cePos = offset;
    if (ce?.source === expectedEnd)
      cePos = ce.offset + ce.source.length;
    else {
      const name = fcName[0].toUpperCase() + fcName.substring(1);
      const msg = atRoot ? `${name} must end with a ${expectedEnd}` : `${name} in block collection must be sufficiently indented and end with a ${expectedEnd}`;
      onError(offset, atRoot ? "MISSING_CHAR" : "BAD_INDENT", msg);
      if (ce && ce.source.length !== 1)
        ee.unshift(ce);
    }
    if (ee.length > 0) {
      const end = resolveEnd.resolveEnd(ee, cePos, ctx.options.strict, onError);
      if (end.comment) {
        if (coll.comment)
          coll.comment += `
` + end.comment;
        else
          coll.comment = end.comment;
      }
      coll.range = [fc.offset, cePos, end.offset];
    } else {
      coll.range = [fc.offset, cePos, cePos];
    }
    return coll;
  }
  exports.resolveFlowCollection = resolveFlowCollection;
});

// node_modules/yaml/dist/compose/compose-collection.js
var require_compose_collection = __commonJS(function(exports) {
  var identity = require_identity();
  var Scalar = require_Scalar();
  var YAMLMap = require_YAMLMap();
  var YAMLSeq = require_YAMLSeq();
  var resolveBlockMap = require_resolve_block_map();
  var resolveBlockSeq = require_resolve_block_seq();
  var resolveFlowCollection = require_resolve_flow_collection();
  function resolveCollection(CN, ctx, token, onError, tagName, tag) {
    const coll = token.type === "block-map" ? resolveBlockMap.resolveBlockMap(CN, ctx, token, onError, tag) : token.type === "block-seq" ? resolveBlockSeq.resolveBlockSeq(CN, ctx, token, onError, tag) : resolveFlowCollection.resolveFlowCollection(CN, ctx, token, onError, tag);
    const Coll = coll.constructor;
    if (tagName === "!" || tagName === Coll.tagName) {
      coll.tag = Coll.tagName;
      return coll;
    }
    if (tagName)
      coll.tag = tagName;
    return coll;
  }
  function composeCollection(CN, ctx, token, props, onError) {
    const tagToken = props.tag;
    const tagName = !tagToken ? null : ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg));
    if (token.type === "block-seq") {
      const { anchor, newlineAfterProp: nl } = props;
      const lastProp = anchor && tagToken ? anchor.offset > tagToken.offset ? anchor : tagToken : anchor ?? tagToken;
      if (lastProp && (!nl || nl.offset < lastProp.offset)) {
        const message = "Missing newline after block sequence props";
        onError(lastProp, "MISSING_CHAR", message);
      }
    }
    const expType = token.type === "block-map" ? "map" : token.type === "block-seq" ? "seq" : token.start.source === "{" ? "map" : "seq";
    if (!tagToken || !tagName || tagName === "!" || tagName === YAMLMap.YAMLMap.tagName && expType === "map" || tagName === YAMLSeq.YAMLSeq.tagName && expType === "seq") {
      return resolveCollection(CN, ctx, token, onError, tagName);
    }
    let tag = ctx.schema.tags.find((t) => t.tag === tagName && t.collection === expType);
    if (!tag) {
      const kt = ctx.schema.knownTags[tagName];
      if (kt?.collection === expType) {
        ctx.schema.tags.push(Object.assign({}, kt, { default: false }));
        tag = kt;
      } else {
        if (kt) {
          onError(tagToken, "BAD_COLLECTION_TYPE", `${kt.tag} used for ${expType} collection, but expects ${kt.collection ?? "scalar"}`, true);
        } else {
          onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, true);
        }
        return resolveCollection(CN, ctx, token, onError, tagName);
      }
    }
    const coll = resolveCollection(CN, ctx, token, onError, tagName, tag);
    const res = tag.resolve?.(coll, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg), ctx.options) ?? coll;
    const node = identity.isNode(res) ? res : new Scalar.Scalar(res);
    node.range = coll.range;
    node.tag = tagName;
    if (tag?.format)
      node.format = tag.format;
    return node;
  }
  exports.composeCollection = composeCollection;
});

// node_modules/yaml/dist/compose/resolve-block-scalar.js
var require_resolve_block_scalar = __commonJS(function(exports) {
  var Scalar = require_Scalar();
  function resolveBlockScalar(ctx, scalar, onError) {
    const start = scalar.offset;
    const header = parseBlockScalarHeader(scalar, ctx.options.strict, onError);
    if (!header)
      return { value: "", type: null, comment: "", range: [start, start, start] };
    const type = header.mode === ">" ? Scalar.Scalar.BLOCK_FOLDED : Scalar.Scalar.BLOCK_LITERAL;
    const lines = scalar.source ? splitLines(scalar.source) : [];
    let chompStart = lines.length;
    for (let i = lines.length - 1;i >= 0; --i) {
      const content = lines[i][1];
      if (content === "" || content === "\r")
        chompStart = i;
      else
        break;
    }
    if (chompStart === 0) {
      const value = header.chomp === "+" && lines.length > 0 ? `
`.repeat(Math.max(1, lines.length - 1)) : "";
      let end = start + header.length;
      if (scalar.source)
        end += scalar.source.length;
      return { value, type, comment: header.comment, range: [start, end, end] };
    }
    let trimIndent = scalar.indent + header.indent;
    let offset = scalar.offset + header.length;
    let contentStart = 0;
    for (let i = 0;i < chompStart; ++i) {
      const [indent, content] = lines[i];
      if (content === "" || content === "\r") {
        if (header.indent === 0 && indent.length > trimIndent)
          trimIndent = indent.length;
      } else {
        if (indent.length < trimIndent) {
          const message = "Block scalars with more-indented leading empty lines must use an explicit indentation indicator";
          onError(offset + indent.length, "MISSING_CHAR", message);
        }
        if (header.indent === 0)
          trimIndent = indent.length;
        contentStart = i;
        if (trimIndent === 0 && !ctx.atRoot) {
          const message = "Block scalar values in collections must be indented";
          onError(offset, "BAD_INDENT", message);
        }
        break;
      }
      offset += indent.length + content.length + 1;
    }
    for (let i = lines.length - 1;i >= chompStart; --i) {
      if (lines[i][0].length > trimIndent)
        chompStart = i + 1;
    }
    let value = "";
    let sep = "";
    let prevMoreIndented = false;
    for (let i = 0;i < contentStart; ++i)
      value += lines[i][0].slice(trimIndent) + `
`;
    for (let i = contentStart;i < chompStart; ++i) {
      let [indent, content] = lines[i];
      offset += indent.length + content.length + 1;
      const crlf = content[content.length - 1] === "\r";
      if (crlf)
        content = content.slice(0, -1);
      if (content && indent.length < trimIndent) {
        const src = header.indent ? "explicit indentation indicator" : "first line";
        const message = `Block scalar lines must not be less indented than their ${src}`;
        onError(offset - content.length - (crlf ? 2 : 1), "BAD_INDENT", message);
        indent = "";
      }
      if (type === Scalar.Scalar.BLOCK_LITERAL) {
        value += sep + indent.slice(trimIndent) + content;
        sep = `
`;
      } else if (indent.length > trimIndent || content[0] === "\t") {
        if (sep === " ")
          sep = `
`;
        else if (!prevMoreIndented && sep === `
`)
          sep = `

`;
        value += sep + indent.slice(trimIndent) + content;
        sep = `
`;
        prevMoreIndented = true;
      } else if (content === "") {
        if (sep === `
`)
          value += `
`;
        else
          sep = `
`;
      } else {
        value += sep + content;
        sep = " ";
        prevMoreIndented = false;
      }
    }
    switch (header.chomp) {
      case "-":
        break;
      case "+":
        for (let i = chompStart;i < lines.length; ++i)
          value += `
` + lines[i][0].slice(trimIndent);
        if (value[value.length - 1] !== `
`)
          value += `
`;
        break;
      default:
        value += `
`;
    }
    const end = start + header.length + scalar.source.length;
    return { value, type, comment: header.comment, range: [start, end, end] };
  }
  function parseBlockScalarHeader({ offset, props }, strict, onError) {
    if (props[0].type !== "block-scalar-header") {
      onError(props[0], "IMPOSSIBLE", "Block scalar header not found");
      return null;
    }
    const { source } = props[0];
    const mode = source[0];
    let indent = 0;
    let chomp = "";
    let error = -1;
    for (let i = 1;i < source.length; ++i) {
      const ch = source[i];
      if (!chomp && (ch === "-" || ch === "+"))
        chomp = ch;
      else {
        const n = Number(ch);
        if (!indent && n)
          indent = n;
        else if (error === -1)
          error = offset + i;
      }
    }
    if (error !== -1)
      onError(error, "UNEXPECTED_TOKEN", `Block scalar header includes extra characters: ${source}`);
    let hasSpace = false;
    let comment = "";
    let length = source.length;
    for (let i = 1;i < props.length; ++i) {
      const token = props[i];
      switch (token.type) {
        case "space":
          hasSpace = true;
        case "newline":
          length += token.source.length;
          break;
        case "comment":
          if (strict && !hasSpace) {
            const message = "Comments must be separated from other tokens by white space characters";
            onError(token, "MISSING_CHAR", message);
          }
          length += token.source.length;
          comment = token.source.substring(1);
          break;
        case "error":
          onError(token, "UNEXPECTED_TOKEN", token.message);
          length += token.source.length;
          break;
        default: {
          const message = `Unexpected token in block scalar header: ${token.type}`;
          onError(token, "UNEXPECTED_TOKEN", message);
          const ts = token.source;
          if (ts && typeof ts === "string")
            length += ts.length;
        }
      }
    }
    return { mode, indent, chomp, comment, length };
  }
  function splitLines(source) {
    const split = source.split(/\n( *)/);
    const first = split[0];
    const m = first.match(/^( *)/);
    const line0 = m?.[1] ? [m[1], first.slice(m[1].length)] : ["", first];
    const lines = [line0];
    for (let i = 1;i < split.length; i += 2)
      lines.push([split[i], split[i + 1]]);
    return lines;
  }
  exports.resolveBlockScalar = resolveBlockScalar;
});

// node_modules/yaml/dist/compose/resolve-flow-scalar.js
var require_resolve_flow_scalar = __commonJS(function(exports) {
  var Scalar = require_Scalar();
  var resolveEnd = require_resolve_end();
  function resolveFlowScalar(scalar, strict, onError) {
    const { offset, type, source, end } = scalar;
    let _type;
    let value;
    const _onError = (rel, code, msg) => onError(offset + rel, code, msg);
    switch (type) {
      case "scalar":
        _type = Scalar.Scalar.PLAIN;
        value = plainValue(source, _onError);
        break;
      case "single-quoted-scalar":
        _type = Scalar.Scalar.QUOTE_SINGLE;
        value = singleQuotedValue(source, _onError);
        break;
      case "double-quoted-scalar":
        _type = Scalar.Scalar.QUOTE_DOUBLE;
        value = doubleQuotedValue(source, _onError);
        break;
      default:
        onError(scalar, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${type}`);
        return {
          value: "",
          type: null,
          comment: "",
          range: [offset, offset + source.length, offset + source.length]
        };
    }
    const valueEnd = offset + source.length;
    const re = resolveEnd.resolveEnd(end, valueEnd, strict, onError);
    return {
      value,
      type: _type,
      comment: re.comment,
      range: [offset, valueEnd, re.offset]
    };
  }
  function plainValue(source, onError) {
    let badChar = "";
    switch (source[0]) {
      case "\t":
        badChar = "a tab character";
        break;
      case ",":
        badChar = "flow indicator character ,";
        break;
      case "%":
        badChar = "directive indicator character %";
        break;
      case "|":
      case ">": {
        badChar = `block scalar indicator ${source[0]}`;
        break;
      }
      case "@":
      case "`": {
        badChar = `reserved character ${source[0]}`;
        break;
      }
    }
    if (badChar)
      onError(0, "BAD_SCALAR_START", `Plain value cannot start with ${badChar}`);
    return unfoldLines(source);
  }
  function singleQuotedValue(source, onError) {
    if (source[source.length - 1] !== "'" || source.length === 1)
      onError(source.length, "MISSING_CHAR", "Missing closing 'quote");
    return unfoldLines(source.slice(1, -1)).replace(/''/g, "'");
  }
  function unfoldLines(source) {
    const line = /(.*?)\r?\n/sy;
    let match = line.exec(source);
    if (!match)
      return source;
    let trimEnd, trimBoth;
    try {
      trimEnd = new RegExp("(?<![ \t])[ \t]+$");
      trimBoth = new RegExp("^[ \t]+|(?<![ \t])[ \t]+$", "g");
    } catch {
      trimEnd = /[ \t]+$/;
      trimBoth = /^[ \t]+|[ \t]+$/g;
    }
    let res = match[1].replace(trimEnd, "");
    let sep = " ";
    let pos = line.lastIndex;
    while (match = line.exec(source)) {
      const lm = match[1].replace(trimBoth, "");
      if (lm === "") {
        if (sep === `
`)
          res += sep;
        else
          sep = `
`;
      } else {
        res += sep + lm;
        sep = " ";
      }
      pos = line.lastIndex;
    }
    const last = /[ \t]*(.*)/sy;
    last.lastIndex = pos;
    match = last.exec(source);
    return res + sep + (match?.[1] ?? "");
  }
  function doubleQuotedValue(source, onError) {
    let res = "";
    for (let i = 1;i < source.length - 1; ++i) {
      const ch = source[i];
      if (ch === "\r" && source[i + 1] === `
`)
        continue;
      if (ch === `
`) {
        const { fold, offset } = foldNewline(source, i);
        res += fold;
        i = offset;
      } else if (ch === "\\") {
        let next = source[++i];
        const cc = escapeCodes[next];
        if (cc)
          res += cc;
        else if (next === `
`) {
          next = source[i + 1];
          while (next === " " || next === "\t")
            next = source[++i + 1];
        } else if (next === "\r" && source[i + 1] === `
`) {
          next = source[++i + 1];
          while (next === " " || next === "\t")
            next = source[++i + 1];
        } else if (next === "x" || next === "u" || next === "U") {
          const length = next === "x" ? 2 : next === "u" ? 4 : 8;
          res += parseCharCode(source, i + 1, length, onError);
          i += length;
        } else {
          const raw = source.substr(i - 1, 2);
          onError(i - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
          res += raw;
        }
      } else if (ch === " " || ch === "\t") {
        const wsStart = i;
        let next = source[i + 1];
        while (next === " " || next === "\t")
          next = source[++i + 1];
        if (next !== `
` && !(next === "\r" && source[i + 2] === `
`))
          res += i > wsStart ? source.slice(wsStart, i + 1) : ch;
      } else {
        res += ch;
      }
    }
    if (source[source.length - 1] !== '"' || source.length === 1)
      onError(source.length, "MISSING_CHAR", 'Missing closing "quote');
    return res;
  }
  function foldNewline(source, offset) {
    let fold = "";
    let ch = source[offset + 1];
    while (ch === " " || ch === "\t" || ch === `
` || ch === "\r") {
      if (ch === "\r" && source[offset + 2] !== `
`)
        break;
      if (ch === `
`)
        fold += `
`;
      offset += 1;
      ch = source[offset + 1];
    }
    if (!fold)
      fold = " ";
    return { fold, offset };
  }
  var escapeCodes = {
    "0": "\x00",
    a: "\x07",
    b: "\b",
    e: "\x1B",
    f: "\f",
    n: `
`,
    r: "\r",
    t: "\t",
    v: "\v",
    N: "",
    _: " ",
    L: "\u2028",
    P: "\u2029",
    " ": " ",
    '"': '"',
    "/": "/",
    "\\": "\\",
    "\t": "\t"
  };
  function parseCharCode(source, offset, length, onError) {
    const cc = source.substr(offset, length);
    const ok = cc.length === length && /^[0-9a-fA-F]+$/.test(cc);
    const code = ok ? parseInt(cc, 16) : NaN;
    try {
      return String.fromCodePoint(code);
    } catch {
      const raw = source.substr(offset - 2, length + 2);
      onError(offset - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
      return raw;
    }
  }
  exports.resolveFlowScalar = resolveFlowScalar;
});

// node_modules/yaml/dist/compose/compose-scalar.js
var require_compose_scalar = __commonJS(function(exports) {
  var identity = require_identity();
  var Scalar = require_Scalar();
  var resolveBlockScalar = require_resolve_block_scalar();
  var resolveFlowScalar = require_resolve_flow_scalar();
  function composeScalar(ctx, token, tagToken, onError) {
    const { value, type, comment, range } = token.type === "block-scalar" ? resolveBlockScalar.resolveBlockScalar(ctx, token, onError) : resolveFlowScalar.resolveFlowScalar(token, ctx.options.strict, onError);
    const tagName = tagToken ? ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg)) : null;
    let tag;
    if (ctx.options.stringKeys && ctx.atKey) {
      tag = ctx.schema[identity.SCALAR];
    } else if (tagName)
      tag = findScalarTagByName(ctx.schema, value, tagName, tagToken, onError);
    else if (token.type === "scalar")
      tag = findScalarTagByTest(ctx, value, token, onError);
    else
      tag = ctx.schema[identity.SCALAR];
    let scalar;
    try {
      const res = tag.resolve(value, (msg) => onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg), ctx.options);
      scalar = identity.isScalar(res) ? res : new Scalar.Scalar(res);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg);
      scalar = new Scalar.Scalar(value);
    }
    scalar.range = range;
    scalar.source = value;
    if (type)
      scalar.type = type;
    if (tagName)
      scalar.tag = tagName;
    if (tag.format)
      scalar.format = tag.format;
    if (comment)
      scalar.comment = comment;
    return scalar;
  }
  function findScalarTagByName(schema, value, tagName, tagToken, onError) {
    if (tagName === "!")
      return schema[identity.SCALAR];
    const matchWithTest = [];
    for (const tag of schema.tags) {
      if (!tag.collection && tag.tag === tagName) {
        if (tag.default && tag.test)
          matchWithTest.push(tag);
        else
          return tag;
      }
    }
    for (const tag of matchWithTest)
      if (tag.test?.test(value))
        return tag;
    const kt = schema.knownTags[tagName];
    if (kt && !kt.collection) {
      schema.tags.push(Object.assign({}, kt, { default: false, test: undefined }));
      return kt;
    }
    onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, tagName !== "tag:yaml.org,2002:str");
    return schema[identity.SCALAR];
  }
  function findScalarTagByTest({ atKey, directives, schema }, value, token, onError) {
    const tag = schema.tags.find((tag) => (tag.default === true || atKey && tag.default === "key") && tag.test?.test(value)) || schema[identity.SCALAR];
    if (schema.compat) {
      const compat = schema.compat.find((tag) => tag.default && tag.test?.test(value)) ?? schema[identity.SCALAR];
      if (tag.tag !== compat.tag) {
        const ts = directives.tagString(tag.tag);
        const cs = directives.tagString(compat.tag);
        const msg = `Value may be parsed as either ${ts} or ${cs}`;
        onError(token, "TAG_RESOLVE_FAILED", msg, true);
      }
    }
    return tag;
  }
  exports.composeScalar = composeScalar;
});

// node_modules/yaml/dist/compose/util-empty-scalar-position.js
var require_util_empty_scalar_position = __commonJS(function(exports) {
  function emptyScalarPosition(offset, before, pos) {
    if (before) {
      pos ?? (pos = before.length);
      for (let i = pos - 1;i >= 0; --i) {
        let st = before[i];
        switch (st.type) {
          case "space":
          case "comment":
          case "newline":
            offset -= st.source.length;
            continue;
        }
        st = before[++i];
        while (st?.type === "space") {
          offset += st.source.length;
          st = before[++i];
        }
        break;
      }
    }
    return offset;
  }
  exports.emptyScalarPosition = emptyScalarPosition;
});

// node_modules/yaml/dist/compose/compose-node.js
var require_compose_node = __commonJS(function(exports) {
  var Alias = require_Alias();
  var identity = require_identity();
  var composeCollection = require_compose_collection();
  var composeScalar = require_compose_scalar();
  var resolveEnd = require_resolve_end();
  var utilEmptyScalarPosition = require_util_empty_scalar_position();
  var CN = { composeNode, composeEmptyNode };
  function composeNode(ctx, token, props, onError) {
    const atKey = ctx.atKey;
    const { spaceBefore, comment, anchor, tag } = props;
    let node;
    let isSrcToken = true;
    switch (token.type) {
      case "alias":
        node = composeAlias(ctx, token, onError);
        if (anchor || tag)
          onError(token, "ALIAS_PROPS", "An alias node must not specify any properties");
        break;
      case "scalar":
      case "single-quoted-scalar":
      case "double-quoted-scalar":
      case "block-scalar":
        node = composeScalar.composeScalar(ctx, token, tag, onError);
        if (anchor)
          node.anchor = anchor.source.substring(1);
        break;
      case "block-map":
      case "block-seq":
      case "flow-collection":
        try {
          node = composeCollection.composeCollection(CN, ctx, token, props, onError);
          if (anchor)
            node.anchor = anchor.source.substring(1);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          onError(token, "RESOURCE_EXHAUSTION", message);
        }
        break;
      default: {
        const message = token.type === "error" ? token.message : `Unsupported token (type: ${token.type})`;
        onError(token, "UNEXPECTED_TOKEN", message);
        isSrcToken = false;
      }
    }
    node ?? (node = composeEmptyNode(ctx, token.offset, undefined, null, props, onError));
    if (anchor && node.anchor === "")
      onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
    if (atKey && ctx.options.stringKeys && (!identity.isScalar(node) || typeof node.value !== "string" || node.tag && node.tag !== "tag:yaml.org,2002:str")) {
      const msg = "With stringKeys, all keys must be strings";
      onError(tag ?? token, "NON_STRING_KEY", msg);
    }
    if (spaceBefore)
      node.spaceBefore = true;
    if (comment) {
      if (token.type === "scalar" && token.source === "")
        node.comment = comment;
      else
        node.commentBefore = comment;
    }
    if (ctx.options.keepSourceTokens && isSrcToken)
      node.srcToken = token;
    return node;
  }
  function composeEmptyNode(ctx, offset, before, pos, { spaceBefore, comment, anchor, tag, end }, onError) {
    const token = {
      type: "scalar",
      offset: utilEmptyScalarPosition.emptyScalarPosition(offset, before, pos),
      indent: -1,
      source: ""
    };
    const node = composeScalar.composeScalar(ctx, token, tag, onError);
    if (anchor) {
      node.anchor = anchor.source.substring(1);
      if (node.anchor === "")
        onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
    }
    if (spaceBefore)
      node.spaceBefore = true;
    if (comment) {
      node.comment = comment;
      node.range[2] = end;
    }
    return node;
  }
  function composeAlias({ options }, { offset, source, end }, onError) {
    const alias = new Alias.Alias(source.substring(1));
    if (alias.source === "")
      onError(offset, "BAD_ALIAS", "Alias cannot be an empty string");
    if (alias.source.endsWith(":"))
      onError(offset + source.length - 1, "BAD_ALIAS", "Alias ending in : is ambiguous", true);
    const valueEnd = offset + source.length;
    const re = resolveEnd.resolveEnd(end, valueEnd, options.strict, onError);
    alias.range = [offset, valueEnd, re.offset];
    if (re.comment)
      alias.comment = re.comment;
    return alias;
  }
  exports.composeEmptyNode = composeEmptyNode;
  exports.composeNode = composeNode;
});

// node_modules/yaml/dist/compose/compose-doc.js
var require_compose_doc = __commonJS(function(exports) {
  var Document = require_Document();
  var composeNode = require_compose_node();
  var resolveEnd = require_resolve_end();
  var resolveProps = require_resolve_props();
  function composeDoc(options, directives, { offset, start, value, end }, onError) {
    const opts = Object.assign({ _directives: directives }, options);
    const doc = new Document.Document(undefined, opts);
    const ctx = {
      atKey: false,
      atRoot: true,
      directives: doc.directives,
      options: doc.options,
      schema: doc.schema
    };
    const props = resolveProps.resolveProps(start, {
      indicator: "doc-start",
      next: value ?? end?.[0],
      offset,
      onError,
      parentIndent: 0,
      startOnNewline: true
    });
    if (props.found) {
      doc.directives.docStart = true;
      if (value && (value.type === "block-map" || value.type === "block-seq") && !props.hasNewline)
        onError(props.end, "MISSING_CHAR", "Block collection cannot start on same line with directives-end marker");
    }
    doc.contents = value ? composeNode.composeNode(ctx, value, props, onError) : composeNode.composeEmptyNode(ctx, props.end, start, null, props, onError);
    const contentEnd = doc.contents.range[2];
    const re = resolveEnd.resolveEnd(end, contentEnd, false, onError);
    if (re.comment)
      doc.comment = re.comment;
    doc.range = [offset, contentEnd, re.offset];
    return doc;
  }
  exports.composeDoc = composeDoc;
});

// node_modules/yaml/dist/compose/composer.js
var require_composer = __commonJS(function(exports) {
  var node_process = __require("process");
  var directives = require_directives();
  var Document = require_Document();
  var errors = require_errors();
  var identity = require_identity();
  var composeDoc = require_compose_doc();
  var resolveEnd = require_resolve_end();
  function getErrorPos(src) {
    if (typeof src === "number")
      return [src, src + 1];
    if (Array.isArray(src))
      return src.length === 2 ? src : [src[0], src[1]];
    const { offset, source } = src;
    return [offset, offset + (typeof source === "string" ? source.length : 1)];
  }
  function parsePrelude(prelude) {
    let comment = "";
    let atComment = false;
    let afterEmptyLine = false;
    for (let i = 0;i < prelude.length; ++i) {
      const source = prelude[i];
      switch (source[0]) {
        case "#":
          comment += (comment === "" ? "" : afterEmptyLine ? `

` : `
`) + (source.substring(1) || " ");
          atComment = true;
          afterEmptyLine = false;
          break;
        case "%":
          if (prelude[i + 1]?.[0] !== "#")
            i += 1;
          atComment = false;
          break;
        default:
          if (!atComment)
            afterEmptyLine = true;
          atComment = false;
      }
    }
    return { comment, afterEmptyLine };
  }

  class Composer {
    constructor(options = {}) {
      this.doc = null;
      this.atDirectives = false;
      this.prelude = [];
      this.errors = [];
      this.warnings = [];
      this.onError = (source, code, message, warning) => {
        const pos = getErrorPos(source);
        if (warning)
          this.warnings.push(new errors.YAMLWarning(pos, code, message));
        else
          this.errors.push(new errors.YAMLParseError(pos, code, message));
      };
      this.directives = new directives.Directives({ version: options.version || "1.2" });
      this.options = options;
    }
    decorate(doc, afterDoc) {
      const { comment, afterEmptyLine } = parsePrelude(this.prelude);
      if (comment) {
        const dc = doc.contents;
        if (afterDoc) {
          doc.comment = doc.comment ? `${doc.comment}
${comment}` : comment;
        } else if (afterEmptyLine || doc.directives.docStart || !dc) {
          doc.commentBefore = comment;
        } else if (identity.isCollection(dc) && !dc.flow && dc.items.length > 0) {
          let it = dc.items[0];
          if (identity.isPair(it))
            it = it.key;
          const cb = it.commentBefore;
          it.commentBefore = cb ? `${comment}
${cb}` : comment;
        } else {
          const cb = dc.commentBefore;
          dc.commentBefore = cb ? `${comment}
${cb}` : comment;
        }
      }
      if (afterDoc) {
        for (let i = 0;i < this.errors.length; ++i)
          doc.errors.push(this.errors[i]);
        for (let i = 0;i < this.warnings.length; ++i)
          doc.warnings.push(this.warnings[i]);
      } else {
        doc.errors = this.errors;
        doc.warnings = this.warnings;
      }
      this.prelude = [];
      this.errors = [];
      this.warnings = [];
    }
    streamInfo() {
      return {
        comment: parsePrelude(this.prelude).comment,
        directives: this.directives,
        errors: this.errors,
        warnings: this.warnings
      };
    }
    *compose(tokens, forceDoc = false, endOffset = -1) {
      for (const token of tokens)
        yield* this.next(token);
      yield* this.end(forceDoc, endOffset);
    }
    *next(token) {
      if (node_process.env.LOG_STREAM)
        console.dir(token, { depth: null });
      switch (token.type) {
        case "directive":
          this.directives.add(token.source, (offset, message, warning) => {
            const pos = getErrorPos(token);
            pos[0] += offset;
            this.onError(pos, "BAD_DIRECTIVE", message, warning);
          });
          this.prelude.push(token.source);
          this.atDirectives = true;
          break;
        case "document": {
          const doc = composeDoc.composeDoc(this.options, this.directives, token, this.onError);
          if (this.atDirectives && !doc.directives.docStart)
            this.onError(token, "MISSING_CHAR", "Missing directives-end/doc-start indicator line");
          this.decorate(doc, false);
          if (this.doc)
            yield this.doc;
          this.doc = doc;
          this.atDirectives = false;
          break;
        }
        case "byte-order-mark":
        case "space":
          break;
        case "comment":
        case "newline":
          this.prelude.push(token.source);
          break;
        case "error": {
          const msg = token.source ? `${token.message}: ${JSON.stringify(token.source)}` : token.message;
          const error = new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg);
          if (this.atDirectives || !this.doc)
            this.errors.push(error);
          else
            this.doc.errors.push(error);
          break;
        }
        case "doc-end": {
          if (!this.doc) {
            const msg = "Unexpected doc-end without preceding document";
            this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg));
            break;
          }
          this.doc.directives.docEnd = true;
          const end = resolveEnd.resolveEnd(token.end, token.offset + token.source.length, this.doc.options.strict, this.onError);
          this.decorate(this.doc, true);
          if (end.comment) {
            const dc = this.doc.comment;
            this.doc.comment = dc ? `${dc}
${end.comment}` : end.comment;
          }
          this.doc.range[2] = end.offset;
          break;
        }
        default:
          this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", `Unsupported token ${token.type}`));
      }
    }
    *end(forceDoc = false, endOffset = -1) {
      if (this.doc) {
        this.decorate(this.doc, true);
        yield this.doc;
        this.doc = null;
      } else if (forceDoc) {
        const opts = Object.assign({ _directives: this.directives }, this.options);
        const doc = new Document.Document(undefined, opts);
        if (this.atDirectives)
          this.onError(endOffset, "MISSING_CHAR", "Missing directives-end indicator line");
        doc.range = [0, endOffset, endOffset];
        this.decorate(doc, false);
        yield doc;
      }
    }
  }
  exports.Composer = Composer;
});

// node_modules/yaml/dist/parse/cst-scalar.js
var require_cst_scalar = __commonJS(function(exports) {
  var resolveBlockScalar = require_resolve_block_scalar();
  var resolveFlowScalar = require_resolve_flow_scalar();
  var errors = require_errors();
  var stringifyString = require_stringifyString();
  function resolveAsScalar(token, strict = true, onError) {
    if (token) {
      const _onError = (pos, code, message) => {
        const offset = typeof pos === "number" ? pos : Array.isArray(pos) ? pos[0] : pos.offset;
        if (onError)
          onError(offset, code, message);
        else
          throw new errors.YAMLParseError([offset, offset + 1], code, message);
      };
      switch (token.type) {
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
          return resolveFlowScalar.resolveFlowScalar(token, strict, _onError);
        case "block-scalar":
          return resolveBlockScalar.resolveBlockScalar({ options: { strict } }, token, _onError);
      }
    }
    return null;
  }
  function createScalarToken(value, context) {
    const { implicitKey = false, indent, inFlow = false, offset = -1, type = "PLAIN" } = context;
    const source = stringifyString.stringifyString({ type, value }, {
      implicitKey,
      indent: indent > 0 ? " ".repeat(indent) : "",
      inFlow,
      options: { blockQuote: true, lineWidth: -1 }
    });
    const end = context.end ?? [
      { type: "newline", offset: -1, indent, source: `
` }
    ];
    switch (source[0]) {
      case "|":
      case ">": {
        const he = source.indexOf(`
`);
        const head = source.substring(0, he);
        const body = source.substring(he + 1) + `
`;
        const props = [
          { type: "block-scalar-header", offset, indent, source: head }
        ];
        if (!addEndtoBlockProps(props, end))
          props.push({ type: "newline", offset: -1, indent, source: `
` });
        return { type: "block-scalar", offset, indent, props, source: body };
      }
      case '"':
        return { type: "double-quoted-scalar", offset, indent, source, end };
      case "'":
        return { type: "single-quoted-scalar", offset, indent, source, end };
      default:
        return { type: "scalar", offset, indent, source, end };
    }
  }
  function setScalarValue(token, value, context = {}) {
    let { afterKey = false, implicitKey = false, inFlow = false, type } = context;
    let indent = "indent" in token ? token.indent : null;
    if (afterKey && typeof indent === "number")
      indent += 2;
    if (!type)
      switch (token.type) {
        case "single-quoted-scalar":
          type = "QUOTE_SINGLE";
          break;
        case "double-quoted-scalar":
          type = "QUOTE_DOUBLE";
          break;
        case "block-scalar": {
          const header = token.props[0];
          if (header.type !== "block-scalar-header")
            throw new Error("Invalid block scalar header");
          type = header.source[0] === ">" ? "BLOCK_FOLDED" : "BLOCK_LITERAL";
          break;
        }
        default:
          type = "PLAIN";
      }
    const source = stringifyString.stringifyString({ type, value }, {
      implicitKey: implicitKey || indent === null,
      indent: indent !== null && indent > 0 ? " ".repeat(indent) : "",
      inFlow,
      options: { blockQuote: true, lineWidth: -1 }
    });
    switch (source[0]) {
      case "|":
      case ">":
        setBlockScalarValue(token, source);
        break;
      case '"':
        setFlowScalarValue(token, source, "double-quoted-scalar");
        break;
      case "'":
        setFlowScalarValue(token, source, "single-quoted-scalar");
        break;
      default:
        setFlowScalarValue(token, source, "scalar");
    }
  }
  function setBlockScalarValue(token, source) {
    const he = source.indexOf(`
`);
    const head = source.substring(0, he);
    const body = source.substring(he + 1) + `
`;
    if (token.type === "block-scalar") {
      const header = token.props[0];
      if (header.type !== "block-scalar-header")
        throw new Error("Invalid block scalar header");
      header.source = head;
      token.source = body;
    } else {
      const { offset } = token;
      const indent = "indent" in token ? token.indent : -1;
      const props = [
        { type: "block-scalar-header", offset, indent, source: head }
      ];
      if (!addEndtoBlockProps(props, "end" in token ? token.end : undefined))
        props.push({ type: "newline", offset: -1, indent, source: `
` });
      for (const key of Object.keys(token))
        if (key !== "type" && key !== "offset")
          delete token[key];
      Object.assign(token, { type: "block-scalar", indent, props, source: body });
    }
  }
  function addEndtoBlockProps(props, end) {
    if (end)
      for (const st of end)
        switch (st.type) {
          case "space":
          case "comment":
            props.push(st);
            break;
          case "newline":
            props.push(st);
            return true;
        }
    return false;
  }
  function setFlowScalarValue(token, source, type) {
    switch (token.type) {
      case "scalar":
      case "double-quoted-scalar":
      case "single-quoted-scalar":
        token.type = type;
        token.source = source;
        break;
      case "block-scalar": {
        const end = token.props.slice(1);
        let oa = source.length;
        if (token.props[0].type === "block-scalar-header")
          oa -= token.props[0].source.length;
        for (const tok of end)
          tok.offset += oa;
        delete token.props;
        Object.assign(token, { type, source, end });
        break;
      }
      case "block-map":
      case "block-seq": {
        const offset = token.offset + source.length;
        const nl = { type: "newline", offset, indent: token.indent, source: `
` };
        delete token.items;
        Object.assign(token, { type, source, end: [nl] });
        break;
      }
      default: {
        const indent = "indent" in token ? token.indent : -1;
        const end = "end" in token && Array.isArray(token.end) ? token.end.filter((st) => st.type === "space" || st.type === "comment" || st.type === "newline") : [];
        for (const key of Object.keys(token))
          if (key !== "type" && key !== "offset")
            delete token[key];
        Object.assign(token, { type, indent, source, end });
      }
    }
  }
  exports.createScalarToken = createScalarToken;
  exports.resolveAsScalar = resolveAsScalar;
  exports.setScalarValue = setScalarValue;
});

// node_modules/yaml/dist/parse/cst-stringify.js
var require_cst_stringify = __commonJS(function(exports) {
  var stringify = (cst) => ("type" in cst) ? stringifyToken(cst) : stringifyItem(cst);
  function stringifyToken(token) {
    switch (token.type) {
      case "block-scalar": {
        let res = "";
        for (const tok of token.props)
          res += stringifyToken(tok);
        return res + token.source;
      }
      case "block-map":
      case "block-seq": {
        let res = "";
        for (const item of token.items)
          res += stringifyItem(item);
        return res;
      }
      case "flow-collection": {
        let res = token.start.source;
        for (const item of token.items)
          res += stringifyItem(item);
        for (const st of token.end)
          res += st.source;
        return res;
      }
      case "document": {
        let res = stringifyItem(token);
        if (token.end)
          for (const st of token.end)
            res += st.source;
        return res;
      }
      default: {
        let res = token.source;
        if ("end" in token && token.end)
          for (const st of token.end)
            res += st.source;
        return res;
      }
    }
  }
  function stringifyItem({ start, key, sep, value }) {
    let res = "";
    for (const st of start)
      res += st.source;
    if (key)
      res += stringifyToken(key);
    if (sep)
      for (const st of sep)
        res += st.source;
    if (value)
      res += stringifyToken(value);
    return res;
  }
  exports.stringify = stringify;
});

// node_modules/yaml/dist/parse/cst-visit.js
var require_cst_visit = __commonJS(function(exports) {
  var BREAK = Symbol("break visit");
  var SKIP = Symbol("skip children");
  var REMOVE = Symbol("remove item");
  function visit(cst, visitor) {
    if ("type" in cst && cst.type === "document")
      cst = { start: cst.start, value: cst.value };
    _visit(Object.freeze([]), cst, visitor);
  }
  visit.BREAK = BREAK;
  visit.SKIP = SKIP;
  visit.REMOVE = REMOVE;
  visit.itemAtPath = (cst, path) => {
    let item = cst;
    for (const [field, index] of path) {
      const tok = item?.[field];
      if (tok && "items" in tok) {
        item = tok.items[index];
      } else
        return;
    }
    return item;
  };
  visit.parentCollection = (cst, path) => {
    const parent = visit.itemAtPath(cst, path.slice(0, -1));
    const field = path[path.length - 1][0];
    const coll = parent?.[field];
    if (coll && "items" in coll)
      return coll;
    throw new Error("Parent collection not found");
  };
  function _visit(path, item, visitor) {
    let ctrl = visitor(item, path);
    if (typeof ctrl === "symbol")
      return ctrl;
    for (const field of ["key", "value"]) {
      const token = item[field];
      if (token && "items" in token) {
        for (let i = 0;i < token.items.length; ++i) {
          const ci = _visit(Object.freeze(path.concat([[field, i]])), token.items[i], visitor);
          if (typeof ci === "number")
            i = ci - 1;
          else if (ci === BREAK)
            return BREAK;
          else if (ci === REMOVE) {
            token.items.splice(i, 1);
            i -= 1;
          }
        }
        if (typeof ctrl === "function" && field === "key")
          ctrl = ctrl(item, path);
      }
    }
    return typeof ctrl === "function" ? ctrl(item, path) : ctrl;
  }
  exports.visit = visit;
});

// node_modules/yaml/dist/parse/cst.js
var require_cst = __commonJS(function(exports) {
  var cstScalar = require_cst_scalar();
  var cstStringify = require_cst_stringify();
  var cstVisit = require_cst_visit();
  var BOM = "\uFEFF";
  var DOCUMENT = "\x02";
  var FLOW_END = "\x18";
  var SCALAR = "\x1F";
  var isCollection = (token) => !!token && ("items" in token);
  var isScalar = (token) => !!token && (token.type === "scalar" || token.type === "single-quoted-scalar" || token.type === "double-quoted-scalar" || token.type === "block-scalar");
  function prettyToken(token) {
    switch (token) {
      case BOM:
        return "<BOM>";
      case DOCUMENT:
        return "<DOC>";
      case FLOW_END:
        return "<FLOW_END>";
      case SCALAR:
        return "<SCALAR>";
      default:
        return JSON.stringify(token);
    }
  }
  function tokenType(source) {
    switch (source) {
      case BOM:
        return "byte-order-mark";
      case DOCUMENT:
        return "doc-mode";
      case FLOW_END:
        return "flow-error-end";
      case SCALAR:
        return "scalar";
      case "---":
        return "doc-start";
      case "...":
        return "doc-end";
      case "":
      case `
`:
      case `\r
`:
        return "newline";
      case "-":
        return "seq-item-ind";
      case "?":
        return "explicit-key-ind";
      case ":":
        return "map-value-ind";
      case "{":
        return "flow-map-start";
      case "}":
        return "flow-map-end";
      case "[":
        return "flow-seq-start";
      case "]":
        return "flow-seq-end";
      case ",":
        return "comma";
    }
    switch (source[0]) {
      case " ":
      case "\t":
        return "space";
      case "#":
        return "comment";
      case "%":
        return "directive-line";
      case "*":
        return "alias";
      case "&":
        return "anchor";
      case "!":
        return "tag";
      case "'":
        return "single-quoted-scalar";
      case '"':
        return "double-quoted-scalar";
      case "|":
      case ">":
        return "block-scalar-header";
    }
    return null;
  }
  exports.createScalarToken = cstScalar.createScalarToken;
  exports.resolveAsScalar = cstScalar.resolveAsScalar;
  exports.setScalarValue = cstScalar.setScalarValue;
  exports.stringify = cstStringify.stringify;
  exports.visit = cstVisit.visit;
  exports.BOM = BOM;
  exports.DOCUMENT = DOCUMENT;
  exports.FLOW_END = FLOW_END;
  exports.SCALAR = SCALAR;
  exports.isCollection = isCollection;
  exports.isScalar = isScalar;
  exports.prettyToken = prettyToken;
  exports.tokenType = tokenType;
});

// node_modules/yaml/dist/parse/lexer.js
var require_lexer = __commonJS(function(exports) {
  var cst = require_cst();
  function isEmpty(ch) {
    switch (ch) {
      case undefined:
      case " ":
      case `
`:
      case "\r":
      case "\t":
        return true;
      default:
        return false;
    }
  }
  var hexDigits = new Set("0123456789ABCDEFabcdef");
  var tagChars = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()");
  var flowIndicatorChars = new Set(",[]{}");
  var invalidAnchorChars = new Set(` ,[]{}
\r	`);
  var isNotAnchorChar = (ch) => !ch || invalidAnchorChars.has(ch);

  class Lexer {
    constructor() {
      this.atEnd = false;
      this.blockScalarIndent = -1;
      this.blockScalarKeep = false;
      this.buffer = "";
      this.flowKey = false;
      this.flowLevel = 0;
      this.indentNext = 0;
      this.indentValue = 0;
      this.lineEndPos = null;
      this.next = null;
      this.pos = 0;
    }
    *lex(source, incomplete = false) {
      if (source) {
        if (typeof source !== "string")
          throw TypeError("source is not a string");
        this.buffer = this.buffer ? this.buffer + source : source;
        this.lineEndPos = null;
      }
      this.atEnd = !incomplete;
      let next = this.next ?? "stream";
      while (next && (incomplete || this.hasChars(1)))
        next = yield* this.parseNext(next);
    }
    atLineEnd() {
      let i = this.pos;
      let ch = this.buffer[i];
      while (ch === " " || ch === "\t")
        ch = this.buffer[++i];
      if (!ch || ch === "#" || ch === `
`)
        return true;
      if (ch === "\r")
        return this.buffer[i + 1] === `
`;
      return false;
    }
    charAt(n) {
      return this.buffer[this.pos + n];
    }
    continueScalar(offset) {
      let ch = this.buffer[offset];
      if (this.indentNext > 0) {
        let indent = 0;
        while (ch === " ")
          ch = this.buffer[++indent + offset];
        if (ch === "\r") {
          const next = this.buffer[indent + offset + 1];
          if (next === `
` || !next && !this.atEnd)
            return offset + indent + 1;
        }
        return ch === `
` || indent >= this.indentNext || !ch && !this.atEnd ? offset + indent : -1;
      }
      if (ch === "-" || ch === ".") {
        const dt = this.buffer.substr(offset, 3);
        if ((dt === "---" || dt === "...") && isEmpty(this.buffer[offset + 3]))
          return -1;
      }
      return offset;
    }
    getLine() {
      let end = this.lineEndPos;
      if (typeof end !== "number" || end !== -1 && end < this.pos) {
        end = this.buffer.indexOf(`
`, this.pos);
        this.lineEndPos = end;
      }
      if (end === -1)
        return this.atEnd ? this.buffer.substring(this.pos) : null;
      if (this.buffer[end - 1] === "\r")
        end -= 1;
      return this.buffer.substring(this.pos, end);
    }
    hasChars(n) {
      return this.pos + n <= this.buffer.length;
    }
    setNext(state) {
      this.buffer = this.buffer.substring(this.pos);
      this.pos = 0;
      this.lineEndPos = null;
      this.next = state;
      return null;
    }
    peek(n) {
      return this.buffer.substr(this.pos, n);
    }
    *parseNext(next) {
      switch (next) {
        case "stream":
          return yield* this.parseStream();
        case "line-start":
          return yield* this.parseLineStart();
        case "block-start":
          return yield* this.parseBlockStart();
        case "doc":
          return yield* this.parseDocument();
        case "flow":
          return yield* this.parseFlowCollection();
        case "quoted-scalar":
          return yield* this.parseQuotedScalar();
        case "block-scalar":
          return yield* this.parseBlockScalar();
        case "plain-scalar":
          return yield* this.parsePlainScalar();
      }
    }
    *parseStream() {
      let line = this.getLine();
      if (line === null)
        return this.setNext("stream");
      if (line[0] === cst.BOM) {
        yield* this.pushCount(1);
        line = line.substring(1);
      }
      if (line[0] === "%") {
        let dirEnd = line.length;
        let cs = line.indexOf("#");
        while (cs !== -1) {
          const ch = line[cs - 1];
          if (ch === " " || ch === "\t") {
            dirEnd = cs - 1;
            break;
          } else {
            cs = line.indexOf("#", cs + 1);
          }
        }
        while (true) {
          const ch = line[dirEnd - 1];
          if (ch === " " || ch === "\t")
            dirEnd -= 1;
          else
            break;
        }
        const n = (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(true));
        yield* this.pushCount(line.length - n);
        this.pushNewline();
        return "stream";
      }
      if (this.atLineEnd()) {
        const sp = yield* this.pushSpaces(true);
        yield* this.pushCount(line.length - sp);
        yield* this.pushNewline();
        return "stream";
      }
      yield cst.DOCUMENT;
      return yield* this.parseLineStart();
    }
    *parseLineStart() {
      const ch = this.charAt(0);
      if (!ch && !this.atEnd)
        return this.setNext("line-start");
      if (ch === "-" || ch === ".") {
        if (!this.atEnd && !this.hasChars(4))
          return this.setNext("line-start");
        const s = this.peek(3);
        if ((s === "---" || s === "...") && isEmpty(this.charAt(3))) {
          yield* this.pushCount(3);
          this.indentValue = 0;
          this.indentNext = 0;
          return s === "---" ? "doc" : "stream";
        }
      }
      this.indentValue = yield* this.pushSpaces(false);
      if (this.indentNext > this.indentValue && !isEmpty(this.charAt(1)))
        this.indentNext = this.indentValue;
      return yield* this.parseBlockStart();
    }
    *parseBlockStart() {
      const [ch0, ch1] = this.peek(2);
      if (!ch1 && !this.atEnd)
        return this.setNext("block-start");
      if ((ch0 === "-" || ch0 === "?" || ch0 === ":") && isEmpty(ch1)) {
        const n = (yield* this.pushCount(1)) + (yield* this.pushSpaces(true));
        this.indentNext = this.indentValue + 1;
        this.indentValue += n;
        return "block-start";
      }
      return "doc";
    }
    *parseDocument() {
      yield* this.pushSpaces(true);
      const line = this.getLine();
      if (line === null)
        return this.setNext("doc");
      let n = yield* this.pushIndicators();
      switch (line[n]) {
        case "#":
          yield* this.pushCount(line.length - n);
        case undefined:
          yield* this.pushNewline();
          return yield* this.parseLineStart();
        case "{":
        case "[":
          yield* this.pushCount(1);
          this.flowKey = false;
          this.flowLevel = 1;
          return "flow";
        case "}":
        case "]":
          yield* this.pushCount(1);
          return "doc";
        case "*":
          yield* this.pushUntil(isNotAnchorChar);
          return "doc";
        case '"':
        case "'":
          return yield* this.parseQuotedScalar();
        case "|":
        case ">":
          n += yield* this.parseBlockScalarHeader();
          n += yield* this.pushSpaces(true);
          yield* this.pushCount(line.length - n);
          yield* this.pushNewline();
          return yield* this.parseBlockScalar();
        default:
          return yield* this.parsePlainScalar();
      }
    }
    *parseFlowCollection() {
      let nl, sp;
      let indent = -1;
      do {
        nl = yield* this.pushNewline();
        if (nl > 0) {
          sp = yield* this.pushSpaces(false);
          this.indentValue = indent = sp;
        } else {
          sp = 0;
        }
        sp += yield* this.pushSpaces(true);
      } while (nl + sp > 0);
      const line = this.getLine();
      if (line === null)
        return this.setNext("flow");
      if (indent !== -1 && indent < this.indentNext && line[0] !== "#" || indent === 0 && (line.startsWith("---") || line.startsWith("...")) && isEmpty(line[3])) {
        const atFlowEndMarker = indent === this.indentNext - 1 && this.flowLevel === 1 && (line[0] === "]" || line[0] === "}");
        if (!atFlowEndMarker) {
          this.flowLevel = 0;
          yield cst.FLOW_END;
          return yield* this.parseLineStart();
        }
      }
      let n = 0;
      while (line[n] === ",") {
        n += yield* this.pushCount(1);
        n += yield* this.pushSpaces(true);
        this.flowKey = false;
      }
      n += yield* this.pushIndicators();
      switch (line[n]) {
        case undefined:
          return "flow";
        case "#":
          yield* this.pushCount(line.length - n);
          return "flow";
        case "{":
        case "[":
          yield* this.pushCount(1);
          this.flowKey = false;
          this.flowLevel += 1;
          return "flow";
        case "}":
        case "]":
          yield* this.pushCount(1);
          this.flowKey = true;
          this.flowLevel -= 1;
          return this.flowLevel ? "flow" : "doc";
        case "*":
          yield* this.pushUntil(isNotAnchorChar);
          return "flow";
        case '"':
        case "'":
          this.flowKey = true;
          return yield* this.parseQuotedScalar();
        case ":": {
          const next = this.charAt(1);
          if (this.flowKey || isEmpty(next) || next === ",") {
            this.flowKey = false;
            yield* this.pushCount(1);
            yield* this.pushSpaces(true);
            return "flow";
          }
        }
        default:
          this.flowKey = false;
          return yield* this.parsePlainScalar();
      }
    }
    *parseQuotedScalar() {
      const quote = this.charAt(0);
      let end = this.buffer.indexOf(quote, this.pos + 1);
      if (quote === "'") {
        while (end !== -1 && this.buffer[end + 1] === "'")
          end = this.buffer.indexOf("'", end + 2);
      } else {
        while (end !== -1) {
          let n = 0;
          while (this.buffer[end - 1 - n] === "\\")
            n += 1;
          if (n % 2 === 0)
            break;
          end = this.buffer.indexOf('"', end + 1);
        }
      }
      const qb = this.buffer.substring(0, end);
      let nl = qb.indexOf(`
`, this.pos);
      if (nl !== -1) {
        while (nl !== -1) {
          const cs = this.continueScalar(nl + 1);
          if (cs === -1)
            break;
          nl = qb.indexOf(`
`, cs);
        }
        if (nl !== -1) {
          end = nl - (qb[nl - 1] === "\r" ? 2 : 1);
        }
      }
      if (end === -1) {
        if (!this.atEnd)
          return this.setNext("quoted-scalar");
        end = this.buffer.length;
      }
      yield* this.pushToIndex(end + 1, false);
      return this.flowLevel ? "flow" : "doc";
    }
    *parseBlockScalarHeader() {
      this.blockScalarIndent = -1;
      this.blockScalarKeep = false;
      let i = this.pos;
      while (true) {
        const ch = this.buffer[++i];
        if (ch === "+")
          this.blockScalarKeep = true;
        else if (ch > "0" && ch <= "9")
          this.blockScalarIndent = Number(ch) - 1;
        else if (ch !== "-")
          break;
      }
      return yield* this.pushUntil((ch) => isEmpty(ch) || ch === "#");
    }
    *parseBlockScalar() {
      let nl = this.pos - 1;
      let indent = 0;
      let ch;
      loop:
        for (let i = this.pos;ch = this.buffer[i]; ++i) {
          switch (ch) {
            case " ":
              indent += 1;
              break;
            case `
`:
              nl = i;
              indent = 0;
              break;
            case "\r": {
              const next = this.buffer[i + 1];
              if (!next && !this.atEnd)
                return this.setNext("block-scalar");
              if (next === `
`)
                break;
            }
            default:
              break loop;
          }
        }
      if (!ch && !this.atEnd)
        return this.setNext("block-scalar");
      if (indent >= this.indentNext) {
        if (this.blockScalarIndent === -1)
          this.indentNext = indent;
        else {
          this.indentNext = this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext);
        }
        do {
          const cs = this.continueScalar(nl + 1);
          if (cs === -1)
            break;
          nl = this.buffer.indexOf(`
`, cs);
        } while (nl !== -1);
        if (nl === -1) {
          if (!this.atEnd)
            return this.setNext("block-scalar");
          nl = this.buffer.length;
        }
      }
      let i = nl + 1;
      ch = this.buffer[i];
      while (ch === " ")
        ch = this.buffer[++i];
      if (ch === "\t") {
        while (ch === "\t" || ch === " " || ch === "\r" || ch === `
`)
          ch = this.buffer[++i];
        nl = i - 1;
      } else if (!this.blockScalarKeep) {
        do {
          let i = nl - 1;
          let ch = this.buffer[i];
          if (ch === "\r")
            ch = this.buffer[--i];
          const lastChar = i;
          while (ch === " ")
            ch = this.buffer[--i];
          if (ch === `
` && i >= this.pos && i + 1 + indent > lastChar)
            nl = i;
          else
            break;
        } while (true);
      }
      yield cst.SCALAR;
      yield* this.pushToIndex(nl + 1, true);
      return yield* this.parseLineStart();
    }
    *parsePlainScalar() {
      const inFlow = this.flowLevel > 0;
      let end = this.pos - 1;
      let i = this.pos - 1;
      let ch;
      while (ch = this.buffer[++i]) {
        if (ch === ":") {
          const next = this.buffer[i + 1];
          if (isEmpty(next) || inFlow && flowIndicatorChars.has(next))
            break;
          end = i;
        } else if (isEmpty(ch)) {
          let next = this.buffer[i + 1];
          if (ch === "\r") {
            if (next === `
`) {
              i += 1;
              ch = `
`;
              next = this.buffer[i + 1];
            } else
              end = i;
          }
          if (next === "#" || inFlow && flowIndicatorChars.has(next))
            break;
          if (ch === `
`) {
            const cs = this.continueScalar(i + 1);
            if (cs === -1)
              break;
            i = Math.max(i, cs - 2);
          }
        } else {
          if (inFlow && flowIndicatorChars.has(ch))
            break;
          end = i;
        }
      }
      if (!ch && !this.atEnd)
        return this.setNext("plain-scalar");
      yield cst.SCALAR;
      yield* this.pushToIndex(end + 1, true);
      return inFlow ? "flow" : "doc";
    }
    *pushCount(n) {
      if (n > 0) {
        yield this.buffer.substr(this.pos, n);
        this.pos += n;
        return n;
      }
      return 0;
    }
    *pushToIndex(i, allowEmpty) {
      const s = this.buffer.slice(this.pos, i);
      if (s) {
        yield s;
        this.pos += s.length;
        return s.length;
      } else if (allowEmpty)
        yield "";
      return 0;
    }
    *pushIndicators() {
      let n = 0;
      loop:
        while (true) {
          switch (this.charAt(0)) {
            case "!":
              n += yield* this.pushTag();
              n += yield* this.pushSpaces(true);
              continue loop;
            case "&":
              n += yield* this.pushUntil(isNotAnchorChar);
              n += yield* this.pushSpaces(true);
              continue loop;
            case "-":
            case "?":
            case ":": {
              const inFlow = this.flowLevel > 0;
              const ch1 = this.charAt(1);
              if (isEmpty(ch1) || inFlow && flowIndicatorChars.has(ch1)) {
                if (!inFlow)
                  this.indentNext = this.indentValue + 1;
                else if (this.flowKey)
                  this.flowKey = false;
                n += yield* this.pushCount(1);
                n += yield* this.pushSpaces(true);
                continue loop;
              }
            }
          }
          break loop;
        }
      return n;
    }
    *pushTag() {
      if (this.charAt(1) === "<") {
        let i = this.pos + 2;
        let ch = this.buffer[i];
        while (!isEmpty(ch) && ch !== ">")
          ch = this.buffer[++i];
        return yield* this.pushToIndex(ch === ">" ? i + 1 : i, false);
      } else {
        let i = this.pos + 1;
        let ch = this.buffer[i];
        while (ch) {
          if (tagChars.has(ch))
            ch = this.buffer[++i];
          else if (ch === "%" && hexDigits.has(this.buffer[i + 1]) && hexDigits.has(this.buffer[i + 2])) {
            ch = this.buffer[i += 3];
          } else
            break;
        }
        return yield* this.pushToIndex(i, false);
      }
    }
    *pushNewline() {
      const ch = this.buffer[this.pos];
      if (ch === `
`)
        return yield* this.pushCount(1);
      else if (ch === "\r" && this.charAt(1) === `
`)
        return yield* this.pushCount(2);
      else
        return 0;
    }
    *pushSpaces(allowTabs) {
      let i = this.pos - 1;
      let ch;
      do {
        ch = this.buffer[++i];
      } while (ch === " " || allowTabs && ch === "\t");
      const n = i - this.pos;
      if (n > 0) {
        yield this.buffer.substr(this.pos, n);
        this.pos = i;
      }
      return n;
    }
    *pushUntil(test) {
      let i = this.pos;
      let ch = this.buffer[i];
      while (!test(ch))
        ch = this.buffer[++i];
      return yield* this.pushToIndex(i, false);
    }
  }
  exports.Lexer = Lexer;
});

// node_modules/yaml/dist/parse/line-counter.js
var require_line_counter = __commonJS(function(exports) {
  class LineCounter {
    constructor() {
      this.lineStarts = [];
      this.addNewLine = (offset) => this.lineStarts.push(offset);
      this.linePos = (offset) => {
        let low = 0;
        let high = this.lineStarts.length;
        while (low < high) {
          const mid = low + high >> 1;
          if (this.lineStarts[mid] < offset)
            low = mid + 1;
          else
            high = mid;
        }
        if (this.lineStarts[low] === offset)
          return { line: low + 1, col: 1 };
        if (low === 0)
          return { line: 0, col: offset };
        const start = this.lineStarts[low - 1];
        return { line: low, col: offset - start + 1 };
      };
    }
  }
  exports.LineCounter = LineCounter;
});

// node_modules/yaml/dist/parse/parser.js
var require_parser = __commonJS(function(exports) {
  var node_process = __require("process");
  var cst = require_cst();
  var lexer = require_lexer();
  function includesToken(list, type) {
    for (let i = 0;i < list.length; ++i)
      if (list[i].type === type)
        return true;
    return false;
  }
  function findNonEmptyIndex(list) {
    for (let i = 0;i < list.length; ++i) {
      switch (list[i].type) {
        case "space":
        case "comment":
        case "newline":
          break;
        default:
          return i;
      }
    }
    return -1;
  }
  function isFlowToken(token) {
    switch (token?.type) {
      case "alias":
      case "scalar":
      case "single-quoted-scalar":
      case "double-quoted-scalar":
      case "flow-collection":
        return true;
      default:
        return false;
    }
  }
  function getPrevProps(parent) {
    switch (parent.type) {
      case "document":
        return parent.start;
      case "block-map": {
        const it = parent.items[parent.items.length - 1];
        return it.sep ?? it.start;
      }
      case "block-seq":
        return parent.items[parent.items.length - 1].start;
      default:
        return [];
    }
  }
  function getFirstKeyStartProps(prev) {
    if (prev.length === 0)
      return [];
    let i = prev.length;
    loop:
      while (--i >= 0) {
        switch (prev[i].type) {
          case "doc-start":
          case "explicit-key-ind":
          case "map-value-ind":
          case "seq-item-ind":
          case "newline":
            break loop;
        }
      }
    while (prev[++i]?.type === "space") {}
    return prev.splice(i, prev.length);
  }
  function arrayPushArray(target, source) {
    if (source.length < 1e5)
      Array.prototype.push.apply(target, source);
    else
      for (let i = 0;i < source.length; ++i)
        target.push(source[i]);
  }
  function fixFlowSeqItems(fc) {
    if (fc.start.type === "flow-seq-start") {
      for (const it of fc.items) {
        if (it.sep && !it.value && !includesToken(it.start, "explicit-key-ind") && !includesToken(it.sep, "map-value-ind")) {
          if (it.key)
            it.value = it.key;
          delete it.key;
          if (isFlowToken(it.value)) {
            if (it.value.end)
              arrayPushArray(it.value.end, it.sep);
            else
              it.value.end = it.sep;
          } else
            arrayPushArray(it.start, it.sep);
          delete it.sep;
        }
      }
    }
  }

  class Parser {
    constructor(onNewLine) {
      this.atNewLine = true;
      this.atScalar = false;
      this.indent = 0;
      this.offset = 0;
      this.onKeyLine = false;
      this.stack = [];
      this.source = "";
      this.type = "";
      this.lexer = new lexer.Lexer;
      this.onNewLine = onNewLine;
    }
    *parse(source, incomplete = false) {
      if (this.onNewLine && this.offset === 0)
        this.onNewLine(0);
      for (const lexeme of this.lexer.lex(source, incomplete))
        yield* this.next(lexeme);
      if (!incomplete)
        yield* this.end();
    }
    *next(source) {
      this.source = source;
      if (node_process.env.LOG_TOKENS)
        console.log("|", cst.prettyToken(source));
      if (this.atScalar) {
        this.atScalar = false;
        yield* this.step();
        this.offset += source.length;
        return;
      }
      const type = cst.tokenType(source);
      if (!type) {
        const message = `Not a YAML token: ${source}`;
        yield* this.pop({ type: "error", offset: this.offset, message, source });
        this.offset += source.length;
      } else if (type === "scalar") {
        this.atNewLine = false;
        this.atScalar = true;
        this.type = "scalar";
      } else {
        this.type = type;
        yield* this.step();
        switch (type) {
          case "newline":
            this.atNewLine = true;
            this.indent = 0;
            if (this.onNewLine)
              this.onNewLine(this.offset + source.length);
            break;
          case "space":
            if (this.atNewLine && source[0] === " ")
              this.indent += source.length;
            break;
          case "explicit-key-ind":
          case "map-value-ind":
          case "seq-item-ind":
            if (this.atNewLine)
              this.indent += source.length;
            break;
          case "doc-mode":
          case "flow-error-end":
            return;
          default:
            this.atNewLine = false;
        }
        this.offset += source.length;
      }
    }
    *end() {
      while (this.stack.length > 0)
        yield* this.pop();
    }
    get sourceToken() {
      const st = {
        type: this.type,
        offset: this.offset,
        indent: this.indent,
        source: this.source
      };
      return st;
    }
    *step() {
      const top = this.peek(1);
      if (this.type === "doc-end" && top?.type !== "doc-end") {
        while (this.stack.length > 0)
          yield* this.pop();
        this.stack.push({
          type: "doc-end",
          offset: this.offset,
          source: this.source
        });
        return;
      }
      if (!top)
        return yield* this.stream();
      switch (top.type) {
        case "document":
          return yield* this.document(top);
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
          return yield* this.scalar(top);
        case "block-scalar":
          return yield* this.blockScalar(top);
        case "block-map":
          return yield* this.blockMap(top);
        case "block-seq":
          return yield* this.blockSequence(top);
        case "flow-collection":
          return yield* this.flowCollection(top);
        case "doc-end":
          return yield* this.documentEnd(top);
      }
      yield* this.pop();
    }
    peek(n) {
      return this.stack[this.stack.length - n];
    }
    *pop(error) {
      const token = error ?? this.stack.pop();
      if (!token) {
        const message = "Tried to pop an empty stack";
        yield { type: "error", offset: this.offset, source: "", message };
      } else if (this.stack.length === 0) {
        yield token;
      } else {
        const top = this.peek(1);
        if (token.type === "block-scalar") {
          token.indent = "indent" in top ? top.indent : 0;
        } else if (token.type === "flow-collection" && top.type === "document") {
          token.indent = 0;
        }
        if (token.type === "flow-collection")
          fixFlowSeqItems(token);
        switch (top.type) {
          case "document":
            top.value = token;
            break;
          case "block-scalar":
            top.props.push(token);
            break;
          case "block-map": {
            const it = top.items[top.items.length - 1];
            if (it.value) {
              top.items.push({ start: [], key: token, sep: [] });
              this.onKeyLine = true;
              return;
            } else if (it.sep) {
              it.value = token;
            } else {
              Object.assign(it, { key: token, sep: [] });
              this.onKeyLine = !it.explicitKey;
              return;
            }
            break;
          }
          case "block-seq": {
            const it = top.items[top.items.length - 1];
            if (it.value)
              top.items.push({ start: [], value: token });
            else
              it.value = token;
            break;
          }
          case "flow-collection": {
            const it = top.items[top.items.length - 1];
            if (!it || it.value)
              top.items.push({ start: [], key: token, sep: [] });
            else if (it.sep)
              it.value = token;
            else
              Object.assign(it, { key: token, sep: [] });
            return;
          }
          default:
            yield* this.pop();
            yield* this.pop(token);
        }
        if ((top.type === "document" || top.type === "block-map" || top.type === "block-seq") && (token.type === "block-map" || token.type === "block-seq")) {
          const last = token.items[token.items.length - 1];
          if (last && !last.sep && !last.value && last.start.length > 0 && findNonEmptyIndex(last.start) === -1 && (token.indent === 0 || last.start.every((st) => st.type !== "comment" || st.indent < token.indent))) {
            if (top.type === "document")
              top.end = last.start;
            else
              top.items.push({ start: last.start });
            token.items.splice(-1, 1);
          }
        }
      }
    }
    *stream() {
      switch (this.type) {
        case "directive-line":
          yield { type: "directive", offset: this.offset, source: this.source };
          return;
        case "byte-order-mark":
        case "space":
        case "comment":
        case "newline":
          yield this.sourceToken;
          return;
        case "doc-mode":
        case "doc-start": {
          const doc = {
            type: "document",
            offset: this.offset,
            start: []
          };
          if (this.type === "doc-start")
            doc.start.push(this.sourceToken);
          this.stack.push(doc);
          return;
        }
      }
      yield {
        type: "error",
        offset: this.offset,
        message: `Unexpected ${this.type} token in YAML stream`,
        source: this.source
      };
    }
    *document(doc) {
      if (doc.value)
        return yield* this.lineEnd(doc);
      switch (this.type) {
        case "doc-start": {
          if (findNonEmptyIndex(doc.start) !== -1) {
            yield* this.pop();
            yield* this.step();
          } else
            doc.start.push(this.sourceToken);
          return;
        }
        case "anchor":
        case "tag":
        case "space":
        case "comment":
        case "newline":
          doc.start.push(this.sourceToken);
          return;
      }
      const bv = this.startBlockValue(doc);
      if (bv)
        this.stack.push(bv);
      else {
        yield {
          type: "error",
          offset: this.offset,
          message: `Unexpected ${this.type} token in YAML document`,
          source: this.source
        };
      }
    }
    *scalar(scalar) {
      if (this.type === "map-value-ind") {
        const prev = getPrevProps(this.peek(2));
        const start = getFirstKeyStartProps(prev);
        let sep;
        if (scalar.end) {
          sep = scalar.end;
          sep.push(this.sourceToken);
          delete scalar.end;
        } else
          sep = [this.sourceToken];
        const map = {
          type: "block-map",
          offset: scalar.offset,
          indent: scalar.indent,
          items: [{ start, key: scalar, sep }]
        };
        this.onKeyLine = true;
        this.stack[this.stack.length - 1] = map;
      } else
        yield* this.lineEnd(scalar);
    }
    *blockScalar(scalar) {
      switch (this.type) {
        case "space":
        case "comment":
        case "newline":
          scalar.props.push(this.sourceToken);
          return;
        case "scalar":
          scalar.source = this.source;
          this.atNewLine = true;
          this.indent = 0;
          if (this.onNewLine) {
            let nl = this.source.indexOf(`
`) + 1;
            while (nl !== 0) {
              this.onNewLine(this.offset + nl);
              nl = this.source.indexOf(`
`, nl) + 1;
            }
          }
          yield* this.pop();
          break;
        default:
          yield* this.pop();
          yield* this.step();
      }
    }
    *blockMap(map) {
      const it = map.items[map.items.length - 1];
      switch (this.type) {
        case "newline":
          this.onKeyLine = false;
          if (it.value) {
            const end = "end" in it.value ? it.value.end : undefined;
            const last = Array.isArray(end) ? end[end.length - 1] : undefined;
            if (last?.type === "comment")
              end?.push(this.sourceToken);
            else
              map.items.push({ start: [this.sourceToken] });
          } else if (it.sep) {
            it.sep.push(this.sourceToken);
          } else {
            it.start.push(this.sourceToken);
          }
          return;
        case "space":
        case "comment":
          if (it.value) {
            map.items.push({ start: [this.sourceToken] });
          } else if (it.sep) {
            it.sep.push(this.sourceToken);
          } else {
            if (this.atIndentedComment(it.start, map.indent)) {
              const prev = map.items[map.items.length - 2];
              const end = prev?.value?.end;
              if (Array.isArray(end)) {
                arrayPushArray(end, it.start);
                end.push(this.sourceToken);
                map.items.pop();
                return;
              }
            }
            it.start.push(this.sourceToken);
          }
          return;
      }
      if (this.indent >= map.indent) {
        const atMapIndent = !this.onKeyLine && this.indent === map.indent;
        const atNextItem = atMapIndent && (it.sep || it.explicitKey) && this.type !== "seq-item-ind";
        let start = [];
        if (atNextItem && it.sep && !it.value) {
          const nl = [];
          for (let i = 0;i < it.sep.length; ++i) {
            const st = it.sep[i];
            switch (st.type) {
              case "newline":
                nl.push(i);
                break;
              case "space":
                break;
              case "comment":
                if (st.indent > map.indent)
                  nl.length = 0;
                break;
              default:
                nl.length = 0;
            }
          }
          if (nl.length >= 2)
            start = it.sep.splice(nl[1]);
        }
        switch (this.type) {
          case "anchor":
          case "tag":
            if (atNextItem || it.value) {
              start.push(this.sourceToken);
              map.items.push({ start });
              this.onKeyLine = true;
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              it.start.push(this.sourceToken);
            }
            return;
          case "explicit-key-ind":
            if (!it.sep && !it.explicitKey) {
              it.start.push(this.sourceToken);
              it.explicitKey = true;
            } else if (atNextItem || it.value) {
              start.push(this.sourceToken);
              map.items.push({ start, explicitKey: true });
            } else {
              this.stack.push({
                type: "block-map",
                offset: this.offset,
                indent: this.indent,
                items: [{ start: [this.sourceToken], explicitKey: true }]
              });
            }
            this.onKeyLine = true;
            return;
          case "map-value-ind":
            if (it.explicitKey) {
              if (!it.sep) {
                if (includesToken(it.start, "newline")) {
                  Object.assign(it, { key: null, sep: [this.sourceToken] });
                } else {
                  const start = getFirstKeyStartProps(it.start);
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start, key: null, sep: [this.sourceToken] }]
                  });
                }
              } else if (it.value) {
                map.items.push({ start: [], key: null, sep: [this.sourceToken] });
              } else if (includesToken(it.sep, "map-value-ind")) {
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start, key: null, sep: [this.sourceToken] }]
                });
              } else if (isFlowToken(it.key) && !includesToken(it.sep, "newline")) {
                const start = getFirstKeyStartProps(it.start);
                const key = it.key;
                const sep = it.sep;
                sep.push(this.sourceToken);
                delete it.key;
                delete it.sep;
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start, key, sep }]
                });
              } else if (start.length > 0) {
                it.sep = it.sep.concat(start, this.sourceToken);
              } else {
                it.sep.push(this.sourceToken);
              }
            } else {
              if (!it.sep) {
                Object.assign(it, { key: null, sep: [this.sourceToken] });
              } else if (it.value || atNextItem) {
                map.items.push({ start, key: null, sep: [this.sourceToken] });
              } else if (includesToken(it.sep, "map-value-ind")) {
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: [], key: null, sep: [this.sourceToken] }]
                });
              } else {
                it.sep.push(this.sourceToken);
              }
            }
            this.onKeyLine = true;
            return;
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar": {
            const fs = this.flowScalar(this.type);
            if (atNextItem || it.value) {
              map.items.push({ start, key: fs, sep: [] });
              this.onKeyLine = true;
            } else if (it.sep) {
              this.stack.push(fs);
            } else {
              Object.assign(it, { key: fs, sep: [] });
              this.onKeyLine = true;
            }
            return;
          }
          default: {
            const bv = this.startBlockValue(map);
            if (bv) {
              if (bv.type === "block-seq") {
                if (!it.explicitKey && it.sep && !includesToken(it.sep, "newline")) {
                  yield* this.pop({
                    type: "error",
                    offset: this.offset,
                    message: "Unexpected block-seq-ind on same line with key",
                    source: this.source
                  });
                  return;
                }
              } else if (atMapIndent) {
                map.items.push({ start });
              }
              this.stack.push(bv);
              return;
            }
          }
        }
      }
      yield* this.pop();
      yield* this.step();
    }
    *blockSequence(seq) {
      const it = seq.items[seq.items.length - 1];
      switch (this.type) {
        case "newline":
          if (it.value) {
            const end = "end" in it.value ? it.value.end : undefined;
            const last = Array.isArray(end) ? end[end.length - 1] : undefined;
            if (last?.type === "comment")
              end?.push(this.sourceToken);
            else
              seq.items.push({ start: [this.sourceToken] });
          } else
            it.start.push(this.sourceToken);
          return;
        case "space":
        case "comment":
          if (it.value)
            seq.items.push({ start: [this.sourceToken] });
          else {
            if (this.atIndentedComment(it.start, seq.indent)) {
              const prev = seq.items[seq.items.length - 2];
              const end = prev?.value?.end;
              if (Array.isArray(end)) {
                arrayPushArray(end, it.start);
                end.push(this.sourceToken);
                seq.items.pop();
                return;
              }
            }
            it.start.push(this.sourceToken);
          }
          return;
        case "anchor":
        case "tag":
          if (it.value || this.indent <= seq.indent)
            break;
          it.start.push(this.sourceToken);
          return;
        case "seq-item-ind":
          if (this.indent !== seq.indent)
            break;
          if (it.value || includesToken(it.start, "seq-item-ind"))
            seq.items.push({ start: [this.sourceToken] });
          else
            it.start.push(this.sourceToken);
          return;
      }
      if (this.indent > seq.indent) {
        const bv = this.startBlockValue(seq);
        if (bv) {
          this.stack.push(bv);
          return;
        }
      }
      yield* this.pop();
      yield* this.step();
    }
    *flowCollection(fc) {
      const it = fc.items[fc.items.length - 1];
      if (this.type === "flow-error-end") {
        let top;
        do {
          yield* this.pop();
          top = this.peek(1);
        } while (top?.type === "flow-collection");
      } else if (fc.end.length === 0) {
        switch (this.type) {
          case "comma":
          case "explicit-key-ind":
            if (!it || it.sep)
              fc.items.push({ start: [this.sourceToken] });
            else
              it.start.push(this.sourceToken);
            return;
          case "map-value-ind":
            if (!it || it.value)
              fc.items.push({ start: [], key: null, sep: [this.sourceToken] });
            else if (it.sep)
              it.sep.push(this.sourceToken);
            else
              Object.assign(it, { key: null, sep: [this.sourceToken] });
            return;
          case "space":
          case "comment":
          case "newline":
          case "anchor":
          case "tag":
            if (!it || it.value)
              fc.items.push({ start: [this.sourceToken] });
            else if (it.sep)
              it.sep.push(this.sourceToken);
            else
              it.start.push(this.sourceToken);
            return;
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar": {
            const fs = this.flowScalar(this.type);
            if (!it || it.value)
              fc.items.push({ start: [], key: fs, sep: [] });
            else if (it.sep)
              this.stack.push(fs);
            else
              Object.assign(it, { key: fs, sep: [] });
            return;
          }
          case "flow-map-end":
          case "flow-seq-end":
            fc.end.push(this.sourceToken);
            return;
        }
        const bv = this.startBlockValue(fc);
        if (bv)
          this.stack.push(bv);
        else {
          yield* this.pop();
          yield* this.step();
        }
      } else {
        const parent = this.peek(2);
        if (parent.type === "block-map" && (this.type === "map-value-ind" && parent.indent === fc.indent || this.type === "newline" && !parent.items[parent.items.length - 1].sep)) {
          yield* this.pop();
          yield* this.step();
        } else if (this.type === "map-value-ind" && parent.type !== "flow-collection") {
          const prev = getPrevProps(parent);
          const start = getFirstKeyStartProps(prev);
          fixFlowSeqItems(fc);
          const sep = fc.end.splice(1, fc.end.length);
          sep.push(this.sourceToken);
          const map = {
            type: "block-map",
            offset: fc.offset,
            indent: fc.indent,
            items: [{ start, key: fc, sep }]
          };
          this.onKeyLine = true;
          this.stack[this.stack.length - 1] = map;
        } else {
          yield* this.lineEnd(fc);
        }
      }
    }
    flowScalar(type) {
      if (this.onNewLine) {
        let nl = this.source.indexOf(`
`) + 1;
        while (nl !== 0) {
          this.onNewLine(this.offset + nl);
          nl = this.source.indexOf(`
`, nl) + 1;
        }
      }
      return {
        type,
        offset: this.offset,
        indent: this.indent,
        source: this.source
      };
    }
    startBlockValue(parent) {
      switch (this.type) {
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
          return this.flowScalar(this.type);
        case "block-scalar-header":
          return {
            type: "block-scalar",
            offset: this.offset,
            indent: this.indent,
            props: [this.sourceToken],
            source: ""
          };
        case "flow-map-start":
        case "flow-seq-start":
          return {
            type: "flow-collection",
            offset: this.offset,
            indent: this.indent,
            start: this.sourceToken,
            items: [],
            end: []
          };
        case "seq-item-ind":
          return {
            type: "block-seq",
            offset: this.offset,
            indent: this.indent,
            items: [{ start: [this.sourceToken] }]
          };
        case "explicit-key-ind": {
          this.onKeyLine = true;
          const prev = getPrevProps(parent);
          const start = getFirstKeyStartProps(prev);
          start.push(this.sourceToken);
          return {
            type: "block-map",
            offset: this.offset,
            indent: this.indent,
            items: [{ start, explicitKey: true }]
          };
        }
        case "map-value-ind": {
          this.onKeyLine = true;
          const prev = getPrevProps(parent);
          const start = getFirstKeyStartProps(prev);
          return {
            type: "block-map",
            offset: this.offset,
            indent: this.indent,
            items: [{ start, key: null, sep: [this.sourceToken] }]
          };
        }
      }
      return null;
    }
    atIndentedComment(start, indent) {
      if (this.type !== "comment")
        return false;
      if (this.indent <= indent)
        return false;
      return start.every((st) => st.type === "newline" || st.type === "space");
    }
    *documentEnd(docEnd) {
      if (this.type !== "doc-mode") {
        if (docEnd.end)
          docEnd.end.push(this.sourceToken);
        else
          docEnd.end = [this.sourceToken];
        if (this.type === "newline")
          yield* this.pop();
      }
    }
    *lineEnd(token) {
      switch (this.type) {
        case "comma":
        case "doc-start":
        case "doc-end":
        case "flow-seq-end":
        case "flow-map-end":
        case "map-value-ind":
          yield* this.pop();
          yield* this.step();
          break;
        case "newline":
          this.onKeyLine = false;
        case "space":
        case "comment":
        default:
          if (token.end)
            token.end.push(this.sourceToken);
          else
            token.end = [this.sourceToken];
          if (this.type === "newline")
            yield* this.pop();
      }
    }
  }
  exports.Parser = Parser;
});

// node_modules/yaml/dist/public-api.js
var require_public_api = __commonJS(function(exports) {
  var composer = require_composer();
  var Document = require_Document();
  var errors = require_errors();
  var log = require_log();
  var identity = require_identity();
  var lineCounter = require_line_counter();
  var parser = require_parser();
  function parseOptions(options) {
    const prettyErrors = options.prettyErrors !== false;
    const lineCounter$1 = options.lineCounter || prettyErrors && new lineCounter.LineCounter || null;
    return { lineCounter: lineCounter$1, prettyErrors };
  }
  function parseAllDocuments(source, options = {}) {
    const { lineCounter, prettyErrors } = parseOptions(options);
    const parser$1 = new parser.Parser(lineCounter?.addNewLine);
    const composer$1 = new composer.Composer(options);
    const docs = Array.from(composer$1.compose(parser$1.parse(source)));
    if (prettyErrors && lineCounter)
      for (const doc of docs) {
        doc.errors.forEach(errors.prettifyError(source, lineCounter));
        doc.warnings.forEach(errors.prettifyError(source, lineCounter));
      }
    if (docs.length > 0)
      return docs;
    return Object.assign([], { empty: true }, composer$1.streamInfo());
  }
  function parseDocument(source, options = {}) {
    const { lineCounter, prettyErrors } = parseOptions(options);
    const parser$1 = new parser.Parser(lineCounter?.addNewLine);
    const composer$1 = new composer.Composer(options);
    let doc = null;
    for (const _doc of composer$1.compose(parser$1.parse(source), true, source.length)) {
      if (!doc)
        doc = _doc;
      else if (doc.options.logLevel !== "silent") {
        doc.errors.push(new errors.YAMLParseError(_doc.range.slice(0, 2), "MULTIPLE_DOCS", "Source contains multiple documents; please use YAML.parseAllDocuments()"));
        break;
      }
    }
    if (prettyErrors && lineCounter) {
      doc.errors.forEach(errors.prettifyError(source, lineCounter));
      doc.warnings.forEach(errors.prettifyError(source, lineCounter));
    }
    return doc;
  }
  function parse(src, reviver, options) {
    let _reviver = undefined;
    if (typeof reviver === "function") {
      _reviver = reviver;
    } else if (options === undefined && reviver && typeof reviver === "object") {
      options = reviver;
    }
    const doc = parseDocument(src, options);
    if (!doc)
      return null;
    doc.warnings.forEach((warning) => log.warn(doc.options.logLevel, warning));
    if (doc.errors.length > 0) {
      if (doc.options.logLevel !== "silent")
        throw doc.errors[0];
      else
        doc.errors = [];
    }
    return doc.toJS(Object.assign({ reviver: _reviver }, options));
  }
  function stringify(value, replacer, options) {
    let _replacer = null;
    if (typeof replacer === "function" || Array.isArray(replacer)) {
      _replacer = replacer;
    } else if (options === undefined && replacer) {
      options = replacer;
    }
    if (typeof options === "string")
      options = options.length;
    if (typeof options === "number") {
      const indent = Math.round(options);
      options = indent < 1 ? undefined : indent > 8 ? { indent: 8 } : { indent };
    }
    if (value === undefined) {
      const { keepUndefined } = options ?? replacer ?? {};
      if (!keepUndefined)
        return;
    }
    if (identity.isDocument(value) && !_replacer)
      return value.toString(options);
    return new Document.Document(value, _replacer, options).toString(options);
  }
  exports.parse = parse;
  exports.parseAllDocuments = parseAllDocuments;
  exports.parseDocument = parseDocument;
  exports.stringify = stringify;
});

// src/check.ts
import { appendFileSync, existsSync as existsSync3, mkdirSync, readdirSync as readdirSync2, readFileSync as readFileSync3, statSync as statSync2, writeFileSync } from "node:fs";
import { basename as basename2, dirname as dirname2, join as join3, resolve as resolve2 } from "node:path";
import { fileURLToPath } from "node:url";

// node_modules/yaml/dist/index.js
var exports_dist = {};
__exportCjs(exports_dist, {
  Composer: () => $Composer,
  Document: () => $Document,
  Schema: () => $Schema,
  YAMLError: () => $YAMLError,
  YAMLParseError: () => $YAMLParseError,
  YAMLWarning: () => $YAMLWarning,
  Alias: () => $Alias,
  isAlias: () => $isAlias,
  isCollection: () => $isCollection,
  isDocument: () => $isDocument,
  isMap: () => $isMap,
  isNode: () => $isNode,
  isPair: () => $isPair,
  isScalar: () => $isScalar,
  isSeq: () => $isSeq,
  Pair: () => $Pair,
  Scalar: () => $Scalar,
  YAMLMap: () => $YAMLMap,
  YAMLSeq: () => $YAMLSeq,
  CST: () => $CST,
  Lexer: () => $Lexer,
  LineCounter: () => $LineCounter,
  Parser: () => $Parser,
  parse: () => $parse,
  parseAllDocuments: () => $parseAllDocuments,
  parseDocument: () => $parseDocument,
  stringify: () => $stringify,
  visit: () => $visit,
  visitAsync: () => $visitAsync
}, {
  Composer: (value) => $Composer = value,
  Document: (value) => $Document = value,
  Schema: (value) => $Schema = value,
  YAMLError: (value) => $YAMLError = value,
  YAMLParseError: (value) => $YAMLParseError = value,
  YAMLWarning: (value) => $YAMLWarning = value,
  Alias: (value) => $Alias = value,
  isAlias: (value) => $isAlias = value,
  isCollection: (value) => $isCollection = value,
  isDocument: (value) => $isDocument = value,
  isMap: (value) => $isMap = value,
  isNode: (value) => $isNode = value,
  isPair: (value) => $isPair = value,
  isScalar: (value) => $isScalar = value,
  isSeq: (value) => $isSeq = value,
  Pair: (value) => $Pair = value,
  Scalar: (value) => $Scalar = value,
  YAMLMap: (value) => $YAMLMap = value,
  YAMLSeq: (value) => $YAMLSeq = value,
  CST: (value) => $CST = value,
  Lexer: (value) => $Lexer = value,
  LineCounter: (value) => $LineCounter = value,
  Parser: (value) => $Parser = value,
  parse: (value) => $parse = value,
  parseAllDocuments: (value) => $parseAllDocuments = value,
  parseDocument: (value) => $parseDocument = value,
  stringify: (value) => $stringify = value,
  visit: (value) => $visit = value,
  visitAsync: (value) => $visitAsync = value
});
var composer = require_composer();
var Document = require_Document();
var Schema = require_Schema();
var errors = require_errors();
var Alias = require_Alias();
var identity = require_identity();
var Pair = require_Pair();
var Scalar = require_Scalar();
var YAMLMap = require_YAMLMap();
var YAMLSeq = require_YAMLSeq();
var cst = require_cst();
var lexer = require_lexer();
var lineCounter = require_line_counter();
var parser = require_parser();
var publicApi = require_public_api();
var visit = require_visit();
var $Composer = composer.Composer;
var $Document = Document.Document;
var $Schema = Schema.Schema;
var $YAMLError = errors.YAMLError;
var $YAMLParseError = errors.YAMLParseError;
var $YAMLWarning = errors.YAMLWarning;
var $Alias = Alias.Alias;
var $isAlias = identity.isAlias;
var $isCollection = identity.isCollection;
var $isDocument = identity.isDocument;
var $isMap = identity.isMap;
var $isNode = identity.isNode;
var $isPair = identity.isPair;
var $isScalar = identity.isScalar;
var $isSeq = identity.isSeq;
var $Pair = Pair.Pair;
var $Scalar = Scalar.Scalar;
var $YAMLMap = YAMLMap.YAMLMap;
var $YAMLSeq = YAMLSeq.YAMLSeq;
var $CST = cst;
var $Lexer = lexer.Lexer;
var $LineCounter = lineCounter.LineCounter;
var $Parser = parser.Parser;
var $parse = publicApi.parse;
var $parseAllDocuments = publicApi.parseAllDocuments;
var $parseDocument = publicApi.parseDocument;
var $stringify = publicApi.stringify;
var $visit = visit.visit;
var $visitAsync = visit.visitAsync;

// src/env.ts
var NODE_FRAMEWORKS = {
  next: "next",
  "@sveltejs/kit": "sveltekit",
  svelte: "svelte",
  astro: "astro",
  vue: "vue",
  nuxt: "nuxt",
  "@angular/core": "angular",
  "solid-js": "solid",
  "@remix-run/react": "remix",
  "react-router": "react-router",
  react: "react",
  vite: "vite",
  express: "express",
  hono: "hono",
  fastify: "fastify",
  "@nestjs/core": "nestjs",
  koa: "koa"
};
var SERVER_FRAMEWORKS = new Set(["next", "nuxt", "remix", "express", "hono", "fastify", "nestjs", "koa"]);
var FRONTEND_NATIVE = new Set(["svelte", "sveltekit", "vue", "nuxt", "angular", "solid", "astro"]);
var PY_FRAMEWORKS = ["fastapi", "django", "flask", "starlette"];
var NOZLE_NAMES = ["@nozle-js/node", "@nozle-js/react", "nozle-sdk"];
function json(text) {
  if (text === undefined)
    return;
  try {
    const value = JSON.parse(text);
    return value && typeof value === "object" ? value : undefined;
  } catch {
    return;
  }
}
var base = (path) => path.split("/").pop() ?? path;
var dir = (path) => path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : ".";
function pythonDeps(files) {
  const deps = {};
  for (const [path, text] of Object.entries(files)) {
    if (base(path) === "requirements.txt") {
      for (const line of text.split(`
`)) {
        const match = /^\s*([A-Za-z0-9_.-]+)\s*(\[[^\]]*\])?\s*([<>=!~].*)?$/.exec(line.split("#")[0] ?? "");
        if (match?.[1])
          deps[match[1].toLowerCase().replace(/_/g, "-")] = (match[3] ?? "").trim();
      }
    } else if (base(path) === "pyproject.toml") {
      for (const match of text.matchAll(/["']([A-Za-z0-9_.-]+)\s*(\[[^\]]*\])?\s*([<>=!~][^"']*)?["']/g)) {
        deps[match[1].toLowerCase().replace(/_/g, "-")] = (match[3] ?? "").trim();
      }
    }
  }
  return deps;
}
function detectEnvironment(files) {
  const paths = Object.keys(files);
  const unknowns = [];
  const targets = [...new Set(paths.filter((p) => ["package.json", "requirements.txt", "pyproject.toml", "go.mod", "Gemfile", "composer.json", "pom.xml", "build.gradle"].includes(base(p))).map(dir))].sort();
  const languages = new Set;
  const frameworks = new Set;
  const nozlePackages = [];
  const scripts = new Set;
  const nodeDeps = {};
  let rootPackage;
  for (const path of paths.filter((p) => base(p) === "package.json")) {
    const pkg = json(files[path]);
    if (!pkg)
      continue;
    if (dir(path) === "." || !rootPackage)
      rootPackage = dir(path) === "." ? pkg : rootPackage ?? pkg;
    languages.add("javascript");
    Object.assign(nodeDeps, pkg.dependencies, pkg.devDependencies);
    for (const name of ["build", "typecheck", "test", "lint"])
      if (pkg.scripts?.[name])
        scripts.add(name);
    if (pkg.workspaces)
      frameworks.add("workspaces");
  }
  if (nodeDeps["typescript"] || paths.some((p) => base(p) === "tsconfig.json"))
    languages.add("typescript");
  for (const [name, framework] of Object.entries(NODE_FRAMEWORKS))
    if (nodeDeps[name])
      frameworks.add(framework);
  const py = pythonDeps(files);
  if (paths.some((p) => ["requirements.txt", "pyproject.toml"].includes(base(p))))
    languages.add("python");
  for (const name of PY_FRAMEWORKS)
    if (py[name])
      frameworks.add(name);
  const pyEntries = paths.filter((p) => p.endsWith(".py"));
  if (pyEntries.length && !paths.some((p) => ["requirements.txt", "pyproject.toml"].includes(base(p)))) {
    const imported = PY_FRAMEWORKS.filter((name) => pyEntries.some((p) => new RegExp(`^\\s*(from|import)\\s+${name}\\b`, "m").test(files[p] ?? "")));
    if (imported.length) {
      languages.add("python");
      for (const name of imported) {
        frameworks.add(name);
        py[name] = "*";
      }
      unknowns.push(`Python server code (${imported.join("/")}) has no requirements.txt or pyproject.toml: declare its dependencies before adding \`nozle-sdk\``);
    }
  }
  if (paths.some((p) => base(p) === "go.mod"))
    languages.add("go");
  if (paths.some((p) => base(p) === "Gemfile"))
    languages.add("ruby");
  if (paths.some((p) => base(p) === "composer.json"))
    languages.add("php");
  if (paths.some((p) => ["pom.xml", "build.gradle"].includes(base(p))))
    languages.add("java");
  for (const [name, spec] of Object.entries(nodeDeps))
    if (NOZLE_NAMES.includes(name))
      nozlePackages.push({ name, spec: String(spec) });
  for (const [name, spec] of Object.entries(py))
    if (NOZLE_NAMES.includes(name))
      nozlePackages.push({ name, spec });
  const lockfiles = { "package-lock.json": "npm", "pnpm-lock.yaml": "pnpm", "yarn.lock": "yarn", "bun.lock": "bun", "bun.lockb": "bun" };
  const lock = paths.find((p) => lockfiles[base(p)] !== undefined);
  const declaredManager = typeof rootPackage?.packageManager === "string" ? String(rootPackage.packageManager).split("@")[0] : undefined;
  const packageManager = lock ? lockfiles[base(lock)] : declaredManager;
  let lockfileState = rootPackage ? "missing" : "unknown";
  if (lock && base(lock) === "package-lock.json") {
    const root = json(files[lock])?.packages?.[""];
    if (root) {
      const wanted = { ...rootPackage?.dependencies, ...rootPackage?.devDependencies };
      const locked = { ...root.dependencies, ...root.devDependencies };
      const same = Object.keys(wanted).length === Object.keys(locked).length && Object.entries(wanted).every(([k, v]) => locked[k] === v);
      lockfileState = same ? "in_sync" : "out_of_sync";
    } else
      lockfileState = "unknown";
  } else if (lock)
    lockfileState = "unknown";
  const moduleType = rootPackage ? rootPackage.type === "module" ? "esm" : "commonjs" : undefined;
  const text = (re) => paths.filter((p) => re.test(base(p))).map((p) => files[p] ?? "").join(`
`);
  const svelteConfig = text(/^svelte\.config\./);
  const astroConfig = text(/^astro\.config\./);
  let runtime = frameworks.size || languages.size ? "unknown" : "none";
  const hasWrangler = paths.some((p) => base(p) === "wrangler.toml" || base(p) === "wrangler.jsonc") || Boolean(nodeDeps["wrangler"]);
  if (frameworks.has("sveltekit")) {
    if (nodeDeps["@sveltejs/adapter-static"])
      runtime = "static";
    else if (nodeDeps["@sveltejs/adapter-cloudflare"])
      runtime = "workers";
    else if (nodeDeps["@sveltejs/adapter-node"])
      runtime = "node";
    else if (nodeDeps["@sveltejs/adapter-vercel"] || nodeDeps["@sveltejs/adapter-netlify"])
      runtime = "node";
    else if (nodeDeps["@sveltejs/adapter-auto"])
      unknowns.push("SvelteKit uses adapter-auto, so the runtime depends on the deploy target");
  } else if (frameworks.has("astro")) {
    if (nodeDeps["@astrojs/cloudflare"])
      runtime = "workers";
    else if (nodeDeps["@astrojs/node"] || nodeDeps["@astrojs/vercel"] || nodeDeps["@astrojs/netlify"])
      runtime = "node";
    else if (!/adapter\s*:/.test(astroConfig))
      runtime = "static";
  } else if (hasWrangler)
    runtime = "workers";
  else if ([...frameworks].some((f) => SERVER_FRAMEWORKS.has(f)))
    runtime = "node";
  else if (languages.has("javascript") && !languages.has("python") && !["go", "ruby", "php", "java"].some((l) => languages.has(l)) && frameworks.has("vite"))
    runtime = "static";
  const backend = { path: "none", reasons: [] };
  const hasPyServer = languages.has("python") && PY_FRAMEWORKS.some((n) => py[n]);
  const hasNodeServer = [...frameworks].some((f) => SERVER_FRAMEWORKS.has(f)) || frameworks.has("sveltekit") && runtime !== "static" && runtime !== "workers" || frameworks.has("astro") && runtime === "node";
  if (hasPyServer || languages.has("python") && !hasNodeServer) {
    backend.path = "python-sdk";
    backend.reasons.push("Python backend: `nozle-sdk` (Python >= 3.9; under async frameworks use `AsyncNozle` from 0.13, or run the sync client in a thread)");
  } else if (runtime === "workers") {
    backend.path = "rest";
    backend.reasons.push("Workers/edge runtime: SDK support is not documented, so use the REST API with `fetch`");
  } else if (hasNodeServer) {
    backend.path = "node-sdk";
    backend.reasons.push("Node server code: `@nozle-js/node` (Node >= 18; ships both ESM and CommonJS)");
    if ([...frameworks].some((f) => ["express", "hono", "fastify", "nestjs", "koa"].includes(f)))
      backend.reasons.push("detected from dependencies only: confirm the server code is in this folder");
    if (runtime === "unknown")
      backend.reasons.push("runtime is not fixed by the config; if it deploys to an edge runtime use REST instead");
  } else if (languages.has("go")) {
    backend.path = "go-sdk";
    backend.reasons.push("Go backend: `github.com/nozle-dev/nozle-go` (Go >= 1.22)");
  } else if (["ruby", "php", "java"].some((l) => languages.has(l))) {
    backend.path = "rest";
    backend.reasons.push(`No Nozle SDK for ${[...languages].filter((l) => ["ruby", "php", "java"].includes(l)).join("/")}: call the REST API from the backend`);
  } else if (runtime === "static" || languages.has("javascript") && !hasNodeServer) {
    backend.path = "no-server";
    backend.reasons.push("No server code found: secret-key calls need a backend (add an SSR adapter/server route or use a separate backend)");
  }
  const frontend = { path: "none", reasons: [] };
  const hasReact = frameworks.has("react") || frameworks.has("next") || frameworks.has("remix") || frameworks.has("react-router");
  const native = [...frameworks].filter((f) => FRONTEND_NATIVE.has(f));
  if (hasReact) {
    frontend.path = "react-sdk";
    frontend.reasons.push("React: `@nozle-js/react` (React >= 18; from 0.11 peer `@tanstack/react-query` v5, no `@stripe/*` packages; themed with `appearance`, not Tailwind; publishable key only, customer billing goes through your backend)");
    const major = Number(/(\d+)/.exec(String(nodeDeps["react"] ?? ""))?.[1]);
    if (major && major < 18)
      frontend.reasons.push(`React ${major} is below the SDK minimum of 18`);
  } else if (native.length) {
    frontend.path = "native-components";
    frontend.reasons.push(`No Nozle SDK for ${native.join("/")}: build native components that read plans from a backend route or the public catalog (publishable key)`);
    if (nodeDeps["@astrojs/react"])
      frontend.reasons.push("`@astrojs/react` is present, so a React island could use `@nozle-js/react`");
  }
  if (!targets.length)
    unknowns.push("no manifests found: nothing to detect (a new project)");
  return {
    targets,
    languages: [...languages].sort(),
    frameworks: [...frameworks].sort(),
    ...packageManager ? { packageManager } : {},
    lockfile: lockfileState,
    ...moduleType ? { moduleType } : {},
    runtime,
    nozlePackages,
    scripts: [...scripts].sort(),
    backend,
    frontend,
    unknowns
  };
}
function renderEnvironment(env) {
  const line = (label, value) => `${label.padEnd(16)}${value}
`;
  let out = "";
  out += line("targets", env.targets.join(", ") || "none");
  out += line("languages", env.languages.join(", ") || "none");
  out += line("frameworks", env.frameworks.join(", ") || "none");
  out += line("package manager", `${env.packageManager ?? "unknown"} (lockfile ${env.lockfile.replace("_", " ")})`);
  out += line("module type", env.moduleType ?? "n/a");
  out += line("runtime", env.runtime);
  out += line("nozle packages", env.nozlePackages.map((p) => `${p.name}@${p.spec || "*"}`).join(", ") || "none");
  out += line("scripts", env.scripts.join(", ") || "none");
  out += line("backend path", `${env.backend.path}${env.backend.reasons.length ? ` - ${env.backend.reasons.join("; ")}` : ""}`);
  out += line("frontend path", `${env.frontend.path}${env.frontend.reasons.length ? ` - ${env.frontend.reasons.join("; ")}` : ""}`);
  for (const unknown of env.unknowns)
    out += line("unknown", unknown);
  return out;
}

// src/scan.ts
var nozleFile = /@nozle-js\/(?:node|react)|(?:^|\n)\s*(?:import\s+nozle\b|from\s+nozle\s+import|from\s+nozle\.)|nozle-dev\/nozle-go|api\.nozle\.(?:app|dev)/;
var signals = [
  { capability: 1, label: "Pricing and plans", pattern: /PricingTable|usePlans|\/plans\/public|public[_-]?plans/ },
  { capability: 2, label: "Checkout and payments", pattern: /\.checkout\(|checkoutMany|checkout_many|\/checkout\b|CheckoutButton|verifyCheckout/ },
  { capability: 3, label: "Subscriptions", pattern: /\.subscribe\(|\/subscribe\b|cancel_?[sS]ubscription|applySubscriptionTransition|subscriptions?\.(?:create|cancel)/ },
  { capability: 4, label: "Credits and top-ups", pattern: /usage\.track|usage_track|\/usage\/track|credits\.|credit_systems|creditSystems/ },
  { capability: 5, label: "Usage tracking", pattern: /\.track\(|\/events\b|wrapOpenAI|wrapAnthropic|captureFetch|recordUsage|wrap_openai|wrap_anthropic|wrap_http_client|capture_(?:async_)?http_client|record_usage|WrapHTTPClient|RecordUsage|WithLLM|transaction_?[iI]d/ },
  { capability: 6, label: "Feature access and limits", pattern: /\.can\(|\/can\b|usage\.check|usage_check|check-and-deduct|useEntitlement/ },
  { capability: 7, label: "Costs and margins", pattern: /costEvents|cost_events|\/cost-events|TrackCostEvent|costMeterCode|CostMeterCode|cost_meter_code/ },
  { capability: 8, label: "Customer billing dashboard", pattern: /BillingPortal|billing-portal|createBillingHandler|billingEndpoint|CurrentPlan|use(?:Subscription|CreditBalance|CreditHistory|Usage|Invoices|InvoiceDownload)\b/ },
  { capability: 9, label: "Billing and data sync", pattern: /webhook/i },
  { capability: 0, label: "Customer record (base)", pattern: /customers\.upsert|customers\.create|\/customers\b|customer_not_found/ }
];
function scanNozleUsage(sources) {
  const files = [];
  const envVars = new Set;
  const rows = new Map;
  for (const [file, text] of Object.entries(sources)) {
    if (!nozleFile.test(text))
      continue;
    files.push(file);
    for (const name of text.match(/\bNOZLE_(?:SECRET|API|PUBLISHABLE)[A-Z0-9_]*\b/g) ?? [])
      envVars.add(name);
    const lines = text.split(`
`);
    lines.forEach((content, index) => {
      for (const { capability, label, pattern } of signals) {
        if (!pattern.test(content))
          continue;
        const row = rows.get(capability) ?? { capability, label, hits: [] };
        if (row.hits.length < 5)
          row.hits.push({ file, line: index + 1, text: content.trim().slice(0, 100) });
        rows.set(capability, row);
      }
    });
  }
  return { files, rows: [...rows.values()].sort((a, b) => a.capability - b.capability), envVars: [...envVars].sort() };
}
function renderUsageScan(scan, packages) {
  if (scan.files.length === 0 && packages.length === 0) {
    return `No Nozle usage found in the code: no SDK dependency, import, API call or NOZLE_ variable.
`;
  }
  const out = [`Nozle already in the code: ${scan.files.length} file(s)${packages.length ? `, packages ${packages.map((p) => `${p.name}@${p.spec || "*"}`).join(", ")}` : ""}`];
  for (const row of scan.rows) {
    out.push(`- ${row.capability === 0 ? "base" : `choice ${row.capability}`} ${row.label}:`);
    for (const hit of row.hits)
      out.push(`    ${hit.file}:${hit.line}  ${hit.text}`);
  }
  if (scan.envVars.length)
    out.push(`Environment variables read: ${scan.envVars.join(", ")}`);
  out.push("A row means a call exists, not that it is correct or complete: check each with nozle-doctor before building on it.");
  return `${out.join(`
`)}
`;
}

// src/key.ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
var defaultNames = ["NOZLE_SECRET_KEY", "NOZLE_PUBLISHABLE_KEY", "NOZLE_API_KEY"];
var envFiles = [".env.local", ".env"];
function parseDotenv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match)
      continue;
    let value = match[2];
    if (/^(["']).*\1$/.test(value))
      value = value.slice(1, -1);
    else
      value = value.replace(/\s+#.*$/, "");
    out[match[1]] = value;
  }
  return out;
}
function keyNames(directory) {
  const names = new Set(defaultNames);
  const template = join(directory, ".env.example");
  if (existsSync(template)) {
    for (const name of Object.keys(parseDotenv(readFileSync(template, "utf8")))) {
      if (/^(?:[A-Z0-9_]*_)?NOZLE_[A-Z0-9_]*KEY$/.test(name))
        names.add(name);
    }
  }
  return [...names];
}
function findKeys(directory, env = process.env) {
  const files = envFiles.filter((file) => existsSync(join(directory, file))).map((file) => ({ file, values: parseDotenv(readFileSync(join(directory, file), "utf8")) }));
  const found = [];
  for (const name of keyNames(directory)) {
    if (env[name]) {
      found.push({ name, source: "environment", value: env[name] });
      continue;
    }
    const hit = files.find(({ values }) => values[name]);
    if (hit)
      found.push({ name, source: hit.file, value: hit.values[name] });
  }
  return found;
}
function kindOf(value) {
  if (value.startsWith("sk_"))
    return "secret";
  if (value.startsWith("pk_"))
    return "publishable";
  return "unknown";
}
function describeStatus(status) {
  if (status >= 200 && status < 300)
    return { ok: true, message: `works (HTTP ${status})` };
  if (status === 401)
    return { ok: false, message: "rejected (HTTP 401): the key is wrong, revoked, or for another environment" };
  if (status === 403)
    return { ok: true, message: "accepted, but not allowed to read plans (HTTP 403): check its permissions in Settings > API Keys" };
  if (status === 429)
    return { ok: false, message: "not checked: rate limited (HTTP 429), try again shortly" };
  return { ok: false, message: `not checked: Nozle answered HTTP ${status}` };
}
async function checkKeys(directory, base, request = fetch) {
  const url = `${base.replace(/\/+$/, "")}/api/v1/plans?per_page=1`;
  const results = [];
  for (const key of findKeys(directory)) {
    const kind = kindOf(key.value);
    if (kind === "unknown") {
      results.push({ name: key.name, source: key.source, kind, ok: false, message: "is not a Nozle key (it should start with sk_ or pk_)" });
      continue;
    }
    try {
      const response = await request(url, { headers: { Authorization: `Bearer ${key.value}` } });
      results.push({ name: key.name, source: key.source, kind, ...describeStatus(response.status) });
    } catch {
      results.push({ name: key.name, source: key.source, kind, ok: false, message: `not checked: could not reach ${base}` });
    }
  }
  return results;
}
function renderKeyResults(results) {
  if (results.length === 0) {
    return `no Nozle key found: set NOZLE_SECRET_KEY (and NOZLE_PUBLISHABLE_KEY if the browser shows pricing) in .env or the environment
`;
  }
  return results.map((r) => `${r.name} (${r.kind} key, from ${r.source}): ${r.message}
`).join("");
}

// src/hook-adapters.ts
var none = { stdout: "", stderr: "", exitCode: 0 };
var object = (value) => value !== null && typeof value === "object" ? value : {};
var text = (value) => typeof value === "string" && value !== "" ? value : undefined;
var isAccountServer = (server) => server.includes("nozle-account");
var claudeEditTools = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
var claude = {
  parse(payload) {
    const cwd = text(payload["cwd"]);
    const tool = text(payload["tool_name"]) ?? "";
    const toolInput = object(payload["tool_input"]);
    const path = text(toolInput["file_path"]) ?? text(toolInput["notebook_path"]);
    switch (payload["hook_event_name"]) {
      case "SessionStart":
        return { event: "session-start", input: { cwd } };
      case "PreToolUse":
        if (claudeEditTools.has(tool))
          return { event: "pre-edit", input: { cwd, path } };
        if (tool === "Bash")
          return { event: "pre-command", input: { cwd, command: text(toolInput["command"]) ?? "" } };
        if (tool.startsWith("mcp__")) {
          const [, server = ""] = tool.split("__");
          return isAccountServer(server) ? { event: "pre-mcp", input: { cwd, tool: tool.slice(tool.lastIndexOf("__") + 2) } } : null;
        }
        return null;
      case "PostToolUse":
        return claudeEditTools.has(tool) ? { event: "post-edit", input: { cwd, path } } : null;
      case "PermissionRequest":
        return tool === "Bash" ? { event: "permission", input: { cwd, command: text(toolInput["command"]) ?? "" } } : null;
      case "Stop":
      case "SubagentStop":
        return { event: "stop", input: { cwd, stop_hook_active: payload["stop_hook_active"] === true } };
      default:
        return null;
    }
  },
  render(parsed, result) {
    if (parsed.event === "permission") {
      return result.abstain ? none : { stdout: `${JSON.stringify({ hookSpecificOutput: { hookEventName: "PermissionRequest", decision: { behavior: "allow" } } })}
`, stderr: "", exitCode: 0 };
    }
    if (result.decision === "deny") {
      const reason = `Nozle guard: ${result.reason}`;
      if (parsed.event === "pre-edit" || parsed.event === "pre-command" || parsed.event === "pre-mcp") {
        return { stdout: "", stderr: `${reason}
`, exitCode: 2 };
      }
      return { stdout: `${JSON.stringify({ decision: "block", reason })}
`, stderr: "", exitCode: 0 };
    }
    if ((parsed.event === "session-start" || parsed.event === "post-edit") && result.context) {
      const hookEventName = parsed.event === "session-start" ? "SessionStart" : "PostToolUse";
      return {
        stdout: `${JSON.stringify({ hookSpecificOutput: { hookEventName, additionalContext: result.context } })}
`,
        stderr: "",
        exitCode: 0
      };
    }
    return none;
  }
};
function patchPaths(patch) {
  return [...patch.matchAll(/^\*\*\* (?:Add File|Update File|Delete File|Move to): (.+)$/gm)].map((match) => match[1].trim());
}
var codex = {
  parse(payload) {
    const cwd = text(payload["cwd"]);
    const tool = text(payload["tool_name"]) ?? "";
    const command = text(object(payload["tool_input"])["command"]) ?? "";
    switch (payload["hook_event_name"]) {
      case "SessionStart":
        return { event: "session-start", input: { cwd } };
      case "PreToolUse":
        if (tool === "apply_patch")
          return { event: "pre-edit", input: { cwd, paths: patchPaths(command) } };
        if (tool === "Bash")
          return { event: "pre-command", input: { cwd, command } };
        if (tool.startsWith("mcp__")) {
          const [, server = ""] = tool.split("__");
          return isAccountServer(server) ? { event: "pre-mcp", input: { cwd, tool: tool.slice(tool.lastIndexOf("__") + 2) } } : null;
        }
        return null;
      case "PostToolUse":
        return tool === "apply_patch" ? { event: "post-edit", input: { cwd, paths: patchPaths(command) } } : null;
      case "Stop":
        return { event: "stop", input: { cwd, stop_hook_active: payload["stop_hook_active"] === true } };
      default:
        return null;
    }
  },
  render: claude.render
};
var json2 = (value) => `${JSON.stringify(value)}
`;
var isPre = (event) => event === "pre-edit" || event === "pre-command" || event === "pre-mcp";
var blockPre = (reason) => ({ stdout: "", stderr: `Nozle guard: ${reason}
`, exitCode: 2 });
var filePath = (args) => text(args["file_path"]) ?? text(args["filePath"]) ?? text(args["path"]) ?? text(args["target_file"]);
var mcpTool = (name, prefixLength) => name.slice(prefixLength);
var cursor = {
  parse(payload) {
    const cwd = text(payload["cwd"]) ?? (Array.isArray(payload["workspace_roots"]) ? text(payload["workspace_roots"][0]) : undefined);
    const tool = text(payload["tool_name"]) ?? "";
    const toolInput = object(payload["tool_input"]);
    switch (payload["hook_event_name"]) {
      case "sessionStart":
        return { event: "session-start", input: { cwd } };
      case "beforeShellExecution":
        return { event: "pre-command", input: { cwd, command: text(payload["command"]) ?? "" } };
      case "beforeMCPExecution":
        return { event: "pre-mcp", input: { cwd, tool } };
      case "preToolUse":
        if (tool === "Shell")
          return { event: "pre-command", input: { cwd, command: text(toolInput["command"]) ?? "" } };
        if (tool.startsWith("MCP:"))
          return { event: "pre-mcp", input: { cwd, tool: mcpTool(tool, 4) } };
        if (["Write", "Edit", "StrReplace", "Delete", "EditNotebook"].includes(tool))
          return { event: "pre-edit", input: { cwd, path: filePath(toolInput) } };
        return null;
      case "afterFileEdit":
        return { event: "post-edit", input: { cwd, path: text(payload["file_path"]) } };
      case "stop":
        return { event: "stop", input: { cwd, stop_hook_active: Number(payload["loop_count"] ?? 0) > 0 } };
      default:
        return null;
    }
  },
  render(parsed, result) {
    if (result.decision === "deny") {
      if (isPre(parsed.event))
        return blockPre(result.reason ?? "denied");
      if (parsed.event === "stop")
        return { stdout: json2({ followup_message: `Nozle guard: ${result.reason}` }), stderr: "", exitCode: 0 };
      return { stdout: "", stderr: `Nozle guard: ${result.reason}
`, exitCode: 0 };
    }
    return parsed.event === "session-start" && result.context ? { stdout: json2({ additional_context: result.context }), stderr: "", exitCode: 0 } : none;
  }
};
var windsurf = {
  parse(payload) {
    const info = object(payload["tool_info"]);
    const cwd = text(info["cwd"]);
    switch (payload["agent_action_name"]) {
      case "pre_write_code":
        return { event: "pre-edit", input: { cwd, path: text(info["file_path"]) } };
      case "post_write_code":
        return { event: "post-edit", input: { cwd, path: text(info["file_path"]) } };
      case "pre_run_command":
        return { event: "pre-command", input: { cwd, command: text(info["command_line"]) ?? "" } };
      case "pre_mcp_tool_use":
        return { event: "pre-mcp", input: { cwd, tool: text(info["mcp_tool_name"]) ?? "" } };
      default:
        return null;
    }
  },
  render: (parsed, result) => result.decision === "deny" && isPre(parsed.event) ? blockPre(result.reason ?? "denied") : none
};
var gemini = {
  parse(payload) {
    const cwd = text(payload["cwd"]);
    const tool = text(payload["tool_name"]) ?? "";
    const toolInput = object(payload["tool_input"]);
    const edit = tool === "write_file" || tool === "replace";
    switch (payload["hook_event_name"]) {
      case "SessionStart":
        return { event: "session-start", input: { cwd } };
      case "BeforeTool":
        if (edit)
          return { event: "pre-edit", input: { cwd, path: filePath(toolInput) } };
        if (tool === "run_shell_command")
          return { event: "pre-command", input: { cwd, command: text(toolInput["command"]) ?? "" } };
        if (tool.startsWith("mcp_"))
          return isAccountServer(tool.slice(4, tool.indexOf("_", 4))) ? { event: "pre-mcp", input: { cwd, tool: mcpTool(tool, tool.indexOf("_", 4) + 1) } } : null;
        return null;
      case "AfterTool":
        return edit ? { event: "post-edit", input: { cwd, path: filePath(toolInput) } } : null;
      case "AfterAgent":
        return { event: "stop", input: { cwd, stop_hook_active: payload["stop_hook_active"] === true } };
      default:
        return null;
    }
  },
  render(parsed, result) {
    if (result.decision === "deny") {
      if (isPre(parsed.event))
        return blockPre(result.reason ?? "denied");
      return { stdout: json2({ decision: "deny", reason: `Nozle guard: ${result.reason}` }), stderr: "", exitCode: 0 };
    }
    return parsed.event === "session-start" && result.context ? { stdout: json2({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: result.context } }), stderr: "", exitCode: 0 } : none;
  }
};
var copilotEdits = new Set(["edit", "create", "write", "Edit", "Write", "MultiEdit", "str_replace_editor", "replace_string_in_file", "create_file", "insert_edit_into_file"]);
var copilotShell = new Set(["bash", "powershell", "Bash", "run_in_terminal"]);
function toolArguments(value) {
  if (typeof value !== "string")
    return object(value);
  try {
    return object(JSON.parse(value));
  } catch {
    return {};
  }
}
var copilot = {
  parse(payload) {
    const cwd = text(payload["cwd"]);
    const format = payload["hook_event_name"] !== undefined ? "vscode" : "cli";
    const name = String(payload["hook_event_name"] ?? payload["event"] ?? payload["hookEventName"] ?? "");
    const tool = text(payload["tool_name"]) ?? text(payload["toolName"]) ?? "";
    const args = toolArguments(payload["tool_input"] ?? payload["toolArgs"]);
    const path = filePath(args);
    const parsed = (event, input) => ({ event, input, format });
    switch (name.charAt(0).toLowerCase() + name.slice(1)) {
      case "sessionStart":
        return parsed("session-start", { cwd });
      case "preToolUse":
        if (copilotEdits.has(tool))
          return parsed("pre-edit", { cwd, path });
        if (copilotShell.has(tool))
          return parsed("pre-command", { cwd, command: text(args["command"]) ?? "" });
        if (tool.startsWith("mcp_"))
          return isAccountServer(tool.slice(4, tool.indexOf("_", 4))) ? parsed("pre-mcp", { cwd, tool: mcpTool(tool, tool.indexOf("_", 4) + 1) }) : null;
        return null;
      case "postToolUse":
        return copilotEdits.has(tool) ? parsed("post-edit", { cwd, path }) : null;
      case "stop":
      case "agentStop":
        return parsed("stop", { cwd, stop_hook_active: payload["stop_hook_active"] === true });
      default:
        return null;
    }
  },
  render(parsed, result) {
    const vscode = parsed.format === "vscode";
    if (result.decision === "deny") {
      if (isPre(parsed.event))
        return blockPre(result.reason ?? "denied");
      const reason = `Nozle guard: ${result.reason}`;
      if (parsed.event === "stop") {
        const out = vscode ? { hookSpecificOutput: { hookEventName: "Stop", decision: "block", reason } } : { decision: "block", reason };
        return { stdout: json2(out), stderr: "", exitCode: 0 };
      }
      return { stdout: json2(vscode ? { decision: "block", reason } : { additionalContext: reason }), stderr: "", exitCode: 0 };
    }
    if (parsed.event === "session-start" && result.context) {
      const out = vscode ? { hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: result.context } } : { additionalContext: result.context };
      return { stdout: json2(out), stderr: "", exitCode: 0 };
    }
    return none;
  }
};
var opencodeEdits = new Set(["write", "edit", "patch", "multiedit", "apply_patch"]);
var opencode = {
  parse(payload) {
    const cwd = text(payload["cwd"]);
    const tool = text(payload["tool"]) ?? "";
    const args = object(payload["args"]);
    const before = payload["phase"] === "before";
    if (opencodeEdits.has(tool))
      return { event: before ? "pre-edit" : "post-edit", input: { cwd, path: filePath(args) } };
    if (!before)
      return null;
    if (tool === "bash")
      return { event: "pre-command", input: { cwd, command: text(args["command"]) ?? "" } };
    if (tool.startsWith("nozle-account_"))
      return { event: "pre-mcp", input: { cwd, tool: tool.slice("nozle-account_".length) } };
    return null;
  },
  render: (parsed, result) => result.decision === "deny" ? isPre(parsed.event) ? blockPre(result.reason ?? "denied") : { stdout: "", stderr: `Nozle guard: ${result.reason}
`, exitCode: 2 } : none
};
var adapters = { claude, codex, cursor, windsurf, gemini, copilot, opencode };

// src/hosts.ts
var hostNames = ["codex", "cursor", "windsurf", "gemini", "copilot", "opencode"];
var docsUrl = "https://docs.nozle.dev/mcp";
var accountUrl = process.env.NOZLE_ACCOUNT_MCP_URL || "https://api.nozle.app/core/mcp";
var pretty = (value) => `${JSON.stringify(value, null, 2)}
`;
var hostNotes = {
  windsurf: 'Docs MCP: add {"mcpServers":{"nozle-docs":{"serverUrl":"' + docsUrl + '"}}} to ~/.config/devin/mcp_config.json (user level). Windsurf has no session-start or stop hook, so those guards do not apply.',
  copilot: 'One file serves VS Code and Copilot CLI. Docs MCP for the CLI: add the same server to .mcp.json as {"mcpServers":{"nozle-docs":{"type":"http","url":"' + docsUrl + '"}}}.',
  opencode: "A plugin can only block by throwing, so OpenCode has no stop or session-start guard.",
  cline: "Cline: skills install to .cline/skills or .agents/skills. Add the docs MCP in Cline's MCP Servers panel (type streamableHttp, url " + docsUrl + "). Guard hooks are not generated: Cline's hook interface is unconfirmed."
};
function hostFiles(host, hookPath) {
  const command = (name) => `"${hookPath}" --host ${name}`;
  const entry = (name, extra = {}) => ({ type: "command", command: command(name), timeout: 10, ...extra });
  switch (host) {
    case "codex":
      return [{
        path: ".codex/hooks.json",
        content: pretty({ hooks: Object.fromEntries(["SessionStart", "PreToolUse", "PostToolUse", "Stop"].map((event) => [event, [{ hooks: [entry("codex")] }]])) })
      }];
    case "cursor":
      return [
        {
          path: ".cursor/hooks.json",
          content: pretty({
            version: 1,
            hooks: {
              sessionStart: [{ command: command("cursor") }],
              beforeShellExecution: [{ command: command("cursor"), failClosed: true }],
              preToolUse: [{ command: command("cursor"), matcher: "Write|Edit|StrReplace|Delete|MCP:.*", failClosed: true }],
              afterFileEdit: [{ command: command("cursor") }],
              stop: [{ command: command("cursor") }]
            }
          })
        },
        { path: ".cursor/mcp.json", content: pretty({ mcpServers: { "nozle-docs": { url: docsUrl } } }) }
      ];
    case "windsurf":
      return [{
        path: ".devin/hooks.json",
        content: pretty({
          hooks: Object.fromEntries(["pre_write_code", "post_write_code", "pre_run_command", "pre_mcp_tool_use"].map((event) => [event, [{ command: command("windsurf"), show_output: true }]]))
        })
      }];
    case "gemini":
      return [{
        path: ".gemini/settings.json",
        content: pretty({
          mcpServers: { "nozle-docs": { httpUrl: docsUrl } },
          hooks: {
            SessionStart: [{ matcher: "*", hooks: [entry("gemini", { name: "nozle-guard" })] }],
            BeforeTool: [{ matcher: "write_file|replace|run_shell_command|mcp_nozle-account_.*", hooks: [entry("gemini", { name: "nozle-guard", timeout: 1e4 })] }],
            AfterTool: [{ matcher: "write_file|replace", hooks: [entry("gemini", { name: "nozle-guard", timeout: 1e4 })] }],
            AfterAgent: [{ matcher: "*", hooks: [entry("gemini", { name: "nozle-guard", timeout: 1e4 })] }]
          }
        })
      }];
    case "copilot":
      return [
        {
          path: ".github/hooks/nozle.json",
          content: pretty({ hooks: Object.fromEntries(["SessionStart", "PreToolUse", "PostToolUse", "Stop"].map((event) => [event, [entry("copilot")]])) })
        },
        { path: ".vscode/mcp.json", content: pretty({ servers: { "nozle-docs": { type: "http", url: docsUrl } } }) }
      ];
    case "opencode":
      return [
        { path: "opencode.json", content: pretty({ $schema: "https://opencode.ai/config.json", mcp: {
          "nozle-docs": { type: "remote", url: docsUrl, enabled: true },
          "nozle-account": { type: "remote", url: accountUrl, enabled: true }
        } }) },
        { path: ".opencode/plugins/nozle-guard.js", content: opencodePlugin(hookPath) }
      ];
  }
}
function opencodePlugin(hookPath) {
  return `// Nozle guard for OpenCode: runs the same checks as the other hosts and blocks by throwing.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const hook = ${JSON.stringify(hookPath)};

function guard(phase, cwd, tool, args) {
  if (!existsSync(hook)) return;
  const run = spawnSync("sh", [hook, "--host", "opencode"], { input: JSON.stringify({ phase, cwd, tool, args }), encoding: "utf8" });
  // The hook is silent outside an integration; any failure while one exists blocks, like the other hosts.
  if (run.status !== 0) throw new Error(run.stderr.trim() || "Nozle guard: could not run");
}

export const NozleGuard = async ({ directory }) => ({
  "tool.execute.before": async (input, output) => guard("before", directory, input.tool, output.args),
  "tool.execute.after": async (input) => guard("after", directory, input.tool, input.args),
});
`;
}

// src/hook.ts
import { createHash } from "node:crypto";
import { existsSync as existsSync2, readdirSync, readFileSync as readFileSync2, realpathSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, join as join2, relative, resolve } from "node:path";

// src/plan.ts
function mergeTasks(tasks) {
  const merged = new Map;
  for (const task of tasks) {
    const prior = merged.get(task.id);
    if (!prior) {
      merged.set(task.id, { ...task });
      continue;
    }
    if (prior.label !== task.label)
      throw new Error(`Task ${task.id} has conflicting labels`);
    merged.set(task.id, {
      ...prior,
      goals: [...new Set([...prior.goals, ...task.goals])],
      dependsOn: [...new Set([...prior.dependsOn ?? [], ...task.dependsOn ?? []])],
      required: (prior.required ?? true) || (task.required ?? true)
    });
  }
  return [...merged.values()];
}
function preparePlan(input) {
  const selectedGoals = [...new Set(input.selectedGoals)];
  if (selectedGoals.length === 0)
    throw new Error("Select at least one integration goal");
  if (selectedGoals.some((goal) => !Number.isInteger(goal) || goal < 1 || goal > 10)) {
    throw new Error("Integration goals must be options 1 through 10");
  }
  if (input.tasks.length === 0)
    throw new Error("Plan needs at least one task");
  const selected = new Set(selectedGoals);
  const tasksById = new Map;
  for (const task of input.tasks) {
    if (tasksById.has(task.id))
      throw new Error(`Duplicate task ID ${task.id}`);
    for (const goal of task.goals) {
      if (!selected.has(goal))
        throw new Error(`Task ${task.id} refers to unselected goal ${goal}`);
    }
    tasksById.set(task.id, {
      id: task.id,
      label: task.label,
      goals: [...new Set(task.goals)],
      dependsOn: [...new Set(task.dependsOn ?? [])],
      required: task.required ?? true
    });
  }
  for (const task of tasksById.values()) {
    for (const dependency of task.dependsOn) {
      if (!tasksById.has(dependency))
        throw new Error(`Task ${task.id} depends on unknown task ${dependency}`);
    }
  }
  const visiting = new Set;
  const visited = new Set;
  const ordered = [];
  function visit(task) {
    if (visiting.has(task.id))
      throw new Error("Task dependencies contain a cycle");
    if (visited.has(task.id))
      return;
    visiting.add(task.id);
    for (const id of task.dependsOn)
      visit(tasksById.get(id));
    visiting.delete(task.id);
    visited.add(task.id);
    ordered.push(task);
  }
  for (const task of tasksById.values())
    visit(task);
  return { selectedGoals, tasks: ordered };
}
function progressFor(plan, results) {
  const tasks = [];
  const byId = new Map;
  for (const task of plan.tasks) {
    const result = results[task.id];
    if (result?.status === "completed" && !result.evidence?.trim()) {
      throw new Error(`Completed task ${task.id} has no verification evidence`);
    }
    if ((result?.status === "failed" || result?.status === "deferred") && !result.reason?.trim()) {
      throw new Error(`${result.status} task ${task.id} has no reason`);
    }
    if (result?.status === "completed" || result?.status === "active") {
      for (const id of task.dependsOn) {
        if (byId.get(id)?.status !== "completed") {
          const verb = result.status === "active" ? "be active" : "complete";
          throw new Error(`Task ${task.id} cannot ${verb} before dependency ${id}`);
        }
      }
    }
    const dependencyBlocked = task.dependsOn.some((id) => {
      const status = byId.get(id)?.status;
      return status === "failed" || status === "blocked" || status === "deferred";
    });
    const progress = {
      ...task,
      status: dependencyBlocked ? "blocked" : result?.status ?? "pending",
      ...dependencyBlocked ? {} : { evidence: result?.evidence, reason: result?.reason }
    };
    tasks.push(progress);
    byId.set(task.id, progress);
  }
  return {
    tasks,
    completed: tasks.filter((task) => task.status === "completed").length,
    total: tasks.length,
    ready: tasks.filter((task) => task.required).every((task) => task.status === "completed")
  };
}

// src/lint.ts
var backendPaths = ["node-sdk", "python-sdk", "go-sdk", "rest"];
var publicSecret = /\b(?:NEXT_PUBLIC|VITE|PUBLIC|REACT_APP|EXPO_PUBLIC|NUXT_PUBLIC)_NOZLE_\w*(?:SECRET|API_KEY)\w*/;
var serverSecret = /\bNOZLE_(?:SECRET_KEY|API_KEY)\b/;
var clientDirective = /^\s*["']use client["']/m;
var serverSdkImport = /^\s*import\s+(?!type\b)[^\n]*["']@nozle-js\/node["']|\brequire\(\s*["']@nozle-js\/node["']\s*\)/m;
var randomKey = /(?:idempotency|transaction)[_-]?(?:key|id)[^\n]*?(?:randomUUID|uuid4|uuidv4|uuid\.v4|uuid\.New|nanoid|Math\.random|Date\.now|time\.time|time\.Now)/i;
var randomAssign = /\b(\w+)\s*(?::\s*\w+\s*)?=\s*(?:await\s+)?(?:str\()?(?:crypto\.randomUUID|randomUUID|uuid\.uuid4|uuid4|uuidv4|uuid\.v4|uuid\.New(?:String)?|nanoid|Date\.now)\(/g;
var keyField = /(?:idempotency|transaction)[_-]?(?:key|id)|idempotencyKey|transactionId|TransactionID|IdempotencyKey|operation_key|cost_event_id/i;
var textConflict = /(?:\.message|\bstr\(\w+\)|\bString\(\w+\)|\.Error\(\))[^\n]*?(?:\.includes\(|\.match\(|\.indexOf\(|\.test\(|\bin\b|strings\.Contains)[^\n]*?(?:409|duplicate|already)/i;
var conflictTextFirst = /["'`](?:[^"'`\n]*?(?:409|duplicate|already)[^"'`\n]*?)["'`]\s+in\s+(?:str\(\w+\)|\w+\.message)/i;
var creditTrack = /\busage\.(?:track|Track)\(|\bTrackUsage\(/;
var featureTrack = /(?<!usage|costEvents|cost_events)\.(?:track|Track)\(/;
var llmWrapper = /\b(?:wrapOpenAI|wrapAnthropic|captureFetch|recordUsage|wrap_openai|wrap_anthropic|wrap_http_client|capture_http_client|capture_async_http_client|record_usage|WrapOpenAIHTTPClient|WrapAnthropicHTTPClient|WrapHTTPClient|RecordUsage)\(/;
var testFile = /(?:^|\/)(?:tests?|__tests__|spec)\/|[._-](?:test|spec)\.[a-z]+$|(?:^|\/)test_[^/]+\.py$/;
var usageCall = /\.(?:usage\.)?[Tt]rack\(|\bTrackUsage\(|\/api\/v1\/(?:events|usage\/track)\b/;
var mentionsNozle = /nozle/i;
var conflictStatus = /\b(?:status|status_code|statusCode|StatusCode)\b[^\n]{0,20}409|409[^\n]{0,20}\b(?:status|status_code|statusCode|StatusCode)\b|StatusConflict|HTTP_409|\b(?:hasCode|has_code|HasCode)\(\s*["']idempotency_key_reused["']/;
var builtSubscriptionId = /\b(?:subscriptionId|subscription_id|external_subscription_id|SubscriptionID)\b["']?\s*[:=]\s*(?:`[A-Za-z][^`$\n]*\$\{|f["'][A-Za-z][^"'{\n]*\{|["'][A-Za-z][^"'\n]*["']\s*\+)/;
var transactionOpen = /\.(?:\$)?transaction\(\s*(?:async\s*)?(?:\(?[\w,\s]*\)?)\s*=>\s*\{|\.(?:\$)?transaction\(\s*async\s+function\s*\([^)]*\)\s*\{/g;
function chargesInsideTransaction(text) {
  for (const match of text.matchAll(transactionOpen)) {
    let depth = 0;
    const start = (match.index ?? 0) + match[0].length - 1;
    for (let i = start;i < text.length; i += 1) {
      if (text[i] === "{")
        depth += 1;
      else if (text[i] === "}") {
        depth -= 1;
        if (depth === 0) {
          if (usageCall.test(text.slice(start, i)))
            return true;
          break;
        }
      }
    }
  }
  return false;
}
var clientAbortToProvider = /\bsignal\s*:\s*(?:request|req|event\.request|c\.req\.raw|ctx\.request)\.signal\b/;
var subscriptionCreate = /\bsubscriptions\.create\(|\bcreateSubscription\(|\bSubscriptions\.Create\(|["'`][^"'`\n]*\/subscriptions["'`]\s*,\s*\{[^\n]*method:\s*["']POST/;
var manifest = /(?:^|\/)(?:package(?:-lock)?\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|requirements[^/]*\.txt|pyproject\.toml|poetry\.lock|Pipfile(?:\.lock)?|go\.(?:mod|sum))$/;
var serverSdks = {
  "node-sdk": /["']@nozle-js\/node["']/,
  "python-sdk": /^\s*(?:from\s+nozle\b|import\s+nozle\b)/m,
  "go-sdk": /["']github\.com\/nozle-dev\/nozle-go[^"']*["']/
};
function lintSource(path, text, backendPath, { conflictHandled = false } = {}) {
  const advice = [];
  if (publicSecret.test(text)) {
    return { block: `${path} reads a Nozle secret key through a browser-exposed variable; keep secret keys on the server`, advice };
  }
  if (clientDirective.test(text) && serverSecret.test(text)) {
    return { block: `${path} is client code and reads a Nozle secret key; move the call to a server route`, advice };
  }
  if (clientDirective.test(text) && serverSdkImport.test(text)) {
    return { block: `${path} is client code and imports @nozle-js/node, which reads the secret key; call a server route instead (on Node, createBillingHandler serves the React billing hooks)`, advice };
  }
  if (backendPath && backendPaths.includes(backendPath) && !manifest.test(path)) {
    for (const [sdk, pattern] of Object.entries(serverSdks)) {
      if (sdk !== backendPath && pattern.test(text)) {
        return {
          block: `${path} uses the ${sdk} but the recorded stack is ${backendPath}; ask the user before changing the SDK path, then update stack in nozle.integration.yaml`,
          advice
        };
      }
    }
  }
  const randomNames = [...text.matchAll(randomAssign)].map((match) => match[1]);
  const keyFromRandom = randomNames.some((name) => text.split(`
`).some((line) => keyField.test(line) && new RegExp(`\\b${name}\\b`).test(line) && !randomAssign.test(line)));
  randomAssign.lastIndex = 0;
  const notes = [];
  if (randomKey.test(text) || keyFromRandom) {
    notes.push(`${path}: a usage key comes from a random id or the clock; that is fine only when it is made once when the unit is stored and reused on every retry; otherwise use the stored row, job or message id`);
  }
  if (textConflict.test(text) || conflictTextFirst.test(text)) {
    advice.push(`${path}: a duplicate (409) is detected from the error text; check the status code instead`);
  }
  if (featureTrack.test(text) && (creditTrack.test(text) || llmWrapper.test(text))) {
    advice.push(`${path}: calls track() next to ${creditTrack.test(text) ? "usage.track" : "an LLM wrapper or capture helper"}; both bill, so make sure they never record the same action`);
  }
  if (!conflictHandled && !testFile.test(path) && mentionsNozle.test(text) && usageCall.test(text) && !conflictStatus.test(text)) {
    advice.push(`${path}: sends usage but never checks for a 409 by status; log a 409 separately as a caller bug (the key was reused with a different body)`);
  }
  if (builtSubscriptionId.test(text)) {
    notes.push(`${path}: builds a subscription id from a template; that is fine only for a subscription this code creates with that id, so when a lookup finds an existing one, use the id it returned`);
  }
  if (clientAbortToProvider.test(text)) {
    advice.push(`${path}: passes the client's abort signal to the provider call, so a disconnect cancels the provider and the usage is never billed; keep reading to the final usage, then bill`);
  }
  if (!testFile.test(path) && chargesInsideTransaction(text)) {
    advice.push(`${path}: calls Nozle inside a database transaction; charge after the commit, keyed by the committed record, so a rollback can't leave a charge behind`);
  }
  return notes.length ? { advice, notes } : { advice };
}
function handlesConflict(text) {
  return conflictStatus.test(text);
}
function createsSubscription(text) {
  return subscriptionCreate.test(text);
}

// src/record.ts
var statuses = new Set(["complete", "missing", "incomplete", "unavailable", "unsupported"]);
var taskStatuses = new Set(["pending", "active", "completed", "failed", "blocked", "deferred"]);
var reviewChecks = [
  "usage-key",
  "conflict-409",
  "retries",
  "error-types",
  "charge-order",
  "stream-abort",
  "client-ids",
  "subscription-id",
  "paid-without-payment",
  "shadow-writes",
  "stuck-unit",
  "legacy-balance",
  "migration",
  "secret-key",
  "scope-changes",
  "ledger-once",
  "pending-owner",
  "charge-in-transaction",
  "key-provenance",
  "check-quantity",
  "off-mode",
  "renewal",
  "identity-lookup",
  "legacy-gates",
  "nullable-fields",
  "one-clock",
  "denial-retry",
  "claim-after-fulfil",
  "status-reader",
  "codes-exist",
  "lint-clean",
  "charge-parity",
  "shadow-seed",
  "dedupe-scope",
  "route-coverage",
  "seed-before-read",
  "next-period",
  "cost-event-id",
  "denial-after-work",
  "limit-source",
  "peer-contract",
  "fake-refusals",
  "step-isolation"
];
var testBackedChecks = ["dedupe-scope", "legacy-gates", "next-period", "denial-after-work", "fake-refusals", "step-isolation"];
var testPath = /(?:^|\/)(?:tests?|__tests__|spec)\/|[._-](?:test|spec)\.[a-z]+$|(?:^|\/)test_[^/]+\.py$|_test\.go$/;
var reviewResults = new Set(["pass", "fail", "not_applicable"]);
var setupStatuses = new Set(["manual_pending", "code_written", "code_verified", "awaiting_activation", "live_observed"]);
var forbiddenKey = /(^|_)(api_?key|secret|password|credential|access_?token|refresh_?token|auth_?token|api_?token|session_?token|id_?token|bearer_?token|client_?token|token|authorization|private_?key)(_|$)/i;
var credentialText = /\b(?:sk|pk)_(?:live|test|prod|dev|nozle)_?(?![A-Za-z_]{1,20}\b)[A-Za-z0-9]{3,}\b/i;
var bearerToken = /\b[Bb][Ee][Aa][Rr][Ee][Rr]\s+(?![A-Z0-9_]+\b)(?=[A-Za-z0-9._~+/-]*(?:\d|[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.))[A-Za-z0-9._~+/-]{12,}/;
function object2(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : undefined;
}
function nonempty(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function stringArray(value) {
  return Array.isArray(value) && value.every(nonempty);
}
function repositoryPath(value) {
  return !value.startsWith("/") && !value.startsWith("~") && !value.includes("\\") && !/^[A-Za-z]:/.test(value) && value.split("/").every((part) => part !== "" && part !== "." && part !== "..");
}
function findCredentialFields(value, prefix = "") {
  const fields = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => fields.push(...findCredentialFields(item, `${prefix}${index}.`)));
  } else if (object2(value)) {
    for (const [key, nested] of Object.entries(value)) {
      const normalizedKey = key.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
      if (forbiddenKey.test(normalizedKey))
        fields.push(`${prefix}${key}`);
      fields.push(...findCredentialFields(nested, `${prefix}${key}.`));
    }
  }
  return fields;
}
function hasCredentialText(value) {
  if (typeof value === "string")
    return credentialText.test(value) || bearerToken.test(value);
  if (Array.isArray(value))
    return value.some(hasCredentialText);
  if (object2(value))
    return Object.values(value).some(hasCredentialText);
  return false;
}
function yamlProblem(error) {
  const e = error;
  const where = e.linePos?.[0] ? ` at line ${e.linePos[0].line}, column ${e.linePos[0].col}` : "";
  const what = String(e.message ?? "parse failed").split(`
`)[0].replace(/\s+at line \d+, column \d+:?/, "");
  return `invalid YAML${where} (${what}); put double quotes around any text value that contains ": " or "#" or starts with a special character`;
}
function isHandoff(value) {
  const record = value;
  if (!record || typeof record !== "object")
    return true;
  return record.self_review !== undefined || Array.isArray(record.tasks) && record.tasks.every((task) => task?.status === "completed");
}
function validateIntegrationRecord(value, { requireReview = true } = {}) {
  const record = object2(value);
  if (!record)
    return ["integration record must be an object"];
  const errors = [];
  if (record.schema !== "nozle.integration" || record.version !== 1) {
    errors.push("integration record schema must be nozle.integration version 1");
  }
  if (!nonempty(record.organization_id))
    errors.push("organization_id is required");
  if (!Array.isArray(record.selected_goals) || record.selected_goals.length === 0 || record.selected_goals.some((goal) => !Number.isInteger(goal) || goal < 1 || goal > 10) || new Set(record.selected_goals).size !== record.selected_goals.length) {
    errors.push("selected_goals must contain only options 1 through 10");
  } else if (!record.approved_scope || requireReview) {
    const decisions = Array.isArray(record.decisions) ? record.decisions : [];
    const answered = decisions.some((raw) => {
      const item = object2(raw);
      return item?.id === "goals" && ["user", "user_confirmed_recommendation"].includes(String(item.basis));
    });
    if (!answered) {
      errors.push(`selected_goals need the user's answer: ask the user which goals they want, end your turn, and only after they reply record their words in a decisions entry with id "goals" (basis user, or user_confirmed_recommendation when they accepted your recommendation). Never write that entry yourself: goals from an earlier record, your recommendation, or an empty or timed-out question are not an answer`);
    }
  }
  if (record.stack !== undefined) {
    const stack = object2(record.stack);
    if (!stack || !backendPaths.includes(stack.backend_path) || !nonempty(stack.runtime)) {
      errors.push(`stack needs backend_path (${backendPaths.join(", ")}) and runtime`);
    }
  }
  if (record.peers === undefined && requireReview) {
    errors.push("peers must be a list (use [] when this repository is the whole product)");
  } else if (record.peers !== undefined) {
    const peers = record.peers;
    if (!Array.isArray(peers) || peers.some((raw) => {
      const peer = object2(raw);
      return !peer || !["backend", "frontend"].includes(String(peer.role)) || !nonempty(peer.location) || typeof peer.record_seen !== "boolean";
    }))
      errors.push("peers entries need role (backend or frontend), location and record_seen (true or false)");
  }
  if (record.interfaces !== undefined) {
    const interfaces = record.interfaces;
    if (!Array.isArray(interfaces) || interfaces.some((raw) => {
      const item = object2(raw);
      return !item || !nonempty(item.id) || !nonempty(item.route) || !nonempty(item.method) || item.provides === true === (item.consumes === true) || !["provided", "unmatched", "blocked"].includes(String(item.status));
    }))
      errors.push("interfaces entries need id, method, route, exactly one of provides or consumes, and status (provided, unmatched or blocked)");
  }
  if (record.blocked !== undefined) {
    const blocked = object2(record.blocked);
    if (!blocked || !nonempty(blocked.reason))
      errors.push("blocked needs a reason (what stops the build and what the user must provide)");
    if (!Array.isArray(record.decisions))
      errors.push("decisions must be a list (use [] when nothing needed asking)");
    return errors;
  }
  const configuration = object2(record.configuration);
  if (!configuration) {
    errors.push("configuration families are required");
  } else if (Object.keys(configuration).length === 0) {
    errors.push("configuration needs at least one family");
  } else {
    for (const [family, raw] of Object.entries(configuration)) {
      const item = object2(raw);
      if (!item || !statuses.has(String(item.status))) {
        errors.push(`configuration family ${family} has an invalid status`);
      } else if (item.status === "complete" && !nonempty(item.revision)) {
        errors.push(`configuration family ${family} needs a revision for complete`);
      } else if (item.status !== "complete" && !nonempty(item.reason)) {
        errors.push(`configuration family ${family} needs a reason for ${item.status}`);
      }
    }
  }
  const scope = object2(record.approved_scope);
  if (!scope) {
    errors.push("approved_scope is required for a handoff record");
  } else {
    if (!nonempty(scope.approved_at) || Number.isNaN(Date.parse(String(scope.approved_at)))) {
      errors.push("approved_scope needs an approval timestamp");
    }
    if (!stringArray(scope.included_paths) || scope.included_paths.length === 0) {
      errors.push("approved_scope needs included paths");
    } else if (scope.included_paths.some((path) => !repositoryPath(path))) {
      errors.push("approved_scope contains a path outside the repository");
    }
    if (!stringArray(scope.excluded_operations))
      errors.push("approved_scope needs explicit exclusions");
    if (scope.excluded_paths !== undefined) {
      if (!stringArray(scope.excluded_paths) || scope.excluded_paths.some((path) => !repositoryPath(path.replace(/\/+$/, "")))) {
        errors.push("approved_scope excluded_paths must be repository-relative paths");
      } else if (stringArray(scope.included_paths)) {
        const clash = scope.included_paths.find((inc) => scope.excluded_paths.some((exc) => {
          const base = exc.replace(/\/+$/, "");
          return inc === base || inc.startsWith(`${base}/`);
        }));
        if (clash)
          errors.push(`approved_scope includes ${clash}, which excluded_paths leaves untouched`);
      }
    }
    if (!stringArray(scope.billing_rules))
      errors.push("approved_scope needs billing rules");
  }
  const decisionBasis = ["user", "user_confirmed_recommendation", "matched_in_account"];
  if (record.decisions !== undefined || requireReview) {
    if (!Array.isArray(record.decisions)) {
      errors.push("decisions must be a list (use [] when nothing needed asking)");
    } else {
      const seen = new Set;
      for (const raw of record.decisions) {
        const item = object2(raw);
        if (!item || !nonempty(item.id) || !nonempty(item.question) || !nonempty(item.answer) || !decisionBasis.includes(String(item.basis))) {
          errors.push(`decisions entries need id, question, answer and basis (${decisionBasis.join(", ")})`);
        } else if (item.activities !== undefined && !stringArray(item.activities)) {
          errors.push(`decisions ${item.id}: activities must list the study activity ids the answer covers`);
        } else if (seen.has(String(item.id))) {
          errors.push(`decisions has a duplicate id ${item.id}`);
        } else {
          seen.add(String(item.id));
        }
      }
    }
  }
  if (!Array.isArray(record.source_files)) {
    errors.push("source_files must be a list");
  } else {
    for (const raw of record.source_files) {
      const file = object2(raw);
      if (!file || !nonempty(file.path) || !(/^[0-9a-f]{64}$/i.test(String(file.sha256)) || file.sha256 === "absent")) {
        errors.push("source_files entries need path and SHA-256");
      } else if (!repositoryPath(String(file.path))) {
        errors.push("source_files contains a path outside the repository");
      }
    }
    const trackedPaths = new Set(record.source_files.map((raw) => object2(raw)?.path));
    if (!scope || !stringArray(scope.included_paths) || scope.included_paths.some((path) => !trackedPaths.has(path))) {
      errors.push("source_files must cover included paths");
    }
  }
  if (!Array.isArray(record.tasks)) {
    errors.push("tasks must be a list");
  } else if (record.tasks.length === 0) {
    errors.push("tasks need at least one planned step");
  } else {
    for (const raw of record.tasks) {
      const task = object2(raw);
      if (!task || !nonempty(task.id) || !taskStatuses.has(String(task.status))) {
        errors.push("task needs an ID and valid status");
        continue;
      }
      if (task.status === "completed") {
        if (!scope)
          errors.push("completed tasks require an approved scope");
        if (!nonempty(task.evidence))
          errors.push(`task ${task.id} is completed without evidence`);
      }
      if ((task.status === "failed" || task.status === "deferred") && !nonempty(task.reason)) {
        errors.push(`task ${task.id} needs a reason`);
      }
      if (task.phase !== undefined && !(Number.isInteger(task.phase) && task.phase >= 1)) {
        errors.push(`task ${task.id} phase must be a whole number from 1`);
      }
    }
    const phased = record.tasks.map(object2).filter((task) => Number.isInteger(task?.phase));
    for (const task of phased) {
      if (task.status !== "active" && task.status !== "completed")
        continue;
      const open = phased.find((earlier) => earlier.phase < task.phase && earlier.status !== "completed" && earlier.status !== "deferred");
      if (open)
        errors.push(`task ${task.id} (phase ${task.phase}) is ${task.status} before phase ${open.phase} task ${open.id} is completed`);
    }
  }
  if (Array.isArray(record.tasks)) {
    const byId = new Map(record.tasks.map((raw) => [String(object2(raw)?.id), object2(raw)]));
    for (const task of byId.values()) {
      if (!task || !Array.isArray(task.depends_on))
        continue;
      for (const dependency of task.depends_on) {
        const prerequisite = byId.get(String(dependency));
        if (!prerequisite) {
          errors.push(`task ${task.id} depends on unknown task ${dependency}`);
        } else if ((task.status === "completed" || task.status === "active") && prerequisite.status !== "completed") {
          errors.push(`task ${task.id} is ${task.status} before dependency ${dependency}`);
        }
      }
    }
  }
  if (scope && requireReview) {
    const review = object2(record.self_review);
    if (!review) {
      errors.push(`self_review is required for a handoff record: ${reviewChecks.join(", ")}`);
    } else {
      const tests = Array.isArray(record.source_files) ? record.source_files.map((raw) => String(object2(raw)?.path ?? "")).filter((path) => testPath.test(path)) : [];
      for (const check of reviewChecks) {
        const item = object2(review[check]);
        if (!item || !reviewResults.has(String(item.result)) || !nonempty(item.evidence)) {
          errors.push(`self_review ${check} needs result (pass, fail or not_applicable) and evidence`);
        } else if (item.result === "pass" && testBackedChecks.includes(check) && !tests.some((path) => String(item.evidence).includes(path))) {
          errors.push(`self_review ${check} is pass only with a test that drives that case, named in its evidence and listed in source_files`);
        }
      }
    }
  }
  for (const field of findCredentialFields(record))
    errors.push(`record contains forbidden credential field ${field}`);
  if (hasCredentialText(record))
    errors.push("record contains credential-like text");
  return errors;
}
function validateSetupPlan(value) {
  const plan = object2(value);
  if (!plan)
    return ["setup plan must be an object"];
  const errors = [];
  if (plan.schema !== "nozle.setup-plan" || plan.version !== 1) {
    errors.push("setup plan schema must be nozle.setup-plan version 1");
  }
  if (!Array.isArray(plan.items))
    return [...errors, "setup plan items must be a list"];
  for (const raw of plan.items) {
    const item = object2(raw);
    if (!item || !nonempty(item.id) || !setupStatuses.has(String(item.status))) {
      errors.push("setup item needs an ID and valid status");
      continue;
    }
    if (item.status === "manual_pending" && !nonempty(item.instructions)) {
      errors.push(`setup item ${item.id} needs manual instructions`);
    }
    if ((item.status === "code_verified" || item.status === "live_observed") && !nonempty(item.evidence)) {
      errors.push(`setup item ${item.id} is verified without evidence`);
    }
  }
  for (const field of findCredentialFields(plan))
    errors.push(`setup plan contains forbidden credential field ${field}`);
  if (hasCredentialText(plan))
    errors.push("setup plan contains credential-like text");
  return errors;
}
function assessResume(value, currentFiles, currentConfiguration) {
  const validation = validateIntegrationRecord(value, { requireReview: false });
  if (validation.length)
    return { requires_review: true, drift: validation };
  const record = value;
  const drift = [];
  for (const raw of record.source_files) {
    const path = String(raw.path);
    if (!Object.prototype.hasOwnProperty.call(currentFiles, path)) {
      drift.push(`source file not rechecked: ${path}`);
    } else if (currentFiles[path] !== raw.sha256) {
      drift.push(`source file changed: ${path}`);
    }
  }
  for (const [family, raw] of Object.entries(record.configuration)) {
    const item = raw;
    const current = currentConfiguration[family];
    if (!current || current.status !== item.status || (current.revision ?? null) !== (item.revision ?? null)) {
      drift.push(`configuration changed: ${family}`);
    }
  }
  return { requires_review: drift.length > 0, drift };
}

// src/hook.ts
var hookEvents = ["session-start", "pre-edit", "pre-command", "pre-mcp", "post-edit", "stop", "permission"];
var recordName = "nozle.integration.yaml";
var setupName = "nozle-setup-plan.yaml";
var artifacts = new Set([recordName, setupName, "nozle-integration-report.md", "nozle-tasks.yaml", "nozle-study.yaml"]);
var readOnlyTools = new Set([
  "get_account_context",
  "get_integration_configuration",
  "list_integration_resources",
  "get_integration_resource",
  "get_capability_catalog"
]);
var productionHost = /api\.nozle\.app/i;
var userRunScript = /nozle-first-event|nozle-live-check/;
var legacyMcpPackage = /@nozle-js\/mcp/;
var networkClient = /(^|[;&|(\s])(curl|wget|http|xh|nc|ncat|telnet)(\s|$)/;
var maxScanBytes = 1e6;
var envFile = /^\.env(\..+)?$/;
var envTemplates = new Set([".env.example", ".env.sample", ".env.template"]);
var checkSubcommands = new Set(["env", "plan", "progress", "hash", "resume", "check", "key"]);
function isReadOnlyCheckCommand(command) {
  if (!/^[A-Za-z0-9_.\/@:=+,~ -]+$/.test(command))
    return false;
  let words = command.trim().split(/ +/);
  if (words[0] === "node") {
    if (!/(^|\/)nozle-check\.mjs$/.test(words[1] ?? ""))
      return false;
    words = words.slice(2);
  } else if (words[0] === "nozle-check") {
    words = words.slice(1);
  } else {
    return false;
  }
  const [subcommand = ""] = words;
  return checkSubcommands.has(subcommand) || /\.ya?ml$/.test(subcommand);
}
function allow(context) {
  return context ? { decision: "allow", context } : { decision: "allow" };
}
function deny(reason) {
  return { decision: "deny", reason };
}
function realpathLoose(path) {
  try {
    return realpathSync(path);
  } catch {
    const parent = dirname(path);
    return parent === path ? path : join2(realpathLoose(parent), basename(path));
  }
}
function repositoryRelative(root, path) {
  const rel = relative(realpathLoose(root), realpathLoose(resolve(root, path)));
  return rel === "" || rel.startsWith("..") || isAbsolute(rel) ? undefined : rel;
}
function sha256(path) {
  return existsSync2(path) ? createHash("sha256").update(readFileSync2(path)).digest("hex") : "absent";
}
function findIntegrationRoot(start) {
  let dir = resolve(start);
  for (let depth = 0;depth < 25; depth += 1) {
    if (existsSync2(join2(dir, recordName)) || existsSync2(join2(dir, setupName)))
      return dir;
    const parent = dirname(dir);
    if (parent === dir)
      return;
    dir = parent;
  }
  return;
}
function loadRecord(root) {
  const file = join2(root, recordName);
  if (!existsSync2(file))
    return {};
  try {
    const value = exports_dist.parse(readFileSync2(file, "utf8"), { uniqueKeys: true });
    return value !== null && typeof value === "object" && !Array.isArray(value) ? { record: value } : { error: `${recordName} must be an object` };
  } catch (error) {
    return { error: `${recordName}: ${yamlProblem(error)}` };
  }
}
function progressOf(record) {
  if (!Array.isArray(record.tasks))
    return;
  const tasks = record.tasks;
  const results = {};
  for (const task of tasks) {
    results[String(task.id)] = {
      status: task.status,
      evidence: task.evidence,
      reason: task.reason
    };
  }
  return progressFor({
    selectedGoals: [],
    tasks: tasks.map((task) => ({
      id: String(task.id),
      label: String(task.label ?? task.id),
      goals: [],
      dependsOn: Array.isArray(task.depends_on) ? task.depends_on.map(String) : [],
      required: task.required !== false
    }))
  }, results);
}
function sessionContext(root) {
  const { record, error } = loadRecord(root);
  if (error)
    return allow(`Nozle integration record problem: ${error}. Fix it before continuing.`);
  if (!record)
    return allow();
  let summary = `Nozle integration in progress. Record: ${recordName}.`;
  try {
    const progress = progressOf(record);
    if (progress) {
      const next = progress.tasks.find((task) => task.status === "active") ?? progress.tasks.find((task) => task.status === "pending" && task.dependsOn.every((id) => progress.tasks.find((other) => other.id === id)?.status === "completed"));
      if (progress.total > 0)
        summary += ` ${progress.completed}/${progress.total} steps completed.`;
      if (next)
        summary += ` Next step: ${next.id}.`;
    }
  } catch (error) {
    summary += ` Record tasks are inconsistent: ${error.message}.`;
  }
  return allow(`${summary}${bindingFacts(root, record)} Run nozle-check progress to see the checklist; re-read changed files and account configuration before reusing earlier findings.`);
}
var clip = (value, max) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};
function bindingFacts(root, record) {
  const facts = [];
  if (Array.isArray(record.selected_goals))
    facts.push(`goals ${record.selected_goals.join(", ")}`);
  const stack = record.stack;
  if (stack?.backend_path)
    facts.push(`stack ${String(stack.backend_path)} on ${clip(stack.runtime, 40)} (change it only with the user's yes)`);
  const scope = record.approved_scope;
  facts.push(scope ? "scope approved: edit only its included_paths" : "scope not approved yet: no application edits");
  const excluded = Array.isArray(scope?.excluded_paths) ? scope.excluded_paths.map(String) : [];
  if (excluded.length)
    facts.push(`do not track, never edit: ${excluded.slice(0, 10).join(", ")}${excluded.length > 10 ? ` and ${excluded.length - 10} more` : ""}`);
  const decisions = Array.isArray(record.decisions) ? record.decisions : [];
  if (decisions.length) {
    const shown = decisions.slice(0, 12).map((item) => `${clip(item?.id, 40)}: ${clip(item?.answer, 100)}`);
    facts.push(`decisions already answered (binding, do not ask again): ${shown.join("; ")}${decisions.length > 12 ? `; and ${decisions.length - 12} more in the record` : ""}`);
  }
  const open = unansweredActivities(root, record);
  if (open.length)
    facts.push(`activities still waiting for the user's answer: ${open.slice(0, 10).join(", ")}`);
  return facts.length ? ` Settled in the record: ${facts.join(". ")}.` : "";
}
var editTargets = (input) => [...input.path ? [input.path] : [], ...input.paths ?? []];
var underPath = (rel, entry) => {
  const base = entry.replace(/\/+$/, "");
  return rel === base || rel.startsWith(`${base}/`);
};
function unansweredActivities(root, record) {
  const file = join2(root, "nozle-study.yaml");
  if (!record || !existsSync2(file))
    return [];
  let study;
  try {
    study = exports_dist.parse(readFileSync2(file, "utf8"));
  } catch {
    return [];
  }
  const activities = Array.isArray(study?.activities) ? study.activities : [];
  const decisions = Array.isArray(record.decisions) ? record.decisions : [];
  const answered = new Set(decisions.flatMap((item) => Array.isArray(item?.activities) ? item.activities.map(String) : []));
  return activities.map((activity) => String(activity?.id ?? "")).filter((id) => id && !answered.has(id));
}
function checkTarget(root, cwd, record, target) {
  const rel = repositoryRelative(root, resolve(cwd ?? root, target));
  if (!rel)
    return deny(`${target} is outside the repository`);
  if (artifacts.has(rel))
    return allow();
  if (envFile.test(basename(rel)) && !envTemplates.has(basename(rel))) {
    return deny(`${rel} is a real env file and holds the user's keys; leave it alone and list variable names in .env.example`);
  }
  const scope = record?.approved_scope;
  if (!scope) {
    return deny(`${rel}: the user has not approved an integration scope yet; get approval and save it in ${recordName} before editing application code`);
  }
  const open = unansweredActivities(root, record);
  if (open.length) {
    return deny(`${rel}: the user has not answered what to measure for ${open.join(", ")} (from nozle-study.yaml). Ask with the question tool, grouped by area, offering track as billable usage, track cost only, do not track and decide later with your recommendation first; save each answer in decisions with activities: [ids]`);
  }
  const excluded = scope.excluded_paths;
  if (Array.isArray(excluded) && excluded.some((path) => underPath(rel, String(path)))) {
    return deny(`${rel} belongs to an activity the user answered "do not track"; leave it unchanged, or ask the user again and update excluded_paths in ${recordName}`);
  }
  const included = scope.included_paths;
  if (Array.isArray(included) && included.includes(rel))
    return allow();
  return deny(`${rel} is outside the approved Nozle integration scope; revisit scope approval before editing it`);
}
function peerRoots(root, record) {
  const peers = Array.isArray(record?.peers) ? record.peers : [];
  return peers.map((peer) => String(peer?.location ?? "")).filter((location) => location && location !== "unavailable" && !/^[a-z][a-z0-9+.-]*:/i.test(location)).map((location) => resolve(root, location));
}
function judgeTarget(root, cwd, record, target) {
  const abs = resolve(cwd ?? root, target);
  if (repositoryRelative(root, abs) === undefined) {
    const peer = peerRoots(root, record).find((dir) => repositoryRelative(dir, abs) !== undefined);
    if (peer) {
      const { record: peerRecord, error } = loadRecord(peer);
      if (error)
        return deny(`peer ${error}`);
      return checkTarget(peer, undefined, peerRecord, abs);
    }
  }
  return checkTarget(root, cwd, record, target);
}
function preEdit(root, input) {
  const targets = editTargets(input);
  if (targets.length === 0)
    return deny("edit target path is missing");
  const { record, error } = loadRecord(root);
  if (error && !targets.every((target) => isRecordFile(root, input.cwd, target)))
    return deny(`${error}; fix the record first (edits to it are allowed)`);
  for (const target of targets) {
    const verdict = judgeTarget(root, input.cwd, record, target);
    if (verdict.decision === "deny")
      return verdict;
  }
  return allow();
}
var isRecordFile = (root, cwd, target) => artifacts.has(repositoryRelative(root, resolve(cwd ?? root, target)) ?? "");
function readSmall(file) {
  return existsSync2(file) && statSync(file).isFile() && statSync(file).size <= maxScanBytes ? readFileSync2(file, "utf8") : undefined;
}
var backendPathOf = (record) => String(record?.stack?.backend_path ?? "") || undefined;
function postEdit(root, input) {
  const { record } = loadRecord(root);
  const advice = [];
  for (const target of editTargets(input)) {
    const text = readSmall(resolve(input.cwd ?? root, target));
    if (text === undefined)
      continue;
    if (hasCredentialText(text)) {
      return deny(`${target} contains credential-like text; reference an environment variable instead`);
    }
    const rel = repositoryRelative(root, resolve(input.cwd ?? root, target));
    if (!rel || artifacts.has(rel))
      continue;
    const lint = lintSource(rel, text, backendPathOf(record));
    if (lint.block)
      return deny(lint.block);
    advice.push(...lint.advice, ...lint.notes ?? []);
  }
  return allow(advice.length ? `Nozle build check: ${advice.join("; ")}.` : undefined);
}
function shellWriteTargets(command) {
  const body = command.replace(/<<-?\s*(['"]?)(\w+)\1([^\n]*)\n[\s\S]*?\n\s*\2\s*(?=\n|$)/g, "<<heredoc$3");
  const targets = [];
  for (const segment of body.split(/\n|&&|\|\||[;|]/)) {
    const words = segment.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
    const unquote = (word) => word.replace(/^(["'])(.*)\1$/, "$2");
    for (let i = 0;i < words.length; i += 1) {
      const redirect = /^\d*(?:>>?|&>>?)(.*)$/.exec(words[i]);
      if (redirect) {
        const target = redirect[1] || words[i + 1];
        if (target && !target.startsWith("&"))
          targets.push(unquote(target));
      }
    }
    const [head, ...args] = words.map(unquote);
    const files = args.filter((word) => !word.startsWith("-") && !/^\d*>/.test(word));
    if (head === "tee")
      targets.push(...files);
    if ((head === "sed" || head === "perl") && args.some((word) => /^-[a-zA-Z]*i/.test(word) || word === "--in-place")) {
      const last = files[files.length - 1];
      if (files.length > 1 && last)
        targets.push(last);
    }
  }
  return targets;
}
function preCommandWrites(root, input) {
  const { record, error } = loadRecord(root);
  const guarded = [root, ...peerRoots(root, record)];
  const targets = shellWriteTargets(input.command ?? "").filter((target) => guarded.some((dir) => repositoryRelative(dir, resolve(input.cwd ?? root, target)) !== undefined));
  if (targets.length === 0)
    return allow();
  if (error && !targets.every((target) => isRecordFile(root, input.cwd, target)))
    return deny(`${error}; fix the record first (edits to it are allowed)`);
  for (const target of targets) {
    const verdict = judgeTarget(root, input.cwd, record, target);
    if (verdict.decision === "deny")
      return deny(`shell write: ${verdict.reason}`);
  }
  return allow();
}
function peerFindings(root, record) {
  if (record.peers === undefined) {
    if (record.approved_scope)
      return [];
    return [`${recordName} has no peers entry. If the user named another repository of this product (a backend or frontend), record it in peers with its location; otherwise write peers: [].`];
  }
  return peerRoots(root, record).filter((dir) => existsSync2(join2(dir, recordName))).filter((dir) => record.peers.some((peer) => resolve(root, String(peer?.location)) === dir && peer?.record_seen !== true)).map((dir) => `The peer at ${dir} has a ${recordName}: read it, reuse its decisions and interfaces, and set record_seen: true.`);
}
function stop(root, input) {
  if (input.stop_hook_active)
    return allow();
  const { record } = loadRecord(root);
  if (!record)
    return allow();
  if (!Array.isArray(record.source_files)) {
    const draft = validateIntegrationRecord(record, { requireReview: false }).filter((error) => /^(selected_goals|stack|peers|interfaces)/.test(error));
    const findings = [...peerFindings(root, record), ...draft.map((error) => `${recordName}: ${error}.`)];
    return findings.length ? deny(findings.join(" ")) : allow();
  }
  const stoppedOnPurpose = Array.isArray(record.tasks) && record.tasks.some((task) => ["failed", "blocked", "deferred"].includes(String(task.status)));
  if (stoppedOnPurpose)
    return allow();
  const findings = peerFindings(root, record);
  const drifted = record.source_files.filter((file) => sha256(join2(root, String(file.path))) !== file.sha256).map((file) => String(file.path));
  if (drifted.length) {
    findings.push(`Scoped files changed since the record was last updated: ${drifted.join(", ")}. Run the step's tests, then update task evidence and source_files hashes in ${recordName}.`);
  }
  const written = Boolean(record.approved_scope) && record.source_files.every((file) => existsSync2(join2(root, String(file.path))));
  const handoff = isHandoff(record) || written;
  if (record.approved_scope) {
    const recordErrors = validateIntegrationRecord(record, { requireReview: handoff });
    if (recordErrors.length)
      findings.push(`${recordName} does not validate: ${recordErrors.join("; ")}.`);
    const setup = join2(root, setupName);
    if (existsSync2(setup)) {
      try {
        const setupErrors = validateSetupPlan(exports_dist.parse(readFileSync2(setup, "utf8")));
        if (setupErrors.length)
          findings.push(`${setupName} does not validate: ${setupErrors.join("; ")}.`);
      } catch (error) {
        findings.push(`${setupName}: ${yamlProblem(error)}.`);
      }
    }
  }
  const review = record.self_review;
  const failed = review && typeof review === "object" ? Object.entries(review).filter(([, item]) => item?.result === "fail").map(([check]) => check) : [];
  if (failed.length) {
    findings.push(`self_review marks ${failed.join(", ")} as fail; fix each one, or ask the user before handing off with it.`);
  }
  const creators = [];
  const scoped = (handoff ? record.source_files : []).map((file) => String(file.path)).filter((path) => !artifacts.has(path)).map((path) => ({ path, text: readSmall(join2(root, path)) })).filter((file) => file.text !== undefined);
  const conflictHandled = scoped.some((file) => handlesConflict(file.text));
  for (const { path, text } of scoped) {
    const lint = lintSource(path, text, backendPathOf(record), { conflictHandled });
    if (lint.block)
      findings.push(`${lint.block}.`);
    findings.push(...lint.advice.map((line) => `${line}.`));
    if (createsSubscription(text))
      creators.push(path);
  }
  if (creators.length > 1) {
    findings.push(`More than one file creates subscriptions (${creators.join(", ")}); keep one code path that looks up the active subscription before creating one.`);
  }
  return findings.length ? deny(`${findings.join(" ")} Fix each one in the code when this session's task includes editing; when it does not (status, audit, verify without approval), list them for the user as open findings instead. Write an exception in nozle-integration-report.md only when the fix is impossible (for example no stored or request id identifies the unit), and never argue with this check in your reply. ${handoff ? "Then end with your normal hand-off summary for the user: what was built, what changed from the approved scope, what is unverified, and the dashboard steps." : "Then finish this step's reply as usual (the choices, the scope for approval, or the build progress) with these items as one short list; the build is not finished, so do not write a hand-off summary."}`) : allow();
}
function nestedIntegrationRoots(start, depth = 3) {
  const found = [];
  if (!insideGitRepository(resolve(start)))
    return found;
  const skip = new Set(["node_modules", ".git", ".venv", "venv", "dist", "build", ".next", "vendor", "target"]);
  const walk = (dir, level) => {
    if (level > depth)
      return;
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    if (level > 0 && entries.includes(".git"))
      return;
    if (level > 0 && (entries.includes(recordName) || entries.includes(setupName))) {
      found.push(dir);
      return;
    }
    for (const entry of entries) {
      if (skip.has(entry) || entry.startsWith("."))
        continue;
      const path = join2(dir, entry);
      try {
        if (statSync(path).isDirectory())
          walk(path, level + 1);
      } catch {}
    }
  };
  walk(resolve(start), 0);
  return found;
}
function insideGitRepository(dir) {
  for (let current = dir;; current = dirname(current)) {
    if (existsSync2(join2(current, ".git")))
      return true;
    if (dirname(current) === current)
      return false;
  }
}
var rootFor = (cwd, target, fallback) => findIntegrationRoot(dirname(resolve(cwd ?? ".", target))) ?? fallback;
function combine(results) {
  const denied = results.filter((result) => result.decision === "deny");
  if (denied.length)
    return deny(denied.map((result) => result.reason).join(" "));
  const context = results.map((result) => result.context).filter(Boolean).join(" ");
  return allow(context || undefined);
}
function runHook(event, input) {
  if (!hookEvents.includes(event))
    throw new Error(`unknown hook event ${event}`);
  if (event === "permission")
    return isReadOnlyCheckCommand(input.command ?? "") ? allow() : { decision: "allow", abstain: true };
  const cwdRoot = findIntegrationRoot(input.cwd ?? ".");
  if (event === "pre-edit" || event === "post-edit") {
    const targets = editTargets(input);
    if (targets.length === 0)
      return cwdRoot ? preEdit(cwdRoot, input) : allow();
    return combine(targets.map((target) => {
      const root = rootFor(input.cwd, target, cwdRoot);
      if (!root)
        return allow();
      const single = { ...input, path: target, paths: undefined };
      return event === "pre-edit" ? preEdit(root, single) : postEdit(root, single);
    }));
  }
  if (event === "pre-command" && !cwdRoot) {
    const roots = [...new Set(shellWriteTargets(input.command ?? "").map((target) => rootFor(input.cwd, target, undefined)).filter((root) => !!root))];
    return combine(roots.map((root) => runRooted(event, root, input)));
  }
  if (!cwdRoot) {
    if (event === "session-start" || event === "stop") {
      return combine(nestedIntegrationRoots(input.cwd ?? ".").map((root) => runRooted(event, root, input)));
    }
    return allow();
  }
  return runRooted(event, cwdRoot, input);
}
function runRooted(event, root, input) {
  switch (event) {
    case "session-start":
      return sessionContext(root);
    case "pre-edit":
      return preEdit(root, input);
    case "post-edit":
      return postEdit(root, input);
    case "pre-command": {
      const command = input.command ?? "";
      if (hasCredentialText(command))
        return deny("command contains credential-like text; use an environment variable");
      if (legacyMcpPackage.test(command)) {
        return deny("@nozle-js/mcp is an outdated, undocumented package and is never used here; use the documentation MCP and the account connection the plugin registers");
      }
      if (userRunScript.test(command)) {
        return deny("billable test events are sent by the user, not the agent; list the script in the user's manual steps instead");
      }
      if (productionHost.test(command) && networkClient.test(command)) {
        return deny("command sends a request to the production Nozle API; the plugin never sends live traffic");
      }
      return preCommandWrites(root, input);
    }
    case "pre-mcp":
      return input.tool && readOnlyTools.has(input.tool) ? allow() : deny(`Nozle account tool ${input.tool ?? "(unnamed)"} is not on the read-only allowlist`);
    case "stop":
      return stop(root, input);
    default:
      return allow();
  }
}

// src/study.ts
var activityStatus = ["matched", "suggested", "partial", "unknown"];
var accountStatus = ["not_read", "read"];
var nonempty2 = (value) => typeof value === "string" && value.trim().length > 0;
function validateStudy(value) {
  const errors = [];
  const study = value && typeof value === "object" ? value : undefined;
  if (!study)
    return ["study must be an object"];
  if (study.schema !== "nozle.study" || study.version !== 1)
    errors.push("study schema must be nozle.study version 1");
  const account = study.account_read;
  if (!account || !accountStatus.includes(String(account.status))) {
    errors.push(`account_read.status must be one of ${accountStatus.join(", ")}`);
  } else if (account.status === "read" && (!nonempty2(account.read_at) || Number.isNaN(Date.parse(String(account.read_at))))) {
    errors.push("account_read needs read_at when status is read");
  }
  if (!Array.isArray(study.activities)) {
    errors.push("activities must be a list");
  } else {
    for (const raw of study.activities) {
      const item = raw;
      if (!item || !nonempty2(item.id) || !nonempty2(item.label) || !nonempty2(item.location) || !activityStatus.includes(String(item.status))) {
        errors.push(`activities entries need id, label, location and status (${activityStatus.join(", ")})`);
        break;
      }
    }
  }
  if (study.findings !== undefined && !Array.isArray(study.findings))
    errors.push("findings must be a list");
  if (!Array.isArray(study.source_files)) {
    errors.push("source_files must be a list of the files the study relied on");
  } else {
    for (const raw of study.source_files) {
      const file = raw;
      if (!file || !nonempty2(file.path) || !(/^[0-9a-f]{64}$/i.test(String(file.sha256)) || file.sha256 === "absent")) {
        errors.push("source_files entries need path and SHA-256");
        break;
      }
      if (!repositoryPath(String(file.path))) {
        errors.push("source_files contains a path outside the repository");
        break;
      }
    }
  }
  return errors;
}
function studyDrift(study, currentHashes) {
  const drift = [];
  for (const raw of Array.isArray(study.source_files) ? study.source_files : []) {
    const file = raw;
    const now = currentHashes[String(file.path)];
    if (now === undefined)
      drift.push(`${file.path}: not checked`);
    else if (now !== file.sha256)
      drift.push(`${file.path}: ${file.sha256 === "absent" ? "now exists" : now === "absent" ? "was removed" : "changed"}`);
  }
  return drift;
}

// src/check.ts
function checkDocument(source, filename) {
  const name = basename2(filename);
  if (name !== "nozle.integration.yaml" && name !== "nozle-setup-plan.yaml" && name !== "nozle-study.yaml") {
    return [`unsupported artifact ${name}`];
  }
  let value;
  try {
    value = exports_dist.parse(source, { uniqueKeys: true });
  } catch (error) {
    return [yamlProblem(error)];
  }
  if (name === "nozle-study.yaml")
    return validateStudy(value);
  return name === "nozle.integration.yaml" ? validateIntegrationRecord(value, { requireReview: isHandoff(value) }) : validateSetupPlan(value);
}
var MANIFESTS = new Set(["package.json", "requirements.txt", "pyproject.toml", "go.mod", "Gemfile", "composer.json", "pom.xml", "build.gradle", "wrangler.toml", "wrangler.jsonc", "vercel.json", "tsconfig.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lock", "bun.lockb"]);
var CONFIGS = /^(svelte|astro|vite|next|nuxt)\.config\./;
var PY_ENTRIES = new Set(["main.py", "app.py", "server.py", "asgi.py", "wsgi.py", "manage.py"]);
var SOURCE_EXT = /\.(?:[cm]?[jt]sx?|py|go|rb|php|java|kt|svelte|vue|astro)$/;
var SKIP = new Set(["node_modules", ".git", ".venv", "venv", "dist", "build", ".next", ".svelte-kit", ".astro", "target"]);
function collectManifests(root) {
  const files = {};
  const walk = (current, depth, rel) => {
    for (const entry of readdirSync2(current, { withFileTypes: true })) {
      const path = join3(current, entry.name);
      const relative = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (depth < 2 && !SKIP.has(entry.name) && !entry.name.startsWith("."))
          walk(path, depth + 1, relative);
      } else if (MANIFESTS.has(entry.name) || CONFIGS.test(entry.name) || PY_ENTRIES.has(entry.name)) {
        files[relative] = statSync2(path).size <= 5000000 ? readFileSync3(path, "utf8") : "";
      }
    }
  };
  walk(root, 0, "");
  return files;
}
function collectSources(root) {
  const files = {};
  const walk = (current, depth, rel) => {
    for (const entry of readdirSync2(current, { withFileTypes: true })) {
      const path = join3(current, entry.name);
      const relative = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (depth < 6 && !SKIP.has(entry.name) && !entry.name.startsWith("."))
          walk(path, depth + 1, relative);
      } else if (SOURCE_EXT.test(entry.name) && statSync2(path).size <= 400000) {
        files[relative] = readFileSync3(path, "utf8");
      }
    }
  };
  walk(root, 0, "");
  return files;
}
var marks = { completed: "[x]", active: "[>]", pending: "[ ]", blocked: "[!]", failed: "[!]", deferred: "[-]" };
function planDocument(source) {
  const input = exports_dist.parse(source);
  const tasks = (input?.tasks ?? []).map((task) => ({
    id: task.id,
    label: task.label,
    goals: task.goals,
    dependsOn: task.depends_on,
    required: task.required
  }));
  const plan = preparePlan({ selectedGoals: input?.selected_goals ?? [], tasks: mergeTasks(tasks) });
  return exports_dist.stringify({
    selected_goals: plan.selectedGoals,
    tasks: plan.tasks.map((task) => ({
      id: task.id,
      label: task.label,
      goals: task.goals,
      depends_on: task.dependsOn,
      required: task.required,
      status: "pending"
    }))
  });
}
function progressDocument(source) {
  const record = exports_dist.parse(source);
  const rows = record?.tasks ?? [];
  const results = Object.fromEntries(rows.map((task) => [
    task.id,
    { status: task.status, evidence: task.evidence, reason: task.reason }
  ]));
  const plan = {
    selectedGoals: record?.selected_goals ?? [],
    tasks: rows.map((task) => ({
      id: task.id,
      label: task.label ?? task.id,
      goals: task.goals ?? [],
      dependsOn: task.depends_on ?? [],
      required: task.required !== false
    }))
  };
  const progress = progressFor(plan, results);
  const doneIds = new Set(progress.tasks.filter((task) => task.status === "completed").map((task) => task.id));
  const next = progress.tasks.find((task) => task.status === "active") ?? progress.tasks.find((task) => task.status === "pending" && task.dependsOn.every((id) => doneIds.has(id)));
  const lines = progress.tasks.map((task) => {
    const note = task.status === "blocked" ? ` (blocked by ${task.dependsOn.filter((id) => !doneIds.has(id)).join(", ")})` : task.reason ? ` (${task.reason})` : "";
    return `${marks[task.status]} ${task.id}: ${task.label}${note}`;
  });
  return `${progress.completed}/${progress.total} completed
${lines.join(`
`)}
next: ${next?.id ?? "none"}
`;
}
function resumeDocument(recordSource, root, configSource) {
  const record = exports_dist.parse(recordSource);
  const currentFiles = {};
  for (const file of Array.isArray(record?.source_files) ? record.source_files : []) {
    const rel = typeof file?.path === "string" ? repositoryRelative(root, file.path) : undefined;
    currentFiles[file?.path] = rel ? sha256(join3(root, rel)) : "outside-repository";
  }
  return assessResume(record, currentFiles, exports_dist.parse(configSource) ?? {});
}
function fail(message, code = 1) {
  process.stderr.write(message.endsWith(`
`) ? message : `${message}
`);
  process.exitCode = code;
}
function readFileOrFail(filename) {
  try {
    return readFileSync3(filename, "utf8");
  } catch {
    fail("Could not read artifact", 2);
    return;
  }
}
function readPayload() {
  try {
    const raw = readFileSync3(0, "utf8");
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return;
  }
}
function logGuard(host, event, result) {
  const file = process.env.NOZLE_GUARD_LOG;
  if (!file)
    return;
  try {
    appendFileSync(file, `${JSON.stringify({ at: new Date().toISOString(), host, event, ...result })}
`);
  } catch {}
}
function runHookCommand(args) {
  const hostFlag = args.indexOf("--host");
  const host = hostFlag === -1 ? undefined : args[hostFlag + 1];
  if (host !== undefined) {
    const adapter = adapters[host];
    if (!adapter)
      return fail(`Unknown host ${host}`);
    const payload = readPayload();
    if (!payload)
      return fail("invalid hook input", 2);
    const parsed = adapter.parse(payload);
    if (!parsed)
      return;
    const result = runHook(parsed.event, parsed.input);
    logGuard(host, parsed.event, result);
    const out = adapter.render(parsed, result);
    process.stdout.write(out.stdout);
    process.stderr.write(out.stderr);
    process.exitCode = out.exitCode;
    return;
  }
  const event = args[0] ?? "";
  if (!hookEvents.includes(event))
    return fail(`Unknown hook event ${event}`);
  const input = readPayload();
  if (!input)
    return event === "session-start" ? undefined : fail("invalid hook input", 2);
  const result = runHook(event, input);
  if (result.decision === "deny")
    return fail(`Nozle guard: ${result.reason}`, 2);
  if (result.context)
    process.stdout.write(`${result.context}
`);
}
function runHostsCommand(args) {
  const host = args.find((arg) => !arg.startsWith("--"));
  const write = args.includes("--write");
  if (host === "cline")
    return void console.log(hostNotes["cline"]);
  if (!host || !hostNames.includes(host))
    return fail(`Usage: nozle-check hosts <${[...hostNames, "cline"].join("|")}> [--write] [directory]`, 2);
  const dirArg = args.filter((arg) => !arg.startsWith("--"))[1];
  const root = resolve2(dirArg ?? ".");
  const hookPath = join3(dirname2(fileURLToPath(import.meta.url)), "nozle-hook");
  for (const file of hostFiles(host, hookPath)) {
    const target = join3(root, file.path);
    if (!write) {
      console.log(`# ${file.path}
${file.content}`);
    } else if (existsSync3(target)) {
      console.log(`skipped ${file.path}: exists, merge this by hand:
${file.content}`);
    } else {
      mkdirSync(dirname2(target), { recursive: true });
      writeFileSync(target, file.content);
      console.log(`wrote ${file.path}`);
    }
  }
  const note = hostNotes[host];
  if (note)
    console.log(note);
}
function hashDocument(root, paths) {
  const files = paths.map((path) => {
    const rel = repositoryRelative(root, resolve2(root, path));
    if (!rel)
      throw new Error(`${path} is outside the repository`);
    return { path: rel, sha256: sha256(join3(root, rel)) };
  });
  return exports_dist.stringify({ source_files: files });
}
function main(argv) {
  const [command, ...rest] = argv;
  if (command === "hook")
    return runHookCommand(rest);
  if (command === "hosts")
    return runHostsCommand(rest);
  if (command === "env") {
    const asJson = rest.includes("--json");
    const root = resolve2(rest.find((arg) => !arg.startsWith("--")) ?? ".");
    if (!existsSync3(root))
      return fail(`Usage: nozle-check env [directory] [--json]`, 2);
    const result = detectEnvironment(collectManifests(root));
    process.stdout.write(asJson ? `${JSON.stringify(result, null, 2)}
` : renderEnvironment(result));
    return;
  }
  if (command === "scan") {
    const asJson = rest.includes("--json");
    const root = resolve2(rest.find((arg) => !arg.startsWith("--")) ?? ".");
    if (!existsSync3(root))
      return fail("Usage: nozle-check scan [directory] [--json]", 2);
    const scan = scanNozleUsage(collectSources(root));
    const packages = detectEnvironment(collectManifests(root)).nozlePackages;
    process.stdout.write(asJson ? `${JSON.stringify({ ...scan, packages }, null, 2)}
` : renderUsageScan(scan, packages));
    return;
  }
  if (command === "key") {
    const flag = rest.indexOf("--base");
    const base = flag === -1 ? "https://api.nozle.app/core" : rest[flag + 1];
    const root = resolve2(rest.filter((_, i) => flag === -1 || i !== flag && i !== flag + 1)[0] ?? ".");
    if (!base || !existsSync3(root))
      return fail("Usage: nozle-check key [directory] [--base <core url>]", 2);
    checkKeys(root, base).then((results) => {
      process.stdout.write(renderKeyResults(results));
      process.exitCode = results.length === 0 ? 2 : results.every((r) => r.ok) ? 0 : 1;
    });
    return;
  }
  if (command === "study") {
    const file = resolve2(rest[0] ?? "nozle-study.yaml");
    const text = readFileOrFail(file);
    if (text === undefined)
      return;
    const study = exports_dist.parse(text);
    const errors = validateStudy(study);
    if (errors.length)
      return fail(errors.map((error) => `- ${error}
`).join(""));
    const hashes = {};
    for (const entry of Array.isArray(study.source_files) ? study.source_files : []) {
      const rel = repositoryRelative(dirname2(file), String(entry.path));
      hashes[String(entry.path)] = rel ? sha256(join3(dirname2(file), rel)) : "outside-repository";
    }
    const drift = studyDrift(study, hashes);
    process.stdout.write(`account read: ${study.account_read.status}
`);
    process.stdout.write(drift.length ? `changed since the study (re-read these, reuse the rest):
${drift.map((line) => `- ${line}
`).join("")}` : `no drift: every file the study relied on is unchanged
`);
    return;
  }
  if (command === "plan" || command === "progress") {
    const source = rest[0] ?? (command === "progress" ? "nozle.integration.yaml" : undefined);
    if (!source)
      return fail(`Usage: nozle-check ${command} <file>`, 2);
    const text = readFileOrFail(source);
    if (text === undefined)
      return;
    try {
      process.stdout.write(command === "plan" ? planDocument(text) : progressDocument(text));
    } catch (error) {
      fail(error.message);
    }
    return;
  }
  if (command === "hash") {
    const [repository, ...paths] = rest;
    if (!repository || paths.length === 0)
      return fail("Usage: nozle-check hash <repository> <path>...", 2);
    process.stdout.write(hashDocument(resolve2(repository), paths));
    return;
  }
  if (command === "resume") {
    const flag = rest.indexOf("--config");
    const configFile = flag === -1 ? undefined : rest[flag + 1];
    const recordFile = rest.filter((_, i) => i !== flag && i !== flag + 1)[0] ?? "nozle.integration.yaml";
    if (!configFile)
      return fail("Usage: nozle-check resume [nozle.integration.yaml] --config <current-configuration.yaml>", 2);
    const record = readFileOrFail(recordFile);
    const config = record === undefined ? undefined : readFileOrFail(configFile);
    if (record === undefined || config === undefined)
      return;
    try {
      const result = resumeDocument(record, dirname2(resolve2(recordFile)), config);
      if (!result.requires_review)
        return void process.stdout.write(`no drift: scoped files and configuration match the record
`);
      return fail(`requires scope review:
${result.drift.map((line) => `- ${line}
`).join("")}`);
    } catch {
      return fail("Could not read artifact", 2);
    }
  }
  const filename = command === "check" ? rest[0] : command;
  if (!filename)
    return fail(`Usage: nozle-check [check] <nozle.integration.yaml|nozle-setup-plan.yaml>
       nozle-check plan <tasks.yaml>
       nozle-check progress [nozle.integration.yaml]
       nozle-check resume [nozle.integration.yaml] --config <current-configuration.yaml>
       nozle-check hash <repository> <path>...
       nozle-check env [directory] [--json]
       nozle-check scan [directory] [--json]
       nozle-check key [directory] [--base <core url>]
       nozle-check study [nozle-study.yaml]
       nozle-check hook <event> < payload.json
       nozle-check hook --host <claude|codex|cursor|windsurf|gemini|copilot|opencode> < native-hook-payload.json
       nozle-check hosts <codex|cursor|windsurf|gemini|copilot|opencode|cline> [--write] [directory]`, 2);
  const text = readFileOrFail(filename);
  if (text === undefined)
    return;
  const errors = checkDocument(text, filename);
  if (errors.length)
    return fail(errors.map((error) => `- ${error}
`).join(""));
  process.stdout.write(`${basename2(filename)}: valid
`);
}
if (process.argv[1] && resolve2(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
export {
  checkDocument,
  collectManifests,
  collectSources,
  hashDocument,
  planDocument,
  progressDocument,
  resumeDocument
};
