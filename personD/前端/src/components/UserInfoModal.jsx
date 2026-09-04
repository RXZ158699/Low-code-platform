import { useRef, useState } from "react";
import { App as AntdApp, Avatar, Button, Input, Modal, Popover } from "antd";
import { useAuth } from "../auth/AuthContext.jsx";
import { useMembership } from "./MembershipProvider.jsx";
import { cancelMembership } from "../api/membership.js";
import { updateMe, uploadAvatar } from "../api/users.js";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

function formatTime(value) {
  if (!value) return "—";
  return String(value).replace("T", " ").slice(0, 16);
}

function membershipLabel(type) {
  if (type === "PREMIUM") return "高级会员";
  if (type === "BASIC") return "普通会员";
  return "非会员";
}

function roleLabel(role) {
  if (role === 1 || role === "1" || role === "ADMIN" || role === "ROLE_ADMIN") {
    return "管理员";
  }
  return "普通用户";
}

export default function UserInfoModal({ open, onClose }) {
  const { message } = AntdApp.useApp();
  const { user, logout, refreshMe, updateUser } = useAuth();
  const { setOpen: setMemberOpen } = useMembership();
  const fileRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState("");
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleSave = async () => {
    const nextNickname = nickname.trim();
    if (!nextNickname) {
      message.warning("昵称不能为空");
      return;
    }
    setSaving(true);
    try {
      const next = await updateMe({ nickname: nextNickname });
      updateUser(next);
      setEditing(false);
      message.success("资料已更新");
    } catch (err) {
      message.error(err.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatar = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const next = await uploadAvatar(file);
      updateUser(next);
      message.success("头像已更新");
    } catch (err) {
      message.error(err.message || "头像上传失败");
    }
  };

  const handleOpenMembership = () => {
    onClose();
    setMemberOpen(true);
  };

  const handleCancelMembership = async () => {
    setCancelling(true);
    try {
      await cancelMembership();
      await refreshMe();
      message.success("已取消会员");
    } catch (err) {
      message.error(err.message || "取消会员失败");
    } finally {
      setCancelling(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      message.error(err.message || "退出失败");
      return;
    }
    message.success("已退出登录");
    onClose();
  };

  const handleStartEdit = () => {
    setNickname(user?.nickname || user?.username || "");
    setEditing(true);
  };

  const displayName = user?.nickname || user?.username || "未登录";
  const isMember = user?.membershipType === "BASIC" || user?.membershipType === "PREMIUM";

  return (
    <Modal
      title="个人信息"
      open={open}
      onCancel={onClose}
      footer={null}
      width={520}
    >
      <div className="user-info-head">
        <Avatar size={64} src={user?.avatar || undefined}>
          {displayName.slice(0, 1)}
        </Avatar>
        <div>
          <strong>{displayName}</strong>
          <span>{roleLabel(user?.role)} · {membershipLabel(user?.membershipType)}</span>
        </div>
      </div>

      {editing ? (
        <div className="user-info-edit">
          <input
            ref={fileRef}
            type="file"
            accept={IMAGE_ACCEPT}
            aria-label="选择头像"
            onChange={handleAvatar}
          />
          <Button onClick={() => fileRef.current?.click()}>更换头像</Button>
          <label>
            昵称
            <Input
              value={nickname}
              maxLength={32}
              onChange={(event) => setNickname(event.target.value)}
            />
          </label>
        </div>
      ) : (
        <dl className="user-info-list">
          <div>
            <dt>用户名</dt>
            <dd>{user?.username || "—"}</dd>
          </div>
          <div>
            <dt>会员类型</dt>
            {isMember ? (
              <Popover
                placement="top"
                trigger="hover"
                content={
                  <Button
                    type="link"
                    danger
                    loading={cancelling}
                    onClick={handleCancelMembership}
                  >
                    取消会员
                  </Button>
                }
              >
                <dd className="user-membership-value">
                  {membershipLabel(user?.membershipType)}
                </dd>
              </Popover>
            ) : (
              <dd>{membershipLabel(user?.membershipType)}</dd>
            )}
          </div>
          <div>
            <dt>会员到期时间</dt>
            <dd>{formatTime(user?.membershipExpireAt)}</dd>
          </div>
          <div>
            <dt>注册时间</dt>
            <dd>{formatTime(user?.createdAt)}</dd>
          </div>
        </dl>
      )}

      <div className="user-info-actions">
        {editing ? (
          <>
            <Button onClick={() => setEditing(false)}>取消</Button>
            <Button
              type="primary"
              loading={saving}
              onClick={handleSave}
            >
              保存
            </Button>
          </>
        ) : (
          <>
            <Button onClick={handleStartEdit}>编辑资料</Button>
            <Button type="primary" onClick={handleOpenMembership}>
              会员中心
            </Button>
            <Button danger onClick={handleLogout}>
              退出登录
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
