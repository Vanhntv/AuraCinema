export const tierForSpend = (spent = 0) => spent >= 10000000 ? "vvip" : spent >= 3000000 ? "vip" : "member";

export const membershipView = (user) => {
  const spent = Math.max(Number(user.total_spent || 0), 0);
  const tier = tierForSpend(spent);
  const next = tier === "member" ? "VIP" : tier === "vip" ? "VVIP" : null;
  const target = tier === "member" ? 3000000 : 10000000;
  return {
    code: user.member_code || null,
    activated_at: user.member_activated_at || null,
    active: user.status && user.account_status === "active" && !user.deleted_at,
    tier, label: tier === "member" ? "Member" : tier.toUpperCase(),
    spent, next, target, remaining: next ? Math.max(target - spent, 0) : 0,
    progress: next ? Math.min(spent / target * 100, 100) : 100,
    available_points: Math.max(Number(user.reward_points || 0), 0),
    points_debt: Math.max(-Number(user.reward_points || 0), 0),
    points_per_vnd: 10000,
  };
};

export const tierUpdateStage = {
  $set: { member_tier: { $switch: {
    branches: [
      { case: { $gte: ["$total_spent", 10000000] }, then: "vvip" },
      { case: { $gte: ["$total_spent", 3000000] }, then: "vip" },
    ], default: "member",
  } } },
};
