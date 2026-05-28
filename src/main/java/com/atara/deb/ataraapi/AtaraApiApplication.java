package com.atara.deb.ataraapi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class AtaraApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(AtaraApiApplication.class, args);
	}

}
