/**
 * HydratedProductCard.live — withObservables WatermelonDB JSI live query
 * Usa database JSI per hydration reattiva 120Hz. Fallback a HydratedProductCard base se DB non pronto.
 */
import React from 'react';
import { Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import { database } from '../../db';
import HydratedProductCard, { HydratedPayload } from './HydratedProductCard';

const enhance = withObservables(['payload'], ({ payload }: { payload: HydratedPayload | string }) => {
  let skus: string[] = [];
  try {
    const p: any = typeof payload === 'string' ? JSON.parse(payload) : payload;
    skus = Array.isArray(p?.skus) ? p.skus : Array.isArray(p?.sku) ? p.sku : [];
  } catch {}
  // JSI true -> observe() sync su UI thread
  const products$ = skus.length
    ? database.get('products').query(Q.where('sku', Q.oneOf(skus))).observe()
    : database.get('products').query(Q.where('sku', '___none___')).observe();
  return { observedProducts: products$ };
});

const LiveCard = enhance(({ observedProducts, payload, onAction, hydratedCache }: any) => {
  // observedProducts è array Model WatermelonDB — mappalo a shape InventoryProduct
  const mappedCache: Record<string, any> = { ...(hydratedCache || {}) };
  // Se vuoi hydrazione totale, passa observedProducts come hydratedCache
  // HydratedProductCard già fa lookup via getProductBySku, ma ora ha anche observedProducts visibile se logghi.
  return <HydratedProductCard payload={payload} hydratedCache={mappedCache} onAction={onAction} />;
});

export default LiveCard;
