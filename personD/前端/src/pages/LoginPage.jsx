import { useState } from "react";
import { Button, Form, Input, Segmented, App as AntdApp } from "antd";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { register } from "../api/auth.js";

export default function LoginPage() {
  const [mode, setMode] = useState("login");
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(values.username.trim(), values.password);
        message.success("登录成功");
      } else {
        await register(values.username.trim(), values.password, values.nickname?.trim());
        await login(values.username.trim(), values.password);
        message.success("注册成功，已自动登录");
      }
      navigate("/", { replace: true });
    } catch (error) {
      message.error(error.message || "操作失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">稿定设计</div>
        <p className="login-subtitle">营销物料平台</p>
        <Segmented
          block
          options={[
            { label: "登录", value: "login" },
            { label: "注册", value: "register" },
          ]}
          value={mode}
          onChange={setMode}
          className="login-mode"
        />
        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, whitespace: true, message: "请输入用户名" }]}
          >
            <Input placeholder="admin / demo" autoComplete="username" />
          </Form.Item>
          {mode === "register" && (
            <Form.Item name="nickname" label="昵称">
              <Input placeholder="选填" maxLength={32} />
            </Form.Item>
          )}
          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password placeholder="密码" autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={submitting}>
            {mode === "login" ? "登录" : "注册并登录"}
          </Button>
        </Form>
        <div className="login-footer">
          <Link to="/">返回首页</Link>
        </div>
      </div>
    </div>
  );
}
