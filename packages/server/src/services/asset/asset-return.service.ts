// ============================================================================
// ASSET RETURN SERVICE
// Manages company asset returns for exiting employees.
// ============================================================================

import { getDB } from "../../db/adapters";
import { getEmpCloudDB } from "../../db/empcloud";
import { NotFoundError } from "../../utils/errors";
import { logger } from "../../utils/logger";

interface AddAssetData {
  asset_name: string;
  asset_tag?: string;
  category: string;
  replacement_cost?: number;
  assigned_date?: string;
}

interface UpdateAssetData {
  status?: string;
  returned_date?: string;
  verified_by?: number;
  condition_notes?: string;
  replacement_cost?: number;
}

export async function addAsset(
  orgId: number,
  exitRequestId: string,
  data: AddAssetData,
) {
  const db = getDB();

  // Verify exit request belongs to org
  const exit = await db.findOne("exit_requests", {
    id: exitRequestId,
    organization_id: orgId,
  });
  if (!exit) {
    throw new NotFoundError("Exit request", exitRequestId);
  }

  const asset = await db.create("asset_returns", {
    exit_request_id: exitRequestId,
    asset_name: data.asset_name,
    asset_tag: data.asset_tag || null,
    category: data.category,
    replacement_cost: data.replacement_cost || 0,
    assigned_date: data.assigned_date || null,
    status: "pending",
  });

  logger.info(`Asset added: ${data.asset_name} for exit ${exitRequestId}`);
  return asset;
}

export async function listAssets(orgId: number, exitRequestId: string) {
  const db = getDB();

  // Verify exit request belongs to org
  const exit = await db.findOne("exit_requests", {
    id: exitRequestId,
    organization_id: orgId,
  });
  if (!exit) {
    throw new NotFoundError("Exit request", exitRequestId);
  }

  const result = await db.findMany("asset_returns", {
    filters: { exit_request_id: exitRequestId },
    limit: 100,
    sort: { field: "created_at", order: "asc" },
  });

  return result.data;
}

/**
 * List every asset across the org, enriched with the owning employee + exit
 * status, so the standalone /assets page can show an org-wide table instead of
 * a dead-end "open an exit" card. Optional status filter.
 */
export async function listAllAssets(
  orgId: number,
  params: { status?: string } = {},
) {
  const db = getDB();

  // Assets are scoped to the org via their exit request.
  const exitsResult = await db.findMany<any>("exit_requests", {
    filters: { organization_id: orgId },
    limit: 1000,
  });
  const exitById = new Map(exitsResult.data.map((e) => [e.id, e]));
  const exitIds = exitsResult.data.map((e) => e.id);
  if (exitIds.length === 0) return [];

  const assetFilters: Record<string, any> = { exit_request_id: exitIds };
  if (params.status) assetFilters.status = params.status;

  const assets = await db.findMany<any>("asset_returns", {
    filters: assetFilters,
    sort: { field: "created_at", order: "desc" },
    limit: 1000,
  });

  // Enrich with employee names from EmpCloud.
  const empDb = getEmpCloudDB();
  const employeeIds = [
    ...new Set(
      assets.data
        .map((a) => exitById.get(a.exit_request_id)?.employee_id)
        .filter((id): id is number => typeof id === "number"),
    ),
  ];
  const empMap = new Map<number, any>();
  if (employeeIds.length > 0) {
    const employees = await empDb("users")
      .whereIn("id", employeeIds)
      .select("id", "first_name", "last_name", "designation");
    for (const e of employees) empMap.set(e.id, e);
  }

  return assets.data.map((a) => {
    const exit = exitById.get(a.exit_request_id);
    return {
      ...a,
      exit_status: exit?.status ?? null,
      employee: exit ? empMap.get(exit.employee_id) ?? null : null,
    };
  });
}

export async function updateAsset(
  orgId: number,
  assetId: string,
  data: UpdateAssetData,
) {
  const db = getDB();

  // Verify asset exists and belongs to org (via exit request)
  const asset = await db.findById<any>("asset_returns", assetId);
  if (!asset) {
    throw new NotFoundError("Asset", assetId);
  }

  const exit = await db.findOne("exit_requests", {
    id: asset.exit_request_id,
    organization_id: orgId,
  });
  if (!exit) {
    throw new NotFoundError("Asset", assetId);
  }

  const updated = await db.update("asset_returns", assetId, data);
  logger.info(`Asset updated: ${assetId} status=${data.status || "unchanged"}`);
  return updated;
}
