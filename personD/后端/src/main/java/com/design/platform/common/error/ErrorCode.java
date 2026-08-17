package com.design.platform.common.error;

public enum ErrorCode {
    OK(0, "ok"),
    BAD_REQUEST(40000, "参数校验失败"),
    UNAUTHORIZED(40100, "未登录或 token 无效"),
    FORBIDDEN(40300, "无权限"),
    NOT_FOUND(40400, "资源不存在"),
    CONFLICT(40900, "冲突"),
    GONE(41000, "分享链接过期"),
    FILE_TOO_LARGE(41300, "文件过大"),
    UNSUPPORTED_TYPE(41500, "文件类型不支持"),
    INTERNAL(50000, "服务器内部错误");

    private final int code;
    private final String message;

    ErrorCode(int code, String message) {
        this.code = code;
        this.message = message;
    }

    public int getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }
}
