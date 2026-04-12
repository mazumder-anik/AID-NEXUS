package com.smartresource.matcher;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class MatcherApplication {
    public static void main(String[] args) {
        SpringApplication.run(MatcherApplication.class, args);
        System.out.println("\n✅ Smart Resource Matcher running on port 8080");
        System.out.println("   POST /api/match  — run matching algorithm");
        System.out.println("   GET  /actuator/health — Docker healthcheck\n");
    }
}
