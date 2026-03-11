import { tableToModelMap } from './mongoModels.js';

function sanitizeDoc(doc) {
  if (!doc) return doc;
  if (Array.isArray(doc)) return doc.map((item) => sanitizeDoc(item));
  if (typeof doc !== 'object') return doc;

  const plain = { ...doc };
  delete plain._id;
  delete plain.__v;
  return plain;
}

function parseSelectColumns(columns) {
  if (!columns || columns === '*') return null;
  return String(columns)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function buildProjection(columns) {
  if (!columns || columns === '*') return null;
  return String(columns)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .join(' ');
}

function pickSelectedColumns(data, selectedColumns) {
  if (!selectedColumns || selectedColumns === '*') return data;
  const fields = parseSelectColumns(selectedColumns) || [];
  if (!fields.length) return data;

  const pick = (row) => {
    if (!row || typeof row !== 'object') return row;
    const next = {};
    for (const field of fields) {
      next[field] = row[field];
    }
    return next;
  };

  if (Array.isArray(data)) return data.map((row) => pick(row));
  return pick(data);
}

function parseOrCondition(orExpression) {
  if (!orExpression || typeof orExpression !== 'string') return [];
  return orExpression
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const eqMatch = part.match(/^([^\.]+)\.eq\.(.+)$/);
      if (eqMatch) {
        return { [eqMatch[1]]: eqMatch[2] };
      }
      return null;
    })
    .filter(Boolean);
}

class MongoQueryBuilder {
  constructor(model) {
    this.model = model;
    this.operation = 'select';
    this.selectedColumns = '*';
    this.filters = {};
    this.orFilters = [];
    this.sortSpec = null;
    this.limitCount = null;
    this.skipCount = null;
    this.expectSingle = false;
    this.insertPayload = null;
    this.updatePayload = null;
    this.upsertPayload = null;
    this.upsertOptions = null;
    this.shouldReturnRows = false;
  }

  select(columns = '*') {
    this.selectedColumns = columns;
    if (this.operation !== 'select') {
      this.shouldReturnRows = true;
    }
    return this;
  }

  eq(field, value) {
    this.filters[field] = value;
    return this;
  }

