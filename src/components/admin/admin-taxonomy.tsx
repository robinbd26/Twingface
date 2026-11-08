'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertBanner,
  ConfirmButton,
  EmptyState,
  INPUT,
  MUTED,
  NOTE,
  Pill,
  ROW,
  SECTION,
  STRONG_TEXT,
  TAB_BUTTON,
  TITLE,
  load,
  mutate,
  type Banner,
} from './admin-ui';

type TaxonomyNode = {
  id: string;
  entity: string;
  code: string;
  nameEn: string;
  nameBn: string;
  sortOrder: number;
  isActive: boolean;
  isCustom?: boolean;
  parentId: string | null;
  categoryIds?: string[];
  references?: Record<string, number>;
};

type NodesByEntity = Record<string, TaxonomyNode[]>;

const ENTITIES = [
  { key: 'INDUSTRY', label: 'Industries', singular: 'industry', parent: null },
  { key: 'MAIN_CATEGORY', label: 'Main categories', singular: 'main category', parent: 'INDUSTRY' },
  { key: 'DESIGNATION', label: 'Designations', singular: 'designation', parent: null },
  { key: 'ORGANIZATION_TYPE', label: 'Organization types', singular: 'organization type', parent: null },
  { key: 'RENTAL_CATEGORY', label: 'Rental categories', singular: 'rental category', parent: null },
  { key: 'RENTAL_SUBCATEGORY', label: 'Rental subcategories', singular: 'rental subcategory', parent: 'RENTAL_CATEGORY' },
] as const;

type EntityKey = (typeof ENTITIES)[number]['key'];

const ENTITY_LABEL = Object.fromEntries(ENTITIES.map((item) => [item.key, item.label])) as Record<EntityKey, string>;
const ENTITY_SINGULAR = Object.fromEntries(ENTITIES.map((item) => [item.key, item.singular])) as Record<EntityKey, string>;

const REFERENCE_TEXT: Record<string, string> = {
  identities: 'professional identities',
  mainCategories: 'main categories',
  designationLinks: 'designation links',
  organizations: 'organizations',
  listings: 'rental listings',
  subcategories: 'rental subcategories',
};

const LOAD_ERROR = 'Unable to load the taxonomy.';

