/**
 * v0.9 财产保全期限默认值（民诉法第 244 条）
 */
import type { PropertyType } from "@prisma/client";

export const PRESERVATION_DURATION_DAYS: Record<PropertyType, number> = {
  BANK_DEPOSIT: 365,        // 银行存款 1 年
  VEHICLE: 730,             // 车辆 / 动产 2 年
  OTHER: 730,
  REAL_ESTATE: 1095,        // 房产 3 年
  EQUITY: 1095,             // 股权 3 年
  IP: 1095                  // 知识产权 3 年
};

export function defaultExpiryDate(startDate: Date, propertyType: PropertyType): Date {
  const days = PRESERVATION_DURATION_DAYS[propertyType] ?? 730;
  const d = new Date(startDate);
  d.setDate(d.getDate() + days);
  return d;
}
