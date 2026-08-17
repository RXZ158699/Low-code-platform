package com.design.platform.config;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.design.platform.template.entity.Template;
import com.design.platform.template.mapper.TemplateMapper;
import com.design.platform.user.entity.User;
import com.design.platform.user.mapper.UserMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DataSeedRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeedRunner.class);
    private static final String CANVAS_JSON = "{\"width\":1080,\"height\":1440,\"elements\":[]}";

    private final UserMapper userMapper;
    private final TemplateMapper templateMapper;
    private final PasswordEncoder passwordEncoder;

    public DataSeedRunner(
            UserMapper userMapper,
            TemplateMapper templateMapper,
            PasswordEncoder passwordEncoder) {
        this.userMapper = userMapper;
        this.templateMapper = templateMapper;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        User admin = ensureUser("admin", "admin123", "管理员", "ADMIN");
        ensureUser("demo", "demo123", "演示用户", "USER");
        seedTemplatesIfEmpty(admin.getId());
    }

    private User ensureUser(String username, String rawPassword, String nickname, String role) {
        User existing = userMapper.selectOne(
                new LambdaQueryWrapper<User>().eq(User::getUsername, username));
        if (existing != null) {
            return existing;
        }
        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(rawPassword));
        user.setNickname(nickname);
        user.setRole(role);
        userMapper.insert(user);
        log.info("Seeded user username={} role={}", username, role);
        return user;
    }

    private void seedTemplatesIfEmpty(Long adminId) {
        Long count = templateMapper.selectCount(null);
        if (count != null && count > 0) {
            return;
        }
        insertPublicTemplate("主题海报示例", "主题海报", List.of("海报", "节日"), adminId);
        insertPublicTemplate("活动营销示例", "活动营销", List.of("促销", "活动"), adminId);
        insertPublicTemplate("小红书种草示例", "小红书种草", List.of("种草"), adminId);
        insertPublicTemplate("公众号封面示例", "公众号封面", List.of("封面", "公众号"), adminId);
        log.info("Seeded {} public templates", 4);
    }

    private void insertPublicTemplate(String title, String category, List<String> tags, Long authorId) {
        Template template = new Template();
        template.setTitle(title);
        template.setCategory(category);
        template.setJsonData(CANVAS_JSON);
        template.setTags(tags);
        template.setAuthorId(authorId);
        template.setIsPublic(true);
        template.setViewCount(0L);
        template.setDownloadCount(0L);
        templateMapper.insert(template);
    }
}