export default function AdminTaxonomy() {
  const [nodes, setNodes] = useState<NodesByEntity | null>(null);
  const [entity, setEntity] = useState<EntityKey>('INDUSTRY');
  const [banner, setBanner] = useState<Banner>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      const result = await load('/api/mediaworld/admin/taxonomy', LOAD_ERROR);
      if (!active) return;
      setLoading(false);
      if (!result.ok) {
        setBanner({ tone: 'error', text: result.message });
        return;
      }
      setNodes((result.json?.nodes ?? {}) as NodesByEntity);
    })();
    return () => {
      active = false;
    };
  }, []);

  function mergeNode(next: TaxonomyNode) {
    setNodes((current) => {
      if (!current) return current;
      const list = current[next.entity] ?? [];
      const exists = list.some((node) => node.id === next.id);
      return {
        ...current,
        [next.entity]: exists ? list.map((node) => (node.id === next.id ? next : node)) : [next, ...list],
      };
    });
  }

  async function patch(node: TaxonomyNode, changes: Record<string, unknown>, successText: string) {
    setBanner(null);
    const result = await mutate('/api/mediaworld/admin/taxonomy/' + node.id, 'PATCH', { entity: node.entity, ...changes }, 'Unable to update that taxonomy node.');
    if (!result.ok) {
      setBanner({ tone: 'error', text: result.message });
      return;
    }
    const updated = result.json?.node as TaxonomyNode | undefined;
    if (updated) mergeNode(updated);
    setBanner({ tone: 'ok', text: successText });
  }

  async function remove(node: TaxonomyNode) {
    setBanner(null);
    const result = await mutate(`/api/mediaworld/admin/taxonomy/${node.id}?entity=${node.entity}`, 'DELETE', undefined, 'Unable to delete that taxonomy node.');
    if (!result.ok) {
      setBanner({ tone: 'error', text: result.message });
      return;
    }
    setNodes((current) => {
      if (!current) return current;
      return { ...current, [node.entity]: (current[node.entity] ?? []).filter((item) => item.id !== node.id) };
    });
    setBanner({ tone: 'ok', text: `${node.nameEn} was deleted. No member data referenced it.` });
  }

  async function create(payload: Record<string, unknown>) {
    setBanner(null);
    const result = await mutate('/api/mediaworld/admin/taxonomy', 'POST', payload, 'Unable to create that taxonomy node.');
    if (!result.ok) {
      setBanner({ tone: 'error', text: result.message });
      return;
    }
    const created = result.json?.node as TaxonomyNode | undefined;
    if (created) mergeNode(created);
    setBanner({ tone: 'ok', text: `${String(payload.nameEn ?? 'Node')} was added to the live taxonomy.` });
  }

  const rows = nodes?.[entity] ?? [];
  const activeEntity = ENTITIES.find((item) => item.key === entity) ?? ENTITIES[0];
  const parentOptions = useMemo(() => {
    if (!nodes || !activeEntity.parent) return [];
    return (nodes[activeEntity.parent] ?? []).map((node) => ({ id: node.id, label: `${node.nameEn} (${node.code})`, isActive: node.isActive }));
  }, [nodes, activeEntity]);

  return (
    <section style={SECTION}>
      <h2 style={TITLE}>Taxonomy</h2>
      <p style={NOTE}>
        Every node is a real database row with its own code, English and Bangla names, sort order and active flag. Deactivating keeps
        existing profiles intact and only hides the node from new sign-ups. Hard delete is offered only when nothing references the node.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {ENTITIES.map((item) => (
          <button key={item.key} type="button" style={TAB_BUTTON(item.key === entity)} onClick={() => setEntity(item.key)}>
            {item.label} ({nodes?.[item.key]?.length ?? 0})
          </button>
        ))}
      </div>

      <AlertBanner banner={banner} />

      {loading ? <p style={MUTED}>Loading taxonomy…</p> : null}

      {!loading ? (
        <CreateNodeForm
          entity={entity}
          label={ENTITY_LABEL[entity]}
          parentOptions={parentOptions}
          hasCategoryLinks={entity === 'DESIGNATION'}
          onCreate={create}
        />
      ) : null}

      {!loading && rows.length === 0 ? (
        <EmptyState title={`No ${ENTITY_LABEL[entity].toLowerCase()} yet.`} note="Add the first one above, or check the taxonomy seed script." />
      ) : null}

      {!loading
        ? rows.map((node) => (
            <NodeRow
              key={node.id}
              node={node}
              allNodes={nodes ?? {}}
              parentLabel={parentLabelFor(node, nodes ?? {})}
              onPatch={patch}
              onDelete={remove}
            />
          ))
        : null}
    </section>
  );
}

function parentLabelFor(node: TaxonomyNode, nodes: NodesByEntity): string | null {
  if (!node.parentId) return null;
  const pool = node.entity === 'MAIN_CATEGORY' ? nodes.INDUSTRY ?? [] : node.entity === 'RENTAL_SUBCATEGORY' ? nodes.RENTAL_CATEGORY ?? [] : [];
  return pool.find((item) => item.id === node.parentId)?.nameEn ?? 'Unknown parent';
}

function referenceSummary(node: TaxonomyNode): { text: string; blocked: boolean } {
  const entries = Object.entries(node.references ?? {}).filter(([, count]) => count > 0);
  if (entries.length === 0) return { text: 'No member data references this node', blocked: false };
  return { text: `Referenced by ${entries.map(([key, count]) => `${count} ${REFERENCE_TEXT[key] ?? key}`).join(', ')}`, blocked: true };
}

