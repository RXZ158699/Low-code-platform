package com.design.platform;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@MapperScan("com.design.platform.**.mapper")
public class DesignPlatformApplication {

    public static void main(String[] args) {
        SpringApplication.run(DesignPlatformApplication.class, args);
    }
}
