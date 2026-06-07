package com.atara.deb.ataraapi;

import com.atara.deb.ataraapi.service.EmailService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest
class AtaraApiApplicationTests {

	@MockitoBean
	EmailService emailService;

	@Test
	void contextLoads() {
	}

}
