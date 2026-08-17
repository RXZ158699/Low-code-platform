package com.design.platform.user.service;

import java.util.regex.Pattern;

public final class AuthRules {

    private static final Pattern USERNAME = Pattern.compile("^[a-zA-Z0-9_]{3,32}$");
    private static final int PASSWORD_MIN = 6;
    private static final int PASSWORD_MAX = 32;

    private AuthRules() {
    }

    public static boolean validUsername(String username) {
        return username != null && USERNAME.matcher(username).matches();
    }

    public static boolean validPassword(String password) {
        return password != null
                && password.length() >= PASSWORD_MIN
                && password.length() <= PASSWORD_MAX;
    }
}
