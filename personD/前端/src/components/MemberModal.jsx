import { useEffect, useRef, useState } from "react";
import { App as AntdApp, Button, Modal, Radio, Spin } from "antd";
import {
  createMembershipOrder,
  getMembershipOrder,
  getMembershipPlans,
} from "../api/membership.js";
import { useAuth } from "../auth/AuthContext.jsx";

function planName(plan) {
  if (!plan) return "";
  return plan.code === "PREMIUM"
    ? `高级会员 · ¥${(plan.amountCents / 100).toFixed(2)}/月`
    : `普通会员 · ¥${(plan.amountCents / 100).toFixed(2)}/月`;
}

function formatExpire(value) {
  if (!value) return "无";
  return String(value).replace("T", " ").slice(0, 10);
}

export default function MemberModal({ open, onClose, reason }) {
  const { message } = AntdApp.useApp();
  const { user, refreshMe } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [planCode, setPlanCode] = useState("BASIC");
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const pollTimerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    getMembershipPlans()
      .then((items) => {
        if (cancelled) return;
        setPlans(Array.isArray(items) ? items : []);
        const premium = (Array.isArray(items) ? items : []).find(
          (item) => item.code === "PREMIUM",
        );
        setPlanCode(
          user?.membershipType === "PREMIUM" ? "PREMIUM" : premium ? "PREMIUM" : "BASIC",
        );
      })
      .catch((err) => {
        if (!cancelled) message.error(err.message || "会员套餐加载失败");
      })
      .finally(() => {
        if (!cancelled) setLoadingPlans(false);
      });
    return () => {
      cancelled = true;
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    };
  }, [open, message, user?.membershipType]);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const closeModal = () => {
    stopPolling();
    setPaid(false);
    onClose();
  };

  const handlePay = async () => {
    setPaying(true);
    try {
      const order = await createMembershipOrder(planCode);
      const payWindow = window.open("", "_blank");
      if (payWindow && order.payForm) {
        payWindow.document.write(order.payForm);
        payWindow.document.close();
      }
      let attempts = 0;
      pollTimerRef.current = window.setInterval(async () => {
        attempts += 1;
        try {
          const latest = await getMembershipOrder(order.orderNo);
          if (latest?.status === "PAID") {
            stopPolling();
            await refreshMe();
            setPaid(true);
            message.success("会员开通成功");
            window.setTimeout(closeModal, 800);
          } else if (attempts >= 30) {
            stopPolling();
            message.info("支付结果确认超时，可在会员中心刷新状态");
          }
        } catch (error) {
          stopPolling();
          message.error(error.message || "查询订单失败");
        }
      }, 2000);
    } catch (err) {
      message.error(err.message || "创建订单失败");
    } finally {
      setPaying(false);
    }
  };

  const currentType =
    user?.membershipType === "PREMIUM"
      ? "高级会员"
      : user?.membershipType === "BASIC"
        ? "普通会员"
        : "非会员";

  return (
    <Modal
      title="开通会员"
      open={open}
      onCancel={closeModal}
      footer={null}
      width={560}
    >
      {reason ? <p className="member-reason">{reason}</p> : null}
      <div className="member-current">
        <span>当前身份</span>
        <strong>{currentType}</strong>
        <em>到期时间：{formatExpire(user?.membershipExpireAt)}</em>
      </div>
      <Spin spinning={loadingPlans || paying}>
        <Radio.Group
          className="member-plan-list"
          value={planCode}
          onChange={(event) => setPlanCode(event.target.value)}
        >
          {plans.map((plan) => (
            <label className="member-plan-card" key={plan.code}>
              <Radio value={plan.code} />
              <span>
                <strong>{planName(plan)}</strong>
                <em>{plan.benefits}</em>
              </span>
            </label>
          ))}
        </Radio.Group>
      </Spin>
      <div className="member-modal-actions">
        <Button onClick={closeModal}>取消</Button>
        <Button
          type="primary"
          disabled={!planCode}
          loading={paying}
          onClick={handlePay}
        >
          立即支付
        </Button>
      </div>
      {paid ? <p className="member-paid-tip">支付成功，正在更新会员状态…</p> : null}
    </Modal>
  );
}
