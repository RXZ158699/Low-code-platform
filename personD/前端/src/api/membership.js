import { apiFetch } from "./client.js";

export function getMembershipPlans() {
  return apiFetch("/membership/plans");
}

export function createMembershipOrder(planType) {
  return apiFetch("/membership/orders", {
    method: "POST",
    body: { planType },
  });
}

export function getMembershipOrder(orderNo) {
  return apiFetch(`/membership/orders/${orderNo}`);
}

export function cancelMembership() {
  return apiFetch("/membership/cancel", { method: "POST" });
}