  ilike(field, value) {
    const escaped = String(value || '')
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/%/g, '.*');
    this.filters[field] = { $regex: `^${escaped}$`, $options: 'i' };
    return this;
  }

  or(expression) {
    this.orFilters.push(...parseOrCondition(expression));
    return this;
  }

  order(field, options = {}) {
    const ascending = options.ascending !== false;
    this.sortSpec = { [field]: ascending ? 1 : -1 };
    return this;
  }

  limit(count) {
    this.limitCount = Number(count);
    return this;
  }

  range(from, to) {
    const start = Number(from);
    const end = Number(to);
    if (Number.isInteger(start) && Number.isInteger(end) && end >= start) {
      this.skipCount = start;
      this.limitCount = end - start + 1;
    }
    return this;
  }

  single() {
    this.expectSingle = true;
    return this;
  }

  insert(payload) {
    this.operation = 'insert';
    this.insertPayload = payload;
    return this;
  }

  update(payload) {
    this.operation = 'update';
    this.updatePayload = payload || {};
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  upsert(payload, options = {}) {
    this.operation = 'upsert';
    this.upsertPayload = payload;
    this.upsertOptions = options;
    return this;
  }

  buildFilter() {
    if (!this.orFilters.length) {
      return { ...this.filters };
    }
    return {
      ...this.filters,
      $or: this.orFilters,
    };
  }

  normalizeRows(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === 'object') return [payload];
    return [];
  }

  async executeSelect() {
    const filter = this.buildFilter();
    const projection = buildProjection(this.selectedColumns);

    if (this.expectSingle) {
      let query = this.model.findOne(filter, projection);
      if (this.sortSpec) query = query.sort(this.sortSpec);
      const doc = await query.lean();
      if (!doc) {
        return {
          data: null,
          error: { message: 'No rows found', code: 'PGRST116' },
        };
      }
      return { data: sanitizeDoc(doc), error: null };
    }

    let query = this.model.find(filter, projection);
    if (this.sortSpec) query = query.sort(this.sortSpec);
    if (Number.isInteger(this.skipCount) && this.skipCount >= 0) query = query.skip(this.skipCount);
    if (Number.isInteger(this.limitCount) && this.limitCount >= 0) query = query.limit(this.limitCount);

    const docs = await query.lean();
    return { data: sanitizeDoc(docs || []), error: null };
  }

  async executeInsert() {
    const rows = this.normalizeRows(this.insertPayload);
    if (!rows.length) return { data: null, error: null };

    let inserted;
    if (rows.length === 1) {
      inserted = [await this.model.create(rows[0])];
    } else {
      inserted = await this.model.insertMany(rows, { ordered: true });
    }

    if (!this.shouldReturnRows) {
      return { data: null, error: null };
    }

    const normalized = sanitizeDoc(
      inserted.map((doc) => (typeof doc.toObject === 'function' ? doc.toObject() : doc)),
    );
    const selected = pickSelectedColumns(normalized, this.selectedColumns);
    return {
      data: this.expectSingle ? selected[0] || null : selected,
      error: this.expectSingle && (!selected || !selected.length)
        ? { message: 'No rows found', code: 'PGRST116' }
        : null,
    };
  }

  async executeUpdate() {
    const filter = this.buildFilter();
    const patch = this.updatePayload || {};

    if (this.shouldReturnRows && this.expectSingle) {
      const projection = buildProjection(this.selectedColumns);
      const updated = await this.model
        .findOneAndUpdate(filter, patch, { new: true })
        .select(projection || '');
      if (!updated) {
        return {
          data: null,
          error: { message: 'No rows found', code: 'PGRST116' },
        };
      }
      const output = sanitizeDoc(updated.toObject());
      return { data: output, error: null };
    }

    await this.model.updateMany(filter, patch);
    return { data: null, error: null };
  }

  async executeDelete() {
    const filter = this.buildFilter();
    await this.model.deleteMany(filter);
    return { data: null, error: null };
  }

  async executeUpsert() {
    const rows = this.normalizeRows(this.upsertPayload);
    if (!rows.length) return { data: null, error: null };

    const conflictKeys = String(this.upsertOptions?.onConflict || '')
      .split(',')
      .map((key) => key.trim())
      .filter(Boolean);

    const upsertedDocs = [];
    for (const row of rows) {
      const filter = {};
      for (const key of conflictKeys) {
        if (row[key] !== undefined) {
          filter[key] = row[key];
        }
      }
      if (!Object.keys(filter).length && row.id) {
        filter.id = row.id;
      }
      const doc = await this.model.findOneAndUpdate(filter, row, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      });
      upsertedDocs.push(doc);
    }

    if (!this.shouldReturnRows) {
      return { data: null, error: null };
    }

    const normalized = sanitizeDoc(
      upsertedDocs.map((doc) => (typeof doc.toObject === 'function' ? doc.toObject() : doc)),
    );
    const selected = pickSelectedColumns(normalized, this.selectedColumns);
    return { data: this.expectSingle ? selected[0] || null : selected, error: null };
  }

  async execute() {
    try {
      switch (this.operation) {
        case 'select':
          return await this.executeSelect();
        case 'insert':
          return await this.executeInsert();
        case 'update':
          return await this.executeUpdate();
        case 'delete':
          return await this.executeDelete();
        case 'upsert':
          return await this.executeUpsert();
        default:
          return { data: null, error: { message: `Unsupported operation: ${this.operation}` } };
      }
    } catch (error) {
      return {
        data: null,
        error: {
          message: error?.message || 'Database operation failed',
          code: error?.code || null,
        },
      };
    }
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }

  catch(reject) {
    return this.execute().catch(reject);
  }

  finally(handler) {
    return this.execute().finally(handler);
  }
}

const mongoAdapter = {
  from(tableName) {
    const model = tableToModelMap[tableName];
    if (!model) {
      throw new Error(`Unknown MongoDB table mapping for: ${tableName}`);
    }
    return new MongoQueryBuilder(model);
  },
};

export default mongoAdapter;