function NodeRow({
  node,
  allNodes,
  parentLabel,
  onPatch,
  onDelete,
}: {
  node: TaxonomyNode;
  allNodes: NodesByEntity;
  parentLabel: string | null;
  onPatch: (node: TaxonomyNode, changes: Record<string, unknown>, successText: string) => Promise<void>;
  onDelete: (node: TaxonomyNode) => Promise<void>;
}) {
  const [nameEn, setNameEn] = useState(node.nameEn);
  const [nameBn, setNameBn] = useState(node.nameBn);
  const [sortOrder, setSortOrder] = useState(String(node.sortOrder));
  const [linkCategory, setLinkCategory] = useState('');
  const refs = referenceSummary(node);
  const renamed = nameEn.trim() !== node.nameEn || nameBn.trim() !== node.nameBn;
  const reordered = sortOrder !== String(node.sortOrder);

  const categories = allNodes.MAIN_CATEGORY ?? [];
  const linkedIds = node.entity === 'DESIGNATION' ? node.categoryIds ?? [] : [];
  const linkedCategories = linkedIds
    .map((id) => categories.find((item) => item.id === id))
    .filter((item): item is TaxonomyNode => Boolean(item));
  const unlinkableCategories = categories.filter((item) => !linkedIds.includes(item.id));

  async function saveNames() {
    await onPatch(node, { nameEn: nameEn.trim(), nameBn: nameBn.trim() }, `${nameEn.trim()} renamed.`);
  }

  async function saveOrder() {
    await onPatch(node, { sortOrder: Number(sortOrder) }, `Sort order set to ${sortOrder} for ${node.nameEn}.`);
  }

  async function toggleActive() {
    await onPatch(node, { isActive: !node.isActive }, `${node.nameEn} is now ${node.isActive ? 'deactivated' : 'active'}.`);
  }

  async function moveIndustry() {
    await onPatch(node, { industryId: linkCategory }, `${node.nameEn} moved to a different industry.`);
  }

  async function setCategories(categoryIds: string[], successText: string) {
    await onPatch(node, { categoryIds }, successText);
  }

  return (
    <div style={ROW}>
      <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={STRONG_TEXT}>{node.nameEn}</span>
          <Pill tone={node.isActive ? 'ok' : 'warn'}>{node.isActive ? 'Active' : 'Deactivated'}</Pill>
          {node.isCustom ? <Pill tone="plain">Custom</Pill> : null}
          <span style={MUTED}>
            {node.code} · order {node.sortOrder}
            {parentLabel ? ` · parent: ${parentLabel}` : ''}
          </span>
        </div>
        <span style={MUTED}>{refs.text}</span>
        {linkedCategories.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {linkedCategories.map((category) => (
              <span key={category.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Pill tone="plain">{category.nameEn}</Pill>
                <ConfirmButton
                  label="Unlink"
                  confirmLabel={`Confirm unlink from ${category.nameEn}`}
                  tone="danger"
                  onConfirm={() => setCategories(linkedIds.filter((id) => id !== category.id), `${category.nameEn} unlinked from ${node.nameEn}.`)}
                />
              </span>
            ))}
          </div>
        ) : null}
        {node.entity === 'DESIGNATION' ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <select style={{ ...INPUT, width: 'auto', minWidth: 190 }} value={linkCategory} onChange={(event) => setLinkCategory(event.target.value)}>
              <option value="">Link a main category…</option>
              {unlinkableCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.nameEn}
                </option>
              ))}
            </select>
            <ConfirmButton
              label="Link category"
              confirmLabel="Confirm link"
              disabled={!linkCategory}
              onConfirm={() => {
                if (!linkCategory) return;
                return setCategories([...linkedIds, linkCategory], 'Category linked.').then(() => setLinkCategory(''));
              }}
            />
          </div>
        ) : null}
        {node.entity === 'MAIN_CATEGORY' ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <select style={{ ...INPUT, width: 'auto', minWidth: 190 }} value={linkCategory} onChange={(event) => setLinkCategory(event.target.value)}>
              <option value="">Move to another industry…</option>
              {(allNodes.INDUSTRY ?? [])
                .filter((industry) => industry.isActive && industry.id !== node.parentId)
                .map((industry) => (
                  <option key={industry.id} value={industry.id}>
                    {industry.nameEn}
                  </option>
                ))}
            </select>
            <ConfirmButton
              label="Move industry"
              confirmLabel="Confirm move"
              disabled={!linkCategory || (node.references?.identities ?? 0) > 0}
              onConfirm={() => {
                if (!linkCategory) return;
                return moveIndustry().then(() => setLinkCategory(''));
              }}
            />
            {(node.references?.identities ?? 0) > 0 ? <span style={MUTED}>Move blocked: professional identities use this category.</span> : null}
          </div>
        ) : null}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <input style={{ ...INPUT, width: 150 }} value={nameEn} onChange={(event) => setNameEn(event.target.value)} placeholder="English name" />
        <input style={{ ...INPUT, width: 150 }} value={nameBn} onChange={(event) => setNameBn(event.target.value)} placeholder="Bangla name" />
        <input style={{ ...INPUT, width: 78 }} value={sortOrder} onChange={(event) => setSortOrder(event.target.value.replace(/\D/g, ''))} placeholder="Order" inputMode="numeric" />
        <ConfirmButton label="Save names" confirmLabel="Confirm rename" disabled={!renamed} onConfirm={saveNames} />
        <ConfirmButton label="Save order" confirmLabel="Confirm order" disabled={!reordered || sortOrder === ''} onConfirm={saveOrder} />
        <ConfirmButton
          label={node.isActive ? 'Deactivate' : 'Activate'}
          confirmLabel={node.isActive ? 'Confirm deactivate' : 'Confirm activate'}
          tone={node.isActive ? 'danger' : 'default'}
          onConfirm={toggleActive}
        />
        <ConfirmButton
          label="Delete"
          confirmLabel="Confirm delete"
          tone="danger"
          disabled={refs.blocked}
          onConfirm={() => onDelete(node)}
        />
      </div>
    </div>
  );
}

