import { useEffect, useMemo, useState } from "react";
import { Button, Form, Input, App as AntdApp } from "antd";
import { DownOutlined, EllipsisOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { register } from "../api/auth.js";

function WechatQrMark() {
  const size = 25;
  const cells = useMemo(() => {
    const result = [];
    const inFinder = (x, y, ox, oy) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7;
    const finderOn = (x, y, ox, oy) => {
      const lx = x - ox;
      const ly = y - oy;
      return lx === 0 || ly === 0 || lx === 6 || ly === 6 || (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4);
    };
    const timingOn = (x, y) => (x === 6 || y === 6) && (x + y) % 2 === 0;
    const dataOn = (x, y) => ((x * 17 + y * 31 + x * y * 13) % 11) < 5;

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        let on;
        if (inFinder(x, y, 0, 0)) on = finderOn(x, y, 0, 0);
        else if (inFinder(x, y, size - 7, 0)) on = finderOn(x, y, size - 7, 0);
        else if (inFinder(x, y, 0, size - 7)) on = finderOn(x, y, 0, size - 7);
        else if (x === 6 || y === 6) on = timingOn(x, y);
        else on = dataOn(x, y);
        if (on) result.push(`${x}-${y}`);
      }
    }
    return result;
  }, []);

  return (
    <svg className="login-qr-svg" viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <rect width={size} height={size} fill="#fff" />
      {cells.map((key) => {
        const [x, y] = key.split("-").map(Number);
        return <rect key={key} x={x} y={y} width="1" height="1" fill="#111" />;
      })}
    </svg>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState("phone");
  const [countdown, setCountdown] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const finishPassword = async (values) => {
    setSubmitting(true);
    try {
      if (mode === "register") {
        await register(values.username.trim(), values.password, values.nickname?.trim());
        await login(values.username.trim(), values.password);
        message.success("注册成功，已自动登录");
      } else {
        await login(values.username.trim(), values.password);
        message.success("登录成功");
      }
      navigate("/", { replace: true });
    } catch (error) {
      message.error(error.message || "操作失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  const finishPhone = async () => {
    message.info("演示环境暂未接入短信验证，请使用手机密码登录");
    setMode("password");
  };

  const sendCode = () => {
    if (countdown > 0) return;
    setCountdown(60);
    message.success("验证码已发送（演示）");
  };

  return (
    <div className="login-page">
      <div className="login-glow" aria-hidden="true" />
      <div className="login-shell">
        <h1 className="login-hero-title">欢迎使用稿定</h1>
        <div className="login-columns">
          <section className="login-wechat" aria-label="微信扫码登录">
            <h2 className="login-col-title">微信扫码登录</h2>
            <div className="login-qr-box">
              <WechatQrMark />
            </div>
            <p className="login-other-label">其它方式</p>
            <div className="login-other-icons" aria-hidden="true">
              <span className="login-other-icon">
                <UserOutlined />
              </span>
              <span className="login-other-icon">
                <MailOutlined />
              </span>
              <span className="login-other-icon">
                <EllipsisOutlined />
              </span>
            </div>
          </section>

          <section className="login-mobile" aria-label="手机号登录">
            <h2 className="login-col-title">
              {mode === "phone" ? "手机号登录" : mode === "register" ? "账号注册" : "手机密码登录"}
            </h2>

            {mode === "phone" ? (
              <Form layout="vertical" requiredMark={false} onFinish={finishPhone}>
                <div className="login-phone-row">
                  <button type="button" className="login-cc" aria-label="区号">
                    +86
                    <DownOutlined />
                  </button>
                  <Form.Item
                    name="phone"
                    className="login-field"
                    rules={[
                      { required: true, whitespace: true, message: "请输入手机号码" },
                      { pattern: /^1\d{10}$/, message: "请输入 11 位手机号" },
                    ]}
                  >
                    <Input placeholder="输入手机号码" maxLength={11} />
                  </Form.Item>
                </div>
                <div className="login-code-row">
                  <Form.Item
                    name="code"
                    className="login-field"
                    rules={[{ required: true, whitespace: true, message: "请输入验证码" }]}
                  >
                    <Input placeholder="输入验证码" maxLength={6} />
                  </Form.Item>
                  <button
                    type="button"
                    className="login-code-btn"
                    onClick={sendCode}
                    disabled={countdown > 0}
                  >
                    {countdown > 0 ? `${countdown}s` : "获取验证码"}
                  </button>
                </div>
                <Button type="primary" htmlType="submit" className="login-submit" block>
                  登录/注册
                </Button>
                <button type="button" className="login-switch" onClick={() => setMode("password")}>
                  手机密码登录
                </button>
              </Form>
            ) : (
              <Form layout="vertical" requiredMark={false} onFinish={finishPassword}>
                <Form.Item
                  name="username"
                  className="login-field-block"
                  rules={[{ required: true, whitespace: true, message: "请输入用户名" }]}
                >
                  <Input placeholder="输入用户名" autoComplete="username" />
                </Form.Item>
                {mode === "register" && (
                  <Form.Item name="nickname" className="login-field-block">
                    <Input placeholder="昵称（选填）" maxLength={32} />
                  </Form.Item>
                )}
                <Form.Item
                  name="password"
                  className="login-field-block"
                  rules={[{ required: true, message: "请输入密码" }]}
                >
                  <Input.Password placeholder="输入密码" autoComplete="current-password" />
                </Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  className="login-submit"
                  block
                  loading={submitting}
                >
                  {mode === "register" ? "注册并登录" : "登录"}
                </Button>
                <div className="login-switch-row">
                  <button type="button" className="login-switch" onClick={() => setMode("phone")}>
                    返回手机号登录
                  </button>
                  <button
                    type="button"
                    className="login-switch"
                    onClick={() => setMode(mode === "register" ? "password" : "register")}
                  >
                    {mode === "register" ? "已有账号" : "没有账号？注册"}
                  </button>
                </div>
              </Form>
            )}
          </section>
        </div>
      </div>

      <footer className="login-legal">
        <p>新用户可直接登录，注册登录即代表同意</p>
        <p className="login-legal-links">
          <a href="#user">用户服务协议</a>
          <span>|</span>
          <a href="#privacy">隐私政策</a>
          <span>|</span>
          <a href="#vip">会员服务协议</a>
          <span>|</span>
          <a href="#license">授权许可协议</a>
        </p>
      </footer>
    </div>
  );
}