function CreateNodeForm({
  entity,
  label,
  parentOptions,
  hasCategoryLinks,
  onCreate,
}: {
  entity: EntityKey;
  label: string;
  parentOptions: { id: string; label: string; isActive: boolean }[];
  hasCategoryLinks: boolean;
  onCreate: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [code, setCode] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [parentId, setParentId] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const needsParent = parentOptions.length > 0;
  const valid = code.trim().length >= 2 && nameEn.trim().length >= 2 && nameBn.trim().length >= 2 && (!needsParent || parentId !== '');

  function reset() {
    setCode('');
    setNameEn('');
    setNameBn('');
    setSortOrder('0');
    setParentId('');
    setIsCustom(false);
  }

  return (
    <div style={{ border: '1px dashed #3a3d42', borderRadius: 12, padding: '12px 14px', marginBottom: 8 }}>
      <p style={{ ...NOTE, marginBottom: 10 }}>
        New {label.toLowerCase()} <span style={MUTED}>— code is stored upper-case and cannot be reused once member data points at it.</span>
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input style={{ ...INPUT, width: 140 }} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="CODE" />
        <input style={{ ...INPUT, width: 170 }} value={nameEn} onChange={(event) => setNameEn(event.target.value)} placeholder="English name" />
        <input style={{ ...INPUT, width: 170 }} value={nameBn} onChange={(event) => setNameBn(event.target.value)} placeholder="Bangla name" />
        <input style={{ ...INPUT, width: 78 }} value={sortOrder} onChange={(event) => setSortOrder(event.target.value.replace(/\D/g, ''))} placeholder="Order" inputMode="numeric" />
        {needsParent ? (
          <select style={{ ...INPUT, width: 'auto', minWidth: 190 }} value={parentId} onChange={(event) => setParentId(event.target.value)}>
            <option value="">Choose parent…</option>
            {parentOptions
              .filter((option) => option.isActive)
              .map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
          </select>
        ) : null}
        {entity === 'ORGANIZATION_TYPE' ? (
          <label style={MUTED}>
            <input type="checkbox" checked={isCustom} onChange={(event) => setIsCustom(event.target.checked)} /> custom type
          </label>
        ) : null}
        <ConfirmButton
          label={`Add ${ENTITY_SINGULAR[entity]}`}
          confirmLabel="Confirm add"
          disabled={!valid}
          onConfirm={() => {
            const payload: Record<string, unknown> = {
              entity,
              code: code.trim(),
              nameEn: nameEn.trim(),
              nameBn: nameBn.trim(),
              sortOrder: Number(sortOrder || 0),
            };
            if (entity === 'MAIN_CATEGORY') payload.industryId = parentId;
            if (entity === 'RENTAL_SUBCATEGORY') payload.categoryId = parentId;
            if (entity === 'ORGANIZATION_TYPE') payload.isCustom = isCustom;
            return onCreate(payload).then(reset);
          }}
        />
      </div>
      {hasCategoryLinks ? <p style={MUTED}>Designations can be linked to main categories after creating them.</p> : null}
    </div>
  );
}
